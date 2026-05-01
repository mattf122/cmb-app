// ── State ──────────────────────────────────────────────────────────
const STEPS = ["Client","Scope","Concept","Estimate","Sign","Review"];
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
const FINISH_LEVELS = [
  { value: "Essential", label: "Essential", desc: "Clean, functional, quality materials" },
  { value: "Designer", label: "Designer", desc: "Elevated finishes, custom details" },
  { value: "Luxury", label: "Luxury", desc: "Top of market, bespoke everything" }
];

// Required trades by project type — used for post-AI validation
const REQUIRED_TRADES_BY_TYPE = {
  "Residential Remodel":                    ["Demolition","Framing","Insulation","Drywall","Painting","Electrical","Plumbing","HVAC","Doors & Windows","Flooring","Trim"],
  "Commercial Remodel / Tenant Improvement":["Demolition","Framing","Drywall","Painting","Electrical","Plumbing","HVAC","Flooring","Fire Suppression"],
  "New Residential Construction":           ["Excavation","Foundation","Framing","Roofing","Siding","Insulation","Drywall","Painting","Electrical","Plumbing","HVAC","Doors & Windows","Flooring","Cabinetry","Trim"],
  "New Commercial Construction":            ["Excavation","Foundation","Framing","Roofing","Exterior Cladding","Insulation","Drywall","Painting","Electrical","Plumbing","HVAC","Doors & Windows","Flooring","Fire Suppression"],
  "Addition":                               ["Foundation","Framing","Roofing","Insulation","Drywall","Painting","Electrical","Plumbing","HVAC","Doors & Windows","Flooring"],
  "ADU / Guest House":                      ["Excavation","Foundation","Framing","Roofing","Siding","Insulation","Drywall","Painting","Electrical","Plumbing","HVAC","Doors & Windows","Flooring","Cabinetry"],
  "Site Work / Land Development":           ["Excavation","Grading","Utilities"],
  "Mixed Use":                              ["Foundation","Framing","Roofing","Exterior Cladding","Insulation","Drywall","Painting","Electrical","Plumbing","HVAC","Doors & Windows","Flooring","Fire Suppression","Cabinetry"]
};

// CMB Labor Rates 2026
const CMB_LABOR_RATES = {
  carpenter:  85,
  foreman:   100,
  pm:        130
};

const UNIT_COST_DB = {
  "Excavation, residential site":       { unit:"EA", low:8000,  high:20000 },
  "Foundation, stem wall":              { unit:"SF", low:38,    high:48 },
  "Foundation, slab on grade":          { unit:"SF", low:9,     high:12 },
  "Foundation, full basement":          { unit:"SF", low:28,    high:38 },
  "Concrete flatwork":                  { unit:"SF", low:8,     high:14 },
  "Garage slab":                        { unit:"SF", low:10,    high:16 },
  "Wall framing 2x6":                   { unit:"SF", low:5.50,  high:7.50 },
  "Roof truss system":                  { unit:"SF", low:6.00,  high:9.00 },
  "Sheathing":                          { unit:"SF", low:2.50,  high:3.50 },
  "Standing seam metal roof":           { unit:"SF", low:24,    high:30 },
  "Asphalt shingles":                   { unit:"SF", low:8,     high:12 },
  "LP SmartSide siding":               { unit:"SF", low:12,    high:16 },
  "Stone veneer":                       { unit:"SF", low:28,    high:45 },
  "Stucco":                             { unit:"SF", low:14,    high:20 },
  "Window, vinyl":                      { unit:"EA", low:900,   high:1400 },
  "Window, wood-clad":                  { unit:"EA", low:1400,  high:2200 },
  "Window, large fixed":                { unit:"EA", low:2000,  high:3500 },
  "Exterior entry door":                { unit:"EA", low:2500,  high:5000 },
  "Sliding glass door":                 { unit:"EA", low:3000,  high:6000 },
  "Interior door, prehung":             { unit:"EA", low:400,   high:800 },
  "Garage door":                        { unit:"EA", low:2000,  high:4500 },
  "Spray foam insulation":              { unit:"SF", low:3.00,  high:4.00 },
  "Batt insulation":                    { unit:"SF", low:1.50,  high:2.50 },
  "Drywall hang/tape/texture":          { unit:"SF", low:2.80,  high:3.60 },
  "Interior painting":                  { unit:"SF", low:2.50,  high:4.00 },
  "Exterior painting":                  { unit:"SF", low:3.00,  high:5.00 },
  "Trim/millwork installed":            { unit:"LF", low:18,    high:28 },
  "Bathroom rough-in":                  { unit:"EA", low:4500,  high:7000 },
  "Bathroom fixtures + finish":         { unit:"EA", low:8000,  high:18000 },
  "Kitchen rough-in":                   { unit:"EA", low:3500,  high:5000 },
  "Kitchen fixtures + finish":          { unit:"EA", low:3000,  high:6000 },
  "Water heater, tankless":             { unit:"EA", low:3500,  high:5500 },
  "Electrical rough-in":                { unit:"SF", low:4.00,  high:7.00 },
  "Electrical fixtures/finish":         { unit:"SF", low:3.00,  high:5.00 },
  "Panel upgrade 200A":                 { unit:"EA", low:3500,  high:6000 },
  "Forced air HVAC system":             { unit:"EA", low:11000, high:21000 },
  "Mini-split per head":                { unit:"EA", low:4500,  high:7500 },
  "Radiant floor heat":                 { unit:"SF", low:12,    high:18 },
  "Tile flooring":                      { unit:"SF", low:12,    high:22 },
  "Hardwood flooring":                  { unit:"SF", low:9,     high:18 },
  "LVP flooring":                       { unit:"SF", low:6,     high:11 },
  "Carpet":                             { unit:"SF", low:4,     high:8 },
  "Kitchen cabinets":                   { unit:"EA", low:24000, high:46000 },
  "Bathroom vanity":                    { unit:"EA", low:2500,  high:6000 },
  "Countertop, quartz":                 { unit:"SF", low:65,    high:95 },
  "Countertop, granite":                { unit:"SF", low:55,    high:85 },
  "Shower surround, tiled":             { unit:"EA", low:2500,  high:5000 },
  "Backsplash":                         { unit:"EA", low:1500,  high:3000 },
  "Selective demolition":               { unit:"SF", low:3,     high:6 },
  "Full gut demolition":                { unit:"SF", low:8,     high:15 },
  "Sprinkler system":                   { unit:"SF", low:4,     high:8 },
  "Landscaping basic":                  { unit:"SF", low:1.50,  high:3.00 },
  "Driveway, concrete":                 { unit:"SF", low:8,     high:14 }
};

function computeEstimateFromTakeoff(takeoffData, marginPercent){
  const sections = (takeoffData.takeoff||[]).map(trade => {
    const items = (trade.items||[]).map(item => ({
      ...item,
      lineTotalLow:  Math.round(item.qty * item.unitCostLow),
      lineTotalHigh: Math.round(item.qty * item.unitCostHigh),
      laborHoursTotal: Math.round((item.qty * (item.laborHoursPerUnit||0)) * 10) / 10
    }));
    return {
      name: trade.trade,
      csiCode: trade.csiCode || getCSIDiv(trade.trade).name,
      items,
      low:  items.reduce((s,i) => s + i.lineTotalLow, 0),
      high: items.reduce((s,i) => s + i.lineTotalHigh, 0)
    };
  });

  const subtotalLow  = sections.reduce((s,sec) => s + sec.low, 0);
  const subtotalHigh = sections.reduce((s,sec) => s + sec.high, 0);

  const months = takeoffData.constructionMonths || Math.max(3, Math.ceil(subtotalLow / 50000));
  const gc = computeGC(subtotalLow, subtotalHigh, months);
  const gcTotalLow  = gc.reduce((s,i) => s + i.lineTotalLow, 0);
  const gcTotalHigh = gc.reduce((s,i) => s + i.lineTotalHigh, 0);

  const pct = marginPercent || 20;
  const preLow  = subtotalLow + gcTotalLow;
  const preHigh = subtotalHigh + gcTotalHigh;

  return {
    sections,
    generalConditions: { items: gc, low: gcTotalLow, high: gcTotalHigh, months },
    subtotalLow, subtotalHigh,
    gcLow: gcTotalLow, gcHigh: gcTotalHigh, gcMonths: months,
    marginPercent: pct,
    marginLow:  Math.round(preLow * pct / 100),
    marginHigh: Math.round(preHigh * pct / 100),
    totalLow:  preLow + Math.round(preLow * pct / 100),
    totalHigh: preHigh + Math.round(preHigh * pct / 100),
    scopeNotes: takeoffData.scopeNotes || ""
  };
}

function computeGC(subtotalLow, subtotalHigh, months){
  const template = [
    { description:"Building permit",           qty:1,                         unit:"LS", lowPer: Math.round(subtotalLow*0.015), highPer: Math.round(subtotalHigh*0.02) },
    { description:"Structural engineering",     qty:1,                         unit:"LS", lowPer:4000,  highPer:8000 },
    { description:"Superintendent",             qty:months,                    unit:"MO", lowPer:3500,  highPer:4500 },
    { description:"Dumpsters & waste removal",  qty:Math.ceil(months*1.5),     unit:"EA", lowPer:650,   highPer:850 },
    { description:"Temporary facilities",       qty:months,                    unit:"MO", lowPer:800,   highPer:1200 },
    { description:"Builder's risk insurance",   qty:1,                         unit:"LS", lowPer: Math.round(subtotalLow*0.008), highPer: Math.round(subtotalHigh*0.012) },
    { description:"Final clean",                qty:1,                         unit:"LS", lowPer:2000,  highPer:4000 },
    { description:"Contingency (5%)",           qty:1,                         unit:"LS", lowPer: Math.round(subtotalLow*0.05), highPer: Math.round(subtotalHigh*0.05) }
  ];
  return template.map(t => ({
    description: t.description, qty: t.qty, unit: t.unit,
    unitCostLow: t.lowPer, unitCostHigh: t.highPer,
    lineTotalLow:  Math.round(t.qty * t.lowPer),
    lineTotalHigh: Math.round(t.qty * t.highPer)
  }));
}

function validateTakeoff(takeoff, projectType, sqft){
  const warnings = [];
  const required = REQUIRED_TRADES_BY_TYPE[projectType] || [];
  const returned = (takeoff||[]).map(t => t.trade.toLowerCase());
  for(const trade of required){
    if(!returned.some(t => t.includes(trade.toLowerCase()) || trade.toLowerCase().includes(t))){
      warnings.push(`Missing required trade: ${trade}`);
    }
  }
  for(const trade of (takeoff||[])){
    for(const item of (trade.items||[])){
      if(item.qty <= 0) warnings.push(`${trade.trade}: ${item.description} has qty ${item.qty}`);
      if(item.unitCostLow > item.unitCostHigh){
        [item.unitCostLow, item.unitCostHigh] = [item.unitCostHigh, item.unitCostLow];
      }
    }
  }
  return warnings;
}

function sanityCheckPerSF(totalLow, totalHigh, projectType, sqft){
  const bench = {
    "New Residential Construction":           {low:250, high:375},
    "Residential Remodel":                    {low:150, high:300},
    "ADU / Guest House":                      {low:275, high:400},
    "Commercial Remodel / Tenant Improvement":{low:150, high:350},
    "New Commercial Construction":            {low:200, high:400},
    "Addition":                               {low:200, high:350}
  }[projectType];
  if(!bench || !sqft) return [];
  const warnings = [];
  const perSfLow = totalLow / sqft;
  if(perSfLow < bench.low * 0.8) warnings.push(`LOW ($${Math.round(perSfLow)}/SF) below typical ${projectType} range ($${bench.low}-$${bench.high}/SF)`);
  if(totalHigh/sqft > bench.high * 1.3) warnings.push(`HIGH ($${Math.round(totalHigh/sqft)}/SF) above typical range`);
  return warnings;
}

let currentStep = 0;
let appData = {
  company: "Copper Mountain Builders",
  repName: "", clientName: "", clientEmail: "", clientPhone: "",
  clientAddress: "", clientCity: "", clientZip: "",
  projectAddress: "", projectCity: "",
  projectNotes: "", zones: [{id:'z_default', type:'', sqft:'', notes:'', photosBefore:[], photosInspo:[]}], estimate: null,
  retainerAmount: "", clientSig: null, repSig: null,
  clientPrintName: "", repPrintName: "",
  clarifyingQuestions: [], clarifyingAnswers: {},
  conceptImages: [],
  davisBacon: false,
  marginPercent: 20
};

// ── OneDrive Config ─────────────────────────────────────────────────────
const OD_CLIENT_ID   = "3b9cde5e-f884-4491-9414-01005e038ba0";
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

// Maps estimate section names → CSI division number and full display name
const CSI_DIV_MAP = {
  "Permits":                 { num:"00", name:"00 Procurement and Contracting Requirements" },
  "Design Services":         { num:"00", name:"00 Procurement and Contracting Requirements" },
  "Engineering":             { num:"00", name:"00 Procurement and Contracting Requirements" },
  "Bidding":                 { num:"00", name:"00 Procurement and Contracting Requirements" },
  "Insurance":               { num:"00", name:"00 Procurement and Contracting Requirements" },
  "General Conditions":      { num:"01", name:"01 General Requirements" },
  "Project Management":      { num:"01", name:"01 General Requirements" },
  "Superintendent":          { num:"01", name:"01 General Requirements" },
  "Temporary Facilities":    { num:"01", name:"01 General Requirements" },
  "Temporary Utilities":     { num:"01", name:"01 General Requirements" },
  "Safety":                  { num:"01", name:"01 General Requirements" },
  "Bonding":                 { num:"01", name:"01 General Requirements" },
  "Cleanup":                 { num:"01", name:"01 General Requirements" },
  "Dumpster":                { num:"01", name:"01 General Requirements" },
  "Contingency":             { num:"01", name:"01 General Requirements" },
  "Demolition":              { num:"02", name:"02 Existing Conditions" },
  "Selective Demolition":    { num:"02", name:"02 Existing Conditions" },
  "Site Survey":             { num:"02", name:"02 Existing Conditions" },
  "Environmental Remediation":{num:"02", name:"02 Existing Conditions" },
  "Abatement":               { num:"02", name:"02 Existing Conditions" },
  "Site Clearing":           { num:"02", name:"02 Existing Conditions" },
  "Concrete":                { num:"03", name:"03 Concrete" },
  "Foundation":              { num:"03", name:"03 Concrete" },
  "Footings":                { num:"03", name:"03 Concrete" },
  "Slab":                    { num:"03", name:"03 Concrete" },
  "Flatwork":                { num:"03", name:"03 Concrete" },
  "Masonry":                 { num:"04", name:"04 Masonry" },
  "Brick":                   { num:"04", name:"04 Masonry" },
  "Stone Masonry":           { num:"04", name:"04 Masonry" },
  "Fireplace":               { num:"04", name:"04 Masonry" },
  "Structural Steel":        { num:"05", name:"05 Metals" },
  "Steel Framing":           { num:"05", name:"05 Metals" },
  "Metal Fabrications":      { num:"05", name:"05 Metals" },
  "Framing":                 { num:"06", name:"06 Woods, Plastics, and Composites" },
  "Rough Framing":           { num:"06", name:"06 Woods, Plastics, and Composites" },
  "Rough Carpentry":         { num:"06", name:"06 Woods, Plastics, and Composites" },
  "Finish Carpentry":        { num:"06", name:"06 Woods, Plastics, and Composites" },
  "Trim":                    { num:"06", name:"06 Woods, Plastics, and Composites" },
  "Millwork":                { num:"06", name:"06 Woods, Plastics, and Composites" },
  "Deck":                    { num:"06", name:"06 Woods, Plastics, and Composites" },
  "Decking":                 { num:"06", name:"06 Woods, Plastics, and Composites" },
  "Composite Decking":       { num:"06", name:"06 Woods, Plastics, and Composites" },
  "Insulation":              { num:"07", name:"07 Thermal and Moisture Protection" },
  "Spray Foam":              { num:"07", name:"07 Thermal and Moisture Protection" },
  "Roofing":                 { num:"07", name:"07 Thermal and Moisture Protection" },
  "Metal Roofing":           { num:"07", name:"07 Thermal and Moisture Protection" },
  "Standing Seam":           { num:"07", name:"07 Thermal and Moisture Protection" },
  "Shingles":                { num:"07", name:"07 Thermal and Moisture Protection" },
  "Waterproofing":           { num:"07", name:"07 Thermal and Moisture Protection" },
  "Flashing":                { num:"07", name:"07 Thermal and Moisture Protection" },
  "Siding":                  { num:"07", name:"07 Thermal and Moisture Protection" },
  "Exterior Cladding":       { num:"07", name:"07 Thermal and Moisture Protection" },
  "Vapor Barrier":           { num:"07", name:"07 Thermal and Moisture Protection" },
  "Sealants":                { num:"07", name:"07 Thermal and Moisture Protection" },
  "Weather Barrier":         { num:"07", name:"07 Thermal and Moisture Protection" },
  "Doors":                   { num:"08", name:"08 Openings" },
  "Exterior Doors":          { num:"08", name:"08 Openings" },
  "Garage Doors":            { num:"08", name:"08 Openings" },
  "Windows":                 { num:"08", name:"08 Openings" },
  "Skylights":               { num:"08", name:"08 Openings" },
  "Hardware":                { num:"08", name:"08 Openings" },
  "Doors & Windows":         { num:"08", name:"08 Openings" },
  "Drywall":                 { num:"09", name:"09 Finishes" },
  "Gypsum Board":            { num:"09", name:"09 Finishes" },
  "Tile":                    { num:"09", name:"09 Finishes" },
  "Tile & Flooring":         { num:"09", name:"09 Finishes" },
  "Hardwood Flooring":       { num:"09", name:"09 Finishes" },
  "LVP":                     { num:"09", name:"09 Finishes" },
  "Flooring":                { num:"09", name:"09 Finishes" },
  "Carpet":                  { num:"09", name:"09 Finishes" },
  "Painting":                { num:"09", name:"09 Finishes" },
  "Paint":                   { num:"09", name:"09 Finishes" },
  "Interior Finishes":       { num:"09", name:"09 Finishes" },
  "Finishes":                { num:"09", name:"09 Finishes" },
  "Appliances":              { num:"11", name:"11 Equipment" },
  "Cabinetry":               { num:"12", name:"12 Furnishings" },
  "Cabinets":                { num:"12", name:"12 Furnishings" },
  "Countertops":             { num:"12", name:"12 Furnishings" },
  "Casework":                { num:"12", name:"12 Furnishings" },
  "Furniture":               { num:"12", name:"12 Furnishings" },
  "Window Treatments":       { num:"12", name:"12 Furnishings" },
  "Fire Suppression":        { num:"21", name:"21 Fire Suppression" },
  "Sprinklers":              { num:"21", name:"21 Fire Suppression" },
  "Plumbing":                { num:"22", name:"22 Plumbing" },
  "Plumbing Fixtures":       { num:"22", name:"22 Plumbing" },
  "Water Heater":            { num:"22", name:"22 Plumbing" },
  "Gas Piping":              { num:"22", name:"22 Plumbing" },
  "HVAC":                    { num:"23", name:"23 HVAC" },
  "Mechanical":              { num:"23", name:"23 HVAC" },
  "Heating":                 { num:"23", name:"23 HVAC" },
  "Ventilation":             { num:"23", name:"23 HVAC" },
  "Mini-Split":              { num:"23", name:"23 HVAC" },
  "Radiant Heat":            { num:"23", name:"23 HVAC" },
  "Electrical":              { num:"26", name:"26 Electrical" },
  "Wiring":                  { num:"26", name:"26 Electrical" },
  "Lighting":                { num:"26", name:"26 Electrical" },
  "Service Upgrade":         { num:"26", name:"26 Electrical" },
  "Low Voltage":             { num:"26", name:"26 Electrical" },
  "Excavation":              { num:"31", name:"31 Earthwork" },
  "Grading":                 { num:"31", name:"31 Earthwork" },
  "Earthwork":               { num:"31", name:"31 Earthwork" },
  "Sitework":                { num:"31", name:"31 Earthwork" },
  "Site Work":               { num:"31", name:"31 Earthwork" },
  "Retaining Wall":          { num:"31", name:"31 Earthwork" },
  "Landscaping":             { num:"32", name:"32 Exterior Improvements" },
  "Paving":                  { num:"32", name:"32 Exterior Improvements" },
  "Driveway":                { num:"32", name:"32 Exterior Improvements" },
  "Fencing":                 { num:"32", name:"32 Exterior Improvements" },
  "Outdoor Living":          { num:"32", name:"32 Exterior Improvements" },
  "Utilities":               { num:"33", name:"33 Utilities" },
  "Water Service":           { num:"33", name:"33 Utilities" },
  "Sewer":                   { num:"33", name:"33 Utilities" },
  "Septic":                  { num:"33", name:"33 Utilities" },
  "Well":                    { num:"33", name:"33 Utilities" }
};

