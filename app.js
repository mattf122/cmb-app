// ── State ──────────────────────────────────────────────────────────
const STEPS = ["Client","Scope","Estimate","Review & Sign"];
const ZONE_TYPES = [
  "Residential Remodel",
  "Commercial Remodel / Tenant Improvement",
  "New Residential Construction",
  "New Commercial Construction",
  "Addition",
  "ADU / Guest House",
  "Site Work / Land Development",
  "Mixed Use",
  "Other"
];
// CMB Labor Rates 2026
const CMB_LABOR_RATES = {
  carpenter:  85,   // $/hr — field labor (framing, finish, flooring, tile, etc.)
  foreman:   100,   // $/hr — project foreman / site supervision
  pm:        130    // $/hr — project manager
};

const FINISH_LEVELS = [
  { value: "Essential", label: "Essential", desc: "Clean, functional, quality materials" },
  { value: "Designer", label: "Designer", desc: "Elevated finishes, custom details" },
  { value: "Luxury", label: "Luxury", desc: "Top of market, bespoke everything" }
];

let currentStep = 0;
// API key managed server-side via Cloudflare Worker
let appData = {
  company: "Copper Mountain Builders",
  repName: "", clientName: "", clientEmail: "", clientPhone: "",
  clientAddress: "", clientCity: "", clientZip: "",
  projectAddress: "", projectCity: "",
  projectNotes: "", zones: [{id:'z_default', type:'', sqft:'', notes:'', photosBefore:[], photosInspo:[]}], estimate: null,
  retainerAmount: "", clientSig: null, repSig: null,
  clientPrintName: "", repPrintName: ""
,
  clarifyingQuestions: [], clarifyingAnswers: {}
};

// ── OneDrive Config ─────────────────────────────────────────────────────
// After Azure App Registration, paste your Application (client) ID below:
const OD_CLIENT_ID   = "3b9cde5e-f884-4491-9414-01005e038ba0"; // ← Replace this after Azure setup!
const OD_REDIRECT    = "https://cmbsitevisit.netlify.app";
const OD_SCOPES      = ["User.Read", "Files.ReadWrite"];
const OD_ROOT_FOLDER = "CMB Site Visits";          // path within the SharePoint library
const OD_LIBRARY_NAME = "Company Files - Documents"; // SharePoint library to target

let msalApp = null, odAccount = null, odTargetDriveId = null;

// Dynamically load the Microsoft Auth Library (MSAL)
(function loadMsal(){
  const s = document.createElement("script");
  s.src = "https://alcdn.msauth.net/browser/2.35.0/js/msal-browser.min.js";
  s.onload = () => {
    msalApp = new msal.PublicClientApplication({
      auth: {
        clientId: OD_CLIENT_ID,
        authority: "https://login.microsoftonline.com/common",
        redirectUri: OD_REDIRECT
      },
      cache: { cacheLocation: "localStorage", storeAuthStateInCookie: false }
    });
    // Restore previous session if user was already signed in
    const accts = msalApp.getAllAccounts();
    if(accts.length > 0){ odAccount = accts[0]; updateOdBtn(); }
  };
  s.onerror = () => console.warn("MSAL load failed — OneDrive sync unavailable");
  document.head.appendChild(s);
})();

// ── Settings ────────────────────────────────────────────────────────


function showSettings(){

  const m = document.getElementById("settings-modal");
  m.style.display = "flex";
}
function hideSettings(){
  document.getElementById("settings-modal").style.display = "none";
}
function saveSettings(){
  const val = document.getElementById("api-key-input").value.trim();
  if(!val){ alert("Please enter your API key"); return; }
  // API key managed server-side
  hideSettings();
  render();
  alert("✓ API key saved!");
}

// ── Navigation ──────────────────────────────────────────────────────
function goTo(step){ currentStep = step; render(); autoSave(); }
function updateHeader(){
  document.getElementById("step-badge").textContent = STEPS[currentStep];
  const pct = (currentStep / (STEPS.length-1)) * 100;
  document.getElementById("progress-fill").style.width = pct + "%";
  document.getElementById("step-dots").innerHTML = STEPS.map((s,i) => {
    const w = i === currentStep ? 24 : 8;
    const bg = i <= currentStep ? "var(--copper)" : "var(--stone-light)";
    return `<div class="dot" style="width:${w}px;background:${bg}"></div>`;
  }).join("");
}

// ── Helpers ─────────────────────────────────────────────────────────
function fmt$(n){ return "$" + Number(n||0).toLocaleString(); }
function esc(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function today(){ return new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}); }
function fileToDataURL(file){ return new Promise(res=>{ const r=new FileReader(); r.onload=e=>res(e.target.result); r.readAsDataURL(file); }); }

function calcRetainerSuggestion(total){
  if(!total) return 8000;
  if(total < 50000) return 8000;
  if(total < 100000) return 10000;
  if(total < 150000) return 12000;
  if(total < 200000) return 15000;
  if(total < 300000) return 20000;
  if(total < 500000) return 25000;
  return 35000;
}

// ── AI ──────────────────────────────────────────────────────────────
async function callClaude(prompt, system){
  const res = await fetch("https://billowing-snowflake-38f0.coppermountainbuilders406.workers.dev", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8000,
      system,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if(!res.ok) throw new Error("Server error: " + res.status);
  const data = await res.json();
  if(data.error) throw new Error(data.error.message);
  if(!data.content || !data.content[0]) throw new Error("Empty response");
  return data.content[0].text || "";
}

async function runAnalyzeScope(){
  const btn = document.getElementById("analyze-btn");
  const err = document.getElementById("analyze-error");
  const status = document.getElementById("analyze-status");
  btn.disabled = true;
  btn.textContent = "⏳ Analyzing…";
  err.classList.add("hidden");

  try {
    const zones = appData.zones;
    const z = zones[0];
    const projectSummary = `Project Type: ${z.type||"Not specified"} | ${z.sqft||"unknown"} SF | Notes: ${z.notes||"no notes"}`;

    // Build vision content with all available photos
    const visionContent = [];

    for(const photo of (z.photosBefore||[]).slice(0,4)){
      const c = await compressImage(photo, 600, 0.6);
      visionContent.push({type:"text", text:`[Current site condition photo]:`});
      visionContent.push({type:"image", source:{type:"base64", media_type:"image/jpeg", data:c.split(",")[1]}});
    }
    for(const photo of (z.photosInspo||[]).slice(0,2)){
      const c = await compressImage(photo, 600, 0.6);
      visionContent.push({type:"text", text:`[Client inspiration photo]:`});
      visionContent.push({type:"image", source:{type:"base64", media_type:"image/jpeg", data:c.split(",")[1]}});
    }
    const allDocs = getAllDocs();
    for(const doc of allDocs.filter(d=>d.type.includes("image")).slice(0,2)){
      const c = await compressImage(doc.dataUrl, 600, 0.6);
      visionContent.push({type:"text", text:`[Uploaded document: ${doc.name}]:`});
      visionContent.push({type:"image", source:{type:"base64", media_type:"image/jpeg", data:c.split(",")[1]}});
    }

    const analysisPrompt = `You are a senior estimator at Copper Mountain Builders with deep experience in Montana construction. You're reviewing a site visit to identify what critical information is MISSING before you can build an accurate estimate.

PROJECT OVERVIEW:
${projectSummary}

OVERALL PROJECT NOTES: ${appData.projectNotes||"none provided"}
SITE ADDRESS: ${appData.projectAddress||"unknown"}, ${appData.projectCity||"Montana"}
${visionContent.length > 0 ? "PHOTOS: Attached above — analyze them carefully." : "No photos provided."}

Review everything above. Based on what you can see and read, ask up to 10 targeted follow-up questions to fill in the gaps that are preventing an accurate estimate. Focus on:

- Specific quantities mentioned but not detailed (e.g. "23 windows" — what sizes? what style? egress or not?)
- Finish/product selections not yet made (flooring type, cabinet line, tile, countertop, fixture grade)
- Structural unknowns that change cost significantly (foundation type, load-bearing walls, roof pitch)
- Site and mechanical conditions (utilities, access, existing systems to remain or replace)
- Timeline and occupancy constraints
- Any Montana-specific concerns visible in photos (snow load, frost, WUI zone, septic/well)

IMPORTANT: Only ask what you genuinely cannot determine from the notes and photos. Prioritize questions where the answer changes the estimate by $10,000 or more. Do not ask about things already clearly stated in the notes.

Return ONLY this JSON:
{"questions":[{"id":"q1","question":"Your question here?","type":"text","options":[]},{"id":"q2","question":"Yes/no question?","type":"yesno","options":[]},{"id":"q3","question":"Multiple choice?","type":"choice","options":["Option A","Option B","Option C"]}]}

Use type "text" for open answers, "yesno" for yes/no, "choice" for multiple choice with options array.`;

    visionContent.push({type:"text", text:analysisPrompt});

    if(status) status.textContent = "Analyzing photos and scope…";

    const res = await fetch("https://billowing-snowflake-38f0.coppermountainbuilders406.workers.dev", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        model:"claude-sonnet-4-20250514",
        max_tokens:1500,
        messages:[{role:"user", content: visionContent.length > 1 ? visionContent : [{type:"text", text:analysisPrompt}]}]
      })
    });

    const data = await res.json();
    if(data.error) throw new Error(data.error.message);
    if(!data.content?.[0]?.text) throw new Error("No response from analysis");

    const raw = data.content[0].text.replace(/```json/g,"").replace(/```/g,"").trim();
    const start = raw.indexOf("{"); const end = raw.lastIndexOf("}");
    if(start===-1) throw new Error("Could not parse questions");
    const result = JSON.parse(raw.slice(start,end+1));

    appData.clarifyingQuestions = result.questions||[];
    appData.clarifyingAnswers = {};

    if(status) status.textContent = "";
    btn.textContent = "↻ Re-analyze";
    btn.disabled = false;
    render();

  } catch(e){
    err.textContent = "Error: " + e.message;
    err.classList.remove("hidden");
    btn.disabled = false;
    btn.textContent = "⚡ Analyze & Ask";
    if(status) status.textContent = "";
  }
}

