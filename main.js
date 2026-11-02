import { templates } from './mascot-templates.js';
const $ = s => document.querySelector(s);
const stage = $('.stage'), user = $('#user-art'), bot = $('#bot-art');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
user.innerHTML = templates.user;
user.querySelector('svg').setAttribute('viewBox', '110 75 555 395');
let step = -1;
let drawBot = () => {};
const captions = ['Ready.', 'Reading files…', 'Writing…', 'Complete.'];
const questionText = 'What can “Please read this for me” do for my files?';
const typed = $('#typed-question');
const status = ['READY', 'READING', 'WRITING', 'DONE'];
function installBot(kind) {
  bot.innerHTML = templates[kind];
  bot.querySelector('svg').setAttribute('viewBox', {thinking:'18 26 926 926',idle:'0 0 1000 1000',typing:'182 34 434 434',reading:'177 -24 1086 1086'}[kind]);
  const get = id => bot.querySelector(id);
  if (kind === 'idle') {
    drawBot = t => get('#seated-body').setAttribute('transform', `rotate(${4.5*Math.sin(t/5200*Math.PI*2)} 500 880)`);
  } else if (kind === 'typing') {
    const poses = [[-18,16],[-13,10],[-3,0],[10,-13],[16,-18],[10,-13],[0,-3],[-13,10]];
    function arm(length, angle) {
      const r = angle*Math.PI/180;
      const point = (d,b=0) => `${Math.round((284+Math.cos(r)*d-Math.sin(r)*b)/4)*4} ${Math.round((239+Math.sin(r)*d+Math.cos(r)*b)/4)*4}`;
      return `M284 239 L${point(length*.49,4)} L${point(length-12)} L${point(length)} l8 4`;
    }
    drawBot = t => {const [a,b]=poses[Math.floor(t/37)%8];get('#far-arm').setAttribute('d',arm(147,a+5));get('#near-arm').setAttribute('d',arm(154,b+2));};
  } else if(kind==='thinking'){
 const bentLeg=get('#bent-leg'),foot=get('#foot');
 const hip={x:625,y:590},toe={x:590,y:867};
function pose(lift){
 // Foot pivots on its grounded toe; upper/lower leg lengths remain constant.
 const angle=(-28-lift*24)*Math.PI/180;
 const ankle={x:toe.x+34*Math.cos(angle),y:toe.y+34*Math.sin(angle)};
 const dx=ankle.x-hip.x,dy=ankle.y-hip.y,d=Math.hypot(dx,dy);
 const length=150, offset=Math.sqrt(Math.max(0,length*length-d*d/4));
 const knee={x:(hip.x+ankle.x)/2+dy/d*offset,y:(hip.y+ankle.y)/2-dx/d*offset};
 bentLeg.setAttribute('d',`M${hip.x} ${hip.y} L${knee.x} ${knee.y} L${ankle.x} ${ankle.y}`);
 // A solid shoe, like the supporting foot. Its toe remains the pivot.
 const shoePoint=(along,height)=>`${toe.x+along*Math.cos(angle)+height*Math.sin(angle)} ${toe.y+along*Math.sin(angle)-height*Math.cos(angle)}`;
 foot.setAttribute('d',`M${shoePoint(0,0)} L${shoePoint(60,0)} L${shoePoint(60,14)} L${shoePoint(38,22)} L${shoePoint(7,14)} Z`);
 return {hip,knee,ankle,toe};
}

 drawBot=t=>pose((1-Math.cos(t/420*Math.PI*2))/2);

  } else {
    function page(p) {
      const theta=p*Math.PI,dx=200*Math.cos(theta),lift=145*Math.sin(theta),curve=36*Math.sin(theta);
      const top={x:640+dx,y:450+28*Math.cos(theta)-lift},edge={x:735+dx,y:570+28*Math.cos(theta)-lift};
      return {edge,d:`M640 450 Q${640+dx*.55} ${450-lift*.8-curve} ${top.x} ${top.y} L${edge.x} ${edge.y} Q${735+dx*.55} ${570-lift*.8-curve} 735 570Z`};
    }
    drawBot = t => {
      const phase=((t/.7)%320)/320,p=Math.min(phase/.78,1),sheet=page(p);
      get('#page').setAttribute('d',sheet.d);get('#page-trail').setAttribute('d',page(Math.max(0,p-.12)).d);
      let hand=sheet.edge;
      if(phase>.78){const u=(phase-.78)/.22,right=page(0).edge;hand={x:hand.x+(right.x-hand.x)*u,y:hand.y+(right.y-hand.y)*u-35*Math.sin(u*Math.PI)};}
      get('#turning-arm').setAttribute('d',`M977 365 Q935 ${hand.y-28} ${hand.x+14} ${hand.y-8} L${hand.x} ${hand.y}`);
    };
  }
  drawBot(0);
}