const VALID_CSI_CODES = {
  "0.101": "0.101 Permits and Approvals Labor",
  "0.201": "0.201 Design and Pre-Construction Services Labor",
  "0.202": "0.202 Design and Pre-Construction Services Material",
  "0.203": "0.203 Design and Pre-Construction Services Subcontractor",
  "0.301": "0.301 Bidding and Estimating Labor",
  "0.302": "0.302 Bidding and Estimating Material",
  "0.303": "0.303 Bidding and Estimating Subcontractor",
  "0.401": "0.401 Legal and Contract Preparation Labor",
  "0.402": "0.402 Legal and Contract Preparation Material",
  "0.403": "0.403 Legal and Contract Preparation Subcontractor",
  "0.501": "0.501 Project Setup Labor",
  "0.502": "0.502 Project Setup Material",
  "0.503": "0.503 Project Setup Subcontractor",
  "0.601": "0.601 Initial Insurance and Bonding Labor",
  "0.603": "0.603 Initial Insurance and Bonding Subcontractor",
  "0.701": "0.701 Pre-Construction Sustainability Labor",
  "0.703": "0.703 Pre-Construction Sustainability Subcontractor",
  "1.101": "1.101 Project Administration and General Office Labor",
  "1.102": "1.102 Project Administration and General Office Material",
  "1.103": "1.103 Project Administration and General Office Subcontractor",
  "1.201": "1.201 Project Personnel Costs Labor",
  "1.202": "1.202 Project Personnel Costs Material",
  "1.203": "1.203 Project Personnel Costs Subcontractor",
  "1.301": "1.301 Temporary Facilities and Site Controls Labor",
  "1.302": "1.302 Temporary Facilities and Site Controls Material",
  "1.303": "1.303 Temporary Facilities and Site Controls Subcontractor",
  "1.351": "1.351 Temporary Utilities and Site Access Labor",
  "1.352": "1.352 Temporary Utilities and Site Access Material",
  "1.353": "1.353 Temporary Utilities and Site Access Subcontractor",
  "1.401": "1.401 Access Equipment Labor",
  "1.402": "1.402 Access Equipment Material",
  "1.403": "1.403 Access Equipment Subcontractor",
  "1.501": "1.501 Quality Control and Assurance Labor",
  "1.502": "1.502 Quality Control and Assurance Material",
  "1.503": "1.503 Quality Control and Assurance Subcontractor",
  "1.601": "1.601 Safety and Compliance Labor",
  "1.602": "1.602 Safety and Compliance Material",
  "1.603": "1.603 Safety and Compliance Subcontractor",
  "1.701": "1.701 Bonding and Insurance Labor",
  "1.703": "1.703 Bonding and Insurance Subcontractor",
  "1.801": "1.801 Environmental Compliance Labor",
  "1.802": "1.802 Environmental Compliance Material",
  "1.803": "1.803 Environmental Compliance Subcontractor",
  "1.901": "1.901 Cleaning and Site Maintenance Labor",
  "1.902": "1.902 Cleaning and Site Maintenance Material",
  "1.903": "1.903 Cleaning and Site Maintenance Subcontractor",
  "2.101": "2.101 Site Survey and Assessment Labor",
  "2.102": "2.102 Site Survey and Assessment Material",
  "2.103": "2.103 Site Survey and Assessment Subcontractor",
  "2.201": "2.201 Demolition and Removal Labor",
  "2.202": "2.202 Demolition and Removal Material",
  "2.203": "2.203 Demolition and Removal Subcontractor",
  "2.301": "2.301 Environmental Remediation Labor",
  "2.302": "2.302 Environmental Remediation Material",
  "2.303": "2.303 Environmental Remediation Subcontractor",
  "2.401": "2.401 Site Preparation and Clearing Labor",
  "2.402": "2.402 Site Preparation and Clearing Material",
  "2.403": "2.403 Site Preparation and Clearing Subcontractor",
  "2.501": "2.501 Excavation and Earthwork Labor",
  "2.502": "2.502 Excavation and Earthwork Material",
  "2.503": "2.503 Excavation and Earthwork Subcontractor",
  "2.601": "2.601 Dewatering and Drainage Labor",
  "2.602": "2.602 Dewatering and Drainage Material",
  "2.603": "2.603 Dewatering and Drainage Subcontractor",
  "2.701": "2.701 Utility Disconnections and Adjustments Labor",
  "2.702": "2.702 Utility Disconnections and Adjustments Material",
  "2.703": "2.703 Utility Disconnections and Adjustments Subcontractor",
  "2.801": "2.801 Site Security and Fencing Labor",
  "2.802": "2.802 Site Security and Fencing Material",
  "2.803": "2.803 Site Security and Fencing Subcontractor",
  "3.101": "3.101 Formwork Labor",
  "3.102": "3.102 Formwork Material",
  "3.103": "3.103 Formwork Subcontractor",
  "3.201": "3.201 Reinforcement and Post-Tensioning Labor",
  "3.202": "3.202 Reinforcement and Post-Tensioning Material",
  "3.203": "3.203 Reinforcement and Post-Tensioning Subcontractor",
  "3.301": "3.301 Cast-in-Place Concrete Labor",
  "3.302": "3.302 Cast-in-Place Concrete Material",
  "3.303": "3.303 Cast-in-Place Concrete Subcontractor",
  "3.401": "3.401 Precast Concrete Labor",
  "3.402": "3.402 Precast Concrete Material",
  "3.403": "3.403 Precast Concrete Subcontractor",
  "3.501": "3.501 Concrete Finishing Labor",
  "3.502": "3.502 Concrete Finishing Material",
  "3.503": "3.503 Concrete Finishing Subcontractor",
  "3.601": "3.601 Grouting Labor",
  "3.602": "3.602 Grouting Material",
  "3.603": "3.603 Grouting Subcontractor",
  "3.701": "3.701 Concrete Curing & Protection Labor",
  "3.702": "3.702 Concrete Curing & Protection Material",
  "3.703": "3.703 Concrete Curing & Protection Subcontractor",
  "3.801": "3.801 Concrete Testing & Inspection Labor",
  "3.802": "3.802 Concrete Testing & Inspection Material",
  "3.803": "3.803 Concrete Testing & Inspection Subcontractor",
  "3.901": "3.901 Concrete Repair Labor",
  "3.902": "3.902 Concrete Repair Material",
  "3.903": "3.903 Concrete Repair Subcontractor",
  "4.101": "4.101 Mortar and Grout Labor",
  "4.102": "4.102 Mortar and Grout Material",
  "4.103": "4.103 Mortar and Grout Subcontractor",
  "4.201": "4.201 Unit Masonry Labor",
  "4.202": "4.202 Unit Masonry Material",
  "4.203": "4.203 Unit Masonry Subcontractor",
  "4.301": "4.301 Stone Masonry Labor",
  "4.302": "4.302 Stone Masonry Material",
  "4.303": "4.303 Stone Masonry Subcontractor",
  "4.401": "4.401 Structural Clay Tile Labor",
  "4.402": "4.402 Structural Clay Tile Material",
  "4.403": "4.403 Structural Clay Tile Subcontractor",
  "4.501": "4.501 Refractory Masonry Labor",
  "4.502": "4.502 Refractory Masonry Material",
  "4.503": "4.503 Refractory Masonry Subcontractor",
  "4.601": "4.601 Masonry Restoration and Cleaning Labor",
  "4.602": "4.602 Masonry Restoration and Cleaning Material",
  "4.603": "4.603 Masonry Restoration and Cleaning Subcontractor",
  "4.701": "4.701 Glass Unit Masonry Labor",
  "4.702": "4.702 Glass Unit Masonry Material",
  "4.703": "4.703 Glass Unit Masonry Subcontractor",
  "4.801": "4.801 Masonry Anchors and Reinforcements Labor",
  "4.802": "4.802 Masonry Anchors and Reinforcements Material",
  "4.803": "4.803 Masonry Anchors and Reinforcements Subcontractor",
  "4.901": "4.901 Masonry Accessories Labor",
  "4.902": "4.902 Masonry Accessories Material",
  "4.903": "4.903 Masonry Accessories Subcontractor",
  "5.101": "5.101 Structural Steel Framing Labor",
  "5.102": "5.102 Structural Steel Framing Material",
  "5.103": "5.103 Structural Steel Framing Subcontractor",
  "5.201": "5.201 Metal Joists Labor",
  "5.202": "5.202 Metal Joists Material",
  "5.203": "5.203 Metal Joists Subcontractor",
  "5.301": "5.301 Metal Decking Labor",
  "5.302": "5.302 Metal Decking Material",
  "5.303": "5.303 Metal Decking Subcontractor",
  "5.401": "5.401 Cold-Formed Metal Framing Labor",
  "5.402": "5.402 Cold-Formed Metal Framing Material",
  "5.403": "5.403 Cold-Formed Metal Framing Subcontractor",
  "5.501": "5.501 Metal Fabrications Labor",
  "5.502": "5.502 Metal Fabrications Material",
  "5.503": "5.503 Metal Fabrications Subcontractor",
  "5.601": "5.601 Ornamental Metal Labor",
  "5.602": "5.602 Ornamental Metal Material",
  "5.603": "5.603 Ornamental Metal Subcontractor",
  "5.701": "5.701 Metal Stairs Labor",
  "5.702": "5.702 Metal Stairs Material",
  "5.703": "5.703 Metal Stairs Subcontractor",
  "5.801": "5.801 Expansion Joint Covers Labor",
  "5.802": "5.802 Expansion Joint Covers Material",
  "5.803": "5.803 Expansion Joint Covers Subcontractor",
  "5.901": "5.901 Metal Restoration and Cleaning Labor",
  "5.902": "5.902 Metal Restoration and Cleaning Material",
  "5.903": "5.903 Metal Restoration and Cleaning Subcontractor",
  "6.101": "6.101 Rough Carpentry Labor",
  "6.102": "6.102 Rough Carpentry Material",
  "6.103": "6.103 Rough Carpentry Subcontractor",
  "6.201": "6.201 Finish Carpentry Labor",
  "6.202": "6.202 Finish Carpentry Material",
  "6.203": "6.203 Finish Carpentry Subcontractor",
  "6.301": "6.301 Architectural Woodwork Labor",
  "6.302": "6.302 Architectural Woodwork Material",
  "6.303": "6.303 Architectural Woodwork Subcontractor",
  "6.401": "6.401 Plastic Fabrications Labor",
  "6.402": "6.402 Plastic Fabrications Material",
  "6.403": "6.403 Plastic Fabrications Subcontractor",
  "6.501": "6.501 Composite Materials Labor",
  "6.502": "6.502 Composite Materials Material",
  "6.503": "6.503 Composite Materials Subcontractor",
  "6.601": "6.601 Wood Treatments and Finishes Labor",
  "6.602": "6.602 Wood Treatments and Finishes Material",
  "6.603": "6.603 Wood Treatments and Finishes Subcontractor",
  "6.701": "6.701 Wood Decking and Planking Labor",
  "6.702": "6.702 Wood Decking and Planking Material",
  "6.703": "6.703 Wood Decking and Planking Subcontractor",
  "6.801": "6.801 Laminates and Veneers Labor",
  "6.802": "6.802 Laminates and Veneers Material",
  "6.803": "6.803 Laminates and Veneers Subcontractor",
  "6.901": "6.901 Wood Framing Hardware and Fasteners Labor",
  "6.902": "6.902 Wood Framing Hardware and Fasteners Material",
  "6.903": "6.903 Wood Framing Hardware and Fasteners Subcontractor",
  "7.101": "7.101 Waterproofing Labor",
  "7.102": "7.102 Waterproofing Material",
  "7.103": "7.103 Waterproofing Subcontractor",
  "7.201": "7.201 Insulation Labor",
  "7.202": "7.202 Insulation Material",
  "7.203": "7.203 Insulation Subcontractor",
  "7.301": "7.301 Vapor Retarders Labor",
  "7.302": "7.302 Vapor Retarders Material",
  "7.303": "7.303 Vapor Retarders Subcontractor",
  "7.401": "7.401 Roofing Systems Labor",
  "7.402": "7.402 Roofing Systems Material",
  "7.403": "7.403 Roofing Systems Subcontractor",
  "7.501": "7.501 Roof Specialties and Accessories Labor",
  "7.502": "7.502 Roof Specialties and Accessories Material",
  "7.503": "7.503 Roof Specialties and Accessories Subcontractor",
  "7.601": "7.601 Fireproofing and Firestopping Labor",
  "7.602": "7.602 Fireproofing and Firestopping Material",
  "7.603": "7.603 Fireproofing and Firestopping Subcontractor",
  "7.701": "7.701 Siding and Exterior Wall Finish Systems Labor",
  "7.702": "7.702 Siding and Exterior Wall Finish Systems Material",
  "7.703": "7.703 Siding and Exterior Wall Finish Systems Subcontractor",
  "7.801": "7.801 Sealants and Caulking Labor",
  "7.802": "7.802 Sealants and Caulking Material",
  "7.803": "7.803 Sealants and Caulking Subcontractor",
  "7.901": "7.901 Weather Barriers Labor",
  "7.902": "7.902 Weather Barriers Material",
  "7.903": "7.903 Weather Barriers Subcontractor",
  "8.101": "8.101 Standard Doors Labor",
  "8.102": "8.102 Standard Doors Material",
  "8.103": "8.103 Standard Doors Subcontractor",
  "8.201": "8.201 Specialty Doors Labor",
  "8.202": "8.202 Specialty Doors Material",
  "8.203": "8.203 Specialty Doors Subcontractor",
  "8.301": "8.301 Frames and Jambs Labor",
  "8.302": "8.302 Frames and Jambs Material",
  "8.303": "8.303 Frames and Jambs Subcontractor",
  "8.401": "8.401 Windows Labor",
  "8.402": "8.402 Windows Material",
  "8.403": "8.403 Windows Subcontractor",
  "8.501": "8.501 Skylights and Roof Windows Labor",
  "8.502": "8.502 Skylights and Roof Windows Material",
  "8.503": "8.503 Skylights and Roof Windows Subcontractor",
  "8.601": "8.601 Louvers and Vents Labor",
  "8.602": "8.602 Louvers and Vents Material",
  "8.603": "8.603 Louvers and Vents Subcontractor",
  "8.701": "8.701 Hardware and Fittings Labor",
  "8.702": "8.702 Hardware and Fittings Material",
  "8.703": "8.703 Hardware and Fittings Subcontractor",
  "8.801": "8.801 Glazing Labor",
  "8.802": "8.802 Glazing Material",
  "8.803": "8.803 Glazing Subcontractor",
  "8.901": "8.901 Access Panels and Hatches Labor",
  "8.902": "8.902 Access Panels and Hatches Material",
  "8.903": "8.903 Access Panels and Hatches Subcontractor",
  "9.101": "9.101 Plaster and Gypsum Board Labor",
  "9.102": "9.102 Plaster and Gypsum Board Material",
  "9.103": "9.103 Plaster and Gypsum Board Subcontractor",
  "9.201": "9.201 Acoustical Treatments Labor",
  "9.202": "9.202 Acoustical Treatments Material",
  "9.203": "9.203 Acoustical Treatments Subcontractor",
  "9.301": "9.301 Tile and Stone Labor",
  "9.302": "9.302 Tile and Stone Material",
  "9.303": "9.303 Tile and Stone Subcontractor",
  "9.401": "9.401 Wood Flooring Labor",
  "9.402": "9.402 Wood Flooring Material",
  "9.403": "9.403 Wood Flooring Subcontractor",
  "9.501": "9.501 Resilient Flooring Labor",
  "9.502": "9.502 Resilient Flooring Material",
  "9.503": "9.503 Resilient Flooring Subcontractor",
  "9.601": "9.601 Carpet and Matting Labor",
  "9.602": "9.602 Carpet and Matting Material",
  "9.603": "9.603 Carpet and Matting Subcontractor",
  "9.701": "9.701 Wall Finishes and Coverings Labor",
  "9.702": "9.702 Wall Finishes and Coverings Material",
  "9.703": "9.703 Wall Finishes and Coverings Subcontractor",
  "9.801": "9.801 Painting and Coating Labor",
  "9.802": "9.802 Painting and Coating Material",
  "9.803": "9.803 Painting and Coating Subcontractor",
  "9.901": "9.901 Special Coatings and Finishes Labor",
  "9.902": "9.902 Special Coatings and Finishes Material",
  "9.903": "9.903 Special Coatings and Finishes Subcontractor",
  "10.101": "10.101 Visual Display Boards Labor",
  "10.102": "10.102 Visual Display Boards Material",
  "10.103": "10.103 Visual Display Boards Subcontractor",
  "10.201": "10.201 Signage Labor",
  "10.202": "10.202 Signage Material",
  "10.203": "10.203 Signage Subcontractor",
  "10.301": "10.301 Toilet, Bath, and Laundry Accessories Labor",
  "10.302": "10.302 Toilet, Bath, and Laundry Accessories Material",
  "10.303": "10.303 Toilet, Bath, and Laundry Accessories Subcontractor",
  "10.401": "10.401 Fire Protection Specialties Labor",
  "10.402": "10.402 Fire Protection Specialties Material",
  "10.403": "10.403 Fire Protection Specialties Subcontractor",
  "10.501": "10.501 Lockers and Personal Storage Units Labor",
  "10.502": "10.502 Lockers and Personal Storage Units Material",
  "10.503": "10.503 Lockers and Personal Storage Units Subcontractor",
  "10.601": "10.601 Shelving and Equipment Storage Labor",
  "10.602": "10.602 Shelving and Equipment Storage Material",
  "10.603": "10.603 Shelving and Equipment Storage Subcontractor",
  "10.801": "10.801 Postal Specialties Labor",
  "10.802": "10.802 Postal Specialties Material",
  "10.803": "10.803 Postal Specialties Subcontractor",
  "11.101": "11.101 Office and Administrative Fixtures Labor",
  "11.102": "11.102 Office and Administrative Fixtures Material",
  "11.103": "11.103 Office and Administrative Fixtures Subcontractor",
  "11.201": "11.201 Residential and Hospitality Fixtures Labor",
  "11.202": "11.202 Residential and Hospitality Fixtures Material",
  "11.203": "11.203 Residential and Hospitality Fixtures Subcontractor",
  "11.301": "11.301 Medical and Laboratory Installations Labor",
  "11.302": "11.302 Medical and Laboratory Installations Material",
  "11.303": "11.303 Medical and Laboratory Installations Subcontractor",
  "11.401": "11.401 Kitchen and Food Service Fixtures Labor",
  "11.402": "11.402 Kitchen and Food Service Fixtures Material",
  "11.403": "11.403 Kitchen and Food Service Fixtures Subcontractor",
  "11.501": "11.501 Industrial and Manufacturing Systems Labor",
  "11.502": "11.502 Industrial and Manufacturing Systems Material",
  "11.503": "11.503 Industrial and Manufacturing Systems Subcontractor",
  "11.601": "11.601 Security and Surveillance Systems Labor",
  "11.602": "11.602 Security and Surveillance Systems Material",
  "11.603": "11.603 Security and Surveillance Systems Subcontractor",
  "11.701": "11.701 Educational Fixtures Labor",
  "11.702": "11.702 Educational Fixtures Material",
  "11.703": "11.703 Educational Fixtures Subcontractor",
  "11.801": "11.801 Fixed Seating Labor",
  "11.802": "11.802 Fixed Seating Material",
  "11.803": "11.803 Fixed Seating Subcontractor",
  "12.101": "12.101 Casework and Millwork Labor",
  "12.102": "12.102 Casework and Millwork Material",
  "12.103": "12.103 Casework and Millwork Subcontractor",
  "12.201": "12.201 Furniture Labor",
  "12.202": "12.202 Furniture Material",
  "12.203": "12.203 Furniture Subcontractor",
  "12.301": "12.301 Window Treatments Labor",
  "12.302": "12.302 Window Treatments Material",
  "12.303": "12.303 Window Treatments Subcontractor",
  "12.401": "12.401 Art and Decorative Fixtures Labor",
  "12.402": "12.402 Art and Decorative Fixtures Material",
  "12.403": "12.403 Art and Decorative Fixtures Subcontractor",
  "12.501": "12.501 Rugs and Carpeting Labor",
  "12.502": "12.502 Rugs and Carpeting Material",
  "12.503": "12.503 Rugs and Carpeting Subcontractor",
  "13.101": "13.101 Controlled Environments Labor",
  "13.102": "13.102 Controlled Environments Material",
  "13.103": "13.103 Controlled Environments Subcontractor",
  "13.201": "13.201 Hazardous Material Storage Labor",
  "13.202": "13.202 Hazardous Material Storage Material",
  "13.203": "13.203 Hazardous Material Storage Subcontractor",
  "13.301": "13.301 Sound and Vibration Control Labor",
  "13.302": "13.302 Sound and Vibration Control Material",
  "13.303": "13.303 Sound and Vibration Control Subcontractor",
  "13.401": "13.401 Energy Generation Facilities Labor",
  "13.402": "13.402 Energy Generation Facilities Material",
  "13.403": "13.403 Energy Generation Facilities Subcontractor",
  "13.501": "13.501 Athletic and Recreation Facilities Labor",
  "13.502": "13.502 Athletic and Recreation Facilities Material",
  "13.503": "13.503 Athletic and Recreation Facilities Subcontractor",
  "13.601": "13.601 Seismic Control Systems Labor",
  "13.602": "13.602 Seismic Control Systems Material",
  "13.603": "13.603 Seismic Control Systems Subcontractor",
  "13.701": "13.701 Radiation and Medical Shielding Labor",
  "13.702": "13.702 Radiation and Medical Shielding Material",
  "13.703": "13.703 Radiation and Medical Shielding Subcontractor",
  "13.801": "13.801 Hazardous Waste Containment Labor",
  "13.802": "13.802 Hazardous Waste Containment Material",
  "13.803": "13.803 Hazardous Waste Containment Subcontractor",
  "13.901": "13.901 Specialized Infrastructure Systems Labor",
  "13.902": "13.902 Specialized Infrastructure Systems Material",
  "13.903": "13.903 Specialized Infrastructure Systems Subcontractor",
  "14.101": "14.101 Elevators Labor",
  "14.102": "14.102 Elevators Material",
  "14.103": "14.103 Elevators Subcontractor",
  "14.201": "14.201 Escalators and Moving Walkways Labor",
  "14.202": "14.202 Escalators and Moving Walkways Material",
  "14.203": "14.203 Escalators and Moving Walkways Subcontractor",
  "14.301": "14.301 Dumbwaiters Labor",
  "14.302": "14.302 Dumbwaiters Material",
  "14.303": "14.303 Dumbwaiters Subcontractor",
  "14.401": "14.401 Material Lifts Labor",
  "14.402": "14.402 Material Lifts Material",
  "14.403": "14.403 Material Lifts Subcontractor",
  "14.501": "14.501 Pneumatic Tube Systems Labor",
  "14.502": "14.502 Pneumatic Tube Systems Material",
  "14.503": "14.503 Pneumatic Tube Systems Subcontractor",
  "14.601": "14.601 Wheelchair Lifts and Accessibility Equipment Labor",
  "14.602": "14.602 Wheelchair Lifts and Accessibility Equipment Material",
  "14.603": "14.603 Wheelchair Lifts and Accessibility Equipment Subcontractor",
  "14.701": "14.701 Automated Storage and Retrieval Systems Labor",
  "14.702": "14.702 Automated Storage and Retrieval Systems Material",
  "14.703": "14.703 Automated Storage and Retrieval Systems Subcontractor",
  "21.101": "21.101 Fire Suppression Piping Labor",
  "21.102": "21.102 Fire Suppression Piping Material",
  "21.103": "21.103 Fire Suppression Piping Subcontractor",
  "21.201": "21.201 Sprinkler Systems Labor",
  "21.202": "21.202 Sprinkler Systems Material",
  "21.203": "21.203 Sprinkler Systems Subcontractor",
  "21.301": "21.301 Standpipe Systems Labor",
  "21.302": "21.302 Standpipe Systems Material",
  "21.303": "21.303 Standpipe Systems Subcontractor",
  "21.401": "21.401 Fire Pumps and Water Storage Labor",
  "21.402": "21.402 Fire Pumps and Water Storage Material",
  "21.403": "21.403 Fire Pumps and Water Storage Subcontractor",
  "21.501": "21.501 Special Hazard Suppression Labor",
  "21.502": "21.502 Special Hazard Suppression Material",
  "21.503": "21.503 Special Hazard Suppression Subcontractor",
  "21.601": "21.601 Detection and Alarm Systems Labor",
  "21.602": "21.602 Detection and Alarm Systems Material",
  "21.603": "21.603 Detection and Alarm Systems Subcontractor",
  "22.101": "22.101 Piping Systems Labor",
  "22.102": "22.102 Piping Systems Material",
  "22.103": "22.103 Piping Systems Subcontractor",
  "22.201": "22.201 Plumbing Fixtures Labor",
  "22.202": "22.202 Plumbing Fixtures Material",
  "22.203": "22.203 Plumbing Fixtures Subcontractor",
  "22.301": "22.301 Water Heating Systems Labor",
  "22.302": "22.302 Water Heating Systems Material",
  "22.303": "22.303 Water Heating Systems Subcontractor",
  "22.401": "22.401 Wastewater and Vent Systems Labor",
  "22.402": "22.402 Wastewater and Vent Systems Material",
  "22.403": "22.403 Wastewater and Vent Systems Subcontractor",
  "22.501": "22.501 Pumps and Tanks Labor",
  "22.502": "22.502 Pumps and Tanks Material",
  "22.503": "22.503 Pumps and Tanks Subcontractor",
  "22.601": "22.601 Gas Piping Systems Labor",
  "22.602": "22.602 Gas Piping Systems Material",
  "22.603": "22.603 Gas Piping Systems Subcontractor",
  "22.701": "22.701 Specialty Plumbing Systems Labor",
  "22.702": "22.702 Specialty Plumbing Systems Material",
  "22.703": "22.703 Specialty Plumbing Systems Subcontractor",
  "23.101": "23.101 HVAC Piping Systems Labor",
  "23.102": "23.102 HVAC Piping Systems Material",
  "23.103": "23.103 HVAC Piping Systems Subcontractor",
  "23.201": "23.201 Air Distribution Systems Labor",
  "23.202": "23.202 Air Distribution Systems Material",
  "23.203": "23.203 Air Distribution Systems Subcontractor",
  "23.301": "23.301 Central Heating Equipment Labor",
  "23.302": "23.302 Central Heating Equipment Material",
  "23.303": "23.303 Central Heating Equipment Subcontractor",
  "23.401": "23.401 Cooling Equipment Labor",
  "23.402": "23.402 Cooling Equipment Material",
  "23.403": "23.403 Cooling Equipment Subcontractor",
  "23.501": "23.501 Ventilation Systems Labor",
  "23.502": "23.502 Ventilation Systems Material",
  "23.503": "23.503 Ventilation Systems Subcontractor",
  "23.601": "23.601 Controls and Thermostats Labor",
  "23.602": "23.602 Controls and Thermostats Material",
  "23.603": "23.603 Controls and Thermostats Subcontractor",
  "23.701": "23.701 Insulation and Sealing Labor",
  "23.702": "23.702 Insulation and Sealing Material",
  "23.703": "23.703 Insulation and Sealing Subcontractor",
  "25.101": "25.101 Building Management Systems Labor",
  "25.102": "25.102 Building Management Systems Material",
  "25.103": "25.103 Building Management Systems Subcontractor",
  "25.201": "25.201 Security and Surveillance Labor",
  "25.202": "25.202 Security and Surveillance Material",
  "25.203": "25.203 Security and Surveillance Subcontractor",
  "25.301": "25.301 Energy Management Systems Labor",
  "25.302": "25.302 Energy Management Systems Material",
  "25.303": "25.303 Energy Management Systems Subcontractor",
  "25.401": "25.401 Lighting Control Systems Labor",
  "25.402": "25.402 Lighting Control Systems Material",
  "25.403": "25.403 Lighting Control Systems Subcontractor",
  "25.501": "25.501 Environmental Controls Labor",
  "25.502": "25.502 Environmental Controls Material",
  "25.503": "25.503 Environmental Controls Subcontractor",
  "25.601": "25.601 Communication Networks Labor",
  "25.602": "25.602 Communication Networks Material",
  "25.603": "25.603 Communication Networks Subcontractor",
  "26.101": "26.101 Power Distribution Systems Labor",
  "26.102": "26.102 Power Distribution Systems Material",
  "26.103": "26.103 Power Distribution Systems Subcontractor",
  "26.201": "26.201 Wiring and Cabling Labor",
  "26.202": "26.202 Wiring and Cabling Material",
  "26.203": "26.203 Wiring and Cabling Subcontractor",
  "26.301": "26.301 Lighting Systems Labor",
  "26.302": "26.302 Lighting Systems Material",
  "26.303": "26.303 Lighting Systems Subcontractor",
  "26.401": "26.401 Backup and Emergency Power Labor",
  "26.402": "26.402 Backup and Emergency Power Material",
  "26.403": "26.403 Backup and Emergency Power Subcontractor",
  "26.501": "26.501 Grounding and Bonding Labor",
  "26.502": "26.502 Grounding and Bonding Material",
  "26.503": "26.503 Grounding and Bonding Subcontractor",
  "26.601": "26.601 Electrical Controls and Devices Labor",
  "26.602": "26.602 Electrical Controls and Devices Material",
  "26.603": "26.603 Electrical Controls and Devices Subcontractor",
  "26.701": "26.701 Electrical Testing and Commissioning Labor",
  "26.702": "26.702 Electrical Testing and Commissioning Material",
  "26.703": "26.703 Electrical Testing and Commissioning Subcontractor",
  "26.801": "26.801 Specialty Electrical Systems Labor",
  "26.802": "26.802 Specialty Electrical Systems Material",
  "26.803": "26.803 Specialty Electrical Systems Subcontractor",
  "27.101": "27.101 Structured Cabling Systems Labor",
  "27.102": "27.102 Structured Cabling Systems Material",
  "27.103": "27.103 Structured Cabling Systems Subcontractor",
  "27.201": "27.201 Data Networking Equipment Labor",
  "27.202": "27.202 Data Networking Equipment Material",
  "27.203": "27.203 Data Networking Equipment Subcontractor",
  "27.301": "27.301 Telephone and Voice Systems Labor",
  "27.302": "27.302 Telephone and Voice Systems Material",
  "27.303": "27.303 Telephone and Voice Systems Subcontractor",
  "27.401": "27.401 Audio-Visual Systems Labor",
  "27.402": "27.402 Audio-Visual Systems Material",
  "27.403": "27.403 Audio-Visual Systems Subcontractor",
  "27.501": "27.501 Security and Surveillance Labor",
  "27.502": "27.502 Security and Surveillance Material",
  "27.503": "27.503 Security and Surveillance Subcontractor",
  "27.601": "27.601 Wireless Communication Systems Labor",
  "27.602": "27.602 Wireless Communication Systems Material",
  "27.603": "27.603 Wireless Communication Systems Subcontractor",
  "27.701": "27.701 Public Address and Paging Systems Labor",
  "27.702": "27.702 Public Address and Paging Systems Material",
  "27.703": "27.703 Public Address and Paging Systems Subcontractor",
  "27.801": "27.801 Communication Testing and Commissioning Labor",
  "27.802": "27.802 Communication Testing and Commissioning Material",
  "27.803": "27.803 Communication Testing and Commissioning Subcontractor",
  "28.101": "28.101 Access Control Systems Labor",
  "28.102": "28.102 Access Control Systems Material",
  "28.103": "28.103 Access Control Systems Subcontractor",
  "28.201": "28.201 Video Surveillance Labor",
  "28.202": "28.202 Video Surveillance Material",
  "28.203": "28.203 Video Surveillance Subcontractor",
  "28.301": "28.301 Intrusion Detection Systems Labor",
  "28.302": "28.302 Intrusion Detection Systems Material",
  "28.303": "28.303 Intrusion Detection Systems Subcontractor",
  "28.401": "28.401 Fire Detection and Alarm Systems Labor",
  "28.402": "28.402 Fire Detection and Alarm Systems Material",
  "28.403": "28.403 Fire Detection and Alarm Systems Subcontractor",
  "28.501": "28.501 Emergency Communication Systems Labor",
  "28.502": "28.502 Emergency Communication Systems Material",
  "28.503": "28.503 Emergency Communication Systems Subcontractor",
  "28.601": "28.601 Public Safety Radio Systems Labor",
  "28.602": "28.602 Public Safety Radio Systems Material",
  "28.603": "28.603 Public Safety Radio Systems Subcontractor",
  "28.701": "28.701 Security System Monitoring and Control Labor",
  "28.702": "28.702 Security System Monitoring and Control Material",
  "28.703": "28.703 Security System Monitoring and Control Subcontractor",
  "28.801": "28.801 Testing and Commissioning Labor",
  "28.802": "28.802 Testing and Commissioning Material",
  "28.803": "28.803 Testing and Commissioning Subcontractor",
  "31.101": "31.101 Excavation Labor",
  "31.102": "31.102 Excavation Material",
  "31.103": "31.103 Excavation Subcontractor",
  "31.201": "31.201 Shoring and Underpinning Labor",
  "31.202": "31.202 Shoring and Underpinning Material",
  "31.203": "31.203 Shoring and Underpinning Subcontractor",
  "31.301": "31.301 Dewatering Labor",
  "31.302": "31.302 Dewatering Material",
  "31.303": "31.303 Dewatering Subcontractor",
  "31.401": "31.401 Rough Grading Labor",
  "31.402": "31.402 Rough Grading Material",
  "31.403": "31.403 Rough Grading Subcontractor",
  "31.501": "31.501 Backfilling and Compaction Labor",
  "31.502": "31.502 Backfilling and Compaction Material",
  "31.503": "31.503 Backfilling and Compaction Subcontractor",
  "31.601": "31.601 Soil Stabilization Labor",
  "31.602": "31.602 Soil Stabilization Material",
  "31.603": "31.603 Soil Stabilization Subcontractor",
  "31.701": "31.701 Slope Protection and Retaining Labor",
  "31.702": "31.702 Slope Protection and Retaining Material",
  "31.703": "31.703 Slope Protection and Retaining Subcontractor",
  "31.801": "31.801 Erosion and Sedimentation Control Labor",
  "31.802": "31.802 Erosion and Sedimentation Control Material",
  "31.803": "31.803 Erosion and Sedimentation Control Subcontractor",
  "32.101": "32.101 Final Grading Labor",
  "32.102": "32.102 Final Grading Material",
  "32.103": "32.103 Final Grading Subcontractor",
  "32.201": "32.201 Asphalt Paving Labor",
  "32.202": "32.202 Asphalt Paving Material",
  "32.203": "32.203 Asphalt Paving Subcontractor",
  "32.301": "32.301 Concrete Paving Labor",
  "32.302": "32.302 Concrete Paving Material",
  "32.303": "32.303 Concrete Paving Subcontractor",
  "32.401": "32.401 Curb and Gutters Labor",
  "32.402": "32.402 Curb and Gutters Material",
  "32.403": "32.403 Curb and Gutters Subcontractor",
  "32.501": "32.501 Exterior Lighting Labor",
  "32.502": "32.502 Exterior Lighting Material",
  "32.503": "32.503 Exterior Lighting Subcontractor",
  "32.601": "32.601 Fences and Gates Labor",
  "32.602": "32.602 Fences and Gates Material",
  "32.603": "32.603 Fences and Gates Subcontractor",
  "32.701": "32.701 Landscaping Labor",
  "32.702": "32.702 Landscaping Material",
  "32.703": "32.703 Landscaping Subcontractor",
  "32.751": "32.751 Ground Support and Erosion Control Labor",
  "32.752": "32.752 Ground Support and Erosion Control Material",
  "32.753": "32.753 Ground Support and Erosion Control Subcontractor",
  "32.801": "32.801 Irrigation Systems Labor",
  "32.802": "32.802 Irrigation Systems Material",
  "32.803": "32.803 Irrigation Systems Subcontractor",
  "32.901": "32.901 Athletic and Recreation Surfaces Labor",
  "32.902": "32.902 Athletic and Recreation Surfaces Material",
  "32.903": "32.903 Athletic and Recreation Surfaces Subcontractor",
  "32.951": "32.951 Site Amenities Labor",
  "32.952": "32.952 Site Amenities Material",
  "32.953": "32.953 Site Amenities Subcontractor",
  "33.101": "33.101 Water Supply Labor",
  "33.102": "33.102 Water Supply Material",
  "33.103": "33.103 Water Supply Subcontractor",
  "33.201": "33.201 Sanitary Sewer Labor",
  "33.202": "33.202 Sanitary Sewer Material",
  "33.203": "33.203 Sanitary Sewer Subcontractor",
  "33.301": "33.301 Storm Drainage Labor",
  "33.302": "33.302 Storm Drainage Material",
  "33.303": "33.303 Storm Drainage Subcontractor",
  "33.401": "33.401 Natural Gas Labor",
  "33.402": "33.402 Natural Gas Material",
  "33.403": "33.403 Natural Gas Subcontractor",
  "33.501": "33.501 Electrical Power Distribution Labor",
  "33.502": "33.502 Electrical Power Distribution Material",
  "33.503": "33.503 Electrical Power Distribution Subcontractor",
  "33.601": "33.601 Telecommunications Labor",
  "33.602": "33.602 Telecommunications Material",
  "33.603": "33.603 Telecommunications Subcontractor",
  "33.701": "33.701 Utility Relocation Labor",
  "33.702": "33.702 Utility Relocation Material",
  "33.703": "33.703 Utility Relocation Subcontractor",
  "34.101": "34.101 Roadways Labor",
  "34.102": "34.102 Roadways Material",
  "34.103": "34.103 Roadways Subcontractor",
  "34.201": "34.201 Parking Areas Labor",
  "34.202": "34.202 Parking Areas Material",
  "34.203": "34.203 Parking Areas Subcontractor",
  "34.301": "34.301 Bridges and Overpasses Labor",
  "34.302": "34.302 Bridges and Overpasses Material",
  "34.303": "34.303 Bridges and Overpasses Subcontractor",
  "34.401": "34.401 Tunnels Labor",
  "34.402": "34.402 Tunnels Material",
  "34.403": "34.403 Tunnels Subcontractor",
  "34.501": "34.501 Rail Systems Labor",
  "34.502": "34.502 Rail Systems Material",
  "34.503": "34.503 Rail Systems Subcontractor",
  "34.601": "34.601 Pedestrian Pathways Labor",
  "34.602": "34.602 Pedestrian Pathways Material",
  "34.603": "34.603 Pedestrian Pathways Subcontractor",
  "34.701": "34.701 Bicycle Infrastructure Labor",
  "34.702": "34.702 Bicycle Infrastructure Material",
  "34.703": "34.703 Bicycle Infrastructure Subcontractor",
  "34.801": "34.801 Signage and Wayfinding Systems Labor",
  "34.802": "34.802 Signage and Wayfinding Systems Material",
  "34.803": "34.803 Signage and Wayfinding Systems Subcontractor",
  "34.901": "34.901 Traffic Control Labor",
  "34.902": "34.902 Traffic Control Material",
  "34.903": "34.903 Traffic Control Subcontractor",
  "34.991": "34.991 Uncategorized Labor",
  "34.992": "34.992 Uncategorized Material",
  "34.993": "34.993 Uncategorized Subcontractor",
  "35.101": "35.101 Dredging and Excavation Labor",
  "35.102": "35.102 Dredging and Excavation Material",
  "35.103": "35.103 Dredging and Excavation Subcontractor",
  "35.201": "35.201 Piers, Docks, and Platforms Labor",
  "35.202": "35.202 Piers, Docks, and Platforms Material",
  "35.203": "35.203 Piers, Docks, and Platforms Subcontractor",
  "35.301": "35.301 Shoreline Protection Labor",
  "35.302": "35.302 Shoreline Protection Material",
  "35.303": "35.303 Shoreline Protection Subcontractor",
  "35.401": "35.401 Lock and Dam Structures Labor",
  "35.402": "35.402 Lock and Dam Structures Material",
  "35.403": "35.403 Lock and Dam Structures Subcontractor",
  "40.201": "40.201 Instrumentation and Controls Labor",
  "40.202": "40.202 Instrumentation and Controls Material",
  "40.203": "40.203 Instrumentation and Controls Subcontractor",
  "40.301": "40.301 Valves and Regulators Labor",
  "40.302": "40.302 Valves and Regulators Material",
  "40.303": "40.303 Valves and Regulators Subcontractor",
  "40.401": "40.401 Process Support Systems Labor",
  "40.402": "40.402 Process Support Systems Material",
  "40.403": "40.403 Process Support Systems Subcontractor",
  "40.501": "40.501 Process Control Wiring Labor",
  "40.502": "40.502 Process Control Wiring Material",
  "40.503": "40.503 Process Control Wiring Subcontractor",
  "40.601": "40.601 Safety and Shutdown Systems Labor",
  "40.602": "40.602 Safety and Shutdown Systems Material",
  "40.603": "40.603 Safety and Shutdown Systems Subcontractor",
  "40.701": "40.701 Process Interlocks Labor",
  "40.702": "40.702 Process Interlocks Material",
  "40.703": "40.703 Process Interlocks Subcontractor",
  "40.801": "40.801 Mechanical Supports and Anchors Labor",
  "40.802": "40.802 Mechanical Supports and Anchors Material",
  "40.803": "40.803 Mechanical Supports and Anchors Subcontractor",
  "41.101": "41.101 Conveying Systems Labor",
  "41.102": "41.102 Conveying Systems Material",
  "41.103": "41.103 Conveying Systems Subcontractor",
  "41.201": "41.201 Hoisting and Lifting Systems Labor",
  "41.202": "41.202 Hoisting and Lifting Systems Material",
  "41.203": "41.203 Hoisting and Lifting Systems Subcontractor",
  "41.301": "41.301 Mixing and Blending Equipment Labor",
  "41.302": "41.302 Mixing and Blending Equipment Material",
  "41.303": "41.303 Mixing and Blending Equipment Subcontractor",
  "41.401": "41.401 Crushing and Pulverizing Equipment Labor",
  "41.402": "41.402 Crushing and Pulverizing Equipment Material",
  "41.403": "41.403 Crushing and Pulverizing Equipment Subcontractor",
  "41.501": "41.501 Screening and Sorting Equipment Labor",
  "41.502": "41.502 Screening and Sorting Equipment Material",
  "41.503": "41.503 Screening and Sorting Equipment Subcontractor",
  "41.601": "41.601 Washing and Cleaning Systems Labor",
  "41.602": "41.602 Washing and Cleaning Systems Material",
  "41.603": "41.603 Washing and Cleaning Systems Subcontractor",
  "41.701": "41.701 Packaging and Wrapping Systems Labor",
  "41.702": "41.702 Packaging and Wrapping Systems Material",
  "41.703": "41.703 Packaging and Wrapping Systems Subcontractor",
  "42.101": "42.101 Industrial Boilers Labor",
  "42.102": "42.102 Industrial Boilers Material",
  "42.103": "42.103 Industrial Boilers Subcontractor",
  "42.201": "42.201 Furnaces and Kilns Labor",
  "42.202": "42.202 Furnaces and Kilns Material",
  "42.203": "42.203 Furnaces and Kilns Subcontractor",
  "42.301": "42.301 Heat Exchangers Labor",
  "42.302": "42.302 Heat Exchangers Material",
  "42.303": "42.303 Heat Exchangers Subcontractor",
  "42.401": "42.401 Cooling Towers Labor",
  "42.402": "42.402 Cooling Towers Material",
  "42.403": "42.403 Cooling Towers Subcontractor",
  "42.501": "42.501 Industrial Ovens Labor",
  "42.502": "42.502 Industrial Ovens Material",
  "42.503": "42.503 Industrial Ovens Subcontractor",
  "42.601": "42.601 Industrial Dryers Labor",
  "42.602": "42.602 Industrial Dryers Material",
  "42.603": "42.603 Industrial Dryers Subcontractor",
  "42.701": "42.701 Refrigeration Systems Labor",
  "42.702": "42.702 Refrigeration Systems Material",
  "42.703": "42.703 Refrigeration Systems Subcontractor",
  "42.801": "42.801 Air Handling and Ventilation Labor",
  "42.802": "42.802 Air Handling and Ventilation Material",
  "42.803": "42.803 Air Handling and Ventilation Subcontractor",
  "43.101": "43.101 Gas and Liquid Handling Systems Labor",
  "43.102": "43.102 Gas and Liquid Handling Systems Material",
  "43.103": "43.103 Gas and Liquid Handling Systems Subcontractor",
  "43.201": "43.201 Storage Tanks and Systems Labor",
  "43.202": "43.202 Storage Tanks and Systems Material",
  "43.203": "43.203 Storage Tanks and Systems Subcontractor",
  "43.301": "43.301 Filtration and Purification Equipment Labor",
  "43.302": "43.302 Filtration and Purification Equipment Material",
  "43.303": "43.303 Filtration and Purification Equipment Subcontractor",
  "43.401": "43.401 Temperature Control for Fluids Labor",
  "43.402": "43.402 Temperature Control for Fluids Material",
  "43.403": "43.403 Temperature Control for Fluids Subcontractor",
  "43.501": "43.501 Chemical Treatment and Mixing Systems Labor",
  "43.502": "43.502 Chemical Treatment and Mixing Systems Material",
  "43.503": "43.503 Chemical Treatment and Mixing Systems Subcontractor",
  "44.101": "44.101 Air Pollution Control Systems Labor",
  "44.102": "44.102 Air Pollution Control Systems Material",
  "44.103": "44.103 Air Pollution Control Systems Subcontractor",
  "44.201": "44.201 Water Pollution Control Systems Labor",
  "44.202": "44.202 Water Pollution Control Systems Material",
  "44.203": "44.203 Water Pollution Control Systems Subcontractor",
  "44.301": "44.301 Solid Waste Management Labor",
  "44.302": "44.302 Solid Waste Management Material",
  "44.303": "44.303 Solid Waste Management Subcontractor",
  "44.401": "44.401 Hazardous Material Handling Labor",
  "44.402": "44.402 Hazardous Material Handling Material",
  "44.403": "44.403 Hazardous Material Handling Subcontractor",
  "44.501": "44.501 Emission Monitoring Systems Labor",
  "44.502": "44.502 Emission Monitoring Systems Material",
  "44.503": "44.503 Emission Monitoring Systems Subcontractor",
  "44.601": "44.601 Spill Containment Systems Labor",
  "44.602": "44.602 Spill Containment Systems Material",
  "44.603": "44.603 Spill Containment Systems Subcontractor",
  "45.101": "45.101 Specialized Processing Units Labor",
  "45.102": "45.102 Specialized Processing Units Material",
  "45.103": "45.103 Specialized Processing Units Subcontractor",
  "45.201": "45.201 Custom Fabrication Systems Labor",
  "45.202": "45.202 Custom Fabrication Systems Material",
  "45.203": "45.203 Custom Fabrication Systems Subcontractor",
  "45.301": "45.301 Packaging, Sealing, and Labeling Systems Labor",
  "45.302": "45.302 Packaging, Sealing, and Labeling Systems Material",
  "45.303": "45.303 Packaging, Sealing, and Labeling Systems Subcontractor",
  "45.401": "45.401 Quality Control and Testing Units Labor",
  "45.402": "45.402 Quality Control and Testing Units Material",
  "45.403": "45.403 Quality Control and Testing Units Subcontractor",
  "45.501": "45.501 Sanitation and Sterilization Equipment Labor",
  "45.502": "45.502 Sanitation and Sterilization Equipment Material",
  "45.503": "45.503 Sanitation and Sterilization Equipment Subcontractor",
  "45.601": "45.601 Safety Compliance Systems Labor",
  "45.602": "45.602 Safety Compliance Systems Material",
  "45.603": "45.603 Safety Compliance Systems Subcontractor",
  "46.101": "46.101 Water Supply Systems Labor",
  "46.102": "46.102 Water Supply Systems Material",
  "46.103": "46.103 Water Supply Systems Subcontractor",
  "46.201": "46.201 Wastewater Collection and Conveyance Labor",
  "46.202": "46.202 Wastewater Collection and Conveyance Material",
  "46.203": "46.203 Wastewater Collection and Conveyance Subcontractor",
  "46.301": "46.301 On-Site Wastewater Treatment Labor",
  "46.302": "46.302 On-Site Wastewater Treatment Material",
  "46.303": "46.303 On-Site Wastewater Treatment Subcontractor",
  "46.401": "46.401 Stormwater Management Labor",
  "46.402": "46.402 Stormwater Management Material",
  "46.403": "46.403 Stormwater Management Subcontractor",
  "46.501": "46.501 Water Recycling and Reuse Systems Labor",
  "46.502": "46.502 Water Recycling and Reuse Systems Material",
  "46.503": "46.503 Water Recycling and Reuse Systems Subcontractor",
  "46.601": "46.601 Chemical Treatment Systems Labor",
  "46.602": "46.602 Chemical Treatment Systems Material",
  "46.603": "46.603 Chemical Treatment Systems Subcontractor",
  "46.701": "46.701 Monitoring and Control Equipment Labor",
  "46.702": "46.702 Monitoring and Control Equipment Material",
  "46.703": "46.703 Monitoring and Control Equipment Subcontractor",
  "48.101": "48.101 Renewable Energy Systems Labor",
  "48.102": "48.102 Renewable Energy Systems Material",
  "48.103": "48.103 Renewable Energy Systems Subcontractor",
  "48.201": "48.201 Backup Power Generation Labor",
  "48.202": "48.202 Backup Power Generation Material",
  "48.203": "48.203 Backup Power Generation Subcontractor",
  "48.301": "48.301 Microgrid Systems Labor",
  "48.302": "48.302 Microgrid Systems Material",
  "48.303": "48.303 Microgrid Systems Subcontractor",
  "48.401": "48.401 Energy Storage Systems Labor",
  "48.402": "48.402 Energy Storage Systems Material",
  "48.403": "48.403 Energy Storage Systems Subcontractor",
  "48.501": "48.501 Cogeneration Systems Labor",
  "48.502": "48.502 Cogeneration Systems Material",
  "48.503": "48.503 Cogeneration Systems Subcontractor",
  "48.601": "48.601 Power Conversion Equipment Labor",
  "48.602": "48.602 Power Conversion Equipment Material",
  "48.603": "48.603 Power Conversion Equipment Subcontractor",
  "48.701": "48.701 System Monitoring and Controls Labor",
  "48.702": "48.702 System Monitoring and Controls Material",
  "48.703": "48.703 System Monitoring and Controls Subcontractor"
};

