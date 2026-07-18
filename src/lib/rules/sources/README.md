# Pinned regulatory sources

Every rule this tool applies is **offline data, verified against a pinned source document
committed here** — never a live regulatory fetch (the agency firewall blocks it, the latency
budget forbids it, and these rules change on a timescale of decades). This folder holds the
authoritative CFR text each rule is checked against.

## How a regulation becomes a rule (the intake process)

When a new regulation is added, three things happen:

1. **Pin the source.** The CFR text is committed here as `part-NN-<name>.md`, verbatim from
   the eCFR, with the "up to date as of" date in its header.
2. **Encode the rules** as data-as-code in the matching module (below), each carrying its
   exact citation, an eCFR link, and the `VERIFIED_AGAINST` date matching the pinned source.
3. **Register it** in the manifest table below.

To *add or update* a rule set: drop the CFR document in this folder, encode the checkable
rules in its module, cite precisely, and update the manifest. The dispatcher picks it up
automatically — no other wiring.

## Manifest

| Part | Beverage / topic | Pinned source | Rules module | Verified against |
|---|---|---|---|---|
| **16** | Health warning (all beverages) | [`part-16-warning.md`](part-16-warning.md) | [`../warning-rules.ts`](../warning-rules.ts) | 2026-07-15 |
| **5 (Subpart I)** | Distilled-spirits standards of identity (incl. flavored, cordials, imitations) | [`part-05-spirits.md`](part-05-spirits.md) | [`../standards-of-identity.ts`](../standards-of-identity.ts) | 2026-07-17 (verbatim §§ 5.141–5.156) |
| **4** | Wine standards of identity | [`part-04-wine.md`](part-04-wine.md) | [`../wine.ts`](../wine.ts) | 2026-07-17 |
| **7** | Malt-beverage standards of identity | [`part-07-malt.md`](part-07-malt.md) | [`../malt.ts`](../malt.ts) | 2026-07-17 (designation recognition — no ABV standard) |

> **All four parts are now pinned and evaluated** — spirits and wine by alcohol-content standards
> of identity, malt by class/type designation recognition (Part 7 sets no ABV standard), and the
> health warning across every beverage. A class/type still outside every encoded rule is reported
> as **"not evaluated"** (an honest FLAG) rather than guessed — never an inferred verdict.

## Why pinned, not fetched

A staleness check against the eCFR API (`titles` endpoint, `latest_amended_on` for the
relevant title) is *designed* as a scheduled, out-of-band job — it compares the live amendment
date to each module's `VERIFIED_AGAINST` and alerts if a source has drifted. It is deliberately
**not** on the request path. The rules a reviewer sees are always the pinned, verified ones.
