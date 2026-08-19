# Legal & policy documents

Drafts for a Srvel product distributed under **AGPL-3.0** with a **hosted paid tier**.
Written against the decisions in `plans/2026-08-12-000000--product-and-brand-decisions.md`.

> **These are not legal advice, and no one who wrote them is a lawyer.**
> They are substantive first drafts built from the product's actual behaviour, so that a
> lawyer's time is spent reviewing real terms rather than drafting from nothing. Brand Guide
> Part 4 §32 already recommends an affordable one-time legal review before scaling to
> high-volume international payments — that recommendation applies here and is not a blocker
> to publishing a well-reasoned first version.

## The set

| File | Governs | Applies to |
|---|---|---|
| `../LICENSE` | The source code | Everyone, always |
| `NOTICE.md` | Copyright notice and why AGPL | Reference — carries the checksum of `../LICENSE` |
| `TERMS.md` | The hosted service | Only people using our hosted instance |
| `PRIVACY.md` | Personal data | Hosted users; self-hosters are their own controller |
| `CLA.md` | Contributions | Anyone opening a pull request |
| `TRADEMARK.md` | The names and marks | Everyone, including forks |

## Why the split matters

**AGPL-3.0 governs the code. It does not govern the hosted service, and it grants no
trademark rights.** Those are three separate things and conflating them is the usual mistake:

- Anyone may run this software for any purpose, 0 FCFA, without agreeing to `TERMS.md`.
- `TERMS.md` binds only those who use *our* instance, because that is a service we provide.
- Anyone may fork the code. **Nobody may use the name.** That is `TRADEMARK.md`, and it is the
  actual moat — see D-011 and D-013.

## Placeholders

Every document marks unsettled values with a name in double braces. Fill them in one pass
before publishing — the full set, with nothing else outstanding:

| Placeholder | Notes |
|---|---|
| `PRODUCT_NAME` | Pending — "Forgel" is retired (D-012); the replacement must come from a native Bambara speaker |
| `LEGAL_ENTITY` | Srvel's registered legal name |
| `RCCM` | Mali commercial register number |
| `REGISTERED_ADDRESS` | |
| `CONTACT_EMAIL` | A real monitored address |
| `PRIVACY_EMAIL` | May be the same address |
| `HOSTED_DOMAIN` | Where the hosted tier lives |
| `REPO_URL` | Canonical source repository |
| `EFFECTIVE_DATE` | Same date across all five documents |
| `YEAR` | Copyright year in `../LICENSE` |
| `DATABASE_PROVIDER` | Blocked on the Firestore vs Supabase decision — currently leaning Supabase |
| `DATA_REGION` | Follows from the database choice |
| `PAYMENT_PROCESSOR` | Whoever settles the hosted tier |

To find any that were missed:

```sh
grep -rnoE '\{\{[A-Z_]+\}\}' LICENSE legal/ | sort -u
```

## Reuse across products

These are written for one product but are **intended as the template for all four Cores'
products**. Only `{{PRODUCT_NAME}}` and the service-specific sections of `TERMS.md` and
`PRIVACY.md` should differ. The CLA and Trademark Policy should be **identical and centrally
held** — a contributor should sign once, not four times.

## Outstanding

- ~~`../LICENSE` needs the canonical AGPL-3.0 text.~~ **Done** — retrieved verbatim from
  gnu.org and installed unmodified; checksum recorded in `NOTICE.md`. It was deliberately never
  written from memory, because an approximate licence is worse than none.
- **`CLA.md` should be adopted before the first outside contribution**, not after. It is the
  one document in this set that gets harder to introduce with every merged pull request —
  see the URGENT open item in the decisions record.
- A **Cookie Policy**, **Disclaimer**, and **Third-Party Services** page are identified as
  needed in Brand Guide Part 4 §32 for the agency site; the product equivalents are partly
  covered inside `PRIVACY.md` here but may warrant standalone pages later.
- The **trademark section of `TRADEMARK.md` names four marks**; only those actually in use
  should survive the fill-in pass, and the OAPI filing (D-013) should follow the naming
  decisions rather than precede them.
