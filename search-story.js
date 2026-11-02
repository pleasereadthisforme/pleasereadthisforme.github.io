const $=s=>document.querySelector(s);
const track=$('.search-story'),panel=$('.search-sticky'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const clamp=x=>Math.max(0,Math.min(1,x));let top=0,frame=0;
const ns='http://www.w3.org/2000/svg',points=[];
// Seeded irregular cloud: illustrative projection, not measured embeddings.
let seed=8137;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return (seed+.5)/4294967296;}
function normal(){return Math.sqrt(-2*Math.log(random()))*Math.cos(2*Math.PI*random());}
for(let i=0;i<144;i++){
 const group=i<102?1:i%3,cx=[210,440,615][group],cy=[95,130,115][group];
 const x=Math.max(35,Math.min(760,cx+normal()*[85,105,65][group]));
 const y=Math.max(28,Math.min(210,cy+normal()*[36,35,43][group]));
 const circle=document.createElementNS(ns,'circle');circle.setAttribute('cx',x);circle.setAttribute('cy',y);circle.setAttribute('r',2);circle.setAttribute('fill','#71776e');$('#vector-points').append(circle);points.push({x,y,circle,group,near:false});
}
// Illustrative results distributed across a 2D projection; screen distance is not similarity.
for(const [x,y] of [[220,85],[335,185],[455,60],[560,165],[650,85]]){
 const point=points.filter(p=>!p.near).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
 point.near=true;
}
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const candidates=points.filter(p=>p.near);
const links=Array.from({length:6},()=>{const path=document.createElementNS(ns,'path');path.setAttribute('fill','none');$('#vector-links').append(path);return path;});
const excerptLink=document.createElementNS(ns,'path');
excerptLink.setAttribute('fill','none');excerptLink.setAttribute('stroke','#b3b8ab');excerptLink.setAttribute('stroke-dasharray','2 5');
$('#vector-map').append(excerptLink);
const scanExtent=Math.max(...points.map(p=>Math.hypot(p.x-400,p.y-130)))+35;
function layout(){top=Math.max(8,(innerHeight-panel.offsetHeight)/2);panel.style.top=`${top}px`;}
const first='$ glob **/*\nREADME.md   features.txt   guide.pdf\n\n$ rg "exact wording"\nNo relevant match.\n\n$ rg "wording|phrase|remember"\nThe available passages do not yet answer the question.\n\n[ GAP ] Try meaning-based candidates in enabled files.';
const final='$ semantic_search → features.txt · lines 6–8\nCandidate found. Read it before citing.\n\n$ sed -n 6,8p features.txt\nLocate related content through semantic similarity.\nRead candidate passages and surrounding context.\n\n[ DONE ] Additional evidence for the answer.  [1]';
function render(p){
 const phase=p<.36?0:p<.75?1:2;
 $('.search-theatre').dataset.phase=phase;
 document.querySelectorAll('[data-search-phase]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.searchPhase===phase)));
 $('#search-scene-label').textContent=['01 / EXPLORE FILES','02 / FIND RELATED MEANING','03 / READ THE EVIDENCE'][phase];
 $('#search-scene-state').textContent=phase===0?(p>.25?'[ GAP ]':'[ EXPLORE ]'):phase===1?'[ CANDIDATE ]':'[ READ → CITE ]';
 $('#search-scene-note').textContent=['File commands work without embedding every document.','Only enabled embedded files enter this search.','Keep the candidate path. Read its context. Cite the passage.'][phase];
 $('#search-console').hidden=phase===1;$('#vector-scene').hidden=phase!==1;
 if(phase!==1){const text=phase===0?first:final,local=phase===0?p/.29:(p-.75)/.19;$('#search-console-text').textContent=text.slice(0,reduced.matches?text.length:Math.ceil(clamp(local)*text.length));}
 else{
  const local=reduced.matches?1:clamp((p-.36)/.30);
  const x=400,y=130,settle=smooth((local-.80)/.13);
  const scanRadius=scanExtent*clamp(local/.78);
  $('#search-scene-state').textContent=local<.94?'[ SEARCHING ]':'[ CANDIDATE ]';
  $('#vector-query').setAttribute('transform',`translate(${x} ${y})`);
  $('#vector-scan').setAttribute('cx',x);$('#vector-scan').setAttribute('cy',y);
  $('#vector-scan').setAttribute('r',scanRadius);
  $('#vector-scan').style.opacity=String(reduced.matches?0:.48*(1-smooth((local-.76)/.08)));
  $('#vector-links').style.opacity='1';
  const touched=new Map();
  links.forEach((path,i)=>{
   const cycle=local*9+i/6,beat=cycle-Math.floor(cycle);
   const angle=i*Math.PI/3+Math.floor(cycle)*.41;
   const ax=x+Math.cos(angle)*scanRadius,ay=y+Math.sin(angle)*scanRadius;
   const target=[...points].sort((a,b)=>Math.hypot(a.x-ax,a.y-ay)-Math.hypot(b.x-ax,b.y-ay))[0];
   const candidate=candidates[i%5];
   const tx=target.x+(candidate.x-target.x)*settle,ty=target.y+(candidate.y-target.y)*settle;
   const reach=(smooth(beat/.23)*(1-smooth((beat-.73)/.27)))*(1-settle)+settle;
   const ex=x+(tx-x)*reach,ey=y+(ty-y)*reach;
   const bend=Math.sin(Math.PI*reach)*16*(i%2?1:-1)*(1-settle);
   path.setAttribute('d',`M ${x} ${y} Q ${(x+ex)/2+bend} ${(y+ey)/2-bend} ${ex} ${ey}`);
   path.style.opacity=String((.25+.5*reach)*(i===5?1-settle:1));
   if(reach>.88&&settle<.8)touched.set(target,reach);
  });
  points.forEach(point=>{
   const distance=Math.hypot(point.x-x,point.y-y);
   const passed=smooth((scanRadius-distance)/24);
   const wave=reduced.matches?0:Math.max(0,1-Math.abs(distance-scanRadius)/25)*(1-settle);
   const touch=(touched.get(point)||0)*(1-settle),selected=point.near?settle:0;
   const brightness=Math.round(Math.min(238,102-40*passed+wave*90+touch*45+selected*170));
   point.circle.setAttribute('fill',`rgb(${brightness} ${brightness} ${brightness})`);
   point.circle.setAttribute('r',String(1.7+Math.max(touch,wave)*.8+selected*2.6));
  });
  const reveal=smooth((local-.93)/.07),source=candidates[0];
  excerptLink.setAttribute('d',`M ${source.x} ${source.y} L ${source.x} 220 L 20 220`);
  excerptLink.style.opacity=String(reveal*.7);
  $('#vector-result').style.opacity=String(reveal);
 }
}
function update(){frame=0;if(document.hidden||$('#motion-toggle').getAttribute('aria-pressed')==='true')return;render(clamp((top-track.getBoundingClientRect().top)/Math.max(1,track.offsetHeight-panel.offsetHeight)));}
function schedule(){if(!frame)frame=requestAnimationFrame(update);}
window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',()=>{layout();schedule();});reduced.addEventListener('change',schedule);document.addEventListener('visibilitychange',schedule);$('#motion-toggle').addEventListener('click',schedule);
document.querySelectorAll('[data-search-phase]').forEach(b=>b.addEventListener('click',()=>{const p=[.28,.66,.95][+b.dataset.searchPhase];scrollTo({top:scrollY+track.getBoundingClientRect().top-top+(track.offsetHeight-panel.offsetHeight)*p,behavior:'instant'});render(p);}));
layout();render(0);schedule();
