# Kennith — Hwy 35 Estimate Audit (2026-06-11)

## Project summary
102 line items across 11 CSI divisions. Total client price: **$183,865**. Mix of trades suggests a major remodel (interior demo + framing + new kitchen + new baths + new windows/doors + finishes) on what appears to be an existing home.

## The bottom line
**This estimate is roughly 50% of what the project actually costs.** A realistic builder-cost figure for the described scope is **$300,000–$500,000**, not $153,221. The total markup at 20% then nets only ~4.7% profit, and the underlying numbers are themselves wrong.

There are two layers of error here:
1. **Markup is too low** — fixed: bumped 20 → 28
2. **Most line item unit costs are wildly under realistic values** — root cause, not yet fixed in this commit

## Severity-ranked bugs

### CRITICAL — Unit costs systematically 5-100x below realistic

The AI takeoff is generating unit costs without honoring the `UNIT_COST_DB` reference table. Despite the DB containing correct values (e.g., "Drywall hang/tape/texture: SF $2.80-3.60"), the AI returns drywall at $0.23/SF.

| Line item | AI returned | Realistic | Multiplier off |
|---|---|---|---|
| Wall Insulation | $0.03/SF | $1.50-2.50/SF | 50-80× low |
| Ceiling Insulation | $0.02/SF | $1.50-3.00/SF | 75-150× low |
| Rim Joist Insulation | $0.07/SF | $3.00-4.00/SF | 40-60× low |
| Drywall Installation | $0.23/SF | $2.80-3.60/SF | 12-15× low |
| Drywall Ceiling | $0.27/SF | $2.80-3.60/SF | 10-13× low |
| Texture Application | $0.06/SF | $0.80-1.20/SF | 13-20× low |
| Interior Wall Paint | $0.41/SF | $2.50-4.00/SF | 6-10× low |
| Ceiling Paint | $0.35/SF | $2.50-4.00/SF | 7-11× low |
| Trim Paint | $0.54/LF | $2.00-3.50/LF | 4-6× low |
| Wall Framing Material | $0.45/LF | $4-7/LF | 9-15× low |
| Floor Joist Material | $0.85/LF | $4-7/LF | 5-8× low |
| OSB Sheathing | $3.25/EA | $20-40/EA | 6-12× low |
| Electrical Rough Wiring | $0.81/SF | $4-7/SF | 5-9× low |
| Electrical Service Panel | $552/EA | $3500-6000/EA | 6-10× low |
| Interior Light Fixtures | $422/LS | $2000-5000/LS | 5-12× low |
| Window Material | $125/EA | $900-2200/EA | 7-18× low |
| Interior Door Material | $95/EA | $400-800/EA | 4-8× low |
| Entry Door Material | $450/EA | $1500-3500/EA | 3-7× low |

This is a **systemic AI behavior**, not a one-off. The AI is treating the UNIT_COST_DB reference as suggestion, not constraint.

### HIGH — Double-counted Structural Engineering
- Cat 00 Procurement: Structural Engineering, 1 LS @ $2800 = $2,800
- Cat 01 General Requirements: Structural engineering, 1 LS @ $8000 = $8,000

Total $10,800 for one engineering scope. The Cat 01 line comes from `computeGC()`'s template, the Cat 00 line came from the AI takeoff. Need de-duplication.

### HIGH — Wrong scope items included for a remodel
- Cat 00 includes Septic Design ($1,200) and Well Design ($800).
- This appears to be a kitchen+bath remodel of an existing home — wouldn't need new septic or well design.
- The AI is including new-construction-only scope items.

### HIGH — All appliances should be flagged "Allowance" but aren't
- Cat 11 Equipment: Range, Refrigerator, DW, Microwave, Disposal, Washer, Dryer, Water Heater, Range Hood, Ice Maker — none marked "Allowance"
- Per CMB convention, all appliance lines should be Allowance because the client hasn't picked specific models

### HIGH — Missing scope items for a project of this size
- **No tile work** (Cat 09 Finishes) — but the proposal clearly involves bathrooms with showers/floors that almost always have tile
- **No floor coverings beyond paint** — no LVP, hardwood, or carpet line items at all
- **No HVAC** (Cat 23) — would expect at minimum ductwork modifications or new returns
- **No countertop backsplash** — Cat 12 has countertops but not backsplash material
- **No exterior repairs** — windows replaced typically means siding patching

### MEDIUM — General Conditions partially template-driven, partially AI
- Cat 01 items are all from `computeGC()` template — correct
- But the AI ALSO added items in Cat 00 (Structural Eng, Septic Design, Well Design) that duplicate or overlap

### MEDIUM — Contingency too low for Class 5
- Currently 5% (per `computeGC` template)
- Per research/estimating_for_profit.md and AACE 56R-08, Class 5 conceptual estimates should carry 10-15% contingency

