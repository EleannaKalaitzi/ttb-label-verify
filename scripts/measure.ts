/**
 * Measurement harness (PLAN.md Session 6).
 *
 * Runs the FULL pipeline — model reads each fixture image, engine decides —
 * and scores the verdicts against ground truth. Ground truth per check is the
 * verdict the engine produces on a PERFECT read of the label
 * (verify(deriveExtraction(spec))). So discrepancies isolate exactly the errors
 * the VISION step introduces, which is what matters: the engine is deterministic
 * and separately unit-tested.
 *
 *   npm run measure           # MOCK: measures the engine baseline (≈100% by
 *                             #   construction — mock returns perfect reads)
 *   ANTHROPIC_API_KEY=… npm run measure   # LIVE: the meaningful accuracy run
 *
 * Reports per-check sensitivity & specificity, a confusion matrix, and latency.
 * Sensitivity is favoured by design: a missed non-compliant label (false PASS)
 * costs far more than an unnecessary flag.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIXTURES, deriveExtraction } from '../src/lib/fixtures/specs';
import { verify } from '../src/lib/verify/verify';
import { getExtractionProvider } from '../src/lib/extraction/provider';
import type { Verdict } from '../src/lib/verdict/types';

const IMAGES = join(import.meta.dirname, '..', 'images');
const mock = process.env.MOCK_EXTRACTION === '1' || !process.env.ANTHROPIC_API_KEY;

interface CheckTally {
  tp: number; // truth non-PASS, caught (actual non-PASS)
  fn: number; // truth non-PASS, missed (actual PASS)  ← the costly error
  tn: number; // truth PASS, correctly PASS
  fp: number; // truth PASS, false alarm
}

function rate(n: number, d: number): string {
  return d === 0 ? '  n/a' : `${((100 * n) / d).toFixed(0).padStart(3)}%`;
}

async function main() {
  if (mock) process.env.MOCK_EXTRACTION = '1';
  const provider = await getExtractionProvider();

  const checks = new Map<string, CheckTally>();
  const confusion = new Map<string, number>(); // "expected>actual" -> count
  const latencies: number[] = [];
  let overallCorrect = 0;

  console.log(`\nMeasurement run — mode: ${mock ? 'MOCK (engine baseline)' : 'LIVE (claude-haiku)'}\n`);
  console.log('fixture                         expected  actual   latency');
  console.log('─'.repeat(64));

  for (const spec of FIXTURES) {
    const truth = verify(deriveExtraction(spec), spec.declared);
    const bytes = readFileSync(join(IMAGES, `${spec.id}.png`));
    const res = await provider.extract({ imageBase64: bytes.toString('base64'), mediaType: 'image/png' });
    const actual = verify(res.data, spec.declared);
    latencies.push(res.latencyMs);

    const ok = actual.overall === spec.expectedOverall;
    if (ok) overallCorrect++;
    confusion.set(
      `${spec.expectedOverall}>${actual.overall}`,
      (confusion.get(`${spec.expectedOverall}>${actual.overall}`) ?? 0) + 1,
    );

    console.log(
      `${spec.id.padEnd(30)}  ${spec.expectedOverall.padEnd(8)}  ${actual.overall.padEnd(6)} ${ok ? '✓' : '✗'} ${Math.round(res.latencyMs)
        .toString()
        .padStart(5)}ms`,
    );

    // Per-check: compare actual vs ground-truth verdict for each check.
    const truthByCheck = new Map(truth.verdicts.map((v) => [v.check, v.verdict]));
    const actualByCheck = new Map(actual.verdicts.map((v) => [v.check, v.verdict]));
    for (const [check, tVerdict] of truthByCheck) {
      const aVerdict = actualByCheck.get(check) ?? 'PASS';
      const t = checks.get(check) ?? { tp: 0, fn: 0, tn: 0, fp: 0 };
      const truthPositive = tVerdict !== 'PASS';
      const actualPositive = aVerdict !== 'PASS';
      if (truthPositive && actualPositive) t.tp++;
      else if (truthPositive && !actualPositive) t.fn++;
      else if (!truthPositive && !actualPositive) t.tn++;
      else t.fp++;
      checks.set(check, t);
    }
  }

  console.log('─'.repeat(64));
  console.log(`overall verdict accuracy: ${overallCorrect}/${FIXTURES.length}\n`);

  console.log('Per-check (positive = should be flagged/failed):');
  console.log('check                              sens   spec   TP FN TN FP');
  console.log('─'.repeat(64));
  for (const [check, t] of checks) {
    console.log(
      `${check.padEnd(34)} ${rate(t.tp, t.tp + t.fn)}  ${rate(t.tn, t.tn + t.fp)}   ` +
        `${t.tp}  ${t.fn}  ${t.tn}  ${t.fp}`,
    );
  }

  console.log('\nConfusion (expected → actual overall verdict):');
  const verdicts: Verdict[] = ['PASS', 'FLAG', 'FAIL'];
  for (const e of verdicts)
    for (const a of verdicts) {
      const n = confusion.get(`${e}>${a}`) ?? 0;
      if (n) console.log(`  ${e} → ${a}: ${n}`);
    }

  const sorted = [...latencies].sort((x, y) => x - y);
  const p50 = Math.round(sorted[Math.floor(sorted.length / 2)]);
  const max = Math.round(sorted[sorted.length - 1]);
  console.log(`\nLatency: p50 ${p50} ms · max ${max} ms · 5s budget: ${max <= 5000 ? 'PASS' : 'OVER'}`);
  if (mock) console.log('\n(MOCK run — reflects the deterministic engine, not vision accuracy. Add a key for the real numbers.)');
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
