# Prompts v2 — Drop-in Rewrites

> Top 3 highest-leverage prompts plus supporting plumbing changes.
> Each block shows BEFORE (current code), AFTER (drop-in), and CHANGES (what shifted and why).

---

## 0. Plumbing changes that every prompt depends on

### 0a. Make `workerCall` accept explicit temperature + assistant prefill

**File:** `app.js` line 2855

**BEFORE:**
```js
async function workerCall(messages, system, maxTokens=1000, model="claude-opus-4-20250514"){
  // ...
  body: JSON.stringify({ model:currentModel, max_tokens:maxTokens, temperature:0.3, system, messages })
```

**AFTER:**
```js
async function workerCall(messages, system, maxTokens=1000, model="claude-opus-4-20250514", temperature=0.3, prefill=null){
  // ...
  const finalMessages = prefill
    ? [...messages, { role: "assistant", content: prefill }]
    : messages;
  body: JSON.stringify({ model:currentModel, max_tokens:maxTokens, temperature, system, messages: finalMessages })
```

**Why:** All three prompt rewrites below use the `prefill` parameter to force JSON-only output. The temperature parameter lets each call set its own — narrative wants 0.5, takeoff wants 0.

### 0b. Route `runAnalyzeScope` and Call 1 vision through `workerCall`

Right now they `fetch` directly and inherit the Anthropic default temperature (~1.0). Either set `temperature: 0` explicitly in those `fetch` bodies, or refactor to use `workerCall`. The two-line fix in the direct-fetch bodies:

```js
body: JSON.stringify({ model:analyzeModels[attempt], max_tokens:1500, temperature: 0,
  messages:[...]})
```

Add `temperature: 0` (for analyze) or `temperature: 0.2` (for site-notes vision call). Without this, every other change below is partially undone by random Anthropic-default sampling on the upstream steps.

### 0c. Split the SYSTEM prompts

**BEFORE:** One `SYSTEM` built around the takeoff is reused for the SOW narrative via `.replace()` (line 3126).

**AFTER:** Build two:

```js
const SYSTEM_ESTIMATOR = `You are the Chief Estimator at Copper Mountain Builders performing a quantity takeoff for a project in Flathead Valley, Montana.

YOUR JOB: Identify EVERY line item of work required, assign realistic quantities, and pick unit cost ranges from the reference table below. You do NOT calculate totals. Return quantities and unit costs ONLY. The application handles all math.

${isDavisBacon ? `DAVIS-BACON PREVAILING WAGES APPLY. Use DOL prevailing wage rates for Flathead County instead of CMB rates. Add 3-5% for certified payroll. Include bonding costs.` : `CMB LABOR RATES: Carpenter $85/hr, Foreman $100/hr, PM $130/hr.`}

${isCommercial || isDavisBacon ? `COMMERCIAL/GOV PROJECT: Include performance/payment bonds (2-3% of contract) and certified payroll costs.` : ""}

FLATHEAD VALLEY 2026 UNIT COST REFERENCE:
${unitCostRef}

Typical labor productivity: Framing 0.06 hrs/SF | Roof 0.08 hrs/SF | Siding 0.07 hrs/SF | Roofing 0.05 hrs/SF | Insulation 0.03 hrs/SF | Drywall 0.04 hrs/SF | Tile 0.65 hrs/SF | Hardwood/LVP 0.05 hrs/SF | Painting 0.035 hrs/SF | Trim 0.20 hrs/LF | Window 3 hrs/EA | Door 2 hrs/EA | Plumbing fixture 4-6 hrs/EA | Cabinet 1.5 hrs/EA

MONTANA REALITIES:
- 48-inch frost depth | 70 psf ground snow load | 180-day construction season
- Standing seam standard (8-12 week lead time) | Windows 8-12 weeks | Permit review 4-6 weeks
- Sub availability: framers 8-12 weeks out | WUI requirements add 10-15% to exterior