async function runGenerateEstimate(){
  const btn = document.getElementById("gen-est-btn");
  const err = document.getElementById("est-error");
  btn.disabled = true;
  err.classList.add("hidden");

  const zones = appData.zones;
  const z = zones[0];
  const projectSummary = `${z.type||"Project"} | ${z.sqft||"unknown"} SF | Notes: ${z.notes||"standard scope"}`;

  // Helper: call Claude via Cloudflare Worker
  async function workerCall(messages, system, maxTokens=1000, model="claude-sonnet-4-20250514"){
    const res = await fetch("https://billowing-snowflake-38f0.coppermountainbuilders406.workers.dev", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        model: model,
        max_tokens: maxTokens,
        temperature: 0.3,
        system: system,
        messages: messages
      })
    });
    const data = await res.json();
    if(data.error) throw new Error("Claude error: " + JSON.stringify(data.error));
    if(!res.ok) throw new Error("HTTP " + res.status);
    if(!data.content || !data.content[0] || !data.content[0].text) throw new Error("No content. Full response: " + JSON.stringify(data).slice(0,200));
    return data.content[0].text.replace(/```json/g,"").replace(/```/g,"").trim();
  }

  // Helper: parse JSON safely
  function safeJSON(text, label){
    const s = text.indexOf("{"); const e = text.lastIndexOf("}");
    if(s===-1||e===-1) {
      console.error(`${label} - No JSON found. Full response:`, text);
      throw new Error(`No JSON in ${label}. Response length: ${text.length} chars. Start: ${text.slice(0,200)}`);
    }
    try { 
      return JSON.parse(text.slice(s,e+1)); 
    }
    catch(err){
      // Try removing trailing commas
      let t = text.slice(s,e+1).replace(/,\s*([}\]])/g,"$1");
      try { 
        return JSON.parse(t); 
      }
      catch(e2){ 
        // Show both start AND end to diagnose truncation
        const extracted = text.slice(s,e+1);
        console.error(`${label} - Parse failed. Extracted JSON:`, extracted);
        throw new Error(`${label} parse fail. Length: ${extracted.length} chars. Start: "${extracted.slice(0,150)}" ... End: "${extracted.slice(-150)}"`);
      }
    }
  }

  const SYSTEM = `You are the Chief Estimator at Copper Mountain Builders with 45 years of experience building residential and commercial projects in Northwest Montana. You've personally built over 400 homes in Flathead Valley and know every code, every subcontractor, every material supplier, and every weather pattern that impacts construction here.

CORE EXPERTISE:
- Montana Building Code (IRC 2021, IBC 2021) + Flathead County amendments
- Design-Build methodology (you live and breathe the 5-Step process)
- Construction sequencing and critical path scheduling
- Material procurement and lead time management (you know what takes 12 weeks vs 2 weeks)
- Trade coordination (you know plumber goes before drywaller, not after)
- Weather window planning (Montana has a 180-day construction season, and you plan around it)
- Risk identification (you spot problems in photos that clients don't see)
- Value engineering (you know where to save money and where NOT to)

MONTANA CONSTRUCTION REALITIES YOU KNOW BY HEART:
- 48-inch frost depth (footings go DEEP, excavation costs real money)
- 70 psf ground snow load (roof framing is engineered, not stick-built guesswork)
- Construction season: Mid-May to mid-October (foundation work), year-round for interiors once dried-in
- Concrete restrictions: No pours below 50°F without heated enclosures ($$$)
- Standing seam metal is standard (shingles ice dam in our snow = callback nightmares)
- Window lead times: 8-12 weeks (order during design or wait till next year)
- Standing seam lead time: 10-14 weeks (same deal)
- Subcontractor reality: Good framers book 8-12 weeks out, good finish carpenters 6+ weeks
- Permit timeline: Flathead County = 4-6 weeks plan review (not 2 weeks)
- Wildfire interface zones: WUI requirements add 10-15% to exterior costs
- Material costs: We're 15-25% higher than Boise/Missoula (remote location, tough winters)

HARD PER-SF LIMITS — your final totals MUST fall within these ranges (all-in, including GC + 20% O&P):
New construction heated living space: $200-320/SF
New construction attached garage: $65-110/SF  
New construction ADU: $220-360/SF
Remodel: $120-280/SF (add 15% if pre-1980 for hidden issues)
Deck: $80-180/SF

EXAMPLE SANITY CHECK: 1,200 SF living + 600 SF garage Designer new construction = $450,000-$750,000 total all-in.
If your numbers exceed these ranges, you've made an error. Scale back proportionally.

2026 FLATHEAD VALLEY UNIT COSTS (what things ACTUALLY cost here):
Foundation: slab $9-12/SF, stem wall $38-48/SF, excavation $8-11/SF (rocky soil = higher end)
Framing: 2x6 walls $5.50-7.50/SF, TJI floor $20-26/SF, roof rafters $18-23/SF (snow load = serious engineering)
Roofing: standing seam $24-30/SF (standard), architectural shingle $8-11/SF (only for low-pitch)
Exterior: LP SmartSide $12-16/SF, windows $900-1,800 EA, exterior doors $1,400-2,600 EA
Insulation: spray foam $3-4/SF (open cell R-21 walls, R-49 ceiling), blown cellulose $1.80-2.80/SF
Plumbing: full bath new $14,000-26,000, master bath remodel $16,000-34,000, standard bath $9,000-18,000
Electrical: new construction $14,000-28,000 (depends on SF), service upgrade 100A→200A $3,500-6,500
HVAC: forced air $11,000-21,000 (depends on SF + zones), mini-split $3,500-6,500/head
Flooring: tile $12-22/SF installed, hardwood $9-18/SF, LVP $6-11/SF
Cabinetry: kitchen Designer $24,000-46,000 (12-16 LF), bath vanity $2,500-8,500
Countertops: quartz $65-95/SF, granite $55-85/SF, laminate $35-55/SF
Deck: Trex composite $16-22/SF, aluminum rail $70-100/LF
Drywall: $2.80-3.60/SF hung/taped/textured

GENERAL CONDITIONS (1 month per $50k project cost, minimum 3 months):
- Permits: Building $5,500-10,000 (depends on valuation), Mechanical $450-750, Plumbing $450-750, Electrical $450-750
- Engineering: Structural $2,500-4,500, Septic design $1,800-3,200 (if needed)
- Superintendent: $8,000-12,000 per 6 months
- Temp facilities: $2,200-3,800 (toilet, power, dumpster access)
- Dumpsters: $500-650/pull × 5-8 pulls typical
- Builder's risk insurance: $3,500-6,500
- Contingency: 5% minimum (10% for remodels where we open walls)

CMB LABOR RATES (use these for all labor cost calculations):
- Carpenter / Field Labor: $85/hr
- Project Foreman: $100/hr  
- Project Manager: $130/hr

Typical productivity (carpenter hours):
- Rough framing: 0.06 hrs/SF | Roof framing: 0.08 hrs/SF
- Exterior siding: 0.07 hrs/SF | Roofing: 0.05 hrs/SF
- Insulation: 0.03 hrs/SF | Drywall hang+tape: 0.04 hrs/SF
- Tile: 0.65 hrs/SF | Hardwood/LVP flooring: 0.05 hrs/SF
- Painting: 0.035 hrs/SF | Trim/finish carpentry: 0.20 hrs/LF
- Window install: 3 hrs each | Door install: 2 hrs each
- Plumbing fixture: 4-6 hrs each | Cabinet install: 1.5 hrs/cabinet

PRICING PHILOSOPHY:
- LOW range = everything goes perfectly (it never does, but this is the "best case")
- HIGH range = reality (sub delays, material escalation, weather delays, hidden conditions)
- Always include contingency (it will get used)
- Always include winter protection if timeline crosses Nov-Apr ($8k-15k for heated enclosure)
- Always pad sub schedules (they say "3 weeks" = plan for 4-5 weeks in reality)

RESPOND ONLY WITH VALID JSON. No markdown. No explanation. Just the exact JSON structure requested.`;

  try {
    // ── CALL 1: Photo analysis ────────────────────────────────────────
    btn.textContent = "⏳ Step 1 of 6 — Analyzing photos…";
    let siteNotes = "";

    const allDocs = getAllDocs();
    const photosToAnalyze = [];
    for(const photo of (z.photosBefore||[]).slice(0,4)) photosToAnalyze.push({photo, label:"current site condition"});
    for(const photo of (z.photosInspo||[]).slice(0,2)) photosToAnalyze.push({photo, label:"client inspiration"});
    for(const doc of allDocs.filter(d=>d.type.includes("image")).slice(0,2)) photosToAnalyze.push({photo:doc.dataUrl, label:doc.name});

    if(photosToAnalyze.length > 0){
      const visionContent = [{type:"text", text:`You're the Chief Estimator at Copper Mountain Builders with 45 years of Montana construction experience. You're on-site in Flathead Valley doing a walkthrough. Analyze these photos with the eye of a seasoned builder who's seen everything.

PROJECT: ${projectSummary}
LOCATION: ${appData.projectAddress}, ${appData.projectCity}, Montana
OVERALL NOTES: ${appData.projectNotes||"none provided"}

FOR EACH PHOTO, identify as a Montana construction expert:

1. EXISTING CONDITIONS
   - Structure type, age (look for clues), materials visible
   - Systems visible (electrical panels, plumbing, HVAC)
   - Foundation type, framing visible, roof structure
   - Current condition (good/fair/poor for each major component)

2. CODE COMPLIANCE RED FLAGS
   - What will Flathead County inspector immediately flag?
   - Existing code violations that must be brought to compliance when permit is pulled
   - Systems that trigger full upgrade requirements (e.g., knob-and-tube = rewire)

3. HIDDEN COSTS YOU SEE COMING
   - Foundation issues (cracks, settling, moisture = $$$)
   - Structural issues (sagging, rot, undersized members)
   - Systems that look "functional" now but won't pass inspection
   - Access problems (narrow driveway = crane can't reach = hand-carry everything)

4. SCOPE IMPLICATIONS
   - What MUST be included that client probably doesn't expect?
   - Collateral damage areas (demo this = affects that)
   - Sequence issues (can't do X without first doing Y)

5. MONTANA-SPECIFIC OBSERVATIONS
   - Snow load issues (sagging roof = undersized, needs engineering)
   - Frost heave evidence (doors don't close, cracks = foundation movement)
   - Ice dam evidence (icicles, staining = ventilation problems)

6. MATERIAL OBSERVATIONS
   - Age of major components (roof, siding, windows)
   - Quality level (builder-grade vs custom)
   - What's salvageable vs must-replace

Be specific. Use measurements when visible. Reference code sections if applicable.

Provide a comprehensive analysis (600-1000 words). This drives the estimate quality.`}];
      for(const {photo, label} of photosToAnalyze.slice(0,8)){
        const compressed = await compressImage(photo, 800, 0.7);
        visionContent.push({type:"text", text:`[${label}]:`});
        visionContent.push({type:"image", source:{type:"base64", media_type:"image/jpeg", data:compressed.split(",")[1]}});
      }
      const visionRes = await fetch("https://billowing-snowflake-38f0.coppermountainbuilders406.workers.dev", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({model:"claude-sonnet-4-20250514", max_tokens:2000, messages:[{role:"user",content:visionContent}]})
      });
      if(visionRes.ok){
        const vd = await visionRes.json();
        if(vd.content?.[0]?.text) siteNotes = vd.content[0].text;
      }
    }

    // ── Build Q&A context ────────────────────────────────────────────
    const qaContext = (appData.clarifyingQuestions||[]).map(q => {
      const ans = (appData.clarifyingAnswers||{})[q.id];
      return ans ? `Q: ${q.question}\nA: ${ans}` : null;
    }).filter(Boolean).join("\n");

    // ── CALL 2: Code Compliance Review ──────────────────────────────
    btn.textContent = "⏳ Step 2 of 6 — Reviewing code compliance…";
    let complianceResult = null;
    try {
      const complianceRaw = await workerCall([{role:"user", content:
        `You're the Chief Estimator at CMB with 45 years of Montana building experience. Review this project for building code compliance and permitting requirements.

PROJECT: ${appData.projectAddress}, ${appData.projectCity||"Flathead County"}, Montana
PROJECT TYPE: ${z.type||"Not specified"}
PROJECT NOTES: ${z.notes||"none"}
OVERALL NOTES: ${appData.projectNotes||"none"}
${siteNotes?"SITE OBSERVATIONS FROM PHOTOS:\n"+siteNotes:"No photos analyzed"}
${qaContext?"CLIENT Q&A:\n"+qaContext:""}

As a Montana code expert who's navigated hundreds of Flathead County permits:

1. PERMITS REQUIRED (be specific - which permits, which departments):
   - Building permit type (residential/commercial, new/remodel/addition)
   - Electrical permit (service upgrade, new circuits, etc.)
   - Plumbing permit (new fixtures, water service, etc.)
   - Mechanical permit (HVAC, bathroom exhaust, etc.)
   - Special permits: septic (DNRC), well (DNRC), WUI compliance, etc.

2. CODE COMPLIANCE ITEMS (IRC 2021 / IBC 2021 + Flathead County amendments):
   - Structural requirements (snow load 70 psf, seismic Zone D2)
   - Energy code (Montana 2021: R-21 walls, R-49 ceiling min)
   - Fire/life safety (egress windows for bedrooms, smoke/CO detectors)
   - Accessibility (if commercial or 3+ unit residential)
   - Specific code sections triggered by this work

3. FLATHEAD COUNTY SPECIFICS:
   - Plan review timeline (typically 4-6 weeks first submittal)
   - Required engineering (structural, energy, septic, etc.)
   - Inspection sequence and hold points
   - Special conditions: WUI zones, floodplain, shoreline, etc.

4. SCOPE TRIGGERS (things that force code upgrades of EXISTING systems):
   - Electrical: Adding load beyond 50% panel capacity = service upgrade
   - Plumbing: New bathroom = potential whole-house water pressure upgrade
   - HVAC: Adding square footage beyond 50% = full system resize
   - Accessibility: Commercial remodel >$150k = ADA compliance required
   - Energy: Addition >600 SF or >10% floor area = whole house energy compliance

5. COST IMPACT ITEMS (dollar estimates):
   - Permit fees (building, trade permits, engineering review)
   - Required engineering costs
   - Code-mandated upgrades (not in client's original scope)
   - Inspection fees

6. TIMELINE RISKS:
   - Permit approval delays
   - Engineering turnaround
   - Required testing (soil, radon, etc.)
   - Seasonal restrictions (septic install, well drilling)

Return detailed compliance analysis with specific code sections, permit names, cost estimates, and timeline impacts.
Format as a professional narrative report, 500-800 words. Write in plain paragraphs with clear section headings using ALL CAPS (e.g. PERMITS REQUIRED, CODE COMPLIANCE ITEMS). Do NOT return JSON or any structured data format. Write as a contractor would write a compliance memo.`
      }], `You are the Chief Estimator at Copper Mountain Builders with deep experience in Montana building code and Flathead County permitting. Write clear, professional narrative reports for clients and field teams. Use plain paragraphs and ALL CAPS section headings. Never return JSON. Write like an experienced contractor writing a compliance memo — specific, direct, and actionable.`, 1500);
      
      complianceResult = complianceRaw;
    } catch(e){ 
      console.warn("Code compliance analysis failed:", e.message);
      complianceResult = "Code compliance review unavailable. Recommend manual review before final estimate.";
    }

    // ── CALL 3: Zone totals ───────────────────────────────────────────
    btn.textContent = "⏳ Step 3 of 6 — Pricing project…";
    const zoneRaw = await workerCall([{role:"user", content:
      `Price this Montana project with your 45 years of Flathead Valley building experience.

PROJECT: ${projectSummary}

CONTEXT YOU HAVE:
${siteNotes?"Site Analysis:\n"+siteNotes+"\n":""}
${complianceResult?"Code Compliance Notes:\n"+complianceResult+"\n":""}
${appData.projectNotes?"Overall Notes: "+appData.projectNotes+"\n":""}
${z.notes?"Project Notes: "+z.notes+"\n":""}
${qaContext?"Pre-Construction Q&A:\n"+qaContext+"\n":""}

Think through:
- Scope of work (what's actually involved based on type and notes)
- Existing conditions (demo, prep work needed based on photos)
- Code compliance costs (permits, upgrades triggered)
- Material costs (2026 Flathead Valley pricing)
- Labor costs (Montana wages + sub availability premium)
- Hidden costs you see coming (based on photos/notes)
- Complexity factors (access, existing conditions, weather timing)

LOW range = best case (everything goes perfectly)
HIGH range = reality (sub delays, hidden conditions, material escalation)

Include 20% O&P in all totals. Be realistic - Montana costs 15-25% more than Boise/Missoula.

Return ONLY: {"zones":[{"name":"${z.type||"Project"}","low":0,"high":0,"notes":"2-3 sentence scope note explaining what drives the cost"}]}`
    }], SYSTEM, 1200);
    const zoneResult = safeJSON(zoneRaw, "zones");

    // ── CALL 4: Trade sections ────────────────────────────────────────
    btn.textContent = "⏳ Step 4 of 6 — Breaking out trades…";
    const sectionRaw = await workerCall([{role:"user", content:
      `Break this Montana construction project into trade sections with your 45 years of experience coordinating subs in Flathead Valley.

PROJECT: ${projectSummary}
ZONE TOTALS: ${fmt$(zoneResult.zones.reduce((a,z)=>a+z.low,0))} LOW to ${fmt$(zoneResult.zones.reduce((a,z)=>a+z.high,0))} HIGH
${siteNotes?"Site observations: "+siteNotes.slice(0,400):""}

Create MAX 7 trade sections (fewer is better - don't over-slice).
Typical sections: Demolition, Sitework, Foundation, Framing, Exterior, Roofing, Plumbing, Electrical, HVAC, Insulation, Drywall, Flooring, Cabinetry, Finishes

Match trade totals to zone totals (they must reconcile).
Include 20% O&P in all section totals.

Assign the correct CSI division number to each section using these divisions:
00=Procurement, 01=General Requirements, 02=Existing Conditions/Demo, 03=Concrete, 04=Masonry, 05=Metals, 06=Wood/Plastics/Composites (Framing/Carpentry/Cabinets), 07=Thermal & Moisture Protection (Insulation/Roofing/Siding), 08=Openings (Doors/Windows), 09=Finishes (Drywall/Flooring/Tile/Painting), 22=Plumbing, 23=HVAC, 26=Electrical, 31=Earthwork/Sitework, 32=Exterior Improvements, 33=Utilities

Return ONLY: {"sections":[{"name":"trade name","csiCode":"XX 00 00","low":0,"high":0}]}`
    }], SYSTEM, 800, "claude-haiku-4-5-20251001");
    const sectionResult = safeJSON(sectionRaw, "sections");
    // Ensure every section has a CSI code (fill in any the AI missed)
    sectionResult.sections = (sectionResult.sections||[]).map(s => ({
      ...s,
      csiCode: s.csiCode || getCsiInfo(s.name).csi
    }));

    // ── CALL 5: GC + totals + sales summary ──────────────────────────
    btn.textContent = "⏳ Step 5 of 6 — Calculating GC costs + summary…";
    const subtotalLow  = zoneResult.zones.reduce((a,z)=>a+(z.low||0),  0);
    const subtotalHigh = zoneResult.zones.reduce((a,z)=>a+(z.high||0), 0);

    const gcRaw = await workerCall([{role:"user", content:
      `Calculate general conditions costs AND write the client-facing summary for this Montana design-build proposal.

PROJECT CONTEXT:
Base construction subtotal (already calculated): ${fmt$(subtotalLow)} LOW / ${fmt$(subtotalHigh)} HIGH
Project: ${projectSummary}
${siteNotes?"Site Analysis: "+siteNotes.slice(0,300):""}
${complianceResult?"Code/Permit Notes: "+complianceResult.slice(0,300):""}
${qaContext?"Project Q&A:\n"+qaContext:""}

PART 1 - GENERAL CONDITIONS:
Duration: 1 month per $50k of construction cost (minimum 3 months)
Include: permits, engineering, superintendent, temp facilities, dumpsters, builder's risk insurance, 5% contingency

Calculate realistic GC costs for Flathead Valley. Don't skimp - these are real costs.

PART 2 - SCOPE OF WORK NARRATIVE:
Write a professional Scope of Work narrative (400-600 words) for the proposal. This is a client-facing document that the homeowner will read before signing. It will also be read by our team, so accuracy matters more than polish.

Write it as a real contractor would write it — direct, specific, and grounded in what was actually observed and discussed. Use "we" and "our" for Copper Mountain Builders. Do not write like a marketing brochure. Do not use hollow adjectives (stunning, beautiful, exceptional, seamlessly, transformative, tailored, etc.). Do not reference years of experience or age in any form.

FORMAT — write these five sections with clear headers:

PROJECT DESCRIPTION
Describe the project in plain terms: what type of work, where, and what we observed on site. Reference specific conditions from the notes and photos. Be concrete — if notes mention 23 windows, say 23 windows. If the existing kitchen is from the 1990s, say so. One short paragraph.

SCOPE OF WORK INCLUDES
List what is covered in this estimate. Use contractor language. Be as specific as the notes and Q&A allow. If the client mentioned specific items, list them by name. If a quantity was given, include it. Format as a bulleted or numbered list. Examples: "Demolition of existing kitchen cabinetry and fixtures", "Replacement of 23 windows (sizes, styles, and egress requirements to be finalized in design phase)", "New 200A electrical service panel and full house rewire".

CLARIFICATIONS AND EXCLUSIONS
State what is NOT included and what assumptions were made. This protects both parties and sets honest expectations. Examples: "Finish selections (flooring, tile, cabinetry, fixtures) to be finalized during design phase — unit cost allowances used for budgeting", "Permit fees estimated based on project valuation and are subject to Flathead County review", "Any concealed conditions discovered during demolition (rot, asbestos, undersized structure) will be addressed via written change order". Keep this section factual, not defensive.

BUDGET AND SCHEDULE CONTEXT
In 2-3 sentences, explain what drives the cost range and what Montana-specific factors are at play. Be honest. Reference actual lead times or seasonal constraints if they apply to this project. Do not pad this section.

NEXT STEPS
Explain the retainer, what design Steps 1-4 will deliver, and why starting now matters if there are legitimate timing constraints (sub availability, material lead times, weather windows). Keep it to 3-4 sentences. Do not manufacture urgency.

TONE RULES — enforce strictly:
- Write in complete sentences. No bullet points in the description sections.
- Use specific numbers and facts. Avoid vague qualifiers ("significant", "major", "substantial").
- Do not say "in our experience", "our team of experts", or any variation of expertise claims.
- Do not say "we are excited", "we look forward", "we are committed to excellence", or similar.
- If something is unknown, say it is unknown and will be determined in the design phase.
- The document should read like it was written by a working contractor, not a marketing department.

PART 3 - COMPLIANCE NOTES (for internal/rep use only):
Flag any code issues, permit gotchas, or risks the rep should know.

CRITICAL: Return complete, valid JSON. Do not truncate.

Return ONLY this JSON:
{"gcLow":0,"gcHigh":0,"gcMonths":1,"summary":"client-facing 3-4 paragraph summary here","complianceNotes":["internal note 1","note 2"]}`
    }], SYSTEM, 2500);
    const gcResult = safeJSON(gcRaw, "gc-totals");

    // ── CALL 6: Construction Schedule ────────────────────────────────
    btn.textContent = "⏳ Step 6 of 6 — Building schedule…";
    let scheduleResult = null;
    try {
      const schedRaw = await workerCall([{role:"user", content:
        `Build a detailed construction schedule for this Montana design-build project. You have 45 years sequencing jobs in Flathead Valley - show your expertise.

PROJECT:
${projectSummary}
Total budget: ${fmt$(subtotalLow + (gcResult.gcLow||0))} – ${fmt$(subtotalHigh + (gcResult.gcHigh||0))}
Construction duration: ${gcResult.gcMonths||3} months
${qaContext?"Project Q&A:\n"+qaContext:""}
${siteNotes?"Site observations: "+siteNotes.slice(0,400):""}

Your schedule must account for:

DESIGN PHASE (Steps 1-4 of CMB 5-Step process):
- Step 1: Initial Consultation + Vision Planning (2 weeks, 2 client meetings)
- Step 2: Schematic Design (2 weeks, 2 client meetings)
  → Client homework period: 1 week to select cabinets/fixtures/finishes
- Step 3: Design Development (3 weeks)
  → Drawings to structural engineer (week 1)
  → Client final sign-off on plans (week 3)
- Step 4: Project Development (4-5 weeks)
  → Permit submittal to Flathead County (week 1)
  → County plan review (4-6 weeks - runs parallel)
  → Subcontractor bidding (weeks 1-3)
  → Material quoting (weeks 2-4)
  → Final construction contract (week 4-5)

TOTAL DESIGN PHASE: 10-14 weeks before construction starts

CONSTRUCTION PHASE - Critical Montana Realities:

SEASONAL CONSTRAINTS:
- Foundation work: Mid-May to October only (frost out + concrete temp >50°F)
- Roofing deadline: Dried-in by Sept 15 (snow starts Sept 15-30)
- Exterior work: Best May-October (can work Nov-Apr but add cost)
- Interior work: Year-round (once building is dried-in)

MATERIAL LEAD TIMES (order during design phase or delay construction):
- Windows: 8-12 weeks (must order by Step 4)
- Standing seam metal: 10-14 weeks (must order by Step 4)
- Cabinets: 6-10 weeks (order after client selects in Step 2)
- Special-order fixtures/finishes: 4-8 weeks
- Engineered lumber (TJIs, LVLs): 3-5 weeks

SUBCONTRACTOR AVAILABILITY:
- Good framers: Book 8-12 weeks in advance
- Good finish carpenters: Book 6-8 weeks in advance
- Electricians/Plumbers: Book 4-6 weeks in advance
- Drywall crews: Book 3-4 weeks in advance

SEQUENCING DEPENDENCIES:
1. Can't pour foundation until: Frost out + excavation done + footing inspection
2. Can't frame until: Foundation cured 7 days + foundation inspection
3. Can't rough MEP until: Framing complete + framing inspection
4. Can't insulate until: MEP roughed-in + rough inspections passed
5. Can't drywall until: Insulation inspected
6. Can't install finishes until: Drywall complete
7. MUST dry-in before winter (or add $8k-15k heated enclosure)

BUILD A REALISTIC SCHEDULE with:
- Actual calendar dates (not "Month 1") - start from permit approval
- Week-by-week breakdown
- Critical path items flagged
- Material delivery dates
- Sub booking deadlines
- Inspection hold points
- Weather window constraints
- Client decision deadlines
- Risk buffers (Montana = expect delays)

Include both DESIGN PHASE timeline and CONSTRUCTION PHASE timeline.

Return ONLY: {"designPhase":"10-14 weeks","constructionPhase":"X-Y months","startToFinish":"total project duration","milestones":[{"phase":"Week 1-2: Initial Consultation","duration":"2 weeks","notes":"2 client meetings, site analysis, vision development","type":"design"},{"phase":"Foundation","duration":"3 weeks","notes":"Must start after May 15 (frost out), includes footing inspection hold","type":"construction"}]}

Use type "design" for Steps 1-4, "construction" for build phase.`
      }], SYSTEM, 2000);
      scheduleResult = safeJSON(schedRaw, "schedule");
    } catch(e){ 
      console.warn("Schedule failed:", e.message);
      scheduleResult = {
        startToFinish: `${gcResult.gcMonths||3}-${(gcResult.gcMonths||3)+1} months construction (plus 10-14 weeks design)`,
        milestones: []
      };
    }

    // Calculate final totals
    const totalLow  = subtotalLow  + (gcResult.gcLow||0);
    const totalHigh = subtotalHigh + (gcResult.gcHigh||0);

    // ── Combine results ───────────────────────────────────────────────
    const estimate = {
      zones:              zoneResult.zones,
      sections:           sectionResult.sections,
      gcLow:              gcResult.gcLow||0,
      gcHigh:             gcResult.gcHigh||0,
      gcMonths:           gcResult.gcMonths||3,
      subtotalLow,
      subtotalHigh,
      overheadProfitLow:  0,
      overheadProfitHigh: 0,
      totalLow,
      totalHigh,
      summary:            gcResult.summary||"",
      complianceNotes:    gcResult.complianceNotes||[],
      complianceAnalysis: complianceResult||"",
      siteAnalysis:       siteNotes||"",
      schedule:           scheduleResult
    };

    appData.estimate = estimate;
    const suggested = calcRetainerSuggestion(estimate.totalLow);
    if(!appData.retainerAmount) appData.retainerAmount = suggested;
    render();

  } catch(e){
    err.textContent = "Error: " + e.message;
    err.classList.remove("hidden");
    btn.disabled = false;
    btn.textContent = "✦ Generate AI Estimate";
  }
}

