let contracts = structuredClone(SAMPLE_CONTRACTS);
let draftAssets = [asset("Chiller",2,"Quarterly","Roof Plantroom"), asset("Air Handling Unit",8,"Quarterly","Levels 1-4"), asset("BMS / Controls",1,"Quarterly","Control Room")];
let currentContract = null;
let proposalMode = "customer";

const $ = (id) => document.getElementById(id);
const money = (v) => Number(v || 0).toLocaleString("en-AU", { style:"currency", currency:"AUD", maximumFractionDigits:0 });
const pct = (v) => `${Number(v || 0).toFixed(1)}%`;
const today = () => new Date("2026-06-24T09:00:00+10:00");
const endDate = (start, months) => { const d = new Date(start); d.setMonth(d.getMonth() + Number(months)); return d; };
const daysUntil = (date) => Math.ceil((date - today()) / 86400000);

function visitsFromFrequency(freq, fallback){
  const f = String(freq || "").toLowerCase();
  if(f.includes("month")) return 12;
  if(f.includes("quarter")) return 4;
  if(f.includes("six")) return 2;
  if(f.includes("annual")) return 1;
  return fallback || 4;
}

function calculateContract(c){
  const rows = c.assets.map(a => {
    const rule = COSTING_RULES[a.type] || COSTING_RULES["Split System"];
    const visits = visitsFromFrequency(a.frequency, rule.visits);
    const labour = a.quantity * rule.labourHours * visits * FINANCIAL_RULES.labourRate;
    const materials = a.quantity * rule.materials * visits;
    const vehicle = visits * FINANCIAL_RULES.vehiclePerVisit;
    const direct = labour + materials + vehicle;
    const overhead = direct * FINANCIAL_RULES.overheadPercent;
    const admin = direct * FINANCIAL_RULES.adminPercent;
    const contingency = direct * FINANCIAL_RULES.contingencyPercent;
    const projectedCost = direct + overhead + admin + contingency;
    return { ...a, visits, labour, materials, vehicle, overhead, admin, contingency, projectedCost, risk: rule.risk };
  });
  const projectedCost = rows.reduce((s,r)=>s+r.projectedCost,0);
  const annualValue = projectedCost / (1 - (Number(c.targetMargin || 35) / 100));
  const profit = annualValue - projectedCost;
  const monthly = annualValue / 12;
  const margin = annualValue ? profit / annualValue * 100 : 0;
  return { rows, projectedCost, annualValue, profit, monthly, margin };
}

function setView(view){
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  $(view).classList.add("active");
  const titles = { dashboard:"Maintenance Proposal Platform", contracts:"Maintenance Contracts Generated", "new-contract":"New Contract Set Up", proposal:"Proposal Generator", settings:"Costing Rules" };
  $("page-title").textContent = titles[view];
  if(view === "proposal") renderProposal();
}

function renderDashboard(){
  const calcs = contracts.map(c => ({ c, calc: calculateContract(c), expiry: endDate(c.startDate, c.term) }));
  const active = calcs.filter(x=>x.c.status === "Active");
  $("activeContracts").textContent = active.length;
  $("totalValue").textContent = money(active.reduce((s,x)=>s+x.calc.annualValue,0));
  $("mrr").textContent = money(active.reduce((s,x)=>s+x.calc.monthly,0));
  $("pipelineValue").textContent = money(calcs.filter(x=>x.c.status !== "Active").reduce((s,x)=>s+x.calc.annualValue,0));
  $("exp30").textContent = active.filter(x=>daysUntil(x.expiry) <= 30 && daysUntil(x.expiry) >= 0).length;
  $("exp60").textContent = active.filter(x=>daysUntil(x.expiry) <= 60 && daysUntil(x.expiry) >= 0).length;
  $("exp90").textContent = active.filter(x=>daysUntil(x.expiry) <= 90 && daysUntil(x.expiry) >= 0).length;

  const max = Math.max(...calcs.map(x=>x.calc.annualValue));
  $("forecastBars").innerHTML = calcs.map(x => `<div class="bar-row"><span>${x.c.customerName}</span><div><i style="width:${Math.max(8, x.calc.annualValue/max*100)}%"></i></div><strong>${money(x.calc.annualValue)}</strong></div>`).join("");
  $("attentionList").innerHTML = calcs.filter(x=>x.c.status !== "Active").map(x => `<button class="attention-card" onclick="openContract('${x.c.id}')"><strong>${x.c.customerName}</strong><span>${x.c.status} · ${money(x.calc.annualValue)} · ${pct(x.calc.margin)} margin</span></button>`).join("") || `<p class="muted">No outstanding contracts.</p>`;
}

