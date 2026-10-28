// ---- State (kept in memory; see note on persistence in the dashboard) ----
const LESSONS=[
 {id:'bubble',title:'Bubble Sort',xp:20,desc:'Repeatedly compare neighbours and swap them if out of order.',long:'Bubble Sort walks through the list, compares each pair of neighbours and swaps them if they are in the wrong order. After each pass the largest remaining value bubbles to the end. Time: O(n²) average and worst, O(n) best. Space: O(1).'},
 {id:'binary',title:'Binary Search',xp:20,desc:'Halve a sorted array each step to find a target quickly.'},
 {id:'stack',title:'Stack',xp:20,desc:'A LIFO structure: last in, first out.'},
 {id:'selection',title:'Selection Sort',xp:20,desc:'Pick the largest value and place it at the end.',long:'Selection Sort scans the unsorted part to find its largest value, then swaps it into its final place at the end. Time: O(n²) in every case. Space: O(1). It makes very few swaps (at most n-1).'},
 {id:'insertion',title:'Insertion Sort',xp:20,desc:'Grow a sorted section like sorting cards in your hand.',long:'Insertion Sort takes each new value and moves it left past larger neighbours until it fits, like sorting playing cards in your hand. Time: O(n²) average and worst, O(n) best (already sorted). Space: O(1).'}];
const LVL=xp=>Math.floor(xp/50)+1;
let store={xp:0,done:{}};
try{const s=localStorage.getItem('aq');if(s)store=JSON.parse(s)}catch(e){}
const save=()=>{try{localStorage.setItem('aq',JSON.stringify(store))}catch(e){}};
const $=s=>document.querySelector(s);
let timer=null;
const stop=()=>{clearInterval(timer);timer=null};

// ---- Pure trace generators: return the steps the visualizer plays ----
/** Bubble sort trace. @param {number[]} a @returns {{arr:number[],cmp:number[],swap:boolean,done:number}[]} */
function bubbleTrace(a){a=[...a];const t=[];let n=a.length;
 for(let i=0;i<n-1;i++){for(let j=0;j<n-1-i;j++){
  const sw=a[j]>a[j+1];t.push({arr:[...a],cmp:[j,j+1],swap:false,done:i});
  if(sw){[a[j],a[j+1]]=[a[j+1],a[j]];t.push({arr:[...a],cmp:[j,j+1],swap:true,done:i})}}}
 t.push({arr:[...a],cmp:[],swap:false,done:n});return t}
/** Binary search trace over a sorted array. @param {number[]} a @param {number} x */
function binaryTrace(a,x){const t=[];let lo=0,hi=a.length-1;
 while(lo<=hi){const m=(lo+hi)>>1;t.push({lo,hi,m,found:a[m]===x,txt:`Check middle index ${m} (value ${a[m]}).`});
  if(a[m]===x)return t;
  if(a[m]<x){lo=m+1}else{hi=m-1}}
 t.push({lo,hi,m:-1,found:false,txt:'Search space is empty: the target is not in the array.'});return t}

// ---- Routing ----
function nav(){const r=location.hash.slice(1)||'home';
 $('#nav').innerHTML=[['home','Home'],['dashboard','Dashboard'],['play','Play'],...LESSONS.map(l=>[l.id,l.title])]
  .map(([k,v])=>`<button class="${k===r?'active':''}" onclick="go('${k}')">${v}</button>`).join('')}
function go(r){if(location.hash.slice(1)===r)render();else location.hash=r}
window.onhashchange=render;
function render(){stop();nav();const r=location.hash.slice(1)||'home';
 if(r==='home')home();else if(r==='dashboard')dash();else if(r==='play')play();else lesson(r);scrollTo(0,0)}

function home(){$('#app').innerHTML=`<div class="card"><h1>Master Algorithms.<br>Level Up Your Skills.</h1>
<p class="mute">Watch algorithms run step by step, try them yourself, and earn XP for every lesson you finish.</p>
<div class="row"><button class="primary" onclick="go('${nextLesson().id}')">Start Learning Free</button><button onclick="go('play')">Play Games</button><button onclick="go('dashboard')">View Dashboard</button></div></div>
<div class="grid">${LESSONS.map(l=>`<div class="card"><h2>${l.title}</h2><p class="mute">${l.desc}</p><button onclick="go('${l.id}')">Open lesson</button></div>`).join('')}</div>`}

