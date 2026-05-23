# CMB Site Visit App — Architecture Review

**Scope:** `app.js` (4018 lines), `index.html` (57 lines + base64 logo), `app.css` (100 lines)
**Date:** 2026-05-23
**Reviewer focus:** structural integrity, separation of concerns, future-changeability

---

## Executive verdict

The app works and ships value — the math separation (`computeEstimateFromTakeoff` / `computeGC` / `validateTakeoff` / `sanityCheckPerSF`) is genuinely good design, and the model-fallback retry pattern is solid in concept. But the file has crossed the threshold where the cost of *finding* the right place to make a change exceeds the cost of *making* the change. The top three risks are: (1) a silent **signature-pad re-binding bug** that breaks step 4 on a second visit, (2) **four copies** of the AI worker-fetch+fallback pattern with subtle drift between them, and (3) **two near-identical 350-line copies** of the proposal Word-doc HTML that will inevitably diverge under brand-voice edits.

Everything else is the natural consequence of a single 4000-line file: tangled module boundaries, mixed responsibilities, and a render dispatcher that does too much per call.

---

## Top 10 architectural issues (ranked by impact × ease-of-fix)

### 1. `initSigPad` cache permanently disables signature pads on re-render — HIGH impact, LOW effort
**Where:** `app.js:2213-2226`
**What:** Module-level `const sigPads = {}` is keyed by canvas ID. On first render of step 4, `sigPads["sig_client"] = true`. When `render()` rebuilds the DOM (any photo upload, any `goTo`, leaving and returning to step 4), the OLD canvas DOM element is destroyed and a NEW one is created with the same ID. But `initSigPad` short-circuits: `if(!canvas || sigPads[canvasId]) return;` — so the new canvas gets **zero event listeners**. Silent failure: the user sees a signature box, draws on it, nothing happens, no error.

**Why it matters:** Step 4 is where the contract gets signed. If a user navigates away (e.g. to fix a typo on step 0) and comes back, the contract can't be signed. The current `render()` calls `initSigPad` inside a `setTimeout(...,50)` (line 3963) so the bug is masked on the *first* visit only.

**Fix:** Delete the cache. Re-initialise unconditionally on every render of step 4, OR key the cache on the actual DOM node, not the ID. Existing signature is already re-painted from `appData[sigKey]` via the `if(appData[sigKey]){...}` branch, so re-init is safe.

```js
function initSigPad(canvasId, sigKey){
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  // remove old listeners by cloning (cheap):
  const fresh = canvas.cloneNode(true);
  canvas.parentNode.replaceChild(fresh, canvas);
  // ...bind listeners to `fresh`
}
```

---

### 2. Four duplicate copies of the worker-fetch + model-fallback pattern — HIGH impact, MEDIUM effort
**Where:**
- `app.js:1355-1391` (line-item gen, 2-model fallback)
- `app.js:2804-2825` (analyze scope, 3-model fallback)
- `app.js:2855-2900` (`workerCall` *defined inline inside* `runGenerateEstimate`)
- `app.js:3003-3018` (vision call inside `runGenerateEstimate`, 3-model fallback)

