# 27 CFR Part 5 — Labeling and Advertising of Distilled Spirits

**Pinned source.** Subpart I — Standards of Identity (§§ 5.141–5.156, 5.166) reproduced verbatim
below, from the eCFR (authoritative but unofficial). Up to date as of **2026-07-15**; rules
verified **2026-07-17**.

> **Provenance.** 27 CFR Part 5. Authority: 26 U.S.C. 5301, 7805; 27 U.S.C. 205, 207. Source:
> T.D. TTB-176, 87 FR 7579, Feb. 9, 2022 — the rulemaking that reorganized Parts 4, 5, and 7.

The rules in [`../standards-of-identity.ts`](../standards-of-identity.ts) are the
**checkable-from-label-text** part of these standards — principally minimum bottling strength.
Production standards (mash bill, distillation proof, barrel type, aging) are reproduced here for
traceability but are not label-determinable, so they are not encoded.

---

## § 5.141 The standards of identity in general (excerpt)

> Distilled spirits are divided, for labeling purposes, into **classes**, which are further
> divided into specific **types**… a distilled spirits product label must bear the appropriate
> class, type or other designation.

## § 5.142 Neutral spirits or alcohol

> "Neutral spirits" or "alcohol" are distilled spirits distilled … at or above 95% alcohol by
> volume (190° proof), and, **if bottled, bottled at not less than 40% alcohol by volume (80°
> proof)**. … **Vodka** … must be designated … as "neutral spirits," "alcohol," or "vodka".
> **Grain spirits** … must be designated as such.

## § 5.143 Whisky (excerpt)

> "Whisky" or "whiskey" is … an alcoholic distillate from a fermented mash of any grain … stored
> in oak barrels (except that corn whisky need not be so stored), and **bottled at not less than
> 40% alcohol by volume (80° proof)** … The types in Table 1 (bourbon, rye, wheat, malt, corn,
> straight whiskies, light, blended, single malt, etc.) and Table 2 (**Scotch, Irish, Canadian**
> whisky) are all types of the class whisky.

## § 5.144 Gin

> "Gin" is distilled spirits made … with or over juniper berries … It must derive its main
> characteristic flavor from juniper berries and **be bottled at not less than 40% alcohol by
> volume (80° proof)**. Distilled gin may be further designated "distilled," "Dry," "London," or
> "Old Tom."

## § 5.145 Brandy (excerpt)

> "Brandy" is spirits … distilled from the fermented juice, mash, or wine of fruit … and **bottled
> at not less than 40% alcohol by volume (80° proof)**. Types include grape brandy, **Cognac,
> Armagnac, Brandy de Jerez, Calvados, Pisco, Singani, Grappa (pomace/marc brandy)**, fruit
> brandy, etc. — all the class "brandy."

## § 5.146 Blended applejack

> "Blended applejack" is a mixture containing at least 20% … apple brandy (applejack) … and must
> be **bottled at not less than 40% alcohol by volume (80° proof)**.

## § 5.147 Rum

> "Rum" is distilled spirits … from … sugar cane … and **bottled at not less than 40% alcohol by
> volume (80° proof)**. **Cachaça** is a type of rum (a distinctive product of Brazil).

## § 5.148 Agave spirits

> "Agave spirits" are distilled from a fermented mash of which at least 51% is derived from Agave
> … **bottled at or above 40% alcohol by volume (80° proof)**. **Tequila** and **Mezcal** are
> types (distinctive products of Mexico).

## § 5.150 Cordials and liqueurs (excerpt)

> Cordials and liqueurs are flavored distilled spirits … containing sugar … not less than 2.5% by
> weight. **[No general minimum bottling strength is stated for the class.]** Named types:
> **rye/bourbon liqueur** and **rum/gin/brandy liqueur** — **not less than 30% ABV**; **rock and
> rye/bourbon/brandy/rum** — **not less than 24% ABV**. Others (Amaretto, Sambuca, Triple Sec,
> Crème de —, Sloe gin, Peppermint schnapps, etc.) carry no stated ABV minimum.

## § 5.151 Flavored spirits

> "Flavored spirits" are distilled spirits conforming to §§ 5.142–5.148 to which natural flavors
> (etc.) have been added, and **bottled at not less than 30% alcohol by volume (60° proof)** …
> designated by the base spirit and the predominant flavor (e.g. "Pineapple Flavored Tequila,"
> "Cherry Vanilla Flavored Bourbon Whisky").

## § 5.152 Imitations

> Imitations must bear, as part of the designation, the word **"imitation"** (e.g. "Imitation
> Whisky"). [No minimum bottling strength.]

## § 5.156 Distilled spirits specialty products (excerpt)

> Distilled spirits that **do not meet one of the other standards of identity** … are distilled
> spirits specialty products and must be designated … with a **statement of composition** (and a
> distinctive or fanciful name). [No minimum bottling strength.]

## § 5.7(a) Health warning cross-reference

> Alcoholic beverages, including distilled spirits, … must be labeled with a health warning
> statement … The regulations implementing the ABLA are contained in **27 CFR part 16**.

---

## Rule ↔ source mapping (as encoded in `standards-of-identity.ts`)

| Designation | Rule | Citation |
|---|---|---|
| Whisky / bourbon / rye / Scotch / Irish / Canadian / corn / straight / blended / single malt | ≥ 40% | § 5.143 |
| Vodka / neutral spirits / grain spirits | ≥ 40% | § 5.142 |
| Gin (incl. London, Dry, Old Tom) | ≥ 40% | § 5.144 |
| Brandy / Cognac / Armagnac / Calvados / Pisco / Grappa | ≥ 40% | § 5.145 |
| Applejack / blended applejack | ≥ 40% | § 5.146 |
| Rum / Cachaça | ≥ 40% | § 5.147 |
| Agave spirits / Tequila / Mezcal | ≥ 40% | § 5.148 |
| **Flavored spirits** ("… Flavored …") | **≥ 30%** | **§ 5.151** |
| **Spirit-based liqueur** (rye/bourbon/rum/gin/brandy liqueur) | **≥ 30%** | **§ 5.150(b)** |
| **Rock and rye/bourbon/brandy/rum** | **≥ 24%** | **§ 5.150(b)(3)** |
| Other cordials/liqueurs (Amaretto, Sloe gin, …) | no floor → PASS | § 5.150 |
| Imitations ("Imitation …") | no floor → PASS | § 5.152 |
| Any other spirit | specialty product → FLAG | § 5.156 |

### Why "special classes" are checked before the base-spirit table

"Cherry Flavored Bourbon Whisky" and "Sloe Gin" both contain base-spirit words, but a flavored
spirit's floor is **30%** (§ 5.151) and a liqueur has **no** floor (§ 5.150) — not whisky's/gin's
40%. Evaluating those classes first is what stops the tool from **falsely failing** a compliant
35% flavored whisky or a 30% sloe gin. Conversely, a plain "Bourbon Whisky" at 38% still FAILs
against the § 5.143 40% minimum.