function nextLesson(){return LESSONS.find(l=>!store.done[l.id])||LESSONS[0]}

function dash(){const n=Object.keys(store.done).length,pct=Math.round(n/LESSONS.length*100),nx=nextLesson(),lv=LVL(store.xp);
 $('#app').innerHTML=`<h1>Dashboard</h1><div class="grid">
<div class="card"><div class="mute">Total XP</div><div class="stat">${store.xp}</div></div>
<div class="card"><div class="mute">Level</div><div class="stat">${lv}</div><div class="mute">${lv*50-store.xp} XP to next level</div></div>
<div class="card"><div class="mute">Day streak</div><div class="stat">${store.streak||1}</div></div>
<div class="card"><div class="mute">Lessons completed</div><div class="stat">${n} / ${LESSONS.length}</div></div></div>
<div class="card"><div class="mute">Overall progress: ${pct}%</div><div class="bar"><i style="width:${pct}%"></i></div>
<div class="row"><button class="primary" onclick="go('${nx.id}')">${n===0?'Start your first lesson':n===LESSONS.length?'Review a lesson':'Continue Learning'}: ${nx.title}</button></div></div>
<div class="card"><h2>Badges</h2>${BADGES.map(([n,d,f])=>`<div class="row"><span>${f(store)?'🏅':'🔒'} <b>${n}</b></span><span class="mute">${d}</span></div>`).join('')}</div>
<div class="card"><h2>Games</h2><div class="mute">${Object.keys(store.games||{}).length} levels cleared · ${Object.values(store.games||{}).reduce((s,x)=>s+x,0)} stars earned</div><div class="row"><button onclick="go('play')">Play games</button></div></div>
<div class="card"><h2>Lessons</h2>${LESSONS.map(l=>`<div class="row"><span>${store.done[l.id]?'✅':'⬜'} ${l.title}</span><span class="mute">${store.done[l.id]?'Completed '+new Date(store.done[l.id]).toLocaleDateString('en-US'):'+'+l.xp+' XP'}</span></div>`).join('')}</div>
<p class="mute">Demo note: progress is saved in this browser only. Real accounts and cross-device sync are the next step.</p>`}

function finishBox(id){const d=store.done[id];return `<div class="card"><button class="primary" id="fin" ${d?'disabled':''}>${d?'Completed ✓':'Complete lesson'}</button> <span class="msg" id="fmsg"></span></div>`}
function bindFinish(id,ready){const b=$('#fin');if(!b||b.disabled)return;
 b.onclick=()=>{if(!ready()){$('#fmsg').className='msg err';$('#fmsg').textContent='Finish the activity first.';return}
  if(store.done[id])return; // reward only once
  const l=LESSONS.find(x=>x.id===id);store.done[id]=Date.now();store.xp+=l.xp;save();
  b.disabled=true;b.textContent='Completed ✓';$('#fmsg').className='msg';$('#fmsg').textContent=`+${l.xp} XP earned!`}}

function lesson(id){const l=LESSONS.find(x=>x.id===id);if(!l){$('#app').innerHTML='<div class="card"><h1>Page not found</h1><button onclick="go(\'home\')">Go home</button></div>';return}
 (({binary,stack})[id]||(()=>bubble(id)))()}

