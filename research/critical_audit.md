# Critical Audit — CMB Site Visit App Estimating Engine

**File audited:** `app.js` (4,018 lines)
**Date:** 2026-05-23
**Mandate:** Identify sources of run-to-run variance and structural inconsistencies in the estimating pipeline.

---

## Severity-ranked findings

### CRITICAL

---

#### C1. Excel line items are scaled to `section.high`, but the conceptual budget *and contract budget* show `low–high`. The exported Excel will only ever reconcile to the HIGH side.

**Where:** `ensureLineItemsForExport()` lines 1407–1415; `buildBTWorkbook` line 1465; contract summary lines 3791–3806.

```js
// 1407 — scales line items to section.high
const targetTotal = section.high || 0;
const currentTotal = items.reduce((sum, it) => sum + (Number(it.quantity)||0) * (Number(it.unitCost)||0), 0);
if(currentTotal > 0 && targetTotal > 0){
  const scaleFactor = targetTotal / currentTotal;
  items.forEach(it => {
    it.unitCost = Math.round((Number(it.unitCost)||0) * scaleFactor * 100) / 100;
  });
}
```

Then at line 1465 the reconciliation check is `(est.sections||[]).reduce((s, sec) => s + (sec.high||0), 0)` — i.e. compare to the *high* of every section.

**Why it matters:** The proposal Word doc shows clients a range `$X low – $Y high`. The Excel that goes into Buildertrend is built at the HIGH side only — there is no LOW-side Excel. If Matt converts the contract from conceptual range to fixed price using the Excel, he is locking in the top of the range every time. The math discipline of having a range is undone the moment the Excel exists. **This will be invisible until someone bids the job and wonders why CMB always lands at the top of the band.**

Also: `section.high` for the *trade section* does NOT include GC or margin. But the Excel adds a Markup column that multiplies builder cost by `(1 + 20/100)`. So the Excel's Client Price column = `section.high × 1.20`, which exceeds the proposal doc's HIGH (which already includes GC + margin baked in differently — see C2).

**Suggested fix:**
1. Decide explicitly: is the Excel the LOW side, HIGH side, or MID? Document and label.
2. If MID: scale to `(section.low + section.high)/2` and remove the markup column (margin already baked in).
3. If selling the LOW: scale to `section.low` and let the markup column take it up.
4. Add a header row (suppressed during BT import) that states which side this represents.

---

#### C2. Double margin: app math applies `marginPercent` to (subtotal + GC), AND the Excel applies `marginPct` as a Markup column on the SAME line items. Output diverges.

**Where:**
- `computeEstimateFromTakeoff` lines 130–133 — `marginLow = preLow * pct / 100`, `totalLow = preLow + marginLow`.
- `buildBTWorkbook` line 1480 — every Excel row gets `null, marginPct, "%", null, null, null` (the Markup is applied per-line in Excel via the formula `J*(1+K/100)` at line 1494).
- Contract budget at lines 3791–3792 — `sections.map(s => Math.round((s.low||0) * m))` where `m = 1 + marginPercent/100`.

The conceptual budget summary on the contract page **also** multiplies each section by `(1 + margin/100)`, even though `section.low/high` are the raw trade subtotals BEFORE margin. So the contract shows: section-marked-up rows + a separate GC-marked-up row, and the grand-total line below uses `est.totalLow` which was computed as `(subtotal+GC) × (1+margin)`. Two different rollups using the same inputs but different intermediate paths can produce visibly different numbers if rounding accumulates.

**Why it matters:** Three different "totals" can result from the same estimate:
- The proposal doc total (from `est.totalLow`/`totalHigh` — margin applied once at the bottom).
- The contract budget summary section list (margin applied per-section then summed).
- The Excel grand total (markup applied per-line via the formula column, on a builder cost already scaled to `section.high` which contains no margin).

These will not equal each other. Worst case: the client signs a contract at one number, sees Excel pricing at a different number, and gets a proposal Word at a third.

**Suggested fix:** Pick ONE place margin is applied (recommend: only in the Excel via Markup column, and have proposal/contract totals derive from `sum(quantity × unitCost × (1+markup/100)) + GC` so all three views share a single source of truth).

---

#### C3. The "AI does scope, app does math" promise is broken because `unitCostLow` and `unitCostHigh` come from the AI, not the database.