function renderContracts(){
  $("contractsTable").innerHTML = contracts.map(c => {
    const calc = calculateContract(c); const expiry = endDate(c.startDate, c.term);
    return `<tr><td><strong>${c.customerName}</strong><br><span>${c.siteAddress}</span></td><td><span class="status ${c.status.toLowerCase()}">${c.status}</span></td><td>${money(calc.annualValue)}</td><td>${money(calc.projectedCost)}</td><td>${money(calc.profit)}</td><td>${pct(calc.margin)}</td><td>${expiry.toLocaleDateString("en-AU")}</td><td><button class="ghost-btn small-btn" onclick="openContract('${c.id}')">Open</button></td></tr>`;
  }).join("");
  if(!currentContract) openContract(contracts[0].id, false);
}

function openContract(id, switchView=true){
  currentContract = contracts.find(c => c.id === id);
  const calc = calculateContract(currentContract);
  $("contractDetail").innerHTML = `<div class="panel-head"><div><span class="section-chip">${currentContract.id}</span><h2>${currentContract.customerName}</h2><p class="muted">Internal cost and profitability breakdown.</p></div><button class="primary-btn" onclick="proposalMode='internal'; setView('proposal')">View Proposal</button></div>
  <div class="kpi-grid mini"><div class="kpi"><span>Projected annual cost</span><strong>${money(calc.projectedCost)}</strong></div><div class="kpi"><span>Charge to customer</span><strong>${money(calc.annualValue)}</strong></div><div class="kpi"><span>Projected profit</span><strong>${money(calc.profit)}</strong></div><div class="kpi"><span>Gross margin</span><strong>${pct(calc.margin)}</strong></div></div>
  <div class="table-wrap"><table><thead><tr><th>Asset</th><th>Qty</th><th>Visits</th><th>Labour</th><th>Materials</th><th>Overheads/Admin</th><th>Projected cost</th></tr></thead><tbody>${calc.rows.map(r=>`<tr><td>${r.type}<br><span>${r.location}</span></td><td>${r.quantity}</td><td>${r.visits}</td><td>${money(r.labour)}</td><td>${money(r.materials)}</td><td>${money(r.overhead + r.admin + r.contingency)}</td><td>${money(r.projectedCost)}</td></tr>`).join("")}</tbody></table></div>`;
  if(switchView) setView("contracts");
}

function renderAssetDraft(){
  $("draftAssets").innerHTML = draftAssets.map((a,i)=>`<tr><td>${a.type}</td><td>${a.quantity}</td><td>${a.frequency}</td><td>${a.location}</td><td><button class="ghost-btn small-btn" onclick="removeDraftAsset(${i})">Remove</button></td></tr>`).join("");
}
function removeDraftAsset(i){ draftAssets.splice(i,1); renderAssetDraft(); }

function createContractFromForm(){
  const c = { id: `PMA-${26000 + contracts.length + 1}`, customerName: $("customerName").value, siteAddress: $("siteAddress").value, contactPerson: $("contactPerson").value, email: $("email").value, phone: $("phone").value, startDate: $("startDate").value, term: Number($("term").value), targetMargin: Number($("targetMargin").value), status: "Draft", assets: structuredClone(draftAssets) };
  contracts.unshift(c); currentContract = c; proposalMode = "customer"; renderAll(); setView("proposal");
}