function bubble(id){id=id||'bubble';const L=LESSONS.find(x=>x.id===id);let arr=[5,3,8,1,9,2],tr=[],i=0,did=false;
 $('#app').innerHTML=`<div class="card"><h1>${L.title}</h1><p>${L.long}</p></div>
<div class="card"><div class="row"><input id="in" aria-label="Array" value="5,3,8,1,9,2"><button id="set">Set array</button><button id="rnd">Random</button></div>
<div class="viz" id="viz"></div><div class="msg" id="desc"></div><div class="mute" id="cnt"></div>
<div class="row"><button id="prev">Previous</button><button class="primary" id="play">Play</button><button id="next">Next</button><button id="rst">Reset</button>
<label class="mute">Speed <input type="range" id="spd" min="100" max="1000" value="500" style="width:120px;min-height:auto"></label></div></div>${finishBox(id)}`;
 function load(a){stop();arr=a;tr=TRACES[id](a);i=0;draw();$('#play').textContent='Play'}
 function draw(){const s=i===0?{arr,cmp:[],swap:false,done:0}:tr[i-1];const n=s.arr.length,mx=Math.max(...s.arr,1);
  $('#viz').innerHTML=s.arr.map((v,k)=>`<div class="col ${s.cmp.includes(k)?(s.swap?'swp':'cmp'):''} ${k>=n-s.done?'done':''}" style="height:${Math.max(8,v/mx*100)}%">${v}</div>`).join('');
  const sw=tr.slice(0,i).filter(x=>x.swap).length,cp=tr.slice(0,i).filter(x=>x.cmp.length&&!x.swap).length;
  $('#cnt').textContent=`Comparisons: ${cp} · Swaps: ${sw}`;
  $('#desc').textContent=i===0?'Press Play or Next to begin.':i===tr.length?'Sorted!':s.swap?`Swapped positions ${s.cmp[0]} and ${s.cmp[1]}.`:`Comparing positions ${s.cmp[0]} and ${s.cmp[1]}.`;
  if(i===tr.length)did=true}
 const step=d=>{i=Math.max(0,Math.min(tr.length,i+d));draw();if(i===tr.length)stop()};
 $('#next').onclick=()=>{stop();step(1)};$('#prev').onclick=()=>{stop();step(-1)};
 $('#rst').onclick=()=>load(arr);
 $('#play').onclick=()=>{if(timer){stop();$('#play').textContent='Play';return}if(i===tr.length)i=0;
  $('#play').textContent='Pause';timer=setInterval(()=>{step(1);if(i===tr.length)$('#play').textContent='Play'},+$('#spd').value)};
 $('#set').onclick=()=>{const a=$('#in').value.split(',').map(s=>s.trim()).filter(Boolean).map(Number);
  if(!a.length||a.length>12||a.some(x=>!Number.isFinite(x))){$('#desc').className='msg err';$('#desc').textContent='Enter 1 to 12 numbers separated by commas.';return}
  $('#desc').className='msg';load(a)};
 $('#rnd').onclick=()=>{const a=Array.from({length:8},()=>1+Math.floor(Math.random()*30));$('#in').value=a.join(',');load(a)};
 load(arr);bindFinish(id,()=>did)}

function binary(){const arr=[2,5,8,12,16,23,38,42,56,72,91];let tr=[],i=0,did=false,x=23;
 $('#app').innerHTML=`<div class="card"><h1>Binary Search</h1><p>On a <b>sorted</b> array, look at the middle element. If it is the target, you are done; if the target is larger, discard the left half, otherwise discard the right half. Time: O(log n). Space: O(1).</p></div>
<div class="card"><div class="row"><label>Target <input id="tg" type="number" value="23"></label><button id="go">Search</button></div>
<div class="viz" id="viz"></div><div class="msg" id="desc">Choose a target from the array (or any number) and press Search, then step through.</div>
<div class="row"><button id="prev">Previous</button><button id="next" class="primary">Next</button></div></div>${finishBox('binary')}`;
 function draw(){const s=i?tr[i-1]:null;
  $('#viz').innerHTML=arr.map((v,k)=>{let c='';if(s){if(k<s.lo||k>s.hi)c='dim';if(k===s.m)c=s.found?'done':'mid'}
   return `<div class="col ${c}" style="height:${10+v*.9}%">${v}</div>`}).join('');
  if(s){$('#desc').textContent=s.found?`Found ${x} at index ${s.m}!`:s.txt+(s.m>=0?(arr[s.m]<x?' Too low: discard the left half.':' Too high: discard the right half.'):'');if(s.found||s.m<0)did=true}}
 $('#go').onclick=()=>{x=+$('#tg').value;if($('#tg').value===''||!Number.isFinite(x)){$('#desc').className='msg err';$('#desc').textContent='Enter a valid number.';return}
  $('#desc').className='msg';tr=binaryTrace(arr,x);i=1;draw()};
 $('#next').onclick=()=>{if(i&&i<tr.length){i++;draw()}};$('#prev').onclick=()=>{if(i>1){i--;draw()}};
 draw();bindFinish('binary',()=>did)}

