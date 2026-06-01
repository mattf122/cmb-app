# Construction Estimating Best Practices — Research Findings

> Research conducted 2026-05-01. Sources cited inline. For Copper Mountain Builders' Site Visit App + back-office estimating workflow.

---

## TL;DR — top 10 takeaways

1. **A site-visit estimate is AACE Class 5 ("ROM" / order-of-magnitude). Real accuracy range is −50% to +100%.** Promising 15-20% accuracy at a sales conversation is professionally indefensible — you don't have the design done yet.

2. **The estimate gets better as the design progresses.** Class 5 → Class 4 → Class 3 → Class 2 → Class 1. Tell clients exactly where they are.

3. **AI-augmented estimating works only when the AI does scope and a deterministic engine does math.** The CMB app architecture is correct on this. Don't backslide into "let the AI calculate the price."

4. **Per-square-foot benchmarks are useful for sniff-tests, not for final numbers.** Real variance within a single PSF benchmark is ±60% based on finish level, complexity, lot conditions.

5. **The single biggest source of estimating error is missing scope, not wrong unit costs.** Comprehensive trade checklists (REQUIRED_TRADES_BY_TYPE) prevent more failure than tighter unit prices ever will.

6. **Always apply a 0.85 productivity factor to labor.** Theoretical productivity assumes nothing goes wrong. Reality says 15% of labor time is non-productive (travel, setup, weather, coordination).

7. **Contingency belongs as a separate visible line, not buried.** Industry practice: 5-15% based on scope clarity. Tell the client.

8. **Calibrate against your own actuals, not RSMeans national factors.** Local pricing, local labor, local soil, local snow load — generic data is a starting point, your own history is the truth.

9. **Unit-cost databases must be refreshed quarterly on volatile categories** (lumber, copper, drywall, oil-derived materials).

10. **Three-point estimating (low / most likely / high) for high-uncertainty items beats single-point estimates.** Better PERT distribution: `(low + 4×most_likely + high) / 6`.

---

## AACE estimate classification — what level fits "field-visit conceptual"

