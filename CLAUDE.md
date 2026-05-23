# CMB Site Visit App — Project CLAUDE.md

> **Loaded by Claude Code at the start of every session in this folder.**
> Read this first. For broader personal/business context, also read `~/.claude/matt-farrier-master-context.md`.

---

## About Matt (the user)

- **Matt Farrier** — owner of Copper Mountain Builders (CMB) in Kalispell, Montana
- **Sixth-generation Montanan** — verified and citable, used in client-facing materials as authentic heritage
- **Email:** mattf@coppermountainbuilders.com
- **Mailing:** PO Box 2471, Kalispell, MT 59903
- **Devices:** Works across MacBook + Windows Surface — every project is a git repo so context syncs between machines
- **Session protocol:** at start, pull latest from remote. At end, commit, push, append notes to `NOTES.md` / `CLAUDE.md`
- **Style:** direct, no filler praise; ask when unsure; explain commands before running them
- **Hard rules:** never force-push to main, never commit secrets

---

## CMB the company

- **Design-Build firm**, NOT a general contractor (brand-critical distinction; never call CMB a "GC"). Runs a 5-step Design-Build Program: Initial Consultation → Schematic Design → Design Development → Project Development → Construction
- **Founded** 2018 by Matt Farrier (age 18). Started fixing other builders' code-compliance failures. Now active board member of the Flathead Building Association.
- **Three divisions:** CMB (general design-build), CMB Electric (run by Master Electrician Robert), HVAC (Justin, building out)
- **Range:** full custom homes start-to-finish through master bath remodels, light commercial / tenant improvement, and government / Davis-Bacon prevailing-wage work
- **Self-perform trades (in-house):** architectural design with 3D rendering, project supervision, framing, finish carpentry/trim, siding, electrical (CMB Electric), HVAC (in-house), occasional roofing, decking, hardware/door install, window install, PM/supervision, cleanup/dumpster/site protection, demolition
- **Subbed trades:** plumbing, drywall, paint, cabinet/countertop install, insulation (will self-perform if scheduling requires)
- **Labor rates:** Carpenter $85/hr, Foreman $100/hr, PM $130/hr
- **Standard markup:** 20% (margin baked into client-facing numbers, separate-line tracked internally)
- **Pricing region:** Flathead Valley, Montana (with Davis-Bacon DOL Flathead County rates available as a toggle)
- **Buildertrend** is the construction-management software CMB uses; Excel exports must import cleanly into BT
- **Buildertrend API was dropped** — no client-import feature in the app
- **Team:** Matt Farrier (CEO/founder), Bill (Construction GM), Shelby (Architectural Drafter — NEVER call her "architect"), Robert (Master Electrician/GM CMB Electric)
- **Office:** 14 3rd Street East, Suite #250, Kalispell, MT 59901 · Phone (406) 471-1165 · coppermountainbuilders.com

---

## The CMB Site Visit App

A mobile-first, single-page vanilla JS app (no framework, no build step). Three files: `index.html`, `app.css`, `app.js` (~3000+ lines). Hosted on Netlify at https://cmbsitevisit.netlify.app. GitHub repo: `mattf122/cmb-app`.

### Architecture

- **Cloudflare Worker** at `https://billowing-snowflake-38f0.coppermountainbuilders406.workers.dev` proxies API calls to keep keys server-side
  - `/` route → Anthropic Claude
  - `/openai` route → OpenAI Responses API (for image-to-image)
- **Model fallback chain:** Opus (primary, most accurate) → Sonnet (fallback) → Haiku (last resort). Automatic retry with backoff on `overloaded_error`
- **OneDrive/SharePoint sync** via MSAL — visits saved to `Company Files - Documents > CMB Site Visits > [Year] > [Client - Address]/`
- **Cache-busting** via `?v=YYYYMMDDx` query params on script/css tags (mobile browsers cache aggressively)

### The 6-step flow

