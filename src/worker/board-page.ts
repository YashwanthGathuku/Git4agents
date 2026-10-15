/**
 * GET /board — the Git4agents trust board: a self-contained (no CDN) animated
 * view of three RECORDED live runs. Every number shown comes from
 * board-data.ts, which scripts/build-board-data.py generates from the public
 * ledgers, the redacted live logs, the crew config and docs/scale-results.
 * Nothing on this page calls the authority or can change task state; the
 * "Approve & promote" button replays the recorded decision only.
 */
import { BOARD_DATA } from "./board-data.ts";

export function renderBoardPage(): string {
	const data = JSON.stringify(BOARD_DATA).replace(/</g, "\\u003c");
	return HTML.replace("__DATA__", data);
}

const HTML = String.raw`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Git4agents · trust board</title>
<style>
:root{--bg:#070b12;--panel:#0d1420;--line:#1c2738;--ink:#e6edf6;--dim:#8796ab;--ok:#2fd27a;--bad:#ff4d5e;--amb:#ffb020;--acc:#5aa9ff}
*{box-sizing:border-box}html,body{margin:0;height:100%;background:var(--bg);color:var(--ink);font:14px/1.35 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;overflow:hidden}
code,.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
#app{display:grid;grid-template-columns:1fr 400px;grid-template-rows:auto auto 1fr 262px;height:100vh;gap:10px;padding:10px}
header{grid-column:1/3;display:flex;align-items:center;gap:14px}
header h1{font-size:18px;margin:0;letter-spacing:.3px}header h1 b{color:var(--acc)}
.sc{display:flex;gap:6px}.sc button,.ctl button,.ctl select{background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:7px 11px;font:inherit;cursor:pointer}
.sc button[aria-pressed=true]{border-color:var(--acc);box-shadow:0 0 0 1px var(--acc) inset;color:#fff}
.ctl{margin-left:auto;display:flex;gap:6px;align-items:center;color:var(--dim)}
.badge{font-weight:700;font-size:11px;padding:3px 8px;border-radius:99px;letter-spacing:.6px}.badge.real{background:#0f3d26;color:var(--ok)}.badge.sim{background:#3d300f;color:var(--amb)}
#stats{grid-column:1/3;display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
.st{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:10px 14px}.st small{color:var(--dim);text-transform:uppercase;font-size:11px;letter-spacing:.8px}.st div{font-size:24px;font-weight:700;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st.ok div{color:var(--ok)}.st.bad div{color:var(--bad)}.st.amb div{color:var(--amb)}
#map{position:relative;background:var(--panel);border:1px solid var(--line);border-radius:14px;overflow:hidden}
#tiles,#fx{position:absolute;inset:0}#fx{pointer-events:none}
.tile{position:absolute;border:1px solid #0a0f18;background:#111b2a;overflow:hidden;cursor:pointer;transition:background .5s,box-shadow .5s,filter .5s,opacity .5s}
.tile span{position:absolute;left:5px;top:3px;right:4px;font-size:10.5px;color:#9fb0c6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:ui-monospace,Menlo,monospace}
.tile.dir{background:transparent;border:0;pointer-events:none}.tile.dir span{color:#56677f;font-weight:700;top:-1px}
.tile.new{background:#14243a}.tile:hover{filter:brightness(1.35)}
.tile.claimed span{color:#fff}.tile.cracked{filter:grayscale(1) brightness(.7);background:repeating-linear-gradient(135deg,#2a1216 0 6px,#1a0c0f 6px 12px)!important}
.stack{pointer-events:none;position:absolute;right:4px;bottom:4px;background:var(--amb);color:#1b1200;font-weight:800;font-size:11px;border-radius:5px;padding:1px 6px;box-shadow:3px 3px 0 #b87800,6px 6px 0 #6b4600;animation:pulse 1.2s infinite}
@keyframes pulse{50%{transform:scale(1.12)}}
.av{pointer-events:none;position:absolute;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:11px;color:#071018;box-shadow:0 0 0 2px #070b12,0 0 18px currentColor;transition:left 1.2s cubic-bezier(.2,.8,.2,1),top 1.2s cubic-bezier(.2,.8,.2,1),opacity .5s;z-index:5}
.av i{position:absolute;top:31px;left:50%;transform:translateX(-50%);font-style:normal;font-size:10px;color:#cfe;white-space:nowrap;background:#070b12cc;padding:0 4px;border-radius:4px}
.seal{position:absolute;z-index:6;background:var(--bad);color:#fff;font-weight:800;font-size:12px;padding:6px 10px;border-radius:8px;transform:rotate(-8deg);box-shadow:0 0 0 3px #3a0a10,0 0 30px #ff4d5e88;animation:stamp .5s ease-out}
@keyframes stamp{from{transform:rotate(-8deg) scale(2.2);opacity:0}}
#side{grid-row:3/5;grid-column:2;background:var(--panel);border:1px solid var(--line);border-radius:14px;display:flex;flex-direction:column;min-height:0}
.tabs{display:flex;border-bottom:1px solid var(--line)}.tabs button{flex:1;background:none;border:0;color:var(--dim);padding:11px 0;font:inherit;font-weight:600;cursor:pointer;border-bottom:2px solid transparent}.tabs button[aria-selected=true]{color:#fff;border-color:var(--acc)}
.pane{flex:1;overflow:auto;padding:10px 12px;display:none}.pane.on{display:block}
.ev{padding:6px 8px;border-radius:8px;margin-bottom:4px;background:#0a111b;border-left:3px solid var(--line);animation:in .35s ease-out}.ev b{font-weight:600}.ev small{display:block;color:var(--dim);font-family:ui-monospace,Menlo,monospace;font-size:11px}
.ev.ok{border-color:var(--ok)}.ev.bad{border-color:var(--bad)}.ev.amb{border-color:var(--amb)}
@keyframes in{from{opacity:0;transform:translateX(12px)}}
.ag{display:flex;gap:10px;align-items:center;padding:7px 4px;border-bottom:1px solid #121c2b}.dot{width:14px;height:14px;border-radius:50%;flex:none}.ag small{color:var(--dim)}
.rv{background:#0a111b;border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:10px}.rv h3{margin:0 0 6px;font-size:14px}
.btn{display:block;width:100%;margin-top:8px;padding:10px;border-radius:9px;border:0;font:inherit;font-weight:700;cursor:pointer}.btn.go{background:var(--ok);color:#03200f}.btn.go:disabled{background:#1d2a3a;color:#6b7a8f;cursor:not-allowed}.btn.no{background:#2a1418;color:#ff9aa5;border:1px dashed #5a2630;cursor:not-allowed}
.refuse{color:var(--bad);font-weight:700;margin-top:6px;min-height:18px}
#lane{grid-column:1;background:var(--panel);border:1px solid var(--line);border-radius:14px;position:relative;overflow:hidden}
.stages{position:absolute;left:12px;right:12px;top:10px;display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
.stg{border:1px solid var(--line);border-radius:10px;padding:7px 9px;background:#0a111b;min-height:44px;transition:border-color .4s,box-shadow .4s}.stg small{color:var(--dim);font-size:10.5px;display:block}.stg b{font-size:12.5px}
.stg.lit{border-color:var(--ok);box-shadow:0 0 16px #2fd27a44}.stg.red{border-color:var(--bad);box-shadow:0 0 16px #ff4d5e55}
.gates{display:flex;flex-wrap:wrap;gap:3px;margin-top:4px}.g{font-size:9.5px;padding:1px 5px;border-radius:4px;background:#1a2433;color:#7d8ba0;transition:background .3s,color .3s}.g.p{background:#0f3d26;color:var(--ok)}.g.f{background:#4a1219;color:#ff8d98}
.card{position:absolute;top:100px;height:48px;padding:5px 9px!important;width:calc((100% - 64px)/6);border-radius:10px;padding:7px 9px;background:#0f1a29;border:1px solid #2a3a52;transition:left 1.1s cubic-bezier(.2,.8,.2,1),border-color .4s,background .4s;font-size:12px}
.card b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card small{color:var(--dim);font-family:ui-monospace,Menlo,monospace}
.card.ok{border-color:var(--ok)}.card.bad{border-color:var(--bad);background:#24121a}.card .tag{position:absolute;right:7px;top:6px;font-size:10px;font-weight:800}
.spin{display:inline-block;width:10px;height:10px;border:2px solid #5aa9ff55;border-top-color:var(--acc);border-radius:50%;animation:sp 0.8s linear infinite;vertical-align:-1px;margin-right:4px}@keyframes sp{to{transform:rotate(360deg)}}
#modal{position:fixed;inset:0;background:#000a;display:none;place-items:center;z-index:50}#modal.on{display:grid}
#modal .box{width:620px;max-width:92vw;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px 20px;box-shadow:0 30px 80px #000}
#modal h2{margin:0 0 8px;font-size:17px}#modal .row{margin:6px 0}#modal .k{color:var(--dim);display:inline-block;width:110px}
#note{position:absolute;right:12px;bottom:8px;color:var(--dim);font-size:11px;z-index:7;background:#0d1420cc;padding:2px 6px;border-radius:6px}
a{color:var(--acc)}
</style></head><body><div id="app">
<header><h1><b>Git4agents</b> · trust board</h1><div class="sc" id="sc"></div><span id="badge" class="badge real">REAL</span>
<div class="ctl"><button id="play">▶ Play</button><button id="restart" title="restart">⟲</button><label>speed <select id="speed"><option>0.5</option><option selected>1</option><option>2</option><option>4</option></select>×</label><a href="/">home</a> · <a href="/replay">replay</a></div></header>
<section id="stats"></section>
<main id="map"><div id="tiles"></div><canvas id="fx"></canvas><div id="note"></div></main>
<aside id="side"><div class="tabs" role="tablist"><button data-t="feed" aria-selected="true">Live feed</button><button data-t="agents">Agents</button><button data-t="intents">Intents</button><button data-t="review">Review</button></div>
<div class="pane on" id="p-feed"></div><div class="pane" id="p-agents"></div><div class="pane" id="p-intents"></div><div class="pane" id="p-review"></div></aside>
<section id="lane"><div class="stages" id="stages"></div></section>
</div><div id="modal"><div class="box" id="mbox"></div></div>
<script>
(function(){
var D=__DATA__;
var $=function(i){return document.getElementById(i)};
function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
var COLORS=["#5aa9ff","#2fd27a","#c084fc","#f472b6","#22d3ee","#a3e635","#fb923c","#e879f9","#38bdf8","#facc15","#34d399","#f87171","#93c5fd"];
var STAGES=[["blind commit","verifier refs bound first"],["mandatory gates","non-compensatory"],["TheUstad","done-check"],["single-use permit","exact SHA + HEAD"],["promote exact SHA","Workflow + Container"],["offline verify","pinned key"]];
var GATES=["exact_baseline","scope_compliance","valid_tool_states","no_eval_tampering","provenance_complete","hidden_oracle","regressions","static_analysis","security_policy"];
var sc=null,steps=[],si=0,playing=false,timer=null,rects={},avs={},cards={},stat={};
function speed(){return parseFloat($("speed").value)}
/* ---------- squarified treemap ---------- */
function build(files){var root={n:"",c:{},s:0,f:null};files.forEach(function(f){var parts=f.p.split("/"),node=root;parts.forEach(function(p,i){if(!node.c[p])node.c[p]={n:p,c:{},s:0,f:null,path:parts.slice(0,i+1).join("/")};node=node.c[p]});node.f=f});
 (function sum(n){var k=Object.keys(n.c);if(!k.length){n.s=Math.max(6,Math.sqrt(n.f.s+200));return n.s}n.s=0;k.forEach(function(x){n.s+=sum(n.c[x])});return n.s})(root);return root}
function squarify(items,x,y,w,h,out){if(!items.length)return;var total=items.reduce(function(a,b){return a+b.s},0),area=w*h,row=[],rest=items.slice();
 function worst(r,len){var s=r.reduce(function(a,b){return a+b.a},0),mx=0,mn=1e18;r.forEach(function(q){mx=Math.max(mx,q.a);mn=Math.min(mn,q.a)});return Math.max(len*len*mx/(s*s),(s*s)/(len*len*mn))}
 rest=rest.map(function(i){return {i:i,a:i.s/total*area}});
 while(rest.length){var len=Math.min(w,h),c=rest[0];if(!row.length||worst(row.concat([c]),len)<=worst(row,len)){row.push(c);rest.shift()}else{lay();row=[]}}
 if(row.length)lay();
 function lay(){var s=row.reduce(function(a,b){return a+b.a},0);if(w>=h){var cw=s/h,cy=y;row.forEach(function(q){var ch=q.a/cw;out.push([q.i,x,cy,cw,ch]);cy+=ch});x+=cw;w-=cw}else{var rh=s/w,cx=x;row.forEach(function(q){var qw=q.a/rh;out.push([q.i,cx,y,qw,rh]);cx+=qw});y+=rh;h-=rh}}}
function layout(node,x,y,w,h,depth){var kids=Object.keys(node.c).map(function(k){return node.c[k]}).sort(function(a,b){return b.s-a.s});var out=[];squarify(kids,x,y,w,h,out);
 out.forEach(function(o){var n=o[0],X=o[1],Y=o[2],W=o[3],H=o[4];if(n.f){var t=el("div","tile"+(n.f.new?" new":""));t.style.cssText="left:"+X+"px;top:"+Y+"px;width:"+W+"px;height:"+H+"px";t.innerHTML="<span>"+esc(n.n)+"</span>";t.onclick=function(){openFile(n.f.p)};$("tiles").appendChild(t);rects[n.f.p]={x:X,y:Y,w:W,h:H,t:t}}
 else{var pad=W>60&&H>40?14:2;var d=el("div","tile dir");d.style.cssText="left:"+X+"px;top:"+Y+"px;width:"+W+"px;height:"+H+"px";d.innerHTML="<span>"+esc(n.n)+"/</span>";$("tiles").appendChild(d);layout(n,X+2,Y+pad,W-4,H-pad-2,depth+1)}})}
/* ---------- scenario setup ---------- */
function filesFor(s){var fs=D.files.map(function(f){return {p:f.p,s:f.s}});var have={};fs.forEach(function(f){have[f.p]=1});(s.agents||[]).forEach(function(a){(a.paths||[]).forEach(function(p){if(!have[p]&&p.indexOf("*")<0){fs.push({p:p,s:6000,new:1});have[p]=1}})});return fs}
function setStats(o){for(var k in o)stat[k]=o[k];var defs=[["agents","agents live",""],["claims","claims",""],["overlaps","overlaps flagged","amb"],["quar","quarantined","bad"],["sha","promoted SHA",""],["ver","offline verify","ok"]];var h="";
 defs.forEach(function(d){var v=stat[d[0]];var cls=d[2];if(d[0]==="quar"&&!v)cls="";if(d[0]==="ver"&&v!=="VERIFIED")cls=v==="—"?"":"amb";h+='<div class="st '+cls+'"><small>'+d[1]+'</small><div class="mono">'+esc(v==null?"—":v)+"</div></div>"});$("stats").innerHTML=h}
function feed(kind,title,sub){var e=el("div","ev "+(kind||""),"<b>"+esc(title)+"</b>"+(sub?"<small>"+esc(sub)+"</small>":""));var p=$("p-feed");p.insertBefore(e,p.firstChild)}
function stagesInit(){var h="";STAGES.forEach(function(s,i){h+='<div class="stg" id="S'+i+'"><b>'+s[0]+"</b><small>"+s[1]+"</small>"+(i===1?'<div class="gates" id="gl">'+GATES.map(function(g){return '<span class="g" id="G-'+g+'">'+g.replace(/_/g," ")+"</span>"}).join("")+"</div>":"")+"</div>"});$("stages").innerHTML=h}
function laneX(i){var L=$("lane"),W=L.clientWidth-24;return 12+i*(W+8)/6}
function card(id,label,sub){var c=el("div","card","<b>"+esc(label)+'</b><small>'+esc(sub)+'</small><span class="tag"></span>');c.style.left=laneX(0)+"px";c.style.top=(104+Object.keys(cards).length*0)+"px";$("lane").appendChild(c);cards[id]=c;var n=Object.keys(cards).length-1;c.style.top=(100+((n%3)*0))+"px";c.style.transform="translateY("+(n*52)+"px)";c.style.zIndex=10+n;return c}
function moveCard(id,stage,cls,tag){var c=cards[id];c.style.left=laneX(stage)+"px";if(cls)c.className="card "+cls;if(tag!=null)c.querySelector(".tag").innerHTML=tag}
function avatar(a,i){var c=COLORS[i%COLORS.length];var v=el("div","av",esc(a.id.replace(/^sub-\d+-/,"").slice(0,2).toUpperCase())+"<i>"+esc(a.id)+"</i>");v.style.background=c;v.style.color=c;v.style.left=(30+i*34)+"px";v.style.top=($("map").clientHeight-24)+"px";$("map").appendChild(v);avs[a.id]={el:v,c:c,a:a};return v}
function glide(id,path,k){var r=rects[path],v=avs[id];if(!r||!v)return;var off=(k||0)*16;v.el.style.left=(r.x+Math.min(r.w-16,22+off))+"px";v.el.style.top=(r.y+Math.min(r.h-14,r.h/2+4))+"px";r.t.classList.add("claimed");r.t.style.background=v.c+"33";r.t.style.boxShadow="inset 0 0 0 2px "+v.c+", 0 0 22px "+v.c+"66";r.claimers=(r.claimers||[]);if(r.claimers.indexOf(id)<0)r.claimers.push(id)}
function stackBadge(path,n){var r=rects[path];if(!r)return;var b=r.t.querySelector(".stack");if(!b){b=el("div","stack");r.t.appendChild(b)}b.textContent=n+"× overlap"}
function shortSha(s){return s?String(s).slice(0,12):"—"}
function evalFor(s,agent){var a=null;(s.agents||[]).forEach(function(x){if(x.id===agent)a=x});var r=null;(s.evals||[]).forEach(function(e){if(e.agent===agent||(a&&a.commit&&e.sha.indexOf(a.commit)===0))r=e});if(!r&&s.id==="crew")r=s.evals[0];return r}
function lightGates(ev,bad){GATES.forEach(function(g,i){setTimeout(function(){var e=$("G-"+g);if(!e)return;var v=ev.gates[g];e.className="g "+(v?"p":"f")},i*120/speed())})}
/* ---------- steps per scenario ---------- */
function stepsFor(s){var S=[];var led=s.ledger||[];var li=0;function ledgerUpTo(kind){return function(){while(li<led.length){var e=led[li++];var k=/quarantin/.test(e.kind)?"bad":/promotion_succeeded|permit_issued|verdict/.test(e.kind)?"ok":"";feed(k,"#"+e.seq+" "+e.kind,e.hash+"…  "+e.ts.slice(11,19)+"Z");if(e.kind===kind)break}}}
 if(s.id==="scale")return scaleSteps(s);
 S.push(function(){feed("","task frozen · "+s.task,s.repo);ledgerUpTo("agents_enrolled")();setStats({agents:s.agents.length,claims:0,overlaps:0,quar:0,sha:"—",ver:"—"})});
 S.push(function(){ledgerUpTo("verifier_committed")();ledgerUpTo("verifier_committed")();ledgerUpTo("verifier_committed")();$("S0").classList.add("lit");feed("ok","3 blind verifier references committed","before any candidate exists")});
 var claimers=s.agents.filter(function(a){return a.paths&&a.paths.length});
 if(s.id==="crew"){S.push(function(){ledgerUpTo("claim_registered")();feed("","parent claims the union of 12 crew paths","one fork: "+(s.summary&&s.summary.task_id||""));setStats({claims:1})})}
 claimers.forEach(function(a,i){S.push(function(){ledgerUpTo("claim_registered")();var k=0;a.paths.forEach(function(p){var r=rects[p];glide(a.id,p,r&&r.claimers?r.claimers.length:0);k++});setStats({claims:(stat.claims||0)+1});feed("","claim · "+a.id,a.paths.join(", "));
   var ov=(s.overlaps||[]).filter(function(o){return o.a===a.id||o.b===a.id});var seen=0;(s.overlaps||[]).forEach(function(o){if(o._shown)seen++});ov.forEach(function(o){if(!o._shown&&(claimers.slice(0,i+1).some(function(c){return c.id===o.a})&&(o.b==="parent"||claimers.slice(0,i+1).some(function(c){return c.id===o.b})))){o._shown=1;seen++;feed("amb","overlap FLAGGED · "+o.a+" ∩ "+o.b,o.risk+" · "+o.on[0])}});setStats({overlaps:seen});
   a.paths.forEach(function(p){var r=rects[p];if(r&&r.claimers&&r.claimers.length>1)stackBadge(p,r.claimers.length)});
   if(s.id==="crew"){var r=rects[a.paths[0]];if(r){var b=r.t.querySelector(".stack");if(!b){b=el("div","stack");r.t.appendChild(b)}b.textContent="parent ∩"}}})});
 if(s.id==="crew"){S.push(function(){ledgerUpTo("composition_recorded")();feed("ok","COMPOSED "+s.composed,"12 sub-agent commits → one SHA");card("c","combined "+shortSha(s.summary.combined_sha),"parent fork · 12 sub-agents")})}
 else{S.push(function(){ledgerUpTo("contender_registered")();s.agents.forEach(function(a){card(a.id,a.id,"candidate "+shortSha(a.commit))});feed("","3 sibling candidates pushed","isolated forks")})}
 S.push(function(){ledgerUpTo("queue_event_reconciled")();for(var id in cards){moveCard(id,1,"",'<span class="spin"></span>gates')}$("S1").classList.add("lit");feed("","push events → Queue → TaskAuthority","evaluation domain fetches each exact SHA")});
 if(s.id==="crew"){S.push(function(){ledgerUpTo("evaluation_submitted")();var ev=s.evals[0];lightGates(ev);moveCard("c",1,"ok","PASS");feed("ok","all mandatory gates PASS",shortSha(ev.sha)+" · bundle "+ev.bundle_hash.slice(0,12)+"…")});
  S.push(function(){$("S2").classList.add("lit");moveCard("c",2,"ok","VERIFIED");feed("ok","TheUstad: "+s.ustad,"frozen baseline + clean parent");review(s,true)})}
 else{var order=["false-done-fay","cheater-cal","honest-ana"];order.forEach(function(ag){S.push(function(){ledgerUpTo("evaluation_submitted")();var ev=evalFor(s,ag);lightGates(ev);var pass=GATES.every(function(g){return ev.gates[g]});
   if(ag.indexOf("cheater")===0){ledgerUpTo("contender_quarantined")();moveCard(ag,1,"bad","QUARANTINED");$("S1").classList.add("red");quarantine(s);feed("bad","QUARANTINED · "+s.quarantine.trigger,ag+" edited "+ev.eval_file_changes.join(", ")+" · evidence "+s.quarantine.evidence+"…");setStats({quar:1})}
   else if(!pass){var failed=GATES.filter(function(g){return !ev.gates[g]});moveCard(ag,1,"bad","REJECT");feed("bad","REJECT · "+ag+" said done",failed.join(", ")+" failed (hidden oracle)")}
   else{moveCard(ag,1,"ok","PASS");feed("ok","all mandatory gates PASS · "+ag,shortSha(ev.sha))}})});
  S.push(function(){$("S1").classList.remove("red");$("S2").classList.add("lit");feed("bad","TheUstad on a false 'done': FINAL FALSIFIED","post-run, local TheUstad on a wrong baseline");moveCard("honest-ana",2,"ok","ready");review(s,true)})}
 var win=s.id==="crew"?"c":"honest-ana";
 S.push(function(){ledgerUpTo("verdict_reached")();ledgerUpTo("permit_issued")();$("S3").classList.add("lit");moveCard(win,3,"ok","PERMIT");feed("ok","verdict ACCEPT → single-use permit",shortSha(s.summary.permit_id)+"…");approved()});
 S.push(function(){ledgerUpTo("promotion_succeeded")();$("S4").classList.add("lit");moveCard(win,4,"ok","PROMOTED");setStats({sha:shortSha(s.summary.promoted_sha)});feed("ok","promoted exact SHA",s.summary.promoted_sha)});
 S.push(function(){ledgerUpTo("~end")();$("S5").classList.add("lit");moveCard(win,5,"ok","VERIFIED");setStats({ver:"VERIFIED"});feed("ok","offline verify: VERIFIED","signature VALID · ledger chain OK · permit recomputed");if(s.tamper_verify)feed("bad","tampered copy: "+s.tamper_verify,"one byte changed")});
 return S}
function quarantine(s){var a=avs[s.quarantine.agent];var ev=evalFor(s,s.quarantine.agent);var tp=(ev&&ev.eval_file_changes&&ev.eval_file_changes[0])||null;if(tp)glide(s.quarantine.agent,tp,0);if(tp&&rects[tp]){rects[tp].t.classList.add("cracked")}a.el.style.opacity=.45;var r=rects[tp||a.a.paths[0]];var sl=el("div","seal","QUARANTINED · "+esc(s.quarantine.trigger));sl.style.left=Math.max(4,r.x+r.w/2-120)+"px";sl.style.top=Math.max(4,r.y+r.h/2-50)+"px";$("map").appendChild(sl)}
/* ---------- scale scenario: dense swarm on canvas ---------- */
var raf=null;
function scaleSteps(s){var cv=$("fx"),m=$("map");cv.width=m.clientWidth*devicePixelRatio;cv.height=m.clientHeight*devicePixelRatio;cv.style.width=m.clientWidth+"px";cv.style.height=m.clientHeight+"px";var ctx=cv.getContext("2d");ctx.scale(devicePixelRatio,devicePixelRatio);
 var W=m.clientWidth,H=m.clientHeight,N=s.n,cols=Math.ceil(Math.sqrt(N*W/H)),rows=Math.ceil(N/cols),cw=W/cols,ch=(H-26)/rows,shown=0,t0=performance.now();
 var ovIdx={};for(var i=20;i<N;i+=20)ovIdx[i]=1;
 function draw(t){ctx.clearRect(0,0,W,H);for(var i=0;i<shown;i++){var x=(i%cols)*cw,y=26+Math.floor(i/cols)*ch;var ov=ovIdx[i];ctx.fillStyle=ov?(Math.sin(t/180+i)>0?"#ffb020":"#7a5208"):COLORS[i%COLORS.length]+"cc";ctx.fillRect(x+1,y+1,Math.max(1,cw-2),Math.max(1,ch-2))}
  ctx.fillStyle="#56677f";ctx.font="700 12px ui-monospace,Menlo,monospace";ctx.fillText("agents/a0 … agents/a"+(N-1)+"  ·  one cell = one live claim  ·  amber = seeded overlap, FLAGGED",8,16);raf=requestAnimationFrame(draw)}
 raf=requestAnimationFrame(draw);
 var S=[];S.push(function(){feed("","task frozen · "+s.task,N+" agents enrolled");setStats({agents:N,claims:0,overlaps:0,quar:0,sha:"n/a (claims only)",ver:"chain —"});$("S0").classList.add("lit")});
 var chunks=12;for(var k=1;k<=chunks;k++)(function(k){S.push(function(){shown=Math.round(N*k/chunks);var granted=Math.min(s.granted,shown);var ov=Math.min(s.overlaps_flagged,Math.floor((shown-1)/20));setStats({claims:granted,overlaps:ov});feed(k===chunks?"ok":"","claims "+granted+" / "+N,"concurrency 25 · p50 "+s.p50+" ms · p95 "+s.p95+" ms");if(ov&&k%3===0)feed("amb",ov+" overlaps FLAGGED so far","every 20th agent also claims its neighbour's path")})})(k);
 S.push(function(){setStats({ver:s.chain_ok?"chain OK":"chain FAIL",overlaps:s.overlaps_flagged});feed("ok","ledger hash chain OK · "+s.ledger_entries+" entries",s.granted+" claims granted · "+s.errors+" errors · "+s.false_flags+" false flags · "+s.claims_per_s+" claims/s");feed("","no Artifacts fork per agent","commits go through fork crews")});
 return S}
/* ---------- side panes ---------- */
function agentsPane(s){var p=$("p-agents");if(s.id==="scale"){p.innerHTML='<div class="rv"><h3>'+s.n+' scripted agents</h3>ids s'+s.n+'-a00000 … s'+s.n+'-a'+String(s.n-1).padStart(5,"0")+'<br><small>'+esc(s.note)+'</small></div>';return}
 p.innerHTML=s.agents.map(function(a,i){var st=s.quarantine&&s.quarantine.agent===a.id?'<b style="color:var(--bad)">quarantined</b>':a.role;return '<div class="ag"><span class="dot" style="background:'+COLORS[i%COLORS.length]+'"></span><div><b>'+esc(a.id)+"</b> <small>"+st+"</small><br><small class=mono>"+esc((a.paths||[]).join(", ")||"(whole crew scope)")+"</small></div></div>"}).join("")}
function intentsPane(s){var p=$("p-intents");if(s.id==="scale"){p.innerHTML='<div class="rv">Each agent: <code>scale agent &lt;id&gt;: edit agents/aN/**</code> (scripts/lib/scale.mjs).</div>';return}
 p.innerHTML='<div class="rv"><small>source: '+esc(s.intents_source)+"</small></div>"+s.agents.map(function(a){return '<div class="ev"><b>'+esc(a.id)+"</b><small>"+esc(a.intent)+"</small></div>"}).join("")}
var reviewOk=false;
function review(s,ready){var p=$("p-review");if(s.id==="scale"){p.innerHTML='<div class="rv"><h3>No candidate</h3>The scale run measures the claim/coordination layer only. Nothing is promoted.</div>';return}
 var sha=s.summary.winner||s.summary.promoted_sha;p.innerHTML='<div class="rv"><h3>Candidate <code>'+shortSha(sha)+"</code></h3><small>"+esc(s.task)+'</small><div class="gates">'+GATES.map(function(g){var ev=s.id==="crew"?s.evals[0]:evalFor(s,"honest-ana");return '<span class="g '+(ev&&ready?(ev.gates[g]?"p":"f"):"")+'">'+g.replace(/_/g," ")+"</span>"}).join("")+'</div><button class="btn go" id="approve" '+(ready?"":"disabled")+'>Approve &amp; promote</button><span id="ovw" style="display:block"><button class="btn no" disabled>Override gate</button></span><div class="refuse" id="refuse"></div><small>Approval replays the recorded verdict; this page cannot change task state.</small></div>'+
 (s.quarantine?'<div class="rv"><h3 style="color:var(--bad)">'+esc(s.quarantine.agent)+" · QUARANTINED</h3>trigger <code>"+esc(s.quarantine.trigger)+"</code><br>evidence <code>"+esc(s.quarantine.evidence)+"…</code><br><small>Mandatory gates cannot be waived. No override input exists.</small></div>":"");
 $("ovw").onclick=function(){$("refuse").textContent="Refused: mandatory gates cannot be waived"};
 var ap=$("approve");if(ap)ap.onclick=function(){if(!playing&&si<steps.length){runTo(steps.length)}}}
function approved(){var ap=$("approve");if(ap){ap.disabled=true;ap.textContent="Permit issued (recorded)"}}
function openFile(path){var r=rects[path];var cl=(r&&r.claimers)||[];var s=sc;var h="<h2 class=mono>"+esc(path)+"</h2>";
 if(!cl.length)h+='<div class="row">No agent claimed this file in this run.</div>';
 cl.forEach(function(id){var a=avs[id].a;var ev=evalFor(s,id);h+='<div class="rv"><div class="row"><span class="k">claimed by</span><b style="color:'+avs[id].c+'">'+esc(id)+'</b></div><div class="row"><span class="k">intent</span>'+esc(a.intent)+'</div><div class="row"><span class="k">commit</span><code>'+esc(a.commit||"(composes sub-agent commits)")+"</code></div>"+(ev?'<div class="row"><span class="k">gates</span><span class="gates">'+GATES.map(function(g){return '<span class="g '+(ev.gates[g]?"p":"f")+'">'+g.replace(/_/g," ")+"</span>"}).join("")+"</span></div>":"")+(s.quarantine&&s.quarantine.agent===id?'<div class="row" style="color:var(--bad);font-weight:700">QUARANTINED · '+esc(s.quarantine.trigger)+"</div>":"")+"</div>"});
 h+='<button class="btn" style="background:#1d2a3a;color:#fff" onclick="document.getElementById(\'modal\').className=\'\'">Close</button>';$("mbox").innerHTML=h;$("modal").className="on"}
$("modal").onclick=function(e){if(e.target.id==="modal")$("modal").className=""};
/* ---------- player ---------- */
function load(id){stop();if(raf)cancelAnimationFrame(raf);raf=null;D.scenarios.forEach(function(x){if(x.id===id)sc=JSON.parse(JSON.stringify(x))});
 document.querySelectorAll("#sc button").forEach(function(b){b.setAttribute("aria-pressed",b.dataset.id===id)});$("badge").className="badge "+(sc.badge==="REAL"?"real":"sim");$("badge").textContent=sc.badge;
 $("tiles").innerHTML="";document.querySelectorAll(".av,.seal,.card").forEach(function(e){e.remove()});var cv=$("fx");cv.getContext("2d").clearRect(0,0,cv.width,cv.height);$("p-feed").innerHTML="";rects={};avs={};cards={};stat={};
 stagesInit();setStats({agents:0,claims:0,overlaps:0,quar:0,sha:"—",ver:"—"});
 $("note").textContent=sc.id==="scale"?"REAL counts from docs/scale-results · "+sc.task:"REAL · "+sc.task+" · ky @ "+D.ky_commit.slice(0,7)+" · click a file";
 if(sc.id!=="scale"){var m=$("map");layout(build(filesFor(sc)),4,4,m.clientWidth-8,m.clientHeight-8,0);sc.agents.forEach(function(a,i){avatar(a,i)})}
 agentsPane(sc);intentsPane(sc);review(sc,false);steps=stepsFor(sc);si=0;history.replaceState(null,"","?scenario="+id+(qs.get("autoplay")?"&autoplay=1":"")+"&speed="+$("speed").value)}
function step(){if(si>=steps.length){stop();if(qs.get("loop")==="1"){var ids=D.scenarios.map(function(x){return x.id});var nx=ids[(ids.indexOf(sc.id)+1)%ids.length];setTimeout(function(){load(nx);play()},2500/speed())}return}steps[si++]();if(playing)timer=setTimeout(step,1500/speed())}
function runTo(n){while(si<n&&si<steps.length)steps[si++]()}
function play(){if(si>=steps.length)load(sc.id);playing=true;$("play").textContent="❚❚ Pause";step()}
function stop(){playing=false;clearTimeout(timer);$("play").textContent="▶ Play"}
$("play").onclick=function(){playing?stop():play()};$("restart").onclick=function(){load(sc.id)};
document.querySelectorAll(".tabs button").forEach(function(b){b.onclick=function(){document.querySelectorAll(".tabs button").forEach(function(x){x.setAttribute("aria-selected",x===b)});document.querySelectorAll(".pane").forEach(function(x){x.classList.toggle("on",x.id==="p-"+b.dataset.t)})}});
D.scenarios.forEach(function(x){var b=el("button","",esc(x.label));b.dataset.id=x.id;b.onclick=function(){load(x.id)};$("sc").appendChild(b)});
var qs=new URLSearchParams(location.search);if(qs.get("speed"))$("speed").value=qs.get("speed");
var tab=qs.get("tab");if(tab){var tb=document.querySelector('.tabs button[data-t="'+tab+'"]');if(tb)tb.click()}
load(qs.get("scenario")||"crew");if(qs.get("autoplay")==="1")play();
window.__board={runTo:runTo,steps:function(){return steps.length},load:load};
})();
</script></body></html>`;