// Returns the canonical label for a cost code, fixing common AI errors:
// - Strips leading zero on single-digit divisions ("01.101" -> "1.101")
// - Validates against VALID_CSI_CODES master list
// - Fixes suffix to match cost type (01=Labor, 02=Material, 03=Subcontractor)
// - Falls back to a sane default within the same division if invalid
function normalizeCostCode(rawCode, costType, divNum){
  if(!rawCode) rawCode = "";
  rawCode = String(rawCode).trim();

  // Extract just the numeric prefix (e.g., "01.101" -> "1.101")
  let prefix = rawCode;
  const m = rawCode.match(/^(\d+)\.(\d+)/);
  if(m){
    // Strip leading zero on division
    const div = String(parseInt(m[1], 10));
    let sub = m[2];
    // Truncate 4-digit hallucinations like "0103" to 3 digits "103"
    if(sub.length === 4) sub = sub.slice(-3);
    prefix = div + "." + sub;
  }

  // Force the suffix digit to match the cost type
  const suffixMap = { Labor: "1", Material: "2", Subcontractor: "3" };
  const wantSuffix = suffixMap[costType];
  if(wantSuffix && prefix.length >= 4){
    // Replace last digit with the correct suffix
    prefix = prefix.slice(0, -1) + wantSuffix;
  }

  // Look up canonical label
  if(VALID_CSI_CODES[prefix]) return VALID_CSI_CODES[prefix];

  // Fallback: try to find any valid code in the same division with matching suffix
  const targetDiv = divNum ? String(parseInt(divNum, 10)) : prefix.split(".")[0];
  const wantSfx = wantSuffix || "1";
  const fallbackKey = Object.keys(VALID_CSI_CODES).find(k => {
    const parts = k.split(".");
    return parts[0] === targetDiv && parts[1].endsWith(wantSfx);
  });
  if(fallbackKey) return VALID_CSI_CODES[fallbackKey];

  // Last resort: generic 1.101
  return "1.101 Project Administration and General Office Labor";
}


