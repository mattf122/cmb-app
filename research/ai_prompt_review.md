# CMB Site Visit App — AI Prompt Chain Review

**Author:** AI engineering review
**Date:** 2026-05-23
**Subject:** Consistency, accuracy, and structure of the seven LLM calls in `app.js`
**Code reviewed:** `app.js` lines 39-3462 (UNIT_COST_DB, REQUIRED_TRADES_BY_TYPE, validateTakeoff, sanityCheckPerSF, normalizeCostCode, ensureLineItemsForExport, runAnalyzeScope, runGenerateEstimate, callOpenAIImageEdit)

---

## Executive Summary

The pipeline is well-architected at the high level: the app does all the math, the AI only returns quantities and unit costs, and there's good post-validation (cost code normalization, scale-to-section.high, sanity checks). However, **the same project run twice will produce materially different estimates** for five concrete, fixable reasons:

1. **Temperature is 0.3 for every call.** That's enough variance to swing quantities ±15-30% on the same input. Quantity takeoff and Excel line items should be at temperature 0; only the SOW narrative needs >0.
2. **No deterministic seed and no prefilled JSON turn.** Even at temperature 0, the model can drift on quantity counts because it's free-thinking before emitting JSON. Forcing a prefilled `{"takeoff":[` opening turn locks the schema and removes a large source of variance.
3. **The unit cost reference is loose.** The prompt says "unitCostLow = mid-to-high of range" — that single sentence is producing huge variance. On run A the model picks the midpoint, on run B it picks the high. Need an explicit formula.
4. **No few-shot anchoring.** A single worked example of one trade (Demolition with 3 items + quantities + cost picks) would cut variance dramatically. Currently the model invents its own line-item style every run.
5. **Excel line item generation re-rolls everything from scratch.** It doesn't see the takeoff items the AI already returned in Call 3. The estimate gets generated, then `ensureLineItemsForExport` asks the AI to fabricate 8-12 brand new items to hit the section.high total. That's two independent generations of the same data — guaranteed inconsistency. **This is the single biggest leverage point.**

Other findings:

- The SOW prompt (Call 4) **is** well-anchored in the brand voice (good). But it's bundled into the same system prompt as the takeoff, which still says "RESPOND ONLY WITH VALID JSON" — the .replace() hack is fragile.
- The scope analysis prompt (`runAnalyzeScope`) does not pass a `system` parameter at all, so it's not using the Chief Estimator persona consistently with the rest of the pipeline.
- Validation (`validateTakeoff`, `sanityCheckPerSF`) only **warns** to console — warnings are never surfaced to Matt or to the model. If the model misses a required trade, the estimate ships missing it.
- The CSI codes list is sent on every Excel section call (one call per section, 10-15 sections). That's the same 700+ codes shipped 10+ times. Prompt caching would cut tokens and improve consistency.

---

## Call-by-call review

### Call A: `runAnalyzeScope` — Clarifying questions (line 2741)

**Purpose:** Vision + text. Look at site photos, inspiration photos, PDF text. Ask up to 10 questions.

| Aspect | Current | Grade | Notes |
|---|---|---|---|
| System prompt | None — entire instruction is in `user` content | C | Inconsistent with the rest of the pipeline. Persona "senior estimator at CMB" is embedded in the user message instead. |
| Output schema | Inline JSON example with 3 question types | B | Schema is clear, but no `$schema` discipline. Allowed `type` values are demonstrated by example only — model can hallucinate `"type":"number"` or `"type":"date"`. |
| Few-shot | None | C | A single example of what a *good* CMB clarifying question looks like (e.g., "You mentioned 23 windows — are they all 3068 or mixed sizes?") would dramatically improve question quality. |
| Chain-of-thought | None | B | For 10 questions this is probably fine — the model can plan inline. |
| Temperature | Not set explicitly in this call (uses Anthropic default ~1.0). | F | **This is a bug.** `runAnalyzeScope` does NOT route through `workerCall`, so it doesn't get the 0.3 temperature. It uses the Anthropic default, which is ~1.0. Two analyses of the same scope will return completely different question lists. |
| Max tokens | 1500 | OK | |
| Variance | High | | Different runs will produce different questions, which then feed different Q&A into the takeoff, which compounds downstream. |

**Top recommendation:** Add `temperature: 0` and `system:` parameter. Route through `workerCall`.

---

### Call 1: Photo & Document Analysis (line 2961)

**Purpose:** Generate 800-1500 word site notes from photos + PDFs + approved concepts.

