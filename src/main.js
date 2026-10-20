import './style.css';
import { createPlant } from './scene.js';
import { renderWorkspace } from './workspace.js';

let plant;
try { plant=createPlant(document.querySelector('#scene')); }
catch(error){document.querySelector('#scene').innerHTML='<p class="scene-status">3D view unavailable. Enable WebGL and reload this page.</p>';console.error(error);}

const bubbles=[[10,63,10],[18,97,8],[28,95,7],[35,81,6],[43,41,15],[53,84,10],[66,88,6],[70,103,19],[80,47,8],[92,53,6],[107,121,10],[119,67,12],[135,52,14],[144,69,12],[150,37,25],[151,102,17],[154,122,7],[163,61,6],[172,104,9],[178,86,10],[186,105,20],[195,123,8],[205,134,8],[213,106,6],[236,102,9],[246,104,7],[236,28,6],[241,40,5],[262,17,6]];
document.querySelector('#bubble-chart').innerHTML=`<svg viewBox="0 0 280 150">${bubbles.map(([x,y,r],i)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${i%3===0?'#ff922f':'#fbd63c'}" opacity=".72"/>`).join('')}</svg>`;
document.querySelector('#gauge').innerHTML=Array.from({length:57},(_,i)=>{
  const a=Math.PI+i*Math.PI/56,x=150+139*Math.cos(a),y=157+139*Math.sin(a),x2=150+119*Math.cos(a),y2=157+119*Math.sin(a);
  return `<path d="M${x} ${y}L${x2} ${y2}" stroke="white" stroke-width="2.5" opacity="${i<51?.94:.3}"/><circle cx="${150+109*Math.cos(a)}" cy="${157+109*Math.sin(a)}" r="1" fill="white" opacity=".55"/>`;
}).join('');
document.querySelector('#performance-bars').innerHTML=Array.from({length:46},(_,i)=>`<i style="height:${25+(i*31%57)+Math.sin(i)*12}%;opacity:${i>39?.45:1}"></i>`).join('');

const forecast=[['Tuesday','Clear','☀',7.8,820],['Wednesday','Thunderstorms','⛈',8.6,640],['Thursday','Cloudy','⛅',10.2,410],['Friday','Cloudy','☁',10.2,410],['Saturday','Clear','☀',7.2,860],['Sunday','Partly cloudy','⛅',6.8,720],['Monday','Clear','☀',7.1,840]];
function renderWeather(days){
  document.querySelector('#weather-rows').innerHTML=Array.from({length:days},(_,i)=>{const [day,condition,icon,wind,irr]=forecast[i%7];return `<div class="weather-row"><div class="weather-condition"><span class="weather-icon ${condition==='Cloudy'||condition==='Thunderstorms'?'cloud':''}" aria-hidden="true">${icon}</span><p>${day}${i>6?' <small>Next week</small>':''}<small>${condition}</small></p></div><span class="wind"><i>${i%3===0?'↗':i%3===1?'→':'↘'}</i> ${wind.toFixed(1)} m/s</span><span class="irradiance">${irr} W/m²</span></div>`;}).join('');
}
renderWeather(7);
document.querySelectorAll('[data-days]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-days]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});renderWeather(Number(button.dataset.days));
}));
document.querySelector('#rotate').addEventListener('click',()=>plant?.toggleCamera());
document.querySelector('#expand').addEventListener('click',event=>{
  const expanded=document.querySelector('#dashboard').classList.toggle('expanded');event.currentTarget.setAttribute('aria-pressed',String(expanded));event.currentTarget.setAttribute('aria-label',expanded?'Restore dashboard':'Expand plant view');
});
const dialog=document.querySelector('#detail-dialog');
const details={
  solar:['Solar Array A','<p>Solar generation is online. The array is operating at 94.1% efficiency.</p><dl><dt>Current output</dt><dd>8.1 MW</dd><dt>Panel temperature</dt><dd>42°C</dd><dt>Irradiance</dt><dd>820 W/m²</dd><dt>Status</dt><dd>Online</dd></dl>'],
  capture:['Capture Rate','<p>Current capture rate is 52.4 tonnes per hour, up 14.2% compared with the previous period. The chart shows the reference day’s capture distribution from 06:00 to 18:00.</p>'],
  performance:['Capture Performance','<dl><dt>Capture efficiency</dt><dd>90%</dd><dt>Captured today</dt><dd>1,240 t</dd><dt>Daily target</dt><dd>1,500 t</dd><dt>Remaining to target</dt><dd>260 t</dd><dt>Uptime</dt><dd>99.1%</dd></dl>'],
  health:['System Health','<p>Two systems require attention in this demonstration.</p><dl><dt>Capture Unit</dt><dd>100% · Healthy</dd><dt>Compression</dt><dd>56% · Inspect</dd><dt>Solar Array</dt><dd>32% · Inspect</dd></dl>'],
  weather:['Weather Forecast','<p>Select 3, 7, or 14 days to change the forecast period. Scroll inside the forecast to see all days.</p><p>Weather values are sample data based on the supplied design, not a live forecast.</p>'],
  notifications:['Notifications','<p>2 systems require attention.</p><dl><dt>Compression</dt><dd>Inspection required</dd><dt>Solar Array</dt><dd>Inspection required</dd></dl>'],
  profile:['Maya Collins','<p>Operations Manager</p><p>This demonstration profile reproduces the supplied mockup. No account is connected.</p>'],
  settings:['Scene settings',()=>`<label class="setting">Animate wind turbines<input id="animate" type="checkbox" ${plant&&!plant.paused?'checked':''}></label><label class="setting">Rotation speed<input id="speed" type="range" min="0.25" max="2" step="0.25" value="${rotationSpeed}" aria-label="Rotation speed"></label><p>Animation respects your system’s reduced-motion preference.</p>`]
};
let rotationSpeed=1;
document.querySelectorAll('[data-dialog]').forEach(button=>button.addEventListener('click',()=>{
  const [title,content]=details[button.dataset.dialog];document.querySelector('#dialog-content').innerHTML=`<h2>${title}</h2>${typeof content==='function'?content():content}<p class="dialog-note">Kinetiq demo · Reference data, not live telemetry</p>`;dialog.showModal();
  document.querySelector('#animate')?.addEventListener('change',e=>plant?.setPaused(!e.target.checked));
  document.querySelector('#speed')?.addEventListener('input',e=>{rotationSpeed=Number(e.target.value);plant?.setSpeed(rotationSpeed);});
}));
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{
  const view=button.dataset.view;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b===button);if(b===button)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  document.querySelector('#dashboard').classList.remove('expanded');document.querySelector('#expand').setAttribute('aria-pressed','false');document.querySelector('#expand').setAttribute('aria-label','Expand plant view');
  const panel=document.querySelector('.view-panel');panel.hidden=view==='Overview';document.querySelector('.metrics').hidden=view!=='Overview';
  document.querySelector('#dashboard').classList.toggle('workspace-mode',view!=='Overview');
  document.title=`Kinetiq · ${view}`;
  if(view!=='Overview')renderWorkspace(view);
  const entering=view==='Overview'?[document.querySelector('.plant'),document.querySelector('.metrics')]:[panel];
  document.querySelectorAll('.plant,.metrics,.view-panel').forEach(element=>element.getAnimations().forEach(animation=>animation.cancel()));
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)entering.forEach(element=>element.animate(
    [{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],
    {duration:320,easing:'cubic-bezier(.2,.8,.2,1)'}
  ));
}));
document.querySelector('.brand').addEventListener('click',()=>document.querySelector('[data-view="Overview"]').click());
