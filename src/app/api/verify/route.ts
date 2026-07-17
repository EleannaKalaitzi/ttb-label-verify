import { getSharedExtractionProvider } from '@/lib/extraction/provider';
import { verify, type ApplicationData } from '@/lib/verify/verify';
import type { ExtractionInput } from '@/lib/extraction/provider';

/** Node runtime (the SDK + node:crypto cache need it); never cached. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB — downscaling happens client-side first.

const MEDIA: Record<string, ExtractionInput['mediaType']> = {
  'image/png': 'image/png',
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/webp': 'image/webp',
  'image/gif': 'image/gif',
};

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: 'Expected a form upload.' }, { status: 400 });
  }

  const file = form.get('image');
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: 'Please choose a label image to check.' }, { status: 400 });
  }
  const mediaType = MEDIA[file.type];
  if (!mediaType) {
    return Response.json(
      { error: `Unsupported image type "${file.type || 'unknown'}". Use PNG, JPEG, WebP, or GIF.` },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'Image is larger than 8 MB. Please use a smaller photo.' }, { status: 413 });
  }

  const declared: ApplicationData = {
    brand_name: str(form.get('brand_name')),
    class_type: str(form.get('class_type')),
    alcohol_content: str(form.get('alcohol_content')),
    net_contents: str(form.get('net_contents')),
    producer_bottler: str(form.get('producer_bottler')),
    country_of_origin: str(form.get('country_of_origin')),
  };

  const imageBase64 = Buffer.from(await file.arrayBuffer()).toString('base64');

  const provider = await getSharedExtractionProvider();
  const extraction = await provider.extract({ imageBase64, mediaType });
  const result = verify(extraction.data, declared);

  return Response.json({
    overall: result.overall,
    verdicts: result.verdicts,
    extraction: result.extraction,
    meta: {
      latencyMs: Math.round(extraction.latencyMs),
      source: extraction.source,
      cached: extraction.cached ?? false,
      error: extraction.error ?? null,
    },
  });
}

function str(v: FormDataEntryValue | null): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  return s.length ? s : null;
}
