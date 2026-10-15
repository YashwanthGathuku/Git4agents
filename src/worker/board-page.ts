/**
 * GET /board — the Git4agents trust board, drawn as a repo shopping mall: a
 * self-contained (no CDN) illustrated SVG view of three RECORDED live runs. Every number shown comes from
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
<title>Git4agents · trust board · the repo mall</title>
<style>
:root{--paper:#fbf4e6;--card:#fffaf0;--ink:#3b2f2a;--dim:#8a7a6d;--line:#e6d6bd;--ok:#4f9d69;--bad:#d2544c;--amb:#e0a43a;--acc:#4a7fb5;--floor:#f3e6cf}
*{box-sizing:border-box}html,body{margin:0;height:100%;background:var(--paper);color:var(--ink);font:14px/1.4 "Avenir Next","Nunito","Segoe UI",system-ui,sans-serif;overflow:hidden}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
#app{display:grid;grid-template-columns:1fr 380px;grid-template-rows:auto auto 1fr;height:100vh;gap:10px;padding:12px 14px}
header{grid-column:1/3;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
header h1{font:700 21px/1 Georgia,"Iowan Old Style",serif;margin:0}header h1 em{color:#b5643c;font-style:italic}
.sc{display:flex;gap:6px}.sc button,.ctl button,.ctl select{background:var(--card);color:var(--ink);border:1.5px solid var(--line);border-radius:999px;padding:6px 13px;font:inherit;cursor:pointer}
.sc button[aria-pressed=true]{background:#3b2f2a;color:#fff8ec;border-color:#3b2f2a}
.ctl{margin-left:auto;display:flex;gap:6px;align-items:center;color:var(--dim)}.ctl a{color:var(--acc)}
.badge{font-weight:800;font-size:11px;padding:3px 9px;border-radius:99px;letter-spacing:.7px}.badge.real{background:#dcefdc;color:#2f6e44}.badge.viz{background:#f6e3c2;color:#8a5a12}
#stats{grid-column:1/3;display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
.st{background:var(--card);border:1.5px solid var(--line);border-radius:14px;padding:8px 14px}.st small{color:var(--dim);text-transform:uppercase;font-size:10.5px;letter-spacing:.9px}.st div{font:700 21px/1.2 Georgia,serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st.ok div{color:var(--ok)}.st.bad div{color:var(--bad)}.st.amb div{color:#b07a17}
#mall{position:relative;background:var(--card);border:1.5px solid var(--line);border-radius:18px;overflow:hidden;min-height:0}
#mall svg{width:100%;height:100%;display:block}
#legend{position:absolute;left:12px;bottom:8px;font-size:11.5px;color:var(--dim);background:#fffaf0e6;padding:3px 9px;border-radius:8px}
.shop{cursor:pointer}.shop:hover .front{filter:brightness(1.05) saturate(1.15)}
.who{cursor:pointer}.who .legs line{animation:walk .5s infinite alternate ease-in-out;transform-origin:0 -4px}
.who.still .legs line{animation:none}.who .legs line:nth-child(2){animation-delay:-.5s}
@keyframes walk{from{transform:rotate(-18deg)}to{transform:rotate(18deg)}}
.flag{animation:bob 1.1s infinite ease-in-out}@keyframes bob{50%{transform:translateY(-3px)}}
.pop,.flag{transform-box:fill-box;transform-origin:center}body.static *{animation:none!important}
.pop{animation:pop .45s cubic-bezier(.3,1.6,.5,1)}@keyframes pop{from{transform:scale(0)}}
#side{grid-row:3;grid-column:2;display:flex;flex-direction:column;gap:10px;min-height:0}
.receipt{flex:1;min-height:0;background:#fffdf8;border:1.5px solid var(--line);border-radius:6px 6px 0 0;display:flex;flex-direction:column;box-shadow:0 2px 0 #efe3cf;position:relative}
.receipt:after{content:"";position:absolute;left:0;right:0;bottom:-8px;height:8px;background:radial-gradient(circle at 6px 0,transparent 6px,#fffdf8 6.5px) 0 0/12px 8px repeat-x}
.receipt h2{font:700 13px/1 ui-monospace,Menlo,monospace;text-align:center;letter-spacing:2px;margin:12px 0 2px}.receipt .sub{text-align:center;color:var(--dim);font:11px ui-monospace,Menlo,monospace;border-bottom:1.5px dashed var(--line);padding-bottom:8px;margin:0 12px}
#rx{flex:1;overflow:auto;padding:6px 14px 14px;font:12px/1.45 ui-monospace,Menlo,monospace}
.ln{display:flex;gap:8px;padding:3px 0;border-bottom:1px dotted #eadcc5;animation:in .35s ease-out}.ln .s{color:var(--dim);width:34px;flex:none}.ln .k{flex:1}.ln .h{color:#b3a493}
.ln.ok .k{color:var(--ok)}.ln.bad .k{color:var(--bad);font-weight:700}.ln.amb .k{color:#b07a17}.ln.note .k{color:var(--dim);font-style:italic}
@keyframes in{from{opacity:0;transform:translateY(-4px)}}
.panel{background:var(--card);border:1.5px solid var(--line);border-radius:14px;padding:11px 13px}
.panel h3{margin:0 0 5px;font:700 15px Georgia,serif}.panel .row{font-size:12.5px;margin:2px 0}.panel .row b{color:var(--dim);font-weight:600;display:inline-block;min-width:78px}
#det{max-height:34%;overflow:auto}
.btns{display:flex;gap:8px}.btn{flex:1;padding:9px;border-radius:10px;border:0;font:inherit;font-weight:700;cursor:pointer}.btn.go{background:var(--ok);color:#fff}.btn.go:disabled{background:#e8dccb;color:#a8998a;cursor:not-allowed}.btn.no{background:#f7e1dc;color:#a1453d;border:1.5px dashed #dfa59c;cursor:not-allowed}
.refuse{color:var(--bad);font-weight:700;font-size:12.5px;margin-top:6px;min-height:17px}
.chip{display:inline-block;font-size:10.5px;padding:1px 6px;border-radius:5px;margin:1px;background:#efe5d4}.chip.p{background:#dcefdc;color:#2f6e44}.chip.f{background:#f7d9d5;color:#a1453d}
</style></head><body><div id="app">
<header><h1>Git4agents <em>· the repo mall</em> <span style="font-size:13px;color:var(--dim);font-family:inherit;font-style:normal">trust board</span></h1><div class="sc" id="sc"></div><span id="badge" class="badge real">REAL</span>
<div class="ctl"><button id="play">▶ Play</button><button id="restart" title="restart">⟲</button><label>speed <select id="speed"><option>0.5</option><option selected>1</option><option>2</option><option>4</option></select>×</label><label><input type="checkbox" id="loop"> loop</label><a href="/">home</a>·<a href="/replay">replay</a></div></header>
<section id="stats"></section>
<main id="mall"><svg id="svg" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mall floor plan"></svg><div id="legend"></div></main>
<aside id="side">
<div class="receipt"><h2>LEDGER RECEIPT</h2><div class="sub" id="rxsub"></div><div id="rx"></div></div>
<div class="panel" id="det"><h3>Click a shop or a shopper</h3><div class="row" style="color:var(--dim)">Shops are the repo's directories, shelf items are the files agents claimed. Every detail shown is from the recorded run.</div></div>
<div class="panel"><div class="btns"><button class="btn go" id="approve" disabled>Approve &amp; promote</button><button class="btn no" id="override">Override gates</button></div><div class="refuse" id="refuse"></div></div>
</aside></div>
<script>
(function(){
var D=__DATA__;
var NS="http://www.w3.org/2000/svg",svg=document.getElementById("svg");
var $=function(i){return document.getElementById(i)};
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function S(t,a,p){var e=document.createElementNS(NS,t);for(var k in a)e.setAttribute(k,a[k]);(p||svg).appendChild(e);return e}
function T(txt,a,p){var e=S("text",a,p);e.textContent=txt;return e}
var PAL=["#e07a5f","#3d8eb9","#81b29a","#f2cc8f","#b56576","#6d597a","#e9a03b","#5fa8a0","#c97b63","#7a9e4d","#8e7dbe","#d08c60","#4f7cac"];
var AWN=["#e07a5f","#81b29a","#3d8eb9","#e9a03b","#b56576","#5fa8a0","#8e7dbe","#c97b63","#7a9e4d","#d08c60"];
var GATES={"Blind eval":["exact_baseline","scope_compliance","valid_tool_states","no_eval_tampering","static_analysis","security_policy"],"Hidden tests":["hidden_oracle","regressions"],"Provenance":["provenance_complete"]};
var sc,people={},shops={},tweens=[],steps=[],si=0,timer=null,playing=false,instant=false,promoted=false,verdict=false;
function speed(){return parseFloat($("speed").value)||1}
function ease(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
function place(p){p.g.setAttribute("transform","translate("+p.x.toFixed(1)+","+p.y.toFixed(1)+")")}
function move(p,pts,ms){if(!Array.isArray(pts[0]))pts=[pts];var path=[[p.x,p.y]].concat(pts);
 if(instant){p.x=path[path.length-1][0];p.y=path[path.length-1][1];place(p);return}
 var segs=[],L=0;for(var i=1;i<path.length;i++){var d=Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]);segs.push(d);L+=d}
 tweens=tweens.filter(function(w){return w.p!==p});p.g.classList.remove("still");
 tweens.push({p:p,path:path,segs:segs,L:L||1,t0:performance.now(),ms:ms/speed()})}
function frame(now){tweens=tweens.filter(function(w){var t=Math.min(1,(now-w.t0)/w.ms),d=ease(t)*w.L,i=0;
 while(i<w.segs.length-1&&d>w.segs[i]){d-=w.segs[i];i++}var a=w.path[i],b=w.path[i+1],f=w.segs[i]?Math.min(1,d/w.segs[i]):1;
 w.p.x=a[0]+(b[0]-a[0])*f;w.p.y=a[1]+(b[1]-a[1])*f;place(w.p);if(t>=1){w.p.g.classList.add("still");return false}return true});requestAnimationFrame(frame)}
requestAnimationFrame(frame);
function rx(cls,seq,k,h){var d=document.createElement("div");d.className="ln "+(cls||"");d.innerHTML='<span class="s">'+(seq==null?"":"#"+seq)+'</span><span class="k">'+esc(k)+'</span><span class="h">'+esc(h||"")+'</span>';$("rx").appendChild(d);$("rx").scrollTop=1e6}
function led(cls,seq,label){var e=(sc.ledger||[])[seq];rx(cls,seq,label||(e?e.kind:"?"),e?e.hash.slice(0,8):"")}
function ledKind(cls,kind,label){(sc.ledger||[]).forEach(function(e){if(e.kind===kind)led(cls,e.seq,label)})}
function stat(i,v,c){var n=document.querySelectorAll(".st")[i];if(!n)return;n.querySelector("div").textContent=v;n.className="st "+(c||"")}
function stats(arr){$("stats").innerHTML=arr.map(function(a){return '<div class="st '+(a[2]||"")+'"><small>'+esc(a[0])+'</small><div>'+esc(a[1])+'</div></div>'}).join("")}
function det(h){$("det").innerHTML=h}
function short(s){return s?String(s).slice(0,12):"—"}
// ---------- the building ----------
function floor(){svg.innerHTML="";
 var df=S("defs");var pat=S("pattern",{id:"tile",width:28,height:28,patternUnits:"userSpaceOnUse"},df);S("rect",{width:28,height:28,fill:"#f6ead4"},pat);S("path",{d:"M0 0H28V28",fill:"none",stroke:"#ead9bb","stroke-width":1},pat);
 var pk=S("pattern",{id:"asph",width:12,height:12,patternUnits:"userSpaceOnUse"},df);S("rect",{width:12,height:12,fill:"#d9d3c7"},pk);S("circle",{cx:3,cy:4,r:.8,fill:"#c8c0b2"},pk);
 S("rect",{x:0,y:0,width:1000,height:600,fill:"#eaf1e3"});
 for(var i=0;i<14;i++){var tx=8+((i*71)%60),ty=30+i*42;S("circle",{cx:tx,cy:ty,r:9+(i%3)*2,fill:i%2?"#a9c79a":"#94b886"})}
 S("rect",{x:70,y:18,width:740,height:564,rx:22,fill:"url(#tile)",stroke:"#cdb48f","stroke-width":5});
 S("rect",{x:830,y:18,width:162,height:564,rx:16,fill:"url(#asph)"});
 for(var j=0;j<7;j++)S("line",{x1:846,x2:976,y1:70+j*72,y2:70+j*72,stroke:"#fffbe9","stroke-width":2,"stroke-dasharray":"10 6"});
 T("PARKING",{x:911,y:46,"text-anchor":"middle","font-size":13,"font-weight":800,fill:"#7d7466","letter-spacing":3});
 T("drive off = promoted SHA",{x:911,y:575,"text-anchor":"middle","font-size":10,fill:"#7d7466"});
 // entrance
 S("rect",{x:62,y:258,width:16,height:84,rx:4,fill:"#9ad0e6",stroke:"#5b8fa6","stroke-width":2});
 T("ENTRANCE",{x:40,y:300,"text-anchor":"middle","font-size":11,"font-weight":800,fill:"#5b7a4f",transform:"rotate(-90 40 300)","letter-spacing":2});
 S("rect",{x:92,y:270,width:92,height:60,rx:10,fill:"#fff4dc",stroke:"#d9b98a","stroke-width":2});T("Fork & enroll",{x:138,y:296,"text-anchor":"middle","font-size":11,"font-weight":700});T("info desk",{x:138,y:312,"text-anchor":"middle","font-size":10,fill:"#8a7a6d"});
 // checkout
 S("rect",{x:600,y:150,width:196,height:300,rx:16,fill:"#fdf7ec",stroke:"#d9b98a","stroke-width":2,"stroke-dasharray":"6 5"});
 T("CHECKOUT · security gates",{x:698,y:142,"text-anchor":"middle","font-size":11.5,"font-weight":800,fill:"#7a5a3a","letter-spacing":1});
 var gy=172;Object.keys(GATES).forEach(function(g,i){var y=gy+i*82;var b=S("g",{id:"gate"+i});
  S("rect",{x:614,y:y,width:122,height:64,rx:10,fill:"#fff",stroke:"#cdb48f","stroke-width":2},b);
  S("rect",{x:618,y:y+4,width:114,height:16,rx:6,fill:["#f2cc8f","#b8d8c8","#c9d6ea"][i]},b);
  T(g,{x:675,y:y+16,"text-anchor":"middle","font-size":11,"font-weight":800},b);
  T(GATES[g].length+" check"+(GATES[g].length>1?"s":""),{x:675,y:y+38,"text-anchor":"middle","font-size":10,fill:"#8a7a6d"},b);
  S("circle",{id:"lamp"+i,cx:675,cy:y+52,r:6,fill:"#e4d8c4",stroke:"#bfae94"},b);
  S("rect",{x:742,y:y+8,width:46,height:48,rx:8,fill:"#efe2ca"},b);T("lane",{x:765,y:y+36,"text-anchor":"middle","font-size":9,fill:"#a08a6d"},b)});
 // guard + quarantine
 S("rect",{x:600,y:470,width:196,height:100,rx:14,fill:"#f7e1dc",stroke:"#d2544c","stroke-width":2.5});
 T("QUARANTINE ROOM",{x:698,y:492,"text-anchor":"middle","font-size":12,"font-weight":800,fill:"#a1453d","letter-spacing":1.5});
 S("text",{id:"qreason",x:698,y:512,"text-anchor":"middle","font-size":10.5,fill:"#a1453d","font-family":"ui-monospace,Menlo,monospace"});
 S("rect",{x:798,y:262,width:30,height:76,rx:4,fill:"#9ad0e6",stroke:"#5b8fa6","stroke-width":2});T("EXIT",{x:813,y:254,"text-anchor":"middle","font-size":10,"font-weight":800,fill:"#5b7a4f"});
 // plants
 [[200,40],[560,40],[200,565],[560,565],[580,300]].forEach(function(q){S("circle",{cx:q[0],cy:q[1],r:11,fill:"#8fbf7f",stroke:"#6e9e60","stroke-width":2});S("circle",{cx:q[0]-3,cy:q[1]-3,r:4,fill:"#a9d39a"})});
}
function shopAt(name,i,n,files){var cols=n>6?2:1,rows=Math.ceil(n/cols),col=cols===2?i%2:0,row=cols===2?Math.floor(i/2):i;
 var w=cols===2?172:340,h=Math.min(118,(520-(rows-1)*10)/rows),x=205+col*(w+14),y=36+row*(h+10)+(520-rows*(h+10)+10)/2;
 var g=S("g",{"class":"shop"});var c=AWN[i%AWN.length];
 S("rect",{x:x,y:y,width:w,height:h,rx:10,fill:"#fffdf7",stroke:"#d8c4a2","stroke-width":2,"class":"front"},g);
 var aw=S("g",{},g);var nst=Math.floor(w/17);for(var k=0;k<nst;k++)S("path",{d:"M"+(x+k*w/nst)+" "+y+"h"+(w/nst)+"v12a"+(w/nst/2)+" 6 0 0 1 -"+(w/nst)+" 0z",fill:k%2?"#fffaf0":c},aw);
 S("rect",{x:x+8,y:y+20,width:w-16,height:18,rx:5,fill:"#3b2f2a"},g);
 T(name,{x:x+w/2,y:y+33,"text-anchor":"middle","font-size":11,fill:"#fff4dc","font-family":"ui-monospace,Menlo,monospace","font-weight":700},g);
 var shelfY=y+h-18;S("rect",{x:x+10,y:shelfY,width:w-20,height:7,rx:2,fill:"#c9a77a"},g);
 var sh={name:name,x:x,y:y,w:w,h:h,g:g,files:files,slots:{},items:{}};
 files.forEach(function(f,j){var sx=x+22+j*((w-44)/Math.max(1,files.length-1||1));if(files.length===1)sx=x+w/2;sh.slots[f]=[sx,shelfY-2];
  var it=S("g",{},g);S("rect",{x:sx-7,y:shelfY-14,width:14,height:14,rx:3,fill:c,stroke:"#00000022"},it);S("rect",{x:sx-4,y:shelfY-11,width:8,height:2,fill:"#fff8"},it);sh.items[f]=it});
 g.onclick=function(){showShop(sh)};shops[name]=sh;return sh}
function person(id,i,label){var g=S("g",{"class":"who still"});var c=PAL[i%PAL.length];
 S("ellipse",{cx:0,cy:12,rx:8,ry:2.5,fill:"#0002"},g);
 var lg=S("g",{"class":"legs"},g);S("line",{x1:-2,y1:4,x2:-2,y2:11,stroke:"#4a3b33","stroke-width":2.6,"stroke-linecap":"round"},lg);S("line",{x1:2,y1:4,x2:2,y2:11,stroke:"#4a3b33","stroke-width":2.6,"stroke-linecap":"round"},lg);
 S("rect",{x:-6,y:-8,width:12,height:14,rx:5,fill:c},g);S("circle",{cx:0,cy:-13,r:5.5,fill:"#f3c9a5",stroke:"#d9a882"},g);S("path",{d:"M-5.5 -14a5.5 5.5 0 0 1 11 0z",fill:["#4a3b33","#a0522d","#2b2b2b","#d9a441"][i%4]},g);
 var bag=S("g",{opacity:0},g);S("rect",{x:6,y:-3,width:8,height:9,rx:1.5,fill:"#f2cc8f",stroke:"#b98f4f"},bag);S("path",{d:"M8 -3v-2h4v2",fill:"none",stroke:"#b98f4f"},bag);
 var tag=T(label||id,{x:0,y:24,"text-anchor":"middle","font-size":9.5,"font-weight":700,fill:"#3b2f2a",stroke:"#fffaf0","stroke-width":3,"paint-order":"stroke"},g);
 var p={id:id,g:g,x:20,y:300,bag:bag,color:c};place(p);g.onclick=function(){showAgent(id)};people[id]=p;return p}
function flagAt(x,y,txt,color,p){var g=S("g",{"class":"pop"},p);var gg=S("g",{"class":"flag"},g);var w=txt.length*5.8+14;
 S("rect",{x:x-w/2,y:y-22,width:w,height:17,rx:8,fill:color||"#e0a43a"},gg);T(txt,{x:x,y:y-10,"text-anchor":"middle","font-size":10,"font-weight":800,fill:"#fff"},gg);return g}
function lamp(i,ok){var l=$("lamp"+i);if(l)l.setAttribute("fill",ok?"#4f9d69":"#d2544c")}
function lampsReset(){for(var i=0;i<3;i++){var l=$("lamp"+i);if(l)l.setAttribute("fill","#e4d8c4")}}
function car(color,sha,laneY){var g=S("g",{"class":"pop"});S("rect",{x:-20,y:-11,width:40,height:22,rx:7,fill:color},g);S("rect",{x:-9,y:-8,width:16,height:16,rx:3,fill:"#dff1fb"},g);
 [[-13,-12],[13,-12],[-13,12],[13,12]].forEach(function(w){S("rect",{x:w[0]-4,y:w[1]-2,width:8,height:4,rx:1,fill:"#333"},g)});
 T(sha,{x:0,y:28,"text-anchor":"middle","font-size":10,"font-weight":800,fill:"#3b2f2a",stroke:"#eaf1e3","stroke-width":3,"paint-order":"stroke","font-family":"ui-monospace,Menlo,monospace"},g);
 var p={g:g,x:880,y:laneY};place(p);return p}
function gateNames(ev){var o={};Object.keys(GATES).forEach(function(k){o[k]=GATES[k].every(function(n){return ev.gates[n]!==false})});return o}
// ---------- details ----------
function showAgent(id){if(!sc.agents)return;var a=sc.agents.filter(function(x){return x.id===id})[0];if(!a)return;
 var ev=(sc.evals||[]).filter(function(e){return e.agent===id})[0];var ov=(sc.overlaps||[]).filter(function(o){return o.a===id||o.b===id});
 var h='<h3>🛍 '+esc(a.id)+'</h3><div class="row"><b>role</b>'+esc(a.role)+'</div><div class="row"><b>intent</b>'+esc(a.intent)+'</div><div class="row"><b>claimed</b><span class="mono">'+(a.paths.length?a.paths.map(esc).join(", "):"(hosts the fork)")+'</span></div><div class="row"><b>commit</b><span class="mono">'+esc(a.commit||"—")+'</span></div>';
 if(ov.length)h+='<div class="row"><b>overlaps</b>'+ov.map(function(o){return esc(o.a+" ∩ "+o.b)+' <span class="chip">'+o.risk+'</span>'}).join("<br>")+'</div>';
 if(ev)h+='<div class="row"><b>gates</b>'+Object.keys(ev.gates).map(function(k){return '<span class="chip '+(ev.gates[k]?"p":"f")+'">'+k+'</span>'}).join("")+'</div>';
 if(sc.quarantine&&sc.quarantine.agent===id)h+='<div class="row" style="color:var(--bad)"><b>quarantine</b>'+esc(sc.quarantine.trigger)+' · evidence '+esc(sc.quarantine.evidence)+'</div>';
 h+='<div class="row" style="color:var(--dim);font-size:11px">source: '+esc(sc.intents_source||"")+'</div>';det(h)}
function showShop(sh){var who=(sc.agents||[]).filter(function(a){return a.paths.some(function(p){return sh.files.indexOf(p)>=0})});
 var h='<h3>🏬 '+esc(sh.name)+'</h3><div class="row"><b>shelf</b><span class="mono">'+sh.files.map(esc).join("<br>")+'</span></div><div class="row"><b>shoppers</b>'+(who.map(function(a){return esc(a.id)}).join(", ")||"—")+'</div>';
 var fz=(D.files||[]).filter(function(f){return dirOf(f.p)===sh.name.replace(/\/$/,"")}).length;if(fz)h+='<div class="row"><b>stock</b>'+fz+' existing file(s) in ky@'+esc(D.ky_commit.slice(0,8))+'</div>';det(h)}
function dirOf(p){var i=p.lastIndexOf("/");return i<0?"(root)":p.slice(0,i)}
// ---------- scenarios ----------
function W(ms,fn){steps.push({ms:ms,fn:fn||function(){}})}
function common(){floor();people={};shops={};tweens=[];steps=[];si=0;promoted=false;verdict=false;$("rx").innerHTML="";$("approve").disabled=true;$("refuse").textContent="";
 $("rxsub").innerHTML=esc(sc.task)+"<br>"+esc(sc.repo||"")}
function buildShops(agents,extra){var dirs={};agents.forEach(function(a){a.paths.forEach(function(p){var d=dirOf(p);(dirs[d]=dirs[d]||[]);if(dirs[d].indexOf(p)<0)dirs[d].push(p)})});
 var names=Object.keys(dirs);names.forEach(function(d,i){shopAt(d==="(root)"?"(root)":d+"/",i,names.length,dirs[d])});return dirs}
function shopOf(p){return shops[dirOf(p)==="(root)"?"(root)":dirOf(p)+"/"]}
function crew(){var A=sc.agents,ev=sc.evals[0];buildShops(A);
 stats([["agents",A.length,""],["shops visited",Object.keys(shops).length,""],["overlaps flagged",sc.overlaps.length,"amb"],["composed",sc.composed,""],["TheUstad",sc.ustad,"ok"],["promoted",short(sc.summary.promoted_sha),"ok"]]);
 $("legend").innerHTML="Floor plan &amp; walking are a <b>visualization</b>; agents, files, overlaps, gates, ledger &amp; SHAs are <b>REAL</b> (recorded run).";
 A.forEach(function(a,i){person(a.id,i,a.id.replace(/^sub-/,""))});
 W(400,function(){led("",0);led("",1);led("",2)});
 W(1300,function(){move(people.parent,[[138,330]],1100);rx("note",null,"parent forks ext-ky once","fork")});
 W(900,function(){ledKind("ok","agents_enrolled","agents_enrolled · "+A.length)});
 A.slice(1).forEach(function(a,i){var f=a.paths[0],sh=shopOf(f),s=sh.slots[f];W(260,function(){var p=people[a.id];p.y=270+((i*7)%60);place(p);move(p,[[110,p.y],[190,s[1]+18],[s[0]+(i%2?8:-8),s[1]+18]],1900)})});
 W(1700,function(){ledKind("","claim_registered","claim_registered");A.slice(1).forEach(function(a){var sh=shopOf(a.paths[0]);sh.items[a.paths[0]].setAttribute("opacity",.25);people[a.id].bag.setAttribute("opacity",1)})});
 W(1500,function(){var seen={};sc.overlaps.forEach(function(o){var sub=o.a==="parent"?o.b:o.a,ag=A.filter(function(x){return x.id===sub})[0];if(!ag)return;var sh=shopOf(ag.paths[0]);if(seen[sh.name])return;seen[sh.name]=1;
   flagAt(sh.x+sh.w-46,sh.y+60,"overlap ×"+sc.overlaps.filter(function(q){var s2=q.a==="parent"?q.b:q.a;var g=A.filter(function(x){return x.id===s2})[0];return g&&shopOf(g.paths[0])===sh}).length,"#e0a43a")});
  rx("amb",null,sc.overlaps.length+" overlaps flagged (each sub ∩ parent fork scope)","AMBER")});
 W(2000,function(){A.forEach(function(a,i){move(people[a.id],[[580,150+((i*23)%300)],[748,180+(i%3)*82+20]],1800)});ledKind("","composition_recorded","composition_recorded · "+sc.composed)});
 W(1200,function(){ledKind("","contender_registered");ledKind("","evaluation_submitted","evaluation_submitted · "+short(ev.sha))});
 Object.keys(GATES).forEach(function(g,i){W(800,function(){lamp(i,gateNames(ev)[g]);rx("ok",null,g+": "+GATES[g].join(", ")+" ✓","pass")})});
 W(1000,function(){ledKind("","verifier_committed");ledKind("","verifier_revealed");ledKind("","verifier_report_submitted");ledKind("ok","verdict_reached","verdict_reached · "+short(ev.sha));verdict=true;$("approve").disabled=false;rx("ok",null,"TheUstad: "+sc.ustad,"")});
 W(900,function(){promote()});
 W(3200,function(){});
}
function promote(){if(promoted)return;promoted=true;$("approve").disabled=true;var s=sc.summary,w=s.promoted_sha;
 (sc.agents||[]).forEach(function(a,i){var p=people[a.id];if(!p||(sc.quarantine&&sc.quarantine.agent===a.id)||p.turned)return;move(p,[[813,300],[850+((i%4)*28),90+Math.floor(i/4)*36]],1800)});
 var c=car("#e07a5f",short(w),300);move(c,[[911,300],[911,40],[911,-60]],3200);
 ledKind("ok","permit_issued","permit_issued · "+String(s.permit_id).slice(0,10));ledKind("ok","promotion_reserved");ledKind("ok","promotion_succeeded","promotion_succeeded · "+short(w));
 if(sc.id==="cheater"){rx("ok",null,"offline verify (honest bundle): VERIFIED","");rx("bad",null,"tampered copy: "+sc.tamper_verify,"")}
 rx("ok",null,"drove off with "+short(w),"promoted")}
function cheater(){var A=sc.agents,byA={};sc.evals.forEach(function(e){byA[e.agent]=e});buildShops(A);
 var ana=byA["honest-ana"],fay=byA["false-done-fay"],cal=byA["cheater-cal"];
 stats([["shoppers",A.length,""],["same-shelf overlaps",sc.overlaps.length,"amb"],["quarantined","cheater-cal","bad"],["turned back","false-done-fay","amb"],["promoted",short(sc.summary.promoted_sha),"ok"],["tampered bundle","NOT VERIFIED","bad"]]);
 $("legend").innerHTML="Floor plan &amp; walking are a <b>visualization</b>; agents, files, gates, quarantine reason, ledger &amp; SHAs are <b>REAL</b>.";
 A.forEach(function(a,i){person(a.id,i)});var hs=shopOf("source/MADGRIX_HONEST.md"),ts=shopOf("test/base-url.ts"),slot=hs.slots["source/MADGRIX_HONEST.md"];
 W(400,function(){led("",0);led("",1);led("",2)});
 A.forEach(function(a,i){W(500,function(){var p=people[a.id];p.y=285+i*14;place(p);move(p,[[138,330+i*6],[190,slot[1]+20],[slot[0]-26+i*26,slot[1]+20]],2000)})});
 W(1900,function(){ledKind("ok","agents_enrolled","agents_enrolled · 3");ledKind("","claim_registered","claim_registered");hs.items["source/MADGRIX_HONEST.md"].setAttribute("opacity",.3);
  flagAt(slot[0],hs.y+64,"3 at one shelf · overlap ×"+sc.overlaps.length,"#e0a43a");rx("amb",null,"overlap: all three claim source/MADGRIX_HONEST.md","AMBER")});
 W(1500,function(){people["honest-ana"].bag.setAttribute("opacity",1);var tsl=ts.slots["test/base-url.ts"];move(people["cheater-cal"],[[190,tsl[1]+20],[tsl[0],tsl[1]+20]],1600);rx("bad",null,"cheater-cal sneaks to test/ and edits test/base-url.ts","eval file")});
 W(1800,function(){ts.items["test/base-url.ts"].setAttribute("opacity",.25);people["cheater-cal"].bag.setAttribute("opacity",1);
  move(people["false-done-fay"],[[580,260],[748,372]],1700);move(people["honest-ana"],[[580,220],[748,290]],1800);move(people["cheater-cal"],[[580,200],[748,206]],2000)});
 W(2100,function(){ledKind("","contender_registered");ledKind("","evaluation_submitted","evaluation_submitted")});
 // cheater at the door: guard
 W(1200,function(){lamp(0,false);var gd=person("guard",9,"security");gd.x=800;gd.y=470;place(gd);move(gd,[[770,214]],900);
  rx("bad",null,"Blind eval: no_eval_tampering ✗, scope_compliance ✗, security_policy ✗","fail")});
 W(1300,function(){move(people["cheater-cal"],[[698,535]],1600);move(people.guard,[[730,530]],1600);led("bad",19,"contender_quarantined · cheater-cal");
  rx("bad",null,"reason: "+sc.quarantine.trigger+" (evidence "+sc.quarantine.evidence+")","#19");$("qreason").textContent=sc.quarantine.trigger+" · test/base-url.ts"});
 W(1600,function(){lamp(1,false);flagAt(765,350,"hidden tests ✗","#d2544c");rx("bad",null,"false-done-fay: hidden_oracle ✗, regressions ✗ (said done, wrote nothing)","fail")});
 W(1300,function(){people["false-done-fay"].turned=true;move(people["false-done-fay"],[[560,380],[330,470]],2000);rx("amb",null,"false-done-fay turned back at checkout","no bag")});
 W(1200,function(){lampsReset();var g=gateNames(ana);Object.keys(GATES).forEach(function(k,i){lamp(i,g[k])});rx("ok",null,"honest-ana: all 9 gates ✓ ("+short(ana.sha)+")","pass")});
 W(1200,function(){ledKind("","verifier_revealed");ledKind("","verifier_report_submitted");ledKind("ok","verdict_reached","verdict_reached · winner "+short(sc.summary.winner));verdict=true;$("approve").disabled=false});
 W(900,function(){promote()});
 W(3500,function(){});
}
function scale(){var s=sc;steps=[];
 stats([["claims granted",s.granted.toLocaleString(),"ok"],["overlaps flagged",s.overlaps_flagged+" / "+s.seeded_overlaps,"amb"],["false flags",s.false_flags,"ok"],["p50 / p95 ms",s.p50+" / "+s.p95,""],["claims/s",s.claims_per_s,""],["ledger chain",(s.ledger_entries||"")+" · "+(s.chain_ok?"OK":"FAIL"),s.chain_ok?"ok":"bad"]]);
 $("legend").innerHTML="Crowd is a <b>visualization</b> (300 figures stand for 3,000 claims); every counter is <b>REAL</b> from the recorded run. "+esc(s.note);
 var names=["agents/a1-500/","agents/a501-1000/","agents/a1001-1500/","agents/a1501-2000/","agents/a2001-2500/","agents/a2501-3000/"];
 names.forEach(function(n,i){shopAt(n,i,6,["**"])});
 var crowd=S("g"),dots=[],counter=T("0 claims",{x:698,y:100,"text-anchor":"middle","font-size":26,"font-weight":800,fill:"#3b2f2a","font-family":"Georgia,serif"}),ovc=T("0 overlaps flagged",{x:698,y:124,"text-anchor":"middle","font-size":13,"font-weight":700,fill:"#b07a17"});
 for(var i=0;i<300;i++){var c=PAL[i%PAL.length],g=S("g",{},crowd);S("circle",{cx:0,cy:-5,r:3,fill:"#f3c9a5"},g);S("rect",{x:-3,y:-2,width:6,height:7,rx:2.5,fill:c},g);var p={g:g,x:20,y:260+Math.random()*80,i:i,ov:(i%20===0)};place(p);dots.push(p)}
 rx("",0,"authority_created","");rx("note",null,"3,000 agents each claim agents/aN/**","");
 var b=0;for(var k=0;k<10;k++)(function(k){W(1100,function(){for(var j=k*30;j<k*30+30;j++){var p=dots[j],sh=shops[names[j%6]];var tx=sh.x+14+Math.random()*(sh.w-28),ty=sh.y+48+Math.random()*(sh.h-62);
  if(instant){p.x=tx;p.y=ty;place(p)}else move(p,[[150,280+Math.random()*40],[tx,ty]],1500+Math.random()*900);
  if(p.ov){var f=S("circle",{cx:tx,cy:ty-12,r:4,fill:"#e0a43a","class":"pop"})}}
  var n=Math.round(s.granted*(k+1)/10),o=Math.round(s.overlaps_flagged*(k+1)/10);counter.textContent=n.toLocaleString()+" claims";ovc.textContent=o+" overlaps flagged";
  rx(k===9?"ok":"",null,"claim_registered × "+(n-b).toLocaleString()+" (Σ "+n.toLocaleString()+")","");b=n})})(k);
 W(1200,function(){rx("amb",null,s.overlaps_flagged+" of "+s.seeded_overlaps+" seeded overlaps flagged · "+s.false_flags+" false flags","");rx(s.chain_ok?"ok":"bad",null,"ledger: "+s.ledger_entries+" entries · hash chain "+(s.chain_ok?"OK":"FAIL"),"");rx("",null,"errors: "+s.errors+" · p50 "+s.p50+" ms · p95 "+s.p95+" ms","")});
 W(3000,function(){});
 $("approve").disabled=true}
// ---------- engine ----------
function load(id){stop();sc=D.scenarios.filter(function(x){return x.id===id})[0]||D.scenarios[0];
 document.querySelectorAll(".sc button").forEach(function(b){b.setAttribute("aria-pressed",b.dataset.id===sc.id)});
 $("badge").textContent=sc.badge+" data · illustrated";$("badge").className="badge "+(sc.badge==="REAL"?"real":"viz");
 common();({crew:crew,cheater:cheater,scale:scale})[sc.id]();
 det('<h3>'+esc(sc.label)+'</h3><div class="row"><b>task</b><span class="mono">'+esc(sc.task)+'</span></div><div class="row" style="color:var(--dim)">Click a shop (directory) or a shopper (agent) for the recorded details.</div>')}
function step(){if(si>=steps.length){if($("loop").checked&&playing){var id=sc.id;load(id);playing=true;$("play").textContent="❚❚ Pause"}else{stop();return}}
 var s=steps[si++];s.fn();if(playing)timer=setTimeout(step,s.ms/speed())}
function runTo(n){instant=true;tweens=[];while(si<n&&si<steps.length)steps[si++].fn();instant=false;Object.keys(people).forEach(function(k){people[k].g.classList.add("still")})}
function play(){if(si>=steps.length)load(sc.id);playing=true;$("play").textContent="❚❚ Pause";step()}
function stop(){playing=false;clearTimeout(timer);$("play").textContent="▶ Play"}
$("play").onclick=function(){playing?stop():play()};$("restart").onclick=function(){load(sc.id)};
$("approve").onclick=function(){if(!verdict||promoted)return;rx("note",null,"Approve: replaying the recorded promotion (no live call)","");promote()};
$("override").onclick=function(){$("refuse").textContent="Refused: mandatory gates cannot be waived"};
D.scenarios.forEach(function(x){var b=document.createElement("button");b.textContent=x.label;b.dataset.id=x.id;b.onclick=function(){load(x.id)};$("sc").appendChild(b)});
var qs=new URLSearchParams(location.search);if(qs.get("speed"))$("speed").value=qs.get("speed");if(qs.get("loop")==="1")$("loop").checked=true;
load(qs.get("scenario")||"crew");if(qs.get("step")){document.body.classList.add("static");runTo(parseInt(qs.get("step"),10)||0)}if(qs.get("agent"))showAgent(qs.get("agent"));if(qs.get("shop")&&shops[qs.get("shop")])showShop(shops[qs.get("shop")]);else if(qs.get("autoplay")==="1")play();
window.__board={runTo:runTo,steps:function(){return steps.length},load:load,showAgent:showAgent,showShop:function(n){showShop(shops[n])}};
})();
</script></body></html>`;