| Aspect | Current | Grade | Notes |
|---|---|---|---|
| System prompt | None — all in user content | C | Same issue as Call A. |
| Output format | Free-form prose 800-1500 words | A | Correct choice for this step — narrative output. |
| Few-shot | None | B | Could include a half-paragraph example of "the kind of detail we want" (e.g., "Counted 14 vinyl casement windows on the south elevation, ~3068 size, all original to the 1987 build, exterior weatherstripping is failing"). |
| Chain-of-thought | Implicit via "be specific and quantitative" | B | OK. |
| Temperature | Not set (uses default — not routed through workerCall) | D | Same bug as Call A. Vision output will vary run-to-run. |
| Max tokens | 3000 | OK | |
| Variance | Medium-high | | Narrative drift between runs. |

**Top recommendation:** Add `temperature: 0.2` and `system:` (Chief Estimator persona). Route through workerCall.

---

### Call 2: Code Compliance (line 3030)

**Purpose:** Permits, code, scope triggers, timeline risks, cost impacts as a narrative memo.

| Aspect | Current | Grade |
|---|---|---|
| System prompt | Present and good — "Chief Estimator at CMB with deep Montana code experience" | A |
| Output format | Free-form narrative, 500-800 words, ALL CAPS section headings | B | The ALL CAPS heading rule **directly contradicts the brand voice anti-patterns** (see CLAUDE.md: "ALL CAPS section headers" is on the avoid list). This document is internal, but it gets rendered into the proposal as `complianceAnalysis`. Worth changing to sentence-case. |
| Few-shot | None | B | Format isn't load-bearing here. |
| Temperature | 0.3 via workerCall | OK | Appropriate for narrative. |
| Variance | Medium | | Acceptable for this step. |

**Top recommendation:** Drop the ALL CAPS heading rule. Use sentence-case to match brand voice.

---

### Call 3: Quantity Takeoff (line 3052) — HIGHEST LEVERAGE CALL

**Purpose:** Structured JSON of every line item with qty, unit, unitCostLow, unitCostHigh, labor hours.

| Aspect | Current | Grade | Notes |
|---|---|---|---|
| System prompt | Long, present, well-structured | B+ | Includes UNIT_COST_DB, labor productivity, Montana realities, rules. Good. |
| Output schema | Inline JSON example, single line | C | One-liner schema example is hard for the model to parse. Multi-line with comments per field is clearer. No explicit list of valid `unit` values — model invents "SQFT", "Sq Ft", "sqft", "EACH", etc. |
| Few-shot | None | D | **Huge missed opportunity.** One worked example trade (e.g., Demolition for a 2400 SF remodel: 3 line items with quantities and the reasoning) would lock in consistent output structure. |
| Chain-of-thought | None explicit | C | The model is asked to do quantity reasoning AND emit structured JSON in one shot. Two-turn approach (think first, then emit JSON) would be more consistent. |
| Temperature | 0.3 | F | **Must be 0.** This is a deterministic data-extraction task. Temperature > 0 here is the single biggest cause of run-to-run variance. |
| Max tokens | 4000 | OK | |
| Validation | Post-LLM: `validateTakeoff` checks required trades + flips inverted ranges. Console warnings only. | C | Warnings never surface to the user or feed back to the model. If "Plumbing" is missing on a Residential Remodel, the estimate ships with a hole. |
| Variance | **Severe** | | Combination of 0.3 temp + ambiguous "mid-to-high of range" wording + no few-shot. |

**Top recommendations (in priority order):**

1. **Set temperature to 0.** Single biggest win.
2. **Prefill the assistant turn with `{"takeoff":[`** to force JSON-only output and eliminate the preamble drift.
3. **Replace "unitCostLow = mid-to-high"** with explicit math: `unitCostLow = ref.low + 0.4 * (ref.high - ref.low)`, `unitCostHigh = ref.high`. Removes interpretation.
4. **Add one worked example** of a 3-item trade for the model to mimic.
5. **Make validation block-and-retry.** If required trades are missing, send the model a second turn with "You omitted X, Y. Add them and return the full JSON again."
6. **Constrain `unit` to the enum `["SF","LF","EA","HR","LS","LOT","CY","TON","MO"]`** explicitly.

---

### Call 4: SOW Narrative + Schedule (line 3089)

**Purpose:** Client-facing narrative scope of work + construction schedule + internal compliance flags.

