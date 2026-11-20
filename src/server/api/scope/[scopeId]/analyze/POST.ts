import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { scopeProjects, scopePhotos } from '../../../../db/schema.js';
import { eq } from 'drizzle-orm';
import { getSecret } from '#airo/secrets';
import fs from 'fs/promises';
import path from 'path';

interface ScopeTask {
  phase: 'preparation' | 'demolition' | 'installation' | 'finishing';
  description: string;
  flagged: boolean;
  flagNote: string;
}

interface LaborItem {
  description: string;
  hours: number;
  workers: number;
  crewDays: number;
  rate: number;
  extended: number;
  assumptions: string;
  requiresInspection: boolean;
}

interface AIResponse {
  tasks: ScopeTask[];
  labor: LaborItem[];
  analysisNotes: string;
  photoSummary: string;
}

const SYSTEM_PROMPT = `You are an expert renovation contractor and project manager for Dust to Done Renovation Solutions LLC in Terre Haute, Indiana.

Your job is to analyze renovation project descriptions and photographs to generate:
1. A professional scope of work divided into 4 phases
2. A detailed labor estimate for each task

SCOPE OF WORK RULES:
- Divide tasks into exactly these phases: preparation, demolition, installation, finishing
- Only include tasks appropriate for the described project — do not add generic tasks that don't apply
- Flag tasks that require permits, structural work, or licensed trades (plumbing, electrical, HVAC) with flagged: true and a brief flagNote
- Be specific and professional — each task should be actionable and clear
- Typical preparation tasks: job-site setup, floor/furniture protection, material delivery coordination, safety prep, dust barriers
- Typical demolition tasks: removal of specific fixtures/flooring/drywall/cabinets/countertops, debris removal and disposal
- Typical installation tasks: framing, drywall, insulation, flooring, tile, plumbing, electrical, cabinets, doors/windows, trim
- Typical finishing tasks: painting, caulking, grouting, hardware installation, final cleanup, punch list, final inspection

LABOR ESTIMATE RULES:
- Generate one labor row per major task or logical grouping of tasks
- Use realistic labor hours for Terre Haute, IN residential renovation work
- Default labor rate: $65/hour for general labor, $85/hour for skilled trades (tile, finish carpentry), $95/hour for licensed trades (plumbing, electrical)
- Workers: 1-3 depending on task complexity
- Crew days = total hours / (workers * 8)
- Extended = hours * workers * rate
- Mark requiresInspection: true for structural, plumbing, electrical, HVAC work
- List key assumptions clearly (e.g., "Assumes standard 8ft ceiling height", "Assumes no hidden water damage")

Return ONLY valid JSON matching this exact schema:
{
  "tasks": [
    {
      "phase": "preparation" | "demolition" | "installation" | "finishing",
      "description": "string",
      "flagged": boolean,
      "flagNote": "string"
    }
  ],
  "labor": [
    {
      "description": "string",
      "hours": number,
      "workers": number,
      "crewDays": number,
      "rate": number,
      "extended": number,
      "assumptions": "string",
      "requiresInspection": boolean
    }
  ],
  "analysisNotes": "string",
  "photoSummary": "string"
}`;

export default async function handler(req: Request<{ scopeId: string }>, res: Response) {
  req.socket.setTimeout(120000);

  // Use SSE to keep the connection alive while OpenAI processes
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Heartbeat every 5s to prevent proxy timeout
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 5000);

  const finish = (event: string, data: unknown) => {
    clearInterval(heartbeat);
    sendEvent(event, data);
    res.end();
  };

  try {
    const projectId = Number(req.params.scopeId);
    if (isNaN(projectId)) return finish('error', { error: 'Invalid scopeId' });

    const apiKey = getSecret('OPENAI_API_KEY');
    if (!apiKey) return finish('error', { error: 'OpenAI API key not configured' });

    const [project] = await db.select().from(scopeProjects).where(eq(scopeProjects.id, projectId)).limit(1);
    if (!project) return finish('error', { error: 'Scope project not found' });

    sendEvent('progress', { message: 'Loading project data...' });

    const photos = await db.select().from(scopePhotos).where(eq(scopePhotos.projectId, projectId));

    const userText = `PROJECT: ${project.projectName}
CUSTOMER: ${project.customerName}
ADDRESS: ${project.jobAddress ?? 'Not provided'}
DESCRIPTION: ${project.description ?? 'Not provided'}
DIMENSIONS/MEASUREMENTS: ${project.dimensions ?? 'Not provided'}
SPECIAL INSTRUCTIONS: ${project.specialInstructions ?? 'None'}

Today's date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

Please generate a complete scope of work and labor estimate for this renovation project. ${photos.length > 0 ? `I have attached ${photos.length} construction photo(s). Use them to identify existing conditions, materials to be removed, and scope of work.` : 'No photos provided — base your scope on the description and measurements only.'}

Generate realistic labor estimates for Terre Haute, IN residential renovation. Default rate $65/hr general labor, $85/hr skilled trades, $95/hr licensed trades.`;

    type ContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'high' } };
    const content: ContentPart[] = [{ type: 'text', text: userText }];

    let photosAttached = 0;
    for (const photo of photos.slice(0, 5)) {
      try {
        const filePath = path.join('/shared-storage/public/assets/uploads/scope', photo.filename);
        const fileBuffer = await fs.readFile(filePath);
        const base64 = fileBuffer.toString('base64');
        const mime = photo.mimeType ?? 'image/jpeg';
        content.push({ type: 'image_url', image_url: { url: `data:${mime};base64,${base64}`, detail: 'high' } });
        photosAttached++;
      } catch { /* skip unreadable photo */ }
    }

    sendEvent('progress', { message: `Sending to AI${photosAttached > 0 ? ` with ${photosAttached} photo(s)` : ''}...` });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 100000);

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
      return finish('error', { error: 'OpenAI API error', message: errText });
    }

    sendEvent('progress', { message: 'Processing AI response...' });

    const openaiData = await openaiRes.json() as { choices: { message: { content: string } }[] };
    const rawContent = openaiData.choices?.[0]?.message?.content ?? '{}';

    let parsed: AIResponse;
    try {
      parsed = JSON.parse(rawContent) as AIResponse;
    } catch {
      return finish('error', { error: 'Failed to parse AI response', raw: rawContent });
    }

    return finish('result', {
      tasks: parsed.tasks ?? [],
      labor: parsed.labor ?? [],
      analysisNotes: parsed.analysisNotes ?? '',
      photoSummary: parsed.photoSummary ?? '',
      photoCount: photosAttached,
    });
  } catch (error) {
    const msg = String(error);
    if (msg.includes('abort') || msg.toLowerCase().includes('aborterror')) {
      return finish('error', { error: 'Analysis timed out', message: 'The AI analysis took too long. Try with fewer photos.' });
    }
    return finish('error', { error: 'Analysis failed', message: msg });
  }
}
