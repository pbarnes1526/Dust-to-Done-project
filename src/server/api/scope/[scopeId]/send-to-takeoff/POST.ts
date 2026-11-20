import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { scopeProjects, scopePhotos, takeoffProjects, takeoffPhotos } from '../../../../db/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

export default async function handler(req: Request<{ scopeId: string }>, res: Response) {
  try {
    const projectId = Number(req.params.scopeId);
    if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid scopeId' });

    const [project] = await db.select().from(scopeProjects).where(eq(scopeProjects.id, projectId)).limit(1);
    if (!project) return res.status(404).json({ error: 'Scope project not found' });

    // If already linked, return existing takeoff
    if (project.linkedTakeoffId) {
      return res.json({ takeoffId: project.linkedTakeoffId, alreadyLinked: true });
    }

    // Create a new takeoff project from scope data
    const [inserted] = await db.insert(takeoffProjects).values({
      projectName: project.projectName,
      customerName: project.customerName,
      address: project.jobAddress ?? null,
      description: project.description ?? null,
      dimensions: project.dimensions ?? null,
      notes: `Created from Scope Builder project #${project.id}. ${project.specialInstructions ?? ''}`.trim(),
      status: 'draft',
    }).$returningId();

    const takeoffId = inserted.id;

    // Copy scope photos to takeoff photos
    const scopePhotoList = await db.select().from(scopePhotos).where(eq(scopePhotos.projectId, projectId));
    const TAKEOFF_DIR = '/shared-storage/public/assets/uploads/takeoff';
    await fs.mkdir(TAKEOFF_DIR, { recursive: true });

    for (const photo of scopePhotoList) {
      try {
        const srcPath = path.join('/shared-storage/public/assets/uploads/scope', photo.filename);
        const newFilename = `takeoff-from-scope-${Date.now()}-${photo.filename}`;
        const destPath = path.join(TAKEOFF_DIR, newFilename);
        await fs.copyFile(srcPath, destPath);
        await db.insert(takeoffPhotos).values({
          projectId: takeoffId,
          filename: newFilename,
          originalName: photo.originalName ?? photo.filename,
          mimeType: photo.mimeType ?? 'image/jpeg',
        });
      } catch { /* skip unreadable photos */ }
    }

    // Link the takeoff back to the scope project
    await db.update(scopeProjects).set({ linkedTakeoffId: takeoffId }).where(eq(scopeProjects.id, projectId));

    return res.status(201).json({ takeoffId, alreadyLinked: false });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to send to takeoff', message: String(error) });
  }
}
