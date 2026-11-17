# ADR 0002 — Polling every 1.5 s instead of WebSockets

**Status:** accepted · **Date:** 2026-11-18

## Context
Every phone in a room must see changes from the others: a new player, a vote,
the next round. WebSockets push changes instantly, but on AWS they need API
Gateway WebSocket APIs, a connections table and fan-out code.

## Decision
Each phone asks `GET /api/rooms/{code}` every 1.5 seconds while the tab is
visible. Timers in games are deadlines checked on every read, so no scheduler
is needed either.

## Consequences
- **+** One Lambda, one endpoint, nothing extra to deploy or pay for.
- **+** A phone that loses the network simply catches up on the next poll.
- **−** Up to 1.5 s delay. Fine for party games with 30–60 s rounds.
- **−** More requests: 8 players × 2 hours ≈ 40,000 requests, still 4% of
  Lambda's monthly free tier. Revisit if a room ever has hundreds of players.