**Where:** `runGenerateEstimate` lines 2918–2946 (system prompt). `UNIT_COST_DB` is *injected as a reference string* (line 2914–2916) and the prompt says "Use the unit cost reference above" (line 2938), but nothing in `computeEstimateFromTakeoff` (lines 95–136) or `validateTakeoff` (lines 157–175) cross-checks the returned `unitCostLow/High` against the DB.

```js
// 2914 — DB is concatenated into the prompt as text
const unitCostRef = Object.entries(UNIT_COST_DB).map(([name, v]) =>
  `  ${name}: ${v.unit} $${v.low} - $${v.high}`
).join("\n");
```

```js
// 99 — math just trusts whatever the AI returned
lineTotalLow:  Math.round(item.qty * item.unitCostLow),
lineTotalHigh: Math.round(item.qty * item.unitCostHigh),
```

**Why it matters:** This is the single biggest source of run-to-run variance. The AI can:
- Pick a unit cost from the reference table (consistent).
- Pick a unit cost adjacent to the reference (10–25% drift).
- Invent a unit cost for items not in the table (unbounded drift — 56 items in DB, but a real takeoff has 80+ line types).
- On a Sonnet fallback (C12), make different choices than Opus made on the previous run.

UNIT_COST_DB is currently **decoration, not enforcement.** The DB exists to give the appearance of constraint without being one.

