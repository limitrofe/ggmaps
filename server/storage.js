import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';

// Storage de thumbnails em disco (volume montado em producao).
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

export function uploadsDir() {
  return UPLOADS_DIR;
}

// Recebe um dataURL (data:image/jpeg;base64,...) e grava como arquivo <id>.<ext>.
export async function saveThumbnail(id, dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const m = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  await mkdir(UPLOADS_DIR, { recursive: true });
  const ext = m[1].toLowerCase().startsWith('png') ? 'png' : 'jpg';
  const file = `${id}.${ext}`;
  await writeFile(path.join(UPLOADS_DIR, file), Buffer.from(m[2], 'base64'));
  return file;
}

export async function readThumbnail(file) {
  return readFile(path.join(UPLOADS_DIR, path.basename(file)));
}

export async function deleteThumbnail(file) {
  if (!file) return;
  try {
    await unlink(path.join(UPLOADS_DIR, path.basename(file)));
  } catch {
    // arquivo pode nao existir; ignora
  }
}

export function thumbnailMime(file) {
  return file && file.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
}
