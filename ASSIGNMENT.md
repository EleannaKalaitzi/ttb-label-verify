# Assignment — AI-Powered Alcohol Label Verification App

> The original take-home brief, reproduced here for reference. See
> [`README.md`](README.md) for how this prototype responds to it.

## Project overview

Build an AI-powered application to verify alcohol beverage labels against compliance
applications — a tool to assist the TTB's (Alcohol and Tobacco Tax and Trade Bureau)
Compliance Division in streamlining their label review process.

## Key stakeholder insights

- **Sarah Chen (Deputy Director)** — the TTB processes ~150,000 label applications
  annually with a 47-person team; processing typically takes 5–10 minutes per application.
  Critical constraint: *"If results cannot be delivered in about 5 seconds, adoption will
  fail."* Stressed intuitive design (*"my mother could figure it out"*) and batch-upload
  capability.
- **Marcus Williams (IT Administrator)** — infrastructure runs on Azure (post-2019
  migration). Integration with the existing COLA system (.NET-based) is **not** required
  for this prototype. Network security restrictions may block external cloud API
  connections.
- **Dave Morrison (Senior Agent)** — label verification requires judgment; exact
  pattern-matching alone is insufficient, as minor formatting variations may represent the
  same brand.
- **Jenny Park (Junior Agent)** — government warning statements must be exact: all caps,
  bold, precise wording. Handling poorly-lit or angled label images would be valuable.

## Core requirements

**Extract and verify:**
- Brand name
- Class/type designation
- Alcohol content percentage
- Net contents
- Producer/bottler information
- Country of origin (imports)
- Government health warning statement

**Technical specifications:**
- Process responses within a **5-second** target
- Support **batch uploads** for high-volume submissions
- **Accessible** user interface for diverse technical skill levels
- Handle image-quality variations (angles, lighting, glare)

## Deliverables

1. **Source code repository** with documentation and setup instructions
2. **Deployed, functional prototype** accessible via a URL

## Evaluation focus

Assessment prioritizes correct implementation of core functionality, code quality,
appropriate technical decisions, user experience, requirement adherence, and creative
problem-solving over ambitious but incomplete features.

---

## How this prototype scopes the brief

This prototype deliberately goes **deep on the core compliance checks rather than broad**
across every field, per the evaluation's stated preference for correct core functionality
over ambitious-but-incomplete features. In scope: brand name, class/type, alcohol content
(with proof cross-check), and the government warning + standards-of-identity regulatory
checks — each verdict carrying its regulatory citation. Net contents, bottler, and country
of origin are documented as out of scope in [`README.md`](README.md), with rationale.
Distilled spirits only.