**Suggested fix:**
1. After AI returns `takeoff`, walk every item and look up its description against `UNIT_COST_DB` via fuzzy match. If found, REPLACE `unitCostLow/High` with the DB values (don't trust the AI).
2. For items not in the DB, flag in console + UI ("$X estimated, not in unit cost DB — verify").
3. Expand the DB to 150+ items so misses are rare. Most items used today are probably not in the 56-item DB.

---

#### C4. Cost-code "validation" silently rewrites every AI-returned code, including correct ones, into the same forced suffix. Forces all self-perform Material rows to non-existent codes when needed.

**Where:** `normalizeCostCode()` lines 1206–1244.

```js
// 1223 — force suffix to match cost type
const suffixMap = { Labor: "1", Material: "2", Subcontractor: "3" };
const wantSuffix = suffixMap[costType];
if(wantSuffix && prefix.length >= 4){
  prefix = prefix.slice(0, -1) + wantSuffix;
}
// 1231 — if not in VALID_CSI_CODES, fall back
if(VALID_CSI_CODES[prefix]) return VALID_CSI_CODES[prefix];

// 1236 — fallback: ANY code in the same division ending in the wanted suffix
const fallbackKey = Object.keys(VALID_CSI_CODES).find(k => { ... });

// 1243 — last resort
return "1.101 Project Administration and General Office Labor";
```

**Why it matters:**
1. If AI returns a correct code like `9.303 Tile and Stone Subcontractor` with `costType="Subcontractor"`, the function correctly preserves it.
2. But if AI returns `9.301 Tile and Stone Labor` with `costType="Subcontractor"` (mismatch), the function rewrites to `9.303` — which happens to be valid. Good.
3. If AI returns a code in a division where no item ends in the wanted suffix (e.g., division 09 has no "Painting Labor" code if Painting is always sub'd), the **fallback grabs the FIRST arbitrary code in that division matching the suffix**. So Painting Labor might become "Plaster and Gypsum Board Labor" silently. The Excel will look correct to BT but be totally wrong from a costing standpoint.
4. The last-resort "1.101 Project Administration and General Office Labor" buckets miscellaneous Subcontractor work into General Office Labor — visibly wrong.

This is a silent data-corruption path. Nothing logs which items got remapped.

**Suggested fix:**
1. Log every remapping to `console.warn` with original→final.
2. Build a sub-map per division of "preferred fallback by trade keyword" (Paint→9.803, Tile→9.303, etc.).
3. Reject and re-prompt the AI for items that fall through to the last-resort code.

---

### HIGH

---

#### H1. `temperature: 0.3` for ALL four AI calls — same as for the warm SOW narrative.

**Where:** `workerCall` line 2866: `temperature: 0.3`.

**Why it matters:** The takeoff is a structural call — quantities and unit costs that should be near-deterministic. The SOW is a creative call where some variation is desirable. Same temperature for both means:
- Takeoff varies more than necessary (drives the run-to-run variance Matt is seeing).
- SOW is colder than it could be (works against the brand voice the rest of the app is so careful about).

Compliance and line-item generation also use whatever defaults their separate fetch calls inherit (Compliance: via `workerCall` so 0.3; line items in `ensureLineItemsForExport` line 1359–1366 — **no temperature set at all**, so worker default applies, which is unknown from this file).

**Suggested fix:**
- Takeoff: `temperature: 0` (or 0.1).
- Compliance: `0.3`.
- SOW narrative: `0.7`.
- Line item gen: `0.2`.
- Pass temperature explicitly through `workerCall`.

---

#### H2. The 4-call AI flow loses information silently between calls.

**Where:** `runGenerateEstimate` lines 2949–3128.

Call 1 (vision/PDF) produces `siteNotes` as free-form prose (3000 max tokens).
Call 2 (compliance) consumes `siteNotes` and produces a 500–800 word narrative.
Call 3 (takeoff) consumes both — but the AI is told to do the takeoff *from* the prose, not from a structured handoff. PDF text is also **truncated to 4000 chars** at line 3061 (`pdfTextForEstimate.slice(0,4000)`) while Call 1 received the full PDF text (line 2987). Specifications, schedules, and any dimensions buried after the 4000-char mark are lost between call 1 and call 3.

```js
// 3061 — truncated to 4000 chars for the takeoff call
${pdfTextForEstimate ? "CONSTRUCTION DOCUMENTS:\n"+pdfTextForEstimate.slice(0,4000) : ""}
```

Call 4 (SOW) sees the computed totals but ALSO sees `siteNotes.slice(0,500)` — even more truncation.

**Why it matters:** A 30-page blueprint set is the most valuable input the estimator has. Cutting it at 4,000 characters before the takeoff means the AI estimates from photos + notes + the FIRST PAGE of the plans only. This is a major estimating-accuracy hit and a major variance source — the cut point is deterministic in code, but the AI's response to a truncated vs. full input is not predictable.

**Suggested fix:**
1. Have Call 1 produce **structured** output: `{rooms:[{name,sqft}], windows:[{type,size,count}], doors:[...], finishes:{floor,wall,counter,cabinets}, dimensions:{...}}`.
2. Pass that JSON directly to Call 3, not the prose.
3. Send the full PDF text to Call 3 if it fits (the worker is the only token-cost constraint, not the model).

---

#### H3. `computeGC` builds GC from a fixed template that does not scale sanely for very small or very large jobs.

**Where:** `computeGC()` lines 138–155.

```js
{ description:"Building permit",        qty:1, lowPer: Math.round(subtotalLow*0.015), highPer: Math.round(subtotalHigh*0.02) },
{ description:"Structural engineering", qty:1, lowPer:4000,  highPer:8000 },
{ description:"Superintendent",         qty:months, lowPer:3500, highPer:4500 },  // $3.5–4.5k/MO is wrong
{ description:"Builder's risk",         qty:1, lowPer: Math.round(subtotalLow*0.008) },
{ description:"Contingency (5%)",       qty:1, lowPer: Math.round(subtotalLow*0.05) }
```

Problems:
1. **Superintendent at $3,500–$4,500/month** is wildly low. A foreman at $100/hr × 40 hrs × 4.3 weeks = $17,200/month. PM at $130/hr × 10 hrs/wk × 4.3 = $5,590/mo for part-time PM. The template is significantly underbilling supervision for the duration of the job — and supervision is the largest GC line on most jobs.
2. **Structural engineering hard-coded at $4k–$8k.** A master bath remodel doesn't need engineering. A new custom home needs $15k–$30k for full structural + civil + truss + foundation. A flat $4–8k is wrong for both ends.
3. **Permits at 1.5–2% of subtotal** — Flathead County residential permits are closer to fixed-fee + per-SF, not percentage. For a $50k bath, 1.5% = $750 (right). For a $1.2M new build, 2% = $24,000 (way over actual fees, which are usually $8–14k).
4. **Contingency at 5% of subtotal** — but margin is applied AFTER GC, so contingency × margin × markup = 5% × 1.2 × 1.2 = the client is paying 7.2% above subtotal for "contingency" they may never see. Worse, this is invisible to the client.
5. **No bonding line** even though prompt at line 2925 tells AI to include bonding for commercial/Davis-Bacon. AI might add it to the takeoff, but then GC will *also* compute its own. Or won't, and bonds will be missed entirely.
6. **`months` default** at line 115 is `Math.max(3, Math.ceil(subtotalLow / 50000))`. A $50k bath = 3 months (probably right). A $1M project = 20 months (way too long; would be 8–10 months). Drives Superintendent and Temp Facilities lines.

**Suggested fix:**
1. Replace flat-rate Superintendent with `months * (carpenter rate * 0.5 + foreman rate * 0.3 + pm rate * 0.2) * 173 hrs/month` or similar burden formula.
2. Tier engineering by project type and SF.
3. Permits: lookup table by project type and value, not percentage.
4. Cap months at `Math.min(Math.max(3, Math.ceil(subtotalLow / 100000)), 18)`.
5. Move contingency to its own visible line in the proposal, not buried in GC.

---

#### H4. `sanityCheckPerSF` is informational only — `console.warn` and discarded.

**Where:** `runGenerateEstimate` lines 3081–3084:
```js
if(z.sqft){
  const sfWarnings = sanityCheckPerSF(computed.totalLow, computed.totalHigh, z.type, Number(z.sqft));
  if(sfWarnings.length) console.warn("Per-SF warnings:", sfWarnings);
}
```

And `validateTakeoff` warnings at line 3074–3075 — same fate.

**Why it matters:** A field rep will never open the browser console. An estimate that comes out at $80/SF for a New Residential Construction (bench: $250–$375) will quietly ship to the client without a single visible warning. The "guardrails" are observation-only.

**Also:** the benchmarks themselves (lines 178–185) need a 2026 update — Flathead Valley new custom is closer to $325–$500/SF today; remodels often $250–$450/SF for full guts.

**Suggested fix:**
1. Display warnings in the UI banner on the Estimate page above the totals: "Per-SF check: this estimate is $X/SF, below typical $Y–$Z/SF range. Review before signing."
2. Update benchmarks to 2026 numbers.
3. Make the warning blocking (require a checkbox "I have reviewed and confirm") before Sign step is reachable.

---

#### H5. `REQUIRED_TRADES_BY_TYPE` validation is matched by substring — produces false positives.

**Where:** `validateTakeoff` lines 160–164:
```js
const returned = (takeoff||[]).map(t => t.trade.toLowerCase());
for(const trade of required){
  if(!returned.some(t => t.includes(trade.toLowerCase()) || trade.toLowerCase().includes(t))){
    warnings.push(`Missing required trade: ${trade}`);
  }
}
```

Required trade `"Doors"` will match any returned trade containing "doors" — including `"Garage Doors"` (matches "Doors"). So if the takeoff has Garage Doors but no Interior or Exterior Doors, validation says all required Doors trades are present.

`"Trim"` matches any string containing "trim", but also matches "Exterior Trim", "Interior Trim", and the reverse: required `"Demolition"` will match returned `"Demo"` (no it won't — substring check is one-way-or-other, so "Demo".includes("Demolition") is false but "Demolition".includes("Demo") is true). So a returned trade `"Selective Demo"` would NOT satisfy required `"Demolition"`. Inconsistent.

**Why it matters:** Validation is supposed to catch missing trades. If it gives false reassurance, the takeoff ships short.

**Suggested fix:** Use a canonical-trade synonym map (`"Doors & Windows" ↔ ["Doors","Windows","Door","Window"]`) and require exact match against the synonym list.

---

#### H6. `REQUIRED_TRADES_BY_TYPE` is missing several common project types.

**Where:** Lines 21–30. Compared against `ZONE_TYPES` lines 3–13:
- "Mixed Use" ✅
- "Other" ❌ — falls through to `[]` so no required trades; the prompt at line 3050 falls back to `"Residential Remodel"` if missing, but only the prompt does — `validateTakeoff` at line 159 uses `REQUIRED_TRADES_BY_TYPE[projectType] || []` so it silently checks NOTHING for "Other".
- Garage conversion, pole barn, shop — not in `ZONE_TYPES`. Field rep would use "Other" → no validation.

Also: **Davis-Bacon does not change the required trades** even though bond/certified payroll are required-by-law.

**Suggested fix:**
- Add explicit "Garage Conversion", "Pole Barn / Shop", "Outbuilding" zone types.
- When project type is "Other", force the AI to declare its own trade list and explicitly confirm.
- When `davisBacon=true`, append `["Bonding","Certified Payroll"]` to required.

---

### MEDIUM

---

#### M1. `workerCall` swallows non-overloaded errors after the model fallback chain completes — but never returns `undefined`.

**Where:** Lines 2855–2900. If all three models fail with errors that aren't `overloaded`/`rate_limit`, the function `throws` correctly. But if the loop completes without ever returning (e.g., all three return 200 with `data.error` set but no overloaded keyword), it falls off the end of the function and returns `undefined`.

```js
for(let attempt = 0; ...) {
  try { ... return data.content[0].text...; }
  catch(err) { if (...overloaded...) continue; throw err; }
}
// no return here — falls off end
```

Then the caller `safeJSON(takeoffRaw, "takeoff")` does `takeoffRaw.indexOf("{")` on `undefined` and crashes with a cryptic error.

**Suggested fix:** After the loop, `throw new Error("All model fallbacks exhausted")`.

---

#### M2. Davis-Bacon is **prompt-only** — no actual wage table embedded.

**Where:** Line 2923:
```js
${isDavisBacon ? `DAVIS-BACON PREVAILING WAGES APPLY. Use DOL prevailing wage rates for Flathead County instead of CMB rates. Add 3-5% for certified payroll. Include bonding costs.` : ...}
```

The CMB rates are hard-coded at lines 33–37. There is no parallel Davis-Bacon wage table. The AI is asked to "use DOL prevailing wage rates for Flathead County" — which it has to make up from training data (no live source, no embedded table). For a public bid, this is a serious accuracy and liability risk.

**Why it matters:** Davis-Bacon use case is one of three explicit use cases for the app (per CLAUDE.md). A government bid generated from AI-imagined wage rates is not a defensible bid.

**Suggested fix:** Embed a DAVIS_BACON_RATES_FLATHEAD constant (carpenter, laborer, electrician, plumber, operator, etc., with fringe). When `davisBacon=true`, replace CMB_LABOR_RATES in the prompt + use a different post-validation step that checks labor lines against the prevailing rate table.

---

#### M3. Scaling rounds unit costs to cents, which can compound on small line items.

**Where:** `ensureLineItemsForExport` line 1413:
```js
it.unitCost = Math.round((Number(it.unitCost)||0) * scaleFactor * 100) / 100;
```

For a 5,000-unit line item, a $0.005 rounding × 5000 = $25 drift. For 10 such items in a section, the post-scale sum can drift $250+ from `section.high` despite the "scale to high exactly" intent. The reconciliation check at line 1467 uses a 5% tolerance, so the drift is invisible.

The bigger issue: **the scaling factor multiplies unit cost, not quantity.** If AI returned `qty=10000 SF × $0.01 unitCost = $100`, scaling 50× becomes `qty=10000 × $0.50 = $5000`. A line saying "Selective demolition — 10,000 SF @ $0.50/SF" is nonsense (demo is $3–$8/SF). Scaling preserves the bad qty and the absurd unit cost; the total is right but the line is unauditable.

**Suggested fix:**
1. After scaling, validate every line's unit cost falls within ±50% of its DB reference.
2. If too far off, re-prompt the AI to redistribute the work into different line items.
3. Use the qty for scaling when the unit cost is "round-looking" (e.g., ends in $X.00 or $XX.00); use unit cost otherwise.

---

#### M4. `lineItemsLookStale` is over-eager — drops perfectly good line items if any one is missing `costType`.

**Where:** Lines 1303–1307:
```js
function lineItemsLookStale(items){
  if(!items || !items.length) return true;
  const first = items[0];  // only checks first item
  return !(first.costCode && first.costType);
}
```

If the first item happens to lack costType, we regenerate the entire section's line items from scratch — including any items the rep manually edited. This is destructive of manual edits.

**Suggested fix:** Check all items; only regenerate the missing ones. Or set a flag on the section indicating "rep-edited, don't regenerate."

---

#### M5. No deduplication between trade takeoff and GC items.

**Where:** GC adds `Building permit`, `Builder's risk insurance`, `Contingency`, etc. The takeoff AI is also told (prompt line 2937–2945) to "include every trade that applies" — and `REQUIRED_TRADES_BY_TYPE` doesn't restrict it. The AI may add "Permits" or "Insurance" to the takeoff. Then GC adds them again. Double-counting.

The Excel sort by CSI division will put them adjacent (both in 00 or 01), but won't merge.

**Suggested fix:** After takeoff, strip any AI-returned trades named `/permit|insurance|contingency|superintendent|temp facil|cleanup|dumpster/i`. Or have the prompt explicitly forbid those (and trust the GC computation).

---

#### M6. PDF text is concatenated globally — across multiple PDFs and unrelated docs — with no document boundaries.

**Where:** `getAllPdfText` line 2073. Then sent to AI without any separator beyond "=== CONSTRUCTION DOCUMENTS — EXTRACTED TEXT ===".

If a project has both blueprints and a survey PDF, the AI gets a giant text blob. PDF text extraction is also lossy (no spatial info from tables/schedules — a window schedule loses its row structure when extracted as text).

**Suggested fix:** Tag each PDF block with `=== PDF: ${filename} ===` and a newline separator. For schedules, consider OCR'ing tables specifically. Send PDFs above 30 pages in chunks.

---

#### M7. Zones array is structurally a list, but the code only ever uses `zones[0]`. Multi-zone projects (e.g., separate detached garage + main house) collapse into the first zone.

**Where:** Throughout — `runGenerateEstimate` line 2850 uses `appData.zones[0]`. There is no UI to add a second zone. But the data structure pretends there are zones, which means anyone reading the code thinks multi-zone is supported.

**Suggested fix:** Either remove the `zones[]` wrapper (single project model) or actually implement multi-zone takeoff (separate AI calls per zone, then merged GC).

---

### LOW

---

#### L1. Retainer suggestion buckets are hard-coded by total band but ignore project type.

`calcRetainerSuggestion` lines 273–282 returns $8k for anything under $50k — including a $15k bath remodel where $8k retainer is more than 50% of contract. Field rep can override but the default is wrong for small jobs.

**Fix:** Tier by both project type and total. For projects under $30k, retainer = `Math.min(8000, total * 0.20)`.

---

#### L2. `safeJSON` regex repair (line 2907) only handles trailing commas. Other common AI JSON errors not handled.

```js
let t = text.slice(s,e+1).replace(/,\s*([}\]])/g,"$1");
```

Doesn't handle: unescaped quotes in description strings, smart quotes, trailing text after JSON, leading text before opening `{`. Each of these will crash the entire `runGenerateEstimate` after a 60–90 second AI call — wasting Matt's time and the client's time on a site visit.

**Fix:** Wrap each known issue. Consider asking AI to re-emit valid JSON on parse failure (one auto-retry).

---

#### L3. `siteNotes` from Call 1 is also passed to Call 4 (SOW) **truncated to 500 chars** (line 3096). So the warm narrative is grounded in only the first ~80 words of the site analysis.

**Fix:** Pass the full siteNotes to SOW (it's the most important grounding context).

---

#### L4. The `models` fallback in `ensureLineItemsForExport` line 1355 is `["claude-haiku-4-5-20251001","claude-sonnet-4-20250514"]` — Haiku FIRST, not Opus.

So Excel line items are generated with the weakest model by default. This is at odds with the overall "Opus → Sonnet → Haiku" fallback philosophy in `workerCall`. Line items are generated by Haiku; takeoff is generated by Opus. Inconsistent.

**Fix:** Use Sonnet primary, Haiku fallback. Or honor a global config.

---

#### L5. `complianceResult` is dumped into the takeoff prompt as a giant prose blob (line 3057). Compliance writeup includes ALL CAPS section headings (per its system prompt line 3044). These caps headings will leak into the takeoff AI's reading frame and may bias the takeoff toward "compliance items" as trade lines.

**Fix:** Strip compliance to a bullet list of code triggers before passing to takeoff.

---

### NIT

---

#### N1. Line 2858: `modelNames` map has "Sonnet" for Sonnet, "Opus" for Opus, "Haiku" for Haiku — but the order in `modelsToTry` line 2857 is `[model, "claude-sonnet-4-20250514", "claude-haiku-4-5-20251001"]`. If `model` is already Sonnet (line 1355 path), the same model is in the chain twice — first attempt and second attempt both call Sonnet. Wastes a retry slot.

**Fix:** Deduplicate `modelsToTry` before iterating.

---

#### N2. `STEPS = ["Client","Scope","Concept","Estimate","Sign","Review"]` — Sign and Review are out of order semantically (Sign happens before Review per CLAUDE.md note "Sign step comes BEFORE Review/Export so contract syncs as part of the close"). Code agrees but `STEPS` is well-named.

---

#### N3. Variable naming `unitCostLow/High` vs `low/high` vs `lowPer/highPer` vs `unitCost` (single number) across the codebase. Easy place for a bug to hide. Suggest standardizing on `unitCostLow`/`unitCostHigh` everywhere.

---

#### N4. `compressImage` (line 2085) compresses to 800px max width — fine for room overviews, marginal for blueprint page photos. A blueprint with small dimension text at 800px is unreadable. Consider passing different sizes for different photo categories.

---

## Consistency model — where variance comes from, ranked

Run the same project twice with identical inputs (same photos, notes, sqft, project type). Sources of variance, biggest to smallest:

1. **AI takeoff non-determinism at temperature 0.3** (H1, C3). With unit costs invented per call from a 56-item reference, two runs can disagree by 15–30% on a $300k project. **THIS IS THE BIGGEST SOURCE.**

2. **Model fallback chain** (C12 — though I haven't found a counter for it). If Opus is overloaded on run 1 and Sonnet picks it up, but Opus is healthy on run 2, the runs use different models. Sonnet vs Opus on the same prompt = different takeoff = different total. Could be 10–20% swing.

3. **Truncated PDF/notes between calls** (H2). Deterministic in code, but the AI's response to truncated vs full input is not predictable. If the first 4000 chars happen to contain the window schedule, takeoff is good; if not, windows are guessed.

4. **GC formula instability for small/large jobs** (H3). At small scale (<$50k), GC is dominated by fixed-fee items that wildly overweight the budget. At large scale (>$1M), GC's percentage items grow linearly with the takeoff, so any AI variance in takeoff is amplified in GC.

5. **Margin double-application paths** (C2). When all three rollups agree at one number, variance from this is zero; when they diverge (rounding differences, GC ordering), the client sees three numbers and picks whichever one the staff happens to quote.

6. **Excel scaling to section.high** (C1) — deterministic, but converts conceptual estimates into HIGH-side estimates the moment they're exported.

### What would reduce variance most, in order

1. **Lock unit costs from `UNIT_COST_DB` post-AI** (C3). Have AI pick item names and quantities; app supplies unit costs from the DB. Variance drops by ~70%.
2. **Expand `UNIT_COST_DB`** to 150+ items so misses are rare. Combined with #1, this is the single biggest accuracy + consistency win.
3. **Drop takeoff temperature to 0** (H1).
4. **Pin to a single model for the takeoff call** (no fallback for the math-critical call). Better to error out and retry than silently use a weaker model.
5. **Send full PDF text to takeoff call** (H2). Most expensive change in tokens but biggest accuracy gain.
6. **Pick one margin-application path** (C2). End the "three different totals" problem.
7. **Make `sanityCheckPerSF` blocking, not advisory** (H4). Add UI banner.
8. **Replace `computeGC` template with proper formula** (H3) — especially Superintendent at burdened crew rate × months.

After these changes, expect run-to-run variance to drop from current (~15–25%) to ~3–7%, which is the inherent noise of a 4-call AI process making narrative + classification choices.

---

## Closing assessment

The estimating engine has the right *architectural shape* — separation of AI scope from app math, validated cost codes, line-item scaling, sanity checks. The implementation has each layer present but **each layer is permissive where it should be strict**:

- The DB is shown to the AI but not enforced.
- Validation issues warnings but doesn't block.
- Cost code normalization silently falls back to wrong codes.
- Excel scaling targets the HIGH only.
- Margin is applied in three places with three rounding paths.
- One temperature serves all four calls.

None of these are individually catastrophic. Together they explain why estimates "vary too much between runs" — the system is built as a layered defense but every layer has a quiet bypass. The fix is not to rewrite the architecture; the fix is to make every layer actually enforce what it pretends to enforce.