function renderProposal(){
  const c = currentContract || contracts[0]; currentContract = c;
  const calc = calculateContract(c);
  const highRisk = calc.rows.filter(r=>r.risk === "High");
  const months = serviceCalendar(calc.rows);
  const internal = proposalMode === "internal";
  $("proposalOutput").innerHTML = `
  <article class="proposal-page cover"><div class="proposal-brand"><div class="logo-mark">P</div><div><strong>Paramount Airconditioning</strong><span>Comfort Engineered for Australia</span></div></div><div class="cover-title"><span class="section-chip">Prepared for</span><h1>Preventative Maintenance Proposal</h1><h2>${c.customerName}</h2><p>${c.siteAddress}</p></div><div class="cover-summary"><div><span>Annual value</span><strong>${money(calc.annualValue)}</strong></div><div><span>Term</span><strong>${c.term} months</strong></div><div><span>Prepared</span><strong>${today().toLocaleDateString("en-AU")}</strong></div></div></article>
  ${internal ? internalPage(c, calc) : ""}
  <article class="proposal-page"><span class="section-chip">01</span><h1>Executive summary</h1><p>Paramount Airconditioning proposes a structured preventative maintenance program for ${c.customerName}. The program is designed to maintain asset reliability, support efficient operation and reduce the risk of unplanned failure across critical heating, cooling and air-quality systems.</p><p>The proposed maintenance schedule covers ${c.assets.reduce((s,a)=>s+a.quantity,0)} listed assets across ${[...new Set(c.assets.map(a=>a.type))].length} asset categories. Service frequencies have been allocated based on equipment type, operating impact and practical site attendance requirements.</p></article>
  <article class="proposal-page"><span class="section-chip">02</span><h1>Why Paramount</h1><div class="feature-grid"><div><strong>Commercial HVAC focus</strong><p>Maintenance planning for commercial, industrial and technical environments.</p></div><div><strong>Practical reporting</strong><p>Clear service reports that identify work completed, defects and recommended actions.</p></div><div><strong>Structured delivery</strong><p>Routine visits planned against the asset schedule and site requirements.</p></div><div><strong>Risk-led maintenance</strong><p>Priority attention for chillers, cooling towers, controls and other higher-impact systems.</p></div></div></article>
  <article class="proposal-page"><span class="section-chip">03</span><h1>Asset schedule</h1>${assetSchedule(calc.rows)}</article>
  <article class="proposal-page"><span class="section-chip">04</span><h1>Maintenance methodology</h1>${methodology(calc.rows)}</article>
  <article class="proposal-page"><span class="section-chip">05</span><h1>Annual service calendar</h1><div class="calendar-grid">${months.map(m=>`<div><strong>${m.month}</strong><p>${m.items.join("<br>") || "No scheduled routine visit"}</p></div>`).join("")}</div></article>
  <article class="proposal-page"><span class="section-chip">06</span><h1>Risk assessment</h1><p>The following assets have been identified as higher operational impact items due to equipment type or site function.</p>${highRisk.length ? assetSchedule(highRisk) : `<p>No high-risk assets identified in this uploaded register.</p>`}<p>Where defects are identified during routine maintenance, Paramount will provide recommendations and separate quotations for corrective works.</p></article>
  <article class="proposal-page"><span class="section-chip">07</span><h1>Commercial summary</h1><table><tbody><tr><th>Preventative maintenance annual value</th><td>${money(calc.annualValue)} + GST</td></tr><tr><th>Monthly recurring value</th><td>${money(calc.monthly)} + GST</td></tr><tr><th>Contract term</th><td>${c.term} months</td></tr><tr><th>Commencement date</th><td>${new Date(c.startDate).toLocaleDateString("en-AU")}</td></tr></tbody></table><p class="muted">Reactive works, quoted repairs and after-hours attendance are excluded unless agreed in writing.</p></article>
  <article class="proposal-page"><span class="section-chip">08</span><h1>Acceptance</h1><p>By signing below, both parties acknowledge acceptance of the preventative maintenance proposal and associated commercial summary.</p><div class="signature-grid"><div><h3>Client acceptance</h3><p>Name: _________________________</p><p>Position: ______________________</p><p>Signature: _____________________</p><p>Date: __________________________</p></div><div><h3>Paramount Airconditioning</h3><p>Name: _________________________</p><p>Position: ______________________</p><p>Signature: _____________________</p><p>Date: __________________________</p></div></div></article>`;
}

