# Privacy Policy — hosted {{PRODUCT_NAME}}

**Effective {{EFFECTIVE_DATE}}** · Controller: **{{LEGAL_ENTITY}}** (RCCM {{RCCM}}),
{{REGISTERED_ADDRESS}}, Mali. Privacy contact: {{PRIVACY_EMAIL}}.

---

## 0. If you self-host, this policy does not apply to you

{{PRODUCT_NAME}} is AGPL-3.0 software. **If you run your own instance, we receive nothing** —
no account, no content, no telemetry. There is no phone-home in the software, and there never
will be. In that case *you* are the data controller for your own users, and this document may
be useful to you as a starting template rather than as a policy that binds you.

Everything below concerns our hosted service at {{HOSTED_DOMAIN}}.

## 1. The short version

- We collect what the service needs to work, and not more.
- **No advertising. No tracking across sites. No selling data. No data brokers.**
- **We do not train AI models on your content.** Not ours, not anyone's.
- We would rather store nothing than store something we cannot justify.

These are commitments, not aspirations. Where we have had to choose between a useful feature
and collecting more data, the record of that choice is in the repository.

## 2. What we collect

**Account data.** Email address, display name, and authentication identifiers. Needed to give
you an account and let you back into it.

**Your content.** The designs, brands, documents, uploads and text you create. Stored so we can
give it back to you. Treated as confidential.

**Operational data.** Server logs containing IP address, timestamp, request path and error
information — kept for security and debugging, retained **30 days**, then deleted.

**Payment data — handled by our processor, not by us.** We receive a transaction reference and
your plan status. **We never receive or store card numbers.**

**Aggregate analytics.** Privacy-preserving counts only — page views and error rates via
Cloudflare Web Analytics, which uses **no cookies and no cross-site identifiers, and does not
fingerprint visitors.**

**What we do not collect:** advertising identifiers, behavioural profiles, location beyond the
country implied by your IP address, contact lists, or anything from your device beyond what the
browser sends to load a page.

## 3. Cookies and local storage

We use **no advertising or tracking cookies.** What we do store:

| Purpose | Type | Lifetime |
|---|---|---|
| Keeping you signed in | Session cookie | Session, or as you choose |
| Your language choice | Local storage | Until you change it |
| Your theme / display preference | Local storage | Until you change it |
| Offline copy of your work | IndexedDB, on your device | Until you clear it |

The offline copy stays on your device. It exists so the tool keeps working when your connection
does not — which is a mission commitment, not a feature.

## 4. Why we are allowed to process it (GDPR Article 6)

For users in the EEA and UK:

| Data | Lawful basis |
|---|---|
| Account and content | **Contract** — we cannot provide the service otherwise |
| Payment records | **Legal obligation** — accounting and tax |
| Security logs | **Legitimate interests** — keeping the service secure and available |
| Aggregate analytics | **Legitimate interests** — knowing whether it works, balanced by collecting nothing that identifies you |

We do not rely on consent for any of the above, because none of it is optional decoration. If
we ever add something that genuinely is optional, we will ask, and "no" will be as easy as
"yes" — no dark patterns, per Brand Guide Part 1 §9.

## 5. Who else touches your data

We use these providers, and only these, for the hosted service:

| Provider | Role | Where |
|---|---|---|
| Cloudflare | Hosting, CDN, privacy-preserving analytics | Global edge |
| {{DATABASE_PROVIDER}} | Database and file storage | {{DATA_REGION}} |
| {{PAYMENT_PROCESSOR}} | Payments | Regional |
| AI model provider | **Only** when you use an AI feature | Varies |

**On AI specifically:** when you use an AI feature, the content of that request goes to the
model provider to be answered. If you supply your own API key, the request is governed by your
agreement with that provider. We do not send your content to any model for training, and we do
not send content to a model when you have not asked for an AI action.

We add providers only when needed, and this table is updated when we do.

## 6. Where your data lives, and international transfers

Primary storage is in **{{DATA_REGION}}**. Because Cloudflare is a global edge network, data in
transit passes through the point of presence closest to you.

Mali is not the subject of an EU adequacy decision. Where we process personal data of people in
the EEA or UK, transfers are made under **Standard Contractual Clauses** with appropriate
safeguards.

## 7. How long we keep it

| Data | Retention |
|---|---|
| Account and content | Until you delete it, or **30 days** after you close your account |
| Server logs | **30 days** |
| Payment and invoice records | As required by Malian tax and accounting law |
| Backups | Rolling, overwritten within **90 days** |

**Deletion means deletion.** When you delete something, it goes from live systems immediately
and from backups as those backups roll over. We do not keep a shadow copy, and we do not retain
"anonymised" versions of your designs.

## 8. Your rights

Wherever you live, you may **access** your data, **correct** it, **delete** it, **export** it
in an open machine-readable format, **object** to processing based on legitimate interests, and
**complain** to a supervisory authority.

Export is built into the product, not a request queue — you should never have to ask us for
your own work. If you want anything else, write to {{PRIVACY_EMAIL}} and we will respond
**within 30 days**.

**We will not make you argue for these.** No retention offers when you ask to delete, no
friction designed to make you give up.

## 9. Children

The service is not directed at children under 16, and we do not knowingly collect their data.
If you believe a child has given us personal data, write to {{PRIVACY_EMAIL}} and we will
delete it.

## 10. Security

Encryption in transit, encrypted storage at rest, least-privilege access, and authentication
handled by an established identity provider rather than by us rolling our own.

**If a breach affects you, we will tell you** — within **72 hours** of becoming aware where the
law requires it, and regardless of whether the law requires it, because you would want to know.
We will say what happened, what was affected, and what we are doing, without minimising it.

## 11. Changes

For any material change we will give **30 days' notice** and say plainly what changed. We will
not quietly republish with a new date.

---

*{{PRODUCT_NAME}} is built by Srvel. Serve · Grow · Lead.*
