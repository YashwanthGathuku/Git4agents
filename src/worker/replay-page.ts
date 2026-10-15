/**
 * GET /replay — a self-contained animated replay (HTML + CSS + JS, no CDN).
 *
 * Scenario "live" replays the REAL hash-chained ledger and progress lines of
 * the verified Cloudflare run task_6cdb2087a04e389edc87de1c (replay-data.ts).
 * Scenario "attacks" is SIMULATED FROM THE TEST HARNESS: each beat quotes an
 * outcome that `npm run slice`, `npm run headmove`, test/fork-crew.test.ts or
 * test/verdict-seam.test.ts produce locally against the real protocol modules.
 */
import { LIVE_RUN } from "./replay-data.ts";

type Lane = "parent" | "api" | "ui" | "queue" | "authority" | "eval" | "ustad" | "permit" | "canon" | "verify";

interface Beat {
	lane: Lane;
	title: string;
	detail: string;
	tone?: "ok" | "bad" | "warn";
	seqs?: number[];
	gates?: string[];
}

const short = (s: string) => s.slice(0, 7);
const ship = LIVE_RUN.ship;

/** Gate names and results are copied from the run's evaluation bundle (live-run-final-4.log). */
const LIVE_GATES = [
	"exact_baseline", "scope_compliance", "valid_tool_states", "no_eval_tampering", "provenance_complete",
	"hidden_oracle 1/1", "regressions 1/1", "static_analysis", "semantic_checks 1/1", "security_policy", "merge_artifact_scan COMPLETE",
];

export const LIVE_BEATS: Beat[] = [
	{ lane: "authority", title: "Task frozen", detail: "TaskAuthority Durable Object created; verifier, operator and agent keys registered.", seqs: [0, 1, 2, 3] },
	{ lane: "authority", title: "Blind verifiers commit first", detail: "3 verifiers commit hashed references before any candidate exists (commit-then-reveal).", seqs: [4, 5, 6] },
	{ lane: "parent", title: "Parent forks once", detail: "parent forks the Artifacts repo into one task fork; sub-agents work on that fork.", seqs: [7, 8] },
	{ lane: "api", title: "sub-api claims src/api/**", detail: "WorkClaim registered for paths src/api/** only.", seqs: [9] },
	{ lane: "ui", title: "sub-ui claims src/ui/**", detail: "WorkClaim registered for paths src/ui/** only.", seqs: [10] },
	{ lane: "api", title: "sub-api commit lands", detail: "commit 5eb39dc on the task fork (src/api/runs.txt).", tone: "ok" },
	{ lane: "ui", title: "sub-ui commit lands", detail: "commit 38d6c8e on the task fork (src/ui/runs.txt).", tone: "ok" },
	{ lane: "parent", title: "Combine: COMPOSED", detail: "Parent runs a per-file three-way combine of both lane commits (overlapping lines would be CONFLICTED). Here the lanes were disjoint, so it COMPOSED a6dcb9d; with the .madgrix intent and tool-status records the candidate is " + short(ship.commit) + ".", tone: "ok" },
	{ lane: "queue", title: "Push event → Cloudflare Queue", detail: "Artifacts push event delivered at-least-once to the madgrix queue consumer. (The first combined push was not applied; the harness pushed again, as logged.)" },
	{ lane: "authority", title: "Queue → TaskAuthority DO", detail: "Event reconciled into the ledger; composition recorded for exactly " + short(ship.commit) + ".", seqs: [11, 12] },
	{ lane: "eval", title: "Independent evaluation", detail: "Separate evaluation domain checks the immutable candidate. Every mandatory gate is non-compensatory.", seqs: [13], gates: LIVE_GATES, tone: "ok" },
	{ lane: "authority", title: "Reveal + signed reports", detail: "Anonymized labels assigned; verifiers reveal, then submit 3 signed reports.", seqs: [14, 15, 16, 17, 18, 19, 20] },
	{ lane: "ustad", title: "TheUstad: FINAL VERIFIED", detail: "The done-check confirms the combined commit " + short(ship.commit) + " sits on the frozen baseline with a clean parent. A wrong baseline would be FINAL FALSIFIED.", tone: "ok" },
	{ lane: "permit", title: "Verdict ACCEPT → single-use permit", detail: "Permit " + ship.permit_id.slice(0, 12) + "… bound to SHA " + short(ship.commit) + ", tree " + ship.tree_sha256.slice(0, 12) + "…, base " + short(ship.base) + ".", seqs: [21, 22], tone: "ok" },
	{ lane: "canon", title: "Exact SHA promoted", detail: "Promotion reserved and succeeded: canonical = " + ship.commit + ".", seqs: [23, 24], tone: "ok" },
	{ lane: "verify", title: "Offline verify: VERIFIED", detail: "Signed bundle checked offline against the pinned authority key: signature VALID, ledger chain OK.", tone: "ok" },
];

