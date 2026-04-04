
// ── State ──────────────────────────────────────────────────────────
const STEPS = ["Client","Scope","Estimate","Review & Sign"];
const ZONE_TYPES = [
  "Bathroom Remodel","Kitchen Remodel","Laundry Room","Master Suite",
  "Living Room","Bedroom","Office / Den","Mudroom","Garage",
  "Basement Finish","Deck","Porch Cover","Outdoor Living Space",
  "Addition","ADU / Guest House","Full House Remodel",
  "Full Demo + Rebuild","New Residential Construction",
  "Commercial New Build","Commercial Remodel / Tenant Improvement",
  "Site Work / Land Development","Other"
];
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
  projectNotes: "", zones: [], estimate: null,
  retainerAmount: "", clientSig: null, repSig: null,
  clientPrintName: "", repPrintName: ""
,
  clarifyingQuestions: [], clarifyingAnswers: {}
};

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
    const zoneList = zones.map(z =>
      `${z.type} | ${z.sqft||"unknown"} SF | ${z.notes||"no notes"}`
    ).join("\n");

    // Build vision content with all available photos
    const visionContent = [];
    const photosAdded = [];

    for(const zone of zones){
      for(const photo of (zone.photosBefore||[]).slice(0,2)){
        const c = await compressImage(photo, 600, 0.6);
        visionContent.push({type:"text", text:`[${zone.type} — existing condition]:`});
        visionContent.push({type:"image", source:{type:"base64", media_type:"image/jpeg", data:c.split(",")[1]}});
        photosAdded.push(zone.type);
      }
      for(const photo of (zone.photosInspo||[]).slice(0,1)){
        const c = await compressImage(photo, 600, 0.6);
        visionContent.push({type:"text", text:`[${zone.type} — client inspiration]:`});
        visionContent.push({type:"image", source:{type:"base64", media_type:"image/jpeg", data:c.split(",")[1]}});
      }
    }
    const allDocs = getAllDocs();
    for(const doc of allDocs.filter(d=>d.type.includes("image")).slice(0,2)){
      const c = await compressImage(doc.dataUrl, 600, 0.6);
      visionContent.push({type:"text", text:`[Uploaded document: ${doc.name}]:`});
      visionContent.push({type:"image", source:{type:"base64", media_type:"image/jpeg", data:c.split(",")[1]}});
    }

    const analysisPrompt = `You're the Chief Estimator at Copper Mountain Builders with 45 years building residential and commercial projects in Northwest Montana. You're reviewing a site visit to identify what information you need for an accurate estimate and construction schedule.

PROJECT ZONES:
${zoneList}

OVERALL NOTES: ${appData.projectNotes||"none provided"}
SITE ADDRESS: ${appData.projectAddress||"unknown"}, ${appData.projectCity||"Montana"}
${visionContent.length > 0 ? "PHOTOS: Attached above — analyze them carefully with your experienced eye." : "No photos provided."}

Based on everything you can see and read, identify what critical information is MISSING that you need to build an accurate estimate and schedule.

Think like a CM with 45 years in Montana preparing to build this project. What do you need to know about:

SITE CONDITIONS:
- Slope/topography (affects foundation type, access, excavation cost)
- Soil type (clay vs sand vs rock = huge cost difference)
- Site access (can excavator/concrete truck reach? narrow driveway = hand-carry = $$)
- Utilities at road (water, sewer, power, gas - or well/septic/propane?)
- Existing site work (driveway condition, landscaping to protect, trees to remove)

FOUNDATION & STRUCTURE:
- Foundation type (slab/crawl/basement - critical cost driver)
- Existing foundation condition (cracks, settling, moisture issues)
- Structural observations (load-bearing walls, roof framing visible, floor system)
- Roof pitch (affects material cost, labor, snow load engineering)
- Ceiling heights (standard 8' vs vaulted vs?)

MECHANICAL SYSTEMS (code triggers):
- Water source: City water or well? (if well: depth, flow rate, condition)
- Waste: City sewer or septic? (if septic: size, condition, last pumped)
- Heating: Forced air, radiant, baseboard, wood? Fuel type?
- Electrical service: 100A, 200A? Panel type (breaker/fuse)? Condition?
- Any knob-and-tube wiring visible? Aluminum wiring? (code upgrade triggers)

TIMELINE & CONSTRAINTS:
- Desired start date (affects weather planning)
- Occupancy deadline (hard deadline = cost)
- Work-around-occupancy? (living in house during reno = complexity)
- Winter work acceptable? (Nov-Apr = heated enclosure costs)

SCOPE CLARIFICATIONS:
- What's salvageable vs must-replace?
- Any special features or custom work?
- Quality level expectations beyond "Designer" (imported tile? custom millwork?)

MONTANA-SPECIFIC:
- Wildfire interface zone? (WUI requirements add 10-15%)
- Floodplain or shoreline? (special permits, restrictions)
- Historic district? (restrictions, longer permitting)
- HOA or covenants? (approval process, restrictions)

Generate up to 10 focused questions — only ask what you genuinely CANNOT determine from the photos and notes. Ask the most CRITICAL questions first (the ones that change the estimate by $20k+).

Make each question:
- Specific and answerable on-site in 30 seconds
- Multiple choice or yes/no when possible (easier for field use)
- Targeted at high-impact cost drivers

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
  const zoneList = zones.map(z =>
    `${z.type} | ${z.sqft||"unknown"} SF | Designer finish | ${z.notes||"standard scope"}`
  ).join("\n");

  // Helper: call Claude via Cloudflare Worker
  async function workerCall(messages, system, maxTokens=1000, model="claude-sonnet-4-20250514"){
    const res = await fetch("https://billowing-snowflake-38f0.coppermountainbuilders406.workers.dev", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        model: model,
        max_tokens: maxTokens,
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
    for(const zone of zones){
      for(const photo of (zone.photosBefore||[]).slice(0,2)) photosToAnalyze.push({photo, label:zone.type});
      for(const photo of (zone.photosInspo||[]).slice(0,1)) photosToAnalyze.push({photo, label:zone.type+" inspiration"});
    }
    for(const doc of allDocs.filter(d=>d.type.includes("image")).slice(0,2)) photosToAnalyze.push({photo:doc.dataUrl, label:doc.name});

    if(photosToAnalyze.length > 0){
      const visionContent = [{type:"text", text:`You're the Chief Estimator at Copper Mountain Builders with 45 years of Montana construction experience. You're on-site in Flathead Valley doing a walkthrough. Analyze these photos with the eye of a seasoned builder who's seen everything.

