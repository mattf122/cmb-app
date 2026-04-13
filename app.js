// ── State ──────────────────────────────────────────────────────────
const STEPS = ["Client","Scope","Estimate","Review","Sign"];
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
      csiCode: trade.csiCode || getBtInfo(trade.trade).labor,
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

// Buildertrend CSI Cost Code Map
// Each entry: { labor: "X.X01 Name Labor", material: "X.X02 Name Material", div: "XX Division Name" }
const BT_MAP = {
  // Division 00 — Procurement
  "Permits":                    { labor: "0.101 Permits and Approvals Labor",                  material: "0.102 Permits and Approvals Material",                  div: "00 Procurement and Contracting Requirements" },
  "Design Services":            { labor: "0.201 Design and Pre-Construction Services Labor",    material: "0.202 Design and Pre-Construction Services Material",    div: "00 Procurement and Contracting Requirements" },
  "Bidding":                    { labor: "0.301 Bidding and Estimating Labor",                  material: "0.302 Bidding and Estimating Material",                  div: "00 Procurement and Contracting Requirements" },
  "Insurance":                  { labor: "0.601 Initial Insurance and Bonding Labor",           material: "0.602 Initial Insurance and Bonding Material",           div: "00 Procurement and Contracting Requirements" },
  // Division 01 — General Requirements
  "General Conditions":         { labor: "1.101 Project Administration and General Office Labor", material: "1.102 Project Administration and General Office Material", div: "01 General Requirements" },
  "Project Management":         { labor: "1.201 Project Personnel Costs Labor",                material: "1.202 Project Personnel Costs Material",                div: "01 General Requirements" },
  "Superintendent":             { labor: "1.201 Project Personnel Costs Labor",                material: "1.202 Project Personnel Costs Material",                div: "01 General Requirements" },
  "Temporary Facilities":       { labor: "1.301 Temporary Facilities and Site Controls Labor", material: "1.302 Temporary Facilities and Site Controls Material", div: "01 General Requirements" },
  "Temporary Utilities":        { labor: "1.351 Temporary Utilities and Site Access Labor",    material: "1.352 Temporary Utilities and Site Access Material",    div: "01 General Requirements" },
  "Safety":                     { labor: "1.601 Safety and Compliance Labor",                  material: "1.602 Safety and Compliance Material",                  div: "01 General Requirements" },
  "Bonding":                    { labor: "1.701 Bonding and Insurance Labor",                  material: "1.702 Bonding and Insurance Material",                  div: "01 General Requirements" },
  "Cleanup":                    { labor: "1.901 Cleaning and Site Maintenance Labor",          material: "1.902 Cleaning and Site Maintenance Material",          div: "01 General Requirements" },
  "Dumpster":                   { labor: "1.901 Cleaning and Site Maintenance Labor",          material: "1.902 Cleaning and Site Maintenance Material",          div: "01 General Requirements" },
  "Contingency":                { labor: "1.991 Uncategorized Labor",                          material: "1.992 Uncategorized Material",                          div: "01 General Requirements" },
  // Division 02 — Existing Conditions
  "Demolition":                 { labor: "2.201 Demolition and Removal Labor",                 material: "2.202 Demolition and Removal Material",                 div: "02 Existing Conditions" },
  "Selective Demolition":       { labor: "2.201 Demolition and Removal Labor",                 material: "2.202 Demolition and Removal Material",                 div: "02 Existing Conditions" },
  "Site Survey":                { labor: "2.101 Site Survey and Assessment Labor",             material: "2.102 Site Survey and Assessment Material",             div: "02 Existing Conditions" },
  "Environmental Remediation":  { labor: "2.301 Environmental Remediation Labor",              material: "2.302 Environmental Remediation Material",              div: "02 Existing Conditions" },
  "Abatement":                  { labor: "2.301 Environmental Remediation Labor",              material: "2.302 Environmental Remediation Material",              div: "02 Existing Conditions" },
  "Site Clearing":              { labor: "2.401 Site Preparation and Clearing Labor",          material: "2.402 Site Preparation and Clearing Material",          div: "02 Existing Conditions" },
  // Division 03 — Concrete
  "Concrete":                   { labor: "3.301 Cast-in-Place Concrete Labor",                 material: "3.302 Cast-in-Place Concrete Material",                 div: "03 Concrete" },
  "Foundation":                 { labor: "3.101 Formwork Labor",                               material: "3.102 Formwork Material",                               div: "03 Concrete" },
  "Footings":                   { labor: "3.101 Formwork Labor",                               material: "3.102 Formwork Material",                               div: "03 Concrete" },
  "Slab":                       { labor: "3.301 Cast-in-Place Concrete Labor",                 material: "3.302 Cast-in-Place Concrete Material",                 div: "03 Concrete" },
  "Flatwork":                   { labor: "3.501 Concrete Finishing Labor",                     material: "3.502 Concrete Finishing Material",                     div: "03 Concrete" },
  // Division 04 — Masonry
  "Masonry":                    { labor: "4.201 Unit Masonry Labor",                           material: "4.202 Unit Masonry Material",                           div: "04 Masonry" },
  "Brick":                      { labor: "4.201 Unit Masonry Labor",                           material: "4.202 Unit Masonry Material",                           div: "04 Masonry" },
  "Stone Masonry":              { labor: "4.301 Stone Masonry Labor",                          material: "4.302 Stone Masonry Material",                          div: "04 Masonry" },
  "Fireplace":                  { labor: "4.201 Unit Masonry Labor",                           material: "4.202 Unit Masonry Material",                           div: "04 Masonry" },
  // Division 05 — Metals
  "Structural Steel":           { labor: "5.101 Structural Steel Framing Labor",               material: "5.102 Structural Steel Framing Material",               div: "05 Metals" },
  "Steel Framing":              { labor: "5.401 Cold-Formed Metal Framing Labor",              material: "5.402 Cold-Formed Metal Framing Material",              div: "05 Metals" },
  "Metal Fabrications":         { labor: "5.501 Metal Fabrications Labor",                     material: "5.502 Metal Fabrications Material",                     div: "05 Metals" },
  // Division 06 — Wood, Plastics & Composites
  "Framing":                    { labor: "6.101 Rough Carpentry Labor",                        material: "6.102 Rough Carpentry Material",                        div: "06 Woods, Plastics, and Composites" },
  "Rough Framing":              { labor: "6.101 Rough Carpentry Labor",                        material: "6.102 Rough Carpentry Material",                        div: "06 Woods, Plastics, and Composites" },
  "Rough Carpentry":            { labor: "6.101 Rough Carpentry Labor",                        material: "6.102 Rough Carpentry Material",                        div: "06 Woods, Plastics, and Composites" },
  "Finish Carpentry":           { labor: "6.201 Finish Carpentry Labor",                       material: "6.202 Finish Carpentry Material",                       div: "06 Woods, Plastics, and Composites" },
  "Trim":                       { labor: "6.201 Finish Carpentry Labor",                       material: "6.202 Finish Carpentry Material",                       div: "06 Woods, Plastics, and Composites" },
  "Millwork":                   { labor: "6.201 Finish Carpentry Labor",                       material: "6.202 Finish Carpentry Material",                       div: "06 Woods, Plastics, and Composites" },
  "Cabinetry":                  { labor: "12.101 Casework and Millwork Labor",                 material: "12.102 Casework and Millwork Material",                 div: "12 Furnishings" },
  "Cabinets":                   { labor: "12.101 Casework and Millwork Labor",                 material: "12.102 Casework and Millwork Material",                 div: "12 Furnishings" },
  "Countertops":                { labor: "12.101 Casework and Millwork Labor",                 material: "12.102 Casework and Millwork Material",                 div: "12 Furnishings" },
  "Deck":                       { labor: "6.701 Wood Decking and Planking Labor",              material: "6.702 Wood Decking and Planking Material",              div: "06 Woods, Plastics, and Composites" },
  "Decking":                    { labor: "6.701 Wood Decking and Planking Labor",              material: "6.702 Wood Decking and Planking Material",              div: "06 Woods, Plastics, and Composites" },
  "Composite Decking":          { labor: "6.501 Composite Materials Labor",                    material: "6.502 Composite Materials Material",                    div: "06 Woods, Plastics, and Composites" },
  // Division 07 — Thermal & Moisture Protection
  "Insulation":                 { labor: "7.201 Insulation Labor",                             material: "7.202 Insulation Material",                             div: "07 Thermal and Moisture Protection" },
  "Spray Foam":                 { labor: "7.201 Insulation Labor",                             material: "7.202 Insulation Material",                             div: "07 Thermal and Moisture Protection" },
  "Roofing":                    { labor: "7.401 Roofing Systems Labor",                        material: "7.402 Roofing Systems Material",                        div: "07 Thermal and Moisture Protection" },
  "Metal Roofing":              { labor: "7.401 Roofing Systems Labor",                        material: "7.402 Roofing Systems Material",                        div: "07 Thermal and Moisture Protection" },
  "Standing Seam":              { labor: "7.401 Roofing Systems Labor",                        material: "7.402 Roofing Systems Material",                        div: "07 Thermal and Moisture Protection" },
  "Shingles":                   { labor: "7.401 Roofing Systems Labor",                        material: "7.402 Roofing Systems Material",                        div: "07 Thermal and Moisture Protection" },
  "Waterproofing":              { labor: "7.101 Waterproofing Labor",                          material: "7.102 Waterproofing Material",                          div: "07 Thermal and Moisture Protection" },
  "Flashing":                   { labor: "7.501 Roof Specialties and Accessories Labor",       material: "7.502 Roof Specialties and Accessories Material",       div: "07 Thermal and Moisture Protection" },
  "Siding":                     { labor: "7.701 Siding and Exterior Wall Finish Systems Labor", material: "7.702 Siding and Exterior Wall Finish Systems Material", div: "07 Thermal and Moisture Protection" },
  "Exterior Cladding":          { labor: "7.701 Siding and Exterior Wall Finish Systems Labor", material: "7.702 Siding and Exterior Wall Finish Systems Material", div: "07 Thermal and Moisture Protection" },
  "Vapor Barrier":              { labor: "7.301 Vapor Retarders Labor",                        material: "7.302 Vapor Retarders Material",                        div: "07 Thermal and Moisture Protection" },
  "Sealants":                   { labor: "7.801 Sealants and Caulking Labor",                  material: "7.802 Sealants and Caulking Material",                  div: "07 Thermal and Moisture Protection" },
  "Weather Barrier":            { labor: "7.901 Weather Barriers Labor",                       material: "7.902 Weather Barriers Material",                       div: "07 Thermal and Moisture Protection" },
  // Division 08 — Openings
  "Doors":                      { labor: "8.101 Standard Doors Labor",                         material: "8.102 Standard Doors Material",                         div: "08 Openings" },
  "Exterior Doors":             { labor: "8.101 Standard Doors Labor",                         material: "8.102 Standard Doors Material",                         div: "08 Openings" },
  "Garage Doors":               { labor: "8.201 Specialty Doors Labor",                        material: "8.202 Specialty Doors Material",                        div: "08 Openings" },
  "Windows":                    { labor: "8.401 Windows Labor",                                material: "8.402 Windows Material",                                div: "08 Openings" },
  "Skylights":                  { labor: "8.501 Skylights and Roof Windows Labor",             material: "8.502 Skylights and Roof Windows Material",             div: "08 Openings" },
  "Hardware":                   { labor: "8.701 Hardware and Fittings Labor",                  material: "8.702 Hardware and Fittings Material",                  div: "08 Openings" },
  "Doors & Windows":            { labor: "8.101 Standard Doors Labor",                         material: "8.102 Standard Doors Material",                         div: "08 Openings" },
  // Division 09 — Finishes
  "Drywall":                    { labor: "9.101 Plaster and Gypsum Board Labor",               material: "9.102 Plaster and Gypsum Board Material",               div: "09 Finishes" },
  "Gypsum Board":               { labor: "9.101 Plaster and Gypsum Board Labor",               material: "9.102 Plaster and Gypsum Board Material",               div: "09 Finishes" },
  "Tile":                       { labor: "9.301 Tile and Stone Labor",                         material: "9.302 Tile and Stone Material",                         div: "09 Finishes" },
  "Tile & Flooring":            { labor: "9.301 Tile and Stone Labor",                         material: "9.302 Tile and Stone Material",                         div: "09 Finishes" },
  "Hardwood Flooring":          { labor: "9.401 Wood Flooring Labor",                          material: "9.402 Wood Flooring Material",                          div: "09 Finishes" },
  "LVP":                        { labor: "9.501 Resilient Flooring Labor",                     material: "9.502 Resilient Flooring Material",                     div: "09 Finishes" },
  "Flooring":                   { labor: "9.501 Resilient Flooring Labor",                     material: "9.502 Resilient Flooring Material",                     div: "09 Finishes" },
  "Carpet":                     { labor: "9.601 Carpet and Matting Labor",                     material: "9.602 Carpet and Matting Material",                     div: "09 Finishes" },
  "Painting":                   { labor: "9.801 Painting and Coating Labor",                   material: "9.802 Painting and Coating Material",                   div: "09 Finishes" },
  "Paint":                      { labor: "9.801 Painting and Coating Labor",                   material: "9.802 Painting and Coating Material",                   div: "09 Finishes" },
  "Interior Finishes":          { labor: "9.991 Uncategorized Labor",                          material: "9.992 Uncategorized Material",                          div: "09 Finishes" },
  "Finishes":                   { labor: "9.991 Uncategorized Labor",                          material: "9.992 Uncategorized Material",                          div: "09 Finishes" },
  // Division 21 — Fire Suppression
  "Fire Suppression":           { labor: "21.201 Sprinkler Systems Labor",                     material: "21.202 Sprinkler Systems Material",                     div: "21 Fire Suppression" },
  "Sprinklers":                 { labor: "21.201 Sprinkler Systems Labor",                     material: "21.202 Sprinkler Systems Material",                     div: "21 Fire Suppression" },
  // Division 22 — Plumbing
  "Plumbing":                   { labor: "22.101 Piping Systems Labor",                        material: "22.102 Piping Systems Material",                        div: "22 Plumbing" },
  "Plumbing Fixtures":          { labor: "22.201 Plumbing Fixtures Labor",                     material: "22.202 Plumbing Fixtures Material",                     div: "22 Plumbing" },
  "Water Heater":               { labor: "22.301 Water Heating Systems Labor",                 material: "22.302 Water Heating Systems Material",                 div: "22 Plumbing" },
  "Gas Piping":                 { labor: "22.601 Gas Piping Systems Labor",                    material: "22.602 Gas Piping Systems Material",                    div: "22 Plumbing" },
  // Division 23 — HVAC
  "HVAC":                       { labor: "23.201 Air Distribution Systems Labor",              material: "23.202 Air Distribution Systems Material",              div: "23 HVAC" },
  "Mechanical":                 { labor: "23.201 Air Distribution Systems Labor",              material: "23.202 Air Distribution Systems Material",              div: "23 HVAC" },
  "Heating":                    { labor: "23.301 Central Heating Equipment Labor",             material: "23.302 Central Heating Equipment Material",             div: "23 HVAC" },
  "Ventilation":                { labor: "23.501 Ventilation Systems Labor",                   material: "23.502 Ventilation Systems Material",                   div: "23 HVAC" },
  "Mini-Split":                 { labor: "23.401 Cooling Equipment Labor",                     material: "23.402 Cooling Equipment Material",                     div: "23 HVAC" },
  "Radiant Heat":               { labor: "23.301 Central Heating Equipment Labor",             material: "23.302 Central Heating Equipment Material",             div: "23 HVAC" },
  // Division 26 — Electrical
  "Electrical":                 { labor: "26.101 Power Distribution Systems Labor",            material: "26.102 Power Distribution Systems Material",            div: "26 Electrical" },
  "Wiring":                     { labor: "26.201 Wiring and Cabling Labor",                    material: "26.202 Wiring and Cabling Material",                    div: "26 Electrical" },
  "Lighting":                   { labor: "26.301 Lighting Systems Labor",                      material: "26.302 Lighting Systems Material",                      div: "26 Electrical" },
  "Service Upgrade":            { labor: "26.101 Power Distribution Systems Labor",            material: "26.102 Power Distribution Systems Material",            div: "26 Electrical" },
  "Low Voltage":                { labor: "26.601 Electrical Controls and Devices Labor",       material: "26.602 Electrical Controls and Devices Material",       div: "26 Electrical" },
  // Division 31 — Earthwork
  "Excavation":                 { labor: "31.101 Excavation Labor",                            material: "31.102 Excavation Material",                            div: "31 Earthwork" },
  "Grading":                    { labor: "31.401 Rough Grading Labor",                         material: "31.402 Rough Grading Material",                         div: "31 Earthwork" },
  "Earthwork":                  { labor: "31.101 Excavation Labor",                            material: "31.102 Excavation Material",                            div: "31 Earthwork" },
  "Sitework":                   { labor: "31.101 Excavation Labor",                            material: "31.102 Excavation Material",                            div: "31 Earthwork" },
  "Site Work":                  { labor: "31.101 Excavation Labor",                            material: "31.102 Excavation Material",                            div: "31 Earthwork" },
  // Division 32 — Exterior Improvements
  "Landscaping":                { labor: "32.701 Landscaping Labor",                           material: "32.702 Landscaping Material",                           div: "32 Exterior Improvements" },
  "Paving":                     { labor: "32.201 Asphalt Paving Labor",                        material: "32.202 Asphalt Paving Material",                        div: "32 Exterior Improvements" },
  "Driveway":                   { labor: "32.301 Concrete Paving Labor",                       material: "32.302 Concrete Paving Material",                       div: "32 Exterior Improvements" },
  "Fencing":                    { labor: "32.601 Fences and Gates Labor",                      material: "32.602 Fences and Gates Material",                      div: "32 Exterior Improvements" },
  "Outdoor Living":             { labor: "32.901 Athletic and Recreation Surfaces Labor",      material: "32.902 Athletic and Recreation Surfaces Material",      div: "32 Exterior Improvements" },
  "Retaining Wall":             { labor: "31.701 Slope Protection and Retaining Labor",        material: "31.702 Slope Protection and Retaining Material",        div: "31 Earthwork" },
  // Division 33 — Utilities
  "Utilities":                  { labor: "33.101 Water Supply Labor",                          material: "33.102 Water Supply Material",                          div: "33 Utilities" },
  "Water Service":              { labor: "33.101 Water Supply Labor",                          material: "33.102 Water Supply Material",                          div: "33 Utilities" },
  "Sewer":                      { labor: "33.201 Sanitary Sewer Labor",                        material: "33.202 Sanitary Sewer Material",                        div: "33 Utilities" },
  "Septic":                     { labor: "33.201 Sanitary Sewer Labor",                        material: "33.202 Sanitary Sewer Material",                        div: "33 Utilities" },
  "Well":                       { labor: "33.101 Water Supply Labor",                          material: "33.102 Water Supply Material",                          div: "33 Utilities" },
};