function getCSIDiv(name){
  if(!name) return { num:"01", name:"01 General Requirements" };
  if(CSI_DIV_MAP[name]) return CSI_DIV_MAP[name];
  const key = Object.keys(CSI_DIV_MAP).find(k =>
    name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(name.toLowerCase())
  );
  return key ? CSI_DIV_MAP[key] : { num:"01", name:"01 General Requirements" };
}

// Trades CMB self-performs (splits into Labor + Material rows in Excel)
const SELF_PERFORM_TRADES = [
  "Demolition", "Selective Demolition",
  "Framing", "Rough Framing", "Rough Carpentry",
  "Finish Carpentry", "Trim", "Millwork",
  "Project Management", "Superintendent", "General Conditions",
  "Cleanup", "Dumpster", "Temporary Facilities",
  "Deck", "Decking", "Composite Decking",
  "Doors", "Exterior Doors", "Hardware", "Doors & Windows",
  "Siding", "Exterior Cladding",
  "Windows"
];

function isSelfPerform(sectionName){
  if(!sectionName) return false;
  const lower = sectionName.toLowerCase();
  return SELF_PERFORM_TRADES.some(t =>
    lower.includes(t.toLowerCase()) || t.toLowerCase().includes(lower)
  );
}

function getExampleCodesForSection(name){
  const div = getCSIDiv(name).num;
  const examples = {
    "00": ["0.101 Permits and Approvals Labor", "0.203 Design and Pre-Construction Services Subcontractor"],
    "01": ["1.101 Project Administration and General Office Labor", "1.201 Project Personnel Costs Labor", "1.901 Cleaning and Site Maintenance Labor", "1.902 Cleaning and Site Maintenance Material"],
    "02": ["2.201 Demolition and Removal Labor", "2.202 Demolition and Removal Material"],
    "03": ["3.301 Cast-in-Place Concrete Labor", "3.302 Cast-in-Place Concrete Material", "3.303 Cast-in-Place Concrete Subcontractor"],
    "06": ["6.101 Rough Carpentry Labor", "6.102 Rough Carpentry Material", "6.201 Finish Carpentry Labor", "6.202 Finish Carpentry Material"],
    "07": ["7.201 Insulation Subcontractor", "7.401 Roofing Systems Subcontractor", "7.701 Siding and Exterior Wall Finish Systems Labor", "7.702 Siding and Exterior Wall Finish Systems Material"],
    "08": ["8.101 Standard Doors Labor", "8.102 Standard Doors Material", "8.401 Windows Labor", "8.402 Windows Material"],
    "09": ["9.103 Plaster and Gypsum Board Subcontractor", "9.303 Tile and Stone Subcontractor", "9.503 Resilient Flooring Subcontractor", "9.803 Painting and Coating Subcontractor"],
    "11": ["11.202 Residential and Hospitality Fixtures Material", "11.203 Residential and Hospitality Fixtures Subcontractor"],
    "12": ["12.103 Casework and Millwork Subcontractor", "12.203 Furniture Subcontractor"],
    "22": ["22.103 Piping Systems Subcontractor", "22.203 Plumbing Fixtures Subcontractor"],
    "23": ["23.203 Air Distribution Systems Subcontractor", "23.303 Central Heating Equipment Subcontractor"],
    "26": ["26.103 Power Distribution Systems Subcontractor", "26.203 Wiring and Cabling Subcontractor", "26.303 Lighting Systems Subcontractor"],
    "31": ["31.103 Excavation Subcontractor", "31.403 Rough Grading Subcontractor"],
    "32": ["32.203 Asphalt Paving Subcontractor", "32.703 Landscaping Subcontractor"],
    "33": ["33.103 Water Supply Subcontractor", "33.203 Sanitary Sewer Subcontractor"]
  };
  return (examples[div] || examples["01"]).join("\n  ");
}


// ── Buildertrend v2 import builder ─────────────────────────────────────
// Detects old-format line items (missing costCode/costType) — caller regenerates when true.
function lineItemsLookStale(items){
  if(!items || !items.length) return true;
  const first = items[0];
  return !(first.costCode && first.costType);
}

async function ensureLineItemsForExport(est, onStatus){
  for(let i=0; i<(est.sections||[]).length; i++){
    const section = est.sections[i];
    if(!section.lineItems || section.lineItems.length === 0 || lineItemsLookStale(section.lineItems)){
      if(onStatus) onStatus(`Generating line items for ${section.name}...`);
      const sectionDiv = getCSIDiv(section.name);
      const sectionIsSelfPerform = isSelfPerform(section.name);
      const highTotal = section.high || 0;

      const validCodesForDiv = Object.keys(VALID_CSI_CODES)
        .filter(k => parseInt(k.split(".")[0], 10) === parseInt(sectionDiv.num, 10))
        .map(k => VALID_CSI_CODES[k])
        .join("\n  ");

      const prompt = `Generate line items for the "${section.name}" section of a construction estimate in Flathead Valley, Montana.

TARGET TOTAL: $${highTotal.toLocaleString()} (Quantity × Unit Cost should sum to this high-side number)
CSI DIVISION: ${sectionDiv.name}
SELF-PERFORM: ${sectionIsSelfPerform ? "YES — split each item into Labor + Material rows" : "NO — use single Subcontractor rows"}

SELF-PERFORM RULE:
- If self-perform YES: every work item gets TWO rows — one "Labor" (qty in HR, unit cost is CMB rate $85/$100/$130) and one "Material" (qty in SF/LF/EA/LS, unit cost is material only).
- If self-perform NO: every work item gets ONE row, costType="Subcontractor", qty in SF/LF/EA/LS/LOT, unit cost is the all-in sub price.
- Exception within self-perform: PM, Supervision, Permits, Insurance can be Labor-only (no Material row).
- Exception within non-self-perform: Appliances, Fixtures, and pure-material allowances can be Material-only rows.

ALLOWANCE RULE:
Set markedAs="Allowance" when EITHER:
  (a) client selection is still TBD (appliances, fixtures, countertop material, tile style, lights, flooring style), OR
  (b) it's a lump-sum carry (permits, A&E, septic design, well design)
Otherwise leave markedAs empty string "".

CSI CODE RULE — STRICT:
- costCode must be the EXACT TEXT of one of these codes from CSI Division ${parseInt(sectionDiv.num, 10)}:
  ${validCodesForDiv}
- Choose the code matching the cost type: codes ending "01" = Labor, "02" = Material, "03" = Subcontractor
- DO NOT invent codes. DO NOT use leading zeros (use "1.101" not "01.101", use "9.301" not "09.301")
- DO NOT modify the label text after the number — copy the full canonical label verbatim

DESCRIPTION RULE: Write a short 5-12 word description of what the line covers (e.g., "Remove existing uppers and lowers", "Prime + 2 coats, walls and ceiling").

Generate 8-12 line items. Sum of (qty × unitCost) across all items must equal $${highTotal.toLocaleString()} (±5% tolerance).

Return ONLY this JSON array:
[{"title":"short trade name","description":"5-12 word desc","costCode":"X.YZZ Full Code Name","quantity":0,"unit":"SF|LF|EA|LS|HR|LOT","unitCost":0,"costType":"Labor|Material|Subcontractor","markedAs":""}]`;

      const models = ["claude-haiku-4-5-20251001","claude-sonnet-4-20250514"];
      let gotItems = null;
      for(let attempt=0; attempt<models.length && !gotItems; attempt++){
        try {
          const res = await fetch("https://billowing-snowflake-38f0.coppermountainbuilders406.workers.dev", {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({
              model: models[attempt], max_tokens: 2000,
              system: "You are a construction estimator in Flathead Valley, Montana. Return ONLY a valid JSON array. No markdown, no prose.",
              messages: [{role:"user", content: prompt}]
            })
          });
          if(!res.ok){
            if((res.status===529 || res.status===503) && attempt < models.length-1){
              await new Promise(r=>setTimeout(r, (attempt+1)*2500));
              continue;
            }
            break;
          }
          const data = await res.json();
          if(data.error){
            const errStr = JSON.stringify(data.error);
            if((errStr.includes("overloaded") || errStr.includes("rate_limit")) && attempt < models.length-1){
              await new Promise(r=>setTimeout(r, (attempt+1)*2500));
              continue;
            }
            break;
          }
          let raw = data.content[0].text.replace(/```json/g,"").replace(/```/g,"").trim();
          const start = raw.indexOf("["), end = raw.lastIndexOf("]");
          if(start!==-1 && end!==-1){
            gotItems = JSON.parse(raw.slice(start, end+1));
          }
        } catch(e){
          console.warn(`Line item gen attempt ${attempt+1} failed for ${section.name}:`, e);
        }
      }
      if(gotItems){
        const items = gotItems;
        const div = getCSIDiv(section.name);
        // FIX 4: validate + normalize every item returned by the AI
        items.forEach(item => {
          // Normalize cost code against the canonical master list
          item.costCode = normalizeCostCode(item.costCode, item.costType, div.num);
          // Sanitize cost type to one of the three valid values
          if(!["Labor", "Material", "Subcontractor"].includes(item.costType)){
            item.costType = sectionIsSelfPerform ? "Labor" : "Subcontractor";
          }
          // Default empty markedAs to ""
          if(!item.markedAs) item.markedAs = "";
        });

        // FIX 5: scale line items so sum(qty × unitCost) equals section.high exactly
        const targetTotal = section.high || 0;
        const currentTotal = items.reduce((sum, it) => sum + (Number(it.quantity)||0) * (Number(it.unitCost)||0), 0);
        if(currentTotal > 0 && targetTotal > 0){
          const scaleFactor = targetTotal / currentTotal;
          items.forEach(it => {
            it.unitCost = Math.round((Number(it.unitCost)||0) * scaleFactor * 100) / 100;
          });
        }
        est.sections[i].lineItems = items;
      }
    }
  }
}