**What:** Same `fetch("https://billowing-snowflake-...workers.dev")`, same retry-on-529/503, same overloaded-error detection, same `attempt * Nms` backoff, same JSON-fence stripping — written four different ways with subtle drift:
- The line-item call uses a 2-model fallback (Haiku → Sonnet); the others use 3-model.
- Backoff is `(attempt+1)*2500` in one place, `(attempt+1)*3000` in three others.
- The `workerCall` closure at line 2855 references the parent's `btn` variable, which is why it's a closure — but the *same exact logic* lives unrolled at 3003 because the inline version needs to update text differently.
- Three of the four parse fences (` ```json `) inconsistently.

**Why it matters:** When the Cloudflare Worker URL changes, when a new model ID needs swapping in (Opus 4.5 → 4.7 migration is already on the horizon per CLAUDE.md), when the retry policy needs tuning, you must remember to edit **four places**. Inevitable drift = inevitable bug.

**Fix:** Single module-level `aiCall({messages, system, maxTokens, preferredModel, onStatus})` that owns the fallback chain, retries, and JSON sanitisation. All four call sites become one-liners. Status-text updates flow through `onStatus(text)` callback so each caller controls its own button.

---

### 3. Two 350-line copies of the proposal Word-doc HTML — HIGH impact, LOW-to-MEDIUM effort
**Where:**
- `generateProposalDocument()` — `app.js:1687-2036` (download)
- `generateProposalBlob()` — `app.js:2502-2584` (blob for OneDrive upload)

**What:** Both render the same client proposal Word doc — cover page, intro letter, "What we'd build", "Where the money goes" table, site analysis, compliance, schedule, by-trade table. The first is verbose (10pt → 18pt named CSS classes, expanded `formatAnalysis`), the second is one-line-per-rule (`@page{size:8.5in 11in;margin:1in}`). The `formatAnalysis` helper is duplicated verbatim in both functions (lines 1693-1740 and 2505-2524).

Drift already present in code:
- Sub-row colour `#E6D5C3` (blob) vs `#F5F0E8` (download) for `.total-row`.
- Margin `15px` vs no rule on `.retainer-box`.
- "By trade" table in blob has 4-col CSI breakdown; download version is 3-col.

**Why it matters:** The next brand-voice tweak (recent commit "Rewrite client-facing voice") is a perfect example — it modifies the intro letter and section headings. If Matt edits one and forgets the other, the OneDrive-synced doc and the manually-downloaded doc say different things to the same client. The contract version already does this right: `generateSignedContractPdf` delegates to `generateSignedContractBlob`. The proposal should follow that pattern.

**Fix:** Delete the standalone HTML in `generateProposalDocument`. Replace its body with:
```js
async function generateProposalDocument(){
  const blob = await generateProposalBlob();
  if(!blob){ alert("Generate estimate first"); return; }
  const filename = (appData.clientName||"CMB").replace(/\s+/g,"_") + "_" + new Date().toLocaleDateString().replace(/\//g,"-") + "_Proposal.doc";
  downloadBlob(blob, filename);
}
```
Promote the better of the two CSS treatments to be the single source. While you're in there, move `formatAnalysis` to module scope.

---

### 4. `runGenerateEstimate` is a 300-line orchestrator doing seven jobs — MEDIUM impact, MEDIUM effort
**Where:** `app.js:2845-3151`

**What:** This one function:
1. Defines `workerCall` as a closure (because it needs to update `btn`).
2. Defines `safeJSON` as a closure.
3. Builds the unit-cost reference string from `UNIT_COST_DB`.
4. Constructs a multi-paragraph system prompt with conditional Davis-Bacon / commercial branches.
5. Runs Call 1 (vision analysis of photos + PDFs + concepts) — its own inline fallback loop.
6. Runs Call 2 (compliance review) via `workerCall`.
7. Runs Call 3 (quantity takeoff) via `workerCall`, then validates + computes + sanity-checks.
8. Runs Call 4 (SOW + schedule) via `workerCall` with a tweaked system prompt.
9. Assembles the final `appData.estimate` object.
10. Computes retainer, releases wake lock, re-renders.

**Why it matters:** When you want to (a) re-run just the SOW step with new voice rules, (b) cache the compliance result across regenerations, (c) add a 5th call for material lead times, (d) parallelise calls 2 and 3 — you have to thread changes through the entire function. The system prompt for the takeoff (lines 2919-2946) and the SOW prompt (lines 3090-3125) are both essentially configuration that wants to live in a `prompts.js`.

**Fix (incremental, not rewrite):**
- Lift `workerCall` to module scope (#2 above does this).
- Extract each call into its own async function: `analyzeVision(z, photos, pdfText, concepts)`, `analyzeCompliance(ctx)`, `buildTakeoff(ctx)`, `writeSOWAndSchedule(ctx, computed)`. Each returns its result.
- `runGenerateEstimate` becomes ~40 lines of orchestration: build ctx, call the four, assemble, save.

---

### 5. Render dispatcher swallows DOM state on every event — MEDIUM impact, MEDIUM-HIGH effort
**Where:** `app.js:3950-3967` and the 18 callers of `render()`.

**What:** Every photo upload, every concept approval, every Q&A answer, every `goTo` step transition swaps the entire app DOM via `app.innerHTML = html`. This kills:
- **Input focus** — the user is mid-typing in `notes`, uploads a photo, focus is lost.
- **Textarea selection** / cursor position.
- **Scroll position within sub-scrollable containers** (the outer `window.scrollY` is restored but only via a `setTimeout(0)` race — on mobile WebKit this sometimes lands before paint and noticeably jumps).
- **Open file pickers** (handled OK by the `e.target.value=""` reset, but only by luck).
- **Sig-pad listeners** (see #1).

**Why it matters:** The wake-lock acquire/release calls suggest Matt is aware mobile flow is fragile. Every full re-render compounds that. The Q&A textarea answer pattern (`oninput="(appData.clarifyingAnswers=appData.clarifyingAnswers||{})['${qid}']=this.value"`) is safe *only because* nothing in the answer flow triggers `render()` — but if you ever add a "saving…" indicator that re-renders, all in-progress answers wipe.

**Fix (cheapest):** Stop calling `render()` from leaf mutations. `removePhoto`, `removeDoc`, `appData.conceptImages.splice(...)` etc. — replace with targeted DOM updates of just the affected `<div>`. The render-everything pattern was fine at step 0 of the project; at 4000 lines it's the source of recurring small bugs.

**Fix (more invasive):** Adopt a tiny diff library or move to `lit-html`/`preact` — but that breaks the "no build step" rule, so probably not worth it.

---

### 6. `autoSave` only fires on `goTo`, not on input changes — MEDIUM impact, LOW effort
**Where:** `goTo` at `app.js:255` is the only caller in the data-entry happy path (other callers are `loadVisit`, `startNewVisit`, render-from-load).

**What:** All `oninput` handlers mutate `appData` directly (e.g. `oninput="appData.clientName=this.value"`) without ever persisting. If the browser/tab crashes mid-Site-Walk-Notes textarea — 30 minutes of voice-dictated notes are gone. Field visits are the headline use case; tablet crashes / app-switching is a real failure mode.

**Why it matters:** "I lost my notes" is the kind of bug that destroys user trust forever. The autosave snapshot logic (lines 2299-2313) is good — it strips photos correctly. The trigger is what's missing.

**Fix:** Single debounced `scheduleAutoSave()` helper called from `goTo` *and* from a delegated `input` listener on `#app`. ~10 lines.

```js
let _saveT;
function scheduleAutoSave(){ clearTimeout(_saveT); _saveT = setTimeout(autoSave, 1500); }
document.getElementById("app").addEventListener("input", scheduleAutoSave);
document.getElementById("app").addEventListener("change", scheduleAutoSave);
```

---

### 7. State shape baked into 6+ places — MEDIUM impact, LOW effort
**Where:** Initial `appData` literal at `app.js:195-207`, duplicate literal in `startNewVisit` at `app.js:2354-2365`, partial defaults in `renderScope` (`if(!appData.zones || appData.zones.length === 0)`), more partials sprinkled through render functions (`appData.clarifyingAnswers||{}`, `appData.conceptImages||[]`).

**What:** The schema lives nowhere; it's reconstructed from defaults at every read site. Adding a new field (e.g. `permitFees`) requires hunting every `||` and every place the default object is constructed.

**Why it matters:** A pure-data issue: the next time `appData` gains a field (almost certain — the app is growing), you'll forget at least one site. The Davis-Bacon + marginPercent additions are visible across both the initial literal and `startNewVisit`; verify the next field reaches both.

**Fix:** Single `function defaultAppData(){ return {...}; }` and `function ensureAppDataShape(d){ /* fill missing keys */; return d; }`. `let appData = defaultAppData();` and `startNewVisit` calls `defaultAppData()`. `loadVisit` calls `ensureAppDataShape(JSON.parse(...))`. ~30 lines, eliminates a class of bug.

---

### 8. Rendering functions doing math + math functions touching the DOM — MEDIUM impact, LOW effort
**Where:**
- `renderEstimate` line 3493-3494: the `oninput` on the Low/High inputs runs `appData.estimate.subtotalLow=appData.estimate.zones.reduce(...)` and *also* updates `document.getElementById('tot-low').textContent=fmt$(...)`. Business logic + DOM mutation inlined into an HTML attribute string.
- `renderSign` lines 3786-3803: two IIFEs inside the template literal that recompute `m = 1 + (marginPercent/20)/100` and walk `est.sections` to produce the budget summary. This is the third place margin is applied to section totals (compute step, Excel step, contract page step).
- `ensureLineItemsForExport` (`app.js:1309-1420`) is allegedly an export helper but **mutates `est.sections[i].lineItems` in place** with AI-generated rows AND re-scales them. Side-effects from a function named "ensure" are surprising.

**Why it matters:** Three margin-application sites is exactly the recipe for "the Excel total is $3K off the contract page total" tickets. Recent commit "Fix Excel exports: validate CSI codes and reconcile totals with proposal" already fought this fire once.

**Fix:** A `applyMargin(est, marginPercent)` pure function that returns a new `est` with margin baked in. Call it once and use the result everywhere. Stop inlining math into onclick/oninput attributes.

---

### 9. Error handling is inconsistent and several places swallow silently — MEDIUM impact, LOW effort
**Where, swallowed silently:**
- `autoSave` line 2312: `catch(e){ console.warn("Auto-save failed:", e); }` — user has no idea.
- `regenerateConcept` line 3410-3411: `alert("Regenerate failed: ...")` but if `btns` was never set, buttons remain disabled forever.
- `syncVisitToOneDrive` lines 2647, 2664, 2630: per-photo / per-contract upload failures `console.warn` only — the success toast still fires with a misleading file count.
- `getOdToken` line 2453: silent `return null` on popup failure. Caller must detect null. Most do, but the error message is generic.
- `releaseWakeLock`: catches and discards. OK here but the pattern is everywhere.

**Where, well-handled:**
- `runAnalyzeScope` and `runGenerateEstimate` — explicit `err.classList.remove("hidden")`, button text restoration. Good.
- `exportExcel` — try/finally pattern reliably restores button. Good.

**Why it matters:** The OneDrive sync is the most user-facing pipeline. A silent partial upload (photo 3 of 5 fails, success page claims "5 photos uploaded") is worse than a loud failure.

**Fix:** Per-step accumulator: `const errors = []; ... errors.push({file: "concept_2.png", error: e.message}); ...` and surface them in `showSyncSuccessPage`. One small change, big trust win.

---

### 10. `index.html` is 169KB of base64 logo — LOW impact, ZERO effort
**Where:** `index.html` line 41 (omitted from grep output because of length).

**What:** The header `<img>` is a base64-encoded logo embedded in HTML. The CSS variable `--copper` is defined and the file claims `cmb-logo.jpg` exists alongside — and `renderPrintDoc` references `./cmb-logo.jpg` (line 3827) and the `DOMContentLoaded` handler (line 3974) **replaces the base64 with `./cmb-logo.jpg`** anyway. So the 169KB is downloaded, then immediately swapped out. Every page load pays the cost.

**Why it matters:** First Paint on tablet over a job-site LTE connection is hurt by ~170KB of inline image data the page doesn't use. The cache-bust query strings on the css/js are pointless if the HTML itself is huge.

**Fix:** Replace the inline base64 src with `src="./cmb-logo.jpg"`. Delete the `DOMContentLoaded` replacement code (lines 3974-4010) since it'd no longer be needed. ~170KB faster page load.

---

## Honourable mentions (not in top 10 but worth noting)

- **`if(false){ ... }` dead block** at `app.js:4012-4018` — original API-key onboarding wrapped in `if(false)`. Either delete or restore intentionally.
- **`btn = event.target`** in `exportExcel` line 1516: relies on the implicit global `event` (works in old IE / Chrome, but is brittle and lint-flags). Should be `onclick="exportExcel(this)"`.
- **`SELF_PERFORM_TRADES` membership check** uses two-way `includes` (`lower.includes(t) || t.includes(lower)`). If section name is `"Trim"` and trade list contains `"Interior Finishes"` you get unintended matches. Same pattern in `getCSIDiv`. Fix with explicit token matching.
- **`VALID_CSI_CODES` at 796 entries inside `app.js`** — could be a separate JSON file or split into a generated module. Not urgent; doesn't change much.
- **No `'use strict'`** and a couple of accidental globals (`recognition`, `activeVoiceField` at lines 2111-2112; `_newConceptPhotoIndex` at 3353). All work; would surface with strict mode.
- **The four `if(...)` chains in `render()`** (line 3954-3959) are a hand-rolled switch. A `RENDERERS = [renderClient, renderScope, ...]` array makes the dispatcher one line and the seam for a future router obvious.

---

## Strengths — preserve these

1. **Math/AI separation is genuinely good.** `computeEstimateFromTakeoff`, `computeGC`, `validateTakeoff`, `sanityCheckPerSF` are pure functions, testable, and they do their job. The AI returns quantities and unit costs; the app does the math. This is the right architecture for the accuracy goals.

2. **CSI code normalisation** (`normalizeCostCode`, `VALID_CSI_CODES`, `getExampleCodesForSection`) is well-thought-through. Stripping leading zeros, truncating 4-digit hallucinations, forcing suffix to match cost type — this is real defensive coding against a known-imperfect AI counterpart.

3. **PDF text extraction as text (not vision)** — solving the 5MB image-limit problem by extracting via PDF.js and stuffing text into the prompt is the right call. Documented in CLAUDE.md as a deliberate decision.

4. **Voice anchor embedded inline in the SOW prompt** (lines 3103-3117) — keeps brand voice + generation co-located. When you tune it you see the surrounding context.

5. **Wake Lock acquire/release** — small thing but exactly the right mobile-aware touch for a 4-call AI pipeline.

6. **OneDrive sync uploads everything** — JSON, proposal, Excel, contract, photos, concepts. Aside from the silent-failure issue in #9, this is the right scope.

7. **Cache-busting via `?v=YYYYMMDDa`** in `index.html` — pragmatic answer to mobile-browser aggressive caching.

8. **The model fallback chain itself** — Opus → Sonnet → Haiku — is the right policy. The issue is only that it's duplicated four times (#2), not that the policy is wrong.

---

## Module-decomposition proposal

Even if you keep one ship-able `app.js`, knowing where the seams *would* go helps every future change. The natural splits at the current ~4000 line size:

```
app.js                  (~250 lines — entry point, render dispatch, init)
├── state.js            (~80   lines — appData defaults, ensureShape, currentStep, autoSave/fullSave/loadVisit)
├── constants.js        (~900  lines — STEPS, ZONE_TYPES, FINISH_LEVELS, REQUIRED_TRADES_BY_TYPE,
│                                       CMB_LABOR_RATES, UNIT_COST_DB, CSI_DIV_MAP, VALID_CSI_CODES,
│                                       SELF_PERFORM_TRADES — all pure data)
├── estimate-math.js    (~150  lines — computeEstimateFromTakeoff, computeGC, validateTakeoff,
│                                       sanityCheckPerSF, applyMargin, getCSIDiv, isSelfPerform,
│                                       normalizeCostCode, getExampleCodesForSection)
├── ai-client.js        (~120  lines — single aiCall({messages, system, maxTokens, onStatus}),
│                                       callOpenAIImageEdit, safeJSON helper, model constants)
├── ai-pipelines.js     (~500  lines — analyzeScope, generateEstimate broken into
│                                       analyzeVision/analyzeCompliance/buildTakeoff/writeSOW,
│                                       ensureLineItemsForExport — the SYSTEM/SOW prompts live here)
├── render-screens.js   (~900  lines — renderClient, renderScope, renderConcept, renderEstimate,
│                                       renderSign, renderReview — pure HTML generation)
├── render-bits.js      (~250  lines — photoSection, docSection, sigBlock, sigPads, lightbox,
│                                       handlePhotos, handleDocuments, voice recognition)
├── pdf-utils.js        (~60   lines — extractPdfText, getAllPdfText, compressImage)
├── export-excel.js     (~200  lines — buildBTWorkbook, exportExcel, ensureLineItemsForExport caller,
│                                       lineItemsLookStale)
├── export-doc.js       (~400  lines — generateProposalBlob + thin generateProposalDocument
│                                       wrapper, generateSignedContractBlob + thin Pdf wrapper,
│                                       formatAnalysis helper, emailProposal)
└── onedrive.js         (~250  lines — MSAL bootstrap, odSignIn/Out, getOdToken, odUploadFile,
                                       syncVisitToOneDrive, showSyncSuccessPage, showOdToast)
```

**The natural seams (cleanest cuts first):**

1. **constants.js** — pure data, zero behaviour, zero coupling. Could be split today with a `<script src="constants.js">` tag before `app.js`. ~900 lines out of `app.js` immediately.
2. **estimate-math.js** — pure functions, no DOM, no state. Drop in next.
3. **ai-client.js** — once `workerCall` is lifted (issue #2), this becomes ~120 lines of cohesive code with one external dep (`fetch`).
4. **export-doc.js + export-excel.js** — these are the natural "output" boundary. Already mostly self-contained; main coupling is `appData` and `est`, which they could accept as args.
5. **onedrive.js** — already isolated by comment banner; only `appData`, `currentStep`, and the export functions cross the boundary.

**The hard cuts** (don't do these until you really need to):

- Splitting `render-screens.js` from `render-bits.js` because they share so many helpers (`esc`, `fmt$`, `photoSection`, the `appData` global). Wait until you actually have a second app that wants to share.
- Splitting `ai-pipelines.js` from the prompts. The current pattern of inline prompts beside the code that calls them is *easier* to maintain than separated. Keep them co-located until you find yourself wanting to share prompts.

**If you can only do one thing:** lift the constants. Removing 900 lines of data tables from `app.js` makes the remaining ~3100 lines vastly more navigable.

---

## What I'd ship in the next session

If the goal is "harden without rewriting," the highest-leverage ~half-day of work, in order:

1. **Fix `initSigPad`** (#1) — 5 min, prevents a real production bug.
2. **Centralise `aiCall`** (#2) — 30-60 min, eliminates four-way drift.
3. **Make `generateProposalDocument` call `generateProposalBlob`** (#3) — 15 min, prevents brand-voice drift.
4. **Debounced autosave on input** (#6) — 15 min, prevents lost notes.
5. **OneDrive sync error accumulator** (#9 partial) — 30 min, prevents silent partial-failure.
6. **Replace inline base64 logo with `src="./cmb-logo.jpg"` and delete the DOMContentLoaded swap** (#10) — 5 min, ~170KB page-load win.

After that the app is structurally sound enough to keep growing without further refactor. The bigger decomposition (constants extract, math extract) is a nice-to-have when the file approaches 5000 lines.