PROJECT ZONES: ${zoneList}
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
   - Winter access (mud season = can't get equipment in Apr-May)

6. MATERIAL OBSERVATIONS
   - Age of major components (roof, siding, windows)
   - Quality level (builder-grade vs custom)
   - What's salvageable vs must-replace

Be specific. Use measurements when visible. Reference code sections if applicable. Think like you're walking the site with the owner explaining "here's what I see that you might not."

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

    // ── CALL 2: Code Compliance Review (NEW) ──────────────────────────
    btn.textContent = "⏳ Step 2 of 6 — Reviewing code compliance…";
    let complianceResult = null;
    try {
      const complianceRaw = await workerCall([{role:"user", content:
        `You're the Chief Estimator at CMB with 45 years of Montana building experience. Review this project for building code compliance and permitting requirements.

PROJECT: ${appData.projectAddress}, ${appData.projectCity||"Flathead County"}, Montana
ZONES: ${zoneList}
PROJECT NOTES: ${appData.projectNotes||"none"}
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
   - Plan revisions budget (always need revisions)

6. TIMELINE RISKS:
   - Permit approval delays
   - Engineering turnaround
   - Required testing (soil, radon, etc.)
   - Seasonal restrictions (septic install, well drilling)

Return detailed compliance analysis with specific code sections, permit names, cost estimates, and timeline impacts.
Format as narrative analysis, 500-800 words.`
      }], SYSTEM, 1500);
      
      complianceResult = complianceRaw;
    } catch(e){ 
      console.warn("Code compliance analysis failed:", e.message);
      complianceResult = "Code compliance review unavailable. Recommend manual review before final estimate.";
    }

    // ── CALL 3: Zone totals ───────────────────────────────────────────
    // ── CALL 3: Zone totals ───────────────────────────────────────────
    btn.textContent = "⏳ Step 3 of 6 — Pricing zones…";
    const zoneRaw = await workerCall([{role:"user", content:
      `Price each zone for this Montana project with your 45 years of Flathead Valley building experience.

ZONES:
${zoneList}

CONTEXT YOU HAVE:
${siteNotes?"Site Analysis:\n"+siteNotes+"\n":""}
${complianceResult?"Code Compliance Notes:\n"+complianceResult+"\n":""}
${appData.projectNotes?"Project Notes: "+appData.projectNotes+"\n":""}
${qaContext?"Pre-Construction Q&A:\n"+qaContext+"\n":""}

For each zone, think through:
- Scope of work (what's actually involved)
- Existing conditions (demo, prep work needed based on photos)
- Code compliance costs (permits, upgrades triggered)
- Material costs (2026 Flathead Valley pricing)
- Labor costs (Montana wages + sub availability premium)
- Hidden costs you see coming (based on photos/notes)
- Complexity factors (access, existing conditions, weather timing)

LOW range = best case (everything goes perfectly)
HIGH range = reality (sub delays, hidden conditions, material escalation)

Include 20% O&P in all totals. Be realistic - Montana costs 15-25% more than Boise/Missoula.

Return ONLY: {"zones":[{"name":"zone name matching input","low":0,"high":0,"notes":"2-3 sentence scope note explaining what drives the cost"}]}`
    }], SYSTEM, 1200);
    const zoneResult = safeJSON(zoneRaw, "zones");

    // ── CALL 4: Trade sections ────────────────────────────────────────
    btn.textContent = "⏳ Step 4 of 6 — Breaking out trades…";
    const sectionRaw = await workerCall([{role:"user", content:
      `Break this Montana construction project into trade sections with your 45 years of experience coordinating subs in Flathead Valley.

ZONES: ${zoneList}
ZONE TOTALS: ${fmt$(zoneResult.zones.reduce((a,z)=>a+z.low,0))} LOW to ${fmt$(zoneResult.zones.reduce((a,z)=>a+z.high,0))} HIGH
${siteNotes?"Site observations: "+siteNotes.slice(0,400):""}

Create MAX 7 trade sections (fewer is better - don't over-slice).
Typical sections: Demolition, Sitework, Foundation, Framing, Exterior, Roofing, Plumbing, Electrical, HVAC, Insulation, Drywall, Flooring, Cabinetry, Finishes

Match trade totals to zone totals (they must reconcile).
Include 20% O&P in all section totals.

Return ONLY: {"sections":[{"name":"trade name","low":0,"high":0}]}`
    }], SYSTEM, 800, "claude-haiku-4-5-20251001");
    const sectionResult = safeJSON(sectionRaw, "sections");

    // ── CALL 5: GC + totals + sales summary ──────────────────────────
    btn.textContent = "⏳ Step 5 of 6 — Calculating GC costs + summary…";
    // Use zone totals from Call 3 as the authoritative base — don't let Call 5 recalculate
    const subtotalLow  = zoneResult.zones.reduce((a,z)=>a+(z.low||0),  0);
    const subtotalHigh = zoneResult.zones.reduce((a,z)=>a+(z.high||0), 0);

    const gcRaw = await workerCall([{role:"user", content:
      `Calculate general conditions costs AND write the client-facing summary for this Montana design-build proposal.

PROJECT CONTEXT:
Base construction subtotal (already calculated): ${fmt$(subtotalLow)} LOW / ${fmt$(subtotalHigh)} HIGH
Zones: ${zoneList}
${siteNotes?"Site Analysis: "+siteNotes.slice(0,300):""}
${complianceResult?"Code/Permit Notes: "+complianceResult.slice(0,300):""}
${qaContext?"Project Q&A:\n"+qaContext:""}

PART 1 - GENERAL CONDITIONS:
Duration: 1 month per $50k of construction cost (minimum 3 months)
Include: permits, engineering, superintendent, temp facilities, dumpsters, builder's risk insurance, 5% contingency

Calculate realistic GC costs for Flathead Valley. Don't skimp - these are real costs.

PART 2 - SALES-FOCUSED SUMMARY:
Write a compelling 3-4 paragraph summary (400-600 words) for the proposal. You're the senior estimator with 45 years explaining this to the homeowner.

GOALS:
1. Build trust (demonstrate expertise)
2. Educate (explain value and Montana realities)
3. Position design-build (this process protects them)
4. Create appropriate urgency (lead times, weather windows, sub availability)
5. Make the retainer feel small (relative to total and to risk of not doing design first)

STRUCTURE:
Para 1: Project vision + impact (paint the picture of transformed space)
Para 2: Why design-build + why CMB (expertise, risk mitigation, Flathead Valley knowledge)
Para 3: Budget reality (explain the range, Montana-specific costs, what's included)
Para 4: Next steps (retainer, timeline, urgency if applicable)

TONE: Confident but consultative, educational not salesy, specific not generic, honest about costs and risks.

AVOID: Generic language, jargon, overpromising, pressure tactics.

PART 3 - COMPLIANCE NOTES (for internal/rep use only):
Flag any code issues, permit gotchas, or risks from the analysis that the rep should know about but don't belong in client summary.

CRITICAL: Return complete, valid JSON. Do not truncate. Ensure closing braces are present.

Return ONLY this JSON:
{"gcLow":0,"gcHigh":0,"gcMonths":1,"summary":"client-facing 3-4 paragraph summary here","complianceNotes":["internal note 1","note 2"]}`
    }], `${SYSTEM}

When writing the summary, remember: You're a 45-year veteran having a conversation with a homeowner. Be warm, knowledgeable, and helpful. Explain WHY things cost what they cost. Build trust through specificity and honesty.`, 2500);
    const gcResult = safeJSON(gcRaw, "gc-totals");

    // ── CALL 6: Construction Schedule ────────────────────────────────
    btn.textContent = "⏳ Step 6 of 6 — Building schedule…";
    let scheduleResult = null;
    try {
      const schedRaw = await workerCall([{role:"user", content:
        `Build a detailed construction schedule for this Montana design-build project. You have 45 years sequencing jobs in Flathead Valley - show your expertise.

PROJECT:
Zones: ${zoneList}
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

SEQUENCING DEPENDENCIES (you know this by heart):
1. Can't pour foundation until: Frost out + excavation done + footing inspection
2. Can't frame until: Foundation cured 7 days + foundation inspection
3. Can't rough MEP until: Framing complete + framing inspection
4. Can't insulate until: MEP roughed-in + rough inspections passed
5. Can't drywall until: Insulation inspected
6. Can't install finishes until: Drywall complete
7. MUST dry-in before winter (or add $8k-15k heated enclosure)

INSPECTION HOLD POINTS (Flathead County):
- Footing inspection (before concrete pour)
- Foundation inspection (before backfill)
- Framing inspection (before insulation)
- Rough plumbing inspection (before cover)
- Rough electrical inspection (before cover)
- Rough mechanical inspection (before cover)
- Insulation inspection (before drywall)
- Final inspection (before occupancy)

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
Show realistic durations - you've built 400 homes, you know how long things ACTUALLY take.

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
  const zone = appData.zones.map(z => `${z.type} ${z.sqft||""}SF Designer finish`).join(", ");

  const prompt = `Generate detailed line items for the "${section.name}" section of a Montana construction estimate.
Project zones: ${zone}
Section total: $${section.low.toLocaleString()} – $${section.high.toLocaleString()}
CSI: ${section.csiCode}

Return ONLY this JSON array (4-6 items, real 2026 Flathead Valley CMB pricing, high-end):
[{"description":"item name","unit":"SF","qty":1,"unitCost":0,"total":0}]`;

  try {
    const res = await fetch("https://billowing-snowflake-38f0.coppermountainbuilders406.workers.dev", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        model:"claude-haiku-4-5-20251001", max_tokens:1500,
        system:"You are a construction estimator in Flathead Valley Montana. Return ONLY a valid JSON array starting with [ and ending with ]. No markdown.",
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
        <span style="font-size:11px;color:var(--stone-light);white-space:nowrap;">${item.qty} ${esc(item.unit||"LS")} @ $${Number(item.unitCost).toLocaleString()} = <strong style="color:var(--cream);">$${Number(item.total).toLocaleString()}</strong></span>
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
  appData.zones.forEach(z=>(z.docs||[]).forEach(d=>all.push({...d,source:z.type||"Zone"})));
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
  list.innerHTML = visits.map(v => `
    <div style="background:var(--stone);border-radius:8px;padding:12px 14px;margin-bottom:10px;border:1px solid var(--stone-light);">
      <div style="font-size:13px;color:var(--cream);margin-bottom:4px;">${esc(v.name)}</div>
      <div style="font-size:11px;color:var(--stone-light);margin-bottom:10px;">${new Date(v.savedAt).toLocaleString()}</div>
      <div style="display:flex;gap:8px;">
        <button class="btn-small" onclick="loadVisit('${v.id}');hideVisitsModal()">Load</button>
        <button class="btn-danger" onclick="deleteVisit('${v.id}')">Delete</button>
      </div>
    </div>
  `).join("");
}

// ── Export functions ──────────────────────────────────────────────────
// CSI Division mapping to Buildertrend cost code names
const CSI_MAP = {
  "Site Work":              { csi: "02 00 00", bt: "Sitework" },
  "Site & Foundation":      { csi: "03 00 00", bt: "Concrete" },
  "Concrete":               { csi: "03 00 00", bt: "Concrete" },
  "Foundation":             { csi: "03 11 00", bt: "Concrete - Foundations" },
  "Masonry":                { csi: "04 00 00", bt: "Masonry" },
  "Framing":                { csi: "06 10 00", bt: "Rough Carpentry" },
  "Structural Framing":     { csi: "06 10 00", bt: "Rough Carpentry" },
  "Rough Carpentry":        { csi: "06 10 00", bt: "Rough Carpentry" },
  "Finish Carpentry":       { csi: "06 20 00", bt: "Finish Carpentry" },
  "Cabinetry":              { csi: "06 41 00", bt: "Cabinets & Countertops" },
  "Cabinets":               { csi: "06 41 00", bt: "Cabinets & Countertops" },
  "Countertops":            { csi: "06 41 16", bt: "Cabinets & Countertops" },
  "Insulation":             { csi: "07 21 00", bt: "Insulation" },
  "Roofing":                { csi: "07 30 00", bt: "Roofing" },
  "Waterproofing":          { csi: "07 10 00", bt: "Waterproofing" },
  "Siding":                 { csi: "07 46 00", bt: "Siding" },
  "Doors & Windows":        { csi: "08 00 00", bt: "Doors & Windows" },
  "Windows":                { csi: "08 50 00", bt: "Doors & Windows" },
  "Doors":                  { csi: "08 10 00", bt: "Doors & Windows" },
  "Drywall":                { csi: "09 29 00", bt: "Drywall" },
  "Interior Finishes":      { csi: "09 00 00", bt: "Interior Finishes" },
  "Tile":                   { csi: "09 30 00", bt: "Tile" },
  "Tile & Flooring":        { csi: "09 30 00", bt: "Tile" },
  "Flooring":               { csi: "09 60 00", bt: "Flooring" },
  "Painting":               { csi: "09 90 00", bt: "Painting" },
  "Plumbing":               { csi: "22 00 00", bt: "Plumbing" },
  "HVAC":                   { csi: "23 00 00", bt: "HVAC" },
  "Mechanical":             { csi: "23 00 00", bt: "HVAC" },
  "Electrical":             { csi: "26 00 00", bt: "Electrical" },
  "Deck":                   { csi: "06 15 00", bt: "Decks & Porches" },
  "Outdoor Living":         { csi: "02 90 00", bt: "Decks & Porches" },
  "General Conditions":     { csi: "01 00 00", bt: "General Conditions" },
  "Dumpster/Debris Removal":{ csi: "01 74 19", bt: "Construction Waste Management" },
  "Project Management":     { csi: "01 31 00", bt: "Project Management" },
  "Permits & Inspections":  { csi: "01 41 00", bt: "Permits & Fees" },
  "Temporary Facilities":   { csi: "01 50 00", bt: "Temporary Facilities" },
  "Builder Risk Insurance": { csi: "01 18 00", bt: "Insurance" },
  "Site Supervision":       { csi: "01 31 13", bt: "Superintendent" },
  "Contingency (5%)":       { csi: "01 21 16", bt: "Contingency" },
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
        
        const zone = appData.zones.map(z => `${z.type} ${z.sqft||""}SF Designer finish`).join(", ");
        const prompt = `Generate detailed line items for the "${section.name}" section of a Montana construction estimate.
Project zones: ${zone}
Section total: $${section.low.toLocaleString()} – $${section.high.toLocaleString()}
CSI: ${section.csiCode || getCsiInfo(section.name).csi}

Return ONLY this JSON array (4-8 items, real 2026 Flathead Valley CMB pricing):
[{"description":"item name","unit":"SF","qty":1,"unitCostLow":0,"unitCostHigh":0,"totalLow":0,"totalHigh":0}]`;

        try {
          const res = await fetch("https://billowing-snowflake-38f0.coppermountainbuilders406.workers.dev", {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({
              model:"claude-haiku-4-5-20251001", max_tokens:1500,
              system:"You are a construction estimator in Flathead Valley Montana. Return ONLY a valid JSON array starting with [ and ending with ]. No markdown. Include both unitCostLow/unitCostHigh and totalLow/totalHigh for each item.",
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
    
    // We'll use a simple approach: build data arrays and let SheetJS handle formatting
    const wb = XLSX.utils.book_new();
    const wsData = [];
    
    // ── PROJECT INFORMATION HEADER ──
    wsData.push(["COPPER MOUNTAIN BUILDERS - CONCEPTUAL ESTIMATE"]);
    wsData.push([]);
    wsData.push(["Client:", d.clientName||""]);
    wsData.push(["Project Address:", `${d.projectAddress||""}, ${d.projectCity||""}, MT ${d.clientZip||""}`]);
    wsData.push(["Date:", new Date().toLocaleDateString()]);
    wsData.push(["Rep:", d.repName||""]);
    wsData.push(["Total Budget Range:", `${fmt$(est.totalLow)} - ${fmt$(est.totalHigh)}`]);
    wsData.push([]);
    
    // ── ZONE SUMMARY ──
    wsData.push(["ZONE SUMMARY"]);
    wsData.push(["Zone", "Type", "Sq Ft", "Budget Low", "Budget High", "Notes"]);
    (est.zones||[]).forEach((z,i) => {
      wsData.push([
        `Zone ${i+1}`,
        z.name||"",
        appData.zones[i]?.sqft||"",
        z.low||0,
        z.high||0,
        z.notes||""
      ]);
    });
    wsData.push([]);
    wsData.push([]);
    
    // ── DETAILED COST BREAKDOWN ──
    wsData.push(["DETAILED COST BREAKDOWN"]);
    wsData.push([]);
    wsData.push(["Item Description", "CSI Code", "Cost Code", "Type", "Qty", "Unit", "Unit Low", "Unit High", "Total Low", "Total High"]);
    
    // Trade sections
    (est.sections||[]).forEach(section => {
      const csi = getCsiInfo(section.name);
      
      // Section header row
      wsData.push([section.name.toUpperCase(), "", "", "", "", "", "", "", "", ""]);
      
      // Line items
      if(section.lineItems && section.lineItems.length){
        section.lineItems.forEach(item => {
          wsData.push([
            "  " + (item.description||""),
            csi.csi,
            csi.bt,
            "Subcontractor",
            item.qty||1,
            item.unit||"LS",
            item.unitCostLow || item.unitCost || 0,
            item.unitCostHigh || item.unitCost || 0,
            item.totalLow || item.total || 0,
            item.totalHigh || item.total || 0
          ]);
        });
      } else {
        // Fallback if line items failed to generate
        wsData.push([
          "  " + section.name,
          csi.csi,
          csi.bt,
          "Subcontractor",
          1,
          "LS",
          section.low||0,
          section.high||0,
          section.low||0,
          section.high||0
        ]);
      }
      
      // Section total row (right-aligned in column I-J)
      wsData.push(["", "", "", "", "", "", "", "Section Total:", section.low||0, section.high||0]);
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
    wsData.push(["Construction Subtotal", "", "", "", "", "", "", "", est.subtotalLow||0, est.subtotalHigh||0]);
    wsData.push(["General Conditions", "", "", "", "", "", "", "", est.gcLow||0, est.gcHigh||0]);
    wsData.push(["", "", "", "", "", "", "", "", "", ""]);
    wsData.push(["TOTAL PROJECT COST", "", "", "", "", "", "", "", est.totalLow||0, est.totalHigh||0]);
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    ws['!cols'] = [
      {wch: 40}, // Item Description
      {wch: 10}, // CSI Code
      {wch: 25}, // Cost Code
      {wch: 15}, // Type
      {wch: 6},  // Qty
      {wch: 6},  // Unit
      {wch: 12}, // Unit Low
      {wch: 12}, // Unit High
      {wch: 12}, // Total Low
      {wch: 12}  // Total High
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
        <th>Zone</th>
        <th>Type</th>
        <th style="text-align:right;">Sq Ft</th>
        <th style="text-align:right;">Budget Low</th>
        <th style="text-align:right;">Budget High</th>
      </tr>
    </thead>
    <tbody>
      ${(est.zones||[]).map((z,i) => `
        <tr>
          <td>Zone ${i+1}</td>
          <td>${esc(z.name||appData.zones[i]?.type||"")}</td>
          <td style="text-align:right;">${appData.zones[i]?.sqft||""}</td>
          <td style="text-align:right;">${fmt$(z.low||0)}</td>
          <td style="text-align:right;">${fmt$(z.high||0)}</td>
        </tr>
      `).join('')}
      <tr style="border-top: 2px solid #B87333;">
        <td colspan="3"><strong>Construction Subtotal</strong></td>
        <td style="text-align:right;"><strong>${fmt$(est.subtotalLow||0)}</strong></td>
        <td style="text-align:right;"><strong>${fmt$(est.subtotalHigh||0)}</strong></td>
      </tr>
      <tr>
        <td colspan="3">General Conditions (${est.gcMonths||3} months)</td>
        <td style="text-align:right;">${fmt$(est.gcLow||0)}</td>
        <td style="text-align:right;">${fmt$(est.gcHigh||0)}</td>
      </tr>
      <tr class="total-row" style="border-top: 2px solid #B87333;">
        <td colspan="3"><strong>TOTAL PROJECT COST</strong></td>
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
  // Word can open HTML files with .doc extension
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

// ── Image compression ─────────────────────────────────────────────────// ── Image compression ─────────────────────────────────────────────────
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
  const zones = appData.zones;
  return `<div class="page">
    <div class="card">
      <div class="section-title">Project Overview</div>
      <div class="field"><label class="field-label">Overall Project Notes</label><textarea placeholder="General observations, priorities, timeline, special conditions…" oninput="appData.projectNotes=this.value">${esc(appData.projectNotes)}</textarea></div>
      ${docSection("project","project","Project Documents (Drawings, Specs, Plans)")}
    </div>

    ${appData.zones.length > 0 ? `
    <div class="card-copper">
      <div class="section-title">⚡ AI Site Analysis</div>
      <p style="font-size:13px;color:var(--cream-dk);line-height:1.7;margin-bottom:12px;">
        Claude will analyze your photos, notes, and documents, then ask up to 10 targeted questions to fill in any gaps before estimating.
      </p>
      <div id="analyze-error" class="error-msg hidden"></div>
      <p id="analyze-status" style="font-size:13px;color:var(--gold);min-height:18px;margin-bottom:8px;"></p>
      <button id="analyze-btn" class="btn-secondary" onclick="runAnalyzeScope()">⚡ Analyze & Ask</button>
    </div>

    ${(appData.clarifyingQuestions||[]).length > 0 ? `
    <div class="card">
      <div class="section-title">Pre-Estimate Questions</div>
      <p style="font-size:12px;color:var(--stone-light);margin-bottom:14px;">Answer these before generating the estimate for best accuracy.</p>
      ${appData.clarifyingQuestions.map((q,qi) => `
        <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid rgba(92,88,80,0.3);">
          <p style="font-size:13px;color:var(--cream);margin-bottom:8px;line-height:1.5;">${qi+1}. ${esc(q.question)}</p>
          ${q.type==="yesno" ? `
            <div style="display:flex;gap:8px;">
              <button class="btn-small ${(appData.clarifyingAnswers||{})[q.id]==="Yes"?"active":""}"
                onclick="appData.clarifyingAnswers['${q.id}']='Yes';render()" style="${(appData.clarifyingAnswers||{})[q.id]==="Yes"?"background:var(--copper);color:var(--charcoal);":""}">Yes</button>
              <button class="btn-small ${(appData.clarifyingAnswers||{})[q.id]==="No"?"active":""}"
                onclick="appData.clarifyingAnswers['${q.id}']='No';render()" style="${(appData.clarifyingAnswers||{})[q.id]==="No"?"background:var(--copper);color:var(--charcoal);":""}">No</button>
              <button class="btn-small ${(appData.clarifyingAnswers||{})[q.id]==="Unknown"?"active":""}"
                onclick="appData.clarifyingAnswers['${q.id}']='Unknown';render()" style="${(appData.clarifyingAnswers||{})[q.id]==="Unknown"?"background:var(--stone-light);":""}">Unknown</button>
            </div>
          ` : q.type==="choice" ? `
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${(q.options||[]).map(opt=>`
                <button class="btn-small"
                  onclick="appData.clarifyingAnswers['${q.id}']='${opt.replace(/'/g,"\\'")}';render()"
                  style="${(appData.clarifyingAnswers||{})[q.id]===opt?"background:var(--copper);color:var(--charcoal);":""}">
                  ${esc(opt)}
                </button>
              `).join("")}
            </div>
          ` : `
            <textarea style="min-height:60px;font-size:13px;"
              placeholder="Your answer…"
              oninput="appData.clarifyingAnswers['${q.id}']=this.value">${esc((appData.clarifyingAnswers||{})[q.id]||"")}</textarea>
          `}
        </div>
      `).join("")}
    </div>
    ` : ""}
    ` : ""}
    ${zones.map((z,i)=>`
      <div class="zone-card">
        <div class="zone-header"><span class="zone-label">Zone ${i+1}</span><button class="btn-danger" onclick="appData.zones=appData.zones.filter(x=>x.id!=='${z.id}');render()">Remove</button></div>
        <div class="field"><label class="field-label">Type of Work</label>
          <select onchange="appData.zones.find(x=>x.id==='${z.id}').type=this.value">
            <option value="">Select zone type…</option>
            ${ZONE_TYPES.map(t=>`<option ${z.type===t?"selected":""}>${esc(t)}</option>`).join("")}
          
        </div>
        <div class="row2">
          <div class="field"><label class="field-label">Sq Footage</label><input type="number" value="${esc(z.sqft)}" placeholder="e.g. 120" oninput="appData.zones.find(x=>x.id==='${z.id}').sqft=this.value"/></div>
          <div class="field"><label class="field-label">Finish Level</label>
            

            
          </div>
        </div>
        <div class="field">
          <label class="field-label">Scope Notes</label>
          <button class="voice-btn" id="voice_${z.id}" onclick="activeVoiceField==='voice_${z.id}'?stopVoice('voice_${z.id}'):startVoice('${z.id}','notes','voice_${z.id}')">🎤 Voice Notes</button>
          <textarea id="notes_${z.id}" placeholder="Describe everything — demo, new work, special features, client wishes…" oninput="appData.zones.find(x=>x.id==='${z.id}').notes=this.value">${esc(z.notes)}</textarea>
        </div>
        ${photoSection(z.id,"photosBefore","Current Conditions Photos")}
        ${photoSection(z.id,"photosInspo","Client Inspiration / Pinterest Photos")}
        ${docSection("zone",z.id,"Zone Documents (Drawings, Specs)")}
      </div>
    `).join("")}
    <button class="btn-secondary" onclick="appData.zones.push({id:'z'+Date.now(),type:'',sqft:'',finish:'Designer',notes:'',photosBefore:[],photosInspo:[]});render()">+ Add Zone / Area</button>
    <div style="height:8px"></div>
    <button class="btn-primary" onclick="if(appData.zones.length>0&&appData.zones.every(z=>z.type)){goTo(2)}else{alert('Add at least one zone and select a type for each.')}">Next: Generate Estimate →</button>
    <button class="btn-secondary" onclick="goTo(0)">← Back</button>
  </div>`;
}

function renderEstimate(){
  const est = appData.estimate;
  if(!est) return `<div class="page">
    <div class="card-copper">
      <div class="section-title">AI Estimate Generation</div>
      <p style="color:var(--cream-dk);font-size:14px;line-height:1.7;margin-bottom:20px;">Claude will analyze your ${appData.zones.length} zone(s) and generate a realistic conceptual budget range for the Flathead Valley market.</p>
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
      <div class="section-title">Zone Breakdown (Editable)</div>
      ${est.zones.map((z,i)=>`
        <div style="margin-bottom:16px;">
          <div style="color:var(--copper-lt);font-size:13px;font-weight:bold;margin-bottom:8px;">${esc(z.name)}</div>
          <div class="row2">
            <div class="field"><label class="field-label">Low ($)</label><input type="number" value="${z.low}" oninput="appData.estimate.zones[${i}].low=Number(this.value);appData.estimate.totalLow=appData.estimate.zones.reduce((s,z)=>s+z.low,0);document.getElementById('tot-low').textContent=fmt$(appData.estimate.totalLow)"/></div>
            <div class="field"><label class="field-label">High ($)</label><input type="number" value="${z.high}" oninput="appData.estimate.zones[${i}].high=Number(this.value);appData.estimate.totalHigh=appData.estimate.zones.reduce((s,z)=>s+z.high,0);document.getElementById('tot-high').textContent=fmt$(appData.estimate.totalHigh)"/></div>
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
                <span style="font-size:11px;color:var(--stone-light);white-space:nowrap;">${item.qty} ${esc(item.unit||"LS")} @ $${Number(item.unitCost).toLocaleString()} = <strong style="color:var(--cream);">$${Number(item.total).toLocaleString()}</strong></span>
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
    </div>
    <button class="btn-secondary" onclick="goTo(2)">← Back</button>
  </div>`;
}

// ── Print document ────────────────────────────────────────────────────
function renderPrintDoc(){
  const d = appData; const est = d.estimate; const dt = today();
  return `<div class="print-doc" id="print-doc" style="background:white;color:#111;font-family:Georgia,serif;padding:40px;max-width:800px;margin:0 auto;">
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #b87333;padding-bottom:20px;margin-bottom:24px;">
      <img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAJYAlgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD6pooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAM1z3j3xTY+DPC99repOFigT5FzgyOfuqPqf8a32IVSWOABkmvhv9pf4oN4z8Qf2Rpkg/sTT5W2lTkTyDjf9OuPrQBy/i34x+MvEGtTXy61eWUTHEcFvKURFzwMDvX0V+zL8XpvFUJ8PeJLgPq0C/uJnPzTqB0Pqw5r4wrT8M63eeHNfsdX059l1ZzLMh7HBzg+x6GgD9QKK5n4c+LrPxt4Us9ZscKJlHmR7smN8cqfpXTUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRXMfETxjp/gfwvc6vqkgCoNsUY+9K/ZRQB5X+1F8T/8AhFtCfw7o9wF1fUIisrI3zQRNwT7EjIHfnIr4nJJPPWtjxd4gvfFHiK/1jUpGe5u5WkOTnaCeFHsBx+FVdE0u61vVbXTdOiM13cyCONB3JoAdpui6lqVle3djZT3FtZKHuJY0JWIHOCx7dDWfiv0P+E3w2sPBfgIaJOkc890DJeuV++5HT6AYFfF/xr8BT+APG95YbM6dKxms5ByDETwD7jofpQB1v7L3xEfwn4yXSdQnK6PqmIiGPyxzZ+RvbuP+BV9zAggEYIPIIr8rlYqwZSQwOQR2r7o/Zi+I6+MPCH9majMDrOmYjYMeZYj91h9OQfoPWgD2qiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigBk0qQwvJKwVEUszHoAOpr4P/aQ+JTeOvFYtLBiujabmKJf+er5+Zz+gH0969q/av+Jn9h6L/wAIto1zt1K9H+lMhw0UPpnsWOB9Aa+NScnnrQAV9a/sm/C/7DEPGWtRnz5oyljEw4VT1k+pHA+prxv4BfDeb4geLYvtMTf2LZusl454DAc7M+p6cdjX37bQRW1vHBboscUahURBgADsBQBJ1rzX49fDyDx94LuY4lxq1ojTWbgclhzsPscY/GvS6DQB+V88TwytHKpV1JUg9iK6f4Z+Mr3wL4stNZsMNs+WWNukiHqD+Vey/tafDYaPqKeLNItytleSlLzb0SU8g47A4b26etfOFAH6geG9atPEWg2Or6c5a0vIVmjJ6gEZwfcVp18h/sk/Er+z78eDtWn/ANGunJsmkbhHIzsHpk9B6mvrygAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACuR+KHjbT/AfhO81W/cGVUIt4Qfmlk6KB7Zxn0FdVczR28DyzMFjQbmJOABXwL+0F8R5fHvjGdbViNF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m1aDxLrUONGs5N0KN/y8SKeOP7oP54Irz34O/D67+InipLCJmisocPdTgZ2L6D3PP5V+gXh7R7PQNFs9K0yIQ2drGIo09h6+p9aGCNBRtAAGABiloopDCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAK8K/ae+F6eK/Dra7o9sp1uwG99gAaaED5gfUjAI/H1r3WkYBgQ3IPBFAH5YMrKxVgQwOCCOle5/sy/FJvCWvRaFq9wf7Ev5QqlySIJGOAR6AnGe3JNW/2pvhe3hzXB4j0a3H9kX3+vVB/qZu/HYEYP1zXgIJH4UwP1PUhgCDkEcUteA/su/FJfE2kjw3rE3/E3sogYXc/6+MccerDj8/avfqQBRRRQAV8V/tkHPxMtAe1imPzNfaleC/tJ/CLUvHUtprHhwQPqNtF5UkEj7DKuSRg9M898UAfF9mM3UX++P51+m/hj/kW9J/69If/AEAV8beAP2efGF34ls28Q2Mem6XFKHmeSZHZlHO1QpPXpzivta1hS1tYYIhiOJFjUewGBTYkTUUUUhhRRRQAUUUUAcP8boY5vhP4qWYAqunzOM/3lUkfqBX51n3r7s/ah8TW2h/DK+sXf/TNTAt4UHcEjcT7YzXwoR/nNUiWfVH7EjN5Xilf4N0B/H56+o6+eP2NNHay8E6tqsw2i9u/LTjqqKOfzZvyr6H6jipZQGs3xBrNjoGj3Op6pcJb2kCFnd2wK0JHWNGeRgiKMszHAA9TXxX+058Ul8W60mh6JMx0exJ8xwcCeXucdwOg/GgDz34s+O73x/4tudTuXZbUEpawE8RRjoPqep9zXOeG9EvvEeuWelaVA815cuERVXOPUn2AyTWcqs7BVBZmOAAMkmvtn9mn4VHwfpP9ua1Eo1u8jAVCMmCM84z6njP0qtiTvPhH4BsPh94Uh060RWu5P3t1OR80khHr6DoK7cUCipKCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDN8R6LY+INGudM1WBZ7S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BRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAV4v+0j8MF8a6AuqaamNb09DsAH+uj67D7g9D7mvaKMUAflxIjRyFHBVlJBBHQiun07x5r+neDb3wxa3ezSrt1eRcfMAM5UHsDxn6D3r1/9qf4YHR9Vl8VaLbMNPvH33ixrlYpCeWPoGP6mvnar3J2FzzX11+y58KI9M0+38Xa5Fm/uV32cTDiJD0f6kc/iK8z/AGavhb/wmOtPrOtW5bQ7Jwqqw+WeXrj3AHX619sxosaKiKFRRhQBgAVLY0h1FFFIYUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAFPVtOttW025sNQhWa0uI2iljcZDKRg14R/wAMveHP7UE/9qXf2Pdk22zkj03bv6V9B0UAZ3h7RbDw9o9tpmkW6W1nbrtSNBge5+prRoooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/2Q==" style="height:60px;width:auto;" alt="Copper Mountain Builders"/>
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
        <thead><tr style="background:#f5f0e8;"><th style="text-align:left;padding:8px 10px;color:#b87333;">Zone / Area</th><th style="text-align:right;padding:8px 10px;color:#b87333;">Low</th><th style="text-align:right;padding:8px 10px;color:#b87333;">High</th></tr></thead>
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
      ${est.generalConditions?`
      <div style="margin-top:16px;">
        <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#b87333;margin-bottom:8px;border-bottom:1px solid #e0d0b0;padding-bottom:4px;">General Conditions (${est.generalConditions.months||1} Month${(est.generalConditions.months||1)>1?"s":""})</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <tbody>${(est.generalConditions.items||[]).map(item=>`<tr style="border-bottom:1px solid #f0ebe0;"><td style="padding:5px 8px;">${esc(item.name)}</td><td style="padding:5px 8px;text-align:right;">${fmt$(item.low)}</td><td style="padding:5px 8px;text-align:right;">${fmt$(item.high)}</td></tr>`).join("")}</tbody>
        </table>
      </div>
      <div style="margin-top:12px;padding:8px 12px;background:#faf7f2;border-radius:4px;">

      </div>`:""}
      ${getAllDocs().length>0?`<div style="margin-top:12px;padding:10px 14px;background:#f5f0e8;border-radius:6px;"><p style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#b87333;margin-bottom:6px;">Documents Reviewed</p>${getAllDocs().map(doc=>`<p style="font-size:12px;color:#555;">📎 ${esc(doc.name)} <span style="color:#999;">(${esc(doc.source)})</span></p>`).join("")}</div>`:""}
      <p style="font-size:11px;color:#888;font-style:italic;margin-top:10px;">*Conceptual estimate only. Final pricing determined after full design development (Steps 1–4).</p>
    </div>`:""}
    ${(d.zones||[]).map(z=>`<div style="margin-bottom:24px;page-break-inside:avoid;">
      <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#b87333;margin-bottom:8px;border-bottom:1px solid #e0d0b0;padding-bottom:4px;">${esc(z.type)}</div>
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
if(false){
  setTimeout(()=>{
    if(confirm("Welcome to the CMB Site Visit App!\n\nYou need your Anthropic API key to generate AI estimates.\n\nTap OK to add it now.")){
      showSettings();
    }
  }, 600);
}