function buildBTWorkbook(est){
  const wb = XLSX.utils.book_new();
  const marginPct = appData.marginPercent || 20;

  const rows = [];
  (est.sections||[]).forEach(section => {
    const div = getCSIDiv(section.name);
    (section.lineItems||[]).forEach(item => {
      rows.push({
        category: div.name,
        costCode: item.costCode || "",
        title: item.title || item.description || section.name,
        description: item.description || "",
        quantity: item.quantity || item.qty || 1,
        unit: item.unit || "LS",
        unitCost: item.unitCost || 0,
        costType: item.costType || (isSelfPerform(section.name) ? "Labor" : "Subcontractor"),
        markedAs: item.markedAs || "",
        csiNum: parseInt(div.num, 10) || 99
      });
    });
  });

  if(est.generalConditions && est.generalConditions.items && est.generalConditions.items.length){
    const div = getCSIDiv("General Conditions");
    est.generalConditions.items.forEach(gc => {
      rows.push({
        category: div.name,
        costCode: gc.costCode || "1.101 Project Administration and General Office Labor",
        title: gc.name || gc.title || "General Conditions Item",
        description: gc.description || "",
        quantity: gc.quantity || gc.qty || 1,
        unit: gc.unit || "LS",
        unitCost: gc.unitCost || gc.high || 0,
        costType: gc.costType || "Labor",
        markedAs: gc.markedAs || "",
        csiNum: parseInt(div.num, 10) || 99
      });
    });
  }

  // FIX 6: sanity-check total before sort — logs a warning if Excel diverges from doc total
  const finalTotal = rows.reduce((sum, r) => sum + (Number(r.quantity)||0) * (Number(r.unitCost)||0), 0);
  const expectedTotal = (est.sections||[]).reduce((s, sec) => s + (sec.high||0), 0);
  const tolerance = 0.05; // 5%
  if(Math.abs(finalTotal - expectedTotal) / Math.max(expectedTotal, 1) > tolerance){
    console.warn(`Excel total mismatch: $${finalTotal.toLocaleString()} vs expected $${expectedTotal.toLocaleString()}`);
  }

  rows.sort((a,b) => a.csiNum - b.csiNum);

  const headers = ["Category","Cost Code","Title","Description","Quantity","Unit","Unit Cost","Cost Type","Marked As","Builder Cost","Markup","Markup Type","Client Price","Margin","Profit"];
  const aoa = [headers];

  rows.forEach(r => {
    aoa.push([
      r.category, r.costCode, r.title, r.description,
      r.quantity, r.unit, r.unitCost, r.costType, r.markedAs,
      null, marginPct, "%", null, null, null
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!cols'] = [
    {wch:42},{wch:48},{wch:32},{wch:42},{wch:11},{wch:8},{wch:13},
    {wch:15},{wch:13},{wch:14},{wch:10},{wch:13},{wch:14},{wch:11},{wch:13}
  ];

  for(let i = 0; i < rows.length; i++){
    const r = i + 2;
    ws[`J${r}`] = { t:'n', f:`E${r}*G${r}`, z:'"$"#,##0.00' };
    ws[`M${r}`] = { t:'n', f:`J${r}*(1+K${r}/100)`, z:'"$"#,##0.00' };
    ws[`O${r}`] = { t:'n', f:`M${r}-J${r}`, z:'"$"#,##0.00' };
    ws[`N${r}`] = { t:'n', f:`IF(M${r}=0,0,O${r}/M${r})`, z:'0.00%' };
    if(ws[`E${r}`]) ws[`E${r}`].z = '#,##0.00';
    if(ws[`G${r}`]) ws[`G${r}`].z = '"$"#,##0.00';
    if(ws[`K${r}`]) ws[`K${r}`].z = '0.00';
  }

  for(let c = 0; c < headers.length; c++){
    const cellRef = XLSX.utils.encode_cell({r:0, c});
    if(ws[cellRef]) ws[cellRef].s = { font: { bold: true } };
  }

  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return wb;
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
    await ensureLineItemsForExport(est, (msg) => { btn.textContent = "⏳ " + msg; });

    btn.textContent = "⏳ Building Excel file...";
    const wb = buildBTWorkbook(est);

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

function generateSignedContractBlob(){
  const d = appData;
  const dt = today();
  const clientName = esc(d.clientName||"");
  const clientAddr = `${esc(d.clientAddress||"")}, ${esc(d.clientCity||"")}, Montana ${esc(d.clientZip||"")}`;
  const projectAddr = `${esc(d.projectAddress||"")}, ${esc(d.projectCity||"")}, Montana ${esc(d.clientZip||"")}`;
  const retainer = fmt$(d.retainerAmount||0);
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="ProgId" content="Word.Document"><style>
    @page{size:8.5in 11in;margin:1in} body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.6;color:#2C2A27;margin:0;padding:20px}
    h1{font-size:20pt;font-weight:bold;color:#B87333;text-align:center;margin-bottom:5px}
    h2{font-size:11pt;font-weight:bold;color:#B87333;letter-spacing:2px;text-transform:uppercase;margin:20px 0 8px 0;border-bottom:1px solid #e0d0b0;padding-bottom:4px}
    p{margin:6px 0} .indent{padding-left:20px}
    .header{text-align:center;border-bottom:3px solid #B87333;padding-bottom:15px;margin-bottom:20px}
    .page-break{page-break-before:always}
  </style></head><body>
    <div class="header">
      <h1>COPPER MOUNTAIN BUILDERS</h1>
      <p style="font-size:14pt;color:#333;text-align:center;">Design-Build Agreement</p>
      <p style="font-size:11pt;text-align:center;color:#555;">${dt}</p>
    </div>

    <p><strong>Welcome</strong></p>
    <p>Thank you for choosing Copper Mountain Builders for your home project in the Flathead Valley. This Agreement clearly explains what we will do for you, what you can expect, how we work together, and how we protect both of us.</p>
    <p>We designed this document to be easy to read while still giving you the protection and peace of mind you deserve — like a good insurance policy for your design investment.</p>

    <h2>Parties to This Agreement</h2>
    <p><strong>You (the Client):</strong><br/>${clientName}<br/>${clientAddr}</p>
    <p><strong>We (the Contractor):</strong><br/>Copper Mountain Builders<br/>PO Box 2471, Kalispell, MT 59903</p>
    <p><strong>Project Address:</strong> ${projectAddr}</p>

    <h2>1. What We Will Do for You</h2>
    <p>We will provide professional preconstruction design services using our proven 5-Step Design-Build Program (see Exhibit A for full details). These services cover everything from initial planning through final design documents and bidding preparation.</p>
    <p><strong>Steps Covered in This Agreement:</strong></p>
    <p class="indent">· Step 1 – Initial Consultation + Vision Planning<br/>· Step 2 – Schematic Design<br/>· Step 3 – Design Development<br/>· Step 4 – Project Development</p>
    <p>Step 5 (actual construction and post-build support) is handled under a separate full construction contract that we will present when the design is complete.</p>
    <p>We include two client meetings per phase in Steps 1–3 and all coordination of surveys, engineering, renderings, and bidding packages.</p>
    <p><strong>Your Role (Client Assignments):</strong> In each step you will complete simple assignments such as selecting materials, approving floor plans, and interior choices (detailed in Exhibit A). Timely completion helps keep your project on schedule.</p>
    <p>This Agreement is your retainer for professional design services. When Steps 1–4 are complete, we will present the full construction contract and we have the first right of refusal to build your project.</p>

    <h2>2. Your Investment (Compensation)</h2>
    <p>We charge a clear hourly rate that includes a 20% markup for overhead and management:</p>
    <p class="indent">· Principal / General Management: <strong>$250.00 per hour</strong><br/>· Architectural Design Services: <strong>$250.00 per hour</strong><br/>· Consultants / Specialty Engineering: <strong>$250.00 per hour</strong><br/>· Interior/Exterior Designer: <strong>$150.00 per hour</strong></p>
    <p><strong>Initial Non-Refundable Retainer: ${retainer}</strong> — payable when you sign and applied to your first invoice(s).</p>
    <p><strong>Payment Terms:</strong></p>
    <p class="indent">· Invoices are sent monthly or at phase milestones.<br/>· Payment is due within 10 calendar days.<br/>· Late payments accrue interest at 1.5% per month (or the maximum allowed by Montana law).</p>
    <p>Final design documents are released only after all outstanding amounts are paid in full.</p>

    <h2>3. How Long This Lasts &amp; What Happens if We Stop Early</h2>
    <p>This Agreement begins on the date above and continues until we complete Steps 1–4, or until one of us ends it with 14 days written notice.</p>
    <p>If the Agreement ends early:</p>
    <p class="indent">· You pay for all work we have completed and any expenses incurred up to that date.<br/>· You pay a Termination Fee of 10% of the estimated construction cost (or a minimum of $5,000, whichever is greater).<br/>· All design materials must be returned or destroyed — you receive no license to use them.</p>
    <p><strong>Important Protection:</strong> If you (or anyone working with you) later uses any of our designs to build with another contractor without our written permission and full payment, you will owe a Design Licensing Fee equal to 200% of the total design fees paid or estimated.</p>

    <h2>4. Who Owns the Designs</h2>
    <p>All drawings, renderings, plans, and other materials we create ("Work Product") belong entirely to us and are protected by copyright law.</p>
    <p>You receive no right to copy, modify, or use the designs for construction until both of the following happen:</p>
    <p class="indent">(a) You have paid all fees in full, and<br/>(b) You have signed the full construction contract with us or paid the Design Licensing Fee.</p>
    <p>Unauthorized use is copyright infringement. We may also file a mechanic's lien on your property for any unpaid amounts.</p>

    <h2>5. Our Promises to You</h2>
    <p class="indent">· We perform all work to the professional standard of care expected in Montana.<br/>· We maintain appropriate insurance (proof available upon request).<br/>· We are an independent contractor (no employment relationship).<br/>· We follow all required Montana residential construction disclosures (see Exhibit B).</p>

    <h2>6. Your Protections</h2>
    <p class="indent">· Our total liability to you is limited to the total fees you paid us.<br/>· Both sides agree to keep each other's information confidential.<br/>· Either side may end the Agreement with proper notice and payment for work done.</p>

    <h2>7. How We Communicate</h2>
    <p>All notices must be in writing and sent to:</p>
    <p class="indent"><strong>You:</strong> ${clientName} at ${clientAddr}<br/><strong>Us:</strong> Copper Mountain Builders, PO Box 2471, Kalispell, MT 59903</p>
    <p>Notices are considered delivered when personally handed, two days after registered mail, or the next business day after overnight courier.</p>

    <h2>8. Other Important Information</h2>
    <p class="indent">· This Agreement (plus Exhibits) is the complete understanding between us.<br/>· Any changes must be in writing and signed by both of us.<br/>· Time is important — we will both work to keep your project moving.<br/>· Montana law governs this Agreement. Any disputes will first go to mediation, then Flathead County District Court if needed. The winning side can recover reasonable attorney fees.</p>

    <div class="page-break"></div>

    <h2>Exhibit A — Our 5-Step Design-Build Program</h2>
    <p><strong>STEP 1 – Initial Consultation + Vision Planning:</strong> We evaluate your site, foundation needs, timeline, and scope. Two client meetings to discover your vision and architectural inspiration. <em>Your Assignment: Floor plan + material selection; we explain Buildertrend.</em></p>
    <p><strong>STEP 2 – Schematic Design:</strong> We handle early structural, environmental, and energy code considerations. Two client meetings to finalize floor plans and apply changes. <em>Your Assignment: Interior selections (cabinetry, fixtures, trim, doors/windows).</em></p>
    <p><strong>STEP 3 – Design Development:</strong> We finalize floor plans, elevations, sections, and all materials with renderings. Two client meetings for side-by-side review. Plans are signed off and sent to engineering.</p>
    <p><strong>STEP 4 – Project Development:</strong> We prepare budgeting, scheduling, Scope of Work, subcontractor bids, material pricing, permits, and site-prep costs. All trade bids are finalized.</p>
    <p><strong>STEP 5 – Construction + Post-Build Support:</strong> Performed only under a separate full construction contract.</p>

    <h2>Exhibit B — Insurance &amp; Montana Disclosures</h2>
    <p>We maintain general liability insurance and appropriate workers' compensation coverage (or exemption) as required by law.</p>
    <p class="indent">· We provide a one-year express warranty on workmanship and materials (detailed in the full construction contract).<br/>· Full insurance certificates and additional disclosures are available upon request.</p>

    <p style="margin-top:40px;font-weight:bold;">IN WITNESS WHEREOF, we both agree to the terms above.</p>

    <div style="margin-top:30px;display:grid;grid-template-columns:1fr 1fr;gap:60px;">
      <div>
        <p style="font-size:10pt;color:#B87333;letter-spacing:2px;text-transform:uppercase;">You (Client)</p>
        <p><strong>${clientName}</strong></p>
        ${d.clientSig?`<img src="${d.clientSig}" style="width:100%;height:60px;object-fit:contain;" alt="Client Signature"/>`:`<p style="border-bottom:1px solid #333;height:40px;"></p>`}
        <p style="font-size:10pt;">Signature &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Date: ${dt}</p>
      </div>
      <div>
        <p style="font-size:10pt;color:#B87333;letter-spacing:2px;text-transform:uppercase;">We (Copper Mountain Builders)</p>
        ${d.repSig?`<img src="${d.repSig}" style="width:100%;height:60px;object-fit:contain;" alt="Contractor Signature"/>`:`<p style="border-bottom:1px solid #333;height:40px;"></p>`}
        <p style="font-size:10pt;">Signature &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Date: ${dt}</p>
        <p style="font-size:10pt;">Printed Name &amp; Title: ${esc(d.repPrintName||d.repName)}</p>
      </div>
    </div>
  </body></html>`;
  return new Blob([html], {type: 'application/msword'});
}

function generateSignedContractPdf(){
  const blob = generateSignedContractBlob();
  const filename = (appData.clientName||"CMB").replace(/\s+/g,"_") + "_Design-Build_Agreement_" + new Date().toLocaleDateString().replace(/\//g,"-") + ".doc";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
    <div class="company-name">${esc(d.company||"Copper Mountain Builders")}</div>
    <div class="doc-title" style="font-size:14pt;font-weight:normal;color:#5C5850;font-style:italic;margin-bottom:60px;">A starting point for the home at<br/>${esc(d.projectAddress||"")}${d.projectCity?", "+esc(d.projectCity)+", Montana":""}</div>
    <div class="cover-info">Prepared for ${esc(d.clientName||"")}</div>
    <div class="cover-info" style="font-size:11pt;color:#5C5850;">${dt}</div>
    <div style="margin-top:60px;font-size:11pt;color:#5C5850;font-style:italic;">By ${esc(d.repName||"Copper Mountain Builders")} · Kalispell, Montana</div>
  </div>

  <!-- INTRO LETTER -->
  <div style="padding:0 0 30px 0;">
    <p style="margin-bottom:14px;">${d.clientName ? "Hi "+esc(d.clientName.split(/[,&]|and/i)[0].trim())+"," : "Hello,"}</p>
    <p style="margin-bottom:14px;">Thank you for letting us walk your property and hear what you're imagining for this build. What follows is our shared starting point — what we saw, what we'd build, what it'll cost, and what comes next.</p>
    <p style="margin-bottom:14px;">Copper Mountain Builders has been doing this work out of Kalispell for years, and my family has been in Montana for six generations. That heritage shapes how we run a job — we listen before we draw a line, we catch problems before they cost you, and we answer the phone whether you're three days into framing or three years into living in the home. This document is a reflection of that approach, applied to your project.</p>
    <p style="margin-bottom:14px;">Read through it at your own pace. Mark anything that doesn't sit right, anything that gets you excited, anything you want to talk through. Then we'll sit down together and turn this starting point into a plan.</p>
    <p style="margin-bottom:0;">— ${esc(d.repName||"Matt Farrier")}</p>
  </div>

  <div class="page-break"></div>

  <!-- WHAT WE'D BUILD -->
  <h1>What we'd build</h1>
  ${est.summary ? formatAnalysis(est.summary) : '<p>No summary available.</p>'}

  <div class="page-break"></div>

  <!-- BUDGET -->
  <h1>Where the money goes</h1>
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
  <h1>What we saw on site</h1>
  <p><em>From our walk-through and the photos and documents you shared:</em></p>
  ${formatAnalysis(est.siteAnalysis)}
  ` : ''}

  ${est.complianceAnalysis ? `
  <div class="page-break"></div>
  <h1>Notes on code &amp; permits</h1>
  <p><em>What Montana Building Code and Flathead County will require for this project:</em></p>
  ${formatAnalysis(est.complianceAnalysis)}
  ` : ''}

  ${est.schedule && est.schedule.milestones && est.schedule.milestones.length > 0 ? `
  <div class="page-break"></div>
  <h1>How long this takes</h1>
  <p><strong>Total duration:</strong> ${esc(est.schedule.startToFinish||"TBD")}</p>
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
  <h1>By trade</h1>
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

// ── PDF.js setup ──────────────────────────────────────────────────────
if(window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Extract text content from all pages of a PDF using pdf.js
async function extractPdfText(file, maxPages=30){
  if(!window.pdfjsLib) throw new Error("PDF.js not loaded");
  let pdfData;
  if(file instanceof File || file instanceof Blob){
    pdfData = new Uint8Array(await file.arrayBuffer());
  } else if(typeof file === 'string' && file.startsWith('data:')){
    const raw = atob(file.split(",")[1]);
    pdfData = new Uint8Array(raw.length);
    for(let i=0; i<raw.length; i++) pdfData[i] = raw.charCodeAt(i);
  } else {
    throw new Error("Invalid PDF input");
  }
  const pdf = await pdfjsLib.getDocument({data: pdfData}).promise;
  const numPages = Math.min(pdf.numPages, maxPages);
  const allText = [];
  for(let p=1; p<=numPages; p++){
    try {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(" ").replace(/\s+/g, " ").trim();
      if(pageText.length > 5){
        allText.push(`[Page ${p}] ${pageText}`);
      }
    } catch(e){
      console.warn(`PDF page ${p} text extraction failed:`, e);
    }
  }
  return { numPages: pdf.numPages, pagesRead: numPages, text: allText.join("\n\n") };
}

// Get all extracted PDF text across all uploaded documents
function getAllPdfText(){
  const texts = [];
  const allDocs = getAllDocs();
  for(const doc of allDocs){
    if(doc.pdfText && doc.pdfText.text){
      texts.push(`=== DOCUMENT: ${doc.name} (${doc.pdfText.numPages} pages) ===\n${doc.pdfText.text}`);
    }
  }
  return texts.join("\n\n");
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
  // Auto-route PDFs and documents to the document handler instead
  const imageFiles = [];
  const docFiles = [];
  for(const file of files){
    if(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')){
      docFiles.push(file);
    } else {
      imageFiles.push(file);
    }
  }
  if(docFiles.length > 0){
    showOdToast(`📄 ${docFiles.length} PDF(s) moved to Documents for text extraction`);
    // Process PDFs through the document handler
    for(const file of docFiles){
      const doc = { id:"d"+Date.now()+Math.random().toString(36).slice(2,6), name:file.name, type:file.type, size:file.size, dataUrl: null };
      try {
        showOdToast(`📄 Reading ${file.name}…`);
        doc.pdfText = await extractPdfText(file, 30);
        doc.dataUrl = "data:application/pdf;base64,";
        console.log(`PDF "${file.name}": extracted ${doc.pdfText.pagesRead} pages`);
        showOdToast(`📄 ${file.name}: ${doc.pdfText.pagesRead} pages read`);
      } catch(err){
        console.warn("PDF extraction failed:", err);
        doc.pdfText = { numPages: 0, pagesRead: 0, text: "" };
        showOdToast(`⚠ Failed to read ${file.name}`, true);
      }
      const zone = appData.zones.find(z=>z.id===zoneId);
      if(zone){ if(!zone.docs) zone.docs=[]; zone.docs.push(doc); }
    }
  }
  if(imageFiles.length > 0){
    const urls = await Promise.all(imageFiles.map(fileToDataURL));
    const zone = appData.zones.find(z=>z.id===zoneId);
    if(zone) zone[type] = [...(zone[type]||[]), ...urls];
  }
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
      <input type="file" id="${camId}" accept="image/*,.pdf" multiple capture="environment" style="display:none" onchange="handlePhotos(event,'${zoneId}','${type}')"/>
      <input type="file" id="${libId}" accept="image/*,.pdf" multiple style="display:none" onchange="handlePhotos(event,'${zoneId}','${type}')"/>
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

// ── Document handling ─────────────────────────────────────────────────
async function handleDocuments(e, targetId, targetType){
  const files = Array.from(e.target.files);
  for(const file of files){
    const doc = { id:"d"+Date.now()+Math.random().toString(36).slice(2,6), name:file.name, type:file.type, size:file.size, dataUrl: null };
    if(file.type === 'application/pdf'){
      try {
        showOdToast(`📄 Reading ${file.name}…`);
        doc.pdfText = await extractPdfText(file, 30);
        doc.dataUrl = "data:application/pdf;base64,"; // placeholder — don't store the full PDF
        console.log(`PDF "${file.name}": extracted text from ${doc.pdfText.pagesRead}/${doc.pdfText.numPages} pages (${doc.pdfText.text.length} chars)`);
        showOdToast(`📄 ${file.name}: ${doc.pdfText.pagesRead} pages read`);
      } catch(err){
        console.warn("PDF text extraction failed:", err);
        doc.pdfText = { numPages: 0, pagesRead: 0, text: "" };
        showOdToast(`⚠ Failed to read ${file.name}`, true);
      }
    } else {
      doc.dataUrl = await fileToDataURL(file);
    }
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
    ${docs.length>0?`<div style="margin-top:8px;">${docs.map(doc=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--stone);border-radius:6px;margin-bottom:6px;border:1px solid var(--stone-light);"><div style="display:flex;align-items:center;gap:8px;min-width:0;"><span style="font-size:18px;">${docIcon(doc.type)}</span><div style="min-width:0;"><div style="font-size:12px;color:var(--cream);overflow:hidden;text-overflow:ellipsis;max-width:180px;white-space:nowrap;">${esc(doc.name)}${doc.pdfText&&doc.pdfText.pagesRead?`<span class="pdf-badge">${doc.pdfText.pagesRead} pages</span>`:""}</div><div style="font-size:10px;color:var(--stone-light);">${fmtSize(doc.size)}</div></div></div><button class="btn-danger" onclick="removeDoc('${targetType}','${targetId}','${doc.id}')">✕</button></div>`).join("")}</div>`:""}
  </div>`;
}
function getAllDocs(){
  const all=[];
  (appData.projectDocs||[]).forEach(d=>all.push({...d,source:"Project"}));
  appData.zones.forEach(z=>(z.docs||[]).forEach(d=>all.push({...d,source:z.type||"Project"})));
  return all;
}

// ── Visit Storage ─────────────────────────────────────────────────────
const AUTOSAVE_KEY = "cmb_autosave";
const VISITS_KEY   = "cmb_saved_visits";

function autoSave(){
  try {
    const snapshot = JSON.parse(JSON.stringify(appData));
    snapshot.zones = (snapshot.zones||[]).map(z => ({
      ...z,
      photosBefore: (z.photosBefore||[]).map((_,i) => `[photo ${i+1}]`),
      photosInspo:  (z.photosInspo||[]).map((_,i) => `[photo ${i+1}]`),
      docs: (z.docs||[]).map(d => ({...d, dataUrl: null, pdfText: null}))
    }));
    if(snapshot.projectDocs) snapshot.projectDocs = snapshot.projectDocs.map(d => ({...d, dataUrl: null, pdfText: null}));
    snapshot._step = currentStep;
    snapshot._savedAt = new Date().toISOString();
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snapshot));
  } catch(e){ console.warn("Auto-save failed:", e); }
}

function fullSave(){
  try {
    const visits = JSON.parse(localStorage.getItem(VISITS_KEY)||"[]");
    const name = (appData.clientName||"Unnamed") + " — " + (appData.projectAddress||"No Address") + " — " + new Date().toLocaleDateString();
    const save = { id: "v" + Date.now(), name, savedAt: new Date().toISOString(), step: currentStep, data: JSON.stringify(appData) };
    visits.unshift(save);
    if(visits.length > 20) visits.splice(20);
    localStorage.setItem(VISITS_KEY, JSON.stringify(visits));
    alert("✓ Visit saved: " + name);
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
  if(!confirm("Start a new site visit? This will clear all current data.")) return;
  closeSyncSuccess();
  appData = {
    company: "Copper Mountain Builders",
    repName: "", clientName: "", clientEmail: "", clientPhone: "",
    clientAddress: "", clientCity: "", clientZip: "",
    projectAddress: "", projectCity: "",
    projectNotes: "", zones: [{id:'z_default', type:'', sqft:'', notes:'', photosBefore:[], photosInspo:[]}], estimate: null,
    retainerAmount: "", clientSig: null, repSig: null,
    clientPrintName: "", repPrintName: "",
    clarifyingQuestions: [], clarifyingAnswers: {},
    davisBacon: false,
    marginPercent: 20
  };
  currentStep = 0;
  render();
  localStorage.removeItem(AUTOSAVE_KEY);
  showOdToast("✨ New visit started!");
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
    return `<div style="background:var(--stone);border-radius:8px;padding:12px 14px;margin-bottom:10px;border:1px solid var(--stone-light);">
      <div style="font-size:13px;color:var(--cream);margin-bottom:4px;">${esc(v.name)}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div style="font-size:11px;color:var(--stone-light);">${new Date(v.savedAt).toLocaleString()}</div>
        ${syncedAt ? `<div style="font-size:10px;color:#7ec8a4;">${syncedAt}</div>` : ''}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn-small" onclick="loadVisit('${v.id}');hideVisitsModal()">Load</button>
        ${odAccount ? `<button class="btn-small" style="background:rgba(45,106,79,0.2);border:1px solid #2d6a4f;color:#7ec8a4;" onclick="loadVisit('${v.id}');hideVisitsModal();setTimeout(syncVisitToOneDrive,300)">☁ Sync</button>` : ''}
        <button class="btn-danger" onclick="deleteVisit('${v.id}')">Delete</button>
      </div>
    </div>`;
  }).join("");
}

// ── OneDrive ──────────────────────────────────────────────────────────
async function odSignIn(){
  if(!msalApp){ alert("Microsoft auth is still loading. Please wait a moment and try again."); return; }
  try {
    const staleAccounts = msalApp.getAllAccounts();
    for(const acct of staleAccounts){ await msalApp.clearCache({ account: acct }).catch(()=>{}); }
  } catch(_){}
  try {
    const result = await msalApp.loginPopup({ scopes: OD_SCOPES, prompt: "select_account" });
    odAccount = result.account;
    odTargetDriveId = null;
    updateOdBtn();
    showOdToast("☁ Connected to OneDrive as " + odAccount.username);
  } catch(e){
    if(e.errorCode === "user_cancelled" || e.message?.includes("user_cancelled")) return;
    const code = e.errorCode || e.name || "unknown";
    const msg = e.message || e.errorMessage || "No details";
    console.error("MSAL sign-in error:", e);
    if(code === "popup_window_error" || msg.toLowerCase().includes("popup")){
      alert("Sign-in popup was blocked.\n\nPlease allow popups for this site in your browser, then try again.");
    } else if(code.includes("65001") || msg.includes("consent")){
      alert("Admin consent required.\n\nIn Azure Portal → App Registration → API permissions, click 'Grant admin consent for Copper Mountain Builders'.");
    } else {
      alert("OneDrive sign-in failed (" + code + "):\n" + msg.slice(0, 200));
    }
  }
}

function odSignOut(){
  if(!msalApp || !odAccount) return;
  msalApp.logoutPopup({ account: odAccount }).catch(()=>{});
  odAccount = null;
  odTargetDriveId = null;
  updateOdBtn();
  showOdToast("☁ Disconnected from OneDrive", false);
}

async function getOdToken(){
  if(!msalApp || !odAccount) return null;
  try {
    const r = await msalApp.acquireTokenSilent({ scopes: OD_SCOPES, account: odAccount });
    return r.accessToken;
  } catch(e){
    try {
      const r = await msalApp.acquireTokenPopup({ scopes: OD_SCOPES });
      odAccount = r.account;
      return r.accessToken;
    } catch(e2){ return null; }
  }
}

function odSafeName(str){
  return (str||"Unknown").replace(/[/\\:*?"<>|]/g, "").trim().substring(0, 50);
}

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
    const target = drives.find(d => d.name && d.name.toLowerCase().includes(OD_LIBRARY_NAME.toLowerCase()));
    if(target){
      odTargetDriveId = target.id;
      console.log("SharePoint drive found:", target.name, target.id);
      return target.id;
    }
    console.warn("Library not found. Falling back to me/drive.");
  } catch(e){ console.warn("Drive lookup failed:", e); }
  return null;
}

async function odUploadFile(token, odPath, fileContent, mimeType){
  const driveId = await getSharePointDriveId(token);
  const encoded = odPath.split("/").map(encodeURIComponent).join("/");
  const url = driveId
    ? `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encoded}:/content`
    : `https://graph.microsoft.com/v1.0/me/drive/root:/${encoded}:/content`;
  console.log("OneDrive upload →", driveId ? "SharePoint" : "me/drive", url);
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Authorization": "Bearer " + token, "Content-Type": mimeType },
    body: fileContent
  });
  if(!res.ok){
    let msg = res.status + " " + res.statusText;
    try { const j = await res.json(); msg = j.error?.message || j.error?.code || msg; console.error("OneDrive upload error:", j); } catch(_){}
    throw new Error(`Upload failed (${res.status}): ${msg}`);
  }
  return res.json();
}

async function generateProposalBlob(){
  const d = appData; const est = d.estimate;
  if(!est) return null;
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
      } else { html += '<p class="analysis-paragraph">' + esc(line) + '</p>'; }
    }
    html += '</div>'; return html;
  }
  const dt = new Date().toLocaleDateString();
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="ProgId" content="Word.Document"><style>
    @page{size:8.5in 11in;margin:1in} body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.5;color:#2C2A27;margin:0;padding:20px}
    .cover-page{text-align:center;padding-top:2in;page-break-after:always} .company-name{font-size:24pt;font-weight:bold;color:#B87333;letter-spacing:3px;margin-bottom:20px}
    .doc-title{font-size:18pt;font-weight:bold;margin-bottom:40px} .cover-info{font-size:12pt;margin:10px 0}
    h1{font-size:18pt;font-weight:bold;color:#B87333;margin-top:30px;margin-bottom:15px;page-break-after:avoid}
    p{margin:10px 0;text-align:justify} table{width:100%;border-collapse:collapse;margin:20px 0;page-break-inside:avoid}
    th{background-color:#B87333;color:white;font-weight:bold;padding:10px;border:1px solid #999;text-align:left}
    td{padding:8px 10px;border:1px solid #CCCCCC} tr:nth-child(even){background-color:#F5F0E8}
    .total-row{background-color:#E6D5C3!important;font-weight:bold;font-size:13pt}
    .retainer-box{background-color:#FFF8E7;border:2px solid #B87333;padding:15px;margin:20px 0;font-size:13pt;font-weight:bold;text-align:center}
    .page-break{page-break-before:always}
    .analysis-heading{font-weight:bold;color:#B87333;font-size:13pt;margin-top:15px;margin-bottom:8px;text-transform:uppercase}
    .analysis-list{margin:5px 0 15px 25px;line-height:1.7} .analysis-list li{margin:5px 0}
    .analysis-paragraph{margin:10px 0 10px 15px;line-height:1.7}
    .milestone{margin:10px 0 10px 20px;padding-left:20px;border-left:3px solid #B87333}
  </style></head><body>
  <div class="cover-page">
    <div class="company-name">${esc(d.company||"Copper Mountain Builders")}</div>
    <div class="doc-title" style="font-size:14pt;font-weight:normal;color:#5C5850;font-style:italic;margin-bottom:60px;">A starting point for the home at<br/>${esc(d.projectAddress||"")}${d.projectCity?", "+esc(d.projectCity)+", Montana":""}</div>
    <div class="cover-info">Prepared for ${esc(d.clientName||"")}</div>
    <div class="cover-info" style="font-size:11pt;color:#5C5850;">${dt}</div>
    <div style="margin-top:60px;font-size:11pt;color:#5C5850;font-style:italic;">By ${esc(d.repName||"Copper Mountain Builders")} · Kalispell, Montana</div>
  </div>
  <div style="padding:0 0 30px 0;">
    <p style="margin-bottom:14px;">${d.clientName ? "Hi "+esc(d.clientName.split(/[,&]|and/i)[0].trim())+"," : "Hello,"}</p>
    <p style="margin-bottom:14px;">Thank you for letting us walk your property and hear what you're imagining for this build. What follows is our shared starting point — what we saw, what we'd build, what it'll cost, and what comes next.</p>
    <p style="margin-bottom:14px;">Copper Mountain Builders has been doing this work out of Kalispell for years, and my family has been in Montana for six generations. That heritage shapes how we run a job — we listen before we draw a line, we catch problems before they cost you, and we answer the phone whether you're three days into framing or three years into living in the home. This document is a reflection of that approach, applied to your project.</p>
    <p style="margin-bottom:14px;">Read through it at your own pace. Mark anything that doesn't sit right, anything that gets you excited, anything you want to talk through. Then we'll sit down together and turn this starting point into a plan.</p>
    <p style="margin-bottom:0;">— ${esc(d.repName||"Matt Farrier")}</p>
  </div>
  <div class="page-break"></div>
  <h1>What we'd build</h1>
  ${est.summary ? formatAnalysis(est.summary) : '<p>No summary available.</p>'}
  <div class="page-break"></div>
  <h1>Where the money goes</h1>
  <table><thead><tr><th>Project Type</th><th style="text-align:right">Sq Ft</th><th style="text-align:right">Budget Low</th><th style="text-align:right">Budget High</th></tr></thead>
  <tbody>
  ${(est.zones||[]).map(z => `<tr><td>${esc(z.name||appData.zones[0]?.type||"")}</td><td style="text-align:right">${appData.zones[0]?.sqft||""}</td><td style="text-align:right">${fmt$(z.low||0)}</td><td style="text-align:right">${fmt$(z.high||0)}</td></tr>`).join('')}
  <tr style="border-top:2px solid #B87333"><td colspan="2"><strong>Construction Subtotal</strong></td><td style="text-align:right"><strong>${fmt$(est.subtotalLow||0)}</strong></td><td style="text-align:right"><strong>${fmt$(est.subtotalHigh||0)}</strong></td></tr>
  <tr><td colspan="2">General Conditions (${est.gcMonths||3} months)</td><td style="text-align:right">${fmt$(est.gcLow||0)}</td><td style="text-align:right">${fmt$(est.gcHigh||0)}</td></tr>
  <tr class="total-row" style="border-top:2px solid #B87333"><td colspan="2"><strong>TOTAL PROJECT COST</strong></td><td style="text-align:right"><strong>${fmt$(est.totalLow||0)}</strong></td><td style="text-align:right"><strong>${fmt$(est.totalHigh||0)}</strong></td></tr>
  </tbody></table>
  <div class="retainer-box">Design Retainer (Non-Refundable): ${fmt$(d.retainerAmount||0)}</div>
  ${est.siteAnalysis?`<div class="page-break"></div><h1>What we saw on site</h1>${formatAnalysis(est.siteAnalysis)}`:''}
  ${est.complianceAnalysis?`<div class="page-break"></div><h1>Notes on code &amp; permits</h1>${formatAnalysis(est.complianceAnalysis)}`:''}
  ${est.schedule&&est.schedule.milestones&&est.schedule.milestones.length>0?`<div class="page-break"></div><h1>How long this takes</h1><p><strong>Total duration:</strong> ${esc(est.schedule.startToFinish||"TBD")}</p>
  ${(est.schedule.milestones||[]).map(m=>`<div class="milestone"><strong>${esc(m.phase)}</strong> — <em>${esc(m.duration)}</em>${m.notes?`<br>${esc(m.notes)}`:''}</div>`).join('')}`:''}
  <div class="page-break"></div>
  <h1>By trade</h1>
  <table><thead><tr><th>Trade Section</th><th>CSI Division</th><th style="text-align:right">Low</th><th style="text-align:right">High</th></tr></thead>
  <tbody>
  ${(est.sections||[]).map(s=>{const div=getCSIDiv(s.name);return`<tr><td>${esc(s.name)}</td><td style="font-size:10pt;color:#666">${esc(div.name)}</td><td style="text-align:right">${fmt$(s.low||0)}</td><td style="text-align:right">${fmt$(s.high||0)}</td></tr>`;}).join('')}
  <tr style="border-top:2px solid #B87333"><td colspan="2"><strong>Construction Subtotal</strong></td><td style="text-align:right"><strong>${fmt$(est.subtotalLow||0)}</strong></td><td style="text-align:right"><strong>${fmt$(est.subtotalHigh||0)}</strong></td></tr>
  <tr><td colspan="2">General Conditions</td><td style="text-align:right">${fmt$(est.gcLow||0)}</td><td style="text-align:right">${fmt$(est.gcHigh||0)}</td></tr>
  <tr class="total-row" style="border-top:2px solid #B87333"><td colspan="2"><strong>TOTAL PROJECT COST</strong></td><td style="text-align:right"><strong>${fmt$(est.totalLow||0)}</strong></td><td style="text-align:right"><strong>${fmt$(est.totalHigh||0)}</strong></td></tr>
  </tbody></table>
  </body></html>`;
  return new Blob([html], {type: 'application/msword'});
}

async function generateExcelBlob(){
  const d = appData; const est = d.estimate;
  if(!est) return null;
  try {
    await ensureLineItemsForExport(est);
    const wb = buildBTWorkbook(est);
    const wbout = XLSX.write(wb, {bookType:'xlsx', type:'array'});
    return new Blob([wbout], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  } catch(e){ console.error("Excel blob failed:", e); return null; }
}

async function syncVisitToOneDrive(){
  if(!odAccount) return;
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
    showOdToast("☁ Uploading visit data...");
    const snap = JSON.parse(JSON.stringify(d));
    snap.zones = (snap.zones||[]).map(z => ({...z, photosBefore:(z.photosBefore||[]).length?[`[${z.photosBefore.length} photo(s)]`]:[], photosInspo:(z.photosInspo||[]).length?[`[${z.photosInspo.length} photo(s)]`]:[]}));
    snap._odSyncedAt = new Date().toISOString();
    await odUploadFile(token, `${folder}/visit_${dateStr}.json`, JSON.stringify(snap, null, 2), "application/json");
    uploadedFiles.push("📋 Visit data (JSON)");
    if(d.estimate){
      showOdToast("☁ Generating proposal document...");
      const wordBlob = await generateProposalBlob();
      if(wordBlob){ await odUploadFile(token, `${folder}/${client}_Proposal_${dateStr}.doc`, await wordBlob.arrayBuffer(), "application/msword"); uploadedFiles.push("📄 Proposal document (Word)"); }
      showOdToast("☁ Generating Excel estimate...");
      const excelBlob = await generateExcelBlob();
      if(excelBlob){ await odUploadFile(token, `${folder}/${client}_Estimate_${dateStr}.xlsx`, await excelBlob.arrayBuffer(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"); uploadedFiles.push("📊 Estimate spreadsheet (Excel)"); }
    }
    // Upload signed contract document
    showOdToast("☁ Uploading signed contract...");
    try {
      const contractBlob = generateSignedContractBlob();
      if(contractBlob){ await odUploadFile(token, `${folder}/${client}_Design-Build_Agreement_${dateStr}.doc`, await contractBlob.arrayBuffer(), "application/msword"); uploadedFiles.push("📝 Signed contract (Word)"); }
    } catch(e){ console.warn("Contract upload:", e); }

    // Upload before photos
    const beforePhotos = (d.zones?.[0]?.photosBefore || []);
    for(let pi = 0; pi < beforePhotos.length; pi++){
      showOdToast(`☁ Uploading photo ${pi+1}/${beforePhotos.length}...`);
      try {
        const photoData = beforePhotos[pi];
        if(photoData && photoData.startsWith("data:")){
          const parts = photoData.split(",");
          const byteStr = atob(parts[1]);
          const bytes = new Uint8Array(byteStr.length);
          for(let i=0;i<byteStr.length;i++) bytes[i] = byteStr.charCodeAt(i);
          const ext = photoData.includes("png") ? "png" : "jpg";
          const mimeType = ext === "png" ? "image/png" : "image/jpeg";
          await odUploadFile(token, `${folder}/Photos/before_${pi+1}.${ext}`, bytes.buffer, mimeType);
        }
      } catch(e){ console.warn("Photo upload:", e); }
    }
    if(beforePhotos.length > 0) uploadedFiles.push(`📷 ${beforePhotos.length} before photo(s)`);

    // Upload approved concept images
    const concepts = (d.conceptImages || []).filter(c => c.approved && c.afterImage);
    for(let ci = 0; ci < concepts.length; ci++){
      showOdToast(`☁ Uploading concept ${ci+1}/${concepts.length}...`);
      try {
        const imgData = concepts[ci].afterImage;
        if(imgData && imgData.startsWith("data:")){
          const parts = imgData.split(",");
          const byteStr = atob(parts[1]);
          const bytes = new Uint8Array(byteStr.length);
          for(let i=0;i<byteStr.length;i++) bytes[i] = byteStr.charCodeAt(i);
          await odUploadFile(token, `${folder}/Concepts/concept_${ci+1}.png`, bytes.buffer, "image/png");
        }
      } catch(e){ console.warn("Concept upload:", e); }
    }
    if(concepts.length > 0) uploadedFiles.push(`✨ ${concepts.length} concept image(s)`);

    appData._odSyncedAt = new Date().toISOString();
    appData._odFolder = folder;
    if(syncBtn){ syncBtn.disabled = false; syncBtn.textContent = "☁ Sync to OneDrive"; }
    showSyncSuccessPage(uploadedFiles, folder);
  } catch(e){
    console.error("OneDrive sync error:", e);
    showOdToast("☁ Sync failed: " + (e.message||"Unknown error").slice(0,80), true);
    if(syncBtn){ syncBtn.disabled = false; syncBtn.textContent = "☁ Sync to OneDrive"; }
  }
}

function showSyncSuccessPage(uploadedFiles, folder){
  const modal = document.createElement("div");
  modal.id = "sync-success-modal";
  modal.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:10000;backdrop-filter:blur(4px);";
  modal.innerHTML = `<div style="background:var(--cream);border-radius:16px;padding:40px;max-width:500px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center;">
    <div style="font-size:64px;margin-bottom:20px;">✅</div>
    <h2 style="color:var(--copper);margin-bottom:10px;font-size:28px;">Sync Complete!</h2>
    <p style="color:var(--stone);font-size:15px;margin-bottom:30px;">All files uploaded to OneDrive</p>
    <div style="background:var(--stone);border-radius:8px;padding:20px;margin-bottom:30px;text-align:left;">
      <div style="color:var(--stone-light);font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;font-weight:600;">📁 ${folder}</div>
      ${uploadedFiles.map(f=>`<div style="color:var(--cream);font-size:14px;padding:6px 0;border-bottom:1px solid var(--stone-light);display:flex;align-items:center;gap:10px;"><span style="flex:1;">${f}</span><span style="color:#7ec87e;font-size:12px;">✓</span></div>`).join('')}
    </div>
    <div style="display:flex;gap:12px;justify-content:center;">
      <button onclick="startNewVisit()" style="flex:1;padding:14px 24px;background:var(--copper);border:none;border-radius:8px;color:white;font-size:15px;font-weight:600;cursor:pointer;">🆕 Start New Visit</button>
      <button onclick="closeSyncSuccess()" style="flex:1;padding:14px 24px;background:transparent;border:2px solid var(--stone-light);border-radius:8px;color:var(--stone);font-size:15px;font-weight:600;cursor:pointer;">← Back</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
}

function closeSyncSuccess(){
  const modal = document.getElementById("sync-success-modal");
  if(modal) modal.remove();
}

function showOdToast(msg, isError = false){
  let t = document.getElementById("od-toast");
  if(!t){
    t = document.createElement("div");
    t.id = "od-toast";
    t.style.cssText = "position:fixed;bottom:24px;right:20px;padding:11px 18px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;pointer-events:none;transition:opacity 0.6s";
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
    btn.onclick = () => { if(confirm("Disconnect from OneDrive?")) odSignOut(); };
  } else {
    btn.textContent = "☁ Connect OneDrive";
    btn.onclick = odSignIn;
  }
}

// ── AI Analysis ───────────────────────────────────────────────────────
async function acquireWakeLock(){
  try { if('wakeLock' in navigator) return await navigator.wakeLock.request('screen'); } catch(e){ console.warn("Wake Lock unavailable:", e); }
  return null;
}
function releaseWakeLock(lock){ if(lock) lock.release().catch(()=>{}); }

async function runAnalyzeScope(){
  const btn = document.getElementById("analyze-btn");
  const err = document.getElementById("analyze-error");
  const status = document.getElementById("analyze-status");
  btn.disabled = true; btn.textContent = "⏳ Analyzing…";
  err.classList.add("hidden");
  const wakeLock = await acquireWakeLock();
  try {
    const z = appData.zones[0];
    const projectSummary = `Project Type: ${z.type||"Not specified"} | ${z.sqft||"unknown"} SF | Notes: ${z.notes||"no notes"}`;
    const visionContent = [];
    for(const photo of (z.photosBefore||[]).slice(0,6)){
      const c = await compressImage(photo, 800, 0.7);
      visionContent.push({type:"text", text:"[Current site condition photo]:"});
      visionContent.push({type:"image", source:{type:"base64", media_type:"image/jpeg", data:c.split(",")[1]}});
    }
    for(const photo of (z.photosInspo||[]).slice(0,3)){
      const c = await compressImage(photo, 800, 0.7);
      visionContent.push({type:"text", text:"[Client inspiration photo]:"});
      visionContent.push({type:"image", source:{type:"base64", media_type:"image/jpeg", data:c.split(",")[1]}});
    }
    const allDocs = getAllDocs();
    for(const doc of allDocs.filter(d=>d.type.includes("image")).slice(0,3)){
      const c = await compressImage(doc.dataUrl, 800, 0.7);
      visionContent.push({type:"text", text:`[Uploaded document: ${doc.name}]:`});
      visionContent.push({type:"image", source:{type:"base64", media_type:"image/jpeg", data:c.split(",")[1]}});
    }
    // Include extracted PDF text as regular text content (no image size limits)
    const pdfText = getAllPdfText();
    if(pdfText){
      visionContent.push({type:"text", text:`\n\n=== CONSTRUCTION DOCUMENTS — EXTRACTED TEXT ===\nThe following text was extracted directly from uploaded PDF blueprints and construction documents. This contains dimensions, specifications, schedules, notes, and all written content from the plans. Use this information for accurate scope and pricing.\n\n${pdfText}`});
    }
    const analysisPrompt = `You are a senior estimator at Copper Mountain Builders reviewing a site visit. Based on what you can see and read, ask up to 10 targeted follow-up questions to fill in gaps preventing an accurate estimate.

PROJECT OVERVIEW:
${projectSummary}
OVERALL PROJECT NOTES: ${appData.projectNotes||"none provided"}
SITE ADDRESS: ${appData.projectAddress||"unknown"}, ${appData.projectCity||"Montana"}
${visionContent.length > 0 ? "PHOTOS AND DOCUMENTS: Attached above." : "No photos provided."}

IMPORTANT: Read ALL notes carefully — they contain specific directions and scope items for the estimate. Every item, material, quantity, or consideration mentioned must be accounted for.

For any blueprint/plan pages: extract ALL dimensions, room labels, square footages, window/door schedules, finish schedules, structural notes, and specifications. Note every detail that affects pricing.

For site photos: count every visible window and door (note sizes if possible), identify ALL finish materials (flooring, countertops, cabinets, tile, wall finishes), note specific quantities, estimate dimensions where possible.

Focus questions on:
- Specific quantities mentioned but not detailed (e.g. "23 windows" — what sizes? egress?)
- Finish/product selections not yet made (flooring type, cabinet line, tile, countertop)
- Structural unknowns (foundation type, load-bearing walls, roof pitch)
- Site/mechanical conditions (utilities, existing systems to replace)
- Timeline and occupancy constraints
- Montana-specific concerns (WUI zone, septic/well, snow load)
${appData.davisBacon ? "- Davis-Bacon prevailing wage classifications needed for each trade" : ""}

Only ask what you cannot determine from the notes/photos/plans. Prioritize questions where the answer changes the estimate by $10,000+.

Return ONLY this JSON:
{"questions":[{"id":"q1","question":"Your question?","type":"text","options":[]},{"id":"q2","question":"Yes/no?","type":"yesno","options":[]},{"id":"q3","question":"Multiple choice?","type":"choice","options":["A","B","C"]}]}`;

    visionContent.push({type:"text", text:analysisPrompt});
    if(status) status.textContent = "Analyzing photos and scope…";
    let data;
    const analyzeModels = ["claude-opus-4-20250514","claude-sonnet-4-20250514","claude-haiku-4-5-20251001"];
    for(let attempt = 0; attempt < analyzeModels.length; attempt++){
      const isFallback = attempt > 0;
      if(isFallback && status) status.textContent = attempt===1 ? "Opus unavailable, trying Sonnet…" : "Using Haiku fallback…";
      const res = await fetch("https://billowing-snowflake-38f0.coppermountainbuilders406.workers.dev", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:analyzeModels[attempt], max_tokens:1500,
          messages:[{role:"user", content: visionContent.length > 1 ? visionContent : [{type:"text", text:analysisPrompt}]}] })
      });
      data = await res.json();
      if(data.error){
        const errStr = JSON.stringify(data.error);
        if((errStr.includes("overloaded") || res.status === 529 || res.status === 503) && attempt < analyzeModels.length - 1){
          const wait = (attempt + 1) * 3000;
          if(status) status.textContent = `Server busy, retrying in ${Math.round(wait/1000)}s... (${attempt+2}/${analyzeModels.length})`;
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        throw new Error(data.error.message);
      }
      break;
    }
    if(!data.content?.[0]?.text) throw new Error("No response from analysis");
    const raw = data.content[0].text.replace(/```json/g,"").replace(/```/g,"").trim();
    const start = raw.indexOf("{"); const end = raw.lastIndexOf("}");
    if(start===-1) throw new Error("Could not parse questions");
    const result = JSON.parse(raw.slice(start,end+1));
    appData.clarifyingQuestions = result.questions||[];
    appData.clarifyingAnswers = {};
    if(status) status.textContent = "";
    btn.textContent = "↻ Re-analyze"; btn.disabled = false;
    releaseWakeLock(wakeLock);
    render();
  } catch(e){
    releaseWakeLock(wakeLock);
    err.textContent = "Error: " + e.message; err.classList.remove("hidden");
    btn.disabled = false; btn.textContent = "⚡ Analyze & Ask";
    if(status) status.textContent = "";
  }
}

async function runGenerateEstimate(){
  const btn = document.getElementById("gen-est-btn");
  const err = document.getElementById("est-error");
  btn.disabled = true; err.classList.add("hidden");
  const wakeLock = await acquireWakeLock();
  const z = appData.zones[0];
  const projectSummary = `${z.type||"Project"} | ${z.sqft||"unknown"} SF | Notes: ${z.notes||"standard scope"}`;
  const isCommercial = (z.type||"").toLowerCase().includes("commercial");
  const isDavisBacon = appData.davisBacon;

  async function workerCall(messages, system, maxTokens=1000, model="claude-opus-4-20250514"){
    // Fallback chain: Sonnet (best value) → Opus (most capable) → Haiku (always available)
    const modelsToTry = [model, "claude-sonnet-4-20250514", "claude-haiku-4-5-20251001"];
    const modelNames = {"claude-sonnet-4-20250514":"Sonnet","claude-opus-4-20250514":"Opus","claude-haiku-4-5-20251001":"Haiku"};
    for(let attempt = 0; attempt < modelsToTry.length; attempt++){
      const currentModel = modelsToTry[attempt];
      const isFallback = attempt > 0;
      try {
        if(isFallback && btn) btn.textContent = `⏳ ${modelNames[modelsToTry[0]]||"Primary"} unavailable, trying ${modelNames[currentModel]||currentModel}…`;
        const res = await fetch("https://billowing-snowflake-38f0.coppermountainbuilders406.workers.dev", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ model:currentModel, max_tokens:maxTokens, temperature:0.3, system, messages })
        });
        const data = await res.json();
        if(data.error){
          const errStr = JSON.stringify(data.error);
          if((errStr.includes("overloaded") || res.status === 529 || res.status === 503) && attempt < modelsToTry.length - 1){
            const wait = (attempt + 1) * 3000;
            if(btn) btn.textContent = `⏳ Server busy, retrying in ${Math.round(wait/1000)}s... (${attempt+2}/${modelsToTry.length})`;
            await new Promise(r => setTimeout(r, wait));
            continue;
          }
          throw new Error("Claude error: " + errStr);
        }
        if(!res.ok){
          if((res.status === 529 || res.status === 503) && attempt < modelsToTry.length - 1){
            const wait = (attempt + 1) * 3000;
            if(btn) btn.textContent = `⏳ Server busy, retrying in ${Math.round(wait/1000)}s... (${attempt+2}/${modelsToTry.length})`;
            await new Promise(r => setTimeout(r, wait));
            continue;
          }
          throw new Error("HTTP " + res.status);
        }
        if(!data.content?.[0]?.text) throw new Error("No content in response");
        return data.content[0].text.replace(/```json/g,"").replace(/```/g,"").trim();
      } catch(err) {
        if(err.message.includes("overloaded") && attempt < modelsToTry.length - 1){
          const wait = (attempt + 1) * 3000;
          if(btn) btn.textContent = `⏳ Server busy, retrying in ${Math.round(wait/1000)}s... (${attempt+2}/${modelsToTry.length})`;
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        throw err;
      }
    }
  }

  function safeJSON(text, label){
    const s = text.indexOf("{"); const e = text.lastIndexOf("}");
    if(s===-1||e===-1) throw new Error(`No JSON in ${label}`);
    try { return JSON.parse(text.slice(s,e+1)); }
    catch(err){
      let t = text.slice(s,e+1).replace(/,\s*([}\]])/g,"$1");
      try { return JSON.parse(t); }
      catch(e2){ throw new Error(`${label} parse fail`); }
    }
  }

  // Build the unit cost reference string for the system prompt
  const unitCostRef = Object.entries(UNIT_COST_DB).map(([name, v]) =>
    `  ${name}: ${v.unit} $${v.low} - $${v.high}`
  ).join("\n");

  // Build system prompt for takeoff
  let SYSTEM = `You are the Chief Estimator at Copper Mountain Builders performing a quantity takeoff for a project in Flathead Valley, Montana.

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

RULES:
1. Use the unit cost reference above. unitCostLow = mid-to-high of range. unitCostHigh = top of range.
2. Every interior space needs DRYWALL and PAINTING. Never optional.
3. Read ALL project notes as scope directives. "23 windows" means qty 23. "tile floors throughout" means tile for all floor SF.
4. unitCostLow/High are ALL-IN installed costs (labor + material + sub markup).
5. Do NOT compute any totals. No section totals. No grand totals. Quantities and unit costs ONLY.
6. Every trade that applies must be included.
7. laborRate: 85 for most items, 100 for foreman tasks, 130 for PM tasks.

RESPOND ONLY WITH VALID JSON. No markdown. No explanation.`;

  try {
    // ── CALL 1: Photo & Document Analysis (unchanged) ──
    btn.textContent = "⏳ Step 1 of 4 — Analyzing photos & documents…";
    let siteNotes = "";
    const allDocs = getAllDocs();
    const photosToAnalyze = [];
    for(const photo of (z.photosBefore||[]).slice(0,10)) photosToAnalyze.push({photo, label:"current site condition"});
    for(const photo of (z.photosInspo||[]).slice(0,4)) photosToAnalyze.push({photo, label:"client inspiration"});
    for(const doc of allDocs.filter(d=>d.type.includes("image")).slice(0,4)) photosToAnalyze.push({photo:doc.dataUrl, label:doc.name});
    // PDF text extracted separately — no images needed
    const pdfText = getAllPdfText();

    if(photosToAnalyze.length > 0 || pdfText){
      const visionContent = [{type:"text", text:`You are the Chief Estimator at Copper Mountain Builders. Analyze these photos and construction documents with the eye of an experienced Montana builder.
PROJECT: ${projectSummary} | LOCATION: ${appData.projectAddress}, ${appData.projectCity}, Montana
NOTES: ${appData.projectNotes||"none"}
PROJECT NOTES: ${z.notes||"none"}
${appData.davisBacon ? "THIS IS A DAVIS-BACON PREVAILING WAGE PROJECT." : ""}

For each SITE PHOTO:
- Count every visible window and door (note sizes if discernible)
- Identify ALL finish materials: flooring type, countertop material, cabinet style, tile patterns, wall finishes
- Note specific quantities of everything countable
- Estimate dimensions where possible (room sizes, wall lengths, ceiling heights)
- Identify every trade that will be needed based on what you see
- Note existing conditions: age, wear, code compliance issues, structural concerns

Be specific and quantitative. Reference code sections where applicable. 800-1500 words.`}];

      // Add photos as vision images
      for(const {photo, label} of photosToAnalyze.slice(0,14)){
        btn.textContent = `⏳ Step 1 of 4 — Processing ${label}…`;
        const compressed = await compressImage(photo, 800, 0.7);
        visionContent.push({type:"text", text:`[${label}]:`});
        visionContent.push({type:"image", source:{type:"base64", media_type:"image/jpeg", data:compressed.split(",")[1]}});
      }

      // Add PDF text as regular text content — no size limits
      if(pdfText){
        visionContent.push({type:"text", text:`\n\n=== CONSTRUCTION DOCUMENTS — EXTRACTED TEXT ===\nThe following text was extracted from uploaded PDF blueprints and construction documents. This contains dimensions, specifications, schedules, notes, and all written content from the plans. Analyze this thoroughly for scope, quantities, and pricing impacts.\n\n${pdfText}`});
      }

      // Add approved concept images to analysis
      const approvedConcepts = (appData.conceptImages||[]).filter(c => c.approved);
      if(approvedConcepts.length > 0){
        visionContent.push({type:"text", text: "=== APPROVED CONCEPT RENDERINGS ===\nThe following are AI-generated concept images that the client has approved. These show EXACTLY what the finished spaces should look like. Use these to identify specific materials, finishes, and scope items for the quantity takeoff."});
        for(const concept of approvedConcepts){
          if(concept.afterImage && concept.afterImage.startsWith("data:")){
            const parts = concept.afterImage.split(",");
            visionContent.push({type:"image", source:{type:"base64", media_type:"image/png", data:parts[1]}});
            visionContent.push({type:"text", text: "Client-approved concept. Prompt: " + concept.prompt});
          }
        }
      }

      const visionModels = ["claude-opus-4-20250514","claude-sonnet-4-20250514","claude-haiku-4-5-20251001"];
      for(let va = 0; va < visionModels.length; va++){
        const isFB = va > 0;
        if(isFB) btn.textContent = va===1 ? "⏳ Step 1 — Trying Sonnet…" : "⏳ Step 1 — Using Haiku fallback…";
        const visionRes = await fetch("https://billowing-snowflake-38f0.coppermountainbuilders406.workers.dev", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({model:visionModels[va], max_tokens:3000, messages:[{role:"user",content:visionContent}]})
        });
        const vd = await visionRes.json();
        if(vd.error && (JSON.stringify(vd.error).includes("overloaded") || visionRes.status === 529) && va < visionModels.length - 1){
          const w = (va+1)*3000; btn.textContent = `⏳ Server busy, retrying... (${va+2}/${visionModels.length})`;
          await new Promise(r => setTimeout(r, w)); continue;
        }
        if(vd.content?.[0]?.text) siteNotes = vd.content[0].text;
        break;
      }
    }

    const qaContext = (appData.clarifyingQuestions||[]).map(q => {
      const ans = (appData.clarifyingAnswers||{})[q.id];
      return ans ? `Q: ${q.question}\nA: ${ans}` : null;
    }).filter(Boolean).join("\n");

    // ── CALL 2: Code Compliance (unchanged) ──
    btn.textContent = "⏳ Step 2 of 4 — Reviewing code compliance…";
    let complianceResult = null;
    try {
      complianceResult = await workerCall([{role:"user", content:
        `Review this project for Montana building code compliance and Flathead County permitting requirements.
PROJECT: ${appData.projectAddress}, ${appData.projectCity||"Flathead County"}, Montana
PROJECT TYPE: ${z.type||"Not specified"} | NOTES: ${z.notes||"none"} | OVERALL: ${appData.projectNotes||"none"}
${siteNotes?"SITE PHOTOS ANALYSIS:\n"+siteNotes:""}
${qaContext?"CLIENT Q&A:\n"+qaContext:""}

Cover: 1) Permits required (building, electrical, plumbing, mechanical, special) with estimated fees and timeline
2) Code compliance items (IRC/IBC 2021 + Flathead County: snow load 70psf, energy code, egress, accessibility)
3) Scope triggers (what forces upgrades of existing systems)
4) Timeline risks (permit delays, engineering, seasonal restrictions)
5) Cost impacts with dollar estimates

Write as a professional narrative report with ALL CAPS section headings. Plain paragraphs, 500-800 words. Do NOT return JSON. Write like a contractor writing a compliance memo — specific, direct, actionable.`
      }], `You are the Chief Estimator at Copper Mountain Builders with deep experience in Montana building code and Flathead County permitting. Write clear professional narrative reports with ALL CAPS section headings. Never return JSON. Write like an experienced contractor.`, 1500);
    } catch(e){ console.warn("Compliance failed:", e.message); complianceResult = "Code compliance review unavailable. Recommend manual review."; }

    // ── CALL 3: Quantity Takeoff (NEW — replaces old calls 3+4) ──
    btn.textContent = "⏳ Step 3 of 4 — Building quantity takeoff…";
    const pdfTextForEstimate = getAllPdfText();
    const requiredTrades = REQUIRED_TRADES_BY_TYPE[z.type] || REQUIRED_TRADES_BY_TYPE["Residential Remodel"] || [];

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

    const takeoffResult = safeJSON(takeoffRaw, "takeoff");

    // Validate
    const warnings = validateTakeoff(takeoffResult.takeoff, z.type, z.sqft);
    if(warnings.length) console.warn("Takeoff warnings:", warnings);

    // APP DOES ALL THE MATH
    const computed = computeEstimateFromTakeoff(takeoffResult, appData.marginPercent || 20);

    // Sanity check
    if(z.sqft){
      const sfWarnings = sanityCheckPerSF(computed.totalLow, computed.totalHigh, z.type, Number(z.sqft));
      if(sfWarnings.length) console.warn("Per-SF warnings:", sfWarnings);
    }

    // ── CALL 4: SOW Narrative + Schedule (combined — replaces old calls 5+6) ──
    btn.textContent = "⏳ Step 4 of 4 — Writing scope & schedule…";

    const sowRaw = await workerCall([{role:"user", content:
      `Write the Scope of Work narrative AND construction schedule for this project.

PROJECT: ${projectSummary}
COMPUTED BUDGET: ${fmt$(computed.totalLow)} LOW — ${fmt$(computed.totalHigh)} HIGH
CONSTRUCTION DURATION: ${computed.gcMonths} months
TRADES INCLUDED: ${computed.sections.map(s => s.name + " (" + fmt$(s.low) + "-" + fmt$(s.high) + ")").join(", ")}
${siteNotes ? "SITE ANALYSIS: "+siteNotes.slice(0,500) : ""}
${appData.projectNotes ? "NOTES: "+appData.projectNotes : ""}
${z.notes ? "PROJECT NOTES: "+z.notes : ""}
${qaContext ? "Q&A:\n"+qaContext : ""}

PART 1 — SCOPE OF WORK (450-650 words for client):

VOICE — read this carefully. You are writing on behalf of Copper Mountain Builders, a sixth-generation Montana family business in Kalispell. The voice is warm, neighborly, refined. Listens before it pitches. Catches problems before they cost the homeowner. Answers the phone three years after the build. Speaks the way a builder would speak to a friend over coffee — confident in the craft, gentle in the delivery. Use "we" for CMB. Use the client's first name(s) once near the top if they're known. Avoid hollow adjectives ("luxurious," "stunning"), avoid construction jargon, avoid bullet-list dryness. Write in flowing sentences with short paragraphs.

GROUND THE WRITING IN WHAT WE ACTUALLY SAW AND DISCUSSED. Use the SITE ANALYSIS, NOTES, PROJECT NOTES, and Q&A above as the source of truth — pull specific details from them (the lot size, the existing conditions, what the client said they want, the trades involved). Do NOT invent details that aren't grounded in the inputs. If a section's specifics aren't in the inputs, keep it brief and honest.

Use these five sections in this order, with sentence-case headings exactly as written:

What we saw at your place — Two short paragraphs. The first describes what we observed on site (drawn from SITE ANALYSIS and PROJECT NOTES — lot, layout, existing conditions, anything notable). The second is one sentence acknowledging what the homeowner said they want, in their words where possible.

What we'd build for you — Walk through the project in plain language. Cover each major trade involved (TRADES INCLUDED list), but write it as a story of how the work flows, not a punch list. Make it specific to the project type. The homeowner should finish reading and know exactly what they're getting.

What this proposal doesn't cover yet — Honest exclusions and the decisions still in front of the client (selections, allowances, things outside the current scope). Frame it as "here's what we'll figure out together as we go," not as legal disclaimers.

Why the budget lands where it does — Two or three sentences on what drives the cost range — Flathead Valley pricing, Montana seasonality, materials we'd use, the design choices that move the number. Honest, not defensive.

How we'd start — The next steps in human terms. Signing the design agreement, the retainer, when we'd have our first sit-down. Close with a short, warm line — something a sixth-generation Montanan would actually say. Not "we look forward to partnering with you." Something true.

PART 2 — SCHEDULE:
Include design phase (10-14 weeks) + construction phase with Montana seasonal constraints.

PART 3 — COMPLIANCE NOTES (internal, rep only): Flag code issues.

Return ONLY this JSON:
{"summary":"SOW narrative","schedule":{"designPhase":"10-14 weeks","constructionPhase":"X months","startToFinish":"total","milestones":[{"phase":"Phase name","duration":"X weeks","notes":"details"}]},"complianceNotes":["note1"]}`
    }], SYSTEM.replace("RESPOND ONLY WITH VALID JSON","Return ONLY the requested JSON."), 3000);

    const sowResult = safeJSON(sowRaw, "sow");

    // Assemble final estimate
    const estimate = {
      ...computed,
      zones: [{name: z.type||"Project", low: computed.subtotalLow, high: computed.subtotalHigh, notes: takeoffResult.scopeNotes}],
      summary: sowResult.summary || "",
      complianceNotes: sowResult.complianceNotes || [],
      complianceAnalysis: complianceResult || "",
      siteAnalysis: siteNotes || "",
      schedule: sowResult.schedule || null
    };

    appData.estimate = estimate;
    const suggested = calcRetainerSuggestion(estimate.totalLow);
    if(!appData.retainerAmount) appData.retainerAmount = suggested;
    releaseWakeLock(wakeLock);
    render();
  } catch(e){
    releaseWakeLock(wakeLock);
    err.textContent = "Error: " + e.message; err.classList.remove("hidden");
    btn.disabled = false; btn.textContent = "✦ Generate AI Estimate";
  }
}



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
      <div class="field" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;">
        <div>
          <label class="field-label" style="margin:0;">Davis-Bacon / Prevailing Wage</label>
          <div style="font-size:11px;color:var(--stone-light);margin-top:2px;">Government projects requiring DOL wage rates</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" ${appData.davisBacon?"checked":""} onchange="appData.davisBacon=this.checked">
          <span class="toggle-slider"></span>
        </label>
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
    <button class="btn-primary" onclick="if(appData.zones[0].type){goTo(2)}else{alert('Please select a project type.')}">Next: Concept Images →</button>
    <button class="btn-secondary" onclick="goTo(0)">← Back</button>
  </div>`;
}

// ── Image Lightbox ────────────────────────────────────────────────────
function showLightbox(src){
  const overlay = document.createElement("div");
  overlay.id = "lightbox-overlay";
  overlay.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;z-index:10000;cursor:pointer;padding:16px;backdrop-filter:blur(4px);";
  overlay.onclick = () => overlay.remove();
  overlay.innerHTML = `<img src="${src}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,0.5);" alt="Full size"/><div style="position:absolute;top:16px;right:20px;color:white;font-size:28px;cursor:pointer;opacity:0.7;">✕</div>`;
  document.body.appendChild(overlay);
}

// ── Concept Images ────────────────────────────────────────────────────
function renderConcept(){
  const z = appData.zones[0];
  const beforePhotos = (z.photosBefore||[]);
  const concepts = appData.conceptImages || [];

  return `<div class="page">
    <div class="card-copper" style="text-align:center;">
      <div style="font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--copper);margin-bottom:6px;">Copper Mountain Builders</div>
      <div style="font-size:20px;font-weight:bold;">Concept Images</div>
      <div style="font-size:12px;color:var(--stone-light);margin-top:6px;">Select a before photo, describe changes, and AI generates a realistic concept</div>
    </div>

    ${concepts.map((c, i) => `
      <div class="card-copper" id="concept-${i}">
        <div class="section-title">Concept ${i+1}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
          <div>
            <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--stone-light);margin-bottom:4px;font-weight:600;">Before</div>
            <img src="${esc(c.beforePhoto)}" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px;border:1px solid rgba(255,255,255,0.1);cursor:pointer;" onclick="showLightbox(this.src)" alt="Before"/>
          </div>
          <div>
            <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:${c.approved?'var(--success)':'var(--copper)'};margin-bottom:4px;font-weight:600;">${c.approved?'Approved':'AI Generated'}</div>
            ${c.afterImage ? `<img src="${esc(c.afterImage)}" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px;border:1px solid ${c.approved?'rgba(74,124,89,0.5)':'rgba(184,115,51,0.3)'};cursor:pointer;" onclick="showLightbox(this.src)" alt="Concept"/>` : `<div style="width:100%;aspect-ratio:4/3;border-radius:10px;background:rgba(0,0,0,0.3);border:2px dashed rgba(184,115,51,0.3);display:flex;align-items:center;justify-content:center;color:var(--stone-light);font-size:13px;" id="concept-preview-${i}">Generating...</div>`}
          </div>
        </div>
        <div class="field">
          <label class="field-label">Your Prompt</label>
          <textarea style="font-size:13px;min-height:50px;" oninput="appData.conceptImages[${i}].prompt=this.value">${esc(c.prompt||'')}</textarea>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn-primary" style="flex:1;margin:0;font-size:13px;" onclick="regenerateConcept(${i})">🔄 Regenerate</button>
          ${c.approved ? `<button class="btn-secondary" style="flex:1;margin:0;font-size:13px;border-color:var(--success);color:var(--success);" onclick="appData.conceptImages[${i}].approved=false;render()">✓ Approved</button>` : `<button class="btn-primary" style="flex:1;margin:0;font-size:13px;background:linear-gradient(135deg,var(--success),#2d6a4f);" onclick="appData.conceptImages[${i}].approved=true;render()">✓ Approve</button>`}
          <button class="btn-secondary" style="flex:0 0 44px;margin:0;font-size:16px;padding:8px;" onclick="appData.conceptImages.splice(${i},1);render()">🗑</button>
        </div>
      </div>
    `).join("")}

    <div class="card" style="border:2px dashed rgba(184,115,51,0.2);text-align:center;padding:20px;">
      <div style="font-size:13px;color:var(--stone-light);margin-bottom:12px;">Select a before photo to create a concept</div>
      ${beforePhotos.length > 0 ? `
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:14px;">
          ${beforePhotos.map((p, i) => `<img src="${p}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;border:2px solid rgba(184,115,51,0.3);cursor:pointer;" onclick="startNewConcept(${i})" alt="Photo ${i+1}"/>`).join("")}
        </div>
      ` : `<p style="font-size:13px;color:var(--stone-light);margin-bottom:8px;">No before photos yet — go back to Scope to add photos.</p>`}
      <div id="new-concept-area" style="display:none;">
        <div class="field">
          <label class="field-label">Describe the changes you want to see</label>
          <textarea id="new-concept-prompt" placeholder="Replace the oak cabinets with white shaker style, add quartz countertops with grey veining, subway tile backsplash..." style="font-size:13px;min-height:70px;"></textarea>
        </div>
        <button class="btn-primary" style="font-size:14px;" onclick="generateNewConcept()" id="gen-concept-btn">✨ Generate Concept Image</button>
        <div id="concept-error" class="error-msg hidden" style="margin-top:8px;"></div>
      </div>
    </div>

    <div style="height:14px;"></div>
    <button class="btn-primary" onclick="goTo(3)">Next: Generate Estimate →</button>
    <button class="btn-secondary" onclick="goTo(1)">← Back to Scope</button>
  </div>`;
}

let _newConceptPhotoIndex = -1;

function startNewConcept(photoIndex){
  _newConceptPhotoIndex = photoIndex;
  const area = document.getElementById("new-concept-area");
  if(area) area.style.display = "block";
  const ta = document.getElementById("new-concept-prompt");
  if(ta) ta.focus();
}

async function generateNewConcept(){
  const btn = document.getElementById("gen-concept-btn");
  const err = document.getElementById("concept-error");
  const prompt = document.getElementById("new-concept-prompt")?.value?.trim();
  if(!prompt){ err.textContent = "Please describe the changes you want to see."; err.classList.remove("hidden"); return; }
  if(_newConceptPhotoIndex < 0) return;

  const beforePhoto = appData.zones[0].photosBefore[_newConceptPhotoIndex];
  btn.disabled = true; btn.textContent = "⏳ Generating concept image...";
  err.classList.add("hidden");
  const wakeLock = await acquireWakeLock();

  try {
    const afterImage = await callOpenAIImageEdit(beforePhoto, prompt);
    appData.conceptImages.push({
      beforePhoto: beforePhoto,
      prompt: prompt,
      afterImage: afterImage,
      approved: false
    });
    _newConceptPhotoIndex = -1;
    releaseWakeLock(wakeLock);
    render();
  } catch(e) {
    releaseWakeLock(wakeLock);
    err.textContent = "Error: " + e.message; err.classList.remove("hidden");
    btn.disabled = false; btn.textContent = "✨ Generate Concept Image";
  }
}

async function regenerateConcept(index){
  const concept = appData.conceptImages[index];
  if(!concept) return;
  const card = document.getElementById("concept-" + index);
  const btns = card?.querySelectorAll("button");
  if(btns) btns.forEach(b => b.disabled = true);
  const wakeLock = await acquireWakeLock();

  try {
    const afterImage = await callOpenAIImageEdit(concept.beforePhoto, concept.prompt);
    appData.conceptImages[index].afterImage = afterImage;
    appData.conceptImages[index].approved = false;
    releaseWakeLock(wakeLock);
    render();
  } catch(e) {
    releaseWakeLock(wakeLock);
    alert("Regenerate failed: " + e.message);
    if(btns) btns.forEach(b => b.disabled = false);
  }
}

async function callOpenAIImageEdit(beforePhotoDataUrl, prompt){
  const WORKER = "https://billowing-snowflake-38f0.coppermountainbuilders406.workers.dev/openai";

  // Extract base64 data and detect media type from dataUrl
  let base64Data, mediaType = "image/jpeg";
  if(beforePhotoDataUrl.includes(",")){
    const parts = beforePhotoDataUrl.split(",");
    base64Data = parts[1];
    const mMatch = parts[0].match(/data:([^;]+)/);
    if(mMatch) mediaType = mMatch[1];
  } else {
    base64Data = beforePhotoDataUrl;
  }

  const res = await fetch(WORKER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: base64Data,
      mediaType: mediaType,
      prompt: `You are looking at a real photo of an existing room/space. Create a photorealistic image showing this SAME space with the following modifications. Keep the exact same room geometry, perspective, windows, and architectural elements. Only change what is described:\n\n${prompt}`,
      size: "1024x1024",
      quality: "high"
    })
  });

  const data = await res.json();
  if(data.error) throw new Error(data.error.message || JSON.stringify(data.error));

  // Response from our worker — look for b64 image in multiple formats
  if(data.image_b64){
    return "data:image/png;base64," + data.image_b64;
  }
  // Fallback: check OpenAI Responses API output format
  if(data.output){
    for(const item of data.output){
      if(item.type === "image_generation_call" && item.result){
        return "data:image/png;base64," + item.result;
      }
    }
  }
  // Fallback: Images API format
  if(data.data?.[0]?.b64_json){
    return "data:image/png;base64," + data.data[0].b64_json;
  } else if(data.data?.[0]?.url){
    return data.data[0].url;
  }
  throw new Error("No image returned from OpenAI");
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
    <button class="btn-secondary" onclick="goTo(2)">← Back</button>
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
      ${est.marginPercent?`
      <div class="estimate-row">
        <span style="color:var(--stone-light);">Subtotal (trades)</span>
        <span style="color:var(--stone-light);">${fmt$(est.subtotalLow)} — ${fmt$(est.subtotalHigh)}</span>
      </div>
      <div class="estimate-row">
        <span style="color:var(--stone-light);">GC / General Conditions</span>
        <span style="color:var(--stone-light);">${fmt$(est.gcLow)} — ${fmt$(est.gcHigh)}</span>
      </div>
      <div class="estimate-row">
        <span style="color:var(--stone-light);">Margin (${est.marginPercent}%)</span>
        <span style="color:var(--stone-light);">${fmt$(est.marginLow)} — ${fmt$(est.marginHigh)}</span>
      </div>`:""}
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
          <div style="padding-left:8px;margin-top:4px;">
            ${(s.items||[]).map(item=>`
              <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:4px 0;border-bottom:1px solid rgba(92,88,80,0.15);">
                <span style="font-size:12px;color:var(--cream-dk);flex:1;padding-right:8px;">${esc(item.description)}${item.notes?' <span style="color:var(--stone-light);font-size:10px;">('+esc(item.notes)+')</span>':''}</span>
                <span style="font-size:11px;color:var(--stone-light);white-space:nowrap;text-align:right;">
                  ${item.qty} ${esc(item.unit||"LS")} @ ${fmt$(item.unitCostLow)}-${fmt$(item.unitCostHigh)}<br>
                  <strong style="color:var(--cream);">${fmt$(item.lineTotalLow)} – ${fmt$(item.lineTotalHigh)}</strong>
                </span>
              </div>
            `).join("")}
          </div>
        </div>
      `).join("")}
    </div>`:""}
    ${(est.gcLow||est.generalConditions)?`
    <div class="card">
      <div class="section-title">General Conditions (${est.gcMonths||est.generalConditions?.months||1} month${(est.gcMonths||est.generalConditions?.months||1)>1?"s":""})</div>
      ${(est.generalConditions?.items||[]).map(item=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(92,88,80,0.15);">
          <span style="font-size:12px;color:var(--cream-dk);">${esc(item.description)}</span>
          <span style="font-size:12px;color:var(--cream);">${item.qty} ${esc(item.unit)} @ ${fmt$(item.unitCostLow)}-${fmt$(item.unitCostHigh)} = ${fmt$(item.lineTotalLow)} – ${fmt$(item.lineTotalHigh)}</span>
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
    <button class="btn-primary" onclick="goTo(4)">Next: Sign Agreement →</button>
    <button class="btn-secondary" onclick="goTo(2)">← Back</button>
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
    ${est&&est.summary?`<div class="card">
      <div class="section-title">Scope of Work</div>
      <div style="font-size:13px;color:var(--cream-dk);line-height:1.8;white-space:pre-wrap;">${esc(est.summary)}</div>
    </div>`:""}
    <div class="card" style="margin-top:8px;">
      <div class="section-title">Export & Share</div>
      <button class="btn-secondary" onclick="emailProposal()" style="margin-bottom:8px;">📧 Email Proposal to Client</button>
      <button class="btn-secondary" onclick="exportExcel()" style="margin-bottom:8px;">📊 Download Estimate (Excel)</button>
      <button class="btn-secondary" onclick="generateProposalDocument()" style="margin-bottom:8px;">📄 Download Proposal Document</button>
      <button class="btn-secondary" onclick="window.print();fullSave()" style="margin-bottom:8px;">🖨 Print Signed Agreement</button>
      <button class="btn-secondary" onclick="generateSignedContractPdf()" style="margin-bottom:8px;">📄 Download Signed Contract</button>
      <button class="btn-secondary" onclick="fullSave()">🗂 Save Visit to App</button>
      <div style="border-top:1px solid rgba(92,88,80,0.4);margin-top:12px;padding-top:12px;">
        <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--stone-light);margin-bottom:8px;">OneDrive</div>
        <button id="od-connect-btn" class="btn-secondary" style="margin-bottom:8px;width:100%;font-size:13px;" onclick="odSignIn()">☁ Connect OneDrive</button>
        <button class="btn-secondary" style="width:100%;background:rgba(45,106,79,0.15);border:1px solid rgba(45,106,79,0.5);color:#7ec8a4;font-size:13px;" onclick="syncVisitToOneDrive()" id="od-sync-btn">☁ Sync This Visit to OneDrive</button>
        <p style="font-size:11px;color:var(--stone-light);margin-top:6px;line-height:1.5;">Saves visit JSON + proposal + estimate to OneDrive</p>
      </div>
    </div>
    <button class="btn-secondary" onclick="goTo(4)">← Back to Agreement</button>
  </div>`;
}

function renderSign(){
  const d = appData;
  const dt = today();
  const clientName = esc(d.clientName||"[Client Full Legal Name(s)]");
  const clientAddr = d.clientAddress ? `${esc(d.clientAddress)}, ${esc(d.clientCity||"")}, Montana ${esc(d.clientZip||"")}` : "[Client Mailing Address], [City], Montana [ZIP]";
  const projectAddr = d.projectAddress ? `${esc(d.projectAddress)}, ${esc(d.projectCity||"")}, Montana ${esc(d.clientZip||"")}` : "[Project Address], [City], Montana [ZIP]";
  const retainer = d.retainerAmount ? fmt$(d.retainerAmount) : "$[Insert Amount]";

  return `<div class="page">
    <div class="card-copper" style="text-align:center;">
      <div style="font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--copper);margin-bottom:6px;">Copper Mountain Builders</div>
      <div style="font-size:20px;font-weight:bold;margin-bottom:4px;">Design-Build Agreement</div>
      <div style="font-size:12px;color:var(--stone-light);margin-top:4px;">${dt}</div>
    </div>

    <div class="card" style="border-color:rgba(184,115,51,0.4);">
      <div style="background:rgba(44,42,39,0.5);border-radius:8px;padding:16px;max-height:none;overflow-y:auto;font-size:13px;line-height:1.8;color:var(--cream-dk);">

        <p style="color:var(--copper);font-size:13px;font-weight:bold;margin-bottom:8px;">Welcome</p>
        <p style="margin-bottom:8px;">Thank you for choosing <strong style="color:var(--copper);">Copper Mountain Builders</strong> for your home project in the Flathead Valley. This Agreement clearly explains what we will do for you, what you can expect, how we work together, and how we protect both of us.</p>
        <p style="margin-bottom:16px;">We designed this document to be easy to read while still giving you the protection and peace of mind you deserve — like a good insurance policy for your design investment.</p>

        <p style="color:var(--copper);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:16px 0 8px 0;">Parties to This Agreement</p>
        <p style="margin-bottom:4px;"><strong>You (the Client):</strong></p>
        <p style="margin-bottom:4px;color:var(--gold);">${clientName}</p>
        <p style="margin-bottom:12px;color:var(--cream-dk);">${clientAddr}</p>
        <p style="margin-bottom:4px;"><strong>We (the Contractor):</strong></p>
        <p style="margin-bottom:4px;">Copper Mountain Builders</p>
        <p style="margin-bottom:12px;">PO Box 2471, Kalispell, MT 59903</p>
        <p style="margin-bottom:16px;"><strong>Project Address:</strong> ${projectAddr}</p>

        <p style="color:var(--copper);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:16px 0 8px 0;">1. What We Will Do for You</p>
        <p style="margin-bottom:8px;">We will provide professional preconstruction design services using our proven <strong>5-Step Design-Build Program</strong> (see Exhibit A for full details). These services cover everything from initial planning through final design documents and bidding preparation.</p>
        <p style="margin-bottom:4px;"><strong>Steps Covered in This Agreement:</strong></p>
        <p style="margin-bottom:4px;padding-left:16px;">· Step 1 – Initial Consultation + Vision Planning</p>
        <p style="margin-bottom:4px;padding-left:16px;">· Step 2 – Schematic Design</p>
        <p style="margin-bottom:4px;padding-left:16px;">· Step 3 – Design Development</p>
        <p style="margin-bottom:8px;padding-left:16px;">· Step 4 – Project Development</p>
        <p style="margin-bottom:8px;">Step 5 (actual construction and post-build support) is handled under a separate full construction contract that we will present when the design is complete.</p>
        <p style="margin-bottom:8px;">We include two client meetings per phase in Steps 1–3 and all coordination of surveys, engineering, renderings, and bidding packages.</p>
        <p style="margin-bottom:8px;"><strong>Your Role (Client Assignments):</strong> In each step you will complete simple assignments such as selecting materials, approving floor plans, and interior choices (detailed in Exhibit A). Timely completion helps keep your project on schedule. If assignments are delayed, we may need to adjust the schedule and charge additional time at our standard rates.</p>
        <p style="margin-bottom:8px;">This Agreement is your retainer for professional design services. When Steps 1–4 are complete, we will present the full construction contract and we have the first right of refusal to build your project.</p>

        <p style="color:var(--copper);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:16px 0 8px 0;">2. Your Investment (Compensation)</p>
        <p style="margin-bottom:4px;">We charge a clear hourly rate that includes a 20% markup for overhead and management:</p>
        <p style="margin-bottom:4px;padding-left:16px;">· Principal / General Management: <strong>$250.00 per hour</strong></p>
        <p style="margin-bottom:4px;padding-left:16px;">· Architectural Design Services: <strong>$250.00 per hour</strong></p>
        <p style="margin-bottom:4px;padding-left:16px;">· Consultants / Specialty Engineering: <strong>$250.00 per hour</strong></p>
        <p style="margin-bottom:8px;padding-left:16px;">· Interior/Exterior Designer: <strong>$150.00 per hour</strong></p>
        <p style="margin-bottom:8px;"><strong>Initial Non-Refundable Retainer: <span style="color:var(--gold);">${retainer}</span></strong> — payable when you sign and applied to your first invoice(s).</p>
        <p style="margin-bottom:4px;"><strong>Payment Terms:</strong></p>
        <p style="margin-bottom:4px;padding-left:16px;">· Invoices are sent monthly or at phase milestones.</p>
        <p style="margin-bottom:4px;padding-left:16px;">· Payment is due within <strong>10 calendar days</strong>.</p>
        <p style="margin-bottom:8px;padding-left:16px;">· Late payments accrue interest at 1.5% per month (or the maximum allowed by Montana law).</p>
        <p style="margin-bottom:16px;">Final design documents are released only after all outstanding amounts are paid in full.</p>

        <p style="color:var(--copper);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:16px 0 8px 0;">3. How Long This Lasts &amp; What Happens if We Stop Early</p>
        <p style="margin-bottom:8px;">This Agreement begins on the date above and continues until we complete Steps 1–4, or until one of us ends it with <strong>14 days written notice</strong>.</p>
        <p style="margin-bottom:4px;">If the Agreement ends early:</p>
        <p style="margin-bottom:4px;padding-left:16px;">· You pay for all work we have completed and any expenses incurred up to that date.</p>
        <p style="margin-bottom:4px;padding-left:16px;">· You pay a <strong>Termination Fee</strong> of 10% of the estimated construction cost (or a minimum of $5,000, whichever is greater).</p>
        <p style="margin-bottom:8px;padding-left:16px;">· All design materials must be returned or destroyed — you receive no license to use them.</p>
        <p style="margin-bottom:16px;"><strong>Important Protection:</strong> If you (or anyone working with you) later uses any of our designs to build with another contractor without our written permission and full payment, you will owe a <strong>Design Licensing Fee equal to 200% of the total design fees</strong> paid or estimated.</p>

        <p style="color:var(--copper);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:16px 0 8px 0;">4. Who Owns the Designs</p>
        <p style="margin-bottom:8px;">All drawings, renderings, plans, and other materials we create ("Work Product") belong entirely to us and are protected by copyright law.</p>
        <p style="margin-bottom:4px;">You receive no right to copy, modify, or use the designs for construction until both of the following happen:</p>
        <p style="margin-bottom:4px;padding-left:16px;">(a) You have paid all fees in full, and</p>
        <p style="margin-bottom:8px;padding-left:16px;">(b) You have signed the full construction contract with us or paid the Design Licensing Fee.</p>
        <p style="margin-bottom:16px;">Unauthorized use is copyright infringement. We may also file a mechanic's lien on your property for any unpaid amounts (as allowed by Montana law).</p>

        <p style="color:var(--copper);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:16px 0 8px 0;">5. Our Promises to You</p>
        <p style="margin-bottom:4px;padding-left:16px;">· We perform all work to the professional standard of care expected in Montana.</p>
        <p style="margin-bottom:4px;padding-left:16px;">· We maintain appropriate insurance (proof available upon request).</p>
        <p style="margin-bottom:4px;padding-left:16px;">· We are an independent contractor (no employment relationship).</p>
        <p style="margin-bottom:16px;padding-left:16px;">· We follow all required Montana residential construction disclosures (see Exhibit B).</p>

        <p style="color:var(--copper);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:16px 0 8px 0;">6. Your Protections</p>
        <p style="margin-bottom:4px;padding-left:16px;">· Our total liability to you is limited to the total fees you paid us.</p>
        <p style="margin-bottom:4px;padding-left:16px;">· Both sides agree to keep each other's information confidential.</p>
        <p style="margin-bottom:16px;padding-left:16px;">· Either side may end the Agreement with proper notice and payment for work done.</p>

        <p style="color:var(--copper);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:16px 0 8px 0;">7. How We Communicate</p>
        <p style="margin-bottom:4px;">All notices must be in writing and sent to:</p>
        <p style="margin-bottom:4px;padding-left:16px;"><strong>You:</strong> ${clientName} at ${clientAddr}</p>
        <p style="margin-bottom:8px;padding-left:16px;"><strong>Us:</strong> Copper Mountain Builders, PO Box 2471, Kalispell, MT 59903</p>
        <p style="margin-bottom:16px;">Notices are considered delivered when personally handed, two days after registered mail, or the next business day after overnight courier.</p>

        <p style="color:var(--copper);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:16px 0 8px 0;">8. Other Important Information</p>
        <p style="margin-bottom:4px;padding-left:16px;">· This Agreement (plus Exhibits) is the complete understanding between us.</p>
        <p style="margin-bottom:4px;padding-left:16px;">· Any changes must be in writing and signed by both of us.</p>
        <p style="margin-bottom:4px;padding-left:16px;">· Time is important — we will both work to keep your project moving.</p>
        <p style="margin-bottom:16px;padding-left:16px;">· Montana law governs this Agreement. Any disputes will first go to mediation, then Flathead County District Court if needed. The winning side can recover reasonable attorney fees.</p>

        <p style="color:var(--copper);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:20px 0 8px 0;">Exhibit A — Our 5-Step Design-Build Program</p>
        <p style="margin-bottom:8px;"><strong>STEP 1 – Initial Consultation + Vision Planning:</strong> We evaluate your site, foundation needs, timeline, and scope. Two client meetings to discover your vision and architectural inspiration. <em>Your Assignment: Floor plan + material selection; we explain Buildertrend.</em></p>
        <p style="margin-bottom:8px;"><strong>STEP 2 – Schematic Design:</strong> We handle early structural, environmental, and energy code considerations. Two client meetings to finalize floor plans and apply changes. <em>Your Assignment: Interior selections (cabinetry, fixtures, trim, doors/windows).</em></p>
        <p style="margin-bottom:8px;"><strong>STEP 3 – Design Development:</strong> We finalize floor plans, elevations, sections, and all materials with renderings. Two client meetings for side-by-side review. Plans are signed off and sent to engineering.</p>
        <p style="margin-bottom:8px;"><strong>STEP 4 – Project Development:</strong> We prepare budgeting, scheduling, Scope of Work, subcontractor bids, material pricing, permits, and site-prep costs. All trade bids are finalized.</p>
        <p style="margin-bottom:16px;"><strong>STEP 5 – Construction + Post-Build Support:</strong> Performed only under a separate full construction contract.</p>

        <p style="color:var(--copper);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:16px 0 8px 0;">Exhibit B — Insurance &amp; Montana Disclosures</p>
        <p style="margin-bottom:4px;">We maintain general liability insurance and appropriate workers' compensation coverage (or exemption) as required by law.</p>
        <p style="margin-bottom:4px;padding-left:16px;">· We provide a one-year express warranty on workmanship and materials (detailed in the full construction contract).</p>
        <p style="margin-bottom:8px;padding-left:16px;">· Full insurance certificates and additional disclosures are available upon request.</p>
      </div>
    </div>

    <div class="card-copper">
      <div class="section-title" style="font-size:12px;">In Witness Whereof</div>
      <p style="font-size:13px;color:var(--cream-dk);margin-bottom:20px;line-height:1.6;">We both agree to the terms above.</p>

      <p style="color:var(--copper);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">You (Client): ${clientName}</p>
      ${sigBlock("sig_client","clientSig","Client Signature")}
      <div class="row2">
        <div class="field"><label class="field-label">Print Name</label><input value="${esc(d.clientPrintName||d.clientName)}" oninput="appData.clientPrintName=this.value"/></div>
        <div class="field"><label class="field-label">Date</label><input value="${dt}" readonly style="opacity:0.7"/></div>
      </div>
      <div class="divider"></div>
      <p style="color:var(--copper);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">We (Copper Mountain Builders)</p>
      ${sigBlock("sig_rep","repSig","Contractor Signature")}
      <div class="row2">
        <div class="field"><label class="field-label">Printed Name &amp; Title</label><input value="${esc(d.repPrintName||d.repName)}" oninput="appData.repPrintName=this.value"/></div>
        <div class="field"><label class="field-label">Date</label><input value="${dt}" readonly style="opacity:0.7"/></div>
      </div>
    </div>

    ${appData.estimate ? `
    <div class="card" style="border:1px solid rgba(184,115,51,0.25);">
      <div class="section-title">Conceptual Budget Summary</div>
      <p style="font-size:12px;color:var(--stone-light);margin-bottom:14px;line-height:1.5;">The following is a preliminary conceptual budget range based on our initial site evaluation. Final pricing will be determined after completion of Steps 1–4.</p>
      ${(()=>{
        const est = appData.estimate;
        const m = 1 + (appData.marginPercent||20)/100;
        const sections = est.sections || est.zones || [];
        return sections.map(s => {
          const sLow = Math.round((s.low||0) * m);
          const sHigh = Math.round((s.high||0) * m);
          return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px;"><span style="color:var(--cream-dk);">'+esc(s.name)+'</span><span style="color:var(--gold);font-weight:500;">'+fmt$(sLow)+' – '+fmt$(sHigh)+'</span></div>';
        }).join("");
      })()}
      ${(()=>{
        const est = appData.estimate;
        const m = 1 + (appData.marginPercent||20)/100;
        if(est.gcLow){
          return '<div style="margin-top:8px;display:flex;justify-content:space-between;padding:6px 0;font-size:13px;"><span style="color:var(--cream-dk);">General Conditions</span><span style="color:var(--cream-dk);">'+fmt$(Math.round(est.gcLow*m))+' – '+fmt$(Math.round(est.gcHigh*m))+'</span></div>';
        }
        return '';
      })()}
      <div style="display:flex;justify-content:space-between;padding:14px 0 4px;font-size:17px;font-weight:700;border-top:2px solid rgba(184,115,51,0.3);margin-top:8px;">
        <span style="color:var(--cream);">Conceptual Budget Range</span>
        <span style="color:var(--gold);">${fmt$(appData.estimate.totalLow)} – ${fmt$(appData.estimate.totalHigh)}</span>
      </div>
      <p style="font-size:11px;color:var(--stone-light);font-style:italic;margin-top:10px;line-height:1.5;">*This is a conceptual estimate only and does not constitute a binding bid. Final scope, specifications, and pricing will be determined through the Design-Build process outlined in this Agreement.</p>
    </div>
    <div style="padding:10px;text-align:center;">
      <p style="font-size:11px;color:var(--stone-light);">Initial Non-Refundable Retainer</p>
      <p style="font-size:20px;font-weight:700;color:var(--gold);margin:4px 0;">${fmt$(d.retainerAmount||0)}</p>
      <p style="font-size:11px;color:var(--stone-light);">Due upon execution of this Agreement</p>
    </div>
    ` : ''}

    <button class="btn-primary" onclick="goTo(5)">Next: Save & Export →</button>
    <button class="btn-secondary" onclick="goTo(3)">← Back to Estimate</button>
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
  else if(currentStep===2) html = renderConcept();
  else if(currentStep===3) html = renderEstimate();
  else if(currentStep===4) html = renderSign();
  else if(currentStep===5) html = renderReview();
  app.innerHTML = html;
  updateHeader();
  if(currentStep===4){
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
