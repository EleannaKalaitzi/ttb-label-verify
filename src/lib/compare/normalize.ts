/**
 * Cosmetic normalization for text comparison.
 *
 * The reported real-world case: `STONE'S THROW` on the label vs `Stone's Throw`
 * on the application. Same brand — a difference in case and punctuation is not
 * a mismatch. This function removes exactly those cosmetic dimensions so that
 * cosmetically-identical strings compare equal, and nothing more. Anything that
 * survives normalization is a genuine textual difference, handled by the
 * comparators (which route it to PASS/FLAG/FAIL).
 */
export function normalize(text: string): string {
  return text
    .normalize('NFKD') // split accented chars into base + diacritic
    .replace(/[̀-ͯ]/g, '') // drop the diacritics (café -> cafe)
    .toLowerCase()
    .replace(/['’`]/g, '') // drop apostrophes entirely: "stone's" -> "stones"
    .replace(/[^a-z0-9]+/g, ' ') // any other punctuation/symbol -> single space
    .trim()
    .replace(/\s+/g, ' '); // collapse runs of whitespace
}

/** True when two strings are the same once cosmetic differences are removed. */
export function cosmeticallyEqual(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

/**
 * Character-level similarity in [0, 1] on the NORMALIZED strings, used only to
 * decide FLAG vs FAIL for residual (non-cosmetic) differences — never to decide
 * PASS. 1 means identical after normalization; 0 means completely dissimilar.
 * Computed as 1 - (Levenshtein distance / longer length).
 */
export function similarity(a: string, b: string): number {
  return ratio(normalize(a), normalize(b));
}

/** Edit-distance similarity in [0, 1] on the strings exactly as given (no
 *  cosmetic normalization). Use when punctuation is significant — e.g.
 *  comparing warning wording, where "(1)" matters. */
export function ratio(x: string, y: string): number {
  if (x === y) return 1;
  if (x.length === 0 || y.length === 0) return 0;
  const distance = levenshtein(x, y);
  return 1 - distance / Math.max(x.length, y.length);
}

/** Standard iterative Levenshtein edit distance. */
function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  let prev = Array.from({ length: cols }, (_, j) => j);
  let curr = new Array<number>(cols);
  for (let i = 1; i < rows; i++) {
    curr[0] = i;
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[cols - 1];
}
