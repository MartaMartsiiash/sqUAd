# PROJECT.md — sqUAd

> **sqUAd — party games for your squad.** The word *squad* with **UA** inside:
> games for a group of friends, in Ukrainian.

This file is the structure-and-contract specification of the repository. It
says what each folder is for, how the parts talk to each other and why they
are built this way. It contains no implementation code. If this file and the
code disagree, one of them is a bug.

## 1. The product in five sentences

A group of friends is in one room. The **host** signs in, presses *Create a
room* and gets a five-character code such as `K7Q2M` (and a QR code). Every
**player** opens the site on their own phone, types the code and a name, and
lands in the **lobby** without an account. The host picks a game from the
list, everyone plays on their own phone, and the points go to one **scoreboard**
that lives for the whole evening. The first two games in a room are free; a donation to
the host's monobank jar with the room code in the comment unlocks unlimited
games for that room.

### Who uses it

| Role | Account | Can do |
|---|---|---|
| Host | Yes (email + password, or Google) | create a room, start and stop games, kick a player |
| Player | No: a name and the room code | join, play, see the scoreboard |
| Donor | No | unlock unlimited games for a room with a donation |

## 2. Repository layout

```
squad/
├── PROJECT.md             this file: structure and contracts
├── README.md              what the product is, how to run, test and deploy it
├── docs/
│   └── adr/               short Architecture Decision Records (why X, not Y)
├── Makefile               every command: dev, test, lint, build, deploy
├── docker-compose.yml     local run: DynamoDB Local + backend + frontend
├── .env.example           every variable with safe local defaults
├── .github/workflows/
│   └── ci.yml             lint + tests on every push and pull request
├── backend/               FastAPI service (Python 3.12)
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py        app, CORS, routers, GET /api/health
│   │   ├── config.py      settings from environment variables
│   │   ├── auth.py        Cognito JWT check for host endpoints
│   │   ├── lambda_handler.py  AWS Lambda adapter (Mangum)
│   │   ├── domain/        Room, Player, Scoreboard: plain classes, no I/O
│   │   ├── games/         one module per game + the Game base class + registry
│   │   ├── repositories/  RoomRepository: DynamoDB and in-memory versions
│   │   ├── services/      RoomService (use cases), PaymentService (monobank)
│   │   └── api/           HTTP routes: rooms, games, payments
│   └── tests/             pytest; run against the in-memory repository
├── frontend/              React + Vite + TypeScript + Tailwind
│   ├── package.json
│   └── src/
│       ├── pages/         Home, Join, Host, Room (lobby + game + scoreboard)
│       ├── games/         one screen component per game
│       ├── api/           typed client for the backend
│       └── auth/          Cognito sign-in (OIDC, PKCE)
└── infra/                 Terraform: everything on AWS, nothing clicked by hand
    ├── main.tf, variables.tf, outputs.tf
    ├── database.tf        DynamoDB table
    ├── backend.tf         Lambda + function URL + IAM role
    ├── auth.tf            Cognito user pool, Google sign-in, app client
    └── frontend.tf        S3 bucket + CloudFront (HTTPS)
```

## 3. Architecture

```
 phone / laptop (browser)
        │  HTTPS
        ▼
 CloudFront ──► S3            static site (React build)
        │
        │  HTTPS, JSON, polled every ~1.5 s while in a room
        ▼
 Lambda function URL ──► FastAPI (Mangum) ──► DynamoDB (one table)
        ▲                       │
        │ webhook               └── verifies host tokens with Cognito (JWKS)
 monobank (personal API)
```

| Part | Technology | Why |
|---|---|---|
| Frontend | React + Vite + TypeScript + Tailwind, on S3 + CloudFront | Static files: no server, HTTPS and CDN for free |
| Backend | FastAPI on AWS Lambda behind a function URL | Bills nothing while idle; HTTPS endpoint without a load balancer |
| Database | DynamoDB, on-demand, one table | Always-free tier, no instance to pause and wake up, single-digit ms reads |
| Sign-in | Amazon Cognito: email + password and Google | Managed sign-up and sign-in; free up to 10,000 monthly users |
| Live updates | Polling `GET /api/rooms/{code}` | Simplest thing that works for 3–12 phones; no WebSocket infrastructure |
| Payments | monobank personal API webhook | Real money, tracked automatically, no merchant account needed |
| Infrastructure | Terraform | The whole cloud is written down and repeatable |

**Cost at student traffic: $0 a month.** Lambda, DynamoDB, Cognito, S3 and
CloudFront all stay inside their always-free tiers. One evening of 8 players
for 2 hours is roughly 40,000 polling requests; the Lambda free tier is
1,000,000 requests a month.

## 4. Domain model (backend/app/domain)

Plain Python classes. They know nothing about HTTP or DynamoDB, so they are
tested without either.

