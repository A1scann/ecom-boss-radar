## Fix: use a Lovable AI Gateway-supported model

The previous deploy failed because `anthropic/claude-sonnet-4-5` is not on the gateway's allow-list. Claude is not available via Lovable AI at all.

### Change

In `supabase/functions/niche-search/index.ts`, line 16:

```ts
// Before
const AI_MODEL = "anthropic/claude-sonnet-4-5";

// After
const AI_MODEL = "openai/gpt-5";
```

### Why GPT-5 (not Gemini 2.5 Pro)

- Gemini 2.5 Pro previously truncated Pass 1 JSON at ~3.2KB even after we raised `max_tokens` to 8000 — its JSON reliability under heavy structured load was the original failure.
- GPT-5 is the strongest reasoning model on the gateway and is consistently solid at large structured JSON outputs, which is exactly what Pass 1 (50 French products × 6 fields) demands.
- It's a drop-in OpenAI-compatible call — no other code changes needed.

### Untouched

- 2-pass architecture (50 → 30), temperatures (1.0 / 0.3), `max_tokens` 8000 on both passes
- Robust JSON parsing (fence stripping + regex extract + JSON.parse)
- SerpApi chunked validation, scoring, persistence
- `MISSING_LOVABLE_AI_KEY` error envelope and `NicheResults.tsx` banners
- Migration and UI from prior deploys

### Deploy

Redeploy `niche-search` only.
