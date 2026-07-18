# 27 CFR Part 16 — Alcoholic Beverage Health Warning Statement

> **Pinned regulatory source.** Verbatim excerpt from the eCFR, **up to date as of
> 2026-07-15**. This file is the offline, traceable source for the warning-statement rules
> in [`../warning-rules.ts`](../warning-rules.ts). No live regulatory fetch happens at
> request time — rules are verified against this pinned text and re-checked out-of-band.
> Authoritative but unofficial (eCFR).

Authority: 27 U.S.C. 205, 215, 218; 28 U.S.C. 2461 note.
Source: T.D. ATF-294, 55 FR 5421, Feb. 14, 1990, unless otherwise noted.

---

## Subpart A — Scope

### § 16.1 General.
The regulations in this part relate to a health warning statement on labels of containers of
alcoholic beverages.

### § 16.2 Territorial extent.
This part applies to the several States of the United States, the District of Columbia, and
the territories and possessions of the United States.

## Subpart B — Definitions

### § 16.10 Meaning of terms (selected).
- **Alcoholic beverage.** Any beverage in liquid form which contains not less than one-half
  of one percent (0.5%) of alcohol by volume and is intended for human consumption.
- **Bottler.** A person who bottles an alcoholic beverage.
- **Container.** The innermost sealed container in which an alcoholic beverage is placed by
  the bottler and offered for sale to the general public.

## Subpart C — Health Warning Statement Requirements

### § 16.20 General.
(a) **Domestic products.** On and after November 18, 1989, no person shall bottle for sale or
distribution in the United States any alcoholic beverage unless the container bears the health
warning statement required by § 16.21.

(b) **Imported products.** On and after November 18, 1989, no person shall import for sale or
distribution in the United States any alcoholic beverage unless the container bears the health
warning statement required by § 16.21.

### § 16.21 Mandatory label information.
There shall be stated on the brand label or separate front label, or on a back or side label,
**separate and apart from all other information**, the following statement:

> GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic
> beverages during pregnancy because of the risk of birth defects. (2) Consumption of
> alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause
> health problems.

(Authority: Sec. 8001, Pub. L. 100-690, 102 Stat. 4181, 27 U.S.C. 215)

### § 16.22 General requirements.
(a) **Legibility.**
1. All labels shall be so designed that the statement required by § 16.21 is readily legible
   under ordinary conditions, and such statement shall be **on a contrasting background**.
2. The **first two words** of the statement required by § 16.21, i.e., **"GOVERNMENT
   WARNING,"** shall appear in **capital letters and in bold type**. **The remainder of the
   warning statement may not appear in bold type.**
3. The letters and/or words of the statement shall not be **compressed** in such a manner
   that the warning statement is not readily legible.
4. Maximum characters per inch by minimum type size: 1 mm → 40; 2 mm → 25; 3 mm → 12.

(b) **Size of type.**
1. Containers of 237 mL (8 fl. oz.) or less — not smaller than **1 millimeter**.
2. Containers of more than 237 mL up to 3 L (101 fl. oz.) — not smaller than **2 millimeters**.
3. Containers of more than 3 L (101 fl. oz.) — not smaller than **3 millimeters**.

(c) **Labels firmly affixed.** Labels bearing the statement which are not an integral part of
the container shall be affixed so that they cannot be removed without thorough application of
water or other solvents.

## Subpart D — General Provisions
- **§ 16.30** Certificates of label approval (ties to Parts 4, 5, and 7 for wine, distilled
  spirits, and malt beverages).
- **§ 16.31** Exports. **§ 16.32** Preemption. **§ 16.33** Civil penalties.

---

## What this tool checks against this source

| Rule (in `warning-rules.ts`) | Section | Status |
|---|---|---|
| Warning text, verbatim & separate/apart | § 16.21 | ✅ enforced |
| "GOVERNMENT WARNING" in caps + bold | § 16.22(a)(2) | ✅ enforced (caps = FAIL; bold = advisory FLAG) |
| Remainder not bold | § 16.22(a)(2) | ✅ enforced (advisory FLAG) |
| Contrasting background | § 16.22(a)(1) | ⚪ not yet implemented (visual — would be advisory) |
| Type size / chars-per-inch | § 16.22(a)(4), (b) | ⚪ out of scope (unmeasurable from an uncalibrated photo) |