Per [AACE Recommended Practice 56R-08](https://web.aacei.org/docs/default-source/toc/toc_56r-08.pdf) for buildings and general construction:

| Class | Project definition | Typical accuracy band | When used |
|---|---|---|---|
| **5 (ROM / Conceptual)** | 0–2% | **−50% / +100%** | First conversation, sales discovery, feasibility |
| 4 (Schematic) | 1–15% | −30% / +50% | Schematic design phase, owner feasibility decision |
| 3 (Design Development) | 10–40% | −20% / +30% | Design development checkpoint |
| 2 (Bid / Sub Pricing) | 30–75% | −15% / +20% | Final design, subcontractor bidding |
| 1 (Definitive) | 65–100% | −10% / +15% | Construction-ready, bought-out |

**Accuracy is reported at 80% confidence** ([AACE](https://web.aacei.org/docs/default-source/toc/toc_119r-21.pdf)) — meaning 1 in 5 projects can fall outside the stated range.

**CMB site visits produce Class 5 estimates.** The Concept-image step gets toward Class 4. The Estimate page is still Class 5. The signed Design-Build Agreement triggers the path through Classes 4 → 3 → 2 over the course of Steps 1-4 of CMB's program.

### Apply to CMB Site Visit App

- **Add an "Estimate Class" indicator** to the Sign-page budget summary: "This is a Class 5 conceptual estimate per AACE International 56R-08. Accuracy range: −25% / +50%. Final price set after design development (Step 3) and bidding (Step 4)."
- **Update CLAUDE.md** accuracy target from "15-20%" to "Class 5 at site visit; converges to Class 2 (±15%) at end of Step 4."
- **Don't apologize for the range.** Wide ranges at this stage are correct. Narrowing them prematurely is the dishonest move.

---

## Estimating methodologies

### When to use which (per AACE)

| Method | Description | Best for |
|---|---|---|
| **Parametric** | Cost = function of size/capacity (e.g., $/SF) | Class 5 / 4 — early conceptual |
| **Unit cost** | Build up from quantities × unit prices | Class 4 / 3 — schematic & DD |
| **Assembly-based** | Pre-built assemblies (e.g., "10×10 bath = $X") | Class 4 — schematic |
| **Detailed takeoff** | Full quantity takeoff from construction docs | Class 3 / 2 / 1 — DD through bid |
| **Three-point (PERT)** | Low + Most likely + High → weighted average | High-uncertainty items at any class |
| **Cost-loaded schedule** | Cost per activity, integrated with timeline | Class 2 / 1 — construction-ready |

### CMB site-visit methodology

The app uses a **hybrid parametric + unit-cost approach** that's appropriate for Class 5:
- AI parses scope from photos, notes, PDFs (parametric reasoning + scope identification)
- Each trade section gets a high-low range
- App scales to section.high using line items with embedded unit costs

This is the right approach for a Class 5 conceptual estimate. **Do not increase precision artificially** — that's where false-precision failures happen.

---

## The 5 enemies of estimate accuracy

1. **Missing scope** — the #1 cause of cost overruns. Solution: comprehensive trade checklists keyed by project type. REQUIRED_TRADES_BY_TYPE in the app addresses this.

2. **Wrong assumptions about existing conditions** — "we'll just demo the wall" turns into "the wall is load-bearing and runs concrete-to-roof." Solution: site photos with the AI specifically prompted to flag uncertainties; clarifying-question loop before estimating.

3. **Productivity overestimation** — every estimator assumes the crew will work like they did on the best job they remember. Reality is 85% of theoretical productivity. Solution: apply a 0.85 multiplier on labor lines.

4. **Sub price decay** — sub quotes age. By the time the contract is signed, prices have moved. Solution: lock sub quotes at contract signing; pad allowance lines for selections still pending.

5. **Optimism bias** — humans default to best-case thinking. Solution: three-point estimating on high-uncertainty items.

---

## Per-square-foot benchmarks — useful, but mind the variance

PSF numbers are the most-requested and most-abused estimating shortcut. They work as a sniff test, not as a final number.

### Typical residential ranges (Flathead Valley, 2026 estimate — verify locally)

| Project type | Realistic PSF range |
|---|---|
| Production builder spec home | $180–$240 |
| Mid-range custom home | $240–$320 |
| High-end custom home | $320–$500+ |
| Major remodel / addition | $250–$450 |
| Kitchen remodel | $400–$800 (per SF of kitchen only) |
| Bathroom remodel | $500–$1,200 (per SF of bath only) |

Within a single benchmark, **±60% variance is normal** based on:
- Finish level (cabinet grade, countertop material, fixture brand)
- Lot conditions (slope, rock, access, utility connections)
- Snow load zone (Whitefish 70 PSF needs heavier framing than Kalispell 50 PSF)
- Architectural complexity (rooflines, ceiling heights, window count)

**Use PSF for:** sanity check, "are we in the ballpark," initial scoping calls.
**Don't use PSF for:** final estimate, contract budget, client commitment.

---

## Quantity takeoff best practices

Industry consensus from [Markup and Profit](https://www.markupandprofit.com/), [Smartsheet](https://www.smartsheet.com/content/construction-change-order-form-101), and field practice:

### Process
1. **One trade at a time, fully.** Don't pinball between trades — you'll miss scope.
2. **Walk the plan twice** — once for "what's drawn," once for "what's required but not drawn."
3. **Trade checklist per project type** — prevents the "I forgot to include drywall" failure.
4. **Document assumptions in writing** — every estimate has implicit assumptions; make them explicit.
5. **Recurring scope omissions:** waste removal, permits, engineering, temp facilities, jobsite protection, final clean, punch list, warranty work, owner-selected finishes not yet specified.

### Common errors
- Double-counting (item appears in two trade sections)
- Wrong units (LF vs SF, EA vs LS)
- Wrong assemblies (slab cost without prep, framing without sheathing)
- Forgotten trim/transitions
- Missing the second of a paired item (entry door without trim, window without sill)

### Tools (for the back-office workflow, not the site-visit app)
- **Bluebeam Revu** — industry standard for PDF takeoff
- **PlanSwift** — automated takeoff with assembly libraries
- **STACK** — cloud-based, integrates with Buildertrend
- **On-Screen Takeoff (Trimble)** — enterprise-grade
- **PDF text extraction** — what the CMB app does for the field is the right call for Class 5 conceptual

---

## Cost data sources

### National references (starting points, not final numbers)
- **RSMeans** — the construction-cost reference; apply local CCI factor for Kalispell/Missoula (~0.95–1.05)
- **NAHB Cost of Constructing a Home** — survey data on cost shares by trade
- **BLS Producer Price Indexes** — track material price movement
- **Random Lengths** — weekly lumber market data
- **ENR Construction Cost Index** — composite labor + material trend
- **Turner Building Cost Index** — quarterly composite

### Local sources (the real answer)
- **Your own historical job costs** — this is the gold standard. Build the database.
- **Sub quotes for recent comparable projects** — 6 months max shelf life
- **Material supplier price sheets** — refresh quarterly
- **Davis-Bacon wage determinations** for Flathead County — available at [sam.gov](https://sam.gov/) for federal/Davis-Bacon work

### Apply to CMB
- **Build a "post-job actuals" feedback loop.** Even a manual entry of final-vs-estimated would let CMB calibrate the UNIT_COST_DB against reality.
- **Refresh UNIT_COST_DB quarterly** on lumber, OSB, copper, drywall, oil-derived materials. Other categories yearly is fine.

---

## Contingency

### Industry practice
- **Class 5/4 estimates:** 10-15% contingency
- **Class 3:** 8-12%
- **Class 2:** 5-8%
- **Class 1:** 3-5%

### Best practice
- **Contingency is a separate visible line, not buried in unit costs.** Honesty builds trust.
- **Contingency is for SCOPE risk, not for estimator error.** Don't pad to hide bad estimating.
- **State the contingency policy in the contract:** unused contingency reverts to the client at project close (or to CMB, or 50/50 — the policy doesn't matter as much as it being clear).

### CMB current state
The app's `computeGC` function includes "Contingency (5%)" as a line in General Conditions. **5% is light for a Class 5 conceptual estimate.** Recommended: bump to 10% for Class 5, with policy disclosed in the SOW.

---

## Three-point estimating for high-uncertainty items

For items where the cost could swing significantly (site work on a difficult lot, foundation in unknown soil, mechanical for a complex floor plan), single-point estimates lie.

**PERT formula:** `Expected = (Low + 4 × MostLikely + High) / 6`

This produces a beta-distribution mean that's more honest than a midpoint average.

**Example:** excavation on a sloped lot
- Low (best case, soft soil, no rock): $8,000
- Most likely: $14,000
- High (rock, difficult access, dewatering): $25,000
- PERT expected: `(8 + 56 + 25) / 6 = $14,833`
- PERT std dev: `(25 − 8) / 6 = $2,833`

**Use PERT for:** excavation, foundation in unknown soil, mechanical for complex layouts, site utility extensions, anything where the "could be" range is >2x.

**Don't use PERT for:** straightforward unit-cost items (drywall, paint, standard cabinetry).

---

## Modern estimating software comparison

For CMB back-office, not for the site-visit app itself:

| Software | Strengths | Weaknesses | Pricing |
|---|---|---|---|
| **Buildertrend** | Integrated project management, accounting, client portal; what CMB already uses | Estimating module is mid-tier | $499+/mo |
| **ProEst (Trimble)** | Strong takeoff + cost database | Enterprise pricing | $5,000+/yr |
| **Sage Estimating** | Industry standard for commercial | Steep learning curve | Custom |
| **STACK** | Cloud takeoff, good Buildertrend integration | Limited assembly library | $1,800+/yr |
| **PlanSwift (Trimble)** | Robust assemblies, mature | Desktop-only | $1,600+/yr |

**Best-in-class workflow:**
1. **Concept (site visit)** — what CMB's app does
2. **Schematic** — Buildertrend estimate with parametric build-up
3. **Design Development** — STACK or PlanSwift takeoff against drawings
4. **Bid** — sub buyout + Sage or ProEst for hard numbers
5. **Construction** — Buildertrend for cost tracking against budget

---

## AI in estimating — what's real in 2026

Industry signal:
- **AI is good at:** scope identification from photos/plans, line-item generation, sanity-checking against benchmarks, narrative SOW writing
- **AI is bad at:** dollar accuracy, regional pricing nuance, judging existing-conditions risk
- **AI is dangerous when:** asked to "estimate" without structured guardrails. Hallucinated unit costs that "sound right" are the failure mode.

### CMB's architecture is correct
The app's "AI does scope, app does math" pattern is industry best practice for AI-augmented estimating. Maintain this discipline:
- AI generates line items with quantities + unit cost ranges from a deterministic guardrail database
- App scales to section totals
- App applies markup, GC, contingency via formulas
- Client sees a range, not a false-precision single number

### The next leap
Best-in-class AI estimating in 2026 layers:
1. **Photo-grounded scope identification** (what CMB does)
2. **Historical-job calibration** (CMB doesn't do this yet — biggest unlock)
3. **Real-time pricing feeds** (Random Lengths, supplier APIs — possible future)
4. **Confidence intervals on every line** (three-point estimating built in)
5. **Variance tracking against actuals** (close the loop)

---

## Apply to CMB Site Visit App — specific recommendations

### High priority
1. **Add AACE Class indicator and accuracy band** to the Sign-page budget summary. Replace "15-20% accuracy" language everywhere with "Class 5 conceptual, −25%/+50%."
2. **Bump contingency from 5% to 10%** in `computeGC` for Class 5 estimates.
3. **Apply 0.85 productivity multiplier** to all hourly Labor lines in the takeoff.
4. **Add a "Post-job actual cost" entry field** for back-office mode. Build the calibration database.
5. **Refresh UNIT_COST_DB quarterly** — set a recurring reminder for lumber, OSB, copper, drywall.

### Medium priority
6. **Add three-point estimating** to high-uncertainty trade sections (Excavation, Foundation, Site Work, Mechanical). UI: 3 fields (low, most likely, high) instead of 1.
7. **Trade checklist visibility** — show the client which trades are explicitly included on the SOW. Builds trust and catches their "wait, are we doing X?" questions early.
8. **CCI factor by city** — Kalispell vs Whitefish vs Big Mountain vs Bigfork. Auto-applied based on project address.
9. **Confidence flag per section** — let the AI/estimator mark sections as Low/Med/High confidence.

### Low priority
10. **Integration with Random Lengths** for lumber price feeds (future)
11. **RSMeans API integration** for cost data refresh (future, requires subscription)
12. **Buildertrend cost-tracking sync** to pull actuals back into the app for calibration (future, BT API is dropped per CLAUDE.md so this would need to be CSV-based)

---

## Sources

- [AACE 56R-08 Cost Estimate Classification — Building/General Construction](https://web.aacei.org/docs/default-source/toc/toc_56r-08.pdf)
- [AACE 18R-97 Cost Estimate Classification — Process Industries](https://web.aacei.org/docs/default-source/toc/toc_18r-97.pdf)
- [AACE 119R-21 Cost Estimate Accuracy Range and Contingency](https://web.aacei.org/docs/default-source/toc/toc_119r-21.pdf)
- [AACE 87R-14 Cost Estimate Classification](https://web.aacei.org/docs/default-source/toc/toc_87r-14.pdf)
- [Vista Projects — Understanding Construction Cost Estimate Classes](https://www.vistaprojects.com/construction-cost-estimate-classes/)
- [Possession Planning — AACE Cost Estimation Standards](https://possessionplanning.com/glossary/statistical-cost-estimation-methods/aace-international-cost-estimation-standards/)
- [AACE Guide to Cost Estimate Classification Systems](https://library.aacei.org/pgd01/pgd01.shtml)
- [Markup and Profit — How Much Should a Contractor Charge](https://www.markupandprofit.com/articles/how-much-should-a-contractor-charge/)
- [Estimating Construction Profitably — Michael Stone book](https://www.amazon.com/Estimating-Construction-Profitably-Developing-Residential/dp/0979508355)
- [Smartsheet Construction Change Order Process](https://www.smartsheet.com/content/construction-change-order-form-101)
- [Rhumbix Change Orders Definitive Guide](https://www.rhumbix.com/blog/change-orders-construction-definitive-guide)
- [Buildxact Preconstruction Costs](https://www.buildxact.com/us/blog/preconstruction-costs/)
- [NAHB Cost of Constructing a Home 2024](https://eyeonhousing.org/2025/12/top-posts-cost-of-constructing-a-home-in-2024/)
