SHELL := /bin/sh

PNPM := pnpm
DC := docker compose -f compose.yaml

.PHONY: help setup install update dev start build clean test lint format typecheck docker-up docker-down docker-logs docker-rebuild docker-reset env check-env

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "%-16s %s\n", $$1, $$2}'

setup: install env ## Install dependencies and create .env from template if missing

install: ## Install all workspace dependencies
	$(PNPM) install

update: ## Update workspace dependencies
	$(PNPM) update -r

dev: ## Run API and Web in development mode
	$(PNPM) dev

start: ## Run production API server (expects build artifacts)
	$(PNPM) start

build: ## Build web and API for production
	$(PNPM) build

clean: ## Remove local build artifacts
	$(PNPM) clean

test: ## Run all tests
	$(PNPM) test

lint: ## Run linters
	$(PNPM) lint

format: ## Format repository files with Prettier
	$(PNPM) format

typecheck: ## Run TypeScript checks
	$(PNPM) typecheck

docker-up: ## Start local stack with Docker Compose
	$(DC) up --build -d

docker-down: ## Stop local Docker Compose stack
	$(DC) down

docker-logs: ## Stream logs from Docker Compose stack
	$(DC) logs -f --tail=100

docker-rebuild: ## Rebuild and restart Docker Compose stack
	$(DC) up --build -d --force-recreate

docker-reset: ## Remove Docker stack and attached volumes
	$(DC) down -v --remove-orphans

env: ## Create .env from .env.example when absent
	@if [ ! -f .env ]; then cp .env.example .env; echo ".env created from .env.example"; else echo ".env already exists"; fi

check-env: ## Validate required environment variables
	$(PNPM) check-env
