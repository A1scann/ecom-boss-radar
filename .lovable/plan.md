Replace lines 108–117 of `supabase/functions/discovery-run/index.ts` with the strengthened anti-patterns block (Section A: 17 banned saturated FR dropshipping products + variant rejection rule; Section B: generic saturated categories) followed by the 4 positive criteria (problem-solving, rarity in physical stores, complex setup/specs, lighting/home/outdoor priority), preserving the trailing `ANGLE DE GÉNÉRATION POUR CET APPEL: ${seedHint}` line.

Since `buildGenPrompt` is the single template used by all 4 parallel AI calls, the change applies to all of them automatically.

Then deploy `discovery-run` via the edge function deploy tool.

Nothing else changes (mandatory criteria block, JSON output schema, exclusions/taxonomy injection, ranking prompt, model parameters all untouched).