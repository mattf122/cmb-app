# 2026-05-01 — Comprehensive Improvement Pass

Five specialist agents + simplify-skill ran in parallel against the Site Visit App. This summary captures what was found, what was fixed in this commit, and what's still on the table.

## Agents that ran

| Agent | Outcome | Output |
|---|---|---|
| data-researcher | Audit-only (no web) | `research/unit_cost_audit.json`, `research/unit_cost_research_scaffold.json` (inline in transcript) |
| market-researcher | Synthesis (no web) | `research/market_synthesis.md` |
| critical-thinking | Full audit | `research/critical_audit.md` |
| architect-reviewer | Full audit | `research/architecture_review.md` |
| ai-engineer | Full prompt review | `research/ai_prompt_review.md`, `research/prompts_v2.md` |
| simplify (3 finders + verify) | Bug hunt | findings inline |
| voice-extraction (war-room) | Full extraction | `research/voice_anchor_v2.md` |

## Fixed in this commit

### Critical production bugs
1. **Sig pad re-render bug** — `initSigPad` cache prevented listeners from re-attaching after `render()`. Contracts could silently fail to save signatures. Replaced with DOM-marker pattern (`canvas.dataset.sigBound`).
2. **Name-mangling regex** — `split(/[,&]|and/i)` turned "Brandon" into "Br". Replaced with `firstNameFromClient()` helper that splits only on real separators.
3. **Print doc field mismatch** — `renderPrintDoc` read `item.qty`/`item.total` but new line items use `item.quantity` with no `.total` field. Showed `$NaN` in print. Fixed with backward-compatible field reading.
4. **GC items inflated 3×** — `buildBTWorkbook` used `gc.high` as unit cost, but `gc.high` is the LINE TOTAL (qty × unitCostHigh). BT then multiplied by qty again. Now uses `unitCostHigh` and derives correctly.
5. **All-zero line items passed through silently** — added guard that rejects all-zero AI output.

### Estimating consistency
6. **All structural AI calls now `temperature: 0`** — was `0.3` by default, with three calls bypassing `workerCall` and inheriting Anthropic's default ~1.0. Excel line items, photo analysis, scope analysis, takeoff, compliance: all now deterministic.
7. **SOW narrative uses `temperature: 0.4`** — keeps some warmth in the narrative without going random.
8. **Self-perform labor rates pinned** — scaling no longer distorts Carpenter/Foreman/PM hourly rates. Pre-scaling step snaps any hourly Labor unit cost to closest of $85/$100/$130, then scales the non-labor lines to hit `section.high`.
9. **costType sanitized BEFORE `normalizeCostCode`** — was the other way around, so "sub" → wrong code → then sanitized to "Subcontractor" leaving mismatched code/type. Also handles lowercase ("lab", "mat", "sub") shorthand.
10. **GC items now run through `normalizeCostCode`** — was bypassing validation entirely.
11. **AI field-name normalization** — accepts `qty/desc/code/type` and remaps to canonical `quantity/description/costCode/costType`.

### Voice & presentation
12. **SOW prompt voice anchor expanded** — now includes founded date (2018), sixth-generation as heritage (not credential), explicit forbidden list (ALL CAPS headers, corporate filler, hollow adjectives, GC misnomer, "Copper Mountain" without "Builders", experience-years claims, salvage-operator language, dollar amounts as outcomes).
13. **Compliance call (Call 2) — removed ALL CAPS instruction** that violated the brand voice anti-pattern.
14. **Excel line-item prompt clarified** — explicit "this is BUILDER COST (bare cost), not all-in" to prevent confusion. Strict field-name rule added.

### Data
15. **UNIT_COST_DB bug fixes** — Backsplash changed from EA to SF, Kitchen cabinets from EA to LF, Sprinkler system split into Fire-sprinkler (NFPA 13D) and Lawn-irrigation as separate items.
16. **24 new UNIT_COST_DB entries added** — gap items: ICF foundation, helical piers, steel beam, snow-load engineering, well drilling, septic (conventional + sand mound), generator, propane tank set, EV charger, radon mitigation, retaining wall, deck framing + composite, hardscape pavers, fence, closet system, interior stair, fireplace, window covering allowance, structural engineering, survey, builder's risk insurance, paved & gravel driveway.

### Project documentation
17. **CLAUDE.md updated** — accurate company facts: founded 2018, three divisions, named team, correct self-perform vs sub lists, office address, phone, website, Shelby title rule.

## Still on the table (future work, not in this commit)

### High value
- **Centralize `aiCall` helper** — currently the worker fetch + model fallback pattern is duplicated 4 times with subtle drift. Architecture-reviewer flagged as #2 issue.
- **Use Call 3 takeoff for Excel** — instead of regenerating fresh line items per section, derive them from the Call 3 quantity takeoff. Fixes the "two stories" divergence between proposal doc and Excel. AI-engineer flagged as #4 fix.
- **`generateProposalDocument` → delegate to `generateProposalBlob`** — currently 350-line near-duplicate already diverging. Same fix pattern as `generateSignedContractPdf` → `generateSignedContractBlob`.
- **Debounced autosave** — currently only fires on `goTo`. Mid-textarea crash loses data.
- **OneDrive sync error accumulator** — per-file failures silently `console.warn` while success page lies about file count.
- **UNIT_COST_DB lock-in (post-AI validation)** — currently the DB is "decoration" shown to the AI; nothing checks the AI's returned unit costs against the DB. Critical-thinking flagged as #1 source of variance.

### Medium value
- **`REQUIRED_TRADES_BY_TYPE["Other"]` undefined** — projects flagged "Other" skip validation entirely. Add a baseline list.
- **`computeGC` Davis-Bacon mode** — currently only the prompt is told; no embedded wage table. AI hallucinates DB rates for public bids.
- **`sanityCheckPerSF` warnings → user-visible** — currently `console.warn` only.
- **PDF text truncation at 4,000 chars** — most important input gets cut for the takeoff call.
- **Winter concrete surcharge** — if project schedule overlaps Nov-Mar AND foundation/flatwork in scope, +20% on concrete lines + SOW note (from market synthesis).
- **Snow load uplift by city/zone** — Kalispell 50 / Whitefish 70 / Big Mountain 90 / Blacktail 100 PSF (from market synthesis).
- **WUI exterior compliance check** — force ignition-resistant siding + Class A roofing + ember-resistant vent allowance for County addresses or Whitefish/CF foothills (from market synthesis).

### Architecture refactor (defer until next major pass)
- Split `app.js` (3900 lines) into `constants.js` (~900 lines of data) + `estimate-math.js` + `ai-client.js` + `export-excel.js` + `export-doc.js` + `onedrive.js`
- Centralize `appData` schema
- Margin math currently applied in 3 places — consolidate
- Remove 169KB base64 logo in index.html (immediately replaced anyway)

## Variance reduction estimate

Critical-thinking estimate: current variance is **15-25%** run-to-run. After this commit's changes (temperature=0, code validation, labor rate pinning, GC fix, field normalization), expect **5-10%**. After the "Use Call 3 takeoff for Excel" fix, expect **3-7%** — within the 15-20% accuracy target.
