# 27 CFR Part 7 — Labeling and Advertising of Malt Beverages

**Pinned source (focused excerpt).** Subpart D — Label Standards (§§ 7.51–7.56), plus the
name/address rule for imports (§ 7.68), from the eCFR (authoritative but unofficial). Verified
2026-07-17.

> **Provenance.** 27 CFR Part 7. Authority: 27 U.S.C. 205, 207. Source: T.D. TTB-176, 87 FR 7605,
> Feb. 9, 2022 — the rulemaking that reorganized Parts 4, 5, and 7 in parallel.

> **How malt is evaluated — and why it differs from spirits and wine.** Unlike distilled spirits
> (§ 5.143 sets a 40% minimum bottling strength) and wine (§ 4.6 sets a 7–24% envelope, § 4.21
> sets per-type ranges), **Part 7 assigns malt beverages no numeric standard of identity** — there
> is no minimum or maximum ABV. A malt beverage's class/type ("beer," "ale," "lager," "stout,"
> "malt liquor") is a *compositional* designation. So malt's standard of identity is evaluated by
> **designation recognition** (the designation itself, required by § 7.63), not by an alcohol
> range:
>
> | Result | When | Meaning |
> |---|---|---|
> | **PASS** | class/type is a recognized malt designation | the designation is valid; there is no ABV threshold to check |
> | **FLAG** | class/type not recognized | reviewer confirms the designation, or that a statement of composition is borne |
>
> There is **no FAIL path** for malt: with no min/max strength, a malt beverage cannot be
> "under-proof." Recognized designations (encoded in [`../malt.ts`](../malt.ts)) are drawn from
> Part 7 and long-standing trade understanding; § 7.63 is the authority requiring a class/type
> designation in the first place. All *universal* checks (health warning, brand, class/type
> comparison, ABV comparison, net contents, bottler, country of origin) also run on malt.

---

## § 7.51 Requirement for firmly affixed labels (excerpt)

> **(c)** This section in no way affects the requirements of **part 16 of this chapter regarding
> the mandatory health warning statement.**

*Confirms: malt beverages are subject to the Part 16 health-warning check — the same universal
warning module used for spirits and wine.*

## § 7.52 Legibility and other requirements for mandatory information (excerpt)

> **(c) Contrasting background.** Mandatory information must appear in a color that contrasts with
> the background on which it appears … Examples of acceptable contrasts are: (1) Black lettering
> on a white or cream background; or (2) White or cream lettering on a black background.

## § 7.53 Type size of mandatory information (excerpt)

> **(a)(1)** Containers of more than one-half pint — mandatory information at least **two
> millimeters** in height.
> **(a)(2)** Containers of one-half pint or less — at least **one millimeter** in height.
> **(b)** Maximum type size for alcohol content statements: **four millimeters** (containers over
> 40 fl oz) / **three millimeters** (40 fl oz or less).

## § 7.55 Language requirements (excerpt)

> **(a)** Mandatory information must appear in the **English language**, with the exception of the
> brand name … **(c)** may be stated solely in Spanish for malt beverages bottled for consumption
> in the Commonwealth of Puerto Rico.

## § 7.66–7.68 Name and address (excerpt)

> **§ 7.68(b)** The label on malt beverages imported in containers … must state the words
> **"imported by"** or a similar appropriate phrase, followed by the **name and address of the
> importer** … stated as the city and State of the principal place of business.

*This is the malt analogue of the spirits (§ 5.67) and wine (§ 4.35) name/address rules. It is
covered by the tool's **universal** producer/bottler and country-of-origin checks, which run on
every beverage — an imported malt beverage missing a U.S. importer address is handled the same way
as any other product whose origin can't be confirmed.*

---

## What is checkable from a label (and what is not)

| Provision | Section | Status in tool |
|---|---|---|
| **Class/type designation recognition** | **§ 7.63** | **Evaluated** — PASS (recognized) / FLAG (confirm) |
| Health warning statement | § 7.51(c) → Part 16 | Checked (universal warning module) |
| Contrasting background | § 7.52(c) | Advisory / visual — not auto-checked |
| Minimum type size (1mm / 2mm) | § 7.53(a) | Out of scope — unmeasurable from an uncalibrated photo |
| Max alcohol-statement type size | § 7.53(b) | Out of scope — unmeasurable from an uncalibrated photo |
| English-language mandatory info | § 7.55 | Not auto-checked (fuzzy; low value) |
| Numeric standard of identity (ABV) | — none in Part 7 — | N/A: no such standard exists for malt |

## Recognized malt designations (encoded in `malt.ts`)

Beer · Ale (pale, India pale/IPA, brown, amber, blonde, cream) · Lager · Pilsner · Bock · Stout ·
Porter · Wheat beer · Saison · Malt liquor · Malt beverage · Flavored malt beverage.

An unrecognized designation is **flagged**, not failed — because a statement of composition can
lawfully stand in for a standard designation, so "unrecognized" is a review prompt, not a
violation.