// Lookup function — returns {labor, material, div} for a section name
function getBtInfo(name){
  if(BT_MAP[name]) return BT_MAP[name];
  const key = Object.keys(BT_MAP).find(k =>
    name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(name.toLowerCase())
  );
  return key ? BT_MAP[key] : { labor: "1.991 Uncategorized Labor", material: "1.992 Uncategorized Material", div: "01 General Requirements" };
}

// Keep legacy getCsiInfo for any old references
function getCsiInfo(name){
  const bt = getBtInfo(name);
  const divNum = bt.div.split(' ')[0];
  return { csi: divNum + " 00 00", bt: bt.labor.replace(' Labor','') };
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

Use CMB labor rates: Carpenter $85/hr, Project Foreman $100/hr, Project Manager $130/hr.
For each line item calculate:
- hours = estimated labor hours for that qty (e.g. 72 hours to frame 1200 SF at 0.06 hrs/SF)
- laborRate = dollar rate used (85, 100, or 130)
- laborRateType = "Carpenter", "Foreman", or "PM"
- laborUnit = hours/qty x laborRate (labor cost per unit)
- materialUnit = material only cost per unit
- unitCost = laborUnit + materialUnit
- laborTotal = hours x laborRate
- materialTotal = qty x materialUnit
- total = laborTotal + materialTotal
Include 20% O&P in all prices.

Return ONLY this JSON array (4-8 realistic line items):
[{"description":"item name","unit":"SF","qty":1,"hours":0,"laborRate":85,"laborRateType":"Carpenter","laborUnit":0,"materialUnit":0,"unitCost":0,"laborTotal":0,"materialTotal":0,"total":0}]`;

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
    if(appData.davisBacon){
      wsData.push(["*** DAVIS-BACON PREVAILING WAGE PROJECT ***"]);
      wsData.push(["Wage rates per DOL Flathead County, MT determination"]);
      wsData.push([]);
    }
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
    wsData.push(["Item Description", "BT Cost Code", "Division", "Unit", "Qty", "Hours", "Labor Rate", "Rate Type", "Labor $/Unit", "Mat $/Unit", "Total $/Unit", "Labor Total", "Mat Total", "Line Total"]);
    
    // Trade sections
    (est.sections||[]).forEach(section => {
      
      // Section header row
      wsData.push([section.name.toUpperCase(), getBtInfo(section.name).labor.replace(" Labor",""), getBtInfo(section.name).div, "", "", "", "", "", "", "", "", "", "", ""]);
      
      // Line items
      if(section.lineItems && section.lineItems.length){
        section.lineItems.forEach(item => {
          const bt = getBtInfo(section.name);
          if((item.laborTotal||0) > 0){
            wsData.push([
              "  " + (item.description||"") + " — Labor",
              bt.labor, bt.div, "HR",
              item.hours||0, item.hours||0, item.laborRate||85, item.laborRateType||"Carpenter",
              item.laborUnit||0, 0, item.laborUnit||0, item.laborTotal||0, 0, item.laborTotal||0
            ]);
          }
          if((item.materialTotal||0) > 0){
            wsData.push([
              "  " + (item.description||"") + " — Material",
              bt.material, bt.div, item.unit||"LS",
              item.qty||1, 0, 0, "",
              0, item.materialUnit||0, item.materialUnit||0, 0, item.materialTotal||0, item.materialTotal||0
            ]);
          }
        });
      } else {
        // Fallback if line items failed to generate
        const btFb = getBtInfo(section.name);
        wsData.push([
          "  " + section.name,
          btFb.labor, btFb.div, "LS", 1, 0, 0, "", 0, 0, section.low||0, 0, 0, section.low||0
        ]);
      }
      
      // Section total row (14 cols)
      wsData.push(["", "", "", "", "", "", "", "", "", "", "", "", "Section Total:", section.low||0]);
      wsData.push([]); // Blank row
    });
    
    // ── GENERAL CONDITIONS ──
    wsData.push(["GENERAL CONDITIONS (" + (est.gcMonths||3) + " months)"]);
    const gcItems = est.generalConditions?.items || [];
    if(gcItems.length){
      gcItems.forEach(item => {
        wsData.push([
          "  " + (item.name||""),
          "1.101 Project Administration and General Office Labor",
          "01 General Requirements",
          "LS", item.qty||1, 0, 0, "",
          0, 0, item.low||0, 0, 0, item.low||0
        ]);
      });
    }
    wsData.push(["", "", "", "", "", "", "", "", "", "", "", "", "GC Total:", est.gcLow||0]);
    wsData.push([]);
    wsData.push([]);
    
    // ── PROJECT TOTALS ──
    const marginPct = appData.marginPercent || 20;
    const bareSubtotal = est.subtotalLow||0;
    const gcTotal = est.gcLow||0;
    const bareCost = bareSubtotal + gcTotal;
    const marginAmt = Math.round(bareCost * (marginPct / 100));
    wsData.push(["PROJECT TOTALS"]);
    wsData.push(["Construction Subtotal (Labor + Material)", "", "", "", "", "", "", "", "", "", "", "", "", bareSubtotal]);
    wsData.push(["General Conditions", "", "", "", "", "", "", "", "", "", "", "", "", gcTotal]);
    wsData.push(["SUBTOTAL (Bare Cost)", "", "", "", "", "", "", "", "", "", "", "", "", bareCost]);
    wsData.push([`Builder's Margin (${marginPct}%)`, "", "", "", "", "", "", "", "", "", "", "", "", marginAmt]);
    wsData.push(["", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    wsData.push(["TOTAL PROJECT COST", "", "", "", "", "", "", "", "", "", "", "", "", bareCost + marginAmt]);
    wsData.push([]);
    wsData.push(["NOTE: 20% O&P is included in all unit rates above. Builder's Margin shown is the same 20% for reference/adjustment."]);

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    ws['!cols'] = [
      {wch: 42}, // Item Description
      {wch: 38}, // BT Cost Code
      {wch: 32}, // Division
      {wch: 6},  // Unit
      {wch: 6},  // Qty
      {wch: 6},  // Hours
      {wch: 10}, // Labor Rate
      {wch: 12}, // Rate Type
      {wch: 12}, // Labor $/Unit
      {wch: 12}, // Mat $/Unit
      {wch: 12}, // Total $/Unit
      {wch: 12}, // Labor Total
      {wch: 12}, // Mat Total
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

function generateSignedContractPdf(){
  const d = appData;
  const dt = today();
  const clientName = esc(d.clientName||"");
  const clientAddr = `${esc(d.clientAddress||"")}, ${esc(d.clientCity||"")}, Montana ${esc(d.clientZip||"")}`;
  const projectAddr = `${esc(d.projectAddress||"")}, ${esc(d.projectCity||"")}, Montana ${esc(d.clientZip||"")}`;
  const retainer = fmt$(d.retainerAmount||0);
  const filename = (d.clientName||"CMB").replace(/\s+/g,"_") + "_Design-Build_Agreement_" + new Date().toLocaleDateString().replace(/\//g,"-") + ".doc";
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
  const blob = new Blob([html], {type: 'application/msword'});
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
    <div class="company-name">${esc((d.company||"COPPER MOUNTAIN BUILDERS").toUpperCase())}</div>
    <div class="doc-title">CONCEPTUAL DESIGN-BUILD PROPOSAL</div>
    <div class="cover-info"><strong>Client:</strong> ${esc(d.clientName||"")}</div>
    <div class="cover-info"><strong>Project:</strong> ${esc(d.projectAddress||"")}, ${esc(d.projectCity||"")}, MT</div>
    <div class="cover-info"><strong>Date:</strong> ${dt}</div>
    <div class="cover-info"><strong>Prepared by:</strong> ${esc(d.repName||"")}</div>
  </div>
  <h1>Executive Summary / Scope of Work</h1>
  ${est.summary ? est.summary.split('\n').map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('') : '<p>No summary available.</p>'}
  <div class="page-break"></div>
  <h1>Budget Summary</h1>
  <table><thead><tr><th>Project Type</th><th style="text-align:right">Sq Ft</th><th style="text-align:right">Budget Low</th><th style="text-align:right">Budget High</th></tr></thead>
  <tbody>
  ${(est.zones||[]).map(z => `<tr><td>${esc(z.name||appData.zones[0]?.type||"")}</td><td style="text-align:right">${appData.zones[0]?.sqft||""}</td><td style="text-align:right">${fmt$(z.low||0)}</td><td style="text-align:right">${fmt$(z.high||0)}</td></tr>`).join('')}
  <tr style="border-top:2px solid #B87333"><td colspan="2"><strong>Construction Subtotal</strong></td><td style="text-align:right"><strong>${fmt$(est.subtotalLow||0)}</strong></td><td style="text-align:right"><strong>${fmt$(est.subtotalHigh||0)}</strong></td></tr>
  <tr><td colspan="2">General Conditions (${est.gcMonths||3} months)</td><td style="text-align:right">${fmt$(est.gcLow||0)}</td><td style="text-align:right">${fmt$(est.gcHigh||0)}</td></tr>
  <tr class="total-row" style="border-top:2px solid #B87333"><td colspan="2"><strong>TOTAL PROJECT COST</strong></td><td style="text-align:right"><strong>${fmt$(est.totalLow||0)}</strong></td><td style="text-align:right"><strong>${fmt$(est.totalHigh||0)}</strong></td></tr>
  </tbody></table>
  <div class="retainer-box">Design Retainer (Non-Refundable): ${fmt$(d.retainerAmount||0)}</div>
  ${est.siteAnalysis?`<div class="page-break"></div><h1>Site Analysis</h1>${formatAnalysis(est.siteAnalysis)}`:''}
  ${est.complianceAnalysis?`<div class="page-break"></div><h1>Code Compliance & Permitting</h1>${formatAnalysis(est.complianceAnalysis)}`:''}
  ${est.schedule&&est.schedule.milestones&&est.schedule.milestones.length>0?`<div class="page-break"></div><h1>Construction Schedule</h1><p><strong>Total Duration:</strong> ${esc(est.schedule.startToFinish||"TBD")}</p>
  ${(est.schedule.milestones||[]).map(m=>`<div class="milestone"><strong>${esc(m.phase)}</strong> — <em>${esc(m.duration)}</em>${m.notes?`<br>${esc(m.notes)}`:''}</div>`).join('')}`:''}
  <div class="page-break"></div>
  <h1>Cost Breakdown by Trade</h1>
  <table><thead><tr><th>Trade Section</th><th>BT Cost Code</th><th style="text-align:right">Low</th><th style="text-align:right">High</th></tr></thead>
  <tbody>
  ${(est.sections||[]).map(s=>{const bt=getBtInfo(s.name);return`<tr><td>${esc(s.name)}</td><td style="font-size:10pt;color:#666">${esc(bt.labor.replace(' Labor',''))}</td><td style="text-align:right">${fmt$(s.low||0)}</td><td style="text-align:right">${fmt$(s.high||0)}</td></tr>`;}).join('')}
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
    for(let i=0; i<(est.sections||[]).length; i++){
      const section = est.sections[i];
      if(!section.lineItems || section.lineItems.length === 0){
        const z = appData.zones[0];
        const projectSummary = `${z.type||"Project"} ${z.sqft||""}SF`;
        const prompt = `Generate detailed line items for the "${section.name}" section of a Montana construction estimate.
Project: ${projectSummary}. Section total: $${section.low.toLocaleString()}.
BT Cost Code: ${getBtInfo(section.name).labor}
Use CMB rates: Carpenter $85/hr, Foreman $100/hr, PM $130/hr.
For each item: hours=total labor hours, laborRate=85/100/130, laborRateType=Carpenter/Foreman/PM, laborUnit=hours/qty*rate, materialUnit=material cost/unit, unitCost=laborUnit+materialUnit, laborTotal=hours*rate, materialTotal=qty*materialUnit, total=laborTotal+materialTotal. Include 20% O&P.
Return ONLY JSON array (4-6 items):
[{"description":"item","unit":"SF","qty":1,"hours":0,"laborRate":85,"laborRateType":"Carpenter","laborUnit":0,"materialUnit":0,"unitCost":0,"laborTotal":0,"materialTotal":0,"total":0}]`;
        try {
          const res = await fetch("https://billowing-snowflake-38f0.coppermountainbuilders406.workers.dev", {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ model:"claude-haiku-4-5-20251001", max_tokens:1500,
              system:"You are a construction estimator in Flathead Valley Montana. CMB rates: Carpenter $85/hr, Foreman $100/hr, PM $130/hr. Return ONLY valid JSON array. No markdown.",
              messages:[{role:"user", content:prompt}] })
          });
          if(res.ok){
            const data = await res.json();
            let raw = data.content[0].text.replace(/```json/g,"").replace(/```/g,"").trim();
            const start = raw.indexOf("["), end = raw.lastIndexOf("]");
            if(start!==-1 && end!==-1) est.sections[i].lineItems = JSON.parse(raw.slice(start, end+1));
          }
        } catch(e){ console.warn(`Line items failed for ${section.name}:`, e); }
      }
    }
    const wb = XLSX.utils.book_new();
    const wsData = [];
    const z = appData.zones[0];
    wsData.push(["COPPER MOUNTAIN BUILDERS - CONCEPTUAL ESTIMATE"]);
    wsData.push([]);
    if(appData.davisBacon){
      wsData.push(["*** DAVIS-BACON PREVAILING WAGE PROJECT ***"]);
      wsData.push(["Wage rates per DOL Flathead County, MT determination"]);
      wsData.push([]);
    }
    wsData.push(["Client:", d.clientName||""]);
    wsData.push(["Project Address:", `${d.projectAddress||""}, ${d.projectCity||""}, MT`]);
    wsData.push(["Date:", new Date().toLocaleDateString()]);
    wsData.push(["Rep:", d.repName||""]);
    wsData.push(["Total Budget:", `${fmt$(est.totalLow)} - ${fmt$(est.totalHigh)}`]);
    wsData.push([]);
    wsData.push(["PROJECT SUMMARY"]);
    wsData.push(["Project Type","Sq Ft","Budget Low","Budget High","Notes"]);
    wsData.push([z.type||"", z.sqft||"", est.zones[0]?.low||0, est.zones[0]?.high||0, est.zones[0]?.notes||""]);
    wsData.push([]); wsData.push([]);
    wsData.push(["DETAILED COST BREAKDOWN"]); wsData.push([]);
    wsData.push(["Item Description","BT Cost Code","Division","Unit","Qty","Hours","Labor Rate","Rate Type","Labor $/Unit","Mat $/Unit","Total $/Unit","Labor Total","Mat Total","Line Total"]);
    (est.sections||[]).forEach(section => {
      const bt = getBtInfo(section.name);
      wsData.push([section.name.toUpperCase(), bt.labor.replace(" Labor",""), bt.div, "","","","","","","","","","",""]);
      if(section.lineItems && section.lineItems.length){
        section.lineItems.forEach(item => {
          if((item.laborTotal||0) > 0) wsData.push(["  "+(item.description||"")+" — Labor", bt.labor, bt.div, "HR", item.hours||0, item.hours||0, item.laborRate||85, item.laborRateType||"Carpenter", item.laborUnit||0, 0, item.laborUnit||0, item.laborTotal||0, 0, item.laborTotal||0]);
          if((item.materialTotal||0) > 0) wsData.push(["  "+(item.description||"")+" — Material", bt.material, bt.div, item.unit||"LS", item.qty||1, 0, 0, "", 0, item.materialUnit||0, item.materialUnit||0, 0, item.materialTotal||0, item.materialTotal||0]);
        });
      } else {
        wsData.push(["  "+section.name, bt.labor, bt.div, "LS", 1, 0, 0, "", 0, 0, section.low||0, 0, 0, section.low||0]);
      }
      wsData.push(["","","","","","","","","","","","","Section Total:", section.low||0]);
      wsData.push([]);
    });
    wsData.push(["GENERAL CONDITIONS ("+( est.gcMonths||3)+" months)"]);
    wsData.push(["  General Conditions", "1.101 Project Administration and General Office Labor", "01 General Requirements", "LS", 1, 0, 0, "", 0, 0, est.gcLow||0, 0, 0, est.gcLow||0]);
    wsData.push(["","","","","","","","","","","","","GC Total:", est.gcLow||0]);
    wsData.push([]); wsData.push([]);
    const marginPct2 = appData.marginPercent || 20;
    const bareSubtotal2 = est.subtotalLow||0;
    const gcTotal2 = est.gcLow||0;
    const bareCost2 = bareSubtotal2 + gcTotal2;
    const marginAmt2 = Math.round(bareCost2 * (marginPct2 / 100));
    wsData.push(["PROJECT TOTALS"]);
    wsData.push(["Construction Subtotal (Labor + Material)","","","","","","","","","","","","", bareSubtotal2]);
    wsData.push(["General Conditions","","","","","","","","","","","","", gcTotal2]);
    wsData.push(["SUBTOTAL (Bare Cost)","","","","","","","","","","","","", bareCost2]);
    wsData.push([`Builder's Margin (${marginPct2}%)`,"","","","","","","","","","","","", marginAmt2]);
    wsData.push(["","","","","","","","","","","","","",""]);
    wsData.push(["TOTAL PROJECT COST","","","","","","","","","","","","", bareCost2 + marginAmt2]);
    wsData.push([]);
    wsData.push(["NOTE: 20% O&P is included in all unit rates above. Builder's Margin shown is the same 20% for reference/adjustment."]);
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{wch:42},{wch:38},{wch:32},{wch:6},{wch:6},{wch:6},{wch:10},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12}];
    XLSX.utils.book_append_sheet(wb, ws, "Estimate");
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
      <button onclick="closeSyncSuccess()" style="flex:1;padding:14px 24px;background:transparent;border:2px solid var(--stone-light);border-radius:8px;color:var(--stone);font-size:15px;font-weight:600;cursor:pointer;">← Back to Review</button>
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

PART 1 — SCOPE OF WORK (400-600 words for client):
Write so a homeowner with no construction background understands exactly what they're getting. Use "we" for CMB. Five sections with ALL CAPS headers:
YOUR PROJECT — what we saw, what type of work this is
WHAT'S INCLUDED — clear list, simple terms, verbs first (Install, Remove, Build, Replace)
WHAT'S NOT INCLUDED — specific exclusions, decisions client still needs to make
BUDGET CONTEXT — 2-3 sentences on what drives the cost range, Montana factors
GETTING STARTED — next steps (sign agreement, pay retainer, first meeting)
TONE: Kitchen-table conversation. No jargon, no hollow adjectives.

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
    <button class="btn-primary" onclick="goTo(3)">Next: Review →</button>
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
    ${est&&est.summary?`<div class="card">
      <div class="section-title">Scope of Work</div>
      <div style="font-size:13px;color:var(--cream-dk);line-height:1.8;white-space:pre-wrap;">${esc(est.summary)}</div>
    </div>`:""}
    <div class="card" style="margin-top:8px;">
      <div class="section-title">Export & Share</div>
      <button class="btn-secondary" onclick="emailProposal()" style="margin-bottom:8px;">📧 Email Proposal to Client</button>
      <button class="btn-secondary" onclick="exportExcel()" style="margin-bottom:8px;">📊 Download Estimate (Excel)</button>
      <button class="btn-secondary" onclick="generateProposalDocument()" style="margin-bottom:8px;">📄 Download Proposal Document</button>
      <button class="btn-secondary" onclick="fullSave()">🗂 Save Visit to App</button>
      <div style="border-top:1px solid rgba(92,88,80,0.4);margin-top:12px;padding-top:12px;">
        <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--stone-light);margin-bottom:8px;">OneDrive</div>
        <button id="od-connect-btn" class="btn-secondary" style="margin-bottom:8px;width:100%;font-size:13px;" onclick="odSignIn()">☁ Connect OneDrive</button>
        <button class="btn-secondary" style="width:100%;background:rgba(45,106,79,0.15);border:1px solid rgba(45,106,79,0.5);color:#7ec8a4;font-size:13px;" onclick="syncVisitToOneDrive()" id="od-sync-btn">☁ Sync This Visit to OneDrive</button>
        <p style="font-size:11px;color:var(--stone-light);margin-top:6px;line-height:1.5;">Saves visit JSON + proposal + estimate to OneDrive</p>
      </div>
    </div>
    <button class="btn-primary" onclick="goTo(4)">Next: Sign Agreement →</button>
    <button class="btn-secondary" onclick="goTo(2)">← Back</button>
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

    <button class="btn-primary" onclick="window.print();fullSave()">🖨 Print Signed Agreement</button>
    <button class="btn-primary" style="background:linear-gradient(135deg, var(--success), #2d6a4f);box-shadow:0 4px 20px rgba(74,124,89,0.3);" onclick="generateSignedContractPdf()">📄 Download Signed Contract</button>
    ${odAccount ? `<button class="btn-primary" style="background:linear-gradient(135deg, #1a73e8, #4285f4);box-shadow:0 4px 20px rgba(26,115,232,0.3);" onclick="generateSignedContractPdf();setTimeout(syncVisitToOneDrive,500)" id="od-sync-btn-sign">☁ Save & Sync to OneDrive</button>` : ""}
    <button class="btn-secondary" onclick="goTo(3)">← Back to Review</button>
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
  else if(currentStep===4) html = renderSign();
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
