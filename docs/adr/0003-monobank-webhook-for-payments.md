# ADR 0003 — Premium unlocked by a monobank donation, tracked by a webhook

**Status:** accepted · **Date:** 2026-11-18

## Context
The lecturer's feedback on the pitch: monetise with extra paid games, and track
the payments. Card acquiring (LiqPay, WayForPay, monobank acquiring) needs a
registered business (ФОП). Stripe test mode takes no real money.

## Decision
Base games are free; premium games unlock for a room after a donation of at
least `PREMIUM_PRICE_UAH` to the owner's monobank jar with the room code in the
comment. monobank's personal API calls our webhook for every transaction; the
backend finds the room code, stores the payment once (by its monobank id) and
unlocks the room.

## Consequences
- **+** Real money, no business registration, no fees, works today.
- **+** Every payment is recorded; `make payments` lists them for the report.
- **−** The donor types the code by hand; a typo means a manual unlock.
- **−** The webhook URL contains a long random secret instead of a signature:
  monobank's personal API does not sign webhooks.
- **Note:** Terraform state is kept locally for speed of setup. It holds the
  webhook secret, so it is gitignored; moving it to HCP Terraform (Lab 7) is a
  one-block change in `infra/versions.tf`.