- **Room**: `code` (5 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`,
  no `0/O` or `1/I` to avoid confusion), `host_id`, `players`, `scoreboard`,
  `current_game` (or none), `games_started`, `premium` (bool: unlimited games
  after a donation), `version` (int), `created_at`,
  `expires_at` (24 hours later; DynamoDB deletes the room by TTL).
- **Player**: `id`, `name`, `emoji`, `color`, `token` (secret, known only to
  that phone), `last_seen`. A player who reloads the page or loses the
  connection comes back with the token kept in `localStorage`.
- **Scoreboard**: total points per player for the whole evening, plus the
  points from each finished game.

## 5. The game contract (backend/app/games)

Every game is a class that inherits from `Game` and is registered in
`registry.py`. The platform (rooms, players, polling, scoreboard) does not
know the rules of any game; a game does not know about HTTP or the database.

```
class Game:
    id: str                 # "spy"
    title: str              # "Шпигун"
    description: str        # one line for the lobby
    min_players: int

    def start(self, players, settings, rng) -> state
    def act(self, state, player_id, action, now) -> state      # a player did something
    def tick(self, state, now) -> state                        # timers: called on every read
    def view(self, state, player_id) -> dict                   # what this phone may see
    def result(self, state) -> dict[player_id, points] | None  # set when the game is over
```

Two rules make this safe:

1. **The server is the referee.** Only `act` changes the state, and it checks
   that the action is allowed in the current phase.
2. **`view` hides secrets.** The spy's phone never receives the location;
   a player never receives the answers of others before the reveal. Hidden
   information is not sent at all, not just hidden in the UI.

The first games are listed in `docs/games.md`.

## 6. HTTP API (backend/app/api)

All paths start with `/api`. Errors share one shape:
`{"error": {"code": "room_not_found", "message": "..."}}`.

| Method and path | Who | What |
|---|---|---|
| `GET /health` | anyone | `{"status": "ok"}` |
| `GET /games` | anyone | the list of games |
| `POST /rooms` | host (Cognito token) | create a room, returns `{code, host_player}` |
| `POST /rooms/{code}/join` | anyone | body `{name, emoji}`; returns `{player_id, token}` |
| `GET /rooms/{code}` | player (`X-Player-Token`) | the room as this player may see it: players, scoreboard, current game view, `version` |
| `POST /rooms/{code}/games` | host | body `{game_id, settings}`; starts a game |
| `POST /rooms/{code}/actions` | player | body `{type, ...}`; an action in the current game |
| `POST /rooms/{code}/games/stop` | host | end the current game early |
| `DELETE /rooms/{code}/players/{id}` | host | remove a player |
| `GET /payments/monobank/{secret}` | monobank | webhook check, returns 200 |
| `POST /payments/monobank/{secret}` | monobank | a new transaction; may unlock a room |

### Concurrency

Two phones can act at the same moment. Every write to a room is a
**conditional write**: "save only if `version` is still N". If another write
won, the service reloads the room and applies the action again (up to 3
times). No locks, no lost updates.

## 7. Payments: how a donation is tracked

1. The lobby shows how many free games are left and, next to it, the host's
   monobank jar link and the room code to put in the comment.
2. monobank sends every new transaction on the owner's accounts and jars to
   `POST /api/payments/monobank/{secret}` (the webhook is registered once with
   `make mono-webhook`).
3. `PaymentService` keeps only incoming payments (amount > 0), at least
   `PREMIUM_PRICE_UAH`, finds a room code in the comment, and stores the
   payment as its own item (`PAY#<transaction id>`), so the same webhook
   delivered twice is counted once.
4. The room gets `premium = true` (unlimited games); every phone sees it on
   its next poll.

The monobank token lives only on the owner's laptop (to register the webhook)
and is never committed. The `{secret}` path part stops strangers from calling
the webhook with fake payments.

## 8. DynamoDB table

One table, on-demand billing, TTL on `expires_at`.

| pk | sk | What |
|---|---|---|
| `ROOM#K7Q2M` | `ROOM` | the whole room as one item: players, scoreboard, game state, version |
| `PAY#<monobank id>` | `PAY` | one tracked payment: amount, comment, room code, time |

A room is small (well under DynamoDB's 400 KB item limit), so it is read and
written as one item: one read per poll, one conditional write per action.

## 9. Configuration

| Variable | Used by | Meaning |
|---|---|---|
| `TABLE_NAME` | backend | DynamoDB table |
| `DYNAMODB_ENDPOINT` | backend | set only locally (DynamoDB Local) |
| `STORAGE` | backend | `dynamodb` or `memory` (tests, quick local run) |
| `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID` | backend | to verify host tokens |
| `AUTH_DEV_MODE` | backend | `true` only locally: accepts a fake host token |
| `CORS_ORIGINS` | backend | the site's URL |
| `MONO_WEBHOOK_SECRET` | backend | the secret path part of the webhook |
| `MONO_JAR_URL` | backend, frontend | the jar link shown to donors |
| `PREMIUM_PRICE_UAH` | backend | minimum donation that unlocks a room (50) |
| `FREE_GAMES` | backend | games a room plays before it needs a donation (2) |
| `VITE_API_URL`, `VITE_COGNITO_*` | frontend | baked into the build |

## 10. Commands (Makefile)

| Command | What it does |
|---|---|
| `make dev` | run everything locally with Docker Compose |
| `make test` | backend tests |
| `make lint` | ruff + ESLint |
| `make deploy` | build the Lambda package and the site, `terraform apply`, upload the site, invalidate CloudFront |
| `make mono-webhook` | register the monobank webhook (asks for the token, does not store it) |

## 11. Out of scope for the first version

Native apps and offline play, WebSockets, chat, accounts for players,
storing rooms after 24 hours.