// ── Expand section line items on demand ──────────────────────────────
async function expandSection(sectionIdx){
  const btn = document.getElementById("expand-btn-"+sectionIdx);
  const container = document.getElementById("expand-"+sectionIdx);
  if(!btn || !container) return;
  btn.disabled = true; btn.textContent = "⏳ Loading…";

  const section = appData.estimate.sections[sectionIdx];
  const z = appData.zones[0];
  const projectSummary = `${z.type||"Project"} ${z.sqft||""}SF`;

  const prompt = `Generate detailed line items for the "${section.name}" section of a Montana construction estimate.
Project: ${projectSummary}
Section total: $${section.low.toLocaleString()} – $${section.high.toLocaleString()}
CSI: ${section.csiCode}

Use CMB rates: Carpenter $85/hr, Foreman $100/hr. Calculate laborUnit from hours x rate, materialUnit from material costs. Include 20% O&P in all prices.

Return ONLY this JSON array (4-6 realistic line items):
[{"description":"item name","unit":"SF","qty":1,"laborUnit":0,"materialUnit":0,"unitCost":0,"laborTotal":0,"materialTotal":0,"total":0}]`;

  try {
    const res = await fetch("https://billowing-snowflake-38f0.coppermountainbuilders406.workers.dev", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        model:"claude-haiku-4-5-20251001", max_tokens:1500,
        system:"You are a construction estimator in Flathead Valley Montana. CMB labor rates: Carpenter $85/hr, Foreman $100/hr, PM $130/hr. Calculate laborUnit (hrs/unit x rate), materialUnit (material only), unitCost = laborUnit+materialUnit, totals = qty x each. Return ONLY a valid JSON array [ ... ]. No markdown.",
        messages:[{role:"user", content:prompt}]
      })
    });
    if(!res.ok) throw new Error("Server error "+res.status);
    const data = await res.json();
    let raw = data.content[0].text.replace(/```json/g,"").replace(/```/g,"").trim();
    // Find the array
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if(start===-1||end===-1) throw new Error("No array returned");
    const items = JSON.parse(raw.slice(start, end+1));
    // Store in estimate
    appData.estimate.sections[sectionIdx].lineItems = items;
    // Render inline without full re-render
    container.innerHTML = items.map(item=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(92,88,80,0.15);">
        <span style="font-size:12px;color:var(--cream-dk);flex:1;padding-right:8px;">${esc(item.description)}</span>
        <span style="font-size:11px;color:var(--stone-light);white-space:nowrap;">
          ${item.qty} ${esc(item.unit||"LS")} &nbsp;|&nbsp;
          ${item.laborUnit!=null?`L: $${Number(item.laborUnit).toLocaleString()}/u`:""}
          ${item.materialUnit!=null?` M: $${Number(item.materialUnit).toLocaleString()}/u`:""}
          &nbsp;= <strong style="color:var(--cream);">$${Number(item.total||item.totalLow||0).toLocaleString()}</strong>
        </span>
      </div>
    `).join("");
    btn.textContent = "↻ Refresh";
    btn.disabled = false;
  } catch(e){
    container.innerHTML = `<p style="color:var(--error);font-size:12px;">Error: ${e.message}</p>`;
    btn.textContent = "↻ Retry";
    btn.disabled = false;
  }
}


// ── Document handling ─────────────────────────────────────────────────
async function handleDocuments(e, targetId, targetType){
  const files = Array.from(e.target.files);
  for(const file of files){
    const dataUrl = await fileToDataURL(file);
    const doc = { id:"d"+Date.now()+Math.random().toString(36).slice(2,6), name:file.name, type:file.type, size:file.size, dataUrl };
    if(targetType==="project"){
      if(!appData.projectDocs) appData.projectDocs=[];
      appData.projectDocs.push(doc);
    } else {
      const zone=appData.zones.find(z=>z.id===targetId);
      if(zone){ if(!zone.docs) zone.docs=[]; zone.docs.push(doc); }
    }
  }
  e.target.value=""; render();
}
function removeDoc(targetType,targetId,docId){
  if(targetType==="project"){ appData.projectDocs=(appData.projectDocs||[]).filter(d=>d.id!==docId); }
  else { const zone=appData.zones.find(z=>z.id===targetId); if(zone) zone.docs=(zone.docs||[]).filter(d=>d.id!==docId); }
  render();
}
function docIcon(t){ if(t.includes("pdf")) return "📄"; if(t.includes("word")||t.includes("docx")) return "📝"; if(t.includes("sheet")||t.includes("excel")) return "📊"; if(t.includes("image")) return "🖼"; return "📎"; }
function fmtSize(b){ if(b<1024) return b+"B"; if(b<1048576) return (b/1024).toFixed(1)+"KB"; return (b/1048576).toFixed(1)+"MB"; }
function docSection(targetType,targetId,label){
  const docs=targetType==="project"?(appData.projectDocs||[]):(appData.zones.find(z=>z.id===targetId)?.docs||[]);
  const inputId="docs_"+targetType+"_"+targetId;
  return `<div class="field"><label class="field-label">${label}</label>
    <input type="file" id="${inputId}" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.heic" multiple style="display:none" onchange="handleDocuments(event,'${targetId}','${targetType}')"/>
    <button class="btn-small" style="background:var(--stone-mid);border:1px solid var(--copper);color:var(--copper);" onclick="document.getElementById('${inputId}').click()">📎 Attach Document</button>
    ${docs.length>0?`<div style="margin-top:8px;">${docs.map(doc=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--stone);border-radius:6px;margin-bottom:6px;border:1px solid var(--stone-light);"><div style="display:flex;align-items:center;gap:8px;min-width:0;"><span style="font-size:18px;">${docIcon(doc.type)}</span><div style="min-width:0;"><div style="font-size:12px;color:var(--cream);overflow:hidden;text-overflow:ellipsis;max-width:180px;white-space:nowrap;">${esc(doc.name)}</div><div style="font-size:10px;color:var(--stone-light);">${fmtSize(doc.size)}</div></div></div><button class="btn-danger" onclick="removeDoc('${targetType}','${targetId}','${doc.id}')">✕</button></div>`).join("")}</div>`:""}
  </div>`;
}
function getAllDocs(){
  const all=[];
  (appData.projectDocs||[]).forEach(d=>all.push({...d,source:"Project"}));
  appData.zones.forEach(z=>(z.docs||[]).forEach(d=>all.push({...d,source:z.type||"Project"})));
  return all;
}

// ── Visit Storage (auto-save + named saves) ───────────────────────────
const AUTOSAVE_KEY = "cmb_autosave";
const VISITS_KEY   = "cmb_saved_visits";

function autoSave(){
  try {
    const snapshot = JSON.parse(JSON.stringify(appData)); // deep clone
    // Strip large base64 images from auto-save to keep storage small
    snapshot.zones = (snapshot.zones||[]).map(z => ({
      ...z,
      photosBefore: (z.photosBefore||[]).map((_,i) => `[photo ${i+1}]`),
      photosInspo:  (z.photosInspo||[]).map((_,i) => `[photo ${i+1}]`),
      docs: (z.docs||[]).map(d => ({...d, dataUrl: null}))
    }));
    snapshot._step = currentStep;
    snapshot._savedAt = new Date().toISOString();
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snapshot));
  } catch(e){ console.warn("Auto-save failed:", e); }
}

function fullSave(){
  try {
    const visits = JSON.parse(localStorage.getItem(VISITS_KEY)||"[]");
    const name = (appData.clientName||"Unnamed") + " — " + (appData.projectAddress||"No Address") + " — " + new Date().toLocaleDateString();
    const save = {
      id: "v" + Date.now(),
      name,
      savedAt: new Date().toISOString(),
      step: currentStep,
      data: JSON.stringify(appData)
    };
    visits.unshift(save);
    // Keep last 20 visits
    if(visits.length > 20) visits.splice(20);
    localStorage.setItem(VISITS_KEY, JSON.stringify(visits));
    alert("✓ Visit saved: " + name);
    // Also sync to OneDrive if connected
    syncVisitToOneDrive();
  } catch(e){ alert("Save failed: " + e.message); }
}

function loadVisit(id){
  try {
    const visits = JSON.parse(localStorage.getItem(VISITS_KEY)||"[]");
    const visit = visits.find(v => v.id === id);
    if(!visit) return alert("Visit not found");
    if(!confirm("Load this visit? Current unsaved data will be replaced.")) return;
    appData = JSON.parse(visit.data);
    currentStep = visit.step || 0;
    render();
  } catch(e){ alert("Load failed: " + e.message); }
}

function deleteVisit(id){
  if(!confirm("Delete this saved visit?")) return;
  const visits = JSON.parse(localStorage.getItem(VISITS_KEY)||"[]").filter(v => v.id !== id);
  localStorage.setItem(VISITS_KEY, JSON.stringify(visits));
  renderVisitsModal();
}

function getSavedVisits(){
  return JSON.parse(localStorage.getItem(VISITS_KEY)||"[]");
}

function startNewVisit(){
  if(!confirm("Start a new visit? Current unsaved data will be cleared.")) return;
  localStorage.removeItem(AUTOSAVE_KEY);
  window.location.reload();
}
// ── OneDrive Sync Module ─────────────────────────────────────────────────

async function odSignIn(){
  if(!msalApp){
    alert("Microsoft auth is still loading. Please wait a moment and try again.");
    return;
  }
  // Clear any stale MSAL cache before attempting sign-in
  try {
    const staleAccounts = msalApp.getAllAccounts();
    for(const acct of staleAccounts){ await msalApp.clearCache({ account: acct }).catch(()=>{}); }
  } catch(_){}

  try {
    const result = await msalApp.loginPopup({
      scopes: OD_SCOPES,
      prompt: "select_account"   // always show account picker, avoids stale state
    });
    odAccount = result.account;
    odTargetDriveId = null; // reset cached drive on new login
    updateOdBtn();
    showOdToast("☁ Connected to OneDrive as " + odAccount.username);
  } catch(e){
    if(e.errorCode === "user_cancelled" || e.message?.includes("user_cancelled")) return;
    // Show specific error to help diagnose
    const code = e.errorCode || e.name || "unknown";
    const msg = e.message || e.errorMessage || "No details";
    console.error("MSAL sign-in error:", e);
    if(code === "popup_window_error" || msg.toLowerCase().includes("popup")){
      alert("Sign-in popup was blocked.\n\nPlease allow popups for this site in your browser, then try again.");
    } else if(code.includes("65001") || msg.includes("consent")){
      alert("Admin consent required.\n\nIn Azure Portal → App Registration → API permissions, click \'Grant admin consent for Copper Mountain Builders\'.");
    } else {
      alert("OneDrive sign-in failed (" + code + "):\n" + msg.slice(0, 200));
    }
  }
}

function odSignOut(){
  if(!msalApp || !odAccount) return;
  msalApp.logoutPopup({ account: odAccount }).catch(()=>{});
  odAccount = null;
  odTargetDriveId = null; // clear cached SharePoint drive ID
  updateOdBtn();
  showOdToast("☁ Disconnected from OneDrive", false);
}

async function getOdToken(){
  if(!msalApp || !odAccount) return null;
  try {
    const r = await msalApp.acquireTokenSilent({ scopes: OD_SCOPES, account: odAccount });
    return r.accessToken;
  } catch(e){
    // Silent refresh failed — try popup
    try {
      const r = await msalApp.acquireTokenPopup({ scopes: OD_SCOPES });
      odAccount = r.account;
      return r.accessToken;
    } catch(e2){ return null; }
  }
}

function odSafeName(str){
  // Strip characters that OneDrive/Windows won't allow in file/folder names
  return (str||"Unknown").replace(/[/\\:*?"<>|]/g, "").trim().substring(0, 50);
}

// Look up the SharePoint drive ID for OD_LIBRARY_NAME (cached per session)
async function getSharePointDriveId(token){
  if(odTargetDriveId) return odTargetDriveId;
  try {
    const res = await fetch("https://graph.microsoft.com/v1.0/me/drives", {
      headers: { "Authorization": "Bearer " + token }
    });
    if(!res.ok){ console.warn("Could not list drives:", res.status); return null; }
    const data = await res.json();
    const drives = data.value || [];
    console.log("Available drives:", drives.map(d => d.name + " (" + d.id + ")"));
    const target = drives.find(d =>
      d.name && d.name.toLowerCase().includes(OD_LIBRARY_NAME.toLowerCase())
    );
    if(target){
      odTargetDriveId = target.id;
      console.log("SharePoint drive found:", target.name, target.id);
      return target.id;
    }
    console.warn("Library not found in drives list. Falling back to me/drive.");
  } catch(e){ console.warn("Drive lookup failed:", e); }
  return null;
}

async function odUploadFile(token, odPath, fileContent, mimeType){
  // Try SharePoint drive first; fall back to personal me/drive
  const driveId = await getSharePointDriveId(token);
  const encoded = odPath.split("/").map(encodeURIComponent).join("/");
  const url = driveId
    ? `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encoded}:/content`
    : `https://graph.microsoft.com/v1.0/me/drive/root:/${encoded}:/content`;
  console.log("OneDrive upload →", driveId ? "SharePoint drive" : "me/drive", "→", url);
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Authorization": "Bearer " + token, "Content-Type": mimeType },
    body: fileContent
  });
  if(!res.ok){
    let msg = res.status + " " + res.statusText;
    try {
      const j = await res.json();
      msg = j.error?.message || j.error?.code || msg;
      console.error("OneDrive upload error detail:", j);
    } catch(_){}
    throw new Error(`Upload failed (${res.status}): ${msg}`);
  }
  return res.json();
}

async function generateExcelBlob(){
  const d = appData;
  const est = d.estimate;
  if(!est) return null;
  
  try {
    // Auto-generate line items for sections that don't have them
    for(let i=0; i<(est.sections||[]).length; i++){
      const section = est.sections[i];
      if(!section.lineItems || section.lineItems.length === 0){
        const z = appData.zones[0];
        const projectSummary = `${z.type||"Project"} ${z.sqft||""}SF`;
        const prompt = `Generate detailed line items for the "${section.name}" section of a Montana construction estimate.
Project: ${projectSummary}
Section total: $${section.low.toLocaleString()} – $${section.high.toLocaleString()}
CSI: ${section.csiCode || getCsiInfo(section.name).csi}

Use CMB rates: Carpenter $85/hr, Foreman $100/hr. Calculate laborUnit from hours x rate, materialUnit from material costs. Include 20% O&P.

Return ONLY this JSON array (4-8 realistic line items):
[{"description":"item name","unit":"SF","qty":1,"laborUnit":0,"materialUnit":0,"unitCost":0,"laborTotal":0,"materialTotal":0,"total":0}]`;

        try {
          const res = await fetch("https://billowing-snowflake-38f0.coppermountainbuilders406.workers.dev", {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({
              model:"claude-haiku-4-5-20251001", max_tokens:1500,
              system:"You are a construction estimator in Flathead Valley Montana. CMB labor rates: Carpenter $85/hr, Foreman $100/hr, PM $130/hr. Use these rates to calculate laborUnit (labor cost per unit = hours per unit x rate). materialUnit = material cost per unit. unitCost = laborUnit + materialUnit. laborTotal = qty x laborUnit. materialTotal = qty x materialUnit. total = qty x unitCost. Return ONLY a valid JSON array [ ... ]. No markdown, no extra text.",
              messages:[{role:"user", content:prompt}]
            })
          });
          if(res.ok){
            const data = await res.json();
            let raw = data.content[0].text.replace(/```json/g,"").replace(/```/g,"").trim();
            const start = raw.indexOf("[");
            const end = raw.lastIndexOf("]");
            if(start!==-1 && end!==-1){
              const items = JSON.parse(raw.slice(start, end+1));
              est.sections[i].lineItems = items;
            }
          }
        } catch(e){
          console.warn(`Failed to generate line items for ${section.name}:`, e);
        }
      }
    }
    
    // Build Excel workbook
    const wb = XLSX.utils.book_new();
    const wsData = [];
    const z = appData.zones[0];
    
    // Project header
    wsData.push(["COPPER MOUNTAIN BUILDERS - CONCEPTUAL ESTIMATE"]);
    wsData.push([]);
    wsData.push(["Client:", d.clientName||""]);
    wsData.push(["Project Address:", `${d.projectAddress||""}, ${d.projectCity||""}, MT ${d.clientZip||""}`]);
    wsData.push(["Date:", new Date().toLocaleDateString()]);
    wsData.push(["Rep:", d.repName||""]);
    wsData.push(["Total Budget Range:", `${fmt$(est.totalLow)} - ${fmt$(est.totalHigh)}`]);
    wsData.push([]);
    
    // Project summary
    wsData.push(["PROJECT SUMMARY"]);
    wsData.push(["Project Type", "Square Feet", "Notes"]);
    wsData.push([z.type||"", z.sqft||"", z.notes||""]);
    wsData.push([]);
    
    // Column headers
    wsData.push(["Item Description", "CSI Code", "Cost Code", "Unit", "Qty", "Labor $/Unit", "Material $/Unit", "Total $/Unit", "Labor Total", "Material Total", "Line Total"]);
    
    // Sections
    (est.sections||[]).forEach(section => {
      wsData.push([section.name.toUpperCase(), section.csiCode||"", getCsiInfo(section.name).bt, "", "", "", "", "", "", "", ""]);
      (section.lineItems||[]).forEach(item => {
        wsData.push([
          "  " + (item.description||""),
          section.csiCode||"",
          getCsiInfo(section.name).bt,
          item.unit||"LS",
          item.qty||1,
          item.laborUnit||0,
          item.materialUnit||0,
          item.unitCost||0,
          item.laborTotal||0,
          item.materialTotal||0,
          item.total||0
        ]);
      });
      wsData.push(["", "", "", "", "", "", "", "", "", "Section Total:", section.low||0]);
      wsData.push([]);
    });
    
    // General conditions
    wsData.push(["GENERAL CONDITIONS (" + (est.gcMonths||3) + " months)"]);
    const gcItems = est.generalConditions?.items || [];
    if(gcItems.length){
      gcItems.forEach(item => {
        wsData.push([
          "  " + (item.name||""),
          "01 00 00",
          "General Conditions",
          "Other",
          item.qty||1,
          item.unit||"LS",
          item.low||0,
          item.high||0,
          item.low||0,
          item.high||0
        ]);
      });
    }
    wsData.push(["", "", "", "", "", "", "", "GC Total:", est.gcLow||0, est.gcHigh||0]);
    wsData.push([]);
    wsData.push([]);
    
    // Project totals
    wsData.push(["PROJECT TOTALS"]);
    wsData.push(["Construction Subtotal", "", "", "", "", "", "", "", est.subtotalLow||0, est.subtotalHigh||0]);
    wsData.push(["General Conditions", "", "", "", "", "", "", "", est.gcLow||0, est.gcHigh||0]);
    wsData.push(["", "", "", "", "", "", "", "", "", ""]);
    wsData.push(["TOTAL PROJECT COST", "", "", "", "", "", "", "", est.totalLow||0, est.totalHigh||0]);
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      {wch: 40}, {wch: 10}, {wch: 25}, {wch: 15}, {wch: 6},
      {wch: 6}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 12}
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, "Estimate");
    
    // Return as blob instead of downloading
    const wbout = XLSX.write(wb, {bookType:'xlsx', type:'array'});
    return new Blob([wbout], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    
  } catch(e){
    console.error("Excel generation failed:", e);
    return null;
  }
}