| Aspect | Current | Grade |
|---|---|---|
| System prompt | Re-uses the takeoff SYSTEM with `.replace("RESPOND ONLY WITH VALID JSON", "Return ONLY the requested JSON.")` | C | Fragile. The system prompt still says "Chief Estimator", "quantity takeoff", "FLATHEAD VALLEY 2026 UNIT COST REFERENCE" etc. — none of which is relevant to writing a client-facing narrative. The persona is wrong for the task. |
| Voice anchor | Present and excellent | A | Lines 3103-3117 are textbook adherence to the brand voice (warm, neighborly, sixth-generation Montana, three care behaviors, sentence-case headings, anti-pattern list). This part is correct. |
| Output schema | JSON with `summary`, `schedule.milestones[]`, `complianceNotes[]` | B | OK. |
| Few-shot | None | C | A single example paragraph of "what we saw at your place" written in the correct voice would lock in consistency across runs. |
| Temperature | 0.3 via workerCall | B | Reasonable for narrative; could go 0.4-0.5 for more warmth. |
| Variance | Medium | | The voice anchor is strong enough that narrative quality is consistent. Schedule milestones vary more. |

**Top recommendation:** Replace the takeoff SYSTEM with a dedicated narrative SYSTEM that *only* contains the voice anchor + "you write client-facing copy for CMB." Stop reusing the estimator system prompt.

---

### Call 5: Concept Image Generation (line 3414)

**Purpose:** OpenAI Responses API image-to-image (GPT-4o).

| Aspect | Current | Grade |
|---|---|---|
| Prompt wrapping | "Keep the exact same room geometry, perspective, windows, and architectural elements. Only change what is described." | B+ | Good guardrails. |
| User prompt pass-through | Direct concatenation | B | No content moderation pre-check, but for this use case fine. |
| Variance | OpenAI controls this | | Not actionable from our side. |

**Top recommendation:** Add `"Render in natural daylight unless the user specifies otherwise. Photorealistic, not illustration."` to the wrapper — cuts back on stylized outputs.

---

### Call 6: Excel Line Items per Section (`ensureLineItemsForExport`, line 1309) — SECOND HIGHEST LEVERAGE

**Purpose:** For each section in `est.sections`, generate 8-12 BT-compatible line items that sum to `section.high`.

| Aspect | Current | Grade | Notes |
|---|---|---|---|
| System prompt | "You are a construction estimator in Flathead Valley, Montana. Return ONLY a valid JSON array." | C | Minimal. Doesn't reference UNIT_COST_DB, labor rates, or CMB context. Model is essentially starting from scratch each call. |
| Input context | Only `section.name` + target total | F | **CRITICAL FLAW: the AI takeoff items from Call 3 are NOT passed in.** This call regenerates fresh 8-12 items from nothing, then scales them to match `section.high`. So the Excel export contains entirely different line items than the takeoff used to compute the budget. The client sees one story in the proposal narrative and a completely different one in the Excel. |
| Schema | Inline JSON array example | B | OK. |
| Few-shot | None | D | The CSI code rule alone is 8 lines of instructions — a single example would replace half of it. |
| Temperature | Defaults to Anthropic default (~1.0) — **not set** in this fetch call | F | This is the worst offender for variance. Temperature ~1.0 + no seed + 10-15 separate calls per export = wildly different Excel files each run. |
| Max tokens | 2000 | OK | |
| Post-processing | `normalizeCostCode` validates + fixes codes, scale-to-target. Strong. | A | This is the saving grace — totals always reconcile. |
| Variance | **Severe** | | Same project exported twice will produce two completely different Excels with the same total but different line items. |

**Top recommendations (in priority order):**

1. **Set temperature to 0 in the fetch body.** It's literally missing. One-line fix, massive impact.
2. **Pass the Call 3 takeoff items into this prompt.** The AI should be CONVERTING the existing takeoff items into BT format, not reinventing them. This eliminates the "two stories" problem.
3. **Skip the AI call entirely when the takeoff already has enough detail.** Many sections will already have 3-6 items from Call 3 — just convert them deterministically in code. Only call AI when a section has fewer than 4 items or items are too coarse for BT.
4. **Prompt-cache the CSI codes list.** Currently sent fresh 10-15 times per export.

---

## Structural recommendations

### 1. Use prefilled assistant turns for all JSON calls

Anthropic's API supports assistant message prefill. Add an assistant turn that opens the JSON:

```js
messages: [
  { role: "user", content: prompt },
  { role: "assistant", content: '{"takeoff":[' }
]
```

The model is forced to continue from `{"takeoff":[` and cannot emit preamble like "Here is the takeoff:". This alone removes a huge class of `safeJSON` failures and reduces variance.

### 2. Stop using one SYSTEM for two different jobs

Currently `SYSTEM` is built for Call 3 (takeoff) and then string-replaced for Call 4 (narrative). Build two:

- `SYSTEM_ESTIMATOR` — for Calls 1, 2, 3, 6 (estimator persona, unit cost ref, Montana realities)
- `SYSTEM_NARRATIVE` — for Call 4 (voice anchor, anti-patterns, "no jargon", "sentence case")

