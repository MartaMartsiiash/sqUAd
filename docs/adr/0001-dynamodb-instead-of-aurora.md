# ADR 0001 — DynamoDB instead of Aurora Serverless

**Status:** accepted · **Date:** 2026-11-18

## Context
In the labs the app ran on Aurora Serverless v2 (0–1 ACU). It costs $0 while
paused, but the first request after a pause waits while the cluster resumes,
up to a minute. sqUAd is used in short bursts: a group opens it at a party,
plays for two hours, and leaves. Every evening would start with a cold database.

## Decision
Use one DynamoDB table in on-demand mode. A room is one item (a JSON document
with a `version` number); payments are separate items.

## Consequences
- **+** Always-free tier, no instance, no pause, single-digit millisecond reads.
- **+** TTL deletes rooms after 24 hours at no cost.
- **+** Conditional writes on `version` give safe concurrent updates without locks.
- **−** No SQL and no joins. Acceptable: every screen reads exactly one room.
- **−** A room item must stay under 400 KB; a room with 16 players is a few KB.