export const SIM_BEATS: Beat[] = [
	{ lane: "eval", title: "Tamperer edits the evaluator", detail: "contender-3 modifies an evaluation file: admission.no_eval_tampering = false. (npm run slice)", tone: "warn" },
	{ lane: "authority", title: "QUARANTINED", detail: "Mechanical trigger eval_file_modification: contender quarantined, bundle tainted, write token revoked. A later push fails TOKEN_REVOKED.", tone: "bad" },
	{ lane: "permit", title: "Admin override refused", detail: "A failed mandatory gate plus a unanimous 3-verifier ACCEPT still yields REJECT. There is no override input; escalation blocks permits. (test/verdict-seam.test.ts, test/task-state.test.ts)", tone: "bad" },
	{ lane: "ustad", title: "False 'done' → FINAL FALSIFIED", detail: "The crew claims done against a wrong frozen baseline; TheUstad blocks the combined commit and HEAD is unchanged. (test/fork-crew.test.ts)", tone: "bad" },
	{ lane: "canon", title: "Head moved → permit refused", detail: "Destination HEAD moved under an issued permit: EXPIRED_HEAD_MOVED, permit unconsumed; same SHA gets REBASE_REQUIRED. (npm run headmove)", tone: "bad" },
	{ lane: "parent", title: "Rebased → new SHA → fresh evidence", detail: "The rebase service replays the candidate as a NEW commit, it is re-evaluated, gets a new permit, and PROMOTES.", tone: "ok" },
	{ lane: "verify", title: "0 unauthorized promotions", detail: "Attack lab: 26/26 adversarial trials passed against the real modules. (node scripts/attack-lab.ts)", tone: "ok" },
];

const LANES: Array<[Lane, string, string]> = [
	["parent", "parent", "agent"], ["api", "sub-api", "agent"], ["ui", "sub-ui", "agent"],
	["queue", "Queue", "Cloudflare Queues"], ["authority", "TaskAuthority", "Durable Object"], ["eval", "Evaluation", "Container / evaluator"],
	["ustad", "TheUstad", "done-check"], ["permit", "Verdict + permit", "exact-state, single-use"], ["canon", "Canonical", "Artifacts"], ["verify", "Offline verify", "pinned key"],
];

