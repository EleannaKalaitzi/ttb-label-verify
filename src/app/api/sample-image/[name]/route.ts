import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';

/**
 * Serves an in-repo fixture label (images/*.png) so the batch results view can
 * show a thumbnail for the sample set. Only simple PNG filenames from that
 * directory are allowed — the pattern rules out any path traversal. (Uploaded
 * batches render thumbnails from the browser's own File objects, so their images
 * are never sent back or stored server-side.)
 */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[\w-]+\.png$/.test(name)) {
    return new Response('Not found', { status: 404 });
  }
  try {
    const buf = await readFile(join(process.cwd(), 'images', name));
    return new Response(new Uint8Array(buf), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