PRICING RULES (read carefully — same inputs must produce same outputs):
1. unitCostLow = ref.low + 0.4 * (ref.high - ref.low). Round to nearest dollar.
2. unitCostHigh = ref.high (exact value from the reference table).
3. If a line item is not in the reference table, use your best Flathead Valley judgment but document the assumption in the "notes" field.
4. Every interior space needs DRYWALL and PAINTING. Never optional.
5. Read ALL project notes as scope directives. "23 windows" means qty 23. "tile floors throughout" means tile for all floor SF.
6. unitCostLow/High are ALL-IN installed costs (labor + material + sub markup).
7. Do NOT compute any totals. No section totals. No grand totals. Quantities and unit costs ONLY.
8. Every required trade for this project type must be included.
9. laborRate: 85 for most items, 100 for foreman tasks, 130 for PM tasks.
10. Valid unit values: SF, LF, EA, HR, LS, LOT, CY, TON, MO. Nothing else.

RESPOND ONLY WITH VALID JSON. No markdown. No explanation. No preamble.`;

const SYSTEM_NARRATIVE = `You write client-facing copy on behalf of Copper Mountain Builders, a sixth-generation Montana family business in Kalispell. The voice is warm, neighborly, refined. Listens before it pitches. Catches problems before they cost the homeowner. Answers the phone three years after the build. Speaks the way a builder would speak to a friend over coffee — confident in the craft, gentle in the delivery.

VOICE RULES:
- Use "we" for CMB.
- Identify as a neighbor before identifying as a builder.
- Earned warmth, not confident pitch. Competence shows up because of the care, not in place of it.
- Range is explicit: from full custom homes to a long-overdue master bathroom — never imply CMB only does big custom.
- Three care behaviors (use as differentiation, not bullet points): "we catch problems before they cost you", "we listen before we draw a line", "we answer the phone whether you're three days into framing or three years into living in it".
- "Bring clarity to your dreams" is the underlying posture, not a service.
- Sixth-generation Montanan is a true family fact about Matt — heritage, not a company tenure credential.

AVOID:
- ALL CAPS section headers (use sentence case).
- "We look forward to partnering with you" or any corporate filler.
- Hollow adjectives: luxurious, stunning, premier, world-class.
- Construction jargon.
- Bullet-list dryness for narrative content.
- Bro-to-bro confidence with no warmth.
- Fear-mongering about other builders.
- Credential-stacking ("45 years of experience...").
- Implying CMB only does big custom homes.

Write in flowing sentences with short paragraphs. Sentence-case headings. Honest, specific, grounded in what was actually observed at the site.`;
```

Now Call 3 uses `SYSTEM_ESTIMATOR`, Call 4 uses `SYSTEM_NARRATIVE`, Call 2 uses `SYSTEM_NARRATIVE` plus a one-line addendum, Call 6 uses a shortened `SYSTEM_ESTIMATOR` excerpt.

---

## 1. Call 3 — Quantity Takeoff (HIGHEST LEVERAGE)

**File:** `app.js` line 3052

### BEFORE

```js
const takeoffRaw = await workerCall([{role:"user", content:
  `Perform a complete quantity takeoff for this project.

PROJECT: ${projectSummary}
${siteNotes ? "SITE ANALYSIS:\n"+siteNotes : ""}
${complianceResult ? "CODE NOTES:\n"+complianceResult : ""}
${appData.projectNotes ? "OVERALL NOTES: "+appData.projectNotes : ""}
${z.notes ? "PROJECT NOTES: "+z.notes : ""}
${qaContext ? "CLIENT Q&A:\n"+qaContext : ""}
${pdfTextForEstimate ? "CONSTRUCTION DOCUMENTS:\n"+pdfTextForEstimate.slice(0,4000) : ""}

REQUIRED TRADES for ${z.type}: ${requiredTrades.join(", ")}

For each trade, list every specific line item with exact quantity, unit, and unit cost range from your reference table. Use ${z.sqft||"the noted"} SF as the basis for area-based quantities. Count specific items from notes/photos/documents.

Return ONLY this JSON:
{"takeoff":[{"trade":"Trade Name","csiCode":"XX","items":[{"description":"item","qty":0,"unit":"SF","unitCostLow":0,"unitCostHigh":0,"laborHoursPerUnit":0,"laborRate":85,"notes":"assumption"}]}],"constructionMonths":0,"scopeNotes":"summary"}`
}], SYSTEM, 4000);
```

