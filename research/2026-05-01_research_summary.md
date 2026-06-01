# 2026-05-01 Research Summary — Estimating, Sales, Profit, Ethics

> Four research deliverables from this session, summarized for quick orientation.

## Deliverables

| File | Topic | Key finding |
|---|---|---|
| [estimating_for_profit.md](./estimating_for_profit.md) | Margin vs markup, NAHB benchmarks, profit leak sources | **CMB is probably under-charging — 20% markup is only 16.67% margin** |
| [estimating_best_practices.md](./estimating_best_practices.md) | AACE classes, takeoff, accuracy, methodology | **Site-visit estimates are Class 5 — −50%/+100% real accuracy, not "15-20%"** |
| [sales_ethics_best_practices.md](./sales_ethics_best_practices.md) | Discovery, trust, CAN-SPAM, MT contractor rules | **$53,088 max CAN-SPAM penalty per email; current voice & outreach already compliant** |
| [design_build_sales.md](./design_build_sales.md) | DBIA, retainer pricing, contract review | **3D walkthrough is CMB's hidden weapon — lead with it; contract has 7 gaps to address** |

## The five most important takeaways across all four

### 1. The markup/margin math problem is real and material

The app variable is named `marginPercent` but applied as a markup. 20% markup = 16.67% margin. Combined with typical 12% overhead = ~4.7% net profit, half the 8.7% industry average and well below the 10% benchmark. **Recommend raising markup to 25-28% to hit the industry-benchmark net profit.**

### 2. Accuracy claims need to align with what's actually possible

A 30-minute site visit produces an AACE Class 5 conceptual estimate. The honest accuracy band is −50%/+100%. Promising "15-20% accuracy" at this stage is technically indefensible. Reframe as "Class 5 conceptual, tightens to ±15% through Steps 1-4."

### 3. The 3D walkthrough is the brand's single best differentiator and it's barely surfaced

Most clients have never seen their home in 3D before framing starts. CMB does this in Step 2-3 of the Design-Build Program. Almost no client conversation leads with it. Should be top-of-mind in every proposal, every email, every sign-page contract.

### 4. The contract has 7 specific gaps worth addressing

Listed in detail in `design_build_sales.md`. Highest priority:
- Add 60-day time window to First Right of Refusal
- Add price-match mechanism
- Specify change-order markup percentage (suggest 35%)
- Run by MT construction attorney once

### 5. Voice discipline is the premium positioning

The neighborly, sixth-generation-Montanan voice IS the premium positioning. Drift back to transactional language under deadline pressure is the biggest sales risk. The AI prompts now hard-block the worst drift patterns.

## What this informs (app changes to consider, NOT implemented yet)

### From `estimating_for_profit.md`
- Raise default markup from 20 → 25-28
- Split markup by project type (residential / remodel / commercial / Davis-Bacon)
- Rename `marginPercent` → `markupPercent` and surface clear naming throughout
- Add `changeOrderMarkup` field (35% default)
- Add `allowancePolicy` field with cash-allowance language
- Track post-completion actual cost for calibration

### From `estimating_best_practices.md`
- Add AACE Class indicator + accuracy band to budget summary
- Replace "15-20% accuracy" with Class 5 caveat
- Bump contingency 5% → 10% for Class 5
- Apply 0.85 productivity multiplier on labor
- Add three-point estimating UI for high-uncertainty trades
- Refresh UNIT_COST_DB quarterly

### From `sales_ethics_best_practices.md`
- Add discovery question prompts to Scope page
- Add "What I heard you say" section to proposal
- Add MT contractor registration number to contract footer
- Verify all MT 28-2-2201 disclosures present

### From `design_build_sales.md`
- Update contract with industry-standard improvements (7 specific changes)
- Add 3D walkthrough callout to contract and proposal
- Auto-include past project reference in SOW
- Add NTE cap option for hourly preconstruction fees
- Add project-type option for "build to architect-provided plans"

## Recommended next action

**Before making any of the above changes, raise the markup percent.** That's a 5-minute fix with the biggest financial impact. Everything else can be sequenced over the next several sessions.

Suggested first commit:
```js
// Was: marginPercent: 20
marginPercent: 28  // industry-benchmark net profit at ~12% overhead
```

Then test with a real site visit. If 28% feels too aggressive, drop to 25 as a conservative step.

The math doesn't lie: at 20% you're working too hard for too little.
