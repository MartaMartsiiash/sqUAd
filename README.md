# sqUAd — party games for your squad 🇺🇦

**sqUAd** is a website for playing party games with friends in one room, in
Ukrainian. The host creates a room and gets a five-character code (and a QR
code). Everyone opens the site on their own phone, types the code and a name,
and plays: "Who of us…?", "Ні так, ні ні" (no yes, no no), Spy, Associations, Two
truths and a lie, "Забуті слова" (a bluffing game with forgotten Ukrainian words)
and more. The first two games in a room are free; a 50 UAH donation unlocks the
rest of the evening. One scoreboard follows the group all evening.

> The name is *squad* with **UA** inside: games for your squad, in Ukrainian.

- **Live:** https://www.gamesquad.pp.ua (host sign-in: email + password or Google)
- **How it is built:** [PROJECT.md](PROJECT.md) (structure, contracts, API)
- **Why it is built this way:** [docs/adr](docs/adr)
- **The games and their rules:** [docs/games.md](docs/games.md)

## How it works

```
 phone (browser) ──HTTPS──► CloudFront ──► S3              the React site
        │
        └──HTTPS, every 1.5 s──► Lambda (FastAPI) ──► DynamoDB
                                     ▲        └── Cognito: host sign-in
                    monobank webhook ┘            (email + password or Google)
```

| Folder | What is inside |
|---|---|
| `backend/` | FastAPI app: domain model (Room, Player), games, repositories (DynamoDB / in-memory), services, HTTP API, tests |
| `frontend/` | React + Vite + TypeScript + Tailwind site: home, join, lobby, game screens, scoreboard; dark and light theme |
| `infra/` | Terraform for AWS: DynamoDB, Lambda + function URL, Cognito, S3 + CloudFront |
| `docs/` | Architecture decisions and game rules |

Who needs an account: only the **host**, to create a room. Players join with
the code and a name. Hidden information (the spy's place, others' answers) is
never sent to a phone that should not see it: the server is the referee.

## Run it on your laptop

You need either Docker, or Python 3.12 with [uv](https://docs.astral.sh/uv/)
and Node 22.

```bash
make dev          # with Docker: backend + site
# or, without Docker, in two terminals:
make api          # backend on http://localhost:8000
make web          # site on http://localhost:5173
```

Open http://localhost:5173. Locally the host signs in with any email (no AWS
needed) and rooms live in memory. Open the room link in a few browser windows
(or a private window) to play as several people.

```bash
make test         # backend tests
make lint         # ruff, ESLint, TypeScript
```

## Deploy to AWS

Needs: an AWS account with the CLI signed in (`aws sts get-caller-identity`
works), Terraform ≥ 1.6, Python 3 and Node 22. Everything stays inside the AWS
free tier: **$0 a month** at student traffic.

```bash
cp infra/terraform.tfvars.example infra/terraform.tfvars   # fill in the jar link
export TF_VAR_google_client_secret=...                     # only for Google sign-in
make deploy        # Lambda package + terraform apply + site upload
make outputs       # site_url, api_url, google_redirect_uri
```

**Google sign-in:** put the Google OAuth client id in `terraform.tfvars`, the
secret in `TF_VAR_google_client_secret`, and add the `google_redirect_uri`
output to the client's authorized redirect URIs in Google Cloud Console.

**Payments:** after the first deploy, run `make mono-webhook` once and paste
your monobank personal token from https://api.monobank.ua (it is used for one
request and not stored). From then on every donation to the jar with a room code
in the comment unlocks unlimited games for that room. `make payments` lists every
tracked donation.

**Own domain:** set `domain_name` (and `extra_domains`) in `terraform.tfvars`,
run `make deploy`, add the `acm_validation` CNAME records at your DNS provider,
then set `attach_domain = true` and deploy again. Point `www` at the
`domain_cname_target` output.

If a donation came in while the webhook was off: `make unlock CODE=K7Q2M`.
`make logs` shows the API's log, one JSON line per webhook call.

To remove everything: `make destroy`.

## Cost

| Service | Free tier | sqUAd uses |
|---|---|---|
| Lambda | 1M requests/month (always free) | ~40k per 2-hour evening of 8 players |
| DynamoDB | 25 GB + 25 RCU/WCU (always free) | a few KB per room, deleted after 24 h |
| Cognito | 10,000 monthly users (Lite) | the hosts |
| CloudFront | 1 TB out, 10M requests/month (always free) | a 100 KB site |
| S3 | — | < 1 MB, cents at most |

## Team

Marta Martsiiash, Veronika Parkhomenko — Object-Oriented Analysis and Design, UCU, 2026.