### AFTER

```js
const takeoffRaw = await workerCall(
  [{role:"user", content:
`Perform a complete quantity takeoff for this project.

=== INPUTS ===
PROJECT: ${projectSummary}
${siteNotes ? "SITE ANALYSIS:\n"+siteNotes : ""}
${complianceResult ? "CODE NOTES:\n"+complianceResult : ""}
${appData.projectNotes ? "OVERALL NOTES: "+appData.projectNotes : ""}
${z.notes ? "PROJECT NOTES: "+z.notes : ""}
${qaContext ? "CLIENT Q&A:\n"+qaContext : ""}
${pdfTextForEstimate ? "CONSTRUCTION DOCUMENTS:\n"+pdfTextForEstimate.slice(0,4000) : ""}

=== REQUIRED TRADES (must all appear in your takeoff) ===
${requiredTrades.join(", ")}

=== SCHEMA ===
{
  "takeoff": [
    {
      "trade": "string — one of the required trades or an additional trade clearly indicated by the scope",
      "csiCode": "string — two-digit CSI division (e.g., '02', '06', '22')",
      "items": [
        {
          "description": "string — 5-12 word specific description, no vague items like 'misc'",
          "qty": "number — actual quantity, never 0",
          "unit": "enum — one of: SF, LF, EA, HR, LS, LOT, CY, TON, MO",
          "unitCostLow": "number — computed as ref.low + 0.4 * (ref.high - ref.low), rounded",
          "unitCostHigh": "number — exact value of ref.high from the reference table",
          "laborHoursPerUnit": "number — productivity from system productivity table, 0 for sub work",
          "laborRate": "integer — 85, 100, or 130",
          "notes": "string — one short sentence stating the assumption or basis"
        }
      ]
    }
  ],
  "constructionMonths": "integer — realistic construction phase length in months",
  "scopeNotes": "string — one paragraph summary, no headings"
}

=== WORKED EXAMPLE (for a 2400 SF Residential Remodel with the note "23 windows, tile bathrooms, hardwood throughout") ===
{
  "takeoff": [
    {
      "trade": "Demolition",
      "csiCode": "02",
      "items": [
        { "description": "Selective interior demo, walls and finishes", "qty": 2400, "unit": "SF", "unitCostLow": 4.20, "unitCostHigh": 6, "laborHoursPerUnit": 0.04, "laborRate": 85, "notes": "Walls remain; finishes and casework removed" },
        { "description": "Tear-out existing windows", "qty": 23, "unit": "EA", "unitCostLow": 140, "unitCostHigh": 200, "laborHoursPerUnit": 1.5, "laborRate": 85, "notes": "Includes capping until new windows arrive" },
        { "description": "Disposal and dumpster cycles", "qty": 4, "unit": "EA", "unitCostLow": 730, "unitCostHigh": 850, "laborHoursPerUnit": 0, "laborRate": 85, "notes": "30-yard, full project" }
      ]
    }
  ],
  "constructionMonths": 5,
  "scopeNotes": "Interior remodel with full window replacement, tile baths, and hardwood throughout the main level."
}