### LOW — Cost codes use dotted format (1.101) — confirmed BT-compatible per audit but worth re-verification

## Patterns

### The big one: AI ignores UNIT_COST_DB
The takeoff prompt shows the AI the unit cost reference table but doesn't FORCE it to look up specific items by name. The AI fills in plausible-looking numbers from its training without anchoring to the DB. Result: unit costs hallucinated low.

**Root cause:** the prompt says "use the unit cost reference above" but doesn't say "you MUST find your description in the table and use its low/high values."

### Section totals scale to wrong target
`ensureLineItemsForExport` scales sum(qty × unitCost) to section.high. But section.high itself is wrong because the takeoff produced underweight numbers. Scaling can't fix bad input.

### No per-trade benchmark check exists
`sanityCheckPerSF` only checks the TOTAL $/SF. It doesn't check individual trades like "Drywall on a 2000 SF home should land at $5,600-7,200; this section says $400 — that's wrong."

## Recommended fixes

### Fix 1: Aggressive unit-cost clamping (highest impact)
Add a function `clampToUnitCostDB(items)` that runs AFTER the AI takeoff. For each line item, fuzzy-match the description to UNIT_COST_DB entries. If matched, force the unit cost into the DB low-high range. This is deterministic — the AI can't sabotage it.

### Fix 2: Per-trade minimum-cost benchmarks
Build `TRADE_MINIMUM_PER_SF` table:
```
Drywall: $2.50/SF minimum
Paint: $2.00/SF minimum
Insulation: $1.20/SF minimum
Flooring (any): $5.00/SF minimum
Tile: $10.00/SF minimum
Electrical (rough+finish): $8.00/SF minimum on residential
Plumbing per bath: $4500 minimum
Cabinetry per kitchen: $20,000 minimum on remodel
HVAC system: $11,000 minimum for forced air
Roofing: $6.00/SF minimum
```
After takeoff, if any trade's section.high / sqft is below the minimum, scale the entire section up to meet the minimum.

### Fix 3: Tighten takeoff prompt
Replace the "use the unit cost reference above" rule with:
- "For EVERY line item, the unit cost MUST be within the range of the closest match in the UNIT_COST_DB. If your item doesn't match any DB entry, set unit cost no lower than 75% of the closest related DB item."
- "If you can't find a match in the DB, flag that item with `'unmatched': true` so the app can review."

### Fix 4: De-duplicate Structural Engineering
Add logic that suppresses AI-generated GC items that overlap with the `computeGC` template (Structural Engineering, Building Permit, Final Clean, Dumpster, Insurance, Superintendent, Temporary Facilities, Contingency).

### Fix 5: Project-type-aware scope filtering
For remodels (Residential Remodel, Kitchen Remodel, Bath Remodel, Addition where utility exists), filter out new-construction-only scope (Septic Design, Well Design, Excavation foundations, Site Clearing for an existing home, etc.).

### Fix 6: Auto-flag appliances/fixtures as allowances
Anything in Cat 11 (Equipment) for residential = Allowance. Anything labeled "fixture" in Plumbing or Electrical = Allowance.

### Fix 7: Required-scope checklist by project type
If "Kitchen Remodel" is in scope, REQUIRE: tile backsplash or wall finish, flooring, cabinets, countertops, appliances (allowance), electrical (rough + finish), plumbing (rough + finish), drywall patching, paint. Throw an error if missing.

### Fix 8: Bump default contingency 5% → 10%
Class 5 conceptual estimates should carry more contingency.

## Overall verdict

**Would CMB ship this to a client as-is? No.** The total is roughly half of realistic project cost. Even with markup at 28% (now fixed), the client would see $235k for what should be a $400-600k project. That's a quote that wins the bid then loses the company money.

The estimate works structurally — the math, the format, the line item shape, the BT import compatibility — but the **dollar values are systematically too low** because the AI is hallucinating cheap unit costs and the validation layer doesn't catch it.

**Priority order:**
1. ✅ Markup 20→28 (done)
2. ⚠ Aggressive unit-cost clamping against UNIT_COST_DB (Fix 1)
3. ⚠ Per-trade minimum-per-SF benchmarks (Fix 2)
4. ⚠ Tightened takeoff prompt forcing DB lookup (Fix 3)
5. ⚠ De-duplicate Structural Eng + GC template overlap (Fix 4)
6. ⚠ Auto-flag allowances (Fix 6)
7. ⚠ Project-type scope filter (Fix 5)
8. ⚠ Required scope checklist (Fix 7)
9. ⚠ Contingency 5→10% (Fix 8)

Items 2-9 are the next coding session. The current commit will address 1 (done), 6 (allowance flag), and 8 (contingency) as quick wins, plus an initial version of Fix 2 (per-trade minimums). The bigger AI prompt restructure (Fixes 3-7) is a separate session because it changes the takeoff architecture.
