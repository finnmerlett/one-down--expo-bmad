---
name: logging-best-practices
description: "Principles for structured, queryable logging and observability. Use when setting up, reviewing, or debugging logging/telemetry — e.g. wiring pino on the server, the PostHog analytics seam, or deciding what/how to log. Most relevant to Story 8.3 (Analytics & Logging Foundation)."
---

# Logging Best Practices

> Adapted from ["Logging sucks. And here's how to make it better."](https://loggingsucks.com/) by Boris Tane.

Apply these principles when implementing or reviewing logging, analytics, and observability in this project. They are technology-agnostic; in One Down they map onto **pino** (server ops logs), **PostHog** (product analytics, via the typed `track()` seam), and the `before_send` PII guard.

## Core philosophy

- Logs are optimised for **querying, not writing** — design every log for the moment you'll debug with it.
- **Context is everything** — a log without correlation IDs is near-useless once systems talk to each other.
- Logs serve **humans during incidents**, not just "just in case" archival.
- If you can't filter and search them effectively, they have zero value.

## Structured logging

- Always emit **key-value (JSON)**, never string interpolation.
  - Avoid: `"Payment failed for user 123"`
  - Prefer: `{ "event": "payment_failed", "user_id": "123", "reason": "insufficient_funds" }`
- Structured logs are machine-parseable — they enable aggregation, alerting, and dashboards.

## Required fields on every event

- `timestamp` — ISO 8601 with timezone.
- `level` — one of `debug | info | warn | error` (stay consistent; don't invent levels).
- `event` — machine-readable, `snake_case`, past-tense (e.g. `user_login_success`).
- `request_id` / `trace_id` — to correlate logs across a single request.
- `service` — which app/service emitted it.
- `environment` — `prod | staging | dev`.

## High-cardinality fields (include whenever available)

- `user_id`, `org_id`, `account_id` — who is affected.
- `request_id`, `trace_id`, `span_id` — distributed tracing.
- Domain IDs — `task_id`, `job_id`, etc.

These are what make logs queryable during an incident. Actively look for high-cardinality fields that speed up root-cause analysis.

## Context propagation

- Pass trace/request IDs across every boundary (HTTP headers, queues).
- Downstream inherits the upstream correlation ID.
- Inject context automatically via middleware/interceptors rather than by hand.
- For async jobs, store and restore the originating request context.

## Use log levels correctly

- `debug` — verbose, local-dev only; usually off in production.
- `info` — normal operations worth recording (user actions, job completions, deploys).
- `warn` — unexpected but handled (retries, fallbacks).
- `error` — a failure that likely needs a human (exceptions, failed requests).
- Don't log `error` for expected conditions (e.g. a wrong password).

## What to log

- Request entry/exit (with duration).
- State transitions (e.g. `pending → in_progress → completed`).
- External service calls (latency + response codes).
- Auth/authorization events.
- Background job start/complete/fail.
- Retry attempts and circuit-breaker state changes.

## What NOT to log

- **Sensitive data** — passwords, tokens, PII, and (for One Down specifically) **task titles, descriptions, and notes** (NFR-S3).
- Logs inside tight loops / hot paths.
- Success cases with no debugging value.
- Anything already captured by infrastructure (load balancer logs, etc.).

## Naming conventions

- Agree field names up front and stay consistent across client + server.
- `snake_case` field names (`user_id`, not `userId`).
- Past-tense verbs for events (`payment_completed`, not `complete_payment`).
- Prefix by domain where it helps (`auth.login_failed`, `billing.invoice_created`).

## Performance

- Sample high-volume debug logs in production.
- Avoid logging in hot paths unless necessary.
- Buffer/batch writes to reduce I/O.
- Prefer log levels that can change at runtime without a redeploy.

## During incidents

Your logs should answer, within ~5 minutes of querying: **Who was affected? What failed? When? Why?** If they can't, the strategy needs work. Post-incident, add the logs you wished you'd had.
