# TTB Label Verification — Prototype

An AI-assisted tool that helps a TTB compliance officer verify that a distilled-spirits
**label** matches the **declared data** from its application, and that the label complies
with the federal labeling regulations on its own terms.

Two inputs (a label image + the application's declared values) → per-field verdicts, each
stating its **regulatory authority** in plain language.

> **This is a comparison and compliance tool, not an OCR tool.** Reading the text off the
> label is half the job. The tool *advises*; the officer decides. Every verdict is
> overridable and shows its reason and its citation. Nothing is auto-rejected.

🔗 **Live demo:** https://ttb-label-verify-production-8bcd.up.railway.app
(runs in mock mode — no key required; upload a label from [`images/`](images/) to try it)

📄 The original brief: [`ASSIGNMENT.md`](ASSIGNMENT.md) · Design decisions & rationale:
[`ARCHITECTURE.md`](ARCHITECTURE.md)

---

## Status

| Area | State |
|---|---|
| Extraction engine (image → structured data) | ✅ Implemented (Claude Haiku vision + mock mode) |
| Compliance decision engine — all 7 fields + citations | ✅ Implemented, 88 unit tests passing |
| Content-hash result cache | ✅ Implemented |
| Single-label UI (508 / WCAG AA) | ✅ Implemented |
| Server-side batch + CSV export | ✅ Implemented (`/batch`, exception-first view) |
| Measurement harness (sensitivity/specificity) | ✅ Implemented (`npm run measure`) |
| Measured latency figure | ✅ **p50 2.9 s / max 3.3 s** (warm, live `claude-haiku-4-5`) |
| Deployed URL | ✅ **Live** — https://ttb-label-verify-production-8bcd.up.railway.app |

Empirical numbers (latency, accuracy) are intentionally **not** filled in with guesses —
they will be measured and reported, not asserted.

---

## Quick start

Requires Node 20+ (developed on Node 24).

```bash
npm install

# 1. Run the whole thing with NO API key — canned extractions, real decision engine:
npm run demo          # prints verdicts for several example labels
npm run spike:mock    # runs one extraction through the pipeline + latency

# 2. Run the test suite (42 tests, no key needed):
npm test

# 3. Run against the real model (needs a key):
cp .env.example .env  # then paste your ANTHROPIC_API_KEY
npm run spike -- ./path/to/label.png
```

**Mock mode** (`MOCK_EXTRACTION=1`) is a first-class path: a reviewer can clone, install,
and see the app work end-to-end **without an API key**. The model is a single swappable
seam ([`src/lib/extraction/provider.ts`](src/lib/extraction/provider.ts)).

---

## Approach

**The model extracts; the code decides.** The vision model is asked *only* what is printed
on the label — never whether it is compliant. All comparison and all regulatory logic live
in deterministic, unit-tested TypeScript. This is a deliberate design choice:

- **Latency & determinism** — the model returns lean, schema-validated values at
  `temperature: 0`, so identical input yields identical output. A compliance tool that
  varies run-to-run is not fit for purpose, and a measurement harness needs determinism.
- **Auditability** — a wrong verdict traces to either an extraction error *or* a comparison
  bug, never a black box. Rules are reviewable code with citations attached, not prose
  buried in a prompt.
- **Honest nulls** — every extracted field is nullable. An unreadable field returns `null`
  rather than a plausible guess, because a hallucinated value that happens to match the
  declared value is a *false PASS* — the worst possible outcome.

**Vision model, not classical OCR.** Stylized label typography, curved text, foil, and glare
defeat traditional OCR — and Tesseract cannot report whether text is **bold**, which
§ 16.22 requires.

### Verdict states

- `PASS` — matches / compliant
- `FLAG` — cosmetic difference, low confidence, unreadable field, or genuine ambiguity →
  routes to a human. **FLAG is load-bearing:** a missed non-compliant label costs far more
  than an unnecessary review, so when uncertain the tool flags rather than guesses.
- `FAIL` — substantive mismatch or regulatory violation.

Roll-up: any `FAIL` → `FAIL`; else any `FLAG` → `FLAG`; else `PASS`.

---

## The checks

**Against the application**
1. **Brand name** — normalized comparison (`STONE'S THROW` = `Stone's Throw`); differences
   beyond cosmetic route to a human, never a silent pass.
2. **Class/type** — normalized comparison.
3. **Alcohol content** — parsed numerically (`45%`, `45.0%`, `45% Alc./Vol.` are equal).
   Where proof is also printed, it is cross-checked against the ABV (proof ≈ 2 × ABV) — an
   internal inconsistency is a finding regardless of the application.
4. **Net contents** — parsed to millilitres, so `750 mL` = `0.75 L`; a real volume
   difference fails.
5. **Producer / bottler** — name & address, cautious text match (cosmetic differences pass).
6. **Country of origin** — cautious match; a domestic product (none declared, none shown) is
   a PASS, not a gap; lead-ins like "Product of" are ignored.

**Against the regulations**
7. **Government health warning** — three separate checks, three citations (below).
8. **Standard of identity** — is the class/type designation lawful at the stated ABV?

---

## Batch review (`/batch`)

Peak-season importers submit 200–300 labels at once. The batch screen accepts many images
and processes them **server-side** with a bounded worker pool (6 in flight; the SDK's backoff
handles rate limits) — a reviewer can start a run and close the tab. Each label is isolated,
so one that fails to process returns a FLAG, not an error that sinks the run.

Because a batch has no per-image application data, batch mode runs the **label-intrinsic**
checks only — the government warning, the standard of identity, and the proof/ABV consistency
cross-check. The results view is **exception-first**: it opens on the count needing attention,
sorted by severity, with clean labels collapsed behind a disclosure — an agent's job is
finding the labels that *aren't* fine, not scrolling 288 that are. Results export to **CSV**
(verdict, failing checks, reasons, citations) — the durable record, since nothing is stored
server-side.

## Regulatory basis

All citations were verified against the current CFR text (Cornell LII / eCFR) on
**2026-07-16**. Rules are versioned data pinned to that date — there is no live regulatory
fetch on the request path (the agency firewall blocks it, the latency budget forbids it, and
these rules change on a timescale of decades). A staleness check against the eCFR API is
*designed* as an out-of-band job and deliberately left unbuilt.

### Government warning — 27 CFR Part 16 (Alcoholic Beverage Labeling Act of 1988)

**Required text (§ 16.21)**, verbatim:

> GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic
> beverages during pregnancy because of the risk of birth defects. (2) Consumption of
> alcoholic beverages impairs your ability to drive a car or operate machinery, and may
> cause health problems.

**Formatting (§ 16.22)** — three distinct, separately-cited checks:
- `warning.text_verbatim` (§ 16.21) — exact wording, continuous and set apart.
- `warning.prefix_caps_and_bold` (§ 16.22) — "GOVERNMENT WARNING" in capitals and bold.
- `warning.remainder_not_bold` (§ 16.22) — **the remainder may *not* be bold.**

> The remainder rule is routinely missed. The requirement is commonly paraphrased as "all
> caps and bold," which is wrong — a warning with the *entire* statement bolded is
> non-compliant. This tool implements the regulation as written, not the paraphrase.

**Casing vs bold — a confidence distinction.** Casing is read directly from the transcription,
so a title-case "Government Warning" is a hard `FAIL`. Whether text *is bold* is the model's
visual judgment, not a measurement — so a bold-rule issue yields `FLAG` (with the citation
shown) rather than `FAIL`. The tool does not overstate its own confidence.

### Standards of identity — 27 CFR Part 5, Subpart I

Class and type designations are legally defined, not free text — so a label can be
non-compliant even when it matches its application perfectly. "Kentucky Straight Bourbon
Whiskey" at 38% ABV is non-compliant on its face, because that designation carries a minimum
bottling strength of 40% ABV (80 proof).

This is deliberately a small, static table (~14 designations) carrying the one rule checkable
from label text alone — minimum bottling strength — with a per-class citation
(§ 5.142–5.148). It is **not** a rule engine; anything outside the table returns *"not
evaluated"*, an honest gap rather than a guessed verdict.

---

## Accessibility — Section 508 / WCAG 2.0 AA

A hard requirement, not polish: under the Rehabilitation Act § 508 (the 2017 Refresh
incorporates WCAG 2.0 AA by reference), a tool that cannot meet it cannot be procured,
irrespective of function. The UI (in progress) is being built to this standard from the first
line — verdicts conveyed by colour **and** icon **and** text, ≥ 4.5:1 contrast, full keyboard
navigation, `aria-live` announcements, 200% text scaling, and plain-language copy.

---

## Measurement (measured, live)

Run against the fixture corpus with the live model (`claude-haiku-4-5`, `temperature: 0`)
via `npm run measure`. The harness scores the full pipeline (model reads image → engine
decides) against each fixture's known verdict; ground truth per check is the verdict on a
*perfect* read, so any discrepancy isolates an error the **vision step** introduced.

**Results (6-label corpus):**

| Metric | Value |
|---|---|
| Overall verdict accuracy | **6 / 6** |
| Per-check sensitivity & specificity | **100%** across all 11 checks |
| Latency (warm) | **p50 2.9 s · max 3.3 s** — within the 5-second budget |
| Confusion | PASS→PASS ×1 · FLAG→FLAG ×2 · FAIL→FAIL ×3 (no off-diagonal) |

**Honest caveats:**
- **Cold start ≈ 8 s on the first call** — a one-time structured-output schema compilation
  (subsequent calls are cached ~24 h). Mitigated in production by warming the schema after
  deploy; documented, not hidden.
- **The corpus is synthetic** (pixel-exact rendered labels), so the vision step reads them
  cleanly and high accuracy is expected. These numbers validate the *engine and pipeline
  end-to-end*; the harder test is real photographs (glare, angles), which is the natural
  next expansion of the corpus (real COLA-registry labels).
- Thresholds favour **sensitivity** by design (a false PASS costs far more than a false
  flag), and the run is **deterministic** (`temperature: 0`), so the figures reproduce.

---

## Limitations (known and stated)

- **Type size unmeasurable** — § 16.22 also mandates minimum type sizes by container volume;
  these cannot be measured from an uncalibrated photograph (no reference scale). Not attempted.
- **Bold detection is advisory** — the regulation is exact; the model's perception of it is
  not. Bold-rule issues are `FLAG`, not `FAIL`.
- **Designations outside the table are not evaluated** — an honest gap, not an inferred verdict.
- **Single image per application** — real COLAs have front and back labels, and the warning
  usually lives on the back; single-image is a known modelling gap.
- **Network dependency** — the vision model is a network call. The agency firewall blocks
  outbound ML endpoints, so production would require an Azure-hosted or on-prem model; the
  model client is a single seam to make that a one-file change.

---

## Out of scope (with rationale)

COLA integration · authentication · persistence/database · image preprocessing (deskew/glare)
· type-size measurement · live regulatory fetching · wine and malt beverages · full Subpart I
rule engine. Distilled spirits only. This is a standalone proof-of-concept; depth on the core
checks was chosen over breadth.

---

## Project layout

```
src/lib/
  extraction/   image → structured data (schema, prompt, provider seam, mock, Haiku, cache)
  verdict/      PASS/FLAG/FAIL types + citation shape + roll-up
  compare/      normalizer, brand, class/type, ABV + proof cross-check
  rules/        government-warning checks, standards-of-identity table
  verify/       orchestrator: extraction + declared data → all verdicts
scripts/        spike (latency), demo (verdicts), all runnable without a key
```

Run `npm test` to exercise every check at its boundaries, including the FLAG/FAIL thresholds.
