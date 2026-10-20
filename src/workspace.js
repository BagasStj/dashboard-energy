import './workspace.css';

// All additional records are demonstration data, not connected plant telemetry.
const assets = [
  { id:'WND-01', name:'Wind Farm North', type:'Wind', zone:'North field', value:28.4, capacity:32, unit:'MW', health:98, status:'Healthy', service:'28 Sep 2026', note:'Normal vibration and bearing temperature. Next planned inspection: rotor and gearbox.' },
  { id:'WND-02', name:'Wind Farm East', type:'Wind', zone:'East field', value:32.6, capacity:36, unit:'MW', health:96, status:'Healthy', service:'30 Sep 2026', note:'All turbines available. Routine lubrication inspection is scheduled for the end of the month.' },
  { id:'WND-03', name:'Wind Farm West', type:'Wind', zone:'West field', value:27.1, capacity:32, unit:'MW', health:97, status:'Healthy', service:'02 Oct 2026', note:'Generation is within the expected operating range. No open inspection flags.' },
  { id:'SOL-01', name:'Solar Array A', type:'Solar', zone:'South field', value:8.1, capacity:9, unit:'MW', health:94, status:'Healthy', service:'25 Sep 2026', note:'Panel temperature 42°C. Irradiance 820 W/m². Conversion efficiency 94.1%.' },
  { id:'SOL-02', name:'Solar Array B', type:'Solar', zone:'South field', value:28.6, capacity:36, unit:'MW', health:32, status:'Attention', service:'19 Sep 2026', note:'Inverter temperature warning requires inspection. Generation remains online at reduced output; the health score is not conversion efficiency.' },
  { id:'CAP-01', name:'Capture Unit', type:'Capture', zone:'Process hall', value:52.4, capacity:60, unit:'t/h', health:100, status:'Healthy', service:'04 Oct 2026', note:'Capture efficiency is 90%. Daily captured volume is 1,240 tonnes against a 1,500-tonne target.' },
  { id:'CMP-01', name:'Compression Unit', type:'Process', zone:'Process hall', value:72, capacity:90, unit:'bar', health:56, status:'Attention', service:'19 Sep 2026', note:'Elevated bearing vibration requires a mechanical inspection. Pressure is stable at the demonstration snapshot.' },
];
const tasks = [
  { id:'WO-2048', title:'Inspect compressor bearing', asset:'CMP-01', team:'Mechanical', due:'10:30', priority:'High', state:'In progress', description:'Review bearing vibration and lubrication. Record inspection findings before closing the work order.' },
  { id:'WO-2049', title:'Check inverter cooling', asset:'SOL-02', team:'Electrical', due:'11:00', priority:'High', state:'Queued', description:'Inspect cooling fans and filter condition on Solar Array B. Confirm temperature has stabilized.' },
  { id:'WO-2050', title:'Clean panel sampling area', asset:'SOL-01', team:'Field services', due:'13:00', priority:'Normal', state:'Queued', description:'Complete the scheduled sample-area cleaning and record panel surface condition.' },
  { id:'WO-2047', title:'Verify capture sensors', asset:'CAP-01', team:'Instrumentation', due:'08:30', priority:'Normal', state:'Completed', description:'Scheduled verification of capture flow and pressure sensors completed in the demo dataset.' },
];
const alerts = [
  { id:'AL-103', asset:'CMP-01', title:'Bearing vibration above threshold', value:'6.2 mm/s', threshold:'5.0 mm/s', time:'09:12', acknowledged:false },
  { id:'AL-104', asset:'SOL-02', title:'Inverter temperature elevated', value:'78°C', threshold:'75°C', time:'09:24', acknowledged:false },
];
const activity = [{ time:'09:24', text:'Solar Array B temperature alert opened.' },{ time:'09:12', text:'Compression inspection started by Mechanical.' },{ time:'08:30', text:'Capture sensor verification completed.' }];
const reports = [
  { id:1, type:'summary', name:'Plant operating summary', period:'Snapshot', created:'19 Sep 2026 · 10:00', origin:'Reference snapshot' },
  { id:2, type:'assets', name:'Asset condition register', period:'Snapshot', created:'19 Sep 2026 · 10:00', origin:'Demo register' },
  { id:3, type:'generation', name:'Weekly generation review', period:'7', created:'19 Sep 2026 · 10:00', origin:'Sample history' },
];
const reportNames = { summary:'Plant operating summary', assets:'Asset condition register', maintenance:'Maintenance work orders', generation:'Generation analysis' };
let currentView='Assets', assetQuery='', assetType='All', assetStatus='All', assetSort='name', taskFilter='All', period='7', reportQuery='', reportType='All';
const panel = document.querySelector('.view-panel');
const format = (value,digits=1) => Number(value).toLocaleString('en-US',{ maximumFractionDigits:digits });
const esc = value => String(value).replace(/[&<>"']/g, character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const sum = (records,key) => records.reduce((total,item)=>total+item[key],0);
const badge = (text,tone='neutral') => `<span class="status-tag ${tone}">${text}</span>`;
const icon = type => `<span class="asset-symbol ${type.toLowerCase()}" aria-hidden="true">${{Wind:'≋',Solar:'▦',Capture:'◎',Process:'⊙'}[type]}</span>`;
const kpi = (label,value,unit,note,tone='') => `<article class="kpi ${tone}"><p>${label}</p><strong>${value}<small>${unit}</small></strong><span>${note}</span></article>`;
const heading = (title,subtitle,action='') => `<div class="page-heading"><div><p class="breadcrumb">Kinetiq plant <span>/</span> ${currentView}</p><h1>${title}</h1><p class="page-description">${subtitle}</p></div><div class="page-actions"><span class="dataset-label"><i></i> Demo dataset · 19 Sep 2026</span>${action}</div></div>`;
const footer = '<p class="workspace-note">Demonstration workspace · Sample records, not live telemetry. Changes last until you refresh.</p><p class="workspace-feedback" role="status" aria-live="polite"></p>';
function notify(message) { panel.querySelector('.workspace-feedback').textContent=message; }
function showDetail(title,html) {
  const dialog=document.querySelector('#detail-dialog');
  document.querySelector('#dialog-content').innerHTML=`<h2>${title}</h2>${html}<p class="dialog-note">Demo dataset · No live equipment is controlled.</p>`;
  dialog.showModal();
}
function downloadCSV(name,rows) {
  const csv=rows.map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function selectedAssets() {
  return assets.filter(a=>(assetType==='All'||a.type===assetType)&&(assetStatus==='All'||a.status===assetStatus)&&`${a.name} ${a.id} ${a.zone}`.toLowerCase().includes(assetQuery.toLowerCase()))
    .sort((a,b)=>assetSort==='health'?a.health-b.health:a.name.localeCompare(b.name));
}
function assetRows() {
  const list=selectedAssets();
  panel.querySelector('#asset-count').textContent=`${list.length} of ${assets.length} assets`;
  panel.querySelector('#asset-body').innerHTML=list.length?list.map(a=>`<tr><td><div class="asset-name">${icon(a.type)}<div><button class="text-button" data-asset="${a.id}">${a.name}</button><small>${a.id} · ${a.zone}</small></div></div></td><td>${a.type}</td><td>${badge(a.status,a.status==='Healthy'?'good':'warning')}</td><td class="numeric">${format(a.value)} <small>${a.unit}</small></td><td><div class="health-meter"><span style="--health:${a.health}%;--fill:${a.health<60?'#f7a556':'#a6cbdc'}"></span><b>${a.health}%</b></div></td><td>${a.service}</td><td><button class="table-action" data-asset="${a.id}" aria-label="View ${a.name}">Details ↗</button></td></tr>`).join(''):'<tr><td colspan="7"><div class="workspace-empty"><strong>No assets match these filters</strong><p>Try a different name, type, or health status.</p><button class="secondary" data-action="reset-assets">Reset filters</button></div></td></tr>';
}
function renderAssets() {
  panel.innerHTML=heading('Asset management','Monitor generation, health, and the next service across your plant.','<button class="secondary" data-action="export-assets">↓ Export register</button>')+
    `<div class="kpi-grid">${kpi('Registered assets',assets.length,'','5 generation · 2 process','dark')}${kpi('Generating now','124.8','MW','86.1% of 145 MW installed')}${kpi('Healthy assets','5','/ 7','Health score of 80% or higher')}${kpi('Require attention','2','assets','Compression and Solar Array B','warm')}</div>
    <div class="workspace-grid asset-layout"><section class="surface register"><div class="section-heading"><div><h2>Asset register</h2><p>Operating snapshot · 10:00 WIB</p></div><span id="asset-count" class="quiet"></span></div><div class="filter-row"><label class="search-field"><span aria-hidden="true">⌕</span><input id="asset-search" type="search" placeholder="Search assets or ID…" aria-label="Search assets" value="${esc(assetQuery)}"></label><select id="asset-type" aria-label="Asset type">${['All','Wind','Solar','Capture','Process'].map(t=>`<option ${assetType===t?'selected':''} value="${t}">${t==='All'?'All types':t}</option>`).join('')}</select><select id="asset-status" aria-label="Asset health">${['All','Healthy','Attention'].map(t=>`<option ${assetStatus===t?'selected':''} value="${t}">${t==='All'?'All statuses':t}</option>`).join('')}</select><select id="asset-sort" aria-label="Sort assets"><option value="name" ${assetSort==='name'?'selected':''}>Name A–Z</option><option value="health" ${assetSort==='health'?'selected':''}>Health: lowest first</option></select></div><div class="table-scroll" tabindex="0" aria-label="Asset register, scroll horizontally on smaller screens"><table class="data-table"><thead><tr><th scope="col">Asset</th><th scope="col">Type</th><th scope="col">Health status</th><th scope="col">Output / reading</th><th scope="col">Health score</th><th scope="col">Next service</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody id="asset-body"></tbody></table></div><p class="section-footnote">Health score indicates maintenance condition, not generation efficiency.</p></section>
    <aside class="page-sidebar"><section class="surface mix-card"><h2>Generation mix</h2><p class="quiet">Current output by source</p><div class="mix-donut" role="img" aria-label="Wind 88.1 MW, 70.6 percent; solar 36.7 MW, 29.4 percent"><div><strong>124.8</strong><span>MW total</span></div></div><div class="legend-row"><span><i class="legend-dot wind-dot"></i>Wind</span><strong>88.1 MW</strong><small>70.6%</small></div><div class="legend-row"><span><i class="legend-dot solar-dot"></i>Solar</span><strong>36.7 MW</strong><small>29.4%</small></div></section><section class="surface inspection-card"><span class="small-label">SERVICE PRIORITY</span><h2>Two assets to inspect</h2><p>Review flagged equipment before the next maintenance window.</p><button class="inspection-link" data-asset="CMP-01">Compression Unit <span>56% ↗</span></button><button class="inspection-link" data-asset="SOL-02">Solar Array B <span>32% ↗</span></button></section></aside></div>${footer}`;
  assetRows();
}
function renderOperations() {
  const open=tasks.filter(t=>t.state!=='Completed');
  const unacknowledged=alerts.filter(a=>!a.acknowledged).length;
  panel.innerHTML=heading('Plant operations','Prioritize alerts, coordinate maintenance, and follow today’s work.','<button class="secondary" data-action="export-work">↓ Export work orders</button>')+
    `<div class="kpi-grid">${kpi('Open work orders',open.length,'',`${tasks.filter(t=>t.state==='In progress').length} in progress · ${tasks.filter(t=>t.state==='Queued').length} queued`,'dark')}${kpi('Active equipment alerts',alerts.length,'',`${unacknowledged} awaiting acknowledgement`,'warm')}${kpi('Completed today',tasks.filter(t=>t.state==='Completed').length,'',`Of ${tasks.length} scheduled work orders`)}${kpi('Capture target','82.7','%','1,240 of 1,500 tonnes captured')}</div>
    <div class="workspace-grid operations-layout"><div class="page-stack"><section class="surface"><div class="section-heading"><div><h2>Attention required</h2><p>Acknowledgement records review; it does not resolve the fault.</p></div>${badge(`${alerts.length} active`,'warning')}</div><div class="alert-list">${alerts.map(a=>`<article class="alert-item"><span class="alert-mark" aria-hidden="true">!</span><div><div class="alert-title"><h3>${a.title}</h3>${badge(a.acknowledged?'Acknowledged':'Needs review',a.acknowledged?'neutral':'warning')}</div><p>${assets.find(item=>item.id===a.asset).name} · ${a.time} WIB</p><span class="alert-reading">${a.value} <small>Threshold ${a.threshold}</small></span></div><button class="secondary" data-ack="${a.id}" ${a.acknowledged?'disabled':''}>${a.acknowledged?'Reviewed':'Acknowledge'}</button></article>`).join('')}</div></section>
    <section class="surface"><div class="section-heading"><div><h2>Maintenance work orders</h2><p>19 September · Day shift, 07:00–15:00 WIB</p></div></div><div class="filter-pills" aria-label="Work order status">${['All','Queued','In progress','Completed'].map(t=>`<button data-task-filter="${t}" aria-pressed="${taskFilter===t}" class="${taskFilter===t?'selected':''}">${t} <span>${t==='All'?tasks.length:tasks.filter(item=>item.state===t).length}</span></button>`).join('')}</div><div class="table-scroll" tabindex="0" aria-label="Maintenance work orders"><table class="data-table"><thead><tr><th scope="col">Work order</th><th scope="col">Team / due</th><th scope="col">Priority</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead><tbody>${tasks.filter(t=>taskFilter==='All'||t.state===taskFilter).map(t=>`<tr><td><button class="text-button" data-task="${t.id}">${t.title}</button><small>${t.id} · ${t.asset}</small></td><td>${t.team}<small>Today, ${t.due}</small></td><td>${badge(t.priority,t.priority==='High'?'warning':'neutral')}</td><td>${badge(t.state,t.state==='Completed'?'good':t.state==='In progress'?'info':'neutral')}</td><td>${t.state==='Completed'?'<span class="completed-check">✓ Done</span>':`<button class="table-action" data-progress="${t.id}">${t.state==='Queued'?'Start work':'Complete'} →</button>`}</td></tr>`).join('')||'<tr><td colspan="5"><div class="workspace-empty">No work orders in this status.</div></td></tr>'}</tbody></table></div></section></div>
    <aside class="page-sidebar"><section class="surface shift-card"><div class="section-heading"><h2>Shift overview</h2>${badge('Day shift','info')}</div><p class="shift-hours">07:00 <span>to</span> 15:00</p><p class="quiet">Western Indonesia Time · WIB</p><div class="shift-progress"><span></span></div><div class="legend-row"><span>Snapshot at 10:00</span><strong>5h remaining</strong></div><dl class="compact-dl"><dt>Shift lead</dt><dd>Maya Collins</dd><dt>Teams assigned</dt><dd>4 teams</dd><dt>Open high-priority work</dt><dd>${open.filter(t=>t.priority==='High').length} orders</dd></dl></section><section class="surface"><h2>Activity log</h2><ol class="activity-list">${activity.slice(0,6).map(a=>`<li><time>${a.time}</time><p>${a.text}</p></li>`).join('')}</ol></section></aside></div>${footer}`;
}

function generationData(selectedPeriod) {
  function hourlyReadings(dayIndex) {
    return Array.from({length:24},(_,hour)=>{
      const wind=Math.round((73+Math.sin(hour*.6+dayIndex*.3)*12+Math.sin(dayIndex*.8)*5)*10)/10;
      const solar=Math.round(Math.max(0,Math.sin((hour-6)/12*Math.PI))*36.7*(.8+.2*Math.cos(dayIndex*.6))*10)/10;
      const label=`${String(hour).padStart(2,'0')}:00`;
      return {label,short:label,wind,solar,total:Math.round((wind+solar)*10)/10};
    });
  }
  if(selectedPeriod==='day')return hourlyReadings(29);
  const count=Number(selectedPeriod);
  return Array.from({length:count},(_,i)=>{
    const day=new Date(Date.UTC(2026,8,20-count+i));
    const readings=hourlyReadings(30-count+i),wind=Math.round(sum(readings,'wind')*10)/10,solar=Math.round(sum(readings,'solar')*10)/10;
    return {label:day.toISOString().slice(0,10),short:`${day.getUTCDate()} ${day.getUTCMonth()===7?'Aug':'Sep'}`,wind,solar,total:Math.round((wind+solar)*10)/10};
  });
}
function generationChart(data) {
  const maximum=Math.ceil(Math.max(...data.map(d=>d.total))/500)*500;
  const ceiling=period==='day'?150:maximum;
  const x=i=>52+i*700/(data.length-1), y=value=>240-value/ceiling*205;
  const points=key=>data.map((d,i)=>`${x(i)},${y(d[key])}`).join(' ');
  const ticks=[0,.25,.5,.75,1].map(t=>`<line x1="52" y1="${y(t*ceiling)}" x2="752" y2="${y(t*ceiling)}" stroke="#e9eeec"/><text x="40" y="${y(t*ceiling)+4}" text-anchor="end">${format(t*ceiling,0)}</text>`).join('');
  const labels=data.map((d,i)=>i===0||i===data.length-1||i%Math.ceil(data.length/6)===0?`<text x="${x(i)}" y="270" text-anchor="middle">${d.short}</text>`:'').join('');
  return `<svg class="trend-chart" viewBox="0 0 800 290" role="img" aria-label="${period==='day'?'Hourly power in MW':'Daily energy in MWh'} for wind, solar, and total generation. Exact values are in the data table below."><defs><linearGradient id="energy-area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#c3e4f1" stop-opacity=".6"/><stop offset="1" stop-color="#c3e4f1" stop-opacity="0"/></linearGradient></defs>${ticks}<polygon points="52,240 ${points('total')} 752,240" fill="url(#energy-area)"/><polyline points="${points('total')}" stroke="#222c28" stroke-width="2.5" fill="none"/><polyline points="${points('wind')}" stroke="#4689a8" stroke-width="2.5" fill="none"/><polyline points="${points('solar')}" stroke="#c77513" stroke-width="2.5" fill="none"/>${labels}</svg>`;
}
function renderAnalytics() {
  const data=generationData(period), wind=sum(data,'wind'), solar=sum(data,'solar'), energy=wind+solar;
  const peak=Math.max(...data.map(d=>d.total)), peakDay=data.find(d=>d.total===peak), unit=period==='day'?'MW':'MWh', share=wind/energy*100;
  panel.innerHTML=heading('Performance analytics','Explore generation trends and understand where your energy comes from.','<button class="secondary" data-action="export-analytics">↓ Export data</button>')+
    `<div class="analytics-toolbar"><div class="filter-pills" aria-label="Analytics period">${[['day','24 hours'],['7','7 days'],['30','30 days']].map(([value,label])=>`<button data-period="${value}" aria-pressed="${period===value}" class="${period===value?'selected':''}">${label}</button>`).join('')}</div><p>${period==='day'?'19 Sep 2026 · Hourly samples':`${data[0].short} – ${data.at(-1).short} 2026 · Daily totals`} <span>WIB</span></p></div>
    <div class="kpi-grid">${kpi('Energy generated',format(energy,0),'MWh',period==='day'?'Sum of 24 one-hour power samples':`Total across ${period} days`,'dark')}${kpi('Wind contribution',format(wind,0),'MWh',`${share.toFixed(1)}% of generated energy`)}${kpi('Solar contribution',format(solar,0),'MWh',`${(100-share).toFixed(1)}% of generated energy`)}${kpi(period==='day'?'Peak hourly power':'Highest daily generation',format(peak),unit,`${peakDay.short} · Sample data`,'cool')}</div>
    <div class="workspace-grid analytics-layout"><section class="surface generation-surface"><div class="section-heading"><div><h2>${period==='day'?'Generation profile':'Generation trend'}</h2><p>${period==='day'?'Power output (MW)':'Energy generated (MWh)'}</p></div><div class="chart-legend"><span><i class="legend-dot total-dot"></i>Total</span><span><i class="legend-dot wind-dot"></i>Wind</span><span><i class="legend-dot solar-dot"></i>Solar</span></div></div>${generationChart(data)}<div class="chart-summary"><span>Peak: <b>${format(peak)} ${unit}</b></span><span>Average: <b>${format(energy/data.length)} ${unit}${period==='day'?'':' / day'}</b></span><span>Source: <b>Demo history</b></span></div></section>
    <section class="surface energy-breakdown"><h2>Energy by source</h2><p class="quiet">Share of selected period</p><div class="mix-donut" style="--wind-share:${share}%" role="img" aria-label="Wind ${share.toFixed(1)} percent, solar ${(100-share).toFixed(1)} percent"><div><strong>${share.toFixed(1)}<small>%</small></strong><span>from wind</span></div></div><div class="legend-row"><span><i class="legend-dot wind-dot"></i>Wind</span><strong>${format(wind,0)} MWh</strong></div><div class="legend-row"><span><i class="legend-dot solar-dot"></i>Solar</span><strong>${format(solar,0)} MWh</strong></div><p class="section-footnote">${period==='day'?'One-hour samples are summed to calculate daily energy.':'Daily totals are summed across the selected date range.'}</p></section></div>
    <div class="workspace-grid analysis-bottom"><section class="surface"><div class="section-heading"><div><h2>Period insights</h2><p>Calculated from the displayed dataset</p></div></div><div class="insight-grid"><article><span class="insight-number">01</span><h3>Wind leads the mix</h3><p>Wind supplies ${share.toFixed(1)}% of period energy, with ${format(wind/data.length)} ${unit} per ${period==='day'?'hourly sample':'day'} on average.</p></article><article><span class="insight-number">02</span><h3>Highest generation</h3><p>${peakDay.short} records ${format(peak)} ${unit}, ${((peak/(energy/data.length)-1)*100).toFixed(1)}% above the period average.</p></article><article><span class="insight-number">03</span><h3>Snapshot vs. history</h3><p>Overview shows current power. This page shows sample historical data, which is separate from that snapshot.</p></article></div></section></div>
    <details class="surface data-disclosure"><summary>View source data <span>${data.length} records · ${unit}</span></summary><div class="table-scroll" tabindex="0" aria-label="Generation source data"><table class="data-table"><thead><tr><th scope="col">${period==='day'?'Hour (WIB)':'Date'}</th><th scope="col">Wind (${unit})</th><th scope="col">Solar (${unit})</th><th scope="col">Total (${unit})</th></tr></thead><tbody>${data.map(d=>`<tr><td>${d.label}</td><td>${format(d.wind)}</td><td>${format(d.solar)}</td><td>${format(d.total)}</td></tr>`).join('')}</tbody></table></div></details>${footer}`;
}
function reportRows(report) {
  if(report.type==='assets') return [['Asset ID','Asset','Type','Health status','Reading','Unit','Health score (%)','Next service','Source'],...assets.map(a=>[a.id,a.name,a.type,a.status,a.value,a.unit,a.health,a.service,'Demo'])];
  if(report.type==='maintenance') return [['Work order','Description','Asset','Team','Due WIB','Priority','Status','Source'],...tasks.map(t=>[t.id,t.title,t.asset,t.team,t.due,t.priority,t.state,'Demo'])];
  if(report.type==='generation') { const p=report.period==='Snapshot'?'7':report.period,unit=p==='day'?'MW':'MWh';return [['Date / hour (WIB)',`Wind (${unit})`,`Solar (${unit})`,`Total (${unit})`,'Source'],...generationData(p).map(d=>[d.label,d.wind,d.solar,d.total,'Demo'])]; }
  return [['Metric','Value','Unit','Source'],['Total generation',124.8,'MW','Demo'],['Plant efficiency',94.1,'%','Demo'],['Capture rate',52.4,'t/h','Demo'],['Capture efficiency',90,'%','Demo'],['Captured',1240,'t','Demo'],['Daily target',1500,'t','Demo'],['Uptime',99.1,'%','Demo']];
}
function reportList() {
  const list=reports.filter(r=>(reportType==='All'||r.type===reportType)&&`${r.name} ${r.id}`.toLowerCase().includes(reportQuery.toLowerCase()));
  panel.querySelector('#report-count').textContent=`${list.length} reports`;
  panel.querySelector('#report-body').innerHTML=list.map(r=>`<tr><td><div class="report-name"><span class="document-icon" aria-hidden="true">▤</span><div><button class="text-button" data-preview="${r.id}">${r.name}</button><small>RPT-${String(r.id).padStart(3,'0')} · ${r.origin}</small></div></div></td><td>${r.period==='Snapshot'?'Snapshot':r.period==='day'?'24 hours':r.period+' days'}</td><td>${r.created}</td><td>${badge('Ready','good')}</td><td><div class="row-actions"><button class="table-action" data-preview="${r.id}">Preview</button><button class="table-action" data-download="${r.id}" aria-label="Download ${r.name}">↓ CSV</button></div></td></tr>`).join('')||'<tr><td colspan="5"><div class="workspace-empty"><strong>No reports found</strong><p>Try another report name or category.</p><button class="secondary" data-action="reset-reports">Reset filters</button></div></td></tr>';
}
function renderReports() {
  panel.innerHTML=heading('Reports & exports','Prepare, preview, and download clear reports for your next review.','<button class="secondary" id="download-report" data-action="quick-summary">↓ Download summary CSV</button>')+
    `<div class="kpi-grid">${kpi('Available reports',reports.length,'','Ready to preview or download','dark')}${kpi('Report templates','4','','Operations, assets, work, generation')}${kpi('Export format','CSV','','Opens in Excel and Google Sheets')}${kpi('Data source','Demo','','Reference snapshot & sample history','cool')}</div>
    <div class="workspace-grid reports-layout"><section class="surface report-library"><div class="section-heading"><div><h2>Report library</h2><p>Prepared snapshots for this demo workspace</p></div><span id="report-count" class="quiet"></span></div><div class="filter-row"><label class="search-field"><span aria-hidden="true">⌕</span><input type="search" id="report-search" placeholder="Find a report…" aria-label="Search reports" value="${esc(reportQuery)}"></label><select id="report-type" aria-label="Filter report type"><option value="All">All report types</option>${Object.entries(reportNames).map(([value,label])=>`<option value="${value}" ${reportType===value?'selected':''}>${label}</option>`).join('')}</select></div><div class="table-scroll" tabindex="0" aria-label="Report library"><table class="data-table"><thead><tr><th scope="col">Report</th><th scope="col">Period</th><th scope="col">Created</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead><tbody id="report-body"></tbody></table></div><p class="section-footnote">Generated reports capture the current demo state. Downloads include a data-source column.</p></section>
    <aside class="surface report-builder"><span class="small-label">REPORT BUILDER</span><h2>Create a report</h2><p class="quiet">Choose the data you want to review.</p><form id="report-form"><label>Report type<select name="type" id="builder-type">${Object.entries(reportNames).map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></label><label>Period<select name="period" id="builder-period" disabled><option value="Snapshot">Current snapshot</option></select></label><div class="builder-info"><span aria-hidden="true">ⓘ</span><p id="builder-description">Generation, efficiency, capture rate, and daily target from the reference snapshot.</p></div><button class="primary" type="submit">Generate report <span>↗</span></button></form><p class="section-footnote">Prepared locally in your browser. No email or external delivery.</p></aside></div>
    <section class="surface report-guide"><h2>A report for every review</h2><div class="report-template-grid">${[['summary','Daily handover','Generation, capture, and uptime in one operating snapshot.'],['assets','Asset review','Condition scores, readings, and next service dates for every asset.'],['maintenance','Maintenance briefing','Work order ownership, priorities, and current completion status.'],['generation','Performance review','Wind and solar history with exact values behind every chart.']].map(([type,title,description])=>`<button class="report-template" data-template="${type}"><span class="document-icon" aria-hidden="true">▤</span><h3>${title}</h3><p>${description}</p><span class="template-action">Use template ↗</span></button>`).join('')}</div></section>${footer}`;
  reportList();
}
function updateBuilder(type) {
  panel.querySelector('#builder-type').value=type;
  const select=panel.querySelector('#builder-period');select.disabled=type!=='generation';
  select.innerHTML=type==='generation'?'<option value="day">24 hours</option><option value="7" selected>7 days</option><option value="30">30 days</option>':'<option value="Snapshot">Current snapshot</option>';
  panel.querySelector('#builder-description').textContent={summary:'Generation, efficiency, capture rate, and daily target from the reference snapshot.',assets:'All seven assets with operating readings, condition scores, and next service dates.',maintenance:'All work orders, including changes made during this browser session.',generation:'Wind and solar sample history for the selected period, with units and timestamps.'}[type];
}
export function renderWorkspace(view) {
  currentView=view;
  ({Assets:renderAssets,Operations:renderOperations,Analytics:renderAnalytics,Reports:renderReports})[view]();
  panel.scrollTop=0;
}

panel.addEventListener('input',event=>{
  if(event.target.id==='asset-search'){assetQuery=event.target.value;assetRows();}
  if(event.target.id==='report-search'){reportQuery=event.target.value;reportList();}
});
panel.addEventListener('change',event=>{
  const {id,value}=event.target;
  if(id==='asset-type')assetType=value;
  if(id==='asset-status')assetStatus=value;
  if(id==='asset-sort')assetSort=value;
  if(['asset-type','asset-status','asset-sort'].includes(id))assetRows();
  if(id==='report-type'){reportType=value;reportList();}
  if(id==='builder-type')updateBuilder(value);
});
panel.addEventListener('submit',event=>{
  if(event.target.id!=='report-form')return;
  event.preventDefault();
  const form=new FormData(event.target),type=form.get('type'),selectedPeriod=type==='generation'?form.get('period'):'Snapshot';
  if(!Object.hasOwn(reportNames,type)||!['Snapshot','day','7','30'].includes(selectedPeriod))return;
  const id=reports.length+1;
  reports.unshift({id,type,name:reportNames[type],period:selectedPeriod,created:'This session',origin:'Generated locally',rows:reportRows({type,period:selectedPeriod})});
  reportQuery='';reportType='All';renderReports();notify(`${reportNames[type]} is ready. Preview or download it from the library.`);
});
panel.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  const {asset,ack,task,progress,taskFilter:filter,period:selectedPeriod,preview,download,template,action}=button.dataset;
  if(asset){const a=assets.find(item=>item.id===asset);showDetail(a.name,`<p>${a.note}</p><dl><dt>Asset ID</dt><dd>${a.id}</dd><dt>Location</dt><dd>${a.zone}</dd><dt>Reading</dt><dd>${a.value} ${a.unit}</dd><dt>Rated capacity</dt><dd>${a.capacity} ${a.unit}</dd><dt>Health score</dt><dd>${a.health}%</dd><dt>Next service</dt><dd>${a.service}</dd></dl>`);}
  if(ack){const a=alerts.find(item=>item.id===ack);a.acknowledged=true;activity.unshift({time:'Session',text:`${a.id} acknowledged for review. Equipment fault remains active.`});renderOperations();notify('Alert acknowledged in this demo session. The equipment warning remains active.');}
  if(task){const t=tasks.find(item=>item.id===task);showDetail(t.title,`<p>${t.description}</p><dl><dt>Work order</dt><dd>${t.id}</dd><dt>Asset</dt><dd>${t.asset}</dd><dt>Assigned team</dt><dd>${t.team}</dd><dt>Due today</dt><dd>${t.due} WIB</dd><dt>Priority</dt><dd>${t.priority}</dd><dt>Status</dt><dd>${t.state}</dd></dl>`);}
  if(progress){const t=tasks.find(item=>item.id===progress);t.state=t.state==='Queued'?'In progress':'Completed';activity.unshift({time:'Session',text:`${t.id}: ${t.title} ${t.state==='Completed'?'completed':'started'}.`});renderOperations();notify(`${t.id} is now ${t.state.toLowerCase()}. Demo update only.`);}
  if(filter){taskFilter=filter;renderOperations();}
  if(selectedPeriod){period=selectedPeriod;renderAnalytics();}
  if(preview){const r=reports.find(item=>item.id===Number(preview)),rows=r.rows||reportRows(r);showDetail(r.name,`<p>${r.period==='Snapshot'?'Current snapshot':r.period==='day'?'24 hours':r.period+' days'} · ${rows.length-1} records · CSV</p><div class="table-scroll report-preview" tabindex="0" aria-label="Report preview"><table class="data-table"><thead><tr>${rows[0].map(v=>`<th scope="col">${esc(v)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1,7).map(row=>`<tr>${row.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="dialog-note">Preview of the first ${Math.min(6,rows.length-1)} records. The CSV includes all ${rows.length-1} records.</p>`);}
  if(download){const r=reports.find(item=>item.id===Number(download));downloadCSV(`kinetiq-${r.type}-${r.id}.csv`,r.rows||reportRows(r));notify(`${r.name} downloaded.`);}
  if(template){updateBuilder(template);panel.querySelector('#report-form').scrollIntoView({block:'center'});panel.querySelector('#builder-type').focus();}
  if(action==='export-assets'){const list=selectedAssets();downloadCSV('kinetiq-asset-register.csv',[['Asset ID','Asset','Type','Health status','Reading','Unit','Health score (%)','Source'],...list.map(a=>[a.id,a.name,a.type,a.status,a.value,a.unit,a.health,'Demo'])]);notify(`Exported ${list.length} filtered assets.`);}
  if(action==='export-work'){downloadCSV('kinetiq-work-orders.csv',reportRows({type:'maintenance'}));notify('Work orders exported with their current demo status.');}
  if(action==='export-analytics'){downloadCSV(`kinetiq-generation-${period}.csv`,reportRows({type:'generation',period}));notify('Generation data exported for the selected period.');}
  if(action==='quick-summary')downloadCSV('kinetiq-demo-summary.csv',reportRows({type:'summary'}));
  if(action==='reset-assets'){assetQuery='';assetType='All';assetStatus='All';assetSort='name';renderAssets();}
  if(action==='reset-reports'){reportQuery='';reportType='All';renderReports();}
});
