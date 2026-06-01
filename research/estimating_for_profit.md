# Estimating for Profit — Research Findings

> Research conducted 2026-05-01. Cites industry-standard references (Michael Stone "Markup & Profit," NAHB Cost of Doing Business surveys, NAHB KPI benchmarks). Where percentages are stated, sources are cited inline.

---

## TL;DR — five things that matter

### 1. **CRITICAL: 20% markup ≠ 20% margin. CMB is probably under-charging.**

The app currently applies a **20% markup**, computing `Client Price = Builder Cost × 1.20`. That produces a gross margin of **16.67%**, not 20%.

**Why this matters:**

| Layer | NAHB 2023 single-family builder average ([NAHB](https://www.nahb.org/news-and-economics/press-releases/2025/04/nahbs-new-study-provides-statistics-and-data-on-builder-financial-performance)) |
|---|---|
| Gross profit margin | 20.7% |
| Operating expenses (overhead) | 12.0% of revenue |
| **Net profit** | **8.7%** |

If CMB delivers **16.67% gross margin** and absorbs typical 12% overhead, net is **~4.7%** — about half the industry average and well below the **10% benchmark** ([BuildBook](https://buildbook.co/blog/home-builders-profit-margin), [Association of Professional Builders](https://blog.associationofprofessionalbuilders.com/construction-profit-margin)).

**To hit the industry 10% net profit benchmark** with NAHB's typical 12% overhead, CMB needs:
- **22% gross margin** = `Client Price = Builder Cost × 1.282` = **28.2% markup**

**Recommendation:** Raise `marginPercent` in the app from `20` to somewhere between `25` (a conservative move that recovers true 20% margin) and `30` (industry-benchmark net profit). The exact number is yours to choose, but 20 is leaving money on the table.

### 2. The Michael Stone formula

Michael Stone teaches contractors to calculate their **own markup** from their actual overhead and desired net profit ([Markup and Profit](https://www.markupandprofit.com/articles/how-much-should-a-contractor-charge/)).

The Stone formula:

```
Required markup = 1 / (1 − overhead% − desired_net_profit%)
```

Example: 25% overhead + 10% desired net = `1 / (1 − 0.35) = 1.538` → **53.8% markup** → 35% gross margin.

**Stone's stated minimum:** every job must produce at least **8% net profit** AND cover owner salary in overhead.

**Stone's stated reality:** the typical remodeling contractor has overhead between **25% and 54% of revenue** ([Markup and Profit Revisited](https://www.buildersbook.com/markup-profit-a-contractor-s-guide-revisited-by-michael-c-stone.html)).

For CMB (design-build, sub-heavy on plumbing/drywall/paint, self-perform on framing/finish/PM/architecture), realistic overhead is probably **15-25%** of revenue. At 20% overhead + 10% net, required markup = `1 / (1 − 0.30) = 1.428` = **42.8% markup** = 30% gross margin.

That's a much different number than 20%.

### 3. Conceptual estimates have a wide accuracy band by definition

Per **AACE International 56R-08** (the recommended-practice document for cost estimate classification in buildings) ([AACE](https://web.aacei.org/docs/default-source/toc/toc_56r-08.pdf)):

| Class | Project definition | Typical accuracy range |
|---|---|---|
| Class 5 (ROM / Conceptual) | 0–2% complete | **−50% to +100%** |
| Class 4 (Schematic) | 1–15% complete | −30% to +50% |
| Class 3 (Design Development) | 10–40% complete | −20% to +30% |
| Class 2 (Bid) | 30–75% complete | −15% to +20% |
| Class 1 (Definitive) | 65–100% complete | −10% to +15% |

**CMB's site visit produces a Class 5 estimate** (0–2% project definition, no design work yet).

**Implication:** the CLAUDE.md target of "15–20% accuracy" is **Class 2 territory** — that level of accuracy only happens AFTER design development. Promising 15-20% during a sales conversation is misleading at best and dangerous at worst. **Tell clients the conceptual budget is −25%/+50% and gets tighter as we go through Steps 1–4.**

### 4. Allowances should be honest — never the close hook

Best practice from [Building Advisor](https://buildingadvisor.com/project-management/contracts/red-flag-clauses/allowances-in-construction-contracts/), [Markup and Profit](https://www.markupandprofit.com/articles/allowances-in-your-pricing/), and [JLC](https://www.jlconline.com/business/sales-marketing/allowances-and-markup-in-contracts):

- **Set allowances on real quotes from real suppliers for the actual project.** Don't lowball to win the bid.
- **Use "cash allowances"** — disclose the supplier's invoice price separately from your markup. Clients fact-check Home Depot anyway; transparency builds trust.
- **Allowance overages and credits are change orders.** State the change-order markup in the contract upfront.
- **Red flag:** builders who set artificially low allowances knowing 25%+ markup on the overages is coming. Don't be that builder.

### 5. Change orders should be priced HIGHER than base contract markup

Industry standard for change-order O&P is **10-15%**, but most experienced contractors agree that's not enough to cover true cost ([Smartsheet](https://www.smartsheet.com/content/construction-change-order-form-101), [Rhumbix](https://www.rhumbix.com/blog/change-orders-construction-definitive-guide)).

Profitable shops mark up change orders **higher** than base contract — typical **25-35% markup** — because:
- Smaller jobs have higher per-dollar overhead drag
- Re-mobilization, schedule disruption, project-management overhead
- Client urgency reduces price sensitivity

**Contract language must include:** detailed schedule of labor, profit, overhead, and markup rates. Otherwise change-order disputes become a profit leak.

---

## Margin vs Markup — the math that confuses builders

| Markup | Selling Price (when cost = $100) | Margin |
|---|---|---|
| 10% | $110 | 9.09% |
| 15% | $115 | 13.04% |
| **20%** | **$120** | **16.67%** ← CMB's current setting |
| 25% | $125 | 20.00% |
| 30% | $130 | 23.08% |
| 35% | $135 | 25.93% |
| 40% | $140 | 28.57% |
| 50% | $150 | 33.33% |

**Formula** ([Patriot Software](https://www.patriotsoftware.com/blog/accounting/margin-vs-markup-chart-infographic/), [Consero](https://conseroglobal.com/resources/markup-vs-margin-what-is-the-difference/)):

```
Markup → Margin:  margin = markup / (1 + markup)
Margin → Markup:  markup = margin / (1 − margin)
```

The CMB app code uses `marginPercent` as a variable name but the formula `Client Price = Builder Cost × (1 + marginPercent/100)` is actually a **markup**. This naming mismatch propagates into the contract budget summary too.

---

## NAHB benchmarks (latest available)

### Single-family builders (2023 data, published 2025) — [NAHB](https://www.nahb.org/news-and-economics/press-releases/2025/04/nahbs-new-study-provides-statistics-and-data-on-builder-financial-performance)
- Gross profit margin: **20.7%** (highest since 2006)
- Operating expenses: **12.0%** of revenue
- **Net profit: 8.7%** (highest in 30+ years; series peak was 10% in 1991)

### Remodelers (2024 data, published 2026) — [NAHB](https://www.nahb.org/blog/2026/04/home-remodeling-profit-margin)
- Gross profit margin: **29.9%**
- **Net profit: 6.3%** (highest since 1996)
- Higher gross % because remodeling carries more risk and complexity per dollar

### Implication for CMB
CMB does both new custom homes and remodels. The right markup probably blends:
- **Custom new builds: target ~22% gross margin (28% markup)** — matches NAHB top quartile
- **Remodels: target ~30% gross margin (43% markup)** — matches NAHB top quartile

A single 20% markup applied to both is leaving money on the table on remodels especially.

---

## What goes into overhead (the missing layer)

Per Michael Stone and NAHB Cost of Doing Business:
- Office rent, utilities, internet
- Software (Buildertrend, QuickBooks, this app's API costs, OneDrive, payroll)
- Vehicles (truck, gas, insurance, maintenance)
- General liability + workers' comp insurance (not the per-job builder's risk)
- Marketing (cmb-war-room outreach, website, signs, photography)
- Owner salary (Matt's pay needs to come out of overhead, not net profit)
- Unbillable PM time (estimating, sales calls, follow-up)
- Accounting, legal, licenses, education (board membership, conferences)
- Tools depreciation, jobsite supplies that don't bill direct
- Bad debt, warranty reserves

**Stone's #1 rule:** include owner salary in overhead. Net profit is what's left to reinvest in the company. They are not the same thing.

---

## The top 10 ways custom builders lose money on jobs they "estimated correctly"

Compiled from [Markup and Profit](https://www.markupandprofit.com/), [Buildbook](https://buildbook.co/blog/home-builders-profit-margin), and field practice:

1. **Confusing markup with margin** — the most common error. Industry studies say >50% of small contractors get this wrong.
2. **Owner salary not in overhead** — so net profit looks higher than it is.
3. **Change orders priced at base contract markup** — bleeds margin all the way through the job.
4. **Allowance underages** — set too low to win the bid, then overages cause client friction without recovering full cost.
5. **Scope creep** — the "while you're at it" client requests that aren't formally change-ordered.
6. **Productivity overestimation** — assuming 100% labor productivity when 85% is realistic. Always estimate at 85%.
7. **Sub price increases mid-job** — sub quotes have a 30-90 day shelf life, but contracts often don't.
8. **Material price changes** — particularly lumber, copper, steel; lock supplier prices at contract signing.
9. **Bad weather days** — schedule extensions cost real money in overhead absorption.
10. **Punch list dragging** — the last 10% takes 30% of the time; under-budget for completion.

---

## Apply to CMB Site Visit App — specific recommendations

### High priority

1. **Rename `marginPercent` to `markupPercent`** — current variable name is wrong; what's applied is markup, not margin. Update CLAUDE.md to use correct terminology.

2. **Raise default markup from 20 to 28** — recovers industry-benchmark net profit. Or raise to 25 as a conservative first move and watch profitability. Make the field editable per visit so commercial / DB jobs can be set higher.

3. **Split markup by project type** — single rate doesn't fit remodel + new build + commercial. Suggested defaults:
   - New custom residential: 28%
   - Remodel/addition: 40%
   - Commercial: 22%
   - Davis-Bacon government: 18% (lower because base costs are already higher)

4. **Reframe the "accuracy promise"** in client-facing copy. Replace any "15-20% accurate" language with "Class 5 conceptual range, -25% to +50%, tightens to ±15% by end of Step 4." Add this to the Sign-page budget summary disclaimer.

5. **Show overhead as a separate line in the Excel export** — currently invisible. Buildertrend imports cleaner when overhead is visible to project accounting.

### Medium priority

6. **Add a `changeOrderMarkup` field defaulting to 35%** — populated into the contract so it's disclosed upfront, not negotiated later.

7. **Add an `allowancePolicy` field** — "Cash allowance, no markup on selection at or under allowance; change-order applies to overage at [changeOrderMarkup]%". Lock this language into the Sign-page contract.

8. **Add a productivity factor** to compute estimate (suggested 0.85). Currently labor is at 100% theoretical — pad it.

9. **Track `actualCost` post-completion** — even a manual field would let CMB build a real historical database for calibration. Right now there's no feedback loop.

### Low priority (later)

10. **Add a "Profit calculator" view** for office mode — shows: estimated revenue → builder cost → overhead allocation → net profit. Helps the GM see whether each job is profitable BEFORE the bid is sent. This is what Buildertrend Pro Edition does in its job costing module.

---

## Sources

- [Michael Stone, Markup and Profit](https://www.markupandprofit.com/) — the bible for small-contractor pricing
- [How Much Should a Contractor Charge?](https://www.markupandprofit.com/articles/how-much-should-a-contractor-charge/)
- [Allowances in Your Pricing](https://www.markupandprofit.com/articles/allowances-in-your-pricing/)
- [NAHB Cost of Doing Business 2024 Report](https://www.nahb.org/news-and-economics/press-releases/2025/04/nahbs-new-study-provides-statistics-and-data-on-builder-financial-performance)
- [NAHB Home Remodeling Profit Margin 2026](https://www.nahb.org/blog/2026/04/home-remodeling-profit-margin)
- [NAHB Builders' Profit Margins Improved in 2023](https://eyeonhousing.org/2025/03/builders-profit-margins-improved-in-2023/)
- [AACE International 56R-08 Cost Estimate Classification System](https://web.aacei.org/docs/default-source/toc/toc_56r-08.pdf)
- [AACE 18R-97 Process Industries Classification](https://web.aacei.org/docs/default-source/toc/toc_18r-97.pdf)
- [Patriot Software — Margin vs Markup Chart](https://www.patriotsoftware.com/blog/accounting/margin-vs-markup-chart-infographic/)
- [Consero — Markup vs Margin Calculator](https://conseroglobal.com/resources/markup-vs-margin-what-is-the-difference/)
- [Building Advisor — Allowances in Construction Contracts](https://buildingadvisor.com/project-management/contracts/red-flag-clauses/allowances-in-construction-contracts/)
- [JLC — Allowances and Markup in Contracts](https://www.jlconline.com/business/sales-marketing/allowances-and-markup-in-contracts)
- [Construction Consulting — How to Use Allowances in Residential](https://constructionconsulting.co/blog/how-to-use-allowances-in-residential-construction)
- [Smartsheet — Construction Change Order Process](https://www.smartsheet.com/content/construction-change-order-form-101)
- [Rhumbix — Change Orders Definitive Guide](https://www.rhumbix.com/blog/change-orders-construction-definitive-guide)
- [BuildBook — Home Builder Profit Margins](https://buildbook.co/blog/home-builders-profit-margin)
- [Association of Professional Builders — Construction Profit Margin](https://blog.associationofprofessionalbuilders.com/construction-profit-margin)
- [NAHB 5 KPIs Every Builder Should Know](https://www.nahb.org/blog/2021/09/5-kpis-every-builder-should-know)
