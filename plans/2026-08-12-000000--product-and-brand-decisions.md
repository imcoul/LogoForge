---
title: "Product & Brand Decisions — licensing, architecture, jurisdiction"
date: 2026-08-12
author: "Ibrahim"
featureId: "brand-0001"
status: "Accepted"
schemaVersion: 3
relatedPR: ""
---

# Product & Brand Decisions

> **Scope note.** These extend beyond this repository — they govern **every Srvel product**, not
> only the Branding tool. They are recorded here because this is where they were taken and
> because it is version-controlled. **They belong in the Srvel Brand Guide Decisions Log**
> (continuing its D-001…D-009 numbering) and should be mirrored there.
>
> **None of this is legal advice.** It is the shape to take to a lawyer.

Accepted 2026-08-12. Rationale recorded because the reasoning is the part that will be
needed later, not the conclusion.

---

## D-010 — Paid tiers are hosted convenience and capacity, not gated features

**Status:** Accepted · **Applies to:** every Srvel product

**Decision.** Products are AGPL-3.0 with every feature in the open repository. Paid tiers sell
**hosting, capacity and support** — never access to code.

**Reasoning.** You cannot feature-gate AGPL code. Any "power feature" shipped in the AGPL
repository can be legally self-hosted and used by anyone, so the gate is decorative. The
alternative — open core, with paid features in a separate proprietary repository — is legally
workable but carries a permanent two-repository maintenance burden and reliable community
friction.

Hosted-and-capacity also fits the brand better. It maps cleanly onto the **never-say-free**
rule: *"0 FCFA to self-host, and the source is yours"* — which sidesteps the free-as-in-beer
versus free-as-in-freedom confusion that afflicts most open-source messaging. And it keeps the
**Accessible** position honest: nobody is locked out of a capability, only out of us running it
for them.

- **Permitted as paid:** hosted instances, storage and asset capacity, AI request volume,
  collaborator seats, managed backups, SLAs, support.
- **Forbidden:** shipping a feature that is disabled without a licence key.

## D-011 — Endorsed house, not a house of brands or a branded house

**Status:** Accepted · **Applies to:** every Srvel product

**Decision.** Products carry **distinctive names, always visibly under Srvel**. Never
`Srvel <Product>` in a repository, README, CLI or package name; never orphaned from Srvel in
presentation.

```
Srvel  — the trust brand, the network, srvel.net
├── Products    distinctive names, always "by Srvel"
│               DevNoder · Opstimizer · [branding] · [serving]
├── Services    Brand Guide §24 two-tier, organised by felt situation
└── Atelier     division, with its own offerings (Dilani, DWY)
```

**Against a house of brands.** Independent brands mean N domains, N trademark filings, N
marketing surfaces built from zero — a budget question, and the budget does not exist. More
importantly, Srvel will not out-feature the incumbents for years; what it has is a **trust
position** (no dark patterns, no tracking, offline-first, honest numbers, accessible pricing).
Trust is the one asset that compounds across products, and a house of brands discards it at
every launch.

**Against a branded house.** Open source inverts the usual advice. Nobody says "Meta React" or
"Google Kubernetes." A parent-prefixed name reads as vendor-locked and hurts adoption of
something meant to be forked, starred and self-hosted.

**The objection, addressed rather than skipped.** An explicitly Islamic mission and a global
open-source audience could be in tension. The judgement: the values that appear in *product
behaviour* are universally attractive and are the real differentiator; the theological framing
lives in the Manifesto, and most open-source users read a README. Obscuring the mission to
chase adoption would contradict Brand Guide Part 1 §1 and fail **Sidq**, so it was never a live
option.

**Rules that follow:**
- Visible "Built by Srvel" attribution on every product (already standard per §26).
- Never prefix the product name with Srvel in repo, README, CLI or package name.
- **Cores stay architecture, not a brand layer.** Srvel + Cores + products + offers is four
  naming layers, one more than anyone can hold. Cores file things; they are not marketed.
- Product READMEs lead with **what the tool does**.

## D-012 — Product names are not bound to Cores

**Status:** Accepted · **Supersedes:** the first draft of Product Naming Method Rule 1

**Decision.** The primary Core supplies the **naming brief**. The coining rules supply the
**name**. Where the agent-noun form falls out naturally, use it; never force it.

