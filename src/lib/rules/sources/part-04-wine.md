# 27 CFR Part 4 — Labeling and Advertising of Wine

**Pinned source (focused excerpt).** Up to date as of **2026-07-15** (eCFR, authoritative but
unofficial). This is the offline document the wine rules in [`../wine.ts`](../wine.ts) are
verified against. Verified 2026-07-17.

Only the **alcohol-by-volume** standards — the part checkable from a label — are reproduced.
Compositional standards (volatile acidity, cellar treatment, grape-variety percentages,
appellations) are in Part 4 but are **not determinable from a label**, so they are deliberately
not encoded.

---

## § 4.6 Wines covered by this part

> The regulations in this part apply to wine containing **not less than 7 percent and not more
> than 24 percent alcohol by volume**.

## § 4.7 Products produced as wine that are not covered by this part (excerpt)

> **(a)** Products containing **less than 7 percent** alcohol by volume … are not covered by this
> part [refer to FDA food labeling, 21 CFR part 101].
> **(b)** Products … containing **more than 24 percent** alcohol by volume are classified as
> **distilled spirits** and must be labeled in accordance with **part 5**.

*This is the general envelope: any FAA-Act wine is 7–24% ABV. Below 7% → FDA; above 24% → Part 5.*

## § 4.21 The standards of identity (alcohol ranges)

**Class 1; grape wine (§ 4.21(a)):**

> **(5) Table wine** is grape wine having an alcoholic content **not in excess of 14 percent** by
> volume. Such wine may also be designated as "light wine," "red table wine," "light white wine,"
> "sweet table wine," etc.
>
> **(6) Dessert wine** is grape wine having an alcoholic content **in excess of 14 percent but not
> in excess of 24 percent** by volume. Dessert wine having the taste, aroma and characteristics
> generally attributed to **sherry** … of **not less than 17 percent** by volume, may be
> designated as "sherry". Dessert wines … attributed to **angelica, madeira, muscatel and port**
> … of **not less than 18 percent** by volume, may be designated as "angelica," "madeira,"
> "muscatel," or "port" respectively. Dessert wines … in excess of 14 percent by volume but, in
> the case of sherry, **less than 17 percent**, or, in other cases, **less than 18 percent** by
> volume, may be designated as "light sherry," "light angelica," "light madeira," "light
> muscatel" or "light port," respectively.

**Class 5; fruit wine (§ 4.21(e)):**

> **(6) Fruit table wine or berry table wine** … alcoholic content **not in excess of 14 percent**.
> **(7) Fruit dessert wine or berry dessert wine** … **in excess of 14 percent but not in excess
> of 24 percent**.

**Class 6; wine from other agricultural products (§ 4.21(f)):**

> **(2) Table wine** of this class … **not in excess of 14 percent**.
> **(3) Dessert wine** of this class … **in excess of 14 percent but not in excess of 24 percent**.

**Class 7; aperitif wine (§ 4.21(g)):**

> **(1) Aperitif wine** is wine having an alcoholic content of **not less than 15 percent** by
> volume, compounded from grape wine … flavored with herbs and other natural aromatic flavoring
> materials …
> **(2) Vermouth** is a type of aperitif wine …

---

## Rule ↔ source mapping (as encoded in `wine.ts`)

| Designation (keywords) | Rule | Citation |
|---|---|---|
| Table wine | ≤ 14% | § 4.21(a)(5) *(also (e)(6), (f)(2))* |
| Dessert wine | > 14%, ≤ 24% | § 4.21(a)(6) *(also (e)(7), (f)(3))* |
| Sherry | ≥ 17% | § 4.21(a)(6) |
| Angelica / Madeira / Muscatel / Port | ≥ 18% | § 4.21(a)(6) |
| Light sherry | > 14%, < 17% | § 4.21(a)(6) |
| Light angelica / madeira / muscatel / port | > 14%, < 18% | § 4.21(a)(6) |
| Aperitif wine | ≥ 15% | § 4.21(g)(1) |
| Vermouth | ≥ 15% | § 4.21(g)(2) |
| **Any wine (envelope)** | 7–24% (asymmetric — see below) | **§ 4.6** / § 4.7 |

### The scope envelope is asymmetric (`wineEnvelope` in `wine.ts`)

A wine that matches no specific type above is checked against Part 4's scope, and the two bounds
mean different things:

- **> 24% ABV → FAIL.** Above 24% the product is a distilled spirit under Part 5 (§ 4.7(b)), so a
  "wine" designation at that strength is wrong on its face.
- **< 7% ABV → FLAG (not FAIL).** Below 7% the product is outside Part 4 entirely — an
  FDA-regulated low-alcohol product (§ 4.7(a)), e.g. many hard ciders. That is a different
  regulatory regime, not a label defect, so it routes to a human rather than failing.
- **7–24% → PASS.**

### Non-grape wines are Part 4 wines too

Cider, perry, sake, mead, and agricultural/fruit wine are wines under § 4.21(e)–(f). The beverage
classifier recognizes them (plus common varietal and semi-generic type names) so they are
evaluated against Part 4 — **not** misrouted to the distilled-spirits fallback. A class/type whose
beverage family can't be determined at all is reported as "type undetermined," never defaulted to
a spirits standard.

### Not encoded (label-undeterminable, by design)

### Boundary handling (documented leniency)

§ 4.21 uses strict phrasing ("in excess of", "not less than", "less than"). The encoded checks
treat the boundary value itself as compliant (e.g. exactly 17.0% passes as "sherry", exactly 14%
passes as "table wine"). This is the correct leniency for an uncalibrated label read: the finding
that matters is a designation clearly outside its range — a "table wine" at 16% — not a hairline
rounding exactly at the cutoff.

### Not encoded (label-undeterminable, by design)

Varietal grape-content percentages (§ 4.23), appellations of origin (§ 4.25), estate-bottled
(§ 4.26), vintage (§ 4.27), volatile-acidity limits and cellar treatment (§ 4.21/§ 4.22). These
require lab data or documentary evidence, not a photograph — the tool reports what it can verify
and never infers what it cannot.

### A note on 27 CFR Part 24 (Wine — IRC)

Part 24 is the wine **tax and production** regulation (bonded wineries, tax classes, cellar
treatment, recordkeeping) under the Internal Revenue Code — the counterpart to the FAA Act
**labeling** rules in Part 4. It is **not** a labeling regulation and contributes no
label-checkable standard of identity, so it is intentionally **not pinned as a rules source**.
Where its definitions overlap the label (the 24% ABV ceiling for wine; cider/perry/sake/mead as
kinds of wine), they are consistent with Part 4, which is what this tool applies.
