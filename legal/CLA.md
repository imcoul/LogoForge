# Contributor License Agreement

**{{LEGAL_ENTITY}}** · Version 1.0 · Effective {{EFFECTIVE_DATE}}

This agreement covers contributions to **every {{LEGAL_ENTITY}} product**, not only this
repository. **You sign it once.** If you have already signed it for another Srvel project, you
do not sign it again.

---

## 0. Why this exists, stated plainly

Most projects that ask you to sign something do not tell you what they get out of it. Here it
is, before the legal text rather than buried inside it.

**What we get.** The right to keep distributing your contribution under AGPL-3.0, and the right
to also offer the combined work under a different licence — in practice, a paid commercial
licence to an organisation whose legal department forbids AGPL. Without this agreement we
cannot do that, because each contributor would separately own their patch and every one of them
would have to be found and asked. That becomes impossible roughly the moment it becomes
necessary.

**What you get.** The binding promises in §5 — most importantly that **this project will always
remain available under AGPL-3.0 or another OSI-approved free software licence**, and that you
keep full ownership of your work and may do anything you like with it elsewhere.

**What you are not doing.** You are **not** assigning copyright. You keep it. You are granting
a licence alongside the one you already keep.

**If that trade is not acceptable to you, say so.** We would rather hear the objection than
lose the contribution quietly — see §8.

---

## 1. Definitions

**"You"** means the person or legal entity agreeing to these terms. If you are agreeing on
behalf of an organisation, you confirm you are authorised to bind it.

**"Contribution"** means any original work of authorship — code, documentation, designs,
translations, configuration — that you intentionally submit to a Srvel project for inclusion.
"Submit" means any form of deliberate communication to us or our repositories: pull requests,
patches, issues containing code. It does **not** include anything you clearly mark
`Not a Contribution`.

**"Project"** means any software project published by {{LEGAL_ENTITY}}.

## 2. Copyright licence

You grant {{LEGAL_ENTITY}} and every recipient of the software a **perpetual, worldwide,
non-exclusive, 0 FCFA, royalty-free, irrevocable copyright licence** to reproduce, prepare
derivative works of, publicly display, publicly perform, sublicense and distribute your
Contribution and derivative works of it.

**This includes the right to distribute your Contribution under licence terms other than
AGPL-3.0**, subject in full to the commitments in §5.

## 3. Patent licence

You grant {{LEGAL_ENTITY}} and every recipient of the software a **perpetual, worldwide,
non-exclusive, 0 FCFA, royalty-free, irrevocable patent licence** to make, have made, use,
offer to sell, sell, import and otherwise transfer the work, covering only those patent claims
you own or control that are necessarily infringed by your Contribution alone or by the
combination of your Contribution with the Project.

If you institute patent litigation alleging that the Project or a Contribution within it
constitutes patent infringement, the patent licences granted to you under this agreement
terminate as of the date the litigation is filed. This mirrors AGPL-3.0 §10 and exists for the
same reason.

## 4. What you are confirming

By submitting a Contribution, you confirm that:

1. **It is your own work**, or you have the right to submit it under this agreement.
2. **If your employer has rights in it**, you have permission to contribute — or your employer
   has waived those rights, or has itself signed this agreement.
3. **It does not knowingly infringe** anyone's copyright, patent, trade secret or other rights.
4. **Third-party material is identified.** Where a Contribution includes work you did not write
   — a vendored library, a code snippet, an asset — you have identified its source and licence
   in the Contribution itself. Do not silently paste in code you found.
5. **You are not under an obligation** to anyone else that conflicts with this grant.

**On AI-assisted contributions.** Using an assistant is fine, and we do it too. You remain
responsible for what you submit: you must be able to make the confirmations above about the
finished Contribution regardless of how it was produced. Do not submit output you have not
read and understood.

You provide your Contribution **as is**, without warranty of any kind. Nobody here expects you
to indemnify anyone for volunteering a patch.

## 5. What we commit to in return

These commitments are the consideration for the licence you grant in §2, and they bind
{{LEGAL_ENTITY}} and any successor.

**5.1 It stays free software.** Every Contribution accepted into a Project will be distributed
under **AGPL-3.0, or a later version of the AGPL, or another licence approved by the Open
Source Initiative as a free software licence**. We may offer *additional* terms alongside it;
we will never replace the free licence with a proprietary one.

**5.2 No rug-pull.** If {{LEGAL_ENTITY}} is acquired, dissolved, or otherwise changes hands,
§5.1 survives and binds whoever holds the rights. A CLA whose promises evaporate at acquisition
is the failure mode this clause exists to prevent.

**5.3 We will not gate what you built.** Per **D-010**, paid tiers sell hosting, capacity and
support — never access to a feature. Your Contribution will not be turned into the thing
somebody has to pay to unlock.

**5.4 You keep everything.** You retain all right, title and interest in your Contribution and
may use, sell, licence or relicense it however you wish, anywhere else, without restriction and
without telling us.

**5.5 Attribution.** We keep contributors credited in the Project's history and release notes.
Git history is not rewritten to remove authorship.

**5.6 If we breach §5.1 or §5.2**, the licence you granted in §2 **narrows automatically** to
what AGPL-3.0 alone would have granted — the relicensing right in §2 ends. You do not need to
do anything to invoke this, and you do not need our agreement.

## 6. Practicalities

**No obligation on either side.** We are not required to accept, use or keep any Contribution;
you are not required to provide support, updates or further work.

**Circumstances change.** If something you confirmed in §4 stops being true, tell us at
{{CONTACT_EMAIL}}. Withdrawing a statement is not a problem; leaving a wrong one standing is.

**This agreement does not make you an employee, agent or partner** of {{LEGAL_ENTITY}}, and
does not entitle you to compensation.

## 7. Governing law

Governed by the law of **Mali**, an **OHADA** member state, with the courts of Mali having
jurisdiction — see **D-013**. Where you have mandatory protections under the law of your own
country, this clause does not remove them.

## 8. How to sign — and how to object

**Small contributions do not need this.** A typo fix, a broken link, a one-line correction:
open the pull request. The `Signed-off-by` line described below is enough on its own for
anything under roughly **20 changed lines**, and we will not chase you for more.

**For everything else**, either:

- Comment on your first pull request with:
  > *I have read the CLA at `legal/CLA.md` and I agree to it.*
- Or, if your employer requires a signed copy, write to {{CONTACT_EMAIL}} and we will arrange
  it.

**Every commit, of any size, should carry a DCO sign-off:**

```
Signed-off-by: Your Name <your.email@example.com>
```

which `git commit -s` adds for you. The DCO ([developercertificate.org](https://developercertificate.org/))
certifies origin; this CLA grants the licence. They are complementary, not alternatives.

**If you disagree with §2's relicensing right**, open an issue and say so. There is a
well-argued position that CLAs of this kind ask contributors to fund a company's optionality,
and we are not going to pretend that argument does not exist. We will discuss it in the open,
and we will take the contribution under AGPL-only terms if that is the honest resolution.

---

*A Srvel project. Serve · Grow · Lead.*
