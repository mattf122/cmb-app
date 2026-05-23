# Flathead Valley Construction Market — Synthesis (Pattern-Based)

> **LIMITS OF THIS ANALYSIS:** No web access during this research pass. Pattern-based synthesis from general industry knowledge with a January 2026 training cutoff. Treat as a framework for "what to look for," not as researched current values.

## 1. Likely-stale signal areas in current UNIT_COST_DB

| Category | Likely direction | Magnitude | Rationale |
|---|---|---|---|
| Lumber/framing packages | FLAT to DOWN small | -5 to -10% | Possibly set near a softwood peak; volatile, check monthly |
| Steel/rebar/structural steel | UP | +5-15% | Tariff impacts in 2025-26 |
| Concrete (ready-mix) | UP small | +3-8% | Cement sticky; limited Flathead batch plants (Knife River, LHV) |
| Electrical (copper, panels, transformers) | UP material | +10-20% | Panel/switchgear supply chronically tight; lead times matter more than unit cost |
| HVAC equipment | UP material | +10-20% | A2L refrigerant transition (R-454B/R-32) on residential split systems |
| Windows/doors | FLAT to UP small | — | Lead times on Sierra Pacific, Marvin, Pella matter more than unit cost |
| Drywall/insulation | FLAT | — | Stable |
| Labor (subs) | UP material | — | Sub capacity is the binding constraint; plumbing/electrical sub rates have outpaced inflation since 2021 |
| Roofing (asphalt) | UP small | — | Mild input cost rises |
| Metal roofing | UP material | — | Tracks steel |
| Cabinetry (semi-custom) | UP small | — | Stable |
| Cabinetry (custom local) | FLAT | — | But backlog-constrained |

## 2. Davis-Bacon / Flathead County prevailing wage framework

Wage determinations are published as **base rate + fringe** (health/pension/training). Total package is what matters for bidding.

**Typical Building construction totals (rough, verify per project):**
- Carpenter: $40-50/hr total
- Electrician (IBEW): $55-70/hr total
- Plumber/Pipefitter: $55-70/hr total
- Laborer (Group 1): $25-35/hr total
- Operator (backhoe/loader): $45-60/hr total

**vs CMB's $85/$100/$130 standard rates:**
CMB's rates are *billing rates* (include burden, overhead, profit). DB is the raw wage floor. The right comparison: `DB total package × burden multiplier (1.6-1.8) = loaded billing rate`. For Carpenter that lands ~$70-90/hr loaded — close to CMB standard.

**The DB hit typically lands on trades where DB wage > CMB's typical sub quote** (often electrical/plumbing on small jobs).

**Highway/Heavy WDs are higher than Building WDs** — wrong selection is a common bid error.

**Add 3-8% admin cost line for certified payroll burden.**

## 3. Seasonal & Montana-specific factors

### Winter concrete (Nov–Mar)
Add hot-water mix, blankets, accelerator (calcium chloride or non-chloride for rebar), heated enclosures.
- **Cost adder: +15-30%** on concrete line items
- Schedule risk is bigger than cost
- Below ~20°F sustained, most local batch plants won't deliver flatwork

### Snow load (ground PSF by zone)
- **Kalispell / valley floor:** 40-60 PSF
- **Whitefish, Big Mountain, Columbia Falls foothills:** 60-90+ PSF
- **Lakeside/Bigfork:** varies
- **High elevation (Blacktail, Whitefish Mtn lots):** 100+ PSF

Drives: engineered trusses (+10-25% vs stock), thicker sheathing, more LVL headers, heavier connectors. Roof pitch + snow-shedding zones around entries/decks are code-driven.

### WUI/wildfire defensible space (post-2018)
- Class A roofing
- Ignition-resistant siding (fiber cement, metal, stucco — NO vinyl in WUI)
- 1/8" mesh on vents
- 5-foot non-combustible zone around foundation
- Ember-resistant soffits
- **Cost adder: +3-8% on exterior envelope**
- **Insurance availability** is now the real driver — some carriers won't write without WUI compliance regardless of code

### Permit timelines (typical, verify per project)
- **Kalispell city:** 2-4 wk residential, 4-8 wk commercial
- **Whitefish city:** 4-8 wk; design review board adds 4-6 wk for visible/downtown projects
- **Flathead County:** 3-6 wk; septic permit via County Environmental Health can be the long pole
- **Lakeshore Protection** (Whitefish Lake, Flathead Lake, Echo, etc.): add 60-120 days for lakeshore permit; DNRC if within ordinary high water

### Energy code
Montana adopted **2021 IECC** for residential (effective ~2023). Drives:
- R-49 ceiling, R-21 walls (or R-13+5 continuous)
- U-0.30 windows
- Blower door ≤4 ACH50
- Mechanical ventilation required (ERV/HRV typical)
- **Cost adder vs 2012/2015 IECC builds: +$3-8/sf on envelope**

### Septic seasonal
- Perc tests need unfrozen ground — practically March–November
- Drainfield install ideally June–October
- Designs by licensed installer; County review 2-6 weeks
- Frozen ground Dec-Mar can stall otherwise-ready projects

## 4. Three actionable engine changes (logic only, no live data needed)

### A. Winter concrete surcharge
If project schedule (estimated start date + duration) overlaps Nov 1 - Mar 31 **and** foundation/flatwork is in scope:
- Apply +20% to concrete line items
- Append SOW note: *"Winter pour conditions assumed — includes blankets, hot-water mix, and accelerator. Pours may be deferred if sustained temps drop below 20°F."*
- Flag schedule risk in the executive summary

### B. Snow load uplift by address zone
Maintain a lookup table of `{ city/zone → ground snow load PSF }`:
```
Kalispell: 50
Whitefish: 70
Columbia Falls: 60
Bigfork: 50
Lakeside: 50
Big Mountain: 90
Blacktail: 100
```
When project address parses to a 60+ PSF zone:
- Add +12% to framing/trusses/roof sheathing
- Emit SOW note: *"Engineered trusses sized for [X] PSF ground snow load per Flathead County / [City] adoption."*
- If 90+ PSF: also flag *"Structural engineer stamp recommended"*

### C. WUI exterior compliance check
Add a boolean `wuiZone` (default true for County addresses outside city limits, true for Whitefish/Columbia Falls foothills). When true:
- Force siding selection to ignition-resistant options in the allowance
- Add Class A roofing line
- Add ember-resistant vent allowance ($400-800)
- Add defensible-space site work line
- Surface "may affect insurance quote" callout in proposal

### Bonus: Davis-Bacon loaded-rate calculator
When `davisBacon = true`:
- Replace sub line items with `DB_total_package × burden_multiplier (1.7)` instead of CMB standard sub rates
- Add a 5% certified-payroll-admin line at the GC level

---

*Source: synthesis from market-researcher agent (2026-05-01). To validate with current data, re-run in a session with WebSearch/WebFetch enabled and hit BLS PPI series WPU081 (softwood lumber), DOL SAM.gov MT WD-2026-001 (Flathead County prevailing wage), NAHB material price index, Random Lengths weekly.*
