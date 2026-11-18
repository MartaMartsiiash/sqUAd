# sqUAd: every command in one place. `make help` lists them.
# CI runs the same targets, so a failed step can be repeated on a laptop.

SHELL := /bin/bash
# After `aws login --profile spry`, run any target with PROFILE=spry: every
# terraform and aws call then gets fresh temporary keys from that session
# (Terraform cannot refresh an `aws login` session on its own).
PROFILE ?=
ifneq ($(PROFILE),)
CREDS = eval "$$(aws configure export-credentials --profile $(PROFILE) --format env)" && unset AWS_PROFILE &&
endif
TF ?= $(CREDS) terraform
AWS ?= $(CREDS) aws
PYTHON ?= python3
TF_DIR := infra
tf-out = $(TF) -chdir=$(TF_DIR) output -raw $(1)

.PHONY: help dev api web test lint build-lambda deploy infra frontend-env deploy-frontend \
        mono-webhook unlock logs payments outputs destroy

help: ## Show this list
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# ----- local -------------------------------------------------------------

dev: ## Run the backend and the site locally with Docker Compose
	docker compose up --build

api: ## Run only the backend locally (no Docker), in-memory storage
	cd backend && STORAGE=memory AUTH_DEV_MODE=true uv run --group dev uvicorn app.main:app --reload --port 8000

web: ## Run only the site locally (no Docker)
	cd frontend && npm install && VITE_AUTH_DEV=true npm run dev

test: ## Backend tests
	cd backend && uv run --group dev pytest -q

lint: ## ruff + ESLint + TypeScript
	cd backend && uv run --group dev ruff check . && uv run --group dev ruff format --check .
	cd frontend && npm ci && npm run lint && npx tsc -b

# ----- AWS ---------------------------------------------------------------

build-lambda: ## Build the Lambda package: our code + Linux wheels of its dependencies
	rm -rf build/lambda && mkdir -p build/lambda
	$(PYTHON) -m pip install --quiet --upgrade --target build/lambda \
		--platform manylinux2014_x86_64 --implementation cp --python-version 3.12 --only-binary=:all: \
		"fastapi>=0.115" "pydantic>=2.7" "pydantic-settings>=2.3" "mangum>=0.19" "pyjwt[crypto]>=2.9"
	cp -r backend/app build/lambda/app
	find build/lambda -name "__pycache__" -type d -prune -exec rm -rf {} +

infra: build-lambda ## Create or update everything on AWS with Terraform
	$(TF) -chdir=$(TF_DIR) init -input=false
	$(TF) -chdir=$(TF_DIR) apply

frontend-env: ## Write frontend/.env.production from the Terraform outputs
	@{ \
		echo "VITE_API_URL=$$($(call tf-out,api_url))"; \
		echo "VITE_COGNITO_AUTHORITY=$$($(call tf-out,cognito_authority))"; \
		echo "VITE_COGNITO_CLIENT_ID=$$($(call tf-out,cognito_client_id))"; \
		echo "VITE_COGNITO_DOMAIN=$$($(call tf-out,cognito_domain))"; \
		echo "VITE_AUTH_DEV=false"; \
	} > frontend/.env.production
	@cat frontend/.env.production

deploy-frontend: frontend-env ## Build the site and upload it to S3, then refresh CloudFront
	cd frontend && npm ci && npm run build
	bucket=$$($(call tf-out,site_bucket)); dist=$$($(call tf-out,distribution_id)); \
	$(AWS) s3 sync frontend/dist "s3://$$bucket" --delete --exclude index.html \
		--cache-control "public,max-age=31536000,immutable" && \
	$(AWS) s3 cp frontend/dist/index.html "s3://$$bucket/index.html" --cache-control "no-cache" && \
	$(AWS) cloudfront create-invalidation --distribution-id "$$dist" --paths "/index.html" >/dev/null
	@echo "Site: $$($(call tf-out,site_url))"

deploy: infra deploy-frontend ## Everything: infrastructure, API and site

outputs: ## Show the URLs (site, API, Google redirect URI)
	$(TF) -chdir=$(TF_DIR) output

# ----- payments ----------------------------------------------------------

mono-webhook: ## Point monobank at our webhook (asks for your monobank token, does not store it)
	@url=$$($(call tf-out,mono_webhook_url)); \
	read -rsp "monobank token (api.monobank.ua): " token; echo; \
	curl -sS -X POST https://api.monobank.ua/personal/webhook -H "X-Token: $$token" \
		-H "Content-Type: application/json" -d "{\"webHookUrl\": \"$$url\"}"; echo

unlock: ## Unlock unlimited games for a room by hand: make unlock CODE=K7Q2M
	@test -n "$(CODE)" || { echo "Usage: make unlock CODE=K7Q2M"; exit 1; }
	@curl -sS -X POST "$$($(call tf-out,mono_webhook_url))/unlock/$(CODE)"; echo

logs: ## Show the API's logs from the last hour (webhook calls included)
	$(AWS) logs tail "/aws/lambda/$$($(call tf-out,api_function))" --since 1h --region "$$($(call tf-out,region))"

payments: ## List every tracked donation (for the demo report)
	@curl -sS "$$($(call tf-out,mono_webhook_url))/summary" | $(PYTHON) -m json.tool --no-ensure-ascii

destroy: ## Delete everything sqUAd created on AWS
	$(TF) -chdir=$(TF_DIR) destroy