**Reasoning.** The first draft said "a product is the agent of its Core's verb." **DevNoder
matches DEVNODING because the two were coined together, not because a rule was applied** — and
generalising the accident breaks on the very next product. The Branding tool does identity *and*
invoices, letterheads and documents: BRANDING *and* SERVING. Brand Guide §23 already states that
pure single-Core work is rare and that projects carry a primary Core plus secondaries. A hard
binding would force a distortion of either the product or the taxonomy.

## D-013 — Mali and OHADA for now; revisit when revenue justifies it

**Status:** Accepted, provisional

**Decision.** Keep the Mali entity and Mali governing law. Do not create an offshore or
international holding structure yet.

**Reasoning.** "Broader and more international" may not require leaving Mali at all. **Mali is
an OHADA member**, so a Mali entity already sits on business law harmonised across 17 West and
Central African states — regional footing, not purely national. **OAPI** likewise covers a
comparable bloc with a single trademark filing, so four product marks can be protected across
the region from home, in one process.

Three separations worth holding onto:
- Entity jurisdiction, the governing law of the terms, and where a claim can actually be brought
  are **three different choices**. None requires moving the company.
- **GDPR reaches Srvel regardless** if there are EU users. No governing-law clause escapes it,
  so build for it rather than around it.
- For a **free, self-hosted** product, governing law barely matters. It starts mattering for the
  **hosted paid tier** — precisely what D-010 introduces.

Paying for international structure before international revenue exists would repeat the lesson
already in the founder story: structure chased ahead of substance does not lead anywhere.

## D-014 — Competitor connectors are off-limits for research

**Status:** Locked · **Detail:** see `plans/2026-08-05-…roadmap.md` compliance note

**Decision.** The Canva and Figma connectors may not be used for competitive, architectural or
design research on any Srvel product.

**Reasoning.** Figma's Acceptable Use Policy §2(e) prohibits using the Services to "compete with
Figma, or copy any ideas, features, functions, or graphics." Canva's MCP-specific prohibited-use
policy forbids accessing the tools to build a competing product, and separately forbids
reverse-engineering how the platform works — naming internal design structures and brand kit
functionality, and not limited to competitive intent.

**Transferable lesson:** Figma's main Terms of Service contain **no** competing-product clause.
The binding restriction lives in the separate Acceptable Use Policy. Checking only the obvious
document produced a false all-clear. **Check the whole legal index, not the document with the
obvious name.**

**Not covered:** using a connector to import or export a user's *own* files at their request, as
a product integration.

---

# Open items

## URGENT — degrades with time

**Contributor License Agreement.** Needed **before the first outside contribution to any Srvel
product.** Without a CLA, contributors retain copyright in their patches, and Srvel can then
never dual-license or offer a commercial licence, because it does not own the whole work. Cheap
now; effectively unfixable once patches have landed and contributors are unreachable. Set up
once, centrally, covering all four products.

## Ready to draft — nothing blocking

**Product terms document set.** D-010 and D-013 unblock this. Needed: Licence (AGPL-3.0), Terms
of Use for the hosted tier, Privacy Policy, CLA, Trademark Policy.

Brand Guide Part 4 §32's existing drafts cover **the agency** — this is a distinct layer for
products. Two things the product terms must carry that the agency terms do not:
- what users may **not** do with the product, including using it to violate a third party's
  terms (per D-014);
- for bring-your-own-key AI, that the user's use of a third-party model is governed by that
  provider's terms.

## Waiting on input

- **Branding product name** and **Serving product name.** Semantic fields identified in the
  Product Naming Method. Bambara candidates must be **supplied and validated by a native
  speaker, never generated**.
- **OAPI trademark filing** — once names settle. Names are the real moat: AGPL grants no
  trademark rights, so anyone may fork the code but nobody may use the name.
- **Primary database** (Firestore vs Supabase) — still blocks Phase 2 of the Branding product.
  Now leaning **Supabase**: a token system with modes and inheritance is relational, and so is
  invoicing.

## Resolved by the above

- ~~Brand owner — LCOUL Agency or Srvel?~~ **Srvel.** LCOUL was the 2020 predecessor,
  rebranded. The `lcoulagency@gmail.com` role grant in this repository is legacy and should be
  migrated.
- ~~House of brands or branded house?~~ **Neither — endorsed house (D-011).**
- ~~Paid tier shape?~~ **Hosted and capacity (D-010).**