function stack(){let st=[],n=1,pushed=0,popped=0;
 $('#app').innerHTML=`<div class="card"><h1>Stack</h1><p>A stack is <b>LIFO</b>: the last item pushed is the first one popped. Push adds to the top, Pop removes from the top. Both take O(1) time.</p></div>
<div class="card"><div class="row"><input id="v" aria-label="Value" placeholder="Value" maxlength="6"><button class="primary" id="push">Push</button><button id="pop">Pop</button></div>
<div class="stack" id="st" aria-live="polite"></div><div class="msg" id="desc">Push at least 3 items and pop at least 1 to finish.</div></div>${finishBox('stack')}`;
 function draw(){$('#st').innerHTML=st.map(v=>`<div class="item">${v}</div>`).join('')}
 $('#push').onclick=()=>{const v=$('#v').value.trim()||String(n++);if(st.length>=7){$('#desc').className='msg err';$('#desc').textContent='Stack overflow: this demo stack holds 7 items.';return}
  st.push(v);pushed++;$('#v').value='';$('#desc').className='msg';$('#desc').textContent=`Pushed ${v} on top.`;draw()};
 $('#pop').onclick=()=>{if(!st.length){$('#desc').className='msg err';$('#desc').textContent='Stack underflow: nothing to pop.';return}
  const v=st.pop();popped++;$('#desc').className='msg';$('#desc').textContent=`Popped ${v} from the top (last in, first out).`;draw()};
 draw();bindFinish('stack',()=>pushed>=3&&popped>=1)}

// ---- Games: efficiency decides the stars ----
/** Count inversions (out-of-order pairs). @param {number[]} a */
function inv(a){let c=0;for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)if(a[i]>a[j])c++;return c}
/** Random permutation of 1..n with at least 3 inversions. @param {number} n */
function genPuzzle(n,r){r=r||Math.random;let a;do{a=Array.from({length:n},(_,i)=>i+1);for(let i=n-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}}while(inv(a)<3);return a}
/** Award 5 XP per newly earned star (improvements only). Returns XP given. */
function award(id,stars){store.games=store.games||{};const old=store.games[id]||0;if(stars<=old)return 0;store.games[id]=stars;const xp=(stars-old)*5;store.xp+=xp;save();return xp}
const starTxt=s=>'★'.repeat(s)+'☆'.repeat(3-s);

function play(){const g=store.games||{};
 const lv=(p,n,f)=>Array.from({length:n},(_,i)=>`<button onclick="${f}(${i+1})">Level ${i+1} ${starTxt(g[p+(i+1)]||0)}</button>`).join('');
 $('#app').innerHTML=`<h1>Play</h1><p class="mute">Efficiency decides your stars. You earn 5 XP for every new star.</p>
<div class="card"><h2>Daily Challenge · ${today()}</h2><p class="mute">The same puzzle for everyone today. ${starTxt(g['daily'+today()]||0)}</p><button class="primary" onclick="swapGame(1,false,true)">Play today's puzzle</button></div>
<div class="card"><h2>Swap Puzzle</h2><p class="mute">Sort the bars using as few neighbour swaps as possible.</p><div class="row">${lv('swap',5,'swapGame')}</div></div>
<div class="card"><h2>Race the Bot</h2><p class="mute">Sort before the bot does, and with as few swaps as you can.</p><div class="row">${lv('race',3,'raceGame')}</div></div>
<div class="card"><h2>Predict the Step</h2><p class="mute">Eight questions: what will Bubble Sort do next? ${starTxt(g.predict||0)}</p><button onclick="predictGame()">Start</button></div>
<div class="card"><h2>Stack or Queue</h2><p class="mute">Apply the operations and build the final structure.</p><div class="row">${lv('sq',4,'sqGame')}</div></div>
<div class="card"><h2>Binary Search Hunt</h2><p class="mute">Find the hidden target by revealing as few cards as possible.</p><div class="row">${lv('hunt',3,'huntGame')}</div></div>`}