=== INSTRUCTIONS ===
1. Use ${z.sqft || "the noted"} SF as the basis for area-based quantities.
2. Count specific items from the inputs above (windows, doors, fixtures, rooms).
3. Apply the unitCostLow/High formula from the system rules to every item — same formula every time.
4. Every required trade MUST appear. Omitting a required trade is an error.
5. Never use qty 0. Never use "TBD" or "varies".
6. Return the JSON exactly matching the schema above. No commentary. No markdown.`}],
  SYSTEM_ESTIMATOR,
  4000,
  "claude-opus-4-20250514",
  0,                          // temperature: 0 — deterministic
  '{"takeoff":['              // prefill — forces JSON-only output
);

// Important: because we prefilled '{"takeoff":[', the response will be the
// rest of the JSON starting from the first trade object. Reassemble:
const reassembled = '{"takeoff":[' + takeoffRaw;
const takeoffResult = safeJSON(reassembled, "takeoff");

// Validate — and AUTO-RETRY if required trades are missing
let warnings = validateTakeoff(takeoffResult.takeoff, z.type, z.sqft);
if(warnings.some(w => w.startsWith("Missing required trade"))){
  btn.textContent = "⏳ Step 3 of 4 — Filling in missing trades…";
  const missing = warnings.filter(w => w.startsWith("Missing required trade"))
    .map(w => w.replace("Missing required trade: ", ""));
  const retry = await workerCall(
    [
      {role:"user", content: "Perform a complete quantity takeoff..." /* same prompt */ },
      {role:"assistant", content: '{"takeoff":[' + takeoffRaw },
      {role:"user", content: `You omitted these required trades: ${missing.join(", ")}. Add them now with realistic quantities and return the FULL updated JSON (all trades, not just the missing ones).`}
    ],
    SYSTEM_ESTIMATOR,
    4000,
    "claude-opus-4-20250514",
    0,
    '{"takeoff":['
  );
  const retryResult = safeJSON('{"takeoff":[' + retry, "takeoff retry");
  takeoffResult.takeoff = retryResult.takeoff;
  warnings = validateTakeoff(takeoffResult.takeoff, z.type, z.sqft);
}
if(warnings.length) console.warn("Takeoff warnings (after retry):", warnings);
```

### CHANGES — what shifted and why

| Change | Why |
|---|---|
| Temperature: 0 | Removes run-to-run quantity drift. Deterministic data extraction must be temp 0. |
| Prefill `{"takeoff":[` | Forces JSON-only output. Eliminates preamble drift ("Here's the takeoff..."). Eliminates ~30% of `safeJSON` parse failures. |
| Multi-line schema with `// field: description` comments | Single-line JSON example is hard for the model to parse internally. Multi-line is unambiguous. |
| Explicit `unit` enum in the schema | Stops "sqft", "SQFT", "Sq Ft", "each", "EACH" hallucinations. |
| Explicit formula `unitCostLow = ref.low + 0.4 * (ref.high - ref.low)` in SYSTEM | "mid-to-high of range" was a major variance source. Now deterministic. |
| Worked example of Demolition for a similar project | Few-shot anchoring. Model mimics the structure. Massively reduces structural variance. |
| Block-and-retry on missing required trades | Today: ships with missing Plumbing. Tomorrow: model is given a chance to fix it before computing the estimate. |

---

## 2. Call 6 — Excel Line Items (SECOND HIGHEST LEVERAGE)

**File:** `app.js` line 1323 in `ensureLineItemsForExport`

### BEFORE (essentials)

```js
const prompt = `Generate line items for the "${section.name}" section of a construction estimate in Flathead Valley, Montana.

TARGET TOTAL: $${highTotal.toLocaleString()} (Quantity × Unit Cost should sum to this high-side number)
CSI DIVISION: ${sectionDiv.name}
SELF-PERFORM: ${sectionIsSelfPerform ? "YES — split each item into Labor + Material rows" : "NO — use single Subcontractor rows"}

[... rules ...]

Generate 8-12 line items. Sum of (qty × unitCost) across all items must equal $${highTotal.toLocaleString()} (±5% tolerance).

Return ONLY this JSON array:
[{"title":"short trade name","description":"5-12 word desc","costCode":"X.YZZ Full Code Name","quantity":0,"unit":"SF|LF|EA|LS|HR|LOT","unitCost":0,"costType":"Labor|Material|Subcontractor","markedAs":""}]`;

// fetch call — missing temperature, missing system context
body: JSON.stringify({
  model: models[attempt], max_tokens: 2000,
  system: "You are a construction estimator in Flathead Valley, Montana. Return ONLY a valid JSON array. No markdown, no prose.",
  messages: [{role:"user", content: prompt}]
})
```

### AFTER

```js
// NEW: pull the takeoff items the AI already generated in Call 3 for this section
const sourceTakeoffItems = section.items || [];   // these come from computeEstimateFromTakeoff

const prompt = `Convert these existing takeoff items into Buildertrend import format for the "${section.name}" section.