1. **Client** — client info, project address, rep name
2. **Scope** — project type, sqft, photos (before + inspiration), construction documents (PDFs read via text extraction, not image rendering — solved a 5MB image limit problem), Davis-Bacon toggle, margin %, "Analyze & Ask" generates clarifying questions
3. **Concept** — pick a before photo, describe changes in plain language, OpenAI GPT-4o Responses API generates a photorealistic image of the same space with the changes applied. Iterate with client until approved. Approved concepts feed into the estimate. Tap any image for a full-screen lightbox.
4. **Estimate** — quantity-takeoff approach: AI identifies scope and quantities, app does ALL math (`computeEstimateFromTakeoff`, `computeGC`, `validateTakeoff`, `sanityCheckPerSF`). Embeds 56-item Flathead Valley `UNIT_COST_DB` as guardrails. 4 AI calls: photo/doc analysis → compliance → quantity takeoff → SOW + schedule
5. **Sign** — clean Design-Build Agreement (Matt's actual contract template, not generic). Both signature pads. Below the signatures: high-level Conceptual Budget Summary with margin baked into trade lines (invisible to client). Retainer callout.
6. **Review/Export** — proposal Word doc, Excel estimate, OneDrive sync. OneDrive sync uploads: visit JSON, proposal Word, Excel estimate, signed contract Word, all before photos, all approved concept images.

### Excel export (Buildertrend import format)

- 15 columns matching BT's native import: Category, Cost Code, Title, Description, Quantity, Unit, Unit Cost, Cost Type, Marked As, Builder Cost, Markup, Markup Type, Client Price, Margin, Profit
- Row 1 = bold headers only. No title rows, no client info, no notes, no totals — pure line-item data
- Rows sorted by CSI division ascending (00 → 01 → 02 → 06 → etc.)
- Self-perform trades split into Labor + Material rows; everything else = single Subcontractor row
- Allowances flagged when client selection TBD or lump-sum carry
- Live formulas: Builder Cost = Qty × Unit Cost; Client Price = Builder Cost × (1 + Markup/100); Profit = Client Price − Builder Cost; Margin = Profit/Client Price (as %)
- All 796 valid CSI cost codes embedded as `VALID_CSI_CODES` constant — `normalizeCostCode()` validates, strips leading zeros, fixes hallucinations (4-digit codes), forces suffix to match Cost Type
- Line items scaled post-AI so `sum(qty × unitCost) = section.high` exactly — Excel total reconciles to proposal doc HIGH

### Key state structure (`appData`)

- `clientName, clientEmail, clientPhone, clientAddress, clientCity, clientZip`
- `projectAddress, projectCity, repName, projectNotes`
- `zones[0]: { type, sqft, notes, photosBefore[], photosInspo[] }`
- `clarifyingQuestions[], clarifyingAnswers{}`
- `conceptImages[]: { beforePhoto, prompt, afterImage, approved }`
- `estimate: { sections[], zones[], summary, schedule, totalLow, totalHigh, subtotalLow, subtotalHigh, gcLow, gcHigh, complianceAnalysis, siteAnalysis }`
- `davisBacon` (bool), `marginPercent` (default 20), `retainerAmount`
- `clientSig, repSig, clientPrintName, repPrintName`

---

## Brand Voice / Sales Strategy (the most important part)

This is anchored across all client-facing AI outputs (SOW narrative, proposal doc, contract welcome). **It's also the voice for cold outreach being developed in the CMB War Room project — voice MUST stay consistent across both projects.**

### Voice anchor (use this verbatim in any system prompt for client-facing copy)

> You are writing on behalf of Copper Mountain Builders, a sixth-generation Montana family business in Kalispell. Voice: warm, neighborly, refined. Listens before it pitches. Catches problems before they cost the homeowner. Answers the phone three years after the build. Speaks the way a builder would speak to a friend over coffee — confident in the craft, gentle in the delivery.

### Voice rules

- **Earned warmth, not confident pitch** — competence shows up *because of* the care, not in place of it
- **Sixth-generation Montanan** stated as heritage (true family fact), NOT as a credential about company tenure
- **Identify as a neighbor** before identifying as a builder
- **Range is explicit:** "from full custom homes to a long-overdue master bathroom" — never imply CMB only does big custom
- **Three care behaviors** (use as differentiation, not service-line bullets):
  1. "We catch problems before they cost you"
  2. "We listen before we draw a line"
  3. "We answer the phone whether you're three days into framing or three years into living in it"
- **"Bring clarity to your dreams"** — underlying offer / posture, not a service
- **Honest neighborly care** without overstepping or fear-mongering
- **The Montana frame:** "In Montana, we still pull over to help a stranger with a flat. Whether it's a legacy property or your master bathroom remodel — we're here to bring clarity to your dreams."

### Anti-patterns (what to AVOID)

- ❌ ALL CAPS section headers
- ❌ "We look forward to partnering with you" / corporate filler
- ❌ Hollow adjectives ("luxurious," "stunning," "premier")
- ❌ Construction jargon
- ❌ Bullet-list dryness for narrative content
- ❌ Bro-to-bro confidence with no warmth
- ❌ Implying CMB only does big custom homes
- ❌ Fear-mongering about what could go wrong on other builders' jobs
- ❌ Credential-stacking ("45 years experience...")

### Cold outreach (in development in War Room project — voice consistency across both)

Voice example (the approved version):

> **Subject:** Whitefish Stage Rd build — a note from a neighbor in Kalispell
>
> Hi James and Lori,
>
> Saw the septic permit come through on your 1.8 acres off Whitefish Stage. Four-bedroom layout, workable lot — looks like the start of something special, so I figured I'd reach out as a neighbor.
>
> I run Copper Mountain Builders out of Kalispell. We're a design-build firm working across everything from full custom homes to a long-overdue master bathroom — and my family has been in Montana for six generations, which shapes how we do this. We catch problems before they cost you. We listen to what you actually want before drawing a single line. And we answer the phone whether you're three days into framing or three years into living in it.
>
> If you're still picking your builder, I'd love fifteen minutes on the phone. No pitch — just a conversation about bringing some clarity to your build, the questions worth asking, and whether we end up being a fit. If you've already got someone you trust, that's wonderful too, and I'm glad to share what to look for either way.
>
> Warmly,
> Matt Farrier · Copper Mountain Builders
> PO Box 2471, Kalispell, MT
> Reply STOP to remove from this list.

The War Room session is building a `pickRelevantProjects(lead)` selector to swap in different past-project references based on prospect type (own-architect, inherited/stalled, high-end, commercial).

---

## Three use cases for the app

1. **Field visits** — Matt with a client on-site, tablet in hand, generating a real conceptual estimate during the meeting
2. **Office design tracking** — back-office tool for managing active projects through the 5-step Design-Build Program
3. **Government bid analysis** — Davis-Bacon projects, code compliance review, formal estimate generation for public bids

**Accuracy target:** estimates within 15-20% of final actual cost.

---

## Where we are now (as of 2026-05-01)

- ✅ Full 6-step flow working with Opus → Sonnet → Haiku fallback
- ✅ Concept image generation working (GPT-4o Responses API, image-to-image, photorealistic)
- ✅ Excel export rebuilt to match Buildertrend import format exactly (15 cols, no headers, sorted CSI, validated codes, scaled to section.high)
- ✅ All 796 CSI codes embedded and validated
- ✅ OneDrive sync includes everything (JSON, proposal Word, Excel, signed contract, photos, concepts)
- ✅ Contract page shows clean Design-Build Agreement + budget summary below signatures (margin invisible to client)
- ✅ Image lightbox for concepts (full-screen view on phone/computer)
- ✅ Sign step comes BEFORE Review/Export so contract syncs as part of the close
- ✅ Wake Lock keeps phone screen on during AI generation
- ✅ Davis-Bacon prevailing wage toggle
- ✅ Live deployed at cmbsitevisit.netlify.app, cache version `20260501a`
- ✅ Client-facing voice rewritten to neighborly Montana — proposal Word doc has personal intro letter, sentence-case headings, SOW grounded in actual site observations
- ⏳ Verifying voice changes feel right in next live export
- ⏳ Cold outreach drafter being built in parallel session (CMB War Room) — voice anchor stays consistent across both

---

## File structure

```
C:/Users/MattFarrier/OneDrive - Copper Mountain Builders/CMB Site Visits/App Code/
├── app.js                    (main file, all logic ~3000+ lines)
├── app.css
├── index.html
├── netlify.toml              (no-cache headers)
├── cmb-logo.jpg
├── memory/                   (auto-memory: user_role, project_priorities, etc.)
├── scripts/                  (Python helpers — built sample BT files, audited live exports)
├── sample_BT_v2.xlsx         (the approved BT import format reference)
└── mockup.html               (clickable wireframe of all 6 steps)
```

---

## Hand-off note

When picking up:

1. Read this `CLAUDE.md`
2. Read recent entries in `NOTES.md` (if present)
3. Run `git status` and `git pull` first
4. **The voice anchor is non-negotiable** — it took several iterations to get right and it's central to how CMB shows up to clients. Don't generate any client-facing copy without grounding it in the voice rules above.