function swapGame(lv,race,daily){lv=lv||1;let a=daily?genPuzzle(8,rng(seedOf())):genPuzzle(4+lv),sel=-1,moves=0,hint=-1,fin=false,foc=-1,note='Tap a bar to select it.';const opt=inv(a);
 $('#app').innerHTML=`<div class="card"><h1>${daily?'Daily Challenge':race?'Race the Bot':'Swap Puzzle'} · ${daily?today():'Level '+lv}</h1><p>Tap a bar, then a neighbour, to swap them. Sort ascending in as few swaps as you can. A good swap fixes one inversion (an out-of-order pair); a bad swap adds one.</p>
<div class="viz" id="viz"></div><div class="mute" id="cnt"></div><div class="msg" id="desc"></div>
<div class="row"><button id="hint">Hint</button><button id="again">New puzzle</button><button class="primary" id="nxt" hidden>Next level</button><button onclick="go('play')">Back to games</button></div></div>`;
 const viz=$('#viz');let bot=0;
 if(race){timer=setInterval(()=>{if(fin){stop();return}bot++;if(bot>=opt){stop();fin=true;note='The bot finished first. Try again!'}draw()},[1400,1000,700][lv-1])}
 function draw(){const n=a.length;
  viz.innerHTML=a.map((v,k)=>`<div class="col ${k===sel?'cmp':''} ${hint>=0&&(k===hint||k===hint+1)?'mid':''} ${fin&&inv(a)===0?'done':''}" data-k="${k}" role="button" tabindex="0" aria-label="Bar ${v}" style="height:${v/n*100}%;cursor:pointer">${v}</div>`).join('');
  $('#cnt').textContent=`Inversions left: ${inv(a)} · Swaps: ${moves} · Optimal: ${opt}${race?` · Bot: ${bot}/${opt}`:''}`;$('#desc').textContent=note;
  if(foc>=0&&!fin&&viz.children[foc])viz.children[foc].focus()}
 function pick(k){if(fin)return;foc=k;
  if(sel<0){sel=k;note='Now tap a neighbouring bar to swap.'}
  else if(sel===k){sel=-1;note='Selection cleared.'}
  else if(Math.abs(sel-k)!==1){sel=k;note='You can only swap neighbours, so this bar is selected instead.'}
  else{const i=Math.min(sel,k),b=inv(a);[a[i],a[i+1]]=[a[i+1],a[i]];moves++;sel=-1;hint=-1;
   note=inv(a)<b?'Good swap! One inversion fixed.':'Bad swap: that added an inversion.';
   if(inv(a)===0){fin=true;stop();const st=moves===opt?3:moves<=opt+2?2:1,xp=award(daily?'daily'+today():(race?'race':'swap')+lv,st);
    note=`${race?'You beat the bot! ':''}Solved in ${moves} swaps (optimal ${opt}) ${starTxt(st)}${xp?` · +${xp} XP`:''}. Each neighbour swap fixes at most one inversion, so the minimum equals the starting inversion count.`;
    if(lv<(race?3:5)&&!daily)$('#nxt').hidden=false}}
  draw()}
 viz.onclick=e=>{const c=e.target.closest('.col');if(c)pick(+c.dataset.k)};
 viz.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){const c=e.target.closest('.col');if(c){e.preventDefault();pick(+c.dataset.k)}}};
 $('#hint').onclick=()=>{if(fin)return;hint=a.findIndex((v,i)=>i<a.length-1&&v>a[i+1]);note='Hint: swapping the highlighted pair fixes one inversion.';draw()};
 $('#again').onclick=()=>swapGame(lv,race,daily);$('#nxt').onclick=()=>swapGame(lv+1,race);
 draw()}

function huntGame(lv){lv=lv||1;const n=[8,16,32][lv-1],set=new Set();while(set.size<n)set.add(1+Math.floor(Math.random()*99));
 const arr=[...set].sort((x,y)=>x-y),tgt=arr[Math.floor(Math.random()*n)],par=Math.ceil(Math.log2(n))+1;
 let rev=new Set(),lo=0,hi=n-1,fin=false,note='Cards are sorted. Reveal one to get a clue.';
 $('#app').innerHTML=`<div class="card"><h1>Binary Search Hunt · Level ${lv}</h1><p>The target is <b>${tgt}</b>. The ${n} hidden cards are sorted from smallest to largest. Reveal as few as you can: each answer tells you whether the target is to the left or the right, and impossible cards turn grey. Par: ${par} reveals.</p>
<div class="row" id="grid"></div><div class="mute" id="cnt"></div><div class="msg" id="desc"></div>
<div class="row"><button id="again">New puzzle</button><button class="primary" id="nxt" hidden>Next level</button><button onclick="go('play')">Back to games</button></div></div>`;
 function draw(){$('#grid').innerHTML=arr.map((v,i)=>{const r=rev.has(i),out=i<lo||i>hi;
   return `<button data-i="${i}" aria-label="Card ${i+1}" ${r||out||fin?'disabled':''} style="width:60px;${out?'opacity:.3;':''}${fin&&v===tgt?'background:var(--ok);color:#06231a;':''}">${r||(fin&&v===tgt)?v:'?'}</button>`}).join('');
  $('#cnt').textContent=`Reveals: ${rev.size} · Par: ${par}`;$('#desc').textContent=note}
 $('#grid').onclick=e=>{const b=e.target.closest('button');if(!b||fin)return;const i=+b.dataset.i,v=arr[i];rev.add(i);
  if(v===tgt){fin=true;const r=rev.size,st=r<=par?3:r<=par+2?2:1,xp=award('hunt'+lv,st);
   note=`Found ${tgt} with ${r} reveals ${starTxt(st)}${xp?` · +${xp} XP`:''}. On a sorted list every reveal can discard half the cards, so about log₂(n) reveals always suffice.`;if(lv<3)$('#nxt').hidden=false}
  else if(v<tgt){lo=Math.max(lo,i+1);note=`${v} is too low: the target is to the right.`}
  else{hi=Math.min(hi,i-1);note=`${v} is too high: the target is to the left.`}
  draw()};
 $('#again').onclick=()=>huntGame(lv);$('#nxt').onclick=()=>huntGame(lv+1);
 draw()}

