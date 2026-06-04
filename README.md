# AppCompiler — Natural Language → Working App Config

> A compiler-style pipeline that converts natural language product descriptions into validated, executable application configurations.

## Architecture

```
User Prompt
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  Stage 1: Intent Extraction                             │
│  NL → { features, entities, roles, flows, flags }      │
│  LLM call | temp=0.1 | JSON forced                     │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Stage 2: System Design                                 │
│  Intent → { modules, dataFlow, appName }               │
│  Validates: all entities/roles covered                 │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Stage 3: Schema Generation (4 parallel LLM calls)     │
│  ├── DB Schema    (tables, fields, FK, relations)      │
│  ├── API Schema   (endpoints, methods, auth, roles)    │
│  ├── UI Schema    (pages, components, dataSources)     │
│  └── Auth Schema  (roles, RBAC, premium gating)        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Stage 4: Validate + Repair Engine                     │
│  ├── JSON Schema validation (AJV)                      │
│  ├── Cross-layer rule checks (7 rule sets)             │
│  ├── Auto-repair (structural fixes, no LLM needed)     │
│  └── LLM repair (targeted, per-layer, not full retry) │
│  Repeats up to MAX_REPAIR_ATTEMPTS times               │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Stage 5: Runtime Simulation                           │
│  ├── Simulate CREATE TABLE for each table              │
│  ├── Register all API routes (check handlers/FKs)     │
│  ├── Validate auth permission matrix                   │
│  ├── Check all UI dataSources resolve to API paths    │
│  └── Generate code artifacts (Express/DB/React stubs) │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
         Validated, Executable App Config
```

## Validation + Repair System

The repair engine runs in layers:

1. **JSON Schema** (AJV) — catches structural violations
2. **Cross-layer rules** — 7 deterministic checks:
   - DB field types are valid
   - All DB tables have `id`, `created_at`, `updated_at`
   - API endpoints reference existing DB tables
   - UI `dataSource` fields map to real API paths
   - Auth roles match intent roles
   - UI page roles exist in auth config
   - Required pages (`/login`, `/register`, `/dashboard`) exist
3. **Auto-repair** — fixes simple issues without LLM (add missing fields, add missing pages)
4. **LLM repair** — targeted fix for specific layer, not blind full retry

## Output Contract

Every successful run produces a config with these layers:

| Layer | Contains |
|-------|----------|
| `meta` | appName, assumptions, timestamp |
| `intent` | features, entities, roles, flags, clarifications |
| `design` | modules, dataFlow |
| `database` | tables with typed fields, FK, relations |
| `api` | REST endpoints with auth, roles, request/response schemas |
| `ui` | pages with components, layouts, dataSources |
| `auth` | JWT RBAC, permissions matrix, premium gating |

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# 3. Start server
npm start

# 4. Open http://localhost:3000
```

## API

```
POST /api/generate
Content-Type: application/json
{ "prompt": "Build a CRM with..." }
```

Response includes: `config`, `meta.validationLog`, `meta.simulation`, `meta.artifacts`, `meta.cost`

## Evaluation

```bash
# Run full evaluation (20 test cases)
npm run evaluate

# Run only real prompts
node evaluation/run.js real

# Run only edge cases
node evaluation/run.js edge
```

Results saved to `evaluation/results.json`.

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| 4 parallel schema calls in Stage 3 | Reduces latency by ~3x vs sequential |
| temperature=0.1 on all calls | Maximizes determinism |
| `response_format: json_object` | Forces valid JSON from OpenAI, eliminates markdown wrapping |
| Auto-repair before LLM repair | Saves cost, LLM only for non-trivial fixes |
| Targeted LLM repair (per layer) | Avoids full retry, preserves correct layers |
| AJV schema validation | Catch-all for structural contract violations |
| Runtime simulation as dry run | Proves executability without running a real server |

## Cost vs Quality Tradeoff

| Model | Avg Latency | Avg Cost | Quality |
|-------|-------------|----------|---------|
| gpt-4o | ~25s | ~$0.08/run | High |
| gpt-4o-mini | ~12s | ~$0.01/run | Medium |

Set `MODEL=gpt-4o-mini` in `.env` for lower cost (acceptable for simpler prompts).
