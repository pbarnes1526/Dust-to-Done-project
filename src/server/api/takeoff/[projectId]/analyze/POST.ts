import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { takeoffProjects, takeoffPhotos } from '../../../../db/schema.js';
import { eq } from 'drizzle-orm';
import { getSecret } from '#airo/secrets';
import fs from 'fs/promises';
import path from 'path';

interface MaterialItem {
  category: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  wastePercent: number;
  supplier: string;
  productInfo: string;
  confidence: 'visual' | 'inferred' | 'manual';
  notes: string;
}

interface AIResponse {
  materials: MaterialItem[];
  missingMeasurements: string[];
  analysisNotes: string;
  photoSummary: string;
}

const SYSTEM_PROMPT = `You are an expert construction estimator for Dust to Done Renovation Solutions LLC in Terre Haute, Indiana.
Your job is to analyze renovation project descriptions and construction photographs to generate accurate material takeoff lists.

RULES:
1. Never invent exact measurements from photos unless a known scale reference (tape measure, door, standard tile, etc.) is clearly visible.
2. If critical measurements are missing, list them explicitly in "missingMeasurements" — do not guess quantities. Set quantity to 0 for items that require missing measurements.
3. Clearly mark each item as "visual" (directly seen/measured from photo), "inferred" (logically required but not directly measured), or "manual" (quantity requires user input — set qty to 0).
4. Use realistic pricing for Terre Haute, IN area based on typical Menards/Lowe's price ranges. These are ESTIMATED prices only — not live prices.
5. Include realistic waste percentages: drywall 10%, tile 15%, flooring 10%, lumber 15%, paint 10%, roofing 10%.
6. Group materials by category: Lumber/Framing, Drywall, Insulation, Flooring, Tile, Roofing, Siding, Plumbing, Electrical, HVAC, Paint, Cabinets, Countertops, Doors/Windows, Trim/Molding, Fasteners/Hardware, Adhesives/Compounds, Miscellaneous.
7. For pricing: use "Menards - Terre Haute" or "Lowe's - Terre Haute" as supplier when applicable. Set priceSource to "Estimated - Menards/Lowe's TH (verify before ordering)" and priceDate to today's date.
8. If you cannot determine a quantity without measurements, set quantity to 0 and explain in the notes field what measurement is needed.
9. For items with quantity 0, add them to missingMeasurements as well so the user knows to fill them in.

Return ONLY valid JSON matching this exact schema:
{
  "materials": [
    {
      "category": "string",
      "name": "string",
      "description": "string",
      "quantity": number,
      "unit": "string",
      "unitPrice": number,
      "wastePercent": number,
      "supplier": "string",
      "productInfo": "string",
      "confidence": "visual" | "inferred" | "manual",
      "notes": "string"
    }
  ],
  "missingMeasurements": ["string"],
  "analysisNotes": "string",
  "photoSummary": "string"
}`;

export default async function handler(req: Request<{ projectId: string }>, res: Response) {
  // Extend Express socket timeout for long AI calls
  req.socket.setTimeout(90000);

  try {
    const projectId = Number(req.params.projectId);
    if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid projectId' });

    const apiKey = getSecret('OPENAI_API_KEY');
    if (!apiKey) return res.status(500).json({ error: 'OpenAI API key not configured' });

    const [project] = await db.select().from(takeoffProjects).where(eq(takeoffProjects.id, projectId)).limit(1);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const photos = await db.select().from(takeoffPhotos).where(eq(takeoffPhotos.projectId, projectId));

    const userText = `PROJECT: ${project.projectName}
CUSTOMER: ${project.customerName}
ADDRESS: ${project.address ?? 'Not provided'}
DESCRIPTION: ${project.description ?? 'Not provided'}
DIMENSIONS/MEASUREMENTS: ${project.dimensions ?? 'Not provided — list all measurements needed in missingMeasurements'}
NOTES: ${project.notes ?? 'None'}

Today's date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

Please analyze this renovation project and generate a complete material takeoff list. ${photos.length > 0 ? `I have attached ${photos.length} construction photo(s) for your analysis. Use them to identify materials, conditions, and any visible measurements or scale references.` : 'No photos provided — base your list on the description and measurements only. For any item where quantity cannot be determined from the provided measurements, set quantity to 0 and add to missingMeasurements.'}

IMPORTANT: All prices are ESTIMATES based on typical Menards/Lowe's Terre Haute pricing. Mark priceSource as "Estimated - Menards/Lowe's TH (verify before ordering)".`;

    type ContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'high' } };
    const content: ContentPart[] = [{ type: 'text', text: userText }];

    let photosAttached = 0;
    for (const photo of photos.slice(0, 5)) {
      try {
        const filePath = path.join('/shared-storage/public/assets/uploads/takeoff', photo.filename);
        const fileBuffer = await fs.readFile(filePath);
        const base64 = fileBuffer.toString('base64');
        const mime = photo.mimeType ?? 'image/jpeg';
        content.push({ type: 'image_url', image_url: { url: `data:${mime};base64,${base64}`, detail: 'high' } });
        photosAttached++;
      } catch {
        // skip unreadable photo
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 80000);

    let openaiRes: Awaited<ReturnType<typeof fetch>>;
    try {
      openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 4096,
          temperature: 0.2,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content },
          ],
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return res.status(502).json({ error: 'OpenAI API error', message: errText });
    }

    const openaiData = await openaiRes.json() as { choices: { message: { content: string } }[] };
    const rawContent = openaiData.choices?.[0]?.message?.content ?? '{}';

    let parsed: AIResponse;
    try {
      parsed = JSON.parse(rawContent) as AIResponse;
    } catch {
      return res.status(502).json({ error: 'Failed to parse AI response', raw: rawContent });
    }

    // Ensure items with qty=0 are also surfaced in missingMeasurements
    const zeroQtyItems = (parsed.materials ?? [])
      .filter(m => m.quantity === 0)
      .map(m => `${m.name}: ${m.notes || 'Quantity requires measurement'}`);
    const allMissing = [...new Set([...(parsed.missingMeasurements ?? []), ...zeroQtyItems])];

    return res.json({
      materials: parsed.materials ?? [],
      missingMeasurements: allMissing,
      analysisNotes: parsed.analysisNotes ?? '',
      photoSummary: parsed.photoSummary ?? '',
      photoCount: photosAttached,
      priceDisclaimer: "All prices are ESTIMATES based on typical Menards/Lowe's Terre Haute pricing. Verify current prices before ordering.",
    });
  } catch (error) {
    const msg = String(error);
    if (msg.includes('abort') || msg.toLowerCase().includes('aborterror')) {
      return res.status(504).json({ error: 'Analysis timed out', message: 'The AI analysis took too long. Try with fewer photos or a shorter description.' });
    }
    return res.status(500).json({ error: 'Analysis failed', message: msg });
  }
}