// ---- More traces, helpers, games, badges ----
/** Selection sort (max-first) trace, same step shape as bubbleTrace. @param {number[]} a */
function selectionTrace(a){a=[...a];const t=[],n=a.length;
 for(let i=n-1;i>0;i--){let m=0;for(let k=1;k<=i;k++){t.push({arr:[...a],cmp:[m,k],swap:false,done:n-1-i});if(a[k]>a[m])m=k}
  if(m!==i){[a[m],a[i]]=[a[i],a[m]];t.push({arr:[...a],cmp:[m,i],swap:true,done:n-1-i})}}
 t.push({arr:[...a],cmp:[],swap:false,done:n});return t}
/** Insertion sort trace using neighbour swaps. @param {number[]} a */
function insertionTrace(a){a=[...a];const t=[],n=a.length;
 for(let i=1;i<n;i++){for(let j=i;j>0;j--){const sw=a[j-1]>a[j];t.push({arr:[...a],cmp:[j-1,j],swap:false,done:0});if(!sw)break;[a[j-1],a[j]]=[a[j],a[j-1]];t.push({arr:[...a],cmp:[j-1,j],swap:true,done:0})}}
 t.push({arr:[...a],cmp:[],swap:false,done:n});return t}
const TRACES={bubble:bubbleTrace,selection:selectionTrace,insertion:insertionTrace};
function today(){return new Date().toISOString().slice(0,10)}
function seedOf(){return [...today()].reduce((h,c)=>(h*31+c.charCodeAt(0))|0,7)}
/** Seeded random generator (mulberry32). */
function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function raceGame(l){swapGame(l,true)}
const BADGES=[['First Steps','Complete your first lesson',s=>Object.keys(s.done).length>=1],['Scholar','Complete 3 lessons',s=>Object.keys(s.done).length>=3],['Perfect Play','Earn 3 stars in any game level',s=>Object.values(s.games||{}).some(x=>x===3)],['On Fire','Reach a 3-day streak',s=>(s.streak||0)>=3],['XP Hunter','Reach 100 XP',s=>s.xp>=100]];
// First visit of the day updates the streak (no XP for logging in).
(function(){const t=today(),y=new Date(Date.now()-864e5).toISOString().slice(0,10);if(store.last!==t){store.streak=store.last===y?(store.streak||0)+1:1;store.last=t;save()}})();

