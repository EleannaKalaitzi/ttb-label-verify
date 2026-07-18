import type { ApplicationData } from '../verify/verify';

/**
 * Parse an uploaded "applications" CSV into a filename → application-data map,
 * so a batch can verify each label against its own COLA record (the full
 * 7-field comparison), not just the label-intrinsic checks.
 *
 * Expected columns (header row, order-independent, common aliases accepted):
 *   filename, brand_name, class_type, alcohol_content, net_contents,
 *   producer_bottler, country_of_origin
 * `filename` is required — it's what matches a row to an uploaded image.
 */

/** Minimal RFC-4180-ish parse: handles quoted fields with commas and "" escapes. */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const s = text.replace(/\r\n?/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else {
      field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

const ALIASES: Record<string, keyof ApplicationData | 'filename'> = {
  filename: 'filename', file: 'filename', image: 'filename',
  brand_name: 'brand_name', brand: 'brand_name',
  class_type: 'class_type', class: 'class_type', type: 'class_type',
  alcohol_content: 'alcohol_content', abv: 'alcohol_content', alcohol: 'alcohol_content',
  net_contents: 'net_contents', net: 'net_contents',
  producer_bottler: 'producer_bottler', bottler: 'producer_bottler', producer: 'producer_bottler',
  country_of_origin: 'country_of_origin', country: 'country_of_origin', origin: 'country_of_origin',
};

export function parseApplicationsCsv(text: string): Map<string, ApplicationData> {
  const rows = parseCsvRows(text);
  const out = new Map<string, ApplicationData>();
  if (rows.length < 2) return out;

  const idx: Partial<Record<keyof ApplicationData | 'filename', number>> = {};
  rows[0].forEach((h, i) => {
    const key = ALIASES[h.trim().toLowerCase().replace(/[\s/]+/g, '_')];
    if (key && idx[key] == null) idx[key] = i;
  });
  if (idx.filename == null) return out; // no way to match rows to images

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const get = (k: keyof ApplicationData | 'filename') => (idx[k] != null ? (cells[idx[k]!] ?? '').trim() : '');
    const filename = get('filename');
    if (!filename) continue;
    out.set(filename, {
      brand_name: get('brand_name') || null,
      class_type: get('class_type') || null,
      alcohol_content: get('alcohol_content') || null,
      net_contents: get('net_contents') || null,
      producer_bottler: get('producer_bottler') || null,
      country_of_origin: get('country_of_origin') || null,
    });
  }
  return out;
}