const track=$('.scroll-track'), sticky=$('.demo-sticky');
let paused=false, pending=0, lastProgress=0, manual=false;
const clamp=x=>Math.max(0,Math.min(1,x));
// Illustrative public product-guide excerpts. No user documents or API calls.
const trace=[
 ['MODEL','Preparing next step','thinking','Find the product overview and supported document workflows.',3.5],
 ['glob','Matching files','thinking','README.md\nfeatures.txt\nguide.pdf\nnotes.docx\noverview.pptx\ndiagram.png\nscan.jpg\nscreenshot.webp\nexample.py\napp.ts\nsettings.json\nconfig.yaml',.3],
 ['MODEL','Preparing next step','thinking','Search the guide for supported features and data handling.',2.4],
 ['rg','Searching text','reading','README.md:3:Connect a folder and ask questions about its documents.\nfeatures.txt:6:Read text directly; prepare PDFs and images.\nREADME.md:3:Model calls may send content to OpenAI.',.1],
 ['MODEL','Preparing next step','thinking','Read the relevant passages before answering.',2.1],
 ['sed','Reading lines','reading',"$ sed -n '3,8p' README.md features.txt\n\nConnect a folder and ask questions about its documents.\nAnswers include sources you can inspect.\nRead text files directly. Prepare PDFs and images when needed.\nEnable semantic search for selected documents.\nApp data is stored locally. Model calls may send content to OpenAI.\nUse your own OpenAI API key; API charges are separate.",.2],
 ['MODEL','Writing answer','typing','Summarizing supported features with saved evidence.',3.1],
 ['RUN','Completed','idle','Answer complete. Sources attached.',.1]
];
const logs=$('.logs');
trace.forEach(([kind,caption,,output],i)=>{
 const row=document.createElement('li');row.dataset.log=String(i);
 const button=document.createElement('button');button.className='log-toggle';button.setAttribute('aria-expanded','false');
 for(const [cls,text] of [['step-arrow','›'],['step-number',String(i+1).padStart(2,'0')],['step-kind',kind],['step-caption',caption],['log-mark',''],['log-duration','—']]){const el=document.createElement('span');el.className=cls;el.textContent=text;button.append(el);}
 const detail=document.createElement('pre');detail.className='log-detail';detail.hidden=true;detail.textContent='Command output\n\n'+output;row.append(button,detail);logs.append(row);
});
let currentEvent=-2,currentPose='';
function renderTrace(progress){
 const event=progress<.25?-1:progress<.70?Math.min(5,Math.floor((progress-.25)/.45*6)):progress<.875?6:7;
 if(event!==currentEvent){
  currentEvent=event;
  document.querySelectorAll('[data-log]').forEach((row,i)=>{
   const done=i<event||event===7,active=i===event&&!done;
   row.hidden=i>event;row.classList.toggle('complete',done);row.classList.toggle('active',active);
   const mark=row.querySelector('.log-mark');mark.replaceChildren();mark.classList.toggle('pixel-spinner',active);mark.setAttribute('aria-label',done?'Completed':'In progress');
   if(done)mark.textContent='[DONE]';else if(active)for(let n=0;n<8;n++)mark.append(document.createElement('i'));
   row.querySelector('.log-duration').textContent=done?trace[i][4].toFixed(1)+'s':'…';
   const open=(i===event&&(i===1||i===3||i===5))||(i===5&&event>=6);
   row.querySelector('.log-detail').hidden=!open;row.querySelector('button').setAttribute('aria-expanded',String(open));
  });
  const pose=event<0?'idle':trace[event][2];
  if(pose!==currentPose){currentPose=pose;installBot(pose);}
 }
 if(event>=0&&event<7){const start=event<6?.25+event*.075:.70,span=event<6?.075:.175;document.querySelectorAll('.log-duration')[event].textContent=(clamp((progress-start)/span)*trace[event][4]).toFixed(1)+'s';}
}
let selectedSource=1;
function source(open,id=selectedSource){
 selectedSource=id;
 $('#demo-source').hidden=!open;
 for(const [button,n] of [[$('#citation'),1],[$('#citation-two'),2]])button.setAttribute('aria-expanded',String(open&&n===id));
 $('#sources-toggle').setAttribute('aria-expanded',String(open));
 const card=$('#demo-source');
 card.querySelector('.source-title').textContent=id===1?'README.md':'features.txt';
 card.querySelector('.source-meta').textContent=(id===1?'Original text · lines 3–5':'Original text · lines 6–8')+'\nSaved with this answer';
 card.querySelector('.source-text').textContent=id===1?'Connect a folder and ask questions about its documents.\nAnswers include sources you can inspect.\nApp data is stored locally; model calls may send content to OpenAI.':'Read text files directly.\nPrepare PDFs and images when needed.\nEnable semantic search for selected documents.';
 card.querySelectorAll('[data-source]').forEach(b=>b.setAttribute('aria-expanded',String(Number(b.dataset.source)===id)));
}
function render(progress,force=false){
 const next=progress<.25?0:progress<.70?1:progress<.875?2:3;
 if(force||next!==step){
  step=next;stage.dataset.step=String(step);
  $('#step-caption').textContent=captions[step];$('#terminal-status').textContent=status[step];
  $('#chat-state').textContent=['Ready','Reading documents','Writing an answer','Answer complete'][step];
  $('#question').hidden=step===0;$('#demo-answer').hidden=step<3;$('#answer-actions').hidden=step<3;
  document.querySelectorAll('button[data-step]').forEach(b=>{if(Number(b.dataset.step)===step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  source(false);
 }
 renderTrace(progress);
 const local=progress*4-step;
 typed.textContent=step===0?questionText.slice(0,reduced.matches?questionText.length:Math.ceil(local*questionText.length)): 'Ask about your documents';
 stage.classList.toggle('is-typing',step===0&&!reduced.matches&&!paused);
}
let centerOffset=0;
function layoutDemo(){
 const fileList = $('.folder-file-list .files');
 $('.folder-file-list').style.setProperty('--file-scrollbar', Math.max(0,fileList.offsetWidth-fileList.clientWidth)+'px');
 centerOffset=Math.max(4,(innerHeight-sticky.offsetHeight)/2);
 sticky.style.top=`${centerOffset}px`;
 const lines=$('.folder-branches'),panel=$('.app-folders').getBoundingClientRect(),anchor=$('.folder-rail').getBoundingClientRect();
 lines.replaceChildren();
 if(panel.width&&panel.height){
  lines.setAttribute('viewBox',`0 0 ${panel.width} ${panel.height}`);
  for(const row of document.querySelectorAll('.folder-file-list .files>span')){
   const rect=row.getBoundingClientRect(),x1=anchor.left-panel.left+56,y1=anchor.top-panel.top+28,x2=rect.left-panel.left-6,y=rect.top-panel.top+rect.height/2;
   const clip=$('.files').getBoundingClientRect();
   if(x2<=x1||rect.top+rect.height/2<clip.top||rect.top+rect.height/2>clip.bottom)continue;
   const mid=(x1+x2)/2,path=document.createElementNS('http://www.w3.org/2000/svg','path');
   path.setAttribute('d',`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y}, ${x2} ${y}`);lines.append(path);
   for(const [cx,cy] of [[x1,y1],[x2,y]]){const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');dot.setAttribute('cx',cx);dot.setAttribute('cy',cy);dot.setAttribute('r','2');lines.append(dot);}
  }
 }


}
function progressFromScroll(){const r=track.getBoundingClientRect();return clamp((centerOffset-r.top)/Math.max(1,track.offsetHeight-sticky.offsetHeight));}
// Time drives character poses; scrolling controls only the story stage.
let motionTimer=0,visible=false,motionTime=0,lastTick=0;
function syncMotion(){
 clearTimeout(motionTimer);motionTimer=0;lastTick=0;
 document.body.classList.toggle('demo-offscreen',!visible||document.hidden);
 if(!visible||document.hidden||paused||reduced.matches)return;
 const tick=()=>{
  const now=performance.now();motionTime+=lastTick?Math.min(100,now-lastTick):0;lastTick=now;
  drawBot(motionTime);
  const pose=[[0,0],[-3,5],[-1,9],[0,4]][Math.floor(motionTime/220)%4];
  user.querySelector('#typing-arm').setAttribute('transform',`rotate(${step===0?pose[0]:0} 355 250)`);
  user.querySelector('#tapping-foot').setAttribute('transform',`rotate(${pose[1]} 519 403)`);
  motionTimer=setTimeout(tick,40);
 };
 tick();
}
new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;syncMotion();},{threshold:0}).observe(stage);

function update(){pending=0;if(paused||document.hidden||manual)return;lastProgress=progressFromScroll();render(lastProgress);renderEvidenceScroll();}
function schedule(){if(!pending&&!document.hidden)pending=requestAnimationFrame(update);}
window.addEventListener('scroll',()=>{manual=false;schedule();},{passive:true});window.addEventListener('resize',()=>{layoutDemo();layoutEvidence();schedule();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(pending);pending=0;}else schedule();syncMotion();});
reduced.addEventListener('change',()=>{render(lastProgress,true);syncMotion();});
document.querySelectorAll('button[data-step]').forEach(b=>b.addEventListener('click',()=>{manual=true;lastProgress=[.12,.60,.78,.94][Number(b.dataset.step)];const top=scrollY+track.getBoundingClientRect().top-centerOffset+Math.max(0,track.offsetHeight-sticky.offsetHeight)*lastProgress;window.scrollTo({top,behavior:'instant'});render(lastProgress,true);}));
$('#citation').addEventListener('click',()=>source($('#demo-source').hidden||selectedSource!==1,1));
$('#citation-two').addEventListener('click',()=>source($('#demo-source').hidden||selectedSource!==2,2));
document.querySelectorAll('[data-source]').forEach(b=>b.addEventListener('click',()=>source(true,Number(b.dataset.source))));
const evidenceTrack=$('.evidence-track'),evidencePanel=$('.evidence');
let evidenceTop=0,evidencePhase=-1;
function layoutEvidence(){evidenceTop=Math.max(8,(innerHeight-evidencePanel.offsetHeight)/2);evidencePanel.style.top=`${evidenceTop}px`;}
function evidence(open,id=0){
 $('#evidence-preview').hidden=!open;$('#evidence-toggle').setAttribute('aria-expanded',String(open));
 $('#evidence-card').hidden=!open||!id;
 document.querySelectorAll('[data-evidence]').forEach(b=>b.setAttribute('aria-expanded',String(open&&Number(b.dataset.evidence)===id)));
 if(id){const card=$('#evidence-card');card.querySelector('.source-title').textContent=id===1?'README.md':'features.txt';card.querySelector('.source-meta').textContent=(id===1?'Original text · lines 3–5':'Original text · lines 6–8')+'\nSaved with this answer';card.querySelector('.source-text').textContent=id===1?'Connect a folder and ask questions about its documents.\nAnswers include sources you can inspect.\nApp data is stored locally; model calls may send content to OpenAI.':'Read text files directly.\nPrepare PDFs and images when needed.\nEnable semantic search for selected documents.';}
}
function renderEvidenceScroll(){
 const progress=clamp((evidenceTop-evidenceTrack.getBoundingClientRect().top)/Math.max(1,evidenceTrack.offsetHeight-evidencePanel.offsetHeight));
 const phase=progress<.18?0:progress<.42?1:progress<.70?2:3;
 if(phase!==evidencePhase){evidencePhase=phase;evidence(phase>0,phase>1?phase-1:0);}
 const pointer=$('#source-pointer');pointer.hidden=reduced.matches||progress<=0||progress>=.98;
 const parent=$('.source-example').getBoundingClientRect();
 const point=selector=>{const box=$(selector).getBoundingClientRect();return {x:box.left-parent.left+box.width*.65,y:box.top-parent.top+box.height*.55};};
 const view=point('#evidence-toggle');
 let from={x:parent.width*.8,y:25},to=view,t=clamp(progress/.14);
 if(progress>=.18&&progress<.42){from=view;to=point('[data-evidence="1"]');t=clamp((progress-.25)/.13);}
 else if(progress>=.42&&progress<.70){from=point('[data-evidence="1"]');to=point('[data-evidence="2"]');t=clamp((progress-.52)/.14);}
 else if(progress>=.70){from=to=point('[data-evidence="2"]');t=1;}
 const ease=t*t*(3-2*t),x=from.x+(to.x-from.x)*ease,y=from.y+(to.y-from.y)*ease;
 const threshold=[0,.18,.42,.70][phase],click=phase>0?clamp((progress-threshold)/.045):1;
 pointer.style.left='0px';pointer.style.top='0px';
 pointer.style.transform=`translate(${x}px,${y}px) scale(${click<.3?.85:1})`;
 const ring=$('#source-click-ring');ring.hidden=pointer.hidden||phase===0||click>=1;
 ring.style.transform=`translate(${x}px,${y}px) scale(${.45+click*.8})`;ring.style.opacity=String(1-click);
 document.querySelectorAll('.source-example .demo-pressed').forEach(el=>el.classList.remove('demo-pressed'));
 if(phase>0&&click<.4)(phase===1?$('#evidence-toggle'):$(`[data-evidence="${phase-1}"]`)).classList.add('demo-pressed');

}
$('#evidence-toggle').addEventListener('click',()=>{evidence($('#evidence-preview').hidden);$('#source-pointer').hidden=true;$('#source-click-ring').hidden=true;});
$('#evidence-close').addEventListener('click',()=>evidence(true));
document.querySelectorAll('[data-evidence]').forEach(b=>b.addEventListener('click',()=>{evidence(true,Number(b.dataset.evidence));$('#source-pointer').hidden=true;$('#source-click-ring').hidden=true;}));
$('.files').addEventListener('scroll',layoutDemo,{passive:true});
$('#sources-toggle').addEventListener('click',()=>source($('#demo-source').hidden));$('#source-close').addEventListener('click',()=>source(false));
document.querySelectorAll('.log-toggle').forEach(b=>b.addEventListener('click',()=>{const output=b.nextElementSibling;output.hidden=!output.hidden;b.setAttribute('aria-expanded',String(!output.hidden));}));
$('#process-toggle').addEventListener('click',()=>{const row=$('[data-log="5"] .log-toggle');row.click();$('.terminal').scrollIntoView({block:'nearest',behavior:'auto'});});
$('#motion-toggle').addEventListener('click',()=>{paused=!paused;$('#motion-toggle').textContent=paused?'Resume motion':'Pause motion';$('#motion-toggle').setAttribute('aria-pressed',String(paused));document.body.classList.toggle('motion-paused',paused);if(paused)stage.classList.remove('is-typing');else schedule();syncMotion();});
// Approved poses replace the ambiguous newly drawn walking/pointing figures.
// Static first frame only, without duplicated SVG clip identifiers.
$('#hero-user').innerHTML='<svg viewBox="110 75 555 395" aria-hidden="true"><image href="assets/character-user-typing-sheet-v7.png" width="1536" height="1024"/></svg>';
installBot('reading');drawBot(110);const reader=bot.firstElementChild.cloneNode(true);reader.querySelectorAll('[id]').forEach(e=>{e.id='source-'+e.id;});
reader.querySelectorAll('*').forEach(e=>{for(const a of [...e.attributes]){let value=a.value.replaceAll('url(#','url(#source-');if((a.name==='href'||a.name==='xlink:href')&&value.startsWith('#'))value='#source-'+value.slice(1);if(value!==a.value)e.setAttribute(a.name,value);}});$('#source-reader').append(reader);
render(0,true);layoutDemo();layoutEvidence();schedule();


const footerMascot = document.querySelector('#footer-mascot');
footerMascot.innerHTML = templates.idle.replaceAll('id="', 'id="footer-').replaceAll('url(#', 'url(#footer-');
let footerVisible = false;
const syncFooterMotion = () => footerMascot.classList.toggle('is-visible', footerVisible && !document.hidden);
new IntersectionObserver(([entry]) => { footerVisible = entry.isIntersecting; syncFooterMotion(); }).observe(footerMascot);
document.addEventListener('visibilitychange', syncFooterMotion);


const preparationChecks = [...document.querySelectorAll('.demo-prepare-check')];
const preparationAll = document.querySelector('#demo-prepare-all');
function updatePreparationSelection() {
 const selected = preparationChecks.filter(input => input.checked).length;
 document.querySelector('#demo-prepare-count').textContent = `${selected} / ${preparationChecks.length}`;
 preparationAll.checked = selected === preparationChecks.length;
 preparationAll.indeterminate = selected > 0 && selected < preparationChecks.length;
}
preparationAll.addEventListener('change', () => {
 preparationChecks.forEach(input => { input.checked = preparationAll.checked; });
 updatePreparationSelection();
});
preparationChecks.forEach(input => input.addEventListener('change', updatePreparationSelection));
document.querySelector('.demo-folder-path').addEventListener('toggle', layoutDemo);