async function generateProposalBlob(){
  const d = appData;
  const est = d.estimate;
  if(!est) return null;
  
  // Helper function to format analysis text
  function formatAnalysis(text) {
    if(!text) return '';
    const lines = text.split('\n').filter(line => line.trim());
    let html = '<div class="analysis-section">';
    for(let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const isHeading = (line === line.toUpperCase() && line.length > 3 && line.length < 80) || (line.endsWith(':') && line.length < 100);
      const isBullet = line.startsWith('-') || line.startsWith('•') || line.match(/^[0-9]+\./);
      if(isHeading) {
        if(i > 0 && lines[i-1] && (lines[i-1].startsWith('-') || lines[i-1].startsWith('•'))) html += '</ul>';
        html += '<div class="analysis-heading">' + esc(line.replace(/:/g, '')) + '</div>';
        if(i < lines.length - 1 && (lines[i+1].startsWith('-') || lines[i+1].startsWith('•'))) html += '<ul class="analysis-list">';
      } else if(isBullet) {
        if(i === 0 || (!lines[i-1].startsWith('-') && !lines[i-1].startsWith('•') && !lines[i-1].match(/^[0-9]+\./))) html += '<ul class="analysis-list">';
        html += '<li>' + esc(line.replace(/^[-•]\s*/, '').replace(/^[0-9]+\.\s*/, '')) + '</li>';
        if(i === lines.length - 1 || (!lines[i+1].startsWith('-') && !lines[i+1].startsWith('•') && !lines[i+1].match(/^[0-9]+\./))) html += '</ul>';
      } else {
        html += '<p class="analysis-paragraph">' + esc(line) + '</p>';
      }
    }
    html += '</div>';
    return html;
  }
  
  const dt = new Date().toLocaleDateString();
  
  // Create complete HTML document with ALL sections
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="ProgId" content="Word.Document">
  <meta name="Generator" content="Microsoft Word">
  <meta name="Originator" content="Microsoft Word">
  <style>
    @page { size: 8.5in 11in; margin: 1in; }
    body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5; color: #2C2A27; margin: 0; padding: 20px; }
    .cover-page { text-align: center; padding-top: 2in; page-break-after: always; }
    .company-name { font-size: 24pt; font-weight: bold; color: #B87333; letter-spacing: 3px; margin-bottom: 20px; }
    .doc-title { font-size: 18pt; font-weight: bold; color: #2C2A27; margin-bottom: 40px; }
    .cover-info { font-size: 12pt; margin: 10px 0; }
    h1 { font-size: 18pt; font-weight: bold; color: #B87333; margin-top: 30px; margin-bottom: 15px; page-break-after: avoid; }
    h2 { font-size: 14pt; font-weight: bold; color: #2C2A27; margin-top: 20px; margin-bottom: 10px; }
    p { margin: 10px 0; text-align: justify; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; page-break-inside: avoid; }
    th { background-color: #B87333; color: white; font-weight: bold; padding: 10px; border: 1px solid #999; text-align: left; }
    td { padding: 8px 10px; border: 1px solid #CCCCCC; }
    tr:nth-child(even) { background-color: #F5F0E8; }
    .total-row { background-color: #E6D5C3 !important; font-weight: bold; font-size: 13pt; }
    .retainer-box { background-color: #FFF8E7; border: 2px solid #B87333; padding: 15px; margin: 20px 0; font-size: 13pt; font-weight: bold; text-align: center; }
    .page-break { page-break-before: always; }
    .analysis-section { margin: 20px 0; }
    .analysis-heading { font-weight: bold; color: #B87333; font-size: 13pt; margin-top: 15px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .analysis-list { margin: 5px 0 15px 25px; line-height: 1.7; }
    .analysis-list li { margin: 5px 0; }
    .analysis-paragraph { margin: 10px 0 10px 15px; line-height: 1.7; }
    .milestone { margin: 10px 0 10px 20px; padding-left: 20px; border-left: 3px solid #B87333; }
    .milestone-phase { font-weight: bold; color: #2C2A27; }
    .milestone-duration { color: #5C5850; font-style: italic; }
    .section-content { margin-left: 20px; margin-bottom: 20px; white-space: pre-wrap; }
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="company-name">${esc(d.company||"COPPER MOUNTAIN BUILDERS").toUpperCase()}</div>
    <div class="doc-title">CONCEPTUAL DESIGN-BUILD PROPOSAL</div>
    <div class="cover-info"><strong>Client:</strong> ${esc(d.clientName||"")}</div>
    <div class="cover-info"><strong>Project:</strong> ${esc(d.projectAddress||"")}, ${esc(d.projectCity||"")}, MT</div>
    <div class="cover-info"><strong>Date:</strong> ${dt}</div>
    <div class="cover-info"><strong>Prepared by:</strong> ${esc(d.repName||"")}</div>
  </div>

  <!-- EXECUTIVE SUMMARY -->
  <h1>Executive Summary</h1>
  ${est.summary ? est.summary.split('\n').map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('') : '<p>No summary available.</p>'}
  
  <div class="page-break"></div>

  <!-- BUDGET SUMMARY -->
  <h1>Budget Summary</h1>
  <table>
    <thead>
      <tr>
        <th>Project Type</th>
        <th style="text-align:right;">Sq Ft</th>
        <th style="text-align:right;">Budget Low</th>
        <th style="text-align:right;">Budget High</th>
      </tr>
    </thead>
    <tbody>
      ${(est.zones||[]).map((z,i) => `
        <tr>
          <td>${esc(z.name||appData.zones[0]?.type||"")}</td>
          <td style="text-align:right;">${appData.zones[0]?.sqft||""}</td>
          <td style="text-align:right;">${fmt$(z.low||0)}</td>
          <td style="text-align:right;">${fmt$(z.high||0)}</td>
        </tr>
      `).join('\n      ')}
      <tr style="border-top: 2px solid #B87333;">
        <td colspan="2"><strong>Construction Subtotal</strong></td>
        <td style="text-align:right;"><strong>${fmt$(est.subtotalLow||0)}</strong></td>
        <td style="text-align:right;"><strong>${fmt$(est.subtotalHigh||0)}</strong></td>
      </tr>
      <tr>
        <td colspan="2">General Conditions (${est.gcMonths||3} months)</td>
        <td style="text-align:right;">${fmt$(est.gcLow||0)}</td>
        <td style="text-align:right;">${fmt$(est.gcHigh||0)}</td>
      </tr>
      <tr class="total-row" style="border-top: 2px solid #B87333;">
        <td colspan="2"><strong>TOTAL PROJECT COST</strong></td>
        <td style="text-align:right;"><strong>${fmt$(est.totalLow||0)}</strong></td>
        <td style="text-align:right;"><strong>${fmt$(est.totalHigh||0)}</strong></td>
      </tr>
    </tbody>
  </table>
  
  <div class="retainer-box">
    Design Retainer (Non-Refundable): ${fmt$(d.retainerAmount||0)}
  </div>

  ${est.siteAnalysis ? `
  <div class="page-break"></div>
  <h1>Site Analysis</h1>
  <p><em>Based on comprehensive photo analysis of existing conditions:</em></p>
  ${formatAnalysis(est.siteAnalysis)}
  ` : ''}

  ${est.complianceAnalysis ? `
  <div class="page-break"></div>
  <h1>Code Compliance & Permitting</h1>
  <p><em>Comprehensive review of Montana Building Code requirements and Flathead County permitting:</em></p>
  ${formatAnalysis(est.complianceAnalysis)}
  ` : ''}

  ${est.schedule && est.schedule.milestones && est.schedule.milestones.length > 0 ? `
  <div class="page-break"></div>
  <h1>Construction Schedule</h1>
  <p><strong>Total Duration:</strong> ${esc(est.schedule.startToFinish||"TBD")}</p>
  ${est.schedule.designPhase ? `<p><strong>Design Phase:</strong> ${esc(est.schedule.designPhase)}</p>` : ''}
  ${est.schedule.constructionPhase ? `<p><strong>Construction Phase:</strong> ${esc(est.schedule.constructionPhase)}</p>` : ''}
  <div class="section-content">
    ${(est.schedule.milestones||[]).map(m => `
      <div class="milestone">
        <div class="milestone-phase">${esc(m.phase)}</div>
        <div class="milestone-duration">${esc(m.duration)}</div>
        ${m.notes ? `<div>${esc(m.notes)}</div>` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="page-break"></div>
  <h1>Cost Breakdown by Trade</h1>
  <table>
    <thead><tr><th>Trade Section</th><th style="text-align:right;">Low</th><th style="text-align:right;">High</th></tr></thead>
    <tbody>
      ${(est.sections||[]).map(s => `<tr><td>${esc(s.name)}</td><td style="text-align:right;">${fmt$(s.low||0)}</td><td style="text-align:right;">${fmt$(s.high||0)}</td></tr>`).join('\n      ')}
      <tr style="border-top: 2px solid #B87333;">
        <td><strong>Construction Subtotal</strong></td>
        <td style="text-align:right;"><strong>${fmt$(est.subtotalLow||0)}</strong></td>
        <td style="text-align:right;"><strong>${fmt$(est.subtotalHigh||0)}</strong></td>
      </tr>
      <tr>
        <td>General Conditions (${est.gcMonths||3} months)</td>
        <td style="text-align:right;">${fmt$(est.gcLow||0)}</td>
        <td style="text-align:right;">${fmt$(est.gcHigh||0)}</td>
      </tr>
      <tr class="total-row" style="border-top: 2px solid #B87333;">
        <td><strong>TOTAL PROJECT COST</strong></td>
        <td style="text-align:right;"><strong>${fmt$(est.totalLow||0)}</strong></td>
        <td style="text-align:right;"><strong>${fmt$(est.totalHigh||0)}</strong></td>
      </tr>
    </tbody>
  </table>

</body>
</html>`;

  return new Blob([html], {type: 'application/msword'});
}

async function syncVisitToOneDrive(){
  if(!odAccount) return; // silently skip if not connected

  const token = await getOdToken();
  if(!token){ showOdToast("☁ OneDrive auth expired — please reconnect", true); return; }

  const d = appData;
  const year = new Date().getFullYear();
  const client = odSafeName(d.clientName);
  const addr   = odSafeName(d.projectAddress);
  const folder = `${OD_ROOT_FOLDER}/${year}/${client} - ${addr}`;
  const dateStr = new Date().toISOString().split("T")[0];

  const syncBtn = document.getElementById("od-sync-btn");
  if(syncBtn){ syncBtn.disabled = true; syncBtn.textContent = "☁ Syncing..."; }

  const uploadedFiles = [];

  try {
    // 1. Save visit JSON (strips large photo blobs to keep file small)
    showOdToast("☁ Uploading visit data...");
    const snap = JSON.parse(JSON.stringify(d));
    snap.zones = (snap.zones||[]).map(z => ({
      ...z,
      photosBefore: (z.photosBefore||[]).length ? [`[${z.photosBefore.length} photo(s) stored on device]`] : [],
      photosInspo:  (z.photosInspo||[]).length  ? [`[${z.photosInspo.length} photo(s) stored on device]`]  : [],
    }));
    snap._odSyncedAt = new Date().toISOString();
    await odUploadFile(token, `${folder}/visit_${dateStr}.json`, JSON.stringify(snap, null, 2), "application/json");
    uploadedFiles.push("📋 Visit data (JSON)");

    // 2. Upload Word proposal document if estimate exists
    if(d.estimate){
      showOdToast("☁ Generating proposal document...");
      const wordBlob = await generateProposalBlob();
      if(wordBlob){
        const fname = `${client}_Proposal_${dateStr}.doc`;
        await odUploadFile(token, `${folder}/${fname}`, await wordBlob.arrayBuffer(), "application/msword");
        uploadedFiles.push("📄 Proposal document (Word)");
      }
    }

    // 3. Upload Excel estimate if estimate exists
    if(d.estimate){
      showOdToast("☁ Generating Excel estimate...");
      const excelBlob = await generateExcelBlob();
      if(excelBlob){
        const fname = `${client}_Estimate_${dateStr}.xlsx`;
        await odUploadFile(token, `${folder}/${fname}`, await excelBlob.arrayBuffer(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        uploadedFiles.push("📊 Estimate spreadsheet (Excel)");
      }
    }

    // Store sync timestamp in appData so the UI can show it
    appData._odSyncedAt = new Date().toISOString();
    appData._odFolder   = folder;
    
    // Show success page instead of just a toast
    if(syncBtn){ syncBtn.disabled = false; syncBtn.textContent = "☁ Sync to OneDrive"; }
    showSyncSuccessPage(uploadedFiles, folder);

  } catch(e){
    console.error("OneDrive sync error:", e);
    const errMsg = e.message || "Unknown error";
    showOdToast("☁ Sync failed: " + errMsg.slice(0, 80), true);
    if(syncBtn){ syncBtn.disabled = false; syncBtn.textContent = "☁ Sync to OneDrive"; }
  }
}

function showSyncSuccessPage(uploadedFiles, folder){
  const modal = document.createElement("div");
  modal.id = "sync-success-modal";
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.85); display: flex; align-items: center;
    justify-content: center; z-index: 10000; backdrop-filter: blur(4px);
  `;
  
  modal.innerHTML = `
    <div style="
      background: var(--cream); border-radius: 16px; padding: 40px;
      max-width: 500px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    ">
      <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
      <h2 style="color: var(--copper); margin-bottom: 10px; font-size: 28px;">Sync Complete!</h2>
      <p style="color: var(--stone); font-size: 15px; margin-bottom: 30px;">
        All files successfully uploaded to OneDrive
      </p>
      
      <div style="
        background: var(--stone); border-radius: 8px; padding: 20px;
        margin-bottom: 30px; text-align: left;
      ">
        <div style="color: var(--stone-light); font-size: 11px; text-transform: uppercase;
                    letter-spacing: 0.5px; margin-bottom: 12px; font-weight: 600;">
          📁 ${folder}
        </div>
        ${uploadedFiles.map(f => `
          <div style="color: var(--cream); font-size: 14px; padding: 6px 0;
                      border-bottom: 1px solid var(--stone-light); display: flex;
                      align-items: center; gap: 10px;">
            <span style="flex: 1;">${f}</span>
            <span style="color: #7ec87e; font-size: 12px;">✓</span>
          </div>
        `).join('')}
      </div>
      
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button onclick="startNewVisit()" style="
          flex: 1; padding: 14px 24px; background: var(--copper);
          border: none; border-radius: 8px; color: white; font-size: 15px;
          font-weight: 600; cursor: pointer; transition: all 0.2s;
        " onmouseover="this.style.background='#a66329'" 
           onmouseout="this.style.background='var(--copper)'">
          🆕 Start New Visit
        </button>
        
        <button onclick="closeSyncSuccess()" style="
          flex: 1; padding: 14px 24px; background: transparent;
          border: 2px solid var(--stone-light); border-radius: 8px;
          color: var(--stone); font-size: 15px; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        " onmouseover="this.style.borderColor='var(--stone)'" 
           onmouseout="this.style.borderColor='var(--stone-light)'">
          ← Back to Review
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

function closeSyncSuccess(){
  const modal = document.getElementById("sync-success-modal");
  if(modal) modal.remove();
}

function startNewVisit(){
  if(!confirm("Start a new site visit? This will clear all current data.")){
    return;
  }
  
  closeSyncSuccess();
  
  // Clear all data
  appData = {
    company: "Copper Mountain Builders",
    repName: "", clientName: "", clientEmail: "", clientPhone: "",
    clientAddress: "", clientCity: "", clientZip: "",
    projectAddress: "", projectCity: "",
    projectNotes: "", zones: [{id:'z_default', type:'', sqft:'', notes:'', photosBefore:[], photosInspo:[]}], estimate: null,
    retainerAmount: "", clientSig: null, repSig: null,
    clientPrintName: "", repPrintName: "",
    clarifyingQuestions: [], clarifyingAnswers: {}
  };
  
  currentStep = 0;
  render();
  localStorage.removeItem("cmb_autosave");
  
  showOdToast("✨ New visit started!");
}

function showOdToast(msg, isError = false){
  let t = document.getElementById("od-toast");
  if(!t){
    t = document.createElement("div");
    t.id = "od-toast";
    t.style.cssText = [
      "position:fixed","bottom:24px","right:20px",
      "padding:11px 18px","border-radius:8px",
      "font-size:13px","font-weight:600","z-index:9999",
      "pointer-events:none","transition:opacity 0.6s"
    ].join(";");
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.background = isError ? "#8b2020" : "#1e4d38";
  t.style.color = "white";
  t.style.opacity = "1";
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = "0"; }, 3800);
}

function updateOdBtn(){
  const btn = document.getElementById("od-connect-btn");
  if(!btn) return;
  if(odAccount){
    const user = odAccount.name || odAccount.username || "OneDrive";
    btn.textContent = "☁ " + user.split(" ")[0] + " ✓";
    btn.title = "Connected as " + odAccount.username + " — click to disconnect";
    btn.style.cssText += ";background:rgba(45,106,79,0.25);border-color:#2d6a4f;color:#7ec8a4;";
    btn.onclick = () => { if(confirm("Disconnect from OneDrive?")) odSignOut(); };
  } else {
    btn.textContent = "☁ Connect OneDrive";
    btn.title = "Connect to Microsoft OneDrive to auto-save visits";
    btn.style.cssText += ";background:'';border-color:'';color:'';";
    btn.onclick = odSignIn;
  }
}


// ── Visits Modal ──────────────────────────────────────────────────────
function showVisitsModal(){
  document.getElementById("visits-modal").style.display = "flex";
  renderVisitsModal();
}
function hideVisitsModal(){
  document.getElementById("visits-modal").style.display = "none";
}
function renderVisitsModal(){
  const visits = getSavedVisits();
  const list = document.getElementById("visits-list");
  if(!list) return;
  if(visits.length === 0){
    list.innerHTML = `<p style="color:var(--stone-light);font-size:13px;text-align:center;padding:20px;">No saved visits yet.</p>`;
    return;
  }
  list.innerHTML = visits.map(v => {
    const vData = (() => { try { return JSON.parse(v.data||"{}"); } catch(_){ return {}; } })();
    const syncedAt = vData._odSyncedAt ? "☁ Synced " + new Date(vData._odSyncedAt).toLocaleDateString() : "";
    return `
    <div style="background:var(--stone);border-radius:8px;padding:12px 14px;margin-bottom:10px;border:1px solid var(--stone-light);">
      <div style="font-size:13px;color:var(--cream);margin-bottom:4px;">${esc(v.name)}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div style="font-size:11px;color:var(--stone-light);">${new Date(v.savedAt).toLocaleString()}</div>
        ${syncedAt ? `<div style="font-size:10px;color:#7ec8a4;letter-spacing:0.5px;">${syncedAt}</div>` : ''}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn-small" onclick="loadVisit('${v.id}');hideVisitsModal()">Load</button>
        ${odAccount ? `<button class="btn-small" style="background:rgba(45,106,79,0.2);border:1px solid #2d6a4f;color:#7ec8a4;" onclick="loadVisit('${v.id}');hideVisitsModal();setTimeout(syncVisitToOneDrive,300)">☁ Sync</button>` : ''}
        <button class="btn-danger" onclick="deleteVisit('${v.id}')">Delete</button>
      </div>
    </div>
  `}).join("");
}

// ── Export functions ──────────────────────────────────────────────────
// CSI Division mapping to Buildertrend cost code names
const CSI_MAP = {
  // Division 00 — Procurement & Contracting
  "Procurement":            { csi: "00 00 00", bt: "Procurement" },
  "Bidding":                { csi: "00 00 00", bt: "Procurement" },
  // Division 01 — General Requirements
  "General Conditions":     { csi: "01 00 00", bt: "General Conditions" },
  "Project Management":     { csi: "01 31 00", bt: "Project Management" },
  "Site Supervision":       { csi: "01 31 13", bt: "Superintendent" },
  "Superintendent":         { csi: "01 31 13", bt: "Superintendent" },
  "Permits & Inspections":  { csi: "01 41 00", bt: "Permits & Fees" },
  "Permits":                { csi: "01 41 00", bt: "Permits & Fees" },
  "Inspections":            { csi: "01 41 00", bt: "Permits & Fees" },
  "Temporary Facilities":   { csi: "01 50 00", bt: "Temporary Facilities" },
  "Temporary":              { csi: "01 50 00", bt: "Temporary Facilities" },
  "Dumpster/Debris Removal":{ csi: "01 74 19", bt: "Construction Waste Management" },
  "Dumpster":               { csi: "01 74 19", bt: "Construction Waste Management" },
  "Debris Removal":         { csi: "01 74 19", bt: "Construction Waste Management" },
  "Cleanup":                { csi: "01 74 19", bt: "Construction Waste Management" },
  "Builder Risk Insurance": { csi: "01 18 00", bt: "Insurance" },
  "Insurance":              { csi: "01 18 00", bt: "Insurance" },
  "Contingency (5%)":       { csi: "01 21 16", bt: "Contingency" },
  "Contingency":            { csi: "01 21 16", bt: "Contingency" },
  // Division 02 — Existing Conditions
  "Demolition":             { csi: "02 41 00", bt: "Demolition" },
  "Demo":                   { csi: "02 41 00", bt: "Demolition" },
  "Selective Demolition":   { csi: "02 41 19", bt: "Demolition" },
  "Existing Conditions":    { csi: "02 00 00", bt: "Existing Conditions" },
  "Abatement":              { csi: "02 82 00", bt: "Hazardous Material Abatement" },
  "Asbestos":               { csi: "02 82 13", bt: "Hazardous Material Abatement" },
  // Division 03 — Concrete
  "Concrete":               { csi: "03 00 00", bt: "Concrete" },
  "Foundation":             { csi: "03 11 00", bt: "Concrete - Foundations" },
  "Foundations":            { csi: "03 11 00", bt: "Concrete - Foundations" },
  "Site & Foundation":      { csi: "03 00 00", bt: "Concrete" },
  "Slab":                   { csi: "03 30 00", bt: "Concrete" },
  "Flatwork":               { csi: "03 30 00", bt: "Concrete" },
  "Footings":               { csi: "03 11 00", bt: "Concrete - Foundations" },
  // Division 04 — Masonry
  "Masonry":                { csi: "04 00 00", bt: "Masonry" },
  "Brick":                  { csi: "04 21 00", bt: "Masonry" },
  "Stone":                  { csi: "04 43 00", bt: "Masonry" },
  "Fireplace":              { csi: "04 57 00", bt: "Masonry" },
  // Division 05 — Metals
  "Metals":                 { csi: "05 00 00", bt: "Structural Steel" },
  "Structural Steel":       { csi: "05 12 00", bt: "Structural Steel" },
  "Steel":                  { csi: "05 12 00", bt: "Structural Steel" },
  "Beam":                   { csi: "05 12 00", bt: "Structural Steel" },
  "Metal Fabrications":     { csi: "05 50 00", bt: "Structural Steel" },
  // Division 06 — Wood, Plastics & Composites
  "Framing":                { csi: "06 10 00", bt: "Rough Carpentry" },
  "Rough Framing":          { csi: "06 10 00", bt: "Rough Carpentry" },
  "Structural Framing":     { csi: "06 10 00", bt: "Rough Carpentry" },
  "Rough Carpentry":        { csi: "06 10 00", bt: "Rough Carpentry" },
  "Lumber":                 { csi: "06 10 00", bt: "Rough Carpentry" },
  "Finish Carpentry":       { csi: "06 20 00", bt: "Finish Carpentry" },
  "Trim":                   { csi: "06 22 00", bt: "Finish Carpentry" },
  "Millwork":               { csi: "06 20 00", bt: "Finish Carpentry" },
  "Cabinetry":              { csi: "06 41 00", bt: "Cabinets & Countertops" },
  "Cabinets":               { csi: "06 41 00", bt: "Cabinets & Countertops" },
  "Kitchen Cabinets":       { csi: "06 41 00", bt: "Cabinets & Countertops" },
  "Countertops":            { csi: "06 41 16", bt: "Cabinets & Countertops" },
  "Deck":                   { csi: "06 15 00", bt: "Decks & Porches" },
  "Decking":                { csi: "06 15 00", bt: "Decks & Porches" },
  "Porch":                  { csi: "06 15 00", bt: "Decks & Porches" },
  // Division 07 — Thermal & Moisture Protection
  "Insulation":             { csi: "07 21 00", bt: "Insulation" },
  "Spray Foam":             { csi: "07 21 29", bt: "Insulation" },
  "Roofing":                { csi: "07 30 00", bt: "Roofing" },
  "Roof":                   { csi: "07 30 00", bt: "Roofing" },
  "Metal Roofing":          { csi: "07 61 00", bt: "Roofing" },
  "Standing Seam":          { csi: "07 61 13", bt: "Roofing" },
  "Shingles":               { csi: "07 31 13", bt: "Roofing" },
  "Waterproofing":          { csi: "07 10 00", bt: "Waterproofing" },
  "Flashing":               { csi: "07 62 00", bt: "Waterproofing" },
  "Siding":                 { csi: "07 46 00", bt: "Siding" },
  "Exterior Cladding":      { csi: "07 46 00", bt: "Siding" },
  "Vapor Barrier":          { csi: "07 26 00", bt: "Insulation" },
  "Air Barrier":            { csi: "07 27 00", bt: "Insulation" },
  // Division 08 — Openings
  "Doors & Windows":        { csi: "08 00 00", bt: "Doors & Windows" },
  "Openings":               { csi: "08 00 00", bt: "Doors & Windows" },
  "Windows":                { csi: "08 50 00", bt: "Doors & Windows" },
  "Doors":                  { csi: "08 10 00", bt: "Doors & Windows" },
  "Exterior Doors":         { csi: "08 14 00", bt: "Doors & Windows" },
  "Garage Doors":           { csi: "08 36 00", bt: "Doors & Windows" },
  "Skylights":              { csi: "08 62 00", bt: "Doors & Windows" },
  "Hardware":               { csi: "08 71 00", bt: "Doors & Windows" },
  // Division 09 — Finishes
  "Drywall":                { csi: "09 29 00", bt: "Drywall" },
  "Gypsum Board":           { csi: "09 29 00", bt: "Drywall" },
  "Plaster":                { csi: "09 20 00", bt: "Drywall" },
  "Interior Finishes":      { csi: "09 00 00", bt: "Interior Finishes" },
  "Finishes":               { csi: "09 00 00", bt: "Interior Finishes" },
  "Tile":                   { csi: "09 30 00", bt: "Tile" },
  "Tile & Flooring":        { csi: "09 30 00", bt: "Tile" },
  "Ceramic Tile":           { csi: "09 31 00", bt: "Tile" },
  "Flooring":               { csi: "09 60 00", bt: "Flooring" },
  "Hardwood Flooring":      { csi: "09 64 00", bt: "Flooring" },
  "LVP":                    { csi: "09 65 19", bt: "Flooring" },
  "Carpet":                 { csi: "09 68 00", bt: "Flooring" },
  "Painting":               { csi: "09 90 00", bt: "Painting" },
  "Paint":                  { csi: "09 90 00", bt: "Painting" },
  "Staining":               { csi: "09 90 00", bt: "Painting" },
  // Division 10 — Specialties
  "Specialties":            { csi: "10 00 00", bt: "Specialties" },
  "Signage":                { csi: "10 14 00", bt: "Specialties" },
  "Toilet Accessories":     { csi: "10 28 00", bt: "Specialties" },
  // Division 21 — Fire Suppression
  "Fire Suppression":       { csi: "21 00 00", bt: "Fire Suppression" },
  "Sprinklers":             { csi: "21 13 00", bt: "Fire Suppression" },
  // Division 22 — Plumbing
  "Plumbing":               { csi: "22 00 00", bt: "Plumbing" },
  "Plumbing Fixtures":      { csi: "22 40 00", bt: "Plumbing" },
  "Water Heater":           { csi: "22 33 00", bt: "Plumbing" },
  // Division 23 — HVAC
  "HVAC":                   { csi: "23 00 00", bt: "HVAC" },
  "Mechanical":             { csi: "23 00 00", bt: "HVAC" },
  "Heating":                { csi: "23 50 00", bt: "HVAC" },
  "Ventilation":            { csi: "23 30 00", bt: "HVAC" },
  "Mini-Split":             { csi: "23 81 26", bt: "HVAC" },
  "Radiant Heat":           { csi: "23 83 16", bt: "HVAC" },
  // Division 26 — Electrical
  "Electrical":             { csi: "26 00 00", bt: "Electrical" },
  "Lighting":               { csi: "26 50 00", bt: "Electrical" },
  "Service Upgrade":        { csi: "26 24 00", bt: "Electrical" },
  "Low Voltage":            { csi: "27 00 00", bt: "Communications" },
  // Division 31 — Earthwork
  "Earthwork":              { csi: "31 00 00", bt: "Sitework" },
  "Excavation":             { csi: "31 23 00", bt: "Sitework" },
  "Grading":                { csi: "31 22 00", bt: "Sitework" },
  "Site Work":              { csi: "31 00 00", bt: "Sitework" },
  "Sitework":               { csi: "31 00 00", bt: "Sitework" },
  "Site Preparation":       { csi: "31 10 00", bt: "Sitework" },
  // Division 32 — Exterior Improvements
  "Landscaping":            { csi: "32 90 00", bt: "Landscaping" },
  "Paving":                 { csi: "32 12 00", bt: "Paving" },
  "Driveway":               { csi: "32 12 00", bt: "Paving" },
  "Outdoor Living":         { csi: "32 90 00", bt: "Decks & Porches" },
  "Fencing":                { csi: "32 31 00", bt: "Fencing" },
  "Retaining Wall":         { csi: "32 32 00", bt: "Sitework" },
  // Division 33 — Utilities
  "Utilities":              { csi: "33 00 00", bt: "Utilities" },
  "Water Service":          { csi: "33 11 00", bt: "Utilities" },
  "Sewer":                  { csi: "33 30 00", bt: "Utilities" },
  "Septic":                 { csi: "33 44 00", bt: "Utilities" },
  "Well":                   { csi: "33 21 00", bt: "Utilities" },
};

function getCsiInfo(name){
  if(CSI_MAP[name]) return CSI_MAP[name];
  const key = Object.keys(CSI_MAP).find(k =>
    name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(name.toLowerCase())
  );
  return key ? CSI_MAP[key] : { csi: "01 00 00", bt: "General Conditions" };
}

async function exportExcel(){
  const d = appData;
  const est = d.estimate;
  if(!est){ alert("Generate estimate first"); return; }
  
  const btn = event.target;
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "⏳ Generating Excel...";
  
  try {
    // ── STEP 1: Auto-generate ALL line items for sections that don't have them ──
    for(let i=0; i<(est.sections||[]).length; i++){
      const section = est.sections[i];
      if(!section.lineItems || section.lineItems.length === 0){
        btn.textContent = `⏳ Generating line items for ${section.name}...`;
        
        const z = appData.zones[0];
        const projectSummary = `${z.type||"Project"} ${z.sqft||""}SF`;
        const prompt = `Generate detailed line items for the "${section.name}" section of a Montana construction estimate.
Project: ${projectSummary}
Section total: $${section.low.toLocaleString()} – $${section.high.toLocaleString()}
CSI: ${section.csiCode || getCsiInfo(section.name).csi}

Use CMB rates: Carpenter $85/hr, Foreman $100/hr. Calculate laborUnit from hours x rate, materialUnit from material costs. Include 20% O&P.

Return ONLY this JSON array (4-8 realistic line items):
[{"description":"item name","unit":"SF","qty":1,"laborUnit":0,"materialUnit":0,"unitCost":0,"laborTotal":0,"materialTotal":0,"total":0}]`;

        try {
          const res = await fetch("https://billowing-snowflake-38f0.coppermountainbuilders406.workers.dev", {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({
              model:"claude-haiku-4-5-20251001", max_tokens:1500,
              system:"You are a construction estimator in Flathead Valley Montana. CMB labor rates: Carpenter $85/hr, Foreman $100/hr, PM $130/hr. Use these rates to calculate laborUnit (labor cost per unit = hours per unit x rate). materialUnit = material cost per unit. unitCost = laborUnit + materialUnit. laborTotal = qty x laborUnit. materialTotal = qty x materialUnit. total = qty x unitCost. Return ONLY a valid JSON array [ ... ]. No markdown, no extra text.",
              messages:[{role:"user", content:prompt}]
            })
          });
          if(res.ok){
            const data = await res.json();
            let raw = data.content[0].text.replace(/```json/g,"").replace(/```/g,"").trim();
            const start = raw.indexOf("[");
            const end = raw.lastIndexOf("]");
            if(start!==-1 && end!==-1){
              const items = JSON.parse(raw.slice(start, end+1));
              est.sections[i].lineItems = items;
            }
          }
        } catch(e){
          console.warn(`Failed to generate line items for ${section.name}:`, e);
        }
      }
    }
    
    // ── STEP 2: Build Excel workbook with SheetJS ──
    btn.textContent = "⏳ Building Excel file...";
    
    const wb = XLSX.utils.book_new();
    const wsData = [];
    const z = appData.zones[0];
    
    // ── PROJECT INFORMATION HEADER ──
    wsData.push(["COPPER MOUNTAIN BUILDERS - CONCEPTUAL ESTIMATE"]);
    wsData.push([]);
    wsData.push(["Client:", d.clientName||""]);
    wsData.push(["Project Address:", `${d.projectAddress||""}, ${d.projectCity||""}, MT ${d.clientZip||""}`]);
    wsData.push(["Date:", new Date().toLocaleDateString()]);
    wsData.push(["Rep:", d.repName||""]);
    wsData.push(["Total Budget Range:", `${fmt$(est.totalLow)} - ${fmt$(est.totalHigh)}`]);
    wsData.push([]);
    
    // ── PROJECT SUMMARY ──
    wsData.push(["PROJECT SUMMARY"]);
    wsData.push(["Project Type", "Sq Ft", "Budget Low", "Budget High", "Notes"]);
    wsData.push([
      z.type||"",
      z.sqft||"",
      est.zones[0]?.low||0,
      est.zones[0]?.high||0,
      est.zones[0]?.notes||""
    ]);
    wsData.push([]);
    wsData.push([]);
    
    // ── DETAILED COST BREAKDOWN ──
    wsData.push(["DETAILED COST BREAKDOWN"]);
    wsData.push([]);
    wsData.push(["Item Description", "CSI Code", "Cost Code", "Unit", "Qty", "Labor $/Unit", "Material $/Unit", "Total $/Unit", "Labor Total", "Material Total", "Line Total"]);
    
    // Trade sections
    (est.sections||[]).forEach(section => {
      const csi = getCsiInfo(section.name);
      
      // Section header row
      wsData.push([section.name.toUpperCase(), "", "", "", "", "", "", "", "", "", ""]);
      
      // Line items
      if(section.lineItems && section.lineItems.length){
        section.lineItems.forEach(item => {
          wsData.push([
            "  " + (item.description||""),
            csi.csi,
            csi.bt,
            item.unit||"LS",
            item.qty||1,
            item.laborUnit || 0,
            item.materialUnit || 0,
            item.unitCost || 0,
            item.laborTotal || 0,
            item.materialTotal || 0,
            item.total || 0
          ]);
        });
      } else {
        // Fallback if line items failed to generate
        wsData.push([
          "  " + section.name,
          csi.csi,
          csi.bt,
          "LS",
          1,
          0,
          0,
          section.low||0,
          0,
          0,
          section.low||0
        ]);
      }
      
      // Section total row
      wsData.push(["", "", "", "", "", "", "", "", "", "Section Total:", section.low||0]);
      wsData.push([]); // Blank row
    });
    
    // ── GENERAL CONDITIONS ──
    wsData.push(["GENERAL CONDITIONS (" + (est.gcMonths||3) + " months)"]);
    const gcItems = est.generalConditions?.items || [];
    if(gcItems.length){
      gcItems.forEach(item => {
        wsData.push([
          "  " + (item.name||""),
          "01 00 00",
          "General Conditions",
          "Other",
          item.qty||1,
          item.unit||"LS",
          item.low||0,
          item.high||0,
          item.low||0,
          item.high||0
        ]);
      });
    }
    wsData.push(["", "", "", "", "", "", "", "GC Total:", est.gcLow||0, est.gcHigh||0]);
    wsData.push([]);
    wsData.push([]);
    
    // ── PROJECT TOTALS ──
    wsData.push(["PROJECT TOTALS"]);
    wsData.push(["Construction Subtotal", "", "", "", "", "", "", "", "", "", est.subtotalLow||0]);
    wsData.push(["General Conditions", "", "", "", "", "", "", "", "", "", est.gcLow||0]);
    wsData.push(["", "", "", "", "", "", "", "", "", "", ""]);
    wsData.push(["TOTAL PROJECT COST", "", "", "", "", "", "", "", "", "", est.totalLow||0]);
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    ws['!cols'] = [
      {wch: 40}, // Item Description
      {wch: 10}, // CSI Code
      {wch: 25}, // Cost Code
      {wch: 8},  // Unit
      {wch: 6},  // Qty
      {wch: 12}, // Labor $/Unit
      {wch: 12}, // Material $/Unit
      {wch: 12}, // Total $/Unit
      {wch: 12}, // Labor Total
      {wch: 12}, // Material Total
      {wch: 12}  // Line Total
    ];
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Estimate");
    
    // Generate Excel file and download
    const dt = new Date().toLocaleDateString().replace(/\//g,"-");
    const filename = (d.clientName||"CMB").replace(/\s+/g,"_") + "_" + dt + "_Estimate.xlsx";
    XLSX.writeFile(wb, filename);
    
    btn.textContent = originalText;
    btn.disabled = false;
    
  } catch(e){
    alert("Export failed: " + e.message);
    console.error(e);
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

function emailProposal(){
  const d = appData;
  const est = d.estimate;
  const subject = encodeURIComponent("Copper Mountain Builders — Conceptual Proposal for " + (d.projectAddress||"Your Project"));
  const body = encodeURIComponent(
`Dear ${d.clientName||"Client"},

Thank you for the opportunity to meet with you and discuss your project at ${d.projectAddress||"your property"}.

CONCEPTUAL BUDGET SUMMARY
${(est?.zones||[]).map(z => `  ${z.name}: ${fmt$(z.low)} – ${fmt$(z.high)}`).join("\n")}

TOTAL RANGE: ${fmt$(est?.totalLow||0)} – ${fmt$(est?.totalHigh||0)}
Design Retainer: ${fmt$(d.retainerAmount||0)}

${est?.summary||""}

NEXT STEPS
We look forward to working with you through our 5-Step Design-Build Program. Please review the attached signed agreement and contact us with any questions.

Copper Mountain Builders
PO Box 2471, Kalispell, MT 59903
www.coppermountainbuilders.com

*This is a conceptual budget prepared prior to design development. Actual costs will vary based on final drawings, material selections, site conditions, and contractor bids.`
  );
  window.location.href = `mailto:${d.clientEmail||""}?subject=${subject}&body=${body}`;
}

function generateProposalDocument(){
  const d = appData;
  const est = d.estimate;
  if(!est){ alert("Generate estimate first"); return; }
  
  // Helper function to format analysis text into readable sections
  function formatAnalysis(text) {
    if(!text) return '';
    
    const lines = text.split('\n').filter(line => line.trim());
    let html = '<div class="analysis-section">';
    
    for(let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this is a heading (all caps section, or ends with :)
      const isHeading = (line === line.toUpperCase() && line.length > 3 && line.length < 80) || 
                       (line.endsWith(':') && line.length < 100);
      
      // Check if this is a bullet point
      const isBullet = line.startsWith('-') || line.startsWith('•') || 
                      line.match(/^[0-9]+\./);
      
      if(isHeading) {
        // Close previous list if open
        if(i > 0 && lines[i-1] && (lines[i-1].startsWith('-') || lines[i-1].startsWith('•'))) {
          html += '</ul>';
        }
        html += '<div class="analysis-heading">' + esc(line.replace(/:/g, '')) + '</div>';
        
        // Check if next lines are bullets - if so, start a list
        if(i < lines.length - 1 && (lines[i+1].startsWith('-') || lines[i+1].startsWith('•'))) {
          html += '<ul class="analysis-list">';
        }
      } else if(isBullet) {
        // If not already in a list, start one
        if(i === 0 || (!lines[i-1].startsWith('-') && !lines[i-1].startsWith('•') && !lines[i-1].match(/^[0-9]+\./))) {
          html += '<ul class="analysis-list">';
        }
        html += '<li>' + esc(line.replace(/^[-•]\s*/, '').replace(/^[0-9]+\.\s*/, '')) + '</li>';
        
        // Close list if next line is not a bullet
        if(i === lines.length - 1 || (!lines[i+1].startsWith('-') && !lines[i+1].startsWith('•') && !lines[i+1].match(/^[0-9]+\./))) {
          html += '</ul>';
        }
      } else {
        // Regular paragraph
        html += '<p class="analysis-paragraph">' + esc(line) + '</p>';
      }
    }
    
    html += '</div>';
    return html;
  }
  
  const dt = new Date().toLocaleDateString();
  const filename = (d.clientName||"CMB").replace(/\s+/g,"_") + "_" + dt.replace(/\//g,"-") + "_Proposal.doc";
  
  // Create HTML document with Word-compatible formatting
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="ProgId" content="Word.Document">
  <meta name="Generator" content="Microsoft Word">
  <meta name="Originator" content="Microsoft Word">
  <style>
    @page {
      size: 8.5in 11in;
      margin: 1in;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #2C2A27;
      margin: 0;
      padding: 20px;
    }
    .cover-page {
      text-align: center;
      padding-top: 2in;
      page-break-after: always;
    }
    .company-name {
      font-size: 24pt;
      font-weight: bold;
      color: #B87333;
      letter-spacing: 3px;
      margin-bottom: 20px;
    }
    .doc-title {
      font-size: 18pt;
      font-weight: bold;
      color: #2C2A27;
      margin-bottom: 40px;
    }
    .cover-info {
      font-size: 12pt;
      margin: 10px 0;
    }
    h1 {
      font-size: 18pt;
      font-weight: bold;
      color: #B87333;
      margin-top: 30px;
      margin-bottom: 15px;
      page-break-after: avoid;
    }
    h2 {
      font-size: 14pt;
      font-weight: bold;
      color: #2C2A27;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    p {
      margin: 10px 0;
      text-align: justify;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      page-break-inside: avoid;
    }
    th {
      background-color: #B87333;
      color: white;
      font-weight: bold;
      padding: 10px;
      border: 1px solid #999;
      text-align: left;
    }
    td {
      padding: 8px 10px;
      border: 1px solid #CCCCCC;
    }
    tr:nth-child(even) {
      background-color: #F5F0E8;
    }
    .total-row {
      background-color: #F5F0E8;
      font-weight: bold;
    }
    .retainer-box {
      background-color: #FFF8E7;
      border: 2px solid #B87333;
      padding: 15px;
      margin: 20px 0;
      font-size: 13pt;
      font-weight: bold;
      text-align: center;
    }
    .section-content {
      margin-left: 20px;
      margin-bottom: 20px;
      white-space: pre-wrap;
    }
    .analysis-section {
      margin: 20px 0;
    }
    .analysis-heading {
      font-weight: bold;
      color: #B87333;
      font-size: 13pt;
      margin-top: 15px;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .analysis-list {
      margin: 5px 0 15px 25px;
      line-height: 1.7;
    }
    .analysis-list li {
      margin: 5px 0;
    }
    .analysis-paragraph {
      margin: 10px 0 10px 15px;
      line-height: 1.7;
    }
    .milestone {
      margin: 10px 0 10px 20px;
      padding-left: 20px;
      border-left: 3px solid #B87333;
    }
    .milestone-phase {
      font-weight: bold;
      color: #2C2A27;
    }
    .milestone-duration {
      color: #5C5850;
      font-style: italic;
    }
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>
  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="company-name">${esc(d.company||"COPPER MOUNTAIN BUILDERS").toUpperCase()}</div>
    <div class="doc-title">CONCEPTUAL DESIGN-BUILD PROPOSAL</div>
    <div class="cover-info"><strong>Client:</strong> ${esc(d.clientName||"")}</div>
    <div class="cover-info"><strong>Project:</strong> ${esc(d.projectAddress||"")}, ${esc(d.projectCity||"")}, MT</div>
    <div class="cover-info"><strong>Date:</strong> ${dt}</div>
    <div class="cover-info"><strong>Prepared by:</strong> ${esc(d.repName||"")}</div>
  </div>

  <!-- EXECUTIVE SUMMARY -->
  <h1>Executive Summary</h1>
  ${est.summary ? est.summary.split('\n').map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('') : '<p>No summary available.</p>'}
  
  <div class="page-break"></div>

  <!-- BUDGET SUMMARY -->
  <h1>Budget Summary</h1>
  <table>
    <thead>
      <tr>
        <th>Project Type</th>
        <th style="text-align:right;">Sq Ft</th>
        <th style="text-align:right;">Budget Low</th>
        <th style="text-align:right;">Budget High</th>
      </tr>
    </thead>
    <tbody>
      ${(est.zones||[]).map((z,i) => `
        <tr>
          <td>${esc(z.name||appData.zones[0]?.type||"")}</td>
          <td style="text-align:right;">${appData.zones[0]?.sqft||""}</td>
          <td style="text-align:right;">${fmt$(z.low||0)}</td>
          <td style="text-align:right;">${fmt$(z.high||0)}</td>
        </tr>
      `).join('')}
      <tr style="border-top: 2px solid #B87333;">
        <td colspan="2"><strong>Construction Subtotal</strong></td>
        <td style="text-align:right;"><strong>${fmt$(est.subtotalLow||0)}</strong></td>
        <td style="text-align:right;"><strong>${fmt$(est.subtotalHigh||0)}</strong></td>
      </tr>
      <tr>
        <td colspan="2">General Conditions (${est.gcMonths||3} months)</td>
        <td style="text-align:right;">${fmt$(est.gcLow||0)}</td>
        <td style="text-align:right;">${fmt$(est.gcHigh||0)}</td>
      </tr>
      <tr class="total-row" style="border-top: 2px solid #B87333;">
        <td colspan="2"><strong>TOTAL PROJECT COST</strong></td>
        <td style="text-align:right;"><strong>${fmt$(est.totalLow||0)}</strong></td>
        <td style="text-align:right;"><strong>${fmt$(est.totalHigh||0)}</strong></td>
      </tr>
    </tbody>
  </table>
  
  <div class="retainer-box">
    Design Retainer (Non-Refundable): ${fmt$(d.retainerAmount||0)}
  </div>

  ${est.siteAnalysis ? `
  <div class="page-break"></div>
  <h1>Site Analysis</h1>
  <p><em>Based on comprehensive photo analysis of existing conditions:</em></p>
  ${formatAnalysis(est.siteAnalysis)}
  ` : ''}

  ${est.complianceAnalysis ? `
  <div class="page-break"></div>
  <h1>Code Compliance & Permitting</h1>
  <p><em>Comprehensive review of Montana Building Code requirements and Flathead County permitting:</em></p>
  ${formatAnalysis(est.complianceAnalysis)}
  ` : ''}

  ${est.schedule && est.schedule.milestones && est.schedule.milestones.length > 0 ? `
  <div class="page-break"></div>
  <h1>Construction Schedule</h1>
  <p><strong>Total Duration:</strong> ${esc(est.schedule.startToFinish||"TBD")}</p>
  ${est.schedule.designPhase ? `<p><strong>Design Phase:</strong> ${esc(est.schedule.designPhase)}</p>` : ''}
  ${est.schedule.constructionPhase ? `<p><strong>Construction Phase:</strong> ${esc(est.schedule.constructionPhase)}</p>` : ''}
  <div class="section-content">
    ${(est.schedule.milestones||[]).map(m => `
      <div class="milestone">
        <div class="milestone-phase">${esc(m.phase)}</div>
        <div class="milestone-duration">${esc(m.duration)}</div>
        ${m.notes ? `<div>${esc(m.notes)}</div>` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="page-break"></div>
  <h1>Cost Breakdown by Trade</h1>
  <table>
    <thead>
      <tr>
        <th>Trade Section</th>
        <th style="text-align:right;">Low</th>
        <th style="text-align:right;">High</th>
      </tr>
    </thead>
    <tbody>
      ${(est.sections||[]).map(s => `
        <tr>
          <td>${esc(s.name)}</td>
          <td style="text-align:right;">${fmt$(s.low||0)}</td>
          <td style="text-align:right;">${fmt$(s.high||0)}</td>
        </tr>
      `).join('')}
      <tr style="border-top: 2px solid #B87333;">
        <td><strong>Construction Subtotal</strong></td>
        <td style="text-align:right;"><strong>${fmt$(est.subtotalLow||0)}</strong></td>
        <td style="text-align:right;"><strong>${fmt$(est.subtotalHigh||0)}</strong></td>
      </tr>
      <tr>
        <td>General Conditions (${est.gcMonths||3} months)</td>
        <td style="text-align:right;">${fmt$(est.gcLow||0)}</td>
        <td style="text-align:right;">${fmt$(est.gcHigh||0)}</td>
      </tr>
      <tr class="total-row" style="border-top: 2px solid #B87333;">
        <td><strong>TOTAL PROJECT COST</strong></td>
        <td style="text-align:right;"><strong>${fmt$(est.totalLow||0)}</strong></td>
        <td style="text-align:right;"><strong>${fmt$(est.totalHigh||0)}</strong></td>
      </tr>
    </tbody>
  </table>

</body>
</html>`;

  // Create blob and download as .doc file
  const blob = new Blob([html], {type: 'application/msword'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Image compression ─────────────────────────────────────────────────
async function compressImage(dataUrl, maxWidth=800, quality=0.7){
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width, h = img.height;
      if(w > maxWidth){ h = Math.round(h * maxWidth / w); w = maxWidth; }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl); // fallback to original
    img.src = dataUrl;
  });
}


// ── Clarifying answer helper ──────────────────────────────────────────
function setAnswer(qid, answer){
  if(!appData.clarifyingAnswers) appData.clarifyingAnswers = {};
  appData.clarifyingAnswers[qid] = answer;
  render();
}

// ── Voice to text ─────────────────────────────────────────────────────
let recognition = null;
let activeVoiceField = null;

function startVoice(zoneId, fieldKey, btnId){
  if(!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)){
    alert("Voice input not supported on this browser. Try Chrome.");
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(recognition){ recognition.stop(); }
  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = "en-US";
  const btn = document.getElementById(btnId);
  btn.classList.add("recording");
  btn.textContent = "🔴 Recording… tap to stop";
  recognition.onresult = (e) => {
    const transcript = Array.from(e.results).map(r=>r[0].transcript).join(" ");
    const zone = appData.zones.find(z=>z.id===zoneId);
    if(zone) zone[fieldKey] = (zone[fieldKey]||"") + " " + transcript;
    const ta = document.getElementById("notes_"+zoneId);
    if(ta) ta.value = zone[fieldKey];
  };
  recognition.onerror = () => { stopVoice(btnId); };
  recognition.onend = () => { stopVoice(btnId); };
  recognition.start();
  activeVoiceField = btnId;
}

function stopVoice(btnId){
  if(recognition){ recognition.stop(); recognition = null; }
  const btn = document.getElementById(btnId);
  if(btn){ btn.classList.remove("recording"); btn.innerHTML = "🎤 Voice Notes"; }
  activeVoiceField = null;
}

// ── Photo handling ───────────────────────────────────────────────────
async function handlePhotos(e, zoneId, type){
  const files = Array.from(e.target.files);
  const urls = await Promise.all(files.map(fileToDataURL));
  const zone = appData.zones.find(z=>z.id===zoneId);
  if(zone) zone[type] = [...(zone[type]||[]), ...urls];
  e.target.value = "";
  render();
}
function removePhoto(zoneId, type, idx){
  const zone = appData.zones.find(z=>z.id===zoneId);
  if(zone) zone[type] = zone[type].filter((_,i)=>i!==idx);
  render();
}

function photoSection(zoneId, type, label){
  const zone = appData.zones.find(z=>z.id===zoneId);
  const photos = (zone&&zone[type])||[];
  const camId = `cam_${zoneId}_${type}`;
  const libId = `lib_${zoneId}_${type}`;
  return `<div class="field">
    <label class="field-label">${label}</label>
    <div style="display:flex;gap:8px;margin-bottom:6px;">
      <input type="file" id="${camId}" accept="image/*" multiple capture="environment" style="display:none" onchange="handlePhotos(event,'${zoneId}','${type}')"/>
      <input type="file" id="${libId}" accept="image/*" multiple style="display:none" onchange="handlePhotos(event,'${zoneId}','${type}')"/>
      <button class="btn-small" onclick="document.getElementById('${camId}').click()">📷 Camera</button>
      <button class="btn-small" style="background:var(--stone-mid);border:1px solid var(--copper);" onclick="document.getElementById('${libId}').click()">🖼 Library</button>
    </div>
    <div class="img-row">${photos.map((src,i)=>`<div class="img-wrap"><img src="${src}" class="img-thumb" alt=""/><button class="img-remove" onclick="removePhoto('${zoneId}','${type}',${i})">✕</button></div>`).join("")}</div>
  </div>`;
}

// ── Signature pads ───────────────────────────────────────────────────
const sigPads = {};
function initSigPad(canvasId, sigKey){
  const canvas = document.getElementById(canvasId);
  if(!canvas || sigPads[canvasId]) return;
  const ctx = canvas.getContext("2d");
  if(appData[sigKey]){ const img=new Image(); img.onload=()=>ctx.drawImage(img,0,0,canvas.width,canvas.height); img.src=appData[sigKey]; }
  let drawing = false;
  function pos(e){ const rect=canvas.getBoundingClientRect(); const t=e.touches?e.touches[0]:e; return {x:(t.clientX-rect.left)*(canvas.width/rect.width),y:(t.clientY-rect.top)*(canvas.height/rect.height)}; }
  function start(e){ e.preventDefault(); drawing=true; const p=pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); }
  function move(e){ e.preventDefault(); if(!drawing)return; const p=pos(e); ctx.lineTo(p.x,p.y); ctx.strokeStyle=sigKey==="repSig"?"#b87333":"#f5f0e8"; ctx.lineWidth=2.5; ctx.lineCap="round"; ctx.stroke(); }
  function end(e){ e.preventDefault(); drawing=false; appData[sigKey]=canvas.toDataURL(); document.getElementById(canvasId+"_ph").style.display="none"; }
  canvas.addEventListener("mousedown",start); canvas.addEventListener("mousemove",move); canvas.addEventListener("mouseup",end);
  canvas.addEventListener("touchstart",start,{passive:false}); canvas.addEventListener("touchmove",move,{passive:false}); canvas.addEventListener("touchend",end,{passive:false});
  sigPads[canvasId]=true;
}
function clearSig(canvasId, sigKey){
  const c=document.getElementById(canvasId); if(c) c.getContext("2d").clearRect(0,0,c.width,c.height);
  appData[sigKey]=null; document.getElementById(canvasId+"_ph").style.display="block";
}
function sigBlock(canvasId, sigKey, label){
  return `<div class="field">
    <label class="field-label">${label}</label>
    <div class="sig-wrap"><canvas class="sig-canvas" id="${canvasId}" width="560" height="110"></canvas><div class="sig-placeholder" id="${canvasId}_ph">Sign here</div></div>
    <button class="btn-danger" onclick="clearSig('${canvasId}','${sigKey}')">Clear</button>
  </div>`;
}

// ── SCREENS ──────────────────────────────────────────────────────────

function renderClient(){
  const d = appData;
  return `<div class="page">

    <div class="card-copper">
      <div class="section-title">Client Information</div>
      <div class="field"><label class="field-label">Your Name (Rep)</label><input value="${esc(d.repName)}" placeholder="Your name" oninput="appData.repName=this.value"/></div>
      <div class="divider"></div>
      <div class="field"><label class="field-label">Client Full Legal Name(s)</label><input value="${esc(d.clientName)}" placeholder="As it will appear on the contract" oninput="appData.clientName=this.value"/></div>
      <div class="field"><label class="field-label">Client Email</label><input type="email" value="${esc(d.clientEmail)}" placeholder="email@example.com" oninput="appData.clientEmail=this.value"/></div>
      <div class="field"><label class="field-label">Client Phone</label><input type="tel" value="${esc(d.clientPhone)}" placeholder="(406) 555-0000" oninput="appData.clientPhone=this.value"/></div>
      <div class="divider"></div>
      <div class="field"><label class="field-label">Client Mailing Address</label><input value="${esc(d.clientAddress)}" placeholder="Street address" oninput="appData.clientAddress=this.value"/></div>
      <div class="row2">
        <div class="field"><label class="field-label">City</label><input value="${esc(d.clientCity)}" placeholder="Kalispell" oninput="appData.clientCity=this.value"/></div>
        <div class="field"><label class="field-label">ZIP</label><input value="${esc(d.clientZip)}" placeholder="59901" oninput="appData.clientZip=this.value"/></div>
      </div>
      <div class="divider"></div>
      <div class="field"><label class="field-label">Project Address</label><input value="${esc(d.projectAddress)}" placeholder="Site address" oninput="appData.projectAddress=this.value"/></div>
      <div class="field"><label class="field-label">Project City</label><input value="${esc(d.projectCity)}" placeholder="Kalispell" oninput="appData.projectCity=this.value"/></div>
    </div>
    <button class="btn-primary" onclick="if(appData.clientName&&appData.projectAddress&&appData.repName){goTo(1)}else{alert('Please fill in your name, client name, and project address.')}">Next: Project Scope →</button>
  </div>`;
}

function renderScope(){
  // Ensure at least one zone exists
  if(!appData.zones || appData.zones.length === 0){
    appData.zones = [{id:'z_default', type:'', sqft:'', notes:'', photosBefore:[], photosInspo:[]}];
  }
  const z = appData.zones[0];

  return `<div class="page">
    <div class="card">
      <div class="section-title">Overall Project Notes</div>
      <div class="field"><textarea placeholder="General observations, priorities, timeline, special conditions, client goals…" oninput="appData.projectNotes=this.value">${esc(appData.projectNotes)}</textarea></div>
    </div>

    <div class="zone-card">
      <div class="section-title">Project Details</div>
      <div class="field"><label class="field-label">Project Type</label>
        <select onchange="appData.zones[0].type=this.value">
          <option value="">Select project type…</option>
          ${ZONE_TYPES.map(t=>`<option ${z.type===t?"selected":""}>${esc(t)}</option>`).join("")}
        </select>
      </div>
      <div class="field"><label class="field-label">Estimated Square Footage (optional)</label>
        <input type="number" value="${esc(z.sqft)}" placeholder="e.g. 2400" oninput="appData.zones[0].sqft=this.value"/>
      </div>
      <div class="field">
        <label class="field-label">Site Walk Notes — capture everything as you go</label>
        <button class="voice-btn" id="voice_${z.id}" onclick="activeVoiceField==='voice_${z.id}'?stopVoice('voice_${z.id}'):startVoice('${z.id}','notes','voice_${z.id}')">🎤 Voice Notes</button>
        <textarea id="notes_${z.id}" placeholder="Describe everything — existing conditions, scope of work, client wishes, quantities (e.g. 23 windows), special features, materials to keep or remove…" oninput="appData.zones[0].notes=this.value">${esc(z.notes)}</textarea>
      </div>
      ${photoSection(z.id,"photosBefore","Current Conditions Photos")}
      ${photoSection(z.id,"photosInspo","Client Inspiration / Pinterest Photos")}
      ${docSection("zone",z.id,"Project Documents (Drawings, Specs, Plans)")}
    </div>

    ${appData.zones[0].type || appData.zones[0].notes ? `
    <div class="card-copper">
      <div class="section-title">⚡ AI Site Analysis</div>
      <p style="font-size:13px;color:var(--cream-dk);line-height:1.7;margin-bottom:12px;">
        Claude will analyze your photos and notes, then ask targeted follow-up questions to fill in any gaps before estimating — things like window sizes, finish selections, or structural unknowns.
      </p>
      <div id="analyze-error" class="error-msg hidden"></div>
      <p id="analyze-status" style="font-size:13px;color:var(--gold);min-height:18px;margin-bottom:8px;"></p>
      <button id="analyze-btn" class="btn-secondary" onclick="runAnalyzeScope()">⚡ Analyze & Ask</button>
    </div>

    ${(appData.clarifyingQuestions||[]).length > 0 ? `
    <div class="card">
      <div class="section-title">Follow-Up Questions</div>
      <p style="font-size:12px;color:var(--stone-light);margin-bottom:14px;">Answer these before generating the estimate for best accuracy. The more you answer, the tighter the range.</p>
      ${appData.clarifyingQuestions.map((q,qi) => {
        const ans = (appData.clarifyingAnswers||{})[q.id]||"";
        const qid = esc(q.id);
        return `
        <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid rgba(92,88,80,0.3);">
          <p style="font-size:13px;color:var(--cream);margin-bottom:8px;line-height:1.5;">${qi+1}. ${esc(q.question)}</p>
          ${q.type==="yesno" ? `
            <div style="display:flex;gap:8px;">
              <button class="btn-small" onclick="setAnswer('${qid}','Yes')"
                style="${ans==="Yes"?"background:var(--copper);color:var(--stone);":""}">Yes</button>
              <button class="btn-small" onclick="setAnswer('${qid}','No')"
                style="${ans==="No"?"background:var(--copper);color:var(--stone);":""}">No</button>
              <button class="btn-small" onclick="setAnswer('${qid}','Unknown')"
                style="${ans==="Unknown"?"background:var(--stone-light);":""}">Unknown</button>
            </div>
          ` : q.type==="choice" ? `
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${(q.options||[]).map(opt=>`
                <button class="btn-small"
                  onclick="setAnswer('${qid}', this.dataset.val)"
                  data-val="${esc(opt)}"
                  style="${ans===opt?"background:var(--copper);color:var(--stone);":""}">
                  ${esc(opt)}
                </button>
              `).join("")}
            </div>
          ` : `
            <textarea style="min-height:60px;font-size:13px;"
              placeholder="Your answer…"
              oninput="(appData.clarifyingAnswers=appData.clarifyingAnswers||{})['${qid}']=this.value">${esc(ans)}</textarea>
          `}
        </div>`;
      }).join("")}
    </div>
    ` : ""}
    ` : ""}

    <div style="height:8px"></div>
    <button class="btn-primary" onclick="if(appData.zones[0].type){goTo(2)}else{alert('Please select a project type.')}">Next: Generate Estimate →</button>
    <button class="btn-secondary" onclick="goTo(0)">← Back</button>
  </div>`;
}

function renderEstimate(){
  const est = appData.estimate;
  if(!est) return `<div class="page">
    <div class="card-copper">
      <div class="section-title">AI Estimate Generation</div>
      <p style="color:var(--cream-dk);font-size:14px;line-height:1.7;margin-bottom:20px;">Claude will analyze your project details and generate a realistic conceptual budget range for the Flathead Valley market.</p>
      <div id="est-error" class="error-msg hidden"></div>
      <button class="btn-primary" id="gen-est-btn" onclick="runGenerateEstimate()">✦ Generate AI Estimate</button>
    </div>
    <button class="btn-secondary" onclick="goTo(1)">← Back</button>
  </div>`;

  const suggested = calcRetainerSuggestion(est.totalLow);
  return `<div class="page">
    <div style="background:var(--stone);border-radius:10px;padding:16px;margin-bottom:16px;border:1px solid rgba(201,168,76,0.3);">
      <div class="section-title" style="color:var(--gold);border-color:rgba(201,168,76,0.3);">Estimate Summary</div>
      <p style="font-size:14px;line-height:1.8;color:var(--cream);margin-bottom:16px;">${esc(est.summary)}</p>
      <div style="display:flex;gap:16px;text-align:center;">
        <div style="flex:1;"><div class="field-label">Total Low</div><div class="big-num">${fmt$(est.totalLow)}</div></div>
        <div style="width:1px;background:var(--stone-light)"></div>
        <div style="flex:1;"><div class="field-label">Total High</div><div class="big-num">${fmt$(est.totalHigh)}</div></div>
      </div>
    </div>
    <div class="card">
      <div class="section-title">Project Budget (Editable)</div>
      ${est.zones.map((z,i)=>`
        <div style="margin-bottom:16px;">
          <div style="color:var(--copper-lt);font-size:13px;font-weight:bold;margin-bottom:8px;">${esc(z.name)}</div>
          <div class="row2">
            <div class="field"><label class="field-label">Low ($)</label><input type="number" value="${z.low}" oninput="appData.estimate.zones[${i}].low=Number(this.value);appData.estimate.subtotalLow=appData.estimate.zones.reduce((s,z)=>s+z.low,0);appData.estimate.totalLow=appData.estimate.subtotalLow+(appData.estimate.gcLow||0);document.getElementById('tot-low').textContent=fmt$(appData.estimate.totalLow)"/></div>
            <div class="field"><label class="field-label">High ($)</label><input type="number" value="${z.high}" oninput="appData.estimate.zones[${i}].high=Number(this.value);appData.estimate.subtotalHigh=appData.estimate.zones.reduce((s,z)=>s+z.high,0);appData.estimate.totalHigh=appData.estimate.subtotalHigh+(appData.estimate.gcHigh||0);document.getElementById('tot-high').textContent=fmt$(appData.estimate.totalHigh)"/></div>
          </div>
          <p style="font-size:12px;color:var(--stone-light);">${esc(z.notes)}</p>
        </div>
      `).join("")}
      <div class="estimate-row" style="border:none;">
        <span style="font-weight:bold;">TOTAL</span>
        <span><span id="tot-low" style="color:var(--gold);font-weight:bold;">${fmt$(est.totalLow)}</span> — <span id="tot-high" style="color:var(--gold);font-weight:bold;">${fmt$(est.totalHigh)}</span></span>
      </div>
    </div>
    ${est.sections&&est.sections.length?`
    <div class="card">
      <div class="section-title">Scope of Work — By Trade</div>
      ${est.sections.map((s,si)=>`
        <div style="margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(184,115,51,0.3);">
            <div>
              <span style="font-size:13px;font-weight:bold;color:var(--copper);">${esc(s.name)}</span>
              <span style="font-size:10px;color:var(--stone-light);margin-left:8px;">${esc(s.csiCode||"")}</span>
            </div>
            <span style="font-size:13px;color:var(--gold);font-weight:bold;">${fmt$(s.low)} – ${fmt$(s.high)}</span>
          </div>
          <div id="expand-${si}" style="padding-left:8px;margin-top:4px;">
            ${s.lineItems&&s.lineItems.length?s.lineItems.map(item=>`
              <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(92,88,80,0.15);">
                <span style="font-size:12px;color:var(--cream-dk);flex:1;padding-right:8px;">${esc(item.description)}</span>
                <span style="font-size:11px;color:var(--stone-light);white-space:nowrap;">
          ${item.qty} ${esc(item.unit||"LS")} &nbsp;|&nbsp;
          ${item.laborUnit!=null?`L: $${Number(item.laborUnit).toLocaleString()}/u`:""}
          ${item.materialUnit!=null?` M: $${Number(item.materialUnit).toLocaleString()}/u`:""}
          &nbsp;= <strong style="color:var(--cream);">$${Number(item.total||item.totalLow||0).toLocaleString()}</strong>
        </span>
              </div>
            `).join(""):""}
          </div>
          <button id="expand-btn-${si}" class="btn-small" style="margin-top:6px;font-size:11px;background:transparent;border:1px solid var(--stone-light);color:var(--stone-light);" onclick="expandSection(${si})">
            ${s.lineItems&&s.lineItems.length?"↻ Refresh line items":"＋ Expand line items"}
          </button>
        </div>
      `).join("")}
    </div>`:""}
    ${(est.gcLow||est.generalConditions)?`
    <div class="card">
      <div class="section-title">General Conditions (${est.gcMonths||est.generalConditions?.months||1} month${(est.gcMonths||est.generalConditions?.months||1)>1?"s":""})</div>
      ${(est.generalConditions?.items||[]).map(item=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(92,88,80,0.15);">
          <span style="font-size:12px;color:var(--cream-dk);">${esc(item.name)}</span>
          <span style="font-size:12px;color:var(--cream);">${fmt$(item.low)} – ${fmt$(item.high)}</span>
        </div>
      `).join("")}
      <div style="display:flex;justify-content:space-between;padding:8px 0;">
        <span style="font-size:13px;font-weight:bold;color:var(--copper-lt);">GC Total</span>
        <span style="font-size:13px;color:var(--copper-lt);font-weight:bold;">${fmt$(est.gcLow||est.generalConditions?.low||0)} – ${fmt$(est.gcHigh||est.generalConditions?.high||0)}</span>
      </div>
    </div>`:""}

    <div class="card">
      <div class="field">
        <label class="field-label">Design Retainer Amount ($)</label>
        <input type="number" value="${appData.retainerAmount||suggested}" oninput="appData.retainerAmount=this.value"/>
        <p class="retainer-suggestion">Suggested: ${fmt$(suggested)} based on project size</p>
      </div>
    </div>
    ${est.schedule?`
    <div class="card">
      <div class="section-title">Construction Schedule</div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(184,115,51,0.3);margin-bottom:10px;">
        <span style="font-size:13px;color:var(--cream-dk);">Estimated Duration</span>
        <span style="font-size:14px;color:var(--gold);font-weight:bold;">${esc(est.schedule.startToFinish||est.schedule.totalMonths+" months")}</span>
      </div>
      ${(est.schedule.milestones||[]).map((m,mi)=>`
        <div style="display:flex;gap:12px;align-items:flex-start;padding:6px 0;border-bottom:1px solid rgba(92,88,80,0.15);">
          <span style="font-size:11px;color:var(--copper);font-weight:bold;min-width:20px;">${mi+1}</span>
          <div style="flex:1;">
            <div style="font-size:13px;color:var(--cream);">${esc(m.phase)}</div>
            <div style="font-size:11px;color:var(--stone-light);">${esc(m.duration)}${m.notes?" — "+esc(m.notes):""}</div>
          </div>
        </div>
      `).join("")}
    </div>`:""}
    ${est.siteAnalysis?`
    <div class="card">
      <div class="section-title">📸 Site Analysis (From Photos)</div>
      <p style="font-size:13px;color:var(--cream-dk);line-height:1.8;white-space:pre-wrap;">${esc(est.siteAnalysis)}</p>
    </div>`:""}
    ${est.complianceAnalysis?`
    <div class="card" style="border-color:rgba(201,168,76,0.5);">
      <div class="section-title" style="color:var(--gold);">📋 Code Compliance & Permitting Review</div>
      <p style="font-size:13px;color:var(--cream-dk);line-height:1.8;white-space:pre-wrap;">${esc(est.complianceAnalysis)}</p>
    </div>`:""}
    ${est.complianceNotes&&est.complianceNotes.length?`
    <div class="card" style="border-color:rgba(201,168,76,0.5);">
      <div class="section-title" style="color:var(--gold);">⚠ Contractor & Code Notes (Rep Only)</div>
      <p style="font-size:11px;color:var(--stone-light);margin-bottom:12px;">These notes are for your review only and do not appear on the client document.</p>
      ${est.complianceNotes.map(note=>`
        <div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid rgba(92,88,80,0.2);">
          <span style="color:var(--gold);font-size:14px;flex-shrink:0;">⚠</span>
          <span style="font-size:13px;color:var(--cream-dk);line-height:1.6;">${esc(note)}</span>
        </div>
      `).join("")}
    </div>`:""}
    <div id="est-error" class="error-msg hidden"></div>
    <button class="btn-secondary" onclick="appData.estimate=null;render()">↻ Regenerate</button>
    <button class="btn-primary" onclick="goTo(3)">Next: Review & Sign →</button>
    <button class="btn-secondary" onclick="goTo(1)">← Back</button>
  </div>`;
}

function renderReview(){
  const est = appData.estimate;
  const d = appData;
  const dt = today();
  return `<div class="page">
    <div class="card-copper" style="text-align:center;">
      <div style="font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--copper);margin-bottom:6px;">Copper Mountain Builders</div>
      <div style="font-size:17px;margin-bottom:2px;">Conceptual Design-Build Proposal</div>
      <div style="font-size:12px;color:var(--stone-light);">${dt}</div>
    </div>
    <div class="card">
      <div class="section-title">Client & Project</div>
      <div class="estimate-row"><span style="color:var(--stone-light);font-size:13px;">Client</span><span>${esc(d.clientName)}</span></div>
      <div class="estimate-row"><span style="color:var(--stone-light);font-size:13px;">Project</span><span>${esc(d.projectAddress)}, ${esc(d.projectCity)}, MT</span></div>
      <div class="estimate-row" style="border:none;"><span style="color:var(--stone-light);font-size:13px;">Rep</span><span>${esc(d.repName)}</span></div>
    </div>
    ${est?`<div class="card">
      <div class="section-title">Conceptual Budget</div>
      ${est.zones.map(z=>`<div class="estimate-row"><span style="font-size:13px;color:var(--cream-dk);">${esc(z.name)}</span><span style="color:var(--gold);font-size:13px;">${fmt$(z.low)} – ${fmt$(z.high)}</span></div>`).join("")}
      <div class="estimate-row" style="border:none;padding-top:12px;"><span style="font-weight:bold;font-size:14px;">TOTAL RANGE</span><span style="font-weight:bold;font-size:16px;color:var(--gold);">${fmt$(est.totalLow)} – ${fmt$(est.totalHigh)}</span></div>
      <div class="estimate-row"><span style="font-size:13px;color:var(--copper-lt);">Design Retainer</span><span style="color:var(--copper-lt);font-size:14px;">${fmt$(d.retainerAmount||0)}</span></div>
    </div>`:""}
    <div class="card" style="border-color:rgba(184,115,51,0.4);">
      <div class="section-title">Design-Build Agreement</div>
      <div style="background:rgba(44,42,39,0.5);border-radius:8px;padding:16px;margin-bottom:16px;max-height:400px;overflow-y:auto;font-size:13px;line-height:1.8;color:var(--cream-dk);">
        <p style="margin-bottom:12px;">Thank you for choosing <strong style="color:var(--copper);">Copper Mountain Builders</strong> for your home project in the Flathead Valley. This Agreement clearly explains what we will do for you, what you can expect, how we work together, and how we protect both of us.</p>

        <p style="color:var(--copper);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:16px 0 8px 0;">1. What We Will Do for You</p>
        <p style="margin-bottom:8px;">We will provide professional preconstruction design services using our proven <strong>5-Step Design-Build Program</strong> (see Exhibit A). Steps Covered: Step 1 – Initial Consultation + Vision Planning · Step 2 – Schematic Design · Step 3 – Design Development · Step 4 – Project Development. Step 5 (construction) is handled under a separate full construction contract. We have the first right of refusal to build your project.</p>

        <p style="color:var(--copper);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:16px 0 8px 0;">2. Your Investment (Compensation)</p>
        <p style="margin-bottom:4px;">Hourly rates include a 20% markup for overhead and management:</p>
        <p style="margin-bottom:8px;">· Principal / General Management: <strong>$250.00/hr</strong><br/>· Architectural Design Services: <strong>$250.00/hr</strong><br/>· Consultants / Specialty Engineering: <strong>$250.00/hr</strong><br/>· Interior/Exterior Designer: <strong>$150.00/hr</strong></p>
        <p style="margin-bottom:8px;"><strong>Initial Non-Refundable Retainer:</strong> ${fmt$(d.retainerAmount||0)} — payable when you sign and applied to your first invoice(s). Invoices are sent monthly or at phase milestones. Payment is due within <strong>10 calendar days</strong>. Late payments accrue interest at 1.5% per month (or the maximum allowed by Montana law). Final design documents are released only after all outstanding amounts are paid in full.</p>

        <p style="color:var(--copper);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:16px 0 8px 0;">3. How Long This Lasts &amp; What Happens if We Stop Early</p>
        <p style="margin-bottom:8px;">This Agreement begins on the date signed and continues until we complete Steps 1–4, or until one of us ends it with <strong>14 days written notice</strong>. If the Agreement ends early: you pay for all work completed and expenses incurred; you pay a <strong>Termination Fee</strong> of 10% of the estimated construction cost (minimum $5,000); all design materials must be returned or destroyed. If you later use our designs with another contractor without written permission and full payment, you owe a <strong>Design Licensing Fee</strong> equal to <strong>200% of total design fees</strong> paid or estimated.</p>

        <p style="color:var(--copper);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:16px 0 8px 0;">4. Who Owns the Designs</p>
        <p style="margin-bottom:8px;">All drawings, renderings, plans, and materials we create belong entirely to us and are protected by copyright law. You receive no right to copy, modify, or use the designs for construction until: (a) you have paid all fees in full, AND (b) you have signed the full construction contract with us OR paid the Design Licensing Fee. Unauthorized use is copyright infringement. We may file a mechanic's lien on your property for any unpaid amounts.</p>

        <p style="color:var(--copper);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:16px 0 8px 0;">5. Our Promises to You</p>
        <p style="margin-bottom:8px;">· We perform all work to the professional standard of care expected in Montana.<br/>· We maintain appropriate insurance (proof available upon request).<br/>· We are an independent contractor (no employment relationship).<br/>· We follow all required Montana residential construction disclosures (see Exhibit B).</p>

        <p style="color:var(--copper);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:16px 0 8px 0;">6. Your Protections</p>
        <p style="margin-bottom:8px;">· Our total liability to you is limited to the total fees you paid us.<br/>· Both sides agree to keep each other's information confidential.<br/>· Either side may end the Agreement with proper notice and payment for work done.</p>

        <p style="color:var(--copper);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:16px 0 8px 0;">7. How We Communicate</p>
        <p style="margin-bottom:8px;">All notices must be in writing. Our address: Copper Mountain Builders, PO Box 2471, Kalispell, MT 59903. Notices are considered delivered when personally handed, two days after registered mail, or the next business day after overnight courier.</p>

        <p style="color:var(--copper);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:16px 0 8px 0;">8. Other Important Information</p>
        <p style="margin-bottom:8px;">· This Agreement (plus Exhibits) is the complete understanding between us.<br/>· Any changes must be in writing and signed by both of us.<br/>· Time is important — we will both work to keep your project moving.<br/>· Montana law governs this Agreement. Any disputes will first go to mediation, then Flathead County District Court if needed. The winning side can recover reasonable attorney fees.</p>

        <p style="color:var(--copper);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:16px 0 8px 0;">Exhibit A — 5-Step Design-Build Program</p>
        <p style="margin-bottom:4px;"><strong>STEP 1 – Initial Consultation + Vision Planning:</strong> We evaluate your site, foundation needs, timeline, and scope. Two client meetings to discover your vision and architectural inspiration. Your Assignment: Floor plan + material selection; we explain Buildertrend.</p>
        <p style="margin-bottom:4px;"><strong>STEP 2 – Schematic Design:</strong> Early structural, environmental, and energy code considerations. Two client meetings to finalize floor plans. Your Assignment: Interior selections (cabinetry, fixtures, trim, doors/windows).</p>
        <p style="margin-bottom:4px;"><strong>STEP 3 – Design Development:</strong> We finalize floor plans, elevations, sections, and all materials with renderings. Two client meetings for side-by-side review. Plans signed off and sent to engineering.</p>
        <p style="margin-bottom:4px;"><strong>STEP 4 – Project Development:</strong> Budgeting, scheduling, Scope of Work, subcontractor bids, material pricing, permits, and site-prep costs. All trade bids finalized.</p>
        <p style="margin-bottom:8px;"><strong>STEP 5 – Construction + Post-Build Support:</strong> Performed only under a separate full construction contract.</p>

        <p style="color:var(--copper);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:16px 0 8px 0;">Exhibit B — Insurance &amp; Montana Disclosures</p>
        <p style="margin-bottom:8px;">We maintain general liability insurance and appropriate workers' compensation coverage (or exemption) as required by law. Montana Residential Construction Disclosures: We provide a one-year express warranty on workmanship and materials (detailed in the full construction contract). Full insurance certificates and additional disclosures are available upon request.</p>
      </div>
      <div class="divider"></div>
      ${sigBlock("sig_client","clientSig","Client Signature")}
      <div class="row2">
        <div class="field"><label class="field-label">Print Name</label><input value="${esc(d.clientPrintName||d.clientName)}" oninput="appData.clientPrintName=this.value"/></div>
        <div class="field"><label class="field-label">Date</label><input value="${dt}" readonly style="opacity:0.7"/></div>
      </div>
      <div class="divider"></div>
      ${sigBlock("sig_rep","repSig","Contractor Signature")}
      <div class="field"><label class="field-label">Rep Printed Name & Title</label><input value="${esc(d.repPrintName||d.repName)}" oninput="appData.repPrintName=this.value"/></div>
    </div>
    <button class="btn-primary" onclick="window.print();fullSave()">🖨 Print & Save Document</button>
    <div class="card" style="margin-top:8px;">
      <div class="section-title">Export & Share</div>
      <button class="btn-secondary" onclick="emailProposal()" style="margin-bottom:8px;">📧 Email Proposal to Client</button>
      <button class="btn-secondary" onclick="exportExcel()" style="margin-bottom:8px;">📊 Download Estimate for Buildertrend (CSV/Excel)</button>
      <button class="btn-secondary" onclick="generateProposalDocument()" style="margin-bottom:8px;">📄 Download Proposal Document</button>
      <button class="btn-secondary" onclick="fullSave()">🗂 Save Visit to App</button>
      <div style="border-top:1px solid rgba(92,88,80,0.4);margin-top:12px;padding-top:12px;">
        <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--stone-light);margin-bottom:8px;">OneDrive</div>
        <button id="od-connect-btn" class="btn-secondary" style="margin-bottom:8px;width:100%;font-size:13px;" onclick="odSignIn()">☁ Connect OneDrive</button>
        <button class="btn-secondary" style="width:100%;background:rgba(45,106,79,0.15);border:1px solid rgba(45,106,79,0.5);color:#7ec8a4;font-size:13px;" onclick="syncVisitToOneDrive()" id="od-sync-btn">☁ Sync This Visit to OneDrive</button>
        <p style="font-size:11px;color:var(--stone-light);margin-top:6px;line-height:1.5;">Saves visit JSON + signed proposal to your OneDrive under CMB Site Visits/{Year}/</p>
      </div>
    </div>
    <button class="btn-secondary" onclick="goTo(2)">← Back</button>
  </div>`;
}

// ── Print document ────────────────────────────────────────────────────
function renderPrintDoc(){
  const d = appData; const est = d.estimate; const dt = today();
  return `<div class="print-doc" id="print-doc" style="background:white;color:#111;font-family:Georgia,serif;padding:40px;max-width:800px;margin:0 auto;">
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #b87333;padding-bottom:20px;margin-bottom:24px;">
      <img src="./cmb-logo.jpg" style="height:60px;width:auto;" alt="Copper Mountain Builders"/>
      <div style="text-align:right;">
        <div style="font-size:16px;color:#333;">Conceptual Design-Build Proposal</div>
        <div style="font-size:12px;color:#888;">${dt}</div>
        <div style="font-size:12px;color:#888;">PO Box 2471, Kalispell, MT 59903</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;">
      <div><div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#b87333;margin-bottom:8px;">Client</div>
        <div style="font-weight:bold;">${esc(d.clientName)}</div>
        <div style="font-size:13px;color:#555;">${esc(d.clientAddress)}, ${esc(d.clientCity)}, MT ${esc(d.clientZip)}</div>
        <div style="font-size:13px;color:#555;">${esc(d.clientEmail)}</div>
        <div style="font-size:13px;color:#555;">${esc(d.clientPhone)}</div>
      </div>
      <div><div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#b87333;margin-bottom:8px;">Project</div>
        <div style="font-weight:bold;">${esc(d.projectAddress)}</div>
        <div style="font-size:13px;color:#555;">${esc(d.projectCity)}, Montana</div>
        <div style="font-size:13px;color:#555;margin-top:8px;">Rep: ${esc(d.repName)}</div>
      </div>
    </div>
    ${est?`<div style="margin-bottom:24px;">
      <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#b87333;margin-bottom:12px;border-bottom:1px solid #e0d0b0;padding-bottom:6px;">Conceptual Budget Estimate</div>
      <p style="font-size:13px;color:#555;margin-bottom:16px;line-height:1.7;">${esc(est.summary)}</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px;">
        <thead><tr style="background:#f5f0e8;"><th style="text-align:left;padding:8px 10px;color:#b87333;">Project</th><th style="text-align:right;padding:8px 10px;color:#b87333;">Low</th><th style="text-align:right;padding:8px 10px;color:#b87333;">High</th></tr></thead>
        <tbody>
          ${est.zones.map(z=>`<tr style="border-bottom:1px solid #e8e0d0;"><td style="padding:8px 10px;">${esc(z.name)}</td><td style="padding:8px 10px;text-align:right;">${fmt$(z.low)}</td><td style="padding:8px 10px;text-align:right;">${fmt$(z.high)}</td></tr>`).join("")}
          <tr style="background:#f5f0e8;font-weight:bold;"><td style="padding:10px;">TOTAL RANGE</td><td style="padding:10px;text-align:right;color:#b87333;">${fmt$(est.totalLow)}</td><td style="padding:10px;text-align:right;color:#b87333;">${fmt$(est.totalHigh)}</td></tr>
        </tbody>
      </table>
      ${est.sections&&est.sections.length?`
        ${est.sections.map(s=>`
          <div style="margin-bottom:14px;page-break-inside:avoid;">
            <div style="display:flex;justify-content:space-between;background:#f5f0e8;padding:6px 10px;margin-bottom:4px;">
              <span style="font-size:12px;font-weight:bold;color:#b87333;">${esc(s.name)}</span>
              <span style="font-size:12px;font-weight:bold;color:#b87333;">${fmt$(s.low)} – ${fmt$(s.high)}</span>
            </div>
            ${s.lineItems&&s.lineItems.length?`
              <table style="width:100%;border-collapse:collapse;font-size:11px;">
                <tbody>${s.lineItems.map(item=>`
                  <tr style="border-bottom:1px solid #f0ebe0;">
                    <td style="padding:4px 10px;color:#444;">${esc(item.description)}</td>
                    <td style="padding:4px 8px;text-align:center;color:#888;">${item.qty} ${esc(item.unit)}</td>
                    <td style="padding:4px 8px;text-align:right;color:#888;">$${Number(item.unitCost).toLocaleString()}</td>
                    <td style="padding:4px 10px;text-align:right;color:#333;">$${Number(item.total).toLocaleString()}</td>
                  </tr>
                `).join("")}</tbody>
              </table>
            `:""}
          </div>
        `).join("")}
      `:""}
      <div style="padding:10px 14px;background:#f5f0e8;border-radius:6px;display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:13px;color:#555;">Design Retainer (Non-Refundable)</span>
        <span style="font-size:14px;font-weight:bold;color:#b87333;">${fmt$(d.retainerAmount||0)}</span>
      </div>
      ${getAllDocs().length>0?`<div style="margin-top:12px;padding:10px 14px;background:#f5f0e8;border-radius:6px;"><p style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#b87333;margin-bottom:6px;">Documents Reviewed</p>${getAllDocs().map(doc=>`<p style="font-size:12px;color:#555;">📎 ${esc(doc.name)} <span style="color:#999;">(${esc(doc.source)})</span></p>`).join("")}</div>`:""}
      <p style="font-size:11px;color:#888;font-style:italic;margin-top:10px;">*Conceptual estimate only. Final pricing determined after full design development (Steps 1–4).</p>
    </div>`:""}
    ${(d.zones||[]).map(z=>`<div style="margin-bottom:24px;page-break-inside:avoid;">
      ${z.photosInspo&&z.photosInspo.length?`
        <div>
          <p style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#b87333;margin-bottom:6px;">Client Inspiration</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">${z.photosInspo.slice(0,3).map(s=>`<img src="${s}" style="width:110px;height:110px;object-fit:cover;border-radius:6px;" alt=""/>`).join("")}</div>
        </div>
      `:""}
    </div>`).join("")}
    <div style="border-top:2px solid #b87333;padding-top:24px;margin-top:24px;">
      <div style="font-size:14px;font-weight:bold;margin-bottom:12px;">Design-Build Agreement</div>
      <p style="font-size:12px;color:#444;line-height:1.8;margin-bottom:16px;">Thank you for choosing <strong>Copper Mountain Builders</strong> for your home project in the Flathead Valley. This Agreement clearly explains what we will do for you, what you can expect, how we work together, and how we protect both of us.</p>

      <p style="font-size:11px;font-weight:bold;color:#b87333;letter-spacing:2px;text-transform:uppercase;margin:14px 0 6px 0;">1. What We Will Do for You</p>
      <p style="font-size:12px;color:#444;line-height:1.8;margin-bottom:8px;">We will provide professional preconstruction design services using our proven 5-Step Design-Build Program (see Exhibit A). Steps Covered: Step 1 – Initial Consultation + Vision Planning · Step 2 – Schematic Design · Step 3 – Design Development · Step 4 – Project Development. Step 5 (actual construction and post-build support) is handled under a separate full construction contract that we will present when the design is complete. We have the first right of refusal to build your project. We include two client meetings per phase in Steps 1–3 and all coordination of surveys, engineering, renderings, and bidding packages.</p>

      <p style="font-size:11px;font-weight:bold;color:#b87333;letter-spacing:2px;text-transform:uppercase;margin:14px 0 6px 0;">2. Your Investment (Compensation)</p>
      <p style="font-size:12px;color:#444;line-height:1.8;margin-bottom:4px;">We charge a clear hourly rate that includes a 20% markup for overhead and management:</p>
      <p style="font-size:12px;color:#444;line-height:1.8;margin-bottom:8px;">· Principal / General Management: $250.00 per hour<br/>· Architectural Design Services: $250.00 per hour<br/>· Consultants / Specialty Engineering: $250.00 per hour<br/>· Interior/Exterior Designer: $150.00 per hour</p>
      <p style="font-size:12px;color:#444;line-height:1.8;margin-bottom:8px;"><strong>Initial Non-Refundable Retainer: ${fmt$(d.retainerAmount||0)}</strong> — payable when you sign and applied to your first invoice(s). Invoices are sent monthly or at phase milestones. Payment is due within 10 calendar days. Late payments accrue interest at 1.5% per month (or the maximum allowed by Montana law). Final design documents are released only after all outstanding amounts are paid in full.</p>

      <p style="font-size:11px;font-weight:bold;color:#b87333;letter-spacing:2px;text-transform:uppercase;margin:14px 0 6px 0;">3. How Long This Lasts &amp; What Happens if We Stop Early</p>
      <p style="font-size:12px;color:#444;line-height:1.8;margin-bottom:8px;">This Agreement begins on the date signed and continues until we complete Steps 1–4, or until one of us ends it with 14 days written notice. If the Agreement ends early: you pay for all work completed and expenses incurred; you pay a Termination Fee of 10% of the estimated construction cost (minimum $5,000); all design materials must be returned or destroyed. If you later use our designs with another contractor without written permission and full payment, you owe a Design Licensing Fee equal to 200% of total design fees paid or estimated.</p>

      <p style="font-size:11px;font-weight:bold;color:#b87333;letter-spacing:2px;text-transform:uppercase;margin:14px 0 6px 0;">4. Who Owns the Designs</p>
      <p style="font-size:12px;color:#444;line-height:1.8;margin-bottom:8px;">All drawings, renderings, plans, and other materials we create belong entirely to us and are protected by copyright law. You receive no right to copy, modify, or use the designs for construction until: (a) you have paid all fees in full, AND (b) you have signed the full construction contract with us OR paid the Design Licensing Fee. Unauthorized use is copyright infringement. We may also file a mechanic's lien on your property for any unpaid amounts as allowed by Montana law.</p>

      <p style="font-size:11px;font-weight:bold;color:#b87333;letter-spacing:2px;text-transform:uppercase;margin:14px 0 6px 0;">5. Our Promises to You</p>
      <p style="font-size:12px;color:#444;line-height:1.8;margin-bottom:8px;">· We perform all work to the professional standard of care expected in Montana.<br/>· We maintain appropriate insurance (proof available upon request).<br/>· We are an independent contractor (no employment relationship).<br/>· We follow all required Montana residential construction disclosures (see Exhibit B).</p>

      <p style="font-size:11px;font-weight:bold;color:#b87333;letter-spacing:2px;text-transform:uppercase;margin:14px 0 6px 0;">6. Your Protections</p>
      <p style="font-size:12px;color:#444;line-height:1.8;margin-bottom:8px;">· Our total liability to you is limited to the total fees you paid us.<br/>· Both sides agree to keep each other's information confidential.<br/>· Either side may end the Agreement with proper notice and payment for work done.</p>

      <p style="font-size:11px;font-weight:bold;color:#b87333;letter-spacing:2px;text-transform:uppercase;margin:14px 0 6px 0;">7. How We Communicate</p>
      <p style="font-size:12px;color:#444;line-height:1.8;margin-bottom:8px;">All notices must be in writing and sent to: You at your address above; Us at Copper Mountain Builders, PO Box 2471, Kalispell, MT 59903. Notices are considered delivered when personally handed, two days after registered mail, or the next business day after overnight courier.</p>

      <p style="font-size:11px;font-weight:bold;color:#b87333;letter-spacing:2px;text-transform:uppercase;margin:14px 0 6px 0;">8. Other Important Information</p>
      <p style="font-size:12px;color:#444;line-height:1.8;margin-bottom:16px;">· This Agreement (plus Exhibits) is the complete understanding between us.<br/>· Any changes must be in writing and signed by both of us.<br/>· Time is important — we will both work to keep your project moving.<br/>· Montana law governs this Agreement. Any disputes will first go to mediation, then Flathead County District Court if needed. The winning side can recover reasonable attorney fees.</p>

      <p style="font-size:11px;font-weight:bold;color:#b87333;letter-spacing:2px;text-transform:uppercase;margin:14px 0 6px 0;">Exhibit A — Our 5-Step Design-Build Program</p>
      <p style="font-size:12px;color:#444;line-height:1.8;margin-bottom:8px;"><strong>STEP 1 – Initial Consultation + Vision Planning:</strong> We evaluate your site, foundation needs, timeline, and scope. Two client meetings to discover your vision and architectural inspiration. Your Assignment: Floor plan + material selection; we explain Buildertrend.</p>
      <p style="font-size:12px;color:#444;line-height:1.8;margin-bottom:8px;"><strong>STEP 2 – Schematic Design:</strong> Early structural, environmental, and energy code considerations. Two client meetings to finalize floor plans and apply changes. Your Assignment: Interior selections (cabinetry, fixtures, trim, doors/windows).</p>
      <p style="font-size:12px;color:#444;line-height:1.8;margin-bottom:8px;"><strong>STEP 3 – Design Development:</strong> We finalize floor plans, elevations, sections, and all materials with renderings. Two client meetings for side-by-side review. Plans are signed off and sent to engineering.</p>
      <p style="font-size:12px;color:#444;line-height:1.8;margin-bottom:8px;"><strong>STEP 4 – Project Development:</strong> We prepare budgeting, scheduling, Scope of Work, subcontractor bids, material pricing, permits, and site-prep costs. All trade bids are finalized.</p>
      <p style="font-size:12px;color:#444;line-height:1.8;margin-bottom:16px;"><strong>STEP 5 – Construction + Post-Build Support:</strong> Performed only under a separate full construction contract.</p>

      <p style="font-size:11px;font-weight:bold;color:#b87333;letter-spacing:2px;text-transform:uppercase;margin:14px 0 6px 0;">Exhibit B — Insurance &amp; Montana Disclosures</p>
      <p style="font-size:12px;color:#444;line-height:1.8;margin-bottom:20px;">We maintain general liability insurance and appropriate workers' compensation coverage (or exemption) as required by law. Montana Residential Construction Disclosures: We provide a one-year express warranty on workmanship and materials (detailed in the full construction contract). Full insurance certificates and additional disclosures are available upon request.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:32px;">
        <div>
          <div style="font-size:11px;color:#b87333;margin-bottom:4px;letter-spacing:2px;text-transform:uppercase;">Client Signature</div>
          ${d.clientSig?`<img src="${d.clientSig}" style="width:100%;height:60px;object-fit:contain;border:1px solid #ddd;border-radius:4px;" alt="sig"/>`:`<div style="height:60px;border-bottom:1px solid #999;"></div>`}
          <div style="padding-top:4px;margin-top:8px;"><div style="font-size:12px;color:#555;">${esc(d.clientPrintName||d.clientName)}</div><div style="font-size:11px;color:#888;">${dt}</div></div>
        </div>
        <div>
          <div style="font-size:11px;color:#b87333;margin-bottom:4px;letter-spacing:2px;text-transform:uppercase;">Contractor Signature</div>
          ${d.repSig?`<img src="${d.repSig}" style="width:100%;height:60px;object-fit:contain;border:1px solid #ddd;border-radius:4px;" alt="sig"/>`:`<div style="height:60px;border-bottom:1px solid #999;"></div>`}
          <div style="padding-top:4px;margin-top:8px;"><div style="font-size:12px;color:#555;">${esc(d.repPrintName||d.repName)}</div><div style="font-size:11px;color:#888;">Copper Mountain Builders</div></div>
        </div>
      </div>
    </div>
  </div>`;
}

// ── Main render ────────────────────────────────────────────────────────
function render(){
  const scrollY = window.scrollY; // save scroll position
  const app = document.getElementById("app");
  let html = "";
  if(currentStep===0) html = renderClient();
  else if(currentStep===1) html = renderScope();
  else if(currentStep===2) html = renderEstimate();
  else if(currentStep===3) html = renderReview();
  html += renderPrintDoc();
  app.innerHTML = html;
  updateHeader();
  if(currentStep===3){
    setTimeout(()=>{ initSigPad("sig_client","clientSig"); initSigPad("sig_rep","repSig"); }, 50);
  }
  // Restore scroll position after render
  setTimeout(()=>{ window.scrollTo(0, scrollY); }, 0);
}

// ── Init ───────────────────────────────────────────────────────────────
// Always start fresh — auto-save is only used by the saved visits feature
render();

// Replace old logo with new CMB full banner logo
window.addEventListener('DOMContentLoaded', function() {
  const newLogoURL = './cmb-logo.jpg'; // Banner file in same directory as app
  
  // Find and replace logo images - try multiple selectors
  const selectors = [
    'img[src*="logo"]',
    'img[alt*="logo"]',
    'img[alt*="Logo"]',
    'header img',
    '.logo',
    '#logo',
    'img:first-of-type' // fallback to first image in document
  ];
  
  for (let selector of selectors) {
    const logoElements = document.querySelectorAll(selector);
    logoElements.forEach(img => {
      img.src = newLogoURL;
      img.style.maxHeight = '70px'; // Increased for larger, more readable text
      img.style.width = 'auto';
      img.style.maxWidth = '400px'; // Increased width limit
      img.alt = 'Copper Mountain Builders';
    });
  }
  
  // Also check for background images
  const allElements = document.querySelectorAll('header *, nav *');
  allElements.forEach(el => {
    const bgImage = window.getComputedStyle(el).backgroundImage;
    if (bgImage && bgImage !== 'none' && bgImage.includes('logo')) {
      el.style.backgroundImage = `url(${newLogoURL})`;
      el.style.backgroundSize = 'contain';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundPosition = 'center';
    }
  });
});

if(false){
  setTimeout(()=>{
    if(confirm("Welcome to the CMB Site Visit App!\n\nYou need your Anthropic API key to generate AI estimates.\n\nTap OK to add it now.")){
      showSettings();
    }
  }, 600);
}