function safeJson(v: unknown): string {
	return JSON.stringify(v).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

export function renderReplayPage(): string {
	const data = {
		live: { beats: LIVE_BEATS, ledger: LIVE_RUN.ledger, label: "REAL — recorded live Cloudflare run " + LIVE_RUN.task_id },
		sim: { beats: SIM_BEATS, ledger: [], label: "SIMULATED FROM TEST HARNESS — local runs of the real protocol modules, not a live deployment" },
		lanes: LANES,
		verify: LIVE_RUN.verify,
	};
	return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Git4agents replay</title>
<style>
:root{--bg:#0b0f14;--panel:#121923;--line:#223042;--fg:#e6edf3;--dim:#8b9bb0;--ok:#2ecc71;--bad:#ff5c5c;--warn:#f5b041;--acc:#58a6ff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:18px/1.45 ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif}
header{display:flex;align-items:center;gap:1rem;padding:14px 24px;border-bottom:1px solid var(--line)}
h1{font-size:26px;margin:0}h1 small{color:var(--dim);font-weight:400;font-size:16px}
.tabs button,.ctl button,.ctl select{background:var(--panel);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:8px 14px;font:inherit;cursor:pointer}
.tabs button[aria-pressed=true]{border-color:var(--acc);color:var(--acc)}
.ctl{margin-left:auto;display:flex;gap:8px;align-items:center}
#banner{padding:8px 24px;font-weight:700;letter-spacing:.02em}#banner.live{background:#0f2a1a;color:var(--ok)}#banner.sim{background:#33240b;color:var(--warn)}
main{display:grid;grid-template-columns:1.25fr 1fr;gap:18px;padding:18px 24px}
.lanes{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
.lane{background:var(--panel);border:2px solid var(--line);border-radius:12px;padding:12px;min-height:96px;transition:all .35s}
.lane b{display:block;font-size:19px}.lane span{color:var(--dim);font-size:14px}
.lane.on{border-color:var(--acc);box-shadow:0 0 22px #58a6ff55}.lane.ok{border-color:var(--ok)}.lane.bad{border-color:var(--bad);box-shadow:0 0 22px #ff5c5c55}.lane.warn{border-color:var(--warn)}
#now{margin-top:18px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px;min-height:190px}
#now h2{margin:0 0 6px;font-size:30px}#now p{margin:0;color:#c9d4e0;font-size:20px}
.gates{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.gate{padding:4px 10px;border-radius:999px;border:1px solid var(--line);color:var(--dim);font-size:15px;transition:all .3s}.gate.g{border-color:var(--ok);color:var(--ok);background:#0f2a1a}
.ok h2{color:var(--ok)}.bad h2{color:var(--bad)}.warn h2{color:var(--warn)}
#prog{height:6px;background:var(--line);border-radius:3px;margin-top:14px}#prog i{display:block;height:100%;background:var(--acc);width:0;transition:width .3s}
aside{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px;max-height:calc(100vh - 150px);overflow:auto}
aside h3{margin:4px 0 8px;font-size:16px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em}
.row{font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;padding:3px 6px;border-radius:6px;color:#5d6d80;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row.done{color:var(--fg)}.row.hot{background:#18304d;color:#fff}.row em{color:var(--acc);font-style:normal}
#log .row.done{white-space:normal}
footer{padding:0 24px 18px;color:var(--dim);font-size:14px}a{color:var(--acc)}
</style></head><body>
<header><h1>Git4agents <small>replay · the trust layer for agent-written code</small></h1>
<div class="tabs"><button id="t-live" aria-pressed="true">Live run (real)</button> <button id="t-sim" aria-pressed="false">Attacks (simulated)</button></div>
<div class="ctl"><button id="play">▶ Play</button><button id="restart">⟲</button>
<label>speed <select id="speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></label></div></header>
<div id="banner" class="live"></div>
<main><section><div class="lanes" id="lanes"></div>
<div id="now"><h2>Press play</h2><p>Step through the recorded run.</p><div class="gates" id="gates"></div><div id="prog"><i></i></div></div></section>
<aside><h3 id="lh">Hash-chained ledger</h3><div id="ledger"></div><h3>Events</h3><div id="log"></div></aside></main>
<footer>Ledger kinds, timestamps and hashes are copied verbatim from the run's signed bundle; tokens, payloads and signatures are omitted. <a href="/">Home</a> · <a href="https://github.com/YashwanthGathuku/Madgrix">Source</a></footer>
<script id="replay-data" type="application/json">${safeJson(data)}</script>
<script>
(function(){
var D=JSON.parse(document.getElementById('replay-data').textContent);
var sc='live',i=-1,timer=null,playing=false;
var $=function(id){return document.getElementById(id)};
function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.textContent=h;return e}
D.lanes.forEach(function(l){var d=el('div','lane');d.id='L-'+l[0];d.appendChild(el('b',null,l[1]));d.appendChild(el('span',null,l[2]));$('lanes').appendChild(d)});
function reset(){i=-1;var S=D[sc];$('banner').textContent=S.label;$('banner').className=sc;
$('ledger').innerHTML='';$('log').innerHTML='';$('gates').innerHTML='';$('lh').style.display=S.ledger.length?'':'none';
S.ledger.forEach(function(e){var r=el('div','row');r.id='S-'+e.seq;r.innerHTML='';r.appendChild(el('em',null,('0'+e.seq).slice(-2)+' '));r.appendChild(document.createTextNode(e.kind+'  '+e.entry_hash.slice(0,12)+'…'));r.title=e.ts+' prev '+e.prev_hash;$('ledger').appendChild(r)});
document.querySelectorAll('.lane').forEach(function(x){x.className='lane'});
$('now').className='';$('now').querySelector('h2').textContent='Press play';$('now').querySelector('p').textContent=sc==='live'?'Step through the recorded run.':'Each beat is reproduced by a local harness or test.';prog()}
function prog(){$('prog').firstChild.style.width=((i+1)/D[sc].beats.length*100)+'%'}
function step(){var B=D[sc].beats;if(i>=B.length-1){stop();return}i++;var b=B[i];
document.querySelectorAll('.lane.on').forEach(function(x){x.classList.remove('on')});
var L=$('L-'+b.lane);L.className='lane on'+(b.tone?' '+b.tone:'');
$('now').className=b.tone||'';$('now').querySelector('h2').textContent=b.title;$('now').querySelector('p').textContent=b.detail;
var g=$('gates');g.innerHTML='';(b.gates||[]).forEach(function(n,k){var s=el('span','gate',n);g.appendChild(s);setTimeout(function(){s.classList.add('g')},(150+k*180)/speed())});
document.querySelectorAll('.row.hot').forEach(function(x){x.classList.remove('hot')});
(b.seqs||[]).forEach(function(q){var r=$('S-'+q);if(r){r.classList.add('done','hot');r.scrollIntoView({block:'nearest'})}});
var lr=el('div','row done',(i+1)+'. '+b.title);$('log').appendChild(lr);lr.scrollIntoView({block:'nearest'});
if(sc==='live'&&i===B.length-1){D.verify.forEach(function(v){$('log').appendChild(el('div','row done',v))})}
prog();if(playing)timer=setTimeout(step,(b.gates?4200:2600)/speed())}
function speed(){return parseFloat($('speed').value)}
function play(){if(i>=D[sc].beats.length-1)reset();playing=true;$('play').textContent='❚❚ Pause';step()}
function stop(){playing=false;clearTimeout(timer);$('play').textContent='▶ Play'}
$('play').onclick=function(){playing?stop():play()};$('restart').onclick=function(){stop();reset()};
function tab(s){stop();sc=s;$('t-live').setAttribute('aria-pressed',s==='live');$('t-sim').setAttribute('aria-pressed',s==='sim');reset()}
$('t-live').onclick=function(){tab('live')};$('t-sim').onclick=function(){tab('sim')};
var q=new URLSearchParams(location.search);if(q.get('scenario')==='sim')sc='sim';if(q.get('speed'))$('speed').value=q.get('speed');
tab(sc);if(q.get('autoplay')==='1')play();
})();
</script></body></html>`;
}