### 3. Implement prompt caching

The Anthropic API supports `cache_control: { type: "ephemeral" }` on system blocks. Cache:

- `UNIT_COST_DB` reference table
- `VALID_CSI_CODES` list (when used in Call 6)
- The voice anchor block (Call 4)

For a typical estimate run + Excel export (1 takeoff call + ~12 line-item calls) this cuts ~80% of input tokens on calls 2-12 and provides a small consistency benefit because the cached prefix is byte-identical.

### 4. Add a "thinking before JSON" pattern for Call 3

Instead of one call producing JSON, do:

- **Call 3a:** "Walk through this project trade by trade. Don't return JSON yet — just write 200 words of estimator reasoning identifying what trades apply and roughly what quantities."
- **Call 3b:** "Now convert that reasoning into the JSON schema below." (Pass 3a's output as context.)

This costs one extra call but produces much more consistent output because the schema-emission step is decoupled from the reasoning step.

### 5. Ensembling for the takeoff (optional, costly)

If consistency is paramount, run Call 3 twice at temperature 0 with two different orderings of the input context (e.g., once with PDFs first, once with photos first) and take the **higher** quantity for each line item. Adds latency and cost — only worth it for the highest-stakes bids (gov / large custom).

### 6. Validation must block, not warn

Today, `validateTakeoff` returns warnings that go to `console.warn` and are invisible to Matt. Change to:

- If required trade missing: send a corrective second turn to the model. Don't ship without it.
- If qty <= 0: throw — that's a malformed takeoff.
- If `sanityCheckPerSF` flags >30% deviation from benchmark: surface a yellow banner in the UI before the rep signs.

---

## Temperature audit

| Call | Current | Recommended | Why |
|---|---|---|---|
| Scope analysis (clarifying Qs) | ~1.0 (default) | **0** | Questions should be deterministic given the same inputs. |
| Photo/doc analysis | ~1.0 (default) | **0.2** | Some judgment in narrative but should be consistent. |
| Code compliance | 0.3 | **0.2** | Narrative; mostly factual. |
| Quantity takeoff | 0.3 | **0** | Pure data extraction. |
| SOW narrative | 0.3 | **0.5** | Needs warmth and natural language variation. |
| Schedule (bundled in SOW) | 0.3 | **0** (if split) | Schedule is structured data. Worth splitting Call 4 into 4a (narrative, 0.5) and 4b (schedule, 0). |
| Excel line items | ~1.0 (default) | **0** | Pure data conversion. |

**One change underpins everything else: route every call through `workerCall` so temperature is enforced.** Today, Call 1, Call A, and Call 6 bypass it.

---

## Validation patterns — current vs. recommended

### Current

| Pattern | Where | Strength |
|---|---|---|
| `safeJSON` salvages trailing commas | line 2902 | Good |
| `validateTakeoff` flags missing trades + flips inverted ranges | line 157 | Warns only, no recovery |
| `sanityCheckPerSF` checks $/SF against benchmarks | line 177 | Warns only |
| `normalizeCostCode` strips leading zeros, fixes suffix, fallback to division | line 1206 | **Excellent** — this is the model of how validation should work |
| Scale-to-section-high reconciles line items to budget | line 1407 | Good — keeps Excel total in sync with proposal |
| Excel total vs expected sanity check | line 1464 | Warns only |

### Recommended additions

1. **Quantity sanity table by trade.** Build a per-trade max-multiplier-of-SF table. Example: Drywall qty in SF should be 2.5x-4x project SF (walls + ceilings). Painting same. Framing 1.0-1.5x. If model returns qty > 5x project SF for drywall, flag and re-prompt.

2. **Unit cost range guard.** For every line item, check that `unitCostLow` and `unitCostHigh` fall within ±25% of the closest UNIT_COST_DB entry by string match. If not, log and force into range. Currently model can return $200/SF for drywall and we ship it.

3. **Missing-trade auto-retry.** If `validateTakeoff` returns warnings, send one corrective turn:
   ```
   You omitted these required trades for this project type: [list].
   Add them with realistic quantities. Return the full updated JSON.
   ```

4. **Hallucinated unit guard.** Constrain `unit` to enum `["SF","LF","EA","HR","LS","LOT","CY","TON","MO"]` in the prompt explicitly. Post-process: lowercase + map common variants ("sqft" -> "SF", "each" -> "EA", "lump sum" -> "LS").

5. **Concept-to-estimate consistency check.** If the client approved a concept with "quartz countertops, hardwood floors, custom cabinets" and the takeoff doesn't include any of those words anywhere, flag it. The concept should drive the scope.

---

## Brand voice consistency audit

### Call 4 (SOW narrative): GOOD

Lines 3103-3117 do this right. The voice anchor is quoted nearly verbatim from CLAUDE.md. Sentence-case headings. Anti-patterns explicitly listed. Three care behaviors woven in. Sixth-generation framing present.

Risk: the SYSTEM prompt being reused from the estimator call is still in the model's context, talking about "Chief Estimator", "quantity takeoff", labor productivity, etc. This is corrosive to voice — the model is being told to be both a clinical estimator and a warm neighbor in the same turn. **Split the system prompts.**

### Call 2 (Compliance): VIOLATES brand voice

The prompt says "ALL CAPS section headings" — this is on the brand-voice **anti-pattern list** in CLAUDE.md. The compliance narrative gets embedded as `complianceAnalysis` in the estimate and surfaces in some exports. Should be sentence-case and written in the same neighborly voice (just more technical content).

### Call 1 (Site analysis): NEUTRAL

Pure technical narrative — voice isn't surfacing to client directly, but does feed into Call 4's writing. Consider asking for it in a "neighborly observational" voice so Call 4 has the right tone to amplify.

### Excel exports: NEUTRAL

Pure data — no voice surface.

---

## Top 3 highest-leverage prompt rewrites

See companion file `prompts_v2.md` for the full before/after for:

1. **Call 3 — Quantity Takeoff** (the heart of the estimate)
2. **Call 6 — Excel Line Items** (the heart of the BT export)
3. **Call 4 — SOW Narrative** (the client-facing voice)

---

## Implementation priority — what to change first

Fastest path to consistency, in order:

| # | Change | Effort | Variance impact |
|---|---|---|---|
| 1 | Add `temperature: 0` to the Excel line item fetch (line 1361) | 5 min | Huge |
| 2 | Route `runAnalyzeScope` (line 2741) and Call 1 (line 3007) through workerCall so they inherit temp 0.3 | 15 min | Large |
| 3 | Change takeoff (Call 3) temperature to 0 in workerCall signature default OR pass explicit 0 | 5 min | Huge |
| 4 | Replace "mid-to-high of range" with explicit formula in SYSTEM | 5 min | Medium |
| 5 | Prefill assistant turn with `{"takeoff":[` on Call 3 and `[` on Call 6 | 30 min | Medium |
| 6 | Pass Call 3 takeoff items into Call 6 instead of regenerating from scratch | 1-2 hours | **Huge** (eliminates two-stories problem) |
| 7 | Split SYSTEM into SYSTEM_ESTIMATOR + SYSTEM_NARRATIVE | 30 min | Medium |
| 8 | Add prompt caching for UNIT_COST_DB and CSI codes | 1 hour | Small (consistency) + 40% token savings |
| 9 | Make validateTakeoff block-and-retry instead of warn | 1 hour | Medium |
| 10 | Add quantity sanity table + auto-retry | 2 hours | Medium |

**If Matt does only one thing: items 1 + 3 + 6.** These are the three changes that account for the majority of run-to-run variance.

---

## What I did not look at

- The Word doc proposal generation (not in scope for this review — but the voice rules apply equally there).
- The contract generation.
- The OneDrive sync layer.
- The Cloudflare Worker itself — assumed it passes `temperature` through faithfully (worth confirming).

---

## Files of interest

- `C:/Users/MattFarrier/OneDrive - Copper Mountain Builders/CMB Site Visits/App Code/app.js` lines 1309-1420 (Excel line items)
- `C:/Users/MattFarrier/OneDrive - Copper Mountain Builders/CMB Site Visits/App Code/app.js` lines 2741-2843 (Scope analysis — temperature bug)
- `C:/Users/MattFarrier/OneDrive - Copper Mountain Builders/CMB Site Visits/App Code/app.js` lines 2855-2900 (workerCall)
- `C:/Users/MattFarrier/OneDrive - Copper Mountain Builders/CMB Site Visits/App Code/app.js` lines 2918-2946 (SYSTEM prompt)
- `C:/Users/MattFarrier/OneDrive - Copper Mountain Builders/CMB Site Visits/App Code/app.js` lines 3052-3069 (Call 3 takeoff prompt)
- `C:/Users/MattFarrier/OneDrive - Copper Mountain Builders/CMB Site Visits/App Code/app.js` lines 3089-3126 (Call 4 SOW prompt)
- `C:/Users/MattFarrier/OneDrive - Copper Mountain Builders/CMB Site Visits/App Code/app.js` lines 157-192 (validation functions)
