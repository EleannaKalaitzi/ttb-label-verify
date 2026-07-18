# Label Verification System — Prototype

An AI-assisted tool that helps a TTB compliance officer verify that an alcohol beverage
**label** (distilled spirits, wine, or malt beverage) matches the **declared data** from its
application, and that the label complies with the federal labeling regulations on its own terms.

Two inputs (a label image + the application's declared values) → per-field verdicts, each
stating its **regulatory authority** in plain language.

> **This is a comparison and compliance tool, not an OCR tool.** Reading the text off the
> label is half the job. The tool *advises*; the officer decides. Every verdict is
> overridable and shows its reason and its citation. Nothing is auto-rejected.

🔗 **Live demo:** https://ttb-label-verify-production-8bcd.up.railway.app — reads real labels via
Claude Haiku (single-label + [`/batch`](https://ttb-label-verify-production-8bcd.up.railway.app/batch)).
Load a built-in sample on either page (single-label dropdown, or batch **"Load sample labels"**),
or upload your own.

📄 The original brief: [`ASSIGNMENT.md`](ASSIGNMENT.md) · Design decisions & rationale:
[`ARCHITECTURE.md`](ARCHITECTURE.md)

---

## Status

| Area | State |
|---|---|
| Extraction engine (image → structured data) | ✅ Implemented (Claude Haiku vision + mock mode) |
| Compliance decision engine — all 7 fields + citations | ✅ Implemented, 117 unit tests passing |
| Content-hash result cache | ✅ Implemented |
| Single-label UI (508 / WCAG AA) | ✅ Implemented |
| Server-side batch + CSV export | ✅ Implemented (`/batch`, exception-first view) |
| Measurement harness (sensitivity/specificity) | ✅ Implemented (`npm run measure`) |
| Measured latency figure | ✅ **p50 ≈ 2.6 s** (live `claude-haiku-4-5`; tail varies — see Measurement) |
| Deployed URL | ✅ **Live** — https://ttb-label-verify-production-8bcd.up.railway.app |

Every figure above is **measured, not asserted** — see [Measurement](#measurement-measured-live).
Nothing is filled in with a guess.

---

## Quick start

Requires Node 20+ (developed on Node 24).

```bash
npm install

# 1. Run the whole thing with NO API key — canned extractions, real decision engine:
npm run demo          # prints verdicts for several example labels
npm run spike:mock    # runs one extraction through the pipeline + latency

# 2. Run the test suite (117 tests, no key needed):
npm test

# ...and the measurement harness (no key = engine baseline; with a key = live accuracy):
npm run measure

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

## Tools used

- **TypeScript 5** on **Node.js ≥ 20.9** — the whole codebase and the deterministic decision
  engine; the **117** tests run on Node's built-in test runner (`node --test`), executed through
  **tsx** (TypeScript run directly, no separate build step).
- **Next.js 16** (App Router) with **React 19** — the single-label and batch UIs *and* the
  `/api/*` routes, in one deployable service.
- **Claude Haiku** (`claude-haiku-4-5`) via the **Anthropic SDK** (`@anthropic-ai/sdk`) — vision
  extraction only, at `temperature: 0`; chosen over classical OCR because Tesseract cannot report
  whether text is **bold**, which § 16.22 requires.
- **Zod 4** — validates every structured read, so a malformed model response is caught, never trusted.
- **sharp** — rasterizes the HTML/CSS adversarial labels into the PNG test-fixture corpus.
- **ESLint 9** (+ `eslint-config-next`) — linting.
- **Visual Studio Code** — development environment.
- **Railway** — hosts the live deployment (auto-deploys on push to `main`).

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
6. **Country of origin** — cautious match; lead-ins like "Product of" are ignored. When no
   country is declared *or* shown, the tool never *assumes* domestic: it PASSes only with
   positive evidence (a U.S. producer address), otherwise it **FLAGs** for a human — because a
   missing country on an *import* is a real violation it must not wave through.

**Against the regulations**
7. **Government health warning** — three separate checks, three citations (below).
8. **Standard of identity** — is the class/type designation lawful for what the label states?
   Evaluated for **all three beverage classes**, each by the mechanism its Part defines:
   distilled spirits by minimum bottling strength (27 CFR Part 5), wine by class ABV ranges and
   the 7–24% scope envelope (Part 4), and malt beverages by class/type designation recognition
   (Part 7, which sets no numeric ABV standard). A designation outside every encoded rule is
   flagged for a reviewer, never guessed.

---

## Batch review (`/batch`)

Peak-season importers submit 200–300 labels at once. The batch screen accepts many images —
**dragged onto the drop zone or selected**, with drops **accumulating** so a batch can be built
from several folders (de-duped, capped at 300) — and processes them **server-side** with a
bounded worker pool (6 in flight; the SDK's backoff handles rate limits), so a reviewer can start
a run and close the tab. Each label is isolated, so one that fails to process returns a FLAG, not
an error that sinks the run.

Because a batch has no per-image application data, batch mode runs the **label-intrinsic**
checks only — the government warning, the standard of identity, and the proof/ABV consistency
cross-check. The results view is **exception-first**: it opens on the count needing attention,
sorted by severity, with clean labels collapsed behind a disclosure (each **expandable to show
*why* it passed**) — an agent's job is finding the labels that *aren't* fine, not scrolling 288
that are. A **thumbnail** sits beside each finding; clicking it (or **Expand**) opens an **in-page
window** with the enlarged label and its full findings. A **"Load sample labels"** button runs a
batch over a bundled set of real label photos, so the results view can be seen with no upload.

A batch run exports to **CSV** (verdict, failing checks, reasons, citations), and a
**single-label** result exports the same way (one row per check, with the application value, the
label value, the reason, and citation). The export is the durable record, since nothing is stored
server-side.

## Regulatory basis

Every rule is **offline data verified against a pinned CFR source committed in the repo**
([`src/lib/rules/sources/`](src/lib/rules/sources/)) — the verbatim eCFR text for Parts 4, 5, 7,
and 16, each with its "up to date as of" date and a rule↔source mapping (verified 2026-07-15 to
2026-07-17). There is no live regulatory fetch on the request path (the agency firewall blocks
it, the latency budget forbids it, and these rules change on a timescale of decades). A staleness
check against the eCFR API is *designed* as an out-of-band job and deliberately left unbuilt.

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

### Standards of identity — spirits (Part 5), wine (Part 4), malt (Part 7)

Class and type designations are legally defined, not free text — so a label can be
non-compliant even when it matches its application perfectly. "Kentucky Straight Bourbon
Whiskey" at 38% ABV is non-compliant on its face, because that designation carries a minimum
bottling strength of 40% ABV (80 proof).

Each beverage class is evaluated by the mechanism its Part actually defines — data-as-code,
every entry carrying its citation and verified against the pinned source:

- **Distilled spirits (Part 5, Subpart I).** Minimum bottling strength per class (§ 5.142–5.148,
  40%), plus the classes that carry *different* rules: flavored spirits (§ 5.151, 30%), cordials
  & liqueurs (§ 5.150 — no general floor; rock-and-rye 24%, spirit-liqueur 30%), imitations
  (§ 5.152), and specialty products (§ 5.156). Those are checked first, so a "Cherry Flavored
  Bourbon Whisky" (30% floor) or a "Sloe Gin" (a liqueur, no floor) is **not** falsely failed
  against whisky's/gin's 40%.
- **Wine (Part 4).** Per-type ABV ranges (§ 4.21 — table ≤ 14%, dessert 14–24%, sherry ≥ 17%,
  port ≥ 18%, aperitif/vermouth ≥ 15%) plus the 7–24% scope envelope (§ 4.6/4.7): below 7% flags
  as an FDA-regulated product, above 24% fails as a spirit. Non-grape wines (cider, perry, sake,
  mead) are included.
- **Malt beverages (Part 7).** Part 7 sets no numeric ABV standard, so the check is class/type
  **designation recognition** (§ 7.63): a recognized designation (ale, lager, stout, IPA…)
  passes; an unrecognized one flags for a statement-of-composition review.

These are deliberately small, static tables — **not** a rule engine, and not an attempt to
implement each Subpart in full. A designation outside every encoded rule is flagged for review
(e.g. a distilled-spirits specialty product, § 5.156) — an honest gap, never a guessed verdict.

---

## Accessibility — Section 508 / WCAG 2.0 AA

A hard requirement, not polish: under the Rehabilitation Act § 508 (the 2017 Refresh
incorporates WCAG 2.0 AA by reference), a tool that cannot meet it cannot be procured,
irrespective of function. The UI is built to this standard from the first
line — verdicts conveyed by colour **and** icon **and** text, ≥ 4.5:1 contrast, full keyboard
navigation, `aria-live` announcements, 200% text scaling, and plain-language copy. Reading text
is a legible sans at a generous base size with **≥ 44 px** targets — a stakeholder noted roughly
half the review team is over 50, with a wide range of tech-comfort — while the monospace "dossier"
styling is kept as an accent, not the reading font.

---

## Measurement (measured, live)

Run against the fixture corpus with the live model (`claude-haiku-4-5`, `temperature: 0`)
via `npm run measure`. The harness scores the full pipeline (model reads image → engine
decides) against each fixture's known verdict; ground truth per check is the verdict on a
*perfect* read, so any discrepancy isolates an error the **vision step** introduced.

**Results (live model `claude-haiku-4-5`, full 11-label corpus — spirits, wine & malt):**

| Metric | Value |
|---|---|
| Overall verdict accuracy | **11 / 11** (no off-diagonal) |
| Per-check sensitivity & specificity | **100%** across all checks |
| Latency | **p50 ≈ 2.6 s · max ≈ 4.0 s** — within the "about 5 seconds" target |
| Confusion | PASS→PASS ×3 · FLAG→FLAG ×2 · FAIL→FAIL ×6 |

> **Latency, disclosed honestly.** The *median* is ~2.6 s and meets the stated "about 5
> seconds" adoption bar. But **latency scales with image size**, and images are sent at full
> fidelity (a deliberate choice — no downscaling, to avoid altering the reviewer's input), so
> a large photograph can take longer and individual calls occasionally exceed 5 s (up to
> ~7.7 s observed). Mitigations: the content-hash **cache** makes a repeat label instant,
> **server-side batch** never blocks the reviewer, and the startup **warmup** removes the
> one-time cold call. Tightening the tail further would mean downscaling large uploads or an
> on-prem model — both available behind the existing seams, deliberately not enabled here.

**Honest caveats:**
- **Cold start ≈ 8 s on the first call** — a one-time structured-output schema compilation
  (subsequent calls are cached ~24 h). Mitigated by a startup warmup (Next.js
  `instrumentation.ts`) that compiles the schema on boot, so a reviewer's first request is
  already warm; documented, not hidden.
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
- **Designations outside the encoded rules are flagged, not guessed** — a niche spirit with no
  numeric standard is reported as a specialty product (§ 5.156) for review; compositional
  standards not visible on a label (mash bill, appellation, volatile acidity) are out of scope.
- **Single image per application** — real COLAs have front and back labels, and the warning
  usually lives on the back; single-image is a known modelling gap.
- **Network dependency** — the vision model is a network call. The agency firewall blocks
  outbound ML endpoints, so production would require an Azure-hosted or on-prem model; the
  model client is a single seam to make that a one-file change.

---

## Out of scope (with rationale)

COLA integration · authentication · persistence/database · image preprocessing (deskew/glare)
· image downscaling · type-size measurement · live regulatory fetching · **compositional**
standards of identity not determinable from a label (mash bill, distillation proof, cellar
treatment, grape-variety percentages, appellations of origin). All three beverage classes are
evaluated on the label-checkable standard of identity (see above) plus the universal
requirements (warning, brand, class/type, ABV, net contents, bottler, country). This is a
standalone proof-of-concept; depth and honesty on the checkable rules was chosen over attempting
the full Subparts.

---

## Assumptions

- **Application data is entered in-app, not fetched.** COLA-system integration is out of scope
  (confirmed with IT), so a single label's declared values are typed into the form. A batch has
  no per-label application data, so it runs the label-intrinsic checks (warning, standard of
  identity, proof/ABV consistency) — the high-volume triage Sarah Chen asked for.
- **One image per label.** Real COLAs have front and back labels (the warning usually on the
  back); the prototype verifies the single image it is given and flags fields it cannot see.
- **Nothing is persisted.** No database, no stored artwork — results are ephemeral and the CSV
  export (single label *and* batch) is the durable record, consistent with the federal
  PII/retention caution IT raised.
- **Rules change on a decade timescale**, so they are pinned **offline data verified against a
  committed CFR source**, not fetched live (the agency firewall blocks outbound calls anyway).
- **Cosmetic differences are not mismatches** — case, punctuation and whitespace are normalized;
  only a substantive difference fails (Dave Morrison's `STONE'S THROW` = `Stone's Throw`).
- **Bold and contrast are advisory** (visual judgment, not measurement), and type size is
  unmeasurable from an uncalibrated photo — these are flagged or documented, never faked.
- **The ~5-second target is the p50** on a normally-sized image; the tail scales with image size,
  disclosed honestly under [Measurement](#measurement-measured-live).
- **Verdicts advise; the officer decides.** Nothing is auto-rejected — every verdict is
  overridable and shows its reason and citation.

---

## Project layout

```
src/lib/
  extraction/   image → structured data (schema, prompt, provider seam, mock, Haiku, cache)
  verdict/      PASS/FLAG/FAIL types + citation shape + roll-up
  compare/      normalizer + comparators (brand, class/type, ABV/proof, net contents, bottler, country)
  rules/        government-warning checks, standards-of-identity table
  verify/       orchestrator: extraction + declared data → all verdicts
  batch/        server-side batch runner + CSV export
  fixtures/     adversarial label specs (the measurement corpus)
src/app/        single-label UI (+ CSV export), /batch UI, /api/{verify,batch,samples,health} routes
scripts/        spike, demo, fixtures (render), measure, samples:record — all runnable without a key
```

Run `npm test` to exercise every check at its boundaries, including the FLAG/FAIL thresholds.