function internalPage(c, calc){
  return `<article class="proposal-page internal"><span class="section-chip">Internal only</span><h1>Profitability review</h1><div class="kpi-grid mini"><div class="kpi"><span>Projected cost</span><strong>${money(calc.projectedCost)}</strong></div><div class="kpi"><span>Sell price</span><strong>${money(calc.annualValue)}</strong></div><div class="kpi"><span>Profit</span><strong>${money(calc.profit)}</strong></div><div class="kpi"><span>Margin</span><strong>${pct(calc.margin)}</strong></div></div>${assetSchedule(calc.rows, true)}</article>`;
}

function assetSchedule(rows, costs=false){
  return `<table><thead><tr><th>Asset type</th><th>Qty</th><th>Frequency</th><th>Location</th><th>Risk</th>${costs?"<th>Projected cost</th>":""}</tr></thead><tbody>${rows.map(r=>`<tr><td>${r.type}</td><td>${r.quantity}</td><td>${r.frequency}</td><td>${r.location}</td><td>${r.risk || "Standard"}</td>${costs?`<td>${money(r.projectedCost)}</td>`:""}</tr>`).join("")}</tbody></table>`;
}

function methodology(rows){
  const types = [...new Set(rows.map(r=>r.type))];
  const copy = {
    "Chiller":["Inspect compressor operation and safety controls.","Check operating pressures and temperatures.","Review condenser condition and refrigerant circuit performance."],
    "Cooling Tower":["Inspect fan assembly, drift eliminators and water distribution.","Review basin condition and access requirements.","Check operation for signs of vibration, noise or fouling."],
    "Air Handling Unit":["Inspect filters, coils, fan assemblies and drive components.","Check motor operation and electrical components.","Review condensate drain and general casing condition."],
    "Package Unit":["Check refrigeration operation, electrical controls and airflow.","Inspect condenser and evaporator coil condition.","Confirm thermostat and safety device operation."],
    "Split System":["Inspect indoor and outdoor unit condition.","Check drain operation, filters and general performance.","Verify controller operation and operating temperatures."],
    "Exhaust Fan":["Inspect fan operation, fixings and electrical controls.","Check noise, vibration and general condition.","Report visible access or airflow issues."],
    "BMS / Controls":["Review controller operation, alarms and schedules.","Check sensor readings and control sequencing.","Report abnormal trends or operational issues."]
  };
  return types.map(t=>`<div class="method"><h3>${t}</h3><ul>${(copy[t] || ["Inspect operation and report condition.","Verify controls and service access.","Identify defects and recommended corrective works."]).map(i=>`<li>${i}</li>`).join("")}</ul></div>`).join("");
}

function serviceCalendar(rows){
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return names.map((m,idx)=>({ month:m, items: rows.filter(r => r.visits === 12 || (r.visits === 4 && [0,3,6,9].includes(idx)) || (r.visits === 2 && [0,6].includes(idx)) || (r.visits === 1 && idx===0)).map(r=>`${r.type} × ${r.quantity}`) }));
}

function renderRules(){
  $("assetType").innerHTML = Object.keys(COSTING_RULES).map(t=>`<option>${t}</option>`).join("");
  $("rulesGrid").innerHTML = Object.entries(COSTING_RULES).map(([k,r])=>`<div class="rule-card"><h3>${k}</h3><p><strong>${r.labourHours}</strong> hrs / visit</p><p><strong>${r.visits}</strong> default visits</p><p><strong>${money(r.materials)}</strong> materials / visit</p><p><span class="status ${r.risk.toLowerCase()}">${r.risk} risk</span></p></div>`).join("");
}