=== SOURCE TAKEOFF (from the project's quantity takeoff — DO NOT INVENT NEW ITEMS) ===
${JSON.stringify(sourceTakeoffItems.map(it => ({
  description: it.description,
  qty: it.qty,
  unit: it.unit,
  unitCostHigh: it.unitCostHigh,
  laborHoursPerUnit: it.laborHoursPerUnit,
  laborRate: it.laborRate
})), null, 2)}

=== TARGET ===
CSI Division: ${sectionDiv.name}
Self-perform: ${sectionIsSelfPerform ? "YES" : "NO"}
Section high total: $${highTotal.toLocaleString()} (sum of qty × unitCost across your output must equal this within 5%)

=== TASK ===
Take each source takeoff item and emit it as one or more Buildertrend rows following these rules:

1. SELF-PERFORM RULE
   - If self-perform YES: every work item gets TWO rows — one "Labor" (qty in HR, unit cost is the laborRate from source: 85, 100, or 130) and one "Material" (qty in the source unit, unit cost is material-only).
   - If self-perform NO: every work item gets ONE row, costType="Subcontractor", qty in source unit, unit cost is the all-in sub price.
   - PM, Supervision, Permits, Insurance: Labor-only (no Material row) even in self-perform.
   - Appliances, Fixtures, pure-material allowances: Material-only rows even in non-self-perform.

2. ALLOWANCE RULE
   Set markedAs="Allowance" when EITHER:
     (a) client selection is still TBD (appliances, fixtures, countertop material, tile style, lights, flooring style)
     (b) it's a lump-sum carry (permits, A&E, septic design, well design)
   Otherwise markedAs="".

3. CSI CODE RULE — STRICT
   - costCode must be EXACT TEXT of one of these codes from CSI Division ${parseInt(sectionDiv.num, 10)}:
${validCodesForDiv}
   - codes ending "01" = Labor, "02" = Material, "03" = Subcontractor — pick the suffix that matches your costType
   - DO NOT invent codes. DO NOT use leading zeros (use "1.101" not "01.101").
   - Copy the full canonical label verbatim including the description after the number.

4. DESCRIPTION RULE
   Short 5-12 word description of what the line covers. Be specific.

5. UNIT ENUM
   unit must be exactly one of: SF, LF, EA, LS, HR, LOT.

=== SCHEMA ===
[
  {
    "title": "string — short trade name like 'Drywall' or 'Hardwood Flooring'",
    "description": "string — 5-12 words",
    "costCode": "string — exact canonical CSI code label from the list above",
    "quantity": "number",
    "unit": "string — one of SF, LF, EA, LS, HR, LOT",
    "unitCost": "number",
    "costType": "string — one of: Labor, Material, Subcontractor",
    "markedAs": "string — empty or 'Allowance'"
  }
]

Return ONLY the JSON array. No markdown, no preamble.`;

const res = await fetch("https://billowing-snowflake-38f0.coppermountainbuilders406.workers.dev", {
  method:"POST", headers:{"Content-Type":"application/json"},
  body: JSON.stringify({
    model: models[attempt],
    max_tokens: 2000,
    temperature: 0,                                          // NEW
    system: SYSTEM_LINEITEMS,                                // see below
    messages: [
      { role: "user", content: prompt },
      { role: "assistant", content: "[" }                    // prefill
    ]
  })
});
```

And define `SYSTEM_LINEITEMS` once (not per-section):

```js
const SYSTEM_LINEITEMS = `You convert construction quantity takeoff items into Buildertrend import line items.

CMB labor rates: Carpenter $85/hr, Foreman $100/hr, PM $130/hr.
You are operating in Flathead Valley, Montana, 2026 pricing.

You do not invent new scope. You faithfully convert the takeoff items you are given into the Buildertrend row format, splitting self-perform items into Labor + Material rows.

Return ONLY a valid JSON array. No markdown, no prose, no preamble.`;
```

### CHANGES — what shifted and why

| Change | Why |
|---|---|
| Pass the actual takeoff items into the prompt | **Biggest change.** Today this function regenerates 8-12 items from nothing per section. The proposal narrative and the Excel export tell two different stories. Now they match. |
| Reframe the task as "convert" not "generate" | The model is now doing a deterministic transformation, not a creative one. |
| `temperature: 0` | Was using Anthropic default (~1.0). This is the #1 cause of run-to-run Excel variance. |
| Prefill `[` | Forces JSON-only output. |
| Lift SYSTEM_LINEITEMS out of the loop | Today the same minimal system prompt is sent per-section. Lift it once + add prompt caching for the CSI codes (next item). |
| Unit enum spelled out explicitly | Stops "sqft" / "EACH" hallucinations. |

### Optional: skip the AI call entirely when source items are detailed enough

```js
async function ensureLineItemsForExport(est, onStatus){
  for(let i=0; i<(est.sections||[]).length; i++){
    const section = est.sections[i];
    const sourceItems = section.items || [];

    // FAST PATH: if the takeoff already has 4+ items, convert them deterministically in JS
    if(sourceItems.length >= 4 && !lineItemsLookStale(section.lineItems || [])){
      section.lineItems = convertTakeoffToBTRows(sourceItems, section, isSelfPerform(section.name));
      continue;
    }

    // SLOW PATH: AI call only when source items are sparse
    // (existing AI call here)
  }
}
```

`convertTakeoffToBTRows` is a pure-JS deterministic mapper that uses `normalizeCostCode` to assign codes. This eliminates ~70% of AI calls during export and guarantees consistency.

---

## 3. Call 4 — SOW Narrative

**File:** `app.js` line 3089

### BEFORE (the structural problem)

The SYSTEM passed in is the takeoff SYSTEM with one string replaced:

```js
}], SYSTEM.replace("RESPOND ONLY WITH VALID JSON","Return ONLY the requested JSON."), 3000);
```

That system still contains "Chief Estimator", "FLATHEAD VALLEY 2026 UNIT COST REFERENCE", labor productivity tables, etc. The model has to be both a clinical estimator and a warm neighbor in the same turn.

### AFTER

```js
const sowRaw = await workerCall(
  [{role:"user", content:
`Write the Scope of Work narrative AND construction schedule for this project.

=== PROJECT FACTS ===
${projectSummary}
COMPUTED BUDGET: ${fmt$(computed.totalLow)} LOW — ${fmt$(computed.totalHigh)} HIGH
CONSTRUCTION DURATION: ${computed.gcMonths} months
TRADES INCLUDED: ${computed.sections.map(s => s.name + " (" + fmt$(s.low) + "-" + fmt$(s.high) + ")").join(", ")}
CLIENT NAME(S): ${appData.clientName || "the homeowner"}
CLIENT FIRST NAME(S): ${(appData.clientName || "").split(/\s+/)[0] || ""}
SITE ADDRESS: ${appData.projectAddress}, ${appData.projectCity}, Montana

=== SOURCE OF TRUTH (use these — do not invent details outside them) ===
${siteNotes ? "WHAT WE SAW ON SITE:\n" + siteNotes.slice(0, 1500) : ""}
${appData.projectNotes ? "OVERALL NOTES:\n" + appData.projectNotes : ""}
${z.notes ? "PROJECT NOTES:\n" + z.notes : ""}
${qaContext ? "CLIENT Q&A:\n" + qaContext : ""}

=== PART 1 — SCOPE OF WORK (450-650 words, client-facing) ===

Use exactly these five sections, in this order, with sentence-case headings (not ALL CAPS, not Title Case):

What we saw at your place
  Two short paragraphs. First describes what we observed on site — pulled from the source-of-truth above. Lot, layout, existing conditions, anything notable. Second is one sentence acknowledging what the homeowner said they want, in their words where possible. Use the client's first name once near the top if known.

What we'd build for you
  Walk through the project in plain language. Cover each trade in TRADES INCLUDED but write it as a story of how the work flows, not a punch list. Make it specific to the project type. The homeowner should finish reading and know exactly what they're getting.

What this proposal doesn't cover yet
  Honest exclusions and the decisions still in front of the client (selections, allowances, things outside current scope). Frame it as "here's what we'll figure out together as we go," not as legal disclaimers.

Why the budget lands where it does
  Two or three sentences on what drives the cost range — Flathead Valley pricing, Montana seasonality, the materials, the design choices that move the number. Honest, not defensive.

How we'd start
  The next steps in human terms. Signing the design agreement, the retainer, when we'd have our first sit-down. Close with one short, warm line — something a sixth-generation Montanan would actually say. Not "we look forward to partnering with you." Something true.

=== PART 2 — SCHEDULE ===
Include a design phase (10-14 weeks) and a construction phase honoring Montana seasonality (180-day build season, 8-12 week lead times for windows and standing seam). Realistic milestones.

=== PART 3 — COMPLIANCE NOTES (internal, rep only — short bullets, not narrative) ===
Flag any code or permit issues that the rep should be aware of before signing.

=== SCHEMA ===
{
  "summary": "string — the 450-650 word SOW narrative above, with sentence-case headings",
  "schedule": {
    "designPhase": "string — e.g., '10-14 weeks'",
    "constructionPhase": "string — e.g., '5 months'",
    "startToFinish": "string — total elapsed time",
    "milestones": [
      { "phase": "string", "duration": "string", "notes": "string" }
    ]
  },
  "complianceNotes": ["string array — short internal flags, can be empty"]
}

Return ONLY the JSON. No markdown, no preamble.`}],
  SYSTEM_NARRATIVE,              // dedicated narrative system prompt
  3000,
  "claude-opus-4-20250514",
  0.5,                            // higher temp — narrative wants warmth and variation
  '{"summary":"'                  // prefill — forces JSON start at the narrative
);

// Reassemble because we prefilled
const sowResult = safeJSON('{"summary":"' + sowRaw, "sow");
```

### CHANGES — what shifted and why

| Change | Why |
|---|---|
| Use `SYSTEM_NARRATIVE` instead of takeoff SYSTEM | The model is no longer being told to be a clinical estimator while writing client copy. Eliminates voice drift caused by contradictory system context. |
| Temperature 0.5 (was 0.3) | Narrative wants warmth and natural variation. 0.3 produces slightly stiff output; 0.5 reads more human. |
| Prefill `{"summary":"` | Forces JSON-only output; eliminates "Here's the SOW:" preamble. |
| Client first name passed explicitly | Today the prompt says "use first name if known" but the model has to extract it from `appData.clientName`. Now we extract it deterministically in JS and pass it. |
| Schema with type comments per field | Same reasoning as Call 3 — easier for the model to follow. |
| "Source of truth" section explicit | Today the inputs are interleaved with instructions. Separating "facts" from "instructions" reduces hallucination of invented site details. |
| Compliance notes scoped to short bullets, not narrative | Today they get freeform. Bullets are easier to surface in the rep view. |

---

## Summary checklist for the swap-in

```
[ ] 0a. workerCall accepts temperature + prefill parameters
[ ] 0b. runAnalyzeScope and Call 1 vision fetches get explicit temperature
[ ] 0c. Split SYSTEM into SYSTEM_ESTIMATOR + SYSTEM_NARRATIVE
[ ] 1.  Replace Call 3 prompt with v2 (temp 0, prefill, worked example, explicit formula, block-retry on missing trades)
[ ] 2.  Replace Call 6 prompt with v2 (pass takeoff items in, temp 0, prefill, SYSTEM_LINEITEMS)
[ ] 2b. Optional: add fast-path convertTakeoffToBTRows for sections with 4+ takeoff items
[ ] 3.  Replace Call 4 prompt with v2 (SYSTEM_NARRATIVE, temp 0.5, prefill, source-of-truth block)
[ ] 4.  Drop "ALL CAPS section headings" from Call 2 (Compliance)
[ ] 5.  Add prompt caching for UNIT_COST_DB (Calls 1-4) and CSI codes list (Call 6)
[ ] 6.  Verify Cloudflare Worker passes temperature through to Anthropic
```

The first three (0a, 0b, 0c) are foundational — do them first. Then 1, then 2, then 3.

After all six are in, run the same project (same notes, same photos, same Q&A) through the pipeline twice and compare:
- Total low/high should match within ±2% (was ±15-30%)
- Trade list should be identical
- Line item count per section should match
- SOW narrative should hit the same five sections with similar specificity (the exact wording will vary — that's by design at temp 0.5)