function predictGame(){const N=8;let q=0,ok=0;
 function mk(){const a=Array.from({length:6},()=>1+Math.floor(Math.random()*20)),t=bubbleTrace(a),ix=t.map((s,i)=>i).filter(i=>t[i].cmp.length&&!t[i].swap),s=t[ix[Math.floor(Math.random()*ix.length)]],j=s.cmp[0];return{arr:s.arr,j,sw:s.arr[j]>s.arr[j+1]}}
 function show(){const c=mk();let ans=false;
  $('#app').innerHTML=`<div class="card"><h1>Predict the Step</h1><p class="mute">Question ${q+1} of ${N} · Correct: ${ok}</p><p>Bubble Sort is about to compare the highlighted bars. What happens next?</p><div class="viz">${c.arr.map((v,k)=>`<div class="col ${k===c.j||k===c.j+1?'cmp':''}" style="height:${v/20*100}%">${v}</div>`).join('')}</div><div class="row"><button id="y">Swap them</button><button id="n">Leave them</button></div><div class="msg" id="desc"></div><div class="row"><button class="primary" id="nx" hidden>Next</button></div></div>`;
  const pick=g=>{if(ans)return;ans=true;const r=g===c.sw;if(r)ok++;
   $('#desc').className='msg'+(r?'':' err');
   $('#desc').textContent=(r?'Correct! ':'Not quite. ')+`${c.arr[c.j]} ${c.sw?'>':'≤'} ${c.arr[c.j+1]}, so Bubble Sort ${c.sw?'swaps them: the larger value moves right.':'leaves them: they are already in order.'}`;
   $('#nx').hidden=false;$('#nx').textContent=q+1===N?'See result':'Next'};
  $('#y').onclick=()=>pick(true);$('#n').onclick=()=>pick(false);
  $('#nx').onclick=()=>{q++;q<N?show():end()}}
 function end(){const st=ok===N?3:ok>=N-2?2:ok>=N/2?1:0,xp=st?award('predict',st):0;
  $('#app').innerHTML=`<div class="card"><h1>Result</h1><p class="stat">${ok} / ${N} ${starTxt(st)}</p><p>${xp?'+'+xp+' XP. ':''}Bubble Sort swaps a neighbour pair only when the left value is strictly larger, so once you know the rule you can predict every step.</p><div class="row"><button class="primary" onclick="predictGame()">Play again</button><button onclick="go('play')">Back to games</button></div></div>`}
 show()}

function sqGame(lv){lv=lv||1;const isS=lv%2===1,nm=isS?'Stack':'Queue',ops=[],rem=[];let cur=[],tries=0,fin=false;
 for(let i=0;i<5+lv;i++){if(rem.length>1&&Math.random()<.4){ops.push(0);isS?rem.pop():rem.shift()}else{const v=1+Math.floor(Math.random()*9);ops.push(v);rem.push(v)}}
 const lab=o=>o===0?(isS?'pop':'dequeue'):(isS?'push ':'enqueue ')+o;
 $('#app').innerHTML=`<div class="card"><h1>${nm} Builder · Level ${lv}</h1><p>Start with an empty ${nm.toLowerCase()} and apply these operations in order:</p><p><b>${ops.map(lab).join(' → ')}</b></p><p class="mute">Build the final contents, listed from ${isS?'bottom to top':'front to back'}.</p><div class="row" id="pad">${[1,2,3,4,5,6,7,8,9].map(d=>`<button data-d="${d}">${d}</button>`).join('')}</div><div class="row" id="cur"></div><div class="row"><button id="undo">Undo</button><button class="primary" id="chk">Check</button><button id="nxt" hidden>Next level</button><button onclick="go('play')">Back to games</button></div><div class="msg" id="desc"></div></div>`;
 const draw=()=>{$('#cur').innerHTML=cur.length?cur.map(v=>`<div class="item" style="min-width:44px">${v}</div>`).join(''):'<span class="mute">Your answer is empty.</span>'};
 $('#pad').onclick=e=>{const b=e.target.closest('button');if(b&&!fin&&cur.length<10){cur.push(+b.dataset.d);draw()}};
 $('#undo').onclick=()=>{if(!fin){cur.pop();draw()}};
 $('#chk').onclick=()=>{if(fin)return;const d=$('#desc');
  if(cur.join()===rem.join()){fin=true;const st=tries===0?3:tries===1?2:1,xp=award('sq'+lv,st);d.className='msg';d.textContent=`Correct! ${starTxt(st)}${xp?` · +${xp} XP`:''}. ${isS?'A stack is LIFO: the last item pushed is the first one popped.':'A queue is FIFO: the first item added is the first one removed.'}`;if(lv<4)$('#nxt').hidden=false}
  else{tries++;d.className='msg err';d.textContent=isS?'Not yet. A stack is LIFO (last in, first out): pop removes the newest item, so the top is always the latest push.':'Not yet. A queue is FIFO (first in, first out): dequeue removes the oldest item from the front, and new items join the back.'}};
 $('#nxt').onclick=()=>sqGame(lv+1);draw()}

render();
