---
title: AI Categorization
description: Configure OpenAI-compatible OSS backends
---

Lumio can auto-categorize transactions using AI models. The classification pipeline is optional and can be
enabled per workspace.

## Supported providers

- Ollama
- LocalAI
- vLLM
- Any OpenAI-compatible `/v1/chat/completions` endpoint

## Configuration

Open **Integrations → AI-compatible endpoint** and set:

- Base URL
- Model
- API key if your endpoint requires authentication
- Timeout

Env values such as `AI_BASE_URL` and `AI_MODEL` remain supported only as fallback defaults. You can tune
confidence thresholds, concurrency, and circuit breaker behavior using the backend runtime settings.

## Quality controls

- AI timeouts and concurrency limits
- Circuit breaker for repeated failures
- Confidence thresholds for auto-apply vs. review

## Auditability

Each AI classification stores inputs and outputs for traceability. Review suggested categories in the
transactions view.

Next: [Observability](observability)