function parseCSV(text){
  const lines = text.trim().split(/\r?\n/); const headers = lines.shift().split(',').map(h=>h.trim());
  return lines.map(line=>{ const cells = line.split(',').map(c=>c.trim()); return Object.fromEntries(headers.map((h,i)=>[h,cells[i] || ""])); });
}
function readFile(file, cb){ const reader = new FileReader(); reader.onload = e => cb(e.target.result); reader.readAsText(file); }
function downloadCSV(name, rows){
  const headers = Object.keys(rows[0]); const body = [headers.join(','), ...rows.map(r=>headers.map(h=>r[h]).join(','))].join('\n');
  downloadFile(name, body, 'text/csv');
}
function downloadFile(name, content, type){ const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], {type})); a.download = name; a.click(); URL.revokeObjectURL(a.href); }
function downloadProposal(){ downloadFile(`${(currentContract.customerName||'proposal').replaceAll(' ','-')}-proposal.html`, `<!doctype html><html><head><meta charset="utf-8"><title>${currentContract.customerName}</title><link rel="stylesheet" href="styles.css"></head><body>${$("proposalOutput").outerHTML}</body></html>`, 'text/html'); }

function renderAll(){ renderDashboard(); renderContracts(); renderAssetDraft(); renderRules(); }

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-view], [data-view-button]').forEach(el => el.addEventListener('click', () => setView(el.dataset.view || el.dataset.viewButton)));
  $('loadSampleBtn').onclick = () => { contracts = structuredClone(SAMPLE_CONTRACTS); currentContract = contracts[0]; renderAll(); };
  $('addAssetBtn').onclick = () => { draftAssets.push(asset($('assetType').value, $('assetQty').value, $('assetFreq').value, $('assetLocation').value)); renderAssetDraft(); };
  $('generateContractBtn').onclick = createContractFromForm;
  $('showInternalBtn').onclick = () => { proposalMode = 'internal'; renderProposal(); };
  $('showCustomerBtn').onclick = () => { proposalMode = 'customer'; renderProposal(); };
  $('printBtn').onclick = () => window.print();
  $('downloadHtmlBtn').onclick = downloadProposal;
  $('downloadCustomerTemplate').onclick = () => downloadCSV('Paramount_Customer_Template.csv', [{"Customer Name":"Southbank Data Hall","Site Address":"81 Riverside Drive Southbank VIC","Contact Person":"Operations Lead","Email":"ops@example.com","Phone":"03 9000 1111","Contract Term Months":"36","Target Margin %":"38"}]);
  $('downloadAssetTemplate').onclick = () => downloadCSV('Paramount_Asset_Template.csv', [{"Asset Type":"Chiller","Quantity":"2","Frequency":"Quarterly","Location":"Roof Plantroom"},{"Asset Type":"Air Handling Unit","Quantity":"8","Frequency":"Quarterly","Location":"Levels 1-4"}]);
  $('customerFile').onchange = e => readFile(e.target.files[0], text => { const r = parseCSV(text)[0]; if(!r) return; $('customerName').value = r['Customer Name'] || r.customerName || ''; $('siteAddress').value = r['Site Address'] || ''; $('contactPerson').value = r['Contact Person'] || ''; $('email').value = r.Email || ''; $('phone').value = r.Phone || ''; $('term').value = r['Contract Term Months'] || r['Contract Term (Months)'] || 12; $('targetMargin').value = r['Target Margin %'] || 35; });
  $('assetFile').onchange = e => readFile(e.target.files[0], text => { draftAssets = parseCSV(text).map(r => asset(r['Asset Type'], r.Quantity || r.Qty || 1, r.Frequency || 'Quarterly', r.Location || 'Site')); renderAssetDraft(); });
  currentContract = contracts[0]; renderAll();
});
