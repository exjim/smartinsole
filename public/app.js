(function(){
'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS=NewdicDB.LS;
const STAGES=[{n:1,name:'비체중',pct:0},{n:2,name:'발끝 접지',pct:.10},{n:3,name:'부분 체중',pct:.20},{n:4,name:'점진 증가',pct:.30},{n:5,name:'완전 체중',pct:1}];
const calcLimit=(w,st)=>Math.round((+w||0)*STAGES[st-1].pct*10)/10;
const maxKg=p=>Math.max(18,Math.ceil((p.limit||0)*1.4));
const sum=(a,k)=>a.reduce((x,s)=>x+(+s[k]||0),0);
const dayKey=t=>{const d=new Date(t);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()};
const startOfWeek=()=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getTime()};
const agg=a=>{const st=sum(a,'steps'),ov=sum(a,'over');return{n:a.length,steps:st,over:ov,comp:st?Math.round((st-ov)/st*100):null,max:a.length?Math.max(...a.map(s=>+s.max||0)):0}};
const pad=n=>String(n).padStart(2,'0');
const fmtT=t=>{const d=new Date(t);const hm=pad(d.getHours())+':'+pad(d.getMinutes());return dayKey(t)===dayKey(Date.now())?'오늘 '+hm:(d.getMonth()+1)+'/'+d.getDate()+' '+hm};
const fmtDur=s=>{s=Math.round(s);return Math.floor(s/60)+'분 '+pad(s%60)+'초'};
const fmtClock=s=>pad(Math.floor(s/60))+':'+pad(s%60);
const f1=n=>(Math.round(n*10)/10).toFixed(1);
const gauss=()=>{let u=0;for(let i=0;i<6;i++)u+=Math.random();return (u-3)/.7};

const dv=(k,d='')=>(S.draft&&S.draft[k]!=null)?esc(S.draft[k]):esc(d);
const S={db:null,user:null,patient:null,sessions:[],route:'start',authTab:'up',role:'patient',err:'',modal:null,prepStep:0,devOk:true,R:null,pain:2,preview:null,r:{sel:null,q:'',patients:[],sessions:[]},a:{tab:'overview',users:[]},inbox:[],seen:new Set(),unsub:null,msgKind:'기타',myMsgs:[]};
const W={run:false,t:0,steps:0,over:0,run3:0,max:0,peaks:[],cur:0,load:8,ti:null,si:null,start:0,wasRun:false,lastVoice:0};

/* ---------- SVG helpers ---------- */
const SOLE='M74 4 C 98 4,114 22,114 52 C 114 80,108 102,97 126 C 88 146,84 166,87 190 C 90 214,94 232,86 246 C 78 258,46 258,36 246 C 26 234,28 214,30 194 C 32 164,18 136,12 102 C 7 72,9 40,22 20 C 34 6,54 4,74 4 Z';
const PTS=[[78,34],[94,84],[66,80],[32,96],[84,146],[42,154],[76,220],[48,222]];
const PW=[.85,.7,.5,.35,.3,.25,.9,.6];
let gid=0;
function sole({w=150,level=0,limit=null,dark=false,over=false,ratio=0,mirror=false}){
 const h=Math.round(w*260/126),id=++gid,base=dark?'#12382A':'#FFFFFF',st=over?['#FF8A7E','#D63B35','#A2231F']:['#39F65A','#0A9A54','#076C3B'];
 const yl=Math.round(260-Math.max(0,Math.min(1,level))*256),p=yl/260;
 const grad=level>0.001?`<stop offset="0" stop-color="${base}"/><stop offset="${p}" stop-color="${base}"/><stop offset="${p}" stop-color="${st[0]}"/><stop offset="${p+(1-p)*.5}" stop-color="${st[1]}"/><stop offset="1" stop-color="${st[2]}"/>`:`<stop offset="0" stop-color="${base}"/><stop offset="1" stop-color="${base}"/>`;
 const tr=mirror?' transform="translate(126 0) scale(-1 1)"':'';
 let pts='';PTS.forEach((q,i)=>{const x=mirror?126-q[0]:q[0],y=q[1],v=Math.min(1,PW[i]*ratio),r=3+v*7,hot=over&&i<2&&ratio>0,inFill=y>=yl&&!hot;const c=hot?(dark?'#FF7A70':'#D63B35'):(inFill?'#FFFFFF':(dark?'#39F65A':'#076C3B'));pts+=`<circle cx="${x}" cy="${y}" r="${r*2.1}" fill="${c}" opacity="${hot?.25:.15}"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="${inFill?.85:1}"/>`});
 const ly=limit!=null?Math.round(260-limit*256):null;
 const lim=ly!=null?`<line x1="0" y1="${ly}" x2="126" y2="${ly}" stroke="${dark?'#fff':'#0F2A1E'}" stroke-width="2.25" stroke-dasharray="5 5" clip-path="url(#c${id})"/>`:'';
 return `<svg width="${w}" height="${h}" viewBox="0 0 126 260" role="img" aria-label="발 하중"><defs><linearGradient id="g${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="260">${grad}</linearGradient><clipPath id="c${id}"><path d="${SOLE}"${tr}/></clipPath></defs><path d="${SOLE}"${tr} fill="url(#g${id})" stroke="${dark?'rgba(255,255,255,.18)':'#C9D6CE'}" stroke-width="2.5"/>${lim}${pts}</svg>`;
}
const IC={home:'<path d="M4 11 12 4l8 7v9H4z"/>',log:'<path d="M5 19V9M12 19V5M19 19v-7"/>',rx:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 9h6M9 13h6M9 17h3"/>',set:'<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',warn:'<path d="M12 3.5 21.5 20h-19z"/><path d="M12 10v4.5M12 17v.2"/>',check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',back:'<path d="M15 5l-7 7 7 7"/>'};
const ico=(k,sz=24,c='currentColor')=>`<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[k]}</svg>`;

function lineChart(peaks,limit,mx,W_=318,H=130){
 const n=peaks.length;if(n<2)return `<div class="empty" style="padding:30px 0">걸음이 더 쌓이면 그래프가 나타나요</div>`;
 let pts=peaks;if(n>90){const k=n/90;pts=[];for(let i=0;i<90;i++){const a=Math.floor(i*k),b=Math.max(a+1,Math.floor((i+1)*k));pts.push(Math.max(...peaks.slice(a,b)))}}
 const y=v=>H-8-Math.min(v,mx)/mx*(H-16),d=pts.map((v,i)=>(i?'L':'M')+(i/(pts.length-1)*W_).toFixed(1)+' '+y(v).toFixed(1)).join(' '),ly=y(limit);
 return `<svg viewBox="0 0 ${W_} ${H}" width="100%" role="img" aria-label="걸음별 최대 하중"><defs><clipPath id="ca"><rect width="${W_}" height="${ly}"/></clipPath><clipPath id="cb"><rect y="${ly}" width="${W_}" height="${H-ly}"/></clipPath></defs><rect y="${ly}" width="${W_}" height="${H-ly}" fill="#E4F6EA" opacity=".5"/><path d="${d}" fill="none" stroke="#D63B35" stroke-width="2.5" stroke-linejoin="round" clip-path="url(#ca)"/><path d="${d}" fill="none" stroke="#0A9A54" stroke-width="2.5" stroke-linejoin="round" clip-path="url(#cb)"/><line x1="0" y1="${ly}" x2="${W_}" y2="${ly}" stroke="#0F2A1E" stroke-width="1.5" stroke-dasharray="5 5"/></svg>`;
}

/* ---------- 공통 ---------- */
function toast(m){const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2200)}
const demoBar=()=>S.db&&S.db.mode==='local'?`<div class="demo">체험 모드 · 이 브라우저에만 저장됩니다</div>`:'';
const pvBar=()=>S.preview?`<div class="pv-bar"><span>미리보기 · ${esc(S.patient.name||S.patient.studyId)} (${esc(S.patient.studyId)})</span><button data-act="exit-preview">${S.preview.from==='admin'?'관리자 화면':'연구자 웹'}으로 돌아가기</button></div>`:'';
const ph=(cls,inner)=>`<div class="phone ${cls}">${pvBar()}${demoBar()}${inner}${modalHtml()}</div>`;
const tabbar=a=>`<nav class="tb">${[['home','홈','home'],['log','기록','log'],['rx','처방','rx'],['settings','설정','set']].map(([r,l,i],k)=>`<button class="${a===k?'on':''}" data-act="go" data-r="${r}" aria-label="${l}">${ico(i)}${l}</button>`).join('')}</nav>`;
function go(r){S.route=r;S.err='';S.draft=null;S.modal=null;if(r!=='walk')stopWalkTimers();if(r==='prep')prepStart();render();window.scrollTo(0,0)}
function stopWalkTimers(){clearInterval(W.ti);clearInterval(W.si);W.ti=W.si=null}
function applyMode(){document.body.classList.toggle('senior',S.user&&S.user.mode==='senior')}

/* ---------- 화면: 시작·가입 ---------- */
function vStart(){return ph('dark',`<div class="scr pad-b"><div class="brand"><i class="logo"></i>NEWDIC</div>
<h1 style="font-size:2rem;margin-top:26px">걸음마다 재고,<br>넘는 순간 알립니다</h1><p class="sub">수술한 발에 실리는 무게를 인솔이 재고, 처방 한도를 넘으면 바로 알려 드립니다.</p>
<div style="display:flex;justify-content:center;margin:12px 0">${sole({w:150,level:.55,limit:.6,dark:true,ratio:.8})}</div><div class="sp"></div>
<button class="btn bright" data-act="go" data-r="auth">시작하기</button><p class="sub" style="text-align:center;font-size:.75rem">충북대학교병원 재활의학과 연구 참여용</p></div>`)}
function vAuth(){const up=S.authTab==='up',res=S.role!=='patient',adm=S.role==='admin';
 return ph('',`<div class="scr pad-b"><div class="row" style="flex:none;margin-bottom:14px"><button class="btn ghost sm" style="flex:none" data-act="go" data-r="start">${ico('back',18)} 처음으로</button></div>
<h2>${up?'간편 가입':'로그인'}</h2><p class="sub">${up?'이름, 이메일, 비밀번호만 있으면 됩니다.':'가입한 이메일로 로그인하세요.'}</p>
<div class="tabs" style="margin:16px 0 4px"><button class="${up?'':'on'}" data-act="tab" data-v="in">로그인</button><button class="${up?'on':''}" data-act="tab" data-v="up">간편 가입</button></div>
<form data-form="auth" autocomplete="on">
${up?`<span class="lbl">가입 유형</span><div class="tabs"><button type="button" class="${S.role==='patient'?'on':''}" data-act="role" data-v="patient">환자</button><button type="button" class="${S.role==='researcher'?'on':''}" data-act="role" data-v="researcher">연구자</button><button type="button" class="${adm?'on':''}" data-act="role" data-v="admin">관리자</button></div><label class="lbl" for="f-name">이름</label><input id="f-name" class="inp" name="name" required maxlength="30" autocomplete="name" placeholder="홍길동" value="${dv('name')}">`:''}
<label class="lbl" for="f-email">이메일</label><input id="f-email" class="inp" type="email" name="email" required autocomplete="email" placeholder="name@example.com" value="${dv('email')}">
<label class="lbl" for="f-pw">비밀번호${up?' (6자 이상)':''}</label><input id="f-pw" class="inp" type="password" name="password" required minlength="6" autocomplete="${up?'new-password':'current-password'}">
${up&&res?`<label class="lbl" for="f-code">${adm?'관리자':'연구자'} 가입 코드</label><input id="f-code" class="inp" name="code" required placeholder="${adm?'관리자 코드':'연구팀에서 받은 코드'}" value="${dv('code')}"><label class="lbl" for="f-org">소속 (선택)</label><input id="f-org" class="inp" name="org" placeholder="예: Faircode" value="${dv('org')}">`:''}
${up&&!res?`<div class="hint">가입 뒤 담당 연구원이 알려 준 <b>연구번호</b>를 입력하면 처방과 연결됩니다.</div>`:''}
${S.err?`<div class="err" role="alert">${esc(S.err)}</div>`:''}
<div style="height:18px"></div><button class="btn" type="submit" ${S.busy?'disabled':''}>${up?'가입하고 시작':'로그인'}</button></form></div>`)}
function vLink(){const demo=S.db.mode==='local';
 return ph('',`<div class="scr pad-b"><h2>연구번호를 입력하세요</h2><p class="sub">담당 연구원이 알려 준 번호입니다. 입력하면 내 처방(한도)이 앱에 연결됩니다.</p>
<form data-form="link"><label class="lbl" for="f-sid">연구번호</label><input id="f-sid" class="inp" name="studyId" required placeholder="예: NDX-0001" autocapitalize="characters" autocomplete="off" value="${dv('studyId')}">
${demo?`<div class="hint">체험 모드에는 <b>NDX-0001</b>~<b>NDX-0005</b> 샘플 환자가 들어 있습니다. 연구자 계정으로 가입하면 새 환자도 등록할 수 있어요.</div>`:''}
${S.err?`<div class="err" role="alert">${esc(S.err)}</div>`:''}<div style="height:18px"></div><button class="btn" type="submit">연결하기</button></form>
<div class="sp"></div><button class="btn ghost" style="margin-top:12px" data-act="logout">로그아웃</button></div>`)}
function vConsent(){const c=S.consent||{a:false,b:false,c:false},all=c.a&&c.b&&c.c;
 const row=(k,t,s)=>`<div class="chk ${c[k]?'on':''}" data-act="chk" data-k="${k}" role="checkbox" aria-checked="${!!c[k]}" tabindex="0"><i>${ico('check',16)}</i><div><b>${t}</b><span>${s}</span></div></div>`;
 return ph('',`<div class="scr pad-b"><h2>시작하기 전에<br>확인해 주세요</h2><p class="sub">연구 참여 동의와 권한이 필요합니다.</p>
<div class="card" style="margin-top:14px;padding:4px 16px">${row('a','연구 참여 동의서','연구 목적과 참여 방법, 철회 방법을 확인했습니다')}${row('b','수집 정보 안내','걸음 수, 하중, 통증 점수가 연구번호로 저장됩니다')}${row('c','데이터 사용과 보관','연구 목적 외에는 쓰지 않으며 개인 식별 정보는 분리합니다')}</div>
<div class="card" style="margin-top:12px;padding:4px 16px"><div class="list-row"><div class="sp"><b>블루투스</b><span class="s">인솔 연결에 필요합니다</span></div><button class="tog on" aria-label="블루투스" data-act="tog-vis"></button></div><div class="list-row"><div class="sp"><b>알림</b><span class="s">한도 초과와 연습 알림</span></div><button class="tog on" aria-label="알림" data-act="tog-vis"></button></div></div>
<div class="sp"></div><button class="btn" style="margin-top:14px" data-act="consent" ${all?'':'disabled'}>동의하고 계속</button></div>`)}
function vMode(){const cur=S.user.mode||'normal',m=(k,t,s,big)=>`<button class="mode ${cur===k?'on':''}" data-act="mode" data-v="${k}"><div class="sp"><b>${t}</b><span>${s}</span></div><div class="pv"><div class="num" style="font-size:${big?'2.1':'1.5'}rem;color:var(--deep)">95<small style="font-size:.7rem">%</small></div><div style="height:${big?'22':'8'}px;border-radius:6px;background:var(--deep);margin-top:6px"></div></div></button>`;
 return ph('',`<div class="scr pad-b"><h2>어떤 화면이<br>편하신가요?</h2><p class="sub">설정에서 언제든 바꿀 수 있습니다.</p><div style="display:grid;gap:12px;margin-top:18px">${m('normal','일반 모드','걸음별 하중과 센서 분포까지 자세히 봅니다. 글자는 보통 크기입니다.',false)}${m('senior','시니어 모드','큰 글자와 큰 버튼, 한 화면에 한 가지만 보여 줍니다. 음성 안내가 기본입니다.',true)}</div><div class="sp"></div><button class="btn" data-act="mode-next">${cur==='senior'?'시니어':'일반'} 모드로 시작</button></div>`)}
/* 인솔 준비 */
let prepTi=null;
function prepStart(){clearInterval(prepTi);S.prepStep=0;S.prepT=5;if(!S.devOk)return;prepTi=setInterval(()=>{if(S.route!=='prep'||!S.devOk){clearInterval(prepTi);return}S.prepT--;if(S.prepT<=0){S.prepStep++;S.prepT=5;if(S.prepStep>=3){clearInterval(prepTi)}}render()},1000)}
function vPrep(){const st=S.prepStep,done=st>=3,l=S.user.settings||{};
 const step=(i,t,r)=>`<div class="list-row"><span class="pill ${st>i?'':st===i?'w':'g'}" style="min-width:26px;text-align:center">${st>i?'✓':i+1}</span><b class="sp" style="${st<i?'color:var(--ink3)':''}">${t}</b><span class="s">${st>i?'완료':st===i?r:''}</span></div>`;
 if(!S.devOk)return ph('',`<div class="scr pad-b"><h2>인솔 연결</h2><div class="alert" style="margin-top:14px;background:var(--overBg);border-color:var(--over);color:var(--ink)"><div style="color:var(--over)">${ico('warn',24)}</div><div><b>인솔이 연결되지 않았어요</b><span>신발에 넣고 전원을 켠 뒤 다시 찾아 보세요.</span></div></div><div class="card" style="margin-top:14px"><div class="list-row"><b class="sp">왼발 인솔</b><span class="pill o">연결 안 됨</span></div><div class="list-row"><b class="sp">오른발 인솔</b><span class="pill o">연결 안 됨</span></div></div><div class="sp"></div><button class="btn" data-act="dev-retry">다시 찾기</button><button class="btn ghost" style="margin-top:10px" data-act="go" data-r="home">나중에 하기</button></div>`);
 return ph('',`<div class="scr pad-b"><h2>인솔 준비</h2><p class="sub">신발에 넣고 신은 뒤, 한 발씩 영점을 맞춥니다.</p>
<div class="row" style="margin-top:14px"><div class="card" style="padding:12px"><span class="sub">왼발</span><div class="row" style="gap:6px"><span class="num" style="font-size:1.8rem">82</span><span class="pill">연결됨</span></div></div><div class="card" style="padding:12px"><span class="sub">오른발</span><div class="row" style="gap:6px"><span class="num" style="font-size:1.8rem">76</span><span class="pill">연결됨</span></div></div></div>
<div class="card" style="margin-top:12px;padding:4px 16px">${step(0,'왼발 영점','측정 중')}${step(1,'오른발 영점','측정 중')}${step(2,'걷기 검증','측정 중')}</div>
${done?`<div class="hint" style="text-align:center;font-size:1rem">준비가 끝났어요</div>`:`<div style="text-align:center;margin:14px 0"><span class="num" style="font-size:4.4rem;color:var(--deep)">${S.prepT}</span><span class="sub"> 초</span><p class="sub">${st===0?'왼발을 들고 가만히 서 주세요.':st===1?'오른발을 들고 가만히 서 주세요.':'제자리에서 가볍게 걸어 보세요.'}</p></div>`}
<div class="sp"></div><button class="btn ${done?'':'ghost'}" data-act="go" data-r="home">${done?'홈으로':'건너뛰기'}</button><button class="btn ghost" style="margin-top:10px;border:0;min-height:40px" data-act="dev-off">연결이 안 되나요?</button></div>`)}

/* ---------- 환자: 홈·걷기·결과 ---------- */
const todayList=()=>S.sessions.filter(s=>dayKey(s.start)===dayKey(Date.now()));
function railHtml(stage,dark){return `<div class="rail">${STAGES.map(s=>`<i class="${s.n<stage?'d':s.n===stage?'c':''}"></i>`).join('')}</div><div class="rail-l">${STAGES.map(s=>`<span class="${s.n===stage?'c':''}">${s.name}</span>`).join('')}</div>`}
function vHome(){const p=S.patient,td=agg(todayList()),M=maxKg(p),last=todayList()[0];
 const pct=td.comp==null?'–':td.comp;const ratio=td.max?Math.min(1,td.max/M):0;
 return ph('',`<div class="scr"><div class="row" style="flex:none"><div class="sp"><span class="sub">안녕하세요</span><h2>${esc(S.preview?(S.patient.name||S.patient.studyId):S.user.name)}님</h2></div><span class="pill g" style="flex:none">${esc(p.studyId)}</span></div>
<div style="margin:16px 0 6px">${railHtml(p.stage)}</div>
<div class="row" style="align-items:flex-end;gap:14px;margin-top:6px"><div style="flex:1.2"><span class="sub">오늘 순응</span><div><span class="num" style="font-size:5rem;color:var(--deep)">${pct}</span>${td.comp==null?'':'<span style="font-size:1.4rem;font-weight:700;color:var(--deep)">%</span>'}</div><span class="sub" style="font-size:.8rem">한도 ${f1(p.limit)}kg 이내로 걸은 비율</span></div><div style="flex:.8;text-align:center">${sole({w:92,level:ratio,limit:p.limit/M,ratio:ratio,over:td.max>p.limit})}</div></div>
<div class="band ${td.max>p.limit?'over':''}"><div class="f" style="width:${Math.min(100,td.max/M*100)}%"></div><div class="m" style="left:${p.limit/M*100}%"><em>한도 ${f1(p.limit)}</em></div></div><div class="axis"><span>0</span><span>${M}kg</span></div>
<div class="tally" style="margin:16px 0"><div><b>연습</b><span class="num">${td.n}</span><small>/2회</small></div><div><b>걸음</b><span class="num">${td.steps.toLocaleString()}</span></div><div><b>한도 초과</b><span class="num ${td.over?'over-t':''}">${td.over}</span><small>회</small></div><div><b>최대</b><span class="num">${td.max?f1(td.max):'–'}</span><small>kg</small></div></div>
<div class="card" style="padding:4px 16px"><b style="display:block;padding:12px 0 2px;font-size:.85rem;color:var(--ink2)">오늘의 연습</b>${todayList().length?todayList().map(s=>`<div class="list-row"><div class="sp"><b>${fmtT(s.start)}</b><span class="s">${fmtDur(s.durationSec)} · ${s.steps}걸음</span></div><span class="pill ${s.compliance>=85?'':s.compliance>=70?'w':'o'}">${s.compliance}%</span></div>`).join(''):'<div class="list-row"><span class="s">아직 연습 기록이 없어요. 아래 버튼으로 시작하세요.</span></div>'}</div>
<div style="height:14px"></div><button class="btn" data-act="walk-start">걷기 시작</button><div style="height:14px"></div></div>${tabbar(0)}`)}
function liveHtml(){const p=S.patient,M=maxKg(p),lim=p.limit,over=W.cur>lim,ratio=Math.min(1,W.cur/M);
 const last=W.peaks.slice(-12),pad0=12-last.length,td=W.steps?Math.round((W.steps-W.over)/W.steps*100):100;
 const spm=W.t>5?Math.round(W.steps/(W.t/60)):0;
 return `<div class="row" style="flex:none;justify-content:space-between"><span class="sub num" style="font-size:1.2rem">${fmtClock(W.t)}</span><span class="sub" style="font-weight:700;font-size:.85rem">한도 ${f1(lim)}kg</span></div>
<div style="display:flex;justify-content:center;align-items:flex-end;gap:18px;margin-top:6px"><div style="text-align:center">${sole({w:130,level:ratio,limit:lim/M,dark:true,over,ratio,})}<div class="sub" style="font-size:.7rem;font-weight:700">왼발, 수술한 발</div></div><div style="text-align:center">${sole({w:64,level:0,dark:true,mirror:true,ratio:.5})}<div class="sub" style="font-size:.7rem;font-weight:700">오른발</div></div></div>
<div style="text-align:center;margin-top:4px"><span class="num" style="font-size:5.6rem;color:${over?'var(--overDark)':'#fff'}">${f1(W.cur)}</span><span style="font-size:1.2rem;font-weight:700;opacity:.65"> kg</span><div class="sub">${!W.steps?'발을 디디면 하중이 나타납니다':over?`한도보다 ${f1(W.cur-lim)}kg 더 실렸습니다.`:`방금 왼발 피크 하중, 한도까지 ${f1(lim-W.cur)}kg`}</div></div>
<div class="band ${over?'over':''}" style="margin-top:22px"><div class="f" style="width:${Math.min(100,W.cur/M*100)}%"></div><div class="m" style="left:${lim/M*100}%"><em>${f1(lim)}</em></div></div><div class="axis"><span>0</span><span>${M}kg</span></div>
<div class="strip" style="margin-top:10px">${'<i style="height:3px"></i>'.repeat(pad0)}${last.map((v,i)=>`<i class="${v>lim?'h':i===last.length-1?'n':''}" style="height:${Math.max(5,Math.min(100,v/M*100))}%"></i>`).join('')}<u style="bottom:${lim/M*100}%"></u></div>
<div class="tally" style="margin-top:12px"><div><b>걸음</b><span class="num">${W.steps}</span></div><div><b>분당</b><span class="num">${spm}</span></div><div><b>초과</b><span class="num ${W.over?'over-t':''}">${W.over}</span></div><div><b>순응</b><span class="num">${td}</span><small>%</small></div></div>
${W.run3>=3?`<div class="alert" style="margin-top:12px">${ico('warn',22,'#FF7A70')}<div><b>목발에 더 기대세요</b><span>연속 ${W.run3}걸음 초과, 진동과 음성 안내 중</span></div></div>`:''}`}
function vWalk(){const p=S.patient;return ph('dark',`<div class="scr pad-b"><div id="live">${liveHtml()}</div><div class="sp"></div>
<div class="sim">인솔 없이 체험하는 중 · 지금 싣는 하중 <b id="loadv">${f1(W.load)}</b>kg<input type="range" min="0" max="${maxKg(p)}" step="0.1" value="${W.load}" data-bind="load" aria-label="체험용 하중"></div>
<div class="row" style="margin-top:12px"><button class="btn dghost" id="pbtn" data-act="w-pause">${W.run?'일시정지':'계속 걷기'}</button><button class="btn bright" data-act="w-end">마치기</button></div></div>`)}
function walkUpdate(){const el=$('#live');if(el)el.innerHTML=liveHtml();const pb=$('#pbtn');if(pb)pb.textContent=W.run?'일시정지':'계속 걷기'}
function walkStep(){const p=S.patient,M=maxKg(p);let v=Math.max(0,Math.min(M-.5,W.load+gauss()*.9));v=Math.round(v*10)/10;W.cur=v;W.steps++;W.peaks.push(v);if(v>W.max)W.max=v;if(v>p.limit){W.over++;W.run3++}else W.run3=0;
 if(W.run3>=3){const s=S.user.settings||{};if(s.vib!==false&&W.run3===3)try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch{}if(s.voice!==false&&Date.now()-W.lastVoice>6000){W.lastVoice=Date.now();try{const u=new SpeechSynthesisUtterance('목발에 더 기대세요');u.lang='ko-KR';speechSynthesis.speak(u)}catch{}}}
 walkUpdate()}
function walkBegin(){Object.assign(W,{run:true,t:0,steps:0,over:0,run3:0,max:0,peaks:[],cur:0,start:Date.now(),load:Math.round(S.patient.limit*.85*10)/10});stopWalkTimers();W.ti=setInterval(()=>{if(W.run){W.t++;walkUpdate()}},1000);W.si=setInterval(()=>{if(W.run)walkStep()},1300);go('walk')}
function walkFinish(){W.run=false;stopWalkTimers();const st=W.steps,dur=Math.max(1,W.t);S.R={steps:st,over:W.over,max:W.max,avg:st?sum(W.peaks.map(x=>({v:x})),'v')/st:0,spm:Math.round(st/(dur/60)),dur,comp:st?Math.round((st-W.over)/st*100):0,peaks:W.peaks.slice(),start:W.start};S.pain=2;go('result')}
function vResult(){const R=S.R,p=S.patient,M=maxKg(p),hi=S.pain>=4;
 const row=(v,i)=>`<span class="num" style="font-size:.9rem;color:${i===S.pain?'#fff':'var(--ink3)'}">${i}</span>`;
 return ph('',`<div class="scr pad-b"><h2>걷기 결과</h2>
<div style="margin-top:8px"><span class="num" style="font-size:5.2rem;color:var(--deep)">${R.comp}</span><span style="font-size:1.6rem;font-weight:700;color:var(--deep)">%</span></div><span class="sub">한도 안에서 걸은 비율 · ${fmtDur(R.dur)} · ${R.steps}걸음</span>
<div class="card" style="margin-top:12px;padding:14px">${lineChart(R.peaks,p.limit,M)}<div class="row" style="font-size:.7rem;font-weight:700;color:var(--ink3);margin-top:4px"><span>시작</span><span style="text-align:center;color:var(--ink2)">점선은 한도 ${f1(p.limit)}kg · 빨간 구간은 초과</span><span style="text-align:right">${Math.ceil(R.dur/60)}분</span></div></div>
<div class="tally" style="margin:14px 0"><div><b>초과</b><span class="num over-t">${R.over}</span><small>회</small></div><div><b>최대</b><span class="num">${f1(R.max)}</span><small>kg</small></div><div><b>평균</b><span class="num">${f1(R.avg)}</span><small>kg</small></div><div><b>분당</b><span class="num">${R.spm}</span><small>걸음</small></div></div>
<div class="card"><b>지금 수술 부위 통증은 어때요? <span class="num" style="font-size:1.6rem;color:${hi?'var(--over)':'var(--deep)'}">${S.pain}</span></b><input type="range" min="0" max="10" step="1" value="${S.pain}" data-bind="pain" aria-label="통증 점수" style="margin-top:10px"><div class="row" style="font-size:.72rem;font-weight:700;color:var(--ink2)"><span>없음</span><span style="text-align:right">견디기 힘듦</span></div>
<div id="painbox">${hi?painNotice():''}</div></div>
<div class="sp"></div><div style="height:14px"></div>${hi?`<button class="btn ghost" data-act="contact" style="margin-bottom:10px">병원에 문의</button>`:''}<button class="btn" data-act="save-result" id="saveb">저장하고 홈으로</button></div>`)}
const painNotice=()=>`<div class="err" style="display:flex;gap:10px;align-items:flex-start"><span>${ico('warn',22)}</span><div><b>통증이 높아요</b><br><span style="color:var(--ink)">연습을 쉬고 의료진에게 알려 주세요. 저장하면 연구팀에도 전달됩니다.</span></div></div>`;

/* ---------- 환자: 기록·처방·설정 ---------- */
function vLog(){const p=S.patient,w0=startOfWeek(),wk=S.sessions.filter(s=>s.start>=w0),wa=agg(wk),days=['월','화','수','목','금','토','일'],tk=(new Date().getDay()+6)%7;
 const per=days.map((d,i)=>{const a=wk.filter(s=>((new Date(s.start).getDay()+6)%7)===i);return {d,...agg(a)}});
 const M=Math.max(20,...per.map(x=>x.max),p.limit+2);const W_=318,H=70,y=v=>H-6-v/M*(H-12);
 const xs=i=>8+i*((W_-16)/6),pts=per.map((x,i)=>x.n?[xs(i),y(x.max)]:null).filter(Boolean);
 const line=pts.length?`<path d="${pts.map((q,i)=>(i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' ')}" fill="none" stroke="#D63B35" stroke-width="2.5"/>`+pts.map(q=>`<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="4.5" fill="#fff" stroke="#D63B35" stroke-width="2.5"/>`).join(''):'';
 return ph('',`<div class="scr"><h2>기록</h2><div class="row" style="margin-top:6px;align-items:flex-end"><div><span class="num" style="font-size:4rem;color:var(--deep)">${wa.comp==null?'–':wa.comp}</span>${wa.comp==null?'':'<span style="font-size:1.3rem;font-weight:700;color:var(--deep)">%</span>'}</div><span class="sub" style="text-align:right;flex:1">이번 주 평균 순응</span></div>
<div class="card" style="margin-top:10px"><b style="font-size:.9rem">요일별 순응도</b><div class="bars" style="margin-top:10px">${per.map((x,i)=>`<div><div class="t"><i class="${i===tk?'today':''}" style="height:${x.comp||0}%"></i></div><span class="num">${x.comp==null?'–':x.comp}</span><small style="${i===tk?'color:var(--deep)':''}">${x.d}</small></div>`).join('')}</div></div>
<div class="card" style="margin-top:12px"><div class="row"><b style="font-size:.9rem">요일별 최대 하중</b><span class="sub" style="text-align:right;font-size:.75rem;font-weight:700">한도 ${f1(p.limit)}kg</span></div><svg viewBox="0 0 ${W_} ${H}" width="100%"><line x1="0" y1="${y(p.limit)}" x2="${W_}" y2="${y(p.limit)}" stroke="#0F2A1E" stroke-width="1.5" stroke-dasharray="5 5"/>${line}</svg></div>
<div class="row" style="margin:14px 0"><div><span class="sub" style="font-weight:700;font-size:.8rem">이번 주 연습</span><div><span class="num" style="font-size:2.2rem">${wa.n}</span> <span class="sub">회</span></div></div><button class="btn ghost sm" style="flex:none" data-act="csv">CSV 내보내기</button></div>
${S.sessions.length?`<div class="card" style="padding:4px 16px;margin-bottom:14px">${S.sessions.slice(0,8).map(s=>`<div class="list-row"><div class="sp"><b>${fmtT(s.start)}</b><span class="s">${fmtDur(s.durationSec)} · ${s.steps}걸음 · 통증 ${s.pain}</span></div><span class="pill ${s.compliance>=85?'':s.compliance>=70?'w':'o'}">${s.compliance}%</span></div>`).join('')}</div>`:''}</div>${tabbar(1)}`)}
function vRx(){const p=S.patient;
 return ph('',`<div class="scr"><h2>처방</h2>
<div class="card" style="margin-top:12px;background:var(--dark);color:#fff;border:0;padding:18px"><span style="font-size:.8rem;font-weight:700;opacity:.6">수술한 왼발 하중 한도</span><div><span class="num" style="font-size:4.4rem;color:var(--bright)">${f1(p.limit)}</span><span style="font-size:1.2rem;font-weight:700;opacity:.7"> kg</span></div><div style="font-size:.85rem;opacity:.7;margin-bottom:12px">체중 ${p.weight}kg의 ${Math.round(p.limit/p.weight*100)}%, 한 걸음마다 이 값을 넘지 않게 걷습니다.</div><div class="dark" style="background:none">${railHtml(p.stage)}</div></div>
<div class="card" style="margin-top:12px"><span class="sub" style="font-size:.8rem;font-weight:700">의료진 메모</span><p style="margin:6px 0 0">${esc(p.memo||'등록된 메모가 없습니다.')}</p></div>
<div class="card" style="margin-top:12px;padding:4px 16px"><div class="list-row"><div class="sp"><b>처방한 의료진</b><span class="s">${esc(p.doctor||'–')}</span></div></div><div class="list-row"><div class="sp"><b>입력한 연구원</b><span class="s">${esc(p.enteredBy||'–')}</span></div></div><div class="list-row"><div class="sp"><b>다음 진료</b><span class="s">${esc(p.nextVisit||'–')}</span></div></div></div>
<div class="sp"></div><button class="btn ghost" style="margin:14px 0" data-act="contact">병원에 문의</button></div>${tabbar(2)}`)}
function vSettings(){const u=S.user,s=u.settings||{},t=(k,d=true)=>`<button class="tog ${(s[k]??d)?'on':''}" data-act="set" data-k="${k}" aria-label="${k}"></button>`;
 return ph('',`<div class="scr"><h2>설정</h2><span class="lbl">화면 모드</span><div class="tabs"><button class="${u.mode==='senior'?'':'on'}" data-act="mode2" data-v="normal">일반</button><button class="${u.mode==='senior'?'on':''}" data-act="mode2" data-v="senior">시니어</button></div>
<div class="card" style="margin-top:14px;padding:4px 16px"><div class="list-row"><div class="sp"><b>진동 안내</b><span class="s">한도 초과 시 휴대폰이 진동</span></div>${t('vib')}</div><div class="list-row"><div class="sp"><b>음성 안내</b><span class="s">한도 초과 시 소리로 알려 줘요</span></div>${t('voice')}</div><div class="list-row"><div class="sp"><b>Wi-Fi일 때만 업로드</b><span class="s">데이터를 연구팀에 전송</span></div>${t('wifi')}</div></div>
<div class="card" style="margin-top:12px;padding:4px 16px"><div class="list-row"><div class="sp"><b>왼발 인솔 · 수술한 발</b><span class="s">연결됨 · 배터리 82%</span></div></div><div class="list-row"><div class="sp"><b>오른발 인솔</b><span class="s">연결됨 · 배터리 77%</span></div></div><div class="list-row" style="cursor:pointer" data-act="go" data-r="prep"><div class="sp"><b>영점 다시 맞추기</b><span class="s">인솔에서 발을 떼고 눌러 주세요</span></div></div></div>
<div style="text-align:center;margin-top:10px">${S.preview?'<p class="sub" style="font-size:.8rem">미리보기에서는 계정·참여 관련 버튼을 숨겼어요.</p>':`<button class="btn ghost" style="border:0;color:var(--ink2)" data-act="logout">로그아웃 (${esc(u.email)})</button><button class="btn ghost" style="border:0;color:var(--over)" data-act="quit-ask">연구 참여 그만두기</button>`}<p class="sub" style="font-size:.72rem">연구번호 ${esc(S.preview?S.patient.studyId:u.studyId)} · 앱 버전 1.0</p></div></div>${tabbar(3)}`)}

/* ---------- 연구자 웹 ---------- */
function pstat(pid){const ss=S.r.sessions.filter(s=>s.studyId===pid);return{ss,today:agg(ss.filter(s=>dayKey(s.start)===dayKey(Date.now()))),wk:agg(ss.filter(s=>s.start>=startOfWeek()))}}
const statusPill=a=>a.comp==null?'<span class="pill g">오늘 기록 없음</span>':a.comp<70?'<span class="pill o">한도 초과 많음</span>':a.comp<85?'<span class="pill w">주의</span>':'<span class="pill">양호</span>';
function webHeader(a){const adm=S.user.role==='admin',ch=(r,l)=>`<button class="nav ${a===r?'on':''}" data-act="switch" data-r="${r}">${l}</button>`;
 return `<header class="rh"><span class="lg">뉴딕</span><small>${adm?'관리자':'연구자'}</small><nav class="rnav">${adm?ch('admin','관리자 화면').replace('</button>',' <span class="msg-badge" style="'+(unreadN()?'':'display:none')+'">'+unreadN()+'</span></button>'):''}${ch('research','연구자 웹')}<button class="nav" data-act="preview">환자 앱 미리보기</button></nav><span class="sp"></span>${a==='research'?`<input class="inp" placeholder="연구번호·이름 검색" data-bind="q" value="${esc(S.r.q)}" aria-label="검색">`:''}<span style="font-weight:700;font-size:.9rem;opacity:.85">${esc(S.user.name)}${S.user.org?' · '+esc(S.user.org):''}</span><button class="btn sm" style="background:rgba(255,255,255,.12)" data-act="logout">로그아웃</button></header>`}
function vResearch(){const q=S.r.q.trim().toLowerCase();
 let list=S.r.patients.map(p=>({p,...pstat(p.studyId)})).filter(x=>!q||x.p.studyId.toLowerCase().includes(q)||(x.p.name||'').toLowerCase().includes(q));
 list.sort((a,b)=>(a.today.comp==null)-(b.today.comp==null)||(a.today.comp-b.today.comp)||a.p.studyId.localeCompare(b.p.studyId));
 if(!S.r.sel&&list[0])S.r.sel=list[0].p.studyId;const sel=list.find(x=>x.p.studyId===S.r.sel)||null;
 const left=`<div class="panel"><div class="ph"><b style="font-size:1.05rem">환자 ${S.r.patients.length}명</b><span class="sp"></span><span class="sub" style="font-size:.75rem;font-weight:700">오늘 순응 낮은 순</span><button class="btn sm" data-act="add-ask">+ 환자 등록</button></div>
 ${list.length?`<table class="tbl"><thead><tr><th>연구번호</th><th>단계</th><th>오늘 순응</th><th>이번 주</th><th>최근 연습</th><th>상태</th></tr></thead><tbody>${list.map(x=>`<tr class="${x.p.studyId===S.r.sel?'sel':''}" data-act="sel" data-id="${esc(x.p.studyId)}" tabindex="0"><td><b>${esc(x.p.studyId)}</b>${x.p.name?`<div class="sub" style="font-size:.72rem">${esc(x.p.name)}</div>`:''}</td><td>${x.p.stage} ${STAGES[x.p.stage-1].name.slice(0,2)}</td><td class="${x.today.comp!=null&&x.today.comp<70?'over-t':''}">${x.today.comp==null?'–':x.today.comp+'%'}</td><td>${x.wk.comp==null?'–':x.wk.comp+'%'}</td><td>${x.ss[0]?fmtT(x.ss[0].start):'–'}</td><td>${statusPill(x.today)}</td></tr>`).join('')}</tbody></table>`:`<div class="empty">${S.r.patients.length?'검색 결과가 없습니다.':'등록된 환자가 없습니다.<br><br><button class="btn sm" style="display:inline-flex" data-act="add-ask">+ 환자 등록</button> <button class="btn ghost sm" style="display:inline-flex" data-act="seed">샘플 환자 5명 넣기</button>'}</div>`}</div>`;
 let right='<div class="empty">왼쪽에서 환자를 선택하세요.</div>';
 if(sel){const p=sel.p,wk=sel.ss.filter(s=>s.start>=startOfWeek()),days=['월','화','수','목','금','토','일'],tk=(new Date().getDay()+6)%7;
  right=`<div style="display:grid;gap:14px"><div class="row" style="gap:10px"><h2 style="flex:none;font-size:1.6rem">${esc(p.studyId)}</h2>${statusPill(sel.today)}${p.uid?'<span class="pill g">앱 연결됨</span>':'<span class="pill w">앱 미연결</span>'}<span class="sp"></span><button class="btn ghost sm" style="flex:none" data-act="send-ask" data-id="${esc(p.studyId)}">메시지 보내기</button><button class="btn ghost sm" style="flex:none" data-act="preview" data-id="${esc(p.studyId)}">환자 앱으로 보기</button><button class="btn sm" style="flex:none" data-act="rx-ask">처방 변경</button></div>
  <div class="facts"><div><b>오늘 순응</b><span class="num">${sel.today.comp==null?'–':sel.today.comp}</span><small>%</small></div><div><b>이번 주 평균</b><span class="num">${sel.wk.comp==null?'–':sel.wk.comp}</span><small>%</small></div><div><b>하중 한도</b><span class="num">${f1(p.limit)}</span><small>kg</small></div><div><b>이번 주 연습</b><span class="num">${sel.wk.n}</span><small>회</small></div></div>
  <div class="card"><b style="font-size:.9rem">요일별 순응 (이번 주)</b><div class="bars" style="margin-top:10px">${days.map((d,i)=>{const a=agg(wk.filter(s=>((new Date(s.start).getDay()+6)%7)===i));return `<div><div class="t"><i class="${i===tk?'today':''}" style="height:${a.comp||0}%"></i></div><span class="num">${a.comp==null?'–':a.comp+'%'}</span><small>${d}</small></div>`}).join('')}</div></div>
  <div class="card"><b style="font-size:.9rem">환자 정보</b><div class="hist"><span>${esc(p.name||'–')}</span><span class="sub">체중 ${p.weight}kg</span><span class="sub">다음 진료 ${esc(p.nextVisit||'–')}</span></div><div class="sub" style="font-size:.85rem">메모: ${esc(p.memo||'–')}</div></div>
  <div class="card"><b style="font-size:.9rem">처방 이력</b>${(p.rxHistory||[]).slice().reverse().map(h=>`<div class="hist"><b>${h.stage} ${STAGES[h.stage-1].name}</b><b style="color:var(--deep)">한도 ${f1(h.limit)}kg</b><span class="sp"></span><span class="sub" style="font-size:.78rem">${esc(h.doctor||'')} 처방 · ${esc(h.enteredBy||'')} 입력 · ${new Date(h.at).toLocaleDateString('ko-KR')}</span></div>`).join('')||'<div class="sub">이력 없음</div>'}</div>
  <div class="panel"><div class="ph"><b>최근 연습</b></div>${sel.ss.length?`<table class="tbl"><thead><tr><th>일시</th><th>시간</th><th>걸음</th><th>초과</th><th>순응</th><th>통증</th></tr></thead><tbody>${sel.ss.slice(0,8).map(s=>`<tr style="cursor:default"><td><b>${fmtT(s.start)}</b></td><td>${fmtDur(s.durationSec)}</td><td>${s.steps}</td><td>${s.over}</td><td>${s.compliance}%</td><td class="${s.pain>=4?'over-t':''}">${s.pain??'–'}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">연습 기록이 없습니다.</div>'}</div></div>`}
 return `<div class="rw">${demoBar()}${webHeader('research')}<div class="rb">${left}<div>${right}</div></div>${modalHtml()}</div>`}

/* ---------- 관리자 ---------- */
const ROLE_KO={patient:'환자',researcher:'연구자',admin:'관리자'};
function vAdmin(){const A=S.a,tab=A.tab,us=A.users,pts=S.r.patients,now=Date.now();
 const tabs=[['overview','개요'],['inbox','문의'],['accounts','계정'],['patients','환자·연구번호'],['data','데이터·설정']];
 const st=pts.map(p=>({p,...pstat(p.studyId)})),todayN=S.r.sessions.filter(x=>dayKey(x.start)===dayKey(now)).length;
 let body='';
 if(tab==='overview'){const attn=st.filter(x=>(x.today.comp!=null&&x.today.comp<70)||(x.ss[0]&&x.ss[0].pain>=4)).sort((a,b)=>(a.today.comp??101)-(b.today.comp??101));const linked=pts.filter(p=>p.uid).length,recent=us.slice().sort((a,b)=>b.createdAt-a.createdAt).slice(0,5);
  const all=agg(S.r.sessions.filter(x=>x.start>=startOfWeek()));
  body=`<div class="facts"><div><b>환자 계정</b><span class="num">${us.filter(u=>u.role==='patient').length}</span><small>명</small></div><div><b>연구자·관리자</b><span class="num">${us.filter(u=>u.role!=='patient').length}</span><small>명</small></div><div><b>등록 환자 / 앱 연결</b><span class="num">${pts.length}</span><small>/ ${linked}</small></div><div><b>오늘 연습 · 이번 주 평균 순응</b><span class="num">${todayN}</span><small>회 · ${all.comp==null?'–':all.comp+'%'}</small></div></div>
  <div class="panel"><div class="ph"><b>확인이 필요한 환자</b><span class="sp"></span><span class="sub" style="font-size:.78rem">오늘 순응 70% 미만 또는 최근 통증 4 이상</span></div>${attn.length?`<table class="tbl"><tbody>${attn.map(x=>`<tr data-act="goto-pt" data-id="${esc(x.p.studyId)}"><td><b>${esc(x.p.studyId)}</b> <span class="sub">${esc(x.p.name||'')}</span></td><td>${x.today.comp==null?'오늘 기록 없음':'오늘 순응 '+x.today.comp+'%'}</td><td>${x.ss[0]&&x.ss[0].pain>=4?'<span class="pill o">통증 '+x.ss[0].pain+'</span>':''}</td><td style="text-align:right"><span class="sub">연구자 웹에서 보기 ›</span></td></tr>`).join('')}</tbody></table>`:'<div class="empty">지금 확인이 필요한 환자가 없습니다.</div>'}</div>
  <div class="panel"><div class="ph"><b>최근 가입</b></div><table class="tbl"><tbody>${recent.map(u=>`<tr style="cursor:default"><td><b>${esc(u.name)}</b></td><td>${esc(u.email)}</td><td><span class="pill ${u.role==='patient'?'g':''}">${ROLE_KO[u.role]||u.role}</span></td><td class="sub">${new Date(u.createdAt||0).toLocaleDateString('ko-KR')}</td></tr>`).join('')||'<tr><td class="empty">가입 내역이 없습니다.</td></tr>'}</tbody></table></div>`}
 if(tab==='inbox')body=`<div class="panel"><div class="ph"><b>문의·메시지 ${S.inbox.length}건</b><span class="sp"></span><button class="btn sm" data-act="send-ask">환자에게 메시지 보내기</button><span class="sub" style="font-size:.78rem">새 문의가 오면 화면에 알림이 뜹니다</span></div>${S.inbox.length?`<table class="tbl"><thead><tr><th>시간</th><th>환자</th><th>종류</th><th>내용</th><th>상태</th><th></th></tr></thead><tbody>${S.inbox.map(x=>`${x.dir==='out'?`<tr style="cursor:default;background:#f6faf7"><td class="sub" style="white-space:nowrap">${fmtT(x.createdAt)}</td><td><a href="#" data-act="goto-pt" data-id="${esc(x.studyId)}" style="color:var(--deep)">${esc(x.studyId)}</a><div class="sub" style="font-size:.72rem">${esc(x.name||'')}</div></td><td><span class="pill">보냄 · ${esc(x.kind)}</span></td><td style="max-width:360px">${esc(x.text)}</td><td>${x.pRead?'<span class="pill">환자 읽음</span>':'<span class="pill g">전달됨</span>'}</td><td></td></tr>`:`<tr style="cursor:default;${x.read?'':'font-weight:700'}"><td class="sub" style="white-space:nowrap">${fmtT(x.createdAt)}</td><td><a href="#" data-act="goto-pt" data-id="${esc(x.studyId)}" style="color:var(--deep)">${esc(x.studyId)}</a><div class="sub" style="font-size:.72rem">${esc(x.name||'')}</div></td><td><span class="pill ${x.kind==='통증'?'o':'g'}">${esc(x.kind)}</span>${x.pain!=null?`<div class="sub" style="font-size:.72rem">통증 ${x.pain}</div>`:''}</td><td style="max-width:360px;font-weight:400">${esc(x.text)}${x.reply?`<div class="hint" style="margin-top:6px">↳ ${esc(x.repliedBy||'')}: ${esc(x.reply)}</div>`:''}</td><td>${x.reply?'<span class="pill">답변함</span>':x.read?'<span class="pill g">확인됨</span>':'<span class="pill o">새 문의</span>'}</td><td style="text-align:right;white-space:nowrap">${x.read?'':`<button class="btn ghost sm" data-act="m-read" data-id="${esc(x.id)}">확인</button> `}<button class="btn sm" data-act="m-reply" data-id="${esc(x.id)}">답변</button></td></tr>`}`).join('')}</tbody></table>`:'<div class="empty">받은 문의가 없습니다.</div>'}</div>`
 if(tab==='accounts')body=`<div class="panel"><div class="ph"><b>계정 ${us.length}개</b><span class="sp"></span><span class="sub" style="font-size:.78rem">역할을 바꾸거나 계정을 비활성화할 수 있어요. 본인 계정은 바꿀 수 없습니다.</span></div><table class="tbl"><thead><tr><th>이름</th><th>이메일</th><th>역할</th><th>연구번호</th><th>가입일</th><th>상태</th><th></th></tr></thead><tbody>${us.map(u=>{const me=u.uid===S.user.uid;return `<tr style="cursor:default"><td><b>${esc(u.name)}</b>${u.org?`<div class="sub" style="font-size:.72rem">${esc(u.org)}</div>`:''}</td><td>${esc(u.email)}</td><td>${me?`<span class="pill">${ROLE_KO[u.role]} (나)</span>`:`<select class="inp" style="min-height:36px;width:auto;padding:0 8px" data-chg="urole" data-id="${esc(u.uid)}" aria-label="역할">${Object.keys(ROLE_KO).map(r=>`<option value="${r}" ${r===u.role?'selected':''}>${ROLE_KO[r]}</option>`).join('')}</select>`}</td><td>${esc(u.studyId||'–')}</td><td class="sub">${new Date(u.createdAt||0).toLocaleDateString('ko-KR')}</td><td>${u.disabled?'<span class="pill o">비활성</span>':'<span class="pill">사용 중</span>'}</td><td style="text-align:right">${me?'':`<button class="btn ghost sm" data-act="u-toggle" data-id="${esc(u.uid)}">${u.disabled?'활성화':'비활성화'}</button>`}</td></tr>`}).join('')}</tbody></table></div>`
 if(tab==='patients')body=`<div class="panel"><div class="ph"><b>환자·연구번호 ${pts.length}건</b><span class="sp"></span><button class="btn sm" data-act="switch" data-r="research">연구자 웹에서 등록·처방</button></div>${pts.length?`<table class="tbl"><thead><tr><th>연구번호</th><th>이름</th><th>단계·한도</th><th>앱 연결 계정</th><th>등록</th><th></th></tr></thead><tbody>${pts.map(p=>{const u=us.find(x=>x.uid===p.uid);return `<tr style="cursor:default"><td><b>${esc(p.studyId)}</b>${p.sample?' <span class="pill g">샘플</span>':''}</td><td>${esc(p.name||'–')}</td><td>${p.stage} ${STAGES[p.stage-1].name} · ${f1(p.limit)}kg</td><td>${p.uid?esc(u?u.email:'(계정 정보 없음)'):'<span class="pill w">미연결</span>'}</td><td class="sub">${esc(p.enteredBy||'–')}</td><td style="text-align:right;white-space:nowrap">${p.uid?`<button class="btn ghost sm" data-act="send-ask" data-id="${esc(p.studyId)}">메시지</button> <button class="btn ghost sm" data-act="p-unlink" data-id="${esc(p.studyId)}">연결 해제</button> `:''}<button class="btn ghost sm" style="color:var(--over)" data-act="p-del-ask" data-id="${esc(p.studyId)}">삭제</button></td></tr>`}).join('')}</tbody></table>`:'<div class="empty">등록된 환자가 없습니다.</div>'}</div>`
 if(tab==='data')body=`<div class="card"><b>데이터 내보내기</b><p class="sub" style="margin:6px 0 12px">전체 환자의 연습 기록(${S.r.sessions.length}건)을 CSV로 내려받습니다.</p><button class="btn sm" style="display:inline-flex" data-act="a-csv">전체 기록 CSV</button></div>
 <div class="card"><b>샘플 환자</b><p class="sub" style="margin:6px 0 12px">NDX-0001~0005 샘플 환자와 이번 주 기록을 넣습니다. 이미 있으면 건너뜁니다.</p><button class="btn ghost sm" style="display:inline-flex" data-act="seed-a">샘플 환자 5명 넣기</button></div>
 <div class="card"><b>가입 코드</b><p class="sub" style="margin:6px 0 0">연구자·관리자 가입 코드는 <code>public/firebase-config.js</code> 에서 바꿉니다. 배포 전에 꼭 바꾸세요.<br>저장소: <b>${S.db.mode==='local'?'체험 모드(이 브라우저)':'Firebase'}</b></p></div>
 ${S.db.mode==='local'?`<div class="card"><b>체험 데이터 초기화</b><p class="sub" style="margin:6px 0 12px">이 브라우저에 저장된 계정·환자·기록을 모두 지웁니다.</p><button class="btn sm danger" style="display:inline-flex" data-act="reset-ask">모두 지우기</button></div>`:''}`
 return `<div class="rw">${demoBar()}${webHeader('admin')}<div style="padding:24px;max-width:1280px;margin:0 auto;display:grid;gap:14px"><div class="row" style="gap:12px"><h2 style="flex:none;font-size:1.6rem">관리자 화면</h2><div class="tabs" style="flex:none">${tabs.map(([k,l])=>`<button class="${tab===k?'on':''}" data-act="atab" data-v="${k}" style="padding:0 16px">${l}${k==='inbox'?` <span class="msg-badge" style="${unreadN()?'':'display:none'}">${unreadN()}</span>`:''}</button>`).join('')}</div></div>${body}</div>${modalHtml()}</div>`}

/* ---------- 모달 ---------- */
function stageOpts(v){return STAGES.map(s=>`<option value="${s.n}" ${s.n==v?'selected':''}>${s.n} ${s.name}</option>`).join('')}
function modalHtml(){const m=S.modal;if(!m)return '';
 if(m.t==='delPatient')return `<div class="modal-bg"><div class="modal" role="dialog" aria-modal="true"><h2 style="font-size:1.4rem">${esc(m.id)} 삭제</h2><p class="sub" style="margin:6px 0 18px">환자 정보와 처방 이력이 삭제됩니다. 이 연구번호로 다시 연결할 수 없습니다. (기존 연습 기록 문서는 남습니다.)</p><div class="row" style="justify-content:flex-end"><button class="btn ghost sm" data-act="close">취소</button><button class="btn sm danger" data-act="p-del-do">삭제</button></div></div></div>`;
 if(m.t==='reset')return `<div class="modal-bg"><div class="modal" role="dialog" aria-modal="true"><h2 style="font-size:1.4rem">체험 데이터를 모두 지울까요?</h2><p class="sub" style="margin:6px 0 18px">이 브라우저의 계정·환자·기록이 모두 사라지고 처음 화면으로 돌아갑니다.</p><div class="row" style="justify-content:flex-end"><button class="btn ghost sm" data-act="close">취소</button><button class="btn sm danger" data-act="reset-do">모두 지우기</button></div></div></div>`;
 if(m.t==='confirmEnd')return `<div class="sheet-bg"><div class="sheet" role="dialog" aria-modal="true"><div class="h"></div><h2>연습을 마칠까요?</h2><p class="sub" style="margin:6px 0 20px">${fmtDur(W.t)}, ${W.steps}걸음을 저장하고 결과를 보여 드립니다.</p><div class="row"><button class="btn ghost" data-act="w-cancel">계속 걷기</button><button class="btn" data-act="w-confirm">마치기</button></div></div></div>`;
 if(m.t==='contact'){const p=S.patient,kinds=['통증','처방','기기·앱','기타'],my=S.myMsgs||[];return `<div class="sheet-bg"><div class="sheet" role="dialog" aria-modal="true" style="max-height:92%;overflow:auto"><div class="h"></div><h2>병원에 문의</h2><p class="sub" style="margin:6px 0 10px">담당 연구원 <b>${esc(p.enteredBy||'연구팀')}</b>에게 메시지를 보냅니다. 급하거나 심한 통증은 바로 병원에 연락하세요.</p>
<form data-form="msg"><span class="lbl" style="margin-top:4px">문의 종류</span><div class="tabs" style="flex-wrap:wrap">${kinds.map(k=>`<button type="button" class="${S.msgKind===k?'on':''}" data-act="kind" data-v="${k}" style="min-height:38px;font-size:.85rem">${k}</button>`).join('')}</div>
<label class="lbl" for="f-msg">메시지</label><textarea id="f-msg" class="inp" name="text" required maxlength="500" placeholder="궁금한 점이나 불편한 점을 적어 주세요" style="min-height:110px">${dv('text',S.msgPrefill||'')}</textarea>
${S.err?`<div class="err" role="alert">${esc(S.err)}</div>`:''}
<div class="row" style="margin-top:14px"><button type="button" class="btn ghost" data-act="close">닫기</button><button class="btn" type="submit">보내기</button></div></form>
${my.length?`<span class="lbl" style="margin-top:18px">내 문의 내역</span><div class="card" style="padding:4px 14px">${my.slice(0,6).map(x=>`<div class="list-row" style="align-items:flex-start"><div class="sp">${x.dir==='out'?`<b style="font-size:.85rem">📢 ${esc(x.fromName||'연구팀')}: ${esc(x.text)}</b><span class="s">${fmtT(x.createdAt)} · 연구팀이 보낸 메시지</span>`:`<b style="font-size:.85rem">[${esc(x.kind)}] ${esc(x.text)}</b><span class="s">${fmtT(x.createdAt)} · ${x.reply?'답변 도착':x.read?'확인됨':'전달됨'}</span>`}${x.reply?`<div class="hint" style="margin-top:6px"><b>${esc(x.repliedBy||'연구팀')}</b> ${esc(x.reply)}</div>`:''}</div></div>`).join('')}</div>`:''}</div></div>`}
 if(m.t==='send'){const p=S.r.patients.find(x=>x.studyId===m.id)||S.r.patients[0];return `<div class="modal-bg"><div class="modal" role="dialog" aria-modal="true"><h2 style="font-size:1.3rem">환자에게 메시지 보내기</h2><p class="sub" style="margin:4px 0 6px">환자 앱에 팝업으로 바로 전달됩니다. 앱에 연결된 환자에게만 보낼 수 있어요.</p><form data-form="send"><label class="lbl">받는 환자</label><select class="inp" name="studyId">${S.r.patients.map(x=>`<option value="${esc(x.studyId)}" ${x.studyId===(p&&p.studyId)?'selected':''}>${esc(x.studyId)} ${esc(x.name||'')}${x.uid?'':' (앱 미연결)'}</option>`).join('')}</select><label class="lbl">종류</label><select class="inp" name="kind"><option>안내</option><option>일정</option><option>처방</option><option>주의</option></select><label class="lbl">메시지</label><textarea class="inp" name="text" required maxlength="500" placeholder="예: 다음 진료 전에 한 번 앱으로 연습 기록을 확인해 주세요">${dv('text')}</textarea>${S.err?`<div class="err" role="alert">${esc(S.err)}</div>`:''}<div class="row" style="margin-top:16px;justify-content:flex-end"><button type="button" class="btn ghost sm" data-act="close">취소</button><button class="btn sm" type="submit">보내기</button></div></form></div></div>`}
 if(m.t==='reply'){const x=S.inbox.find(y=>y.id===m.id);if(!x)return '';return `<div class="modal-bg"><div class="modal" role="dialog" aria-modal="true"><h2 style="font-size:1.3rem">${esc(x.studyId)} ${esc(x.name||'')} 문의</h2><div class="hint" style="margin:10px 0"><b>[${esc(x.kind)}]</b> ${esc(x.text)}<br><span style="opacity:.7">${fmtT(x.createdAt)}${x.pain!=null?' · 통증 '+x.pain:''}</span></div><form data-form="reply"><label class="lbl">답변 (환자 앱 문의 내역에 표시됩니다)</label><textarea class="inp" name="reply" required placeholder="답변을 입력하세요">${esc(x.reply||'')}</textarea>${S.err?`<div class="err" role="alert">${esc(S.err)}</div>`:''}<div class="row" style="margin-top:16px;justify-content:flex-end"><button type="button" class="btn ghost sm" data-act="close">닫기</button><button class="btn sm" type="submit">답변 보내기</button></div></form></div></div>`}
 if(m.t==='quit')return `<div class="sheet-bg"><div class="sheet" role="dialog" aria-modal="true"><div class="h"></div><h2>연구 참여를 그만둘까요?</h2><p class="sub" style="margin:6px 0 20px">연구번호 연결이 해제되고 이 앱에서 더 이상 연습할 수 없습니다. 이미 저장된 기록은 연구팀 기준에 따라 처리됩니다.</p><div class="row"><button class="btn ghost" data-act="close">취소</button><button class="btn danger" data-act="quit-do">그만두기</button></div></div></div>`;
 if(m.t==='add'||m.t==='rx'){const add=m.t==='add',p=add?{stage:3,weight:'',limit:'',doctor:S.user.lastDoctor||'',memo:'',nextVisit:''}:S.r.patients.find(x=>x.studyId===S.r.sel);const D=S.draft;const pp={...p};if(D){pp.stage=+D.stage||p.stage;pp.weight=D.weight??p.weight;pp.limit=D.limit??p.limit;pp.doctor=D.doctor??p.doctor;pp.memo=D.memo??p.memo}const nums=S.r.patients.map(x=>+String(x.studyId).replace(/\D/g,'')||0),next='NDX-'+String(Math.max(0,...nums)+1).padStart(4,'0');
  return `<div class="modal-bg"><div class="modal" role="dialog" aria-modal="true"><h2 style="font-size:1.4rem">${add?'환자 등록':esc(p.studyId)+' 처방 변경'}</h2><p class="sub" style="margin:4px 0 6px">${add?'등록한 연구번호를 환자에게 알려 주세요. 환자가 앱에서 입력하면 연결됩니다.':'변경하면 환자 앱의 한도와 단계가 바로 바뀝니다.'}</p>
  <form data-form="${add?'addPatient':'rx'}" ${add?'':'data-auto="1"'}>${add?`<div class="row"><div><label class="lbl">연구번호</label><input class="inp" name="studyId" required value="${dv('studyId',next)}"></div><div><label class="lbl">이름 또는 이니셜</label><input class="inp" name="name" placeholder="예: 김OO" required value="${dv('name')}"></div></div>`:''}
  <div class="row"><div><label class="lbl">체중 (kg)</label><input class="inp" type="number" step="0.1" min="20" max="250" name="weight" required value="${pp.weight||''}" ${add?'':'readonly'}></div><div><label class="lbl">단계</label><select class="inp" name="stage">${stageOpts(pp.stage)}</select></div></div>
  <label class="lbl">하중 한도 (kg) — 단계와 체중에 맞춰 자동 계산, 직접 고칠 수 있어요</label><input class="inp" type="number" step="0.1" min="0" name="limit" required value="${pp.limit??''}">
  <label class="lbl">처방한 의료진</label><input class="inp" name="doctor" required value="${esc(pp.doctor)}" placeholder="예: 정형외과 김OO 교수">
  <label class="lbl">의료진 메모</label><textarea class="inp" name="memo" placeholder="환자에게 보여줄 안내">${esc(pp.memo)}</textarea>
  ${add?`<label class="lbl">다음 진료</label><input class="inp" name="nextVisit" placeholder="예: 11월 4일 오전" value="${dv('nextVisit')}">`:''}
  ${S.err?`<div class="err" role="alert">${esc(S.err)}</div>`:''}
  <div class="row" style="margin-top:18px;justify-content:flex-end"><button type="button" class="btn ghost sm" data-act="close">취소</button><button class="btn sm" type="submit">${add?'등록':'변경 저장'}</button></div></form></div></div>`}
 return ''}

/* ---------- 렌더 ---------- */
function view(){switch(S.route){case 'start':return vStart();case 'auth':return vAuth();case 'link':return vLink();case 'consent':return vConsent();case 'mode':return vMode();case 'prep':return vPrep();case 'home':return vHome();case 'walk':return vWalk();case 'result':return vResult();case 'log':return vLog();case 'rx':return vRx();case 'settings':return vSettings();case 'research':return vResearch();case 'admin':return vAdmin()}return ''}
function render(){const a=document.activeElement,keep=a&&a.matches&&a.matches('[data-bind="q"]');applyMode();$('#app').innerHTML=view();if(keep){const n=$('[data-bind="q"]');if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}}}

/* ---------- 데이터 로딩·흐름 ---------- */
async function loadPatient(){const u=S.user;S.patient=u.studyId?await S.db.getPatient(u.studyId):null;S.sessions=S.patient?await S.db.listSessions({uid:u.uid}):[]}
async function loadResearch(){S.r.patients=await S.db.listPatients();S.r.sessions=await S.db.listSessions({})}
async function loadAdmin(){S.a.users=await S.db.listUsers();await loadResearch()}
async function afterLogin(){const u=S.user;startInbox();if(u.disabled){stopInbox();await S.db.signOut();S.user=null;S.busy=false;throw friendly('비활성화된 계정입니다. 관리자에게 문의해 주세요.')}
 if(u.role==='admin'){await loadAdmin();return go('admin')}
 if(u.role==='researcher'){await loadResearch();return go('research')}
 await loadPatient();startInbox();if(!S.patient)return go('link');if(!u.consent){S.consent={};return go('consent')}if(!u.mode)return go('mode');go('home')}
const safe=fn=>async(...a)=>{try{await fn(...a)}catch(e){if(!e.friendly)console.error(e);S.err=e.friendly?e.message:'문제가 생겼어요. 잠시 후 다시 시도해 주세요. ('+(e.message||e)+')';S.busy=false;render()}};

const acts={
 go:el=>go(el.dataset.r),
 tab:el=>{S.authTab=el.dataset.v;S.err='';S.draft=null;render()},
 role:el=>{S.role=el.dataset.v;S.err='';render()},
 logout:safe(async()=>{stopInbox();await S.db.signOut();S.user=S.patient=null;S.sessions=[];go('start')}),
 chk:el=>{S.consent=S.consent||{};S.consent[el.dataset.k]=!S.consent[el.dataset.k];render()},
 'tog-vis':el=>el.classList.toggle('on'),
 consent:safe(async()=>{await S.db.saveProfile(S.user.uid,{consent:true,consentAt:Date.now()});S.user.consent=true;go(S.user.mode?'home':'mode')}),
 mode:el=>{S.user.mode=el.dataset.v;render()},
 'mode-next':safe(async()=>{const m=S.user.mode||'normal';S.user.mode=m;await S.db.saveProfile(S.user.uid,{mode:m});go('prep')}),
 mode2:safe(async el=>{S.user.mode=el.dataset.v;await S.db.saveProfile(S.user.uid,{mode:S.user.mode});render()}),
 set:safe(async el=>{const k=el.dataset.k,s={...(S.user.settings||{})};s[k]=!(s[k]??true);S.user.settings=s;await S.db.saveProfile(S.user.uid,{settings:s});render()}),
 'dev-off':()=>{S.devOk=false;clearInterval(prepTi);render()},
 'dev-retry':()=>{S.devOk=true;prepStart();render()},
 'walk-start':()=>walkBegin(),
 'w-pause':()=>{W.run=!W.run;walkUpdate()},
 'w-end':()=>{W.wasRun=W.run;W.run=false;S.modal={t:'confirmEnd'};render()},
 'w-cancel':()=>{W.run=W.wasRun;S.modal=null;render()},
 'w-confirm':()=>{S.modal=null;walkFinish()},
 'save-result':safe(async()=>{const R=S.R;if(S.preview){toast('미리보기에서는 저장하지 않아요');return go('home')}if(!R.steps){toast('걸음이 기록되지 않아 저장하지 않았어요');return go('home')}
  const ses={id:'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),uid:S.user.uid,studyId:S.patient.studyId,start:R.start,durationSec:R.dur,steps:R.steps,over:R.over,max:R.max,avg:Math.round(R.avg*10)/10,spm:R.spm,compliance:R.comp,pain:S.pain,peaks:R.peaks};
  const b=$('#saveb');if(b)b.disabled=true;await S.db.addSession(ses);S.sessions.unshift(ses);toast('저장했어요');go('home')}),
 contact:safe(async el=>{S.draft=null;S.err='';S.msgKind=S.route==='result'?'통증':'기타';S.msgPrefill=S.route==='result'&&S.pain>=4?`통증 점수 ${S.pain}점입니다. (걷기 결과 ${S.R.comp}%)`:'';if(S.preview){toast('미리보기에서는 문의를 보낼 수 없어요');return}S.modal={t:'contact'};render();markPRead()}),
 kind:el=>{S.msgKind=el.dataset.v;const ta=$('#f-msg');if(ta)S.draft={text:ta.value};render()},close:()=>{S.modal=null;S.err='';S.draft=null;render()},
 'quit-ask':()=>{S.modal={t:'quit'};render()},
 'quit-do':safe(async()=>{await S.db.unclaimPatient(S.user.studyId,S.user.uid);await S.db.saveProfile(S.user.uid,{studyId:null,consent:false});S.user.studyId=null;S.user.consent=false;S.patient=null;S.sessions=[];go('link')}),
 csv:()=>{const rows=[['일시','시간(초)','걸음','초과','최대kg','평균kg','분당걸음','순응%','통증']].concat(S.sessions.map(s=>[new Date(s.start).toLocaleString('ko-KR'),s.durationSec,s.steps,s.over,s.max,s.avg,s.spm,s.compliance,s.pain]));
  const blob=new Blob(['﻿'+rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='newdic-records.csv';document.body.appendChild(a);a.click();a.remove();toast('CSV를 내려받았어요')},
 sel:el=>{S.r.sel=el.dataset.id;render()},
 'add-ask':()=>{S.err='';S.draft=null;S.modal={t:'add'};render()},'rx-ask':()=>{S.err='';S.draft=null;S.modal={t:'rx'};render()},
 seed:safe(async()=>{await seedSamples();await loadResearch();toast('샘플 환자 5명을 넣었어요');render()}),
 'seed-a':safe(async()=>{await seedSamples();await loadAdmin();toast('샘플 환자를 넣었어요');render()}),
 switch:safe(async el=>{const r=el.dataset.r;if(r==='admin')await loadAdmin();else await loadResearch();go(r)}),
 atab:el=>{S.a.tab=el.dataset.v;render()},
 'send-ask':safe(async el=>{await loadResearch();S.err='';S.draft=null;S.modal={t:'send',id:el.dataset.id||S.r.sel};render()}),
 'm-read':safe(async el=>{await S.db.updateMessage(el.dataset.id,{read:true});const x=S.inbox.find(y=>y.id===el.dataset.id);if(x)x.read=true;updBadge();render()}),
 'm-reply':el=>{S.err='';S.draft=null;S.modal={t:'reply',id:el.dataset.id};render();const x=S.inbox.find(y=>y.id===el.dataset.id);if(x&&!x.read){S.db.updateMessage(x.id,{read:true});x.read=true;updBadge()}},
 'goto-pt':el=>{if(el.tagName==='A')event.preventDefault();S.r.sel=el.dataset.id;go('research')},
 preview:safe(async el=>{const id=el.dataset.id||S.r.sel||(S.r.patients[0]&&S.r.patients[0].studyId);const p=S.r.patients.find(x=>x.studyId===id);if(!p){toast('등록된 환자가 없어요. 먼저 환자를 등록하세요');return}
  S.preview={from:S.route};S.patient=p;S.sessions=S.r.sessions.filter(x=>x.studyId===id);go('home')}),
 'exit-preview':safe(async()=>{const from=S.preview.from;S.preview=null;S.patient=null;S.sessions=[];stopWalkTimers();if(from==='admin')await loadAdmin();else await loadResearch();go(from)}),
 'u-toggle':safe(async el=>{const u=S.a.users.find(x=>x.uid===el.dataset.id);if(!u||u.uid===S.user.uid)return;const v=!u.disabled;await S.db.saveProfile(u.uid,{disabled:v});u.disabled=v;toast(v?'계정을 비활성화했어요':'계정을 활성화했어요');render()}),
 'p-unlink':safe(async el=>{const p=S.r.patients.find(x=>x.studyId===el.dataset.id);if(!p||!p.uid)return;const uid=p.uid;await S.db.unclaimPatient(p.studyId,uid);await S.db.saveProfile(uid,{studyId:null,consent:false}).catch(()=>{});await loadAdmin();toast('연결을 해제했어요');render()}),
 'p-del-ask':el=>{S.modal={t:'delPatient',id:el.dataset.id};render()},
 'p-del-do':safe(async()=>{const id=S.modal.id;const p=S.r.patients.find(x=>x.studyId===id);if(p&&p.uid)await S.db.saveProfile(p.uid,{studyId:null,consent:false}).catch(()=>{});await S.db.deletePatient(id);S.modal=null;await loadAdmin();toast('삭제했어요');render()}),
 'a-csv':()=>{const rows=[['연구번호','일시','시간(초)','걸음','초과','최대kg','평균kg','분당걸음','순응%','통증']].concat(S.r.sessions.map(s=>[s.studyId,new Date(s.start).toLocaleString('ko-KR'),s.durationSec,s.steps,s.over,s.max,s.avg,s.spm,s.compliance,s.pain]));const blob=new Blob(['\ufeff'+rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='newdic-all-sessions.csv';document.body.appendChild(a);a.click();a.remove();toast('CSV를 내려받았어요')},
 'reset-ask':()=>{S.modal={t:'reset'};render()},
 'reset-do':safe(async()=>{for(const k of ['acc','users','patients','sessions','me','seeded']){try{localStorage.removeItem('nd_'+k)}catch{}}location.reload()})
};

const forms={
 auth:safe(async fd=>{if(S.busy)return;S.busy=true;S.err='';const up=S.authTab==='up',email=(fd.get('email')||'').trim(),pw=fd.get('password');
  if(up){const name=(fd.get('name')||'').trim();if(!name)throw friendly('이름을 입력해 주세요.');if(S.role!=='patient'&&(fd.get('code')||'').trim()!==(S.role==='admin'?window.NEWDIC_ADMIN_CODE:window.NEWDIC_RESEARCHER_CODE))throw friendly((S.role==='admin'?'관리자':'연구자')+' 가입 코드가 맞지 않습니다.');
   S.user=await S.db.signUp({email,password:pw,name,role:S.role,extra:S.role!=='patient'?{org:(fd.get('org')||'').trim()}:{settings:{vib:true,voice:true,wifi:true}}})}
  else S.user=await S.db.signIn(email,pw);
  S.busy=false;await afterLogin()}),
 msg:safe(async fd=>{const text=(fd.get('text')||'').trim();if(!text)throw friendly('메시지를 입력해 주세요.');const m={id:'m'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),uid:S.user.uid,studyId:S.patient.studyId,name:S.user.name,kind:S.msgKind,text,pain:S.route==='result'?S.pain:null,createdAt:Date.now(),read:false,reply:null};
  await S.db.addMessage(m);S.draft=null;S.msgPrefill='';S.myMsgs=[m,...(S.myMsgs||[])];S.modal=null;toast('문의를 보냈어요. 담당 연구원에게 전달됩니다');render()}),
 send:safe(async fd=>{const id=fd.get('studyId'),p=await S.db.getPatient(id);if(!p||!p.uid)throw friendly('아직 앱에 연결되지 않은 환자입니다. 환자가 연구번호를 입력해야 메시지를 받을 수 있어요.');const text=(fd.get('text')||'').trim();if(!text)throw friendly('메시지를 입력해 주세요.');
  await S.db.addMessage({id:'m'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),uid:p.uid,studyId:id,name:p.name,kind:fd.get('kind'),text,dir:'out',fromName:S.user.name,createdAt:Date.now(),read:true,pRead:false,reply:null});S.modal=null;S.draft=null;toast('환자 앱으로 보냈어요');render()}),
 reply:safe(async fd=>{const id=S.modal.id,reply=(fd.get('reply')||'').trim();if(!reply)throw friendly('답변을 입력해 주세요.');await S.db.updateMessage(id,{reply,repliedAt:Date.now(),repliedBy:S.user.name,read:true});S.modal=null;S.draft=null;toast('답변을 보냈어요');render()}),
 link:safe(async fd=>{const id=(fd.get('studyId')||'').trim().toUpperCase();const p=await S.db.getPatient(id);if(!p)throw friendly('등록되지 않은 연구번호입니다. 담당 연구원에게 확인해 주세요.');
  if(p.uid&&p.uid!==S.user.uid)throw friendly('이미 다른 계정에 연결된 연구번호입니다.');if(!p.uid)await S.db.claimPatient(id,S.user.uid);
  await S.db.saveProfile(S.user.uid,{studyId:id});S.user.studyId=id;S.err='';await afterLogin()}),
 addPatient:safe(async fd=>{const id=(fd.get('studyId')||'').trim().toUpperCase();if(!/^[A-Z0-9-]{3,20}$/.test(id))throw friendly('연구번호는 영문·숫자·하이픈 3~20자로 입력해 주세요.');if(await S.db.getPatient(id).catch(()=>null))throw friendly('이미 등록된 연구번호입니다.');
  const st=+fd.get('stage'),limit=+fd.get('limit');const rec={stage:st,limit,memo:(fd.get('memo')||'').trim(),doctor:(fd.get('doctor')||'').trim(),enteredBy:S.user.name,at:Date.now()};
  await S.db.savePatient({studyId:id,name:(fd.get('name')||'').trim(),weight:+fd.get('weight'),stage:st,limit,memo:rec.memo,doctor:rec.doctor,nextVisit:(fd.get('nextVisit')||'').trim(),enteredBy:S.user.name,enteredByEmail:S.user.email,uid:null,createdAt:Date.now(),rxHistory:[rec]});
  await loadResearch();S.r.sel=id;S.modal=null;S.draft=null;toast('환자를 등록했어요');render()}),
 rx:safe(async fd=>{const p=S.r.patients.find(x=>x.studyId===S.r.sel),st=+fd.get('stage'),limit=+fd.get('limit');const rec={stage:st,limit,memo:(fd.get('memo')||'').trim(),doctor:(fd.get('doctor')||'').trim(),enteredBy:S.user.name,at:Date.now()};
  await S.db.savePatient({studyId:p.studyId,stage:st,limit,memo:rec.memo,doctor:rec.doctor,enteredBy:S.user.name,enteredByEmail:S.user.email,rxHistory:(p.rxHistory||[]).concat(rec)});await loadResearch();S.modal=null;S.draft=null;toast('처방을 변경했어요');render()})
};
function friendly(m){const e=new Error(m);e.friendly=true;return e}

/* ---------- 샘플 데이터 ---------- */
const SAMPLE=[['NDX-0001','김OO',64,3,'정형외과 김OO 교수',95,[80,76,88,82]],['NDX-0002','이OO',58,2,'정형외과 김OO 교수',null,[82,78,80,80]],['NDX-0003','박OO',70,5,'정형외과 최OO 교수',97,[90,94,92,97]],['NDX-0004','최OO',72,3,'정형외과 최OO 교수',62,[74,70,76,62]],['NDX-0005','정OO',61,4,'정형외과 김OO 교수',88,[84,86,88,86]]];
async function seedSamples(){const by=S.user?S.user.name:'Faircode 연구팀',em=S.user?S.user.email:'',out=[];
 for(const [id,name,wt,st,doc,today,wk] of SAMPLE){if(await S.db.getPatient(id))continue;const limit=calcLimit(wt,st);
  await S.db.savePatient({studyId:id,name,weight:wt,stage:st,limit,memo:'목발을 쓰면서 한도를 넘지 않게 걸어 주세요. 통증이 있으면 연습을 쉬고 알려 주세요.',doctor:doc,nextVisit:'다음 주 목요일',enteredBy:by,enteredByEmail:em,uid:null,sample:true,createdAt:Date.now(),rxHistory:[{stage:st,limit,memo:'',doctor:doc,enteredBy:by,at:Date.now()}]});
  const mk=(pct,t)=>{const steps=300+Math.floor(Math.random()*200),over=Math.round(steps*(1-pct/100)),peaks=[];for(let i=0;i<steps;i++)peaks.push(i<over?Math.round((limit+1+Math.random()*5)*10)/10:Math.round(limit*(.5+Math.random()*.45)*10)/10);for(let i=peaks.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[peaks[i],peaks[j]]=[peaks[j],peaks[i]]}
   return {id:'smp-'+id+'-'+t,uid:'sample',studyId:id,start:t,durationSec:Math.round(steps/42*60),steps,over,max:Math.max(...peaks),avg:Math.round(peaks.reduce((a,b)=>a+b,0)/steps*10)/10,spm:42,compliance:pct,pain:pct<70?4:1,peaks:peaks.slice(0,150),sample:true}};
  wk.forEach((pct,k)=>{const d=new Date();d.setHours(9+(k%3),10,0,0);d.setDate(d.getDate()-(wk.length-k));out.push(mk(pct,d.getTime()))});
  if(today!=null)out.push(mk(today,Date.now()-3600e3*Math.min(1,new Date().getHours()||1)))}
 if(out.length)await S.db.addSessions(out)}

/* ---------- 문의 알림(관리자·연구자) ---------- */
const unreadN=()=>S.inbox.filter(x=>x.dir!=='out'&&!x.read).length;
function updBadge(){document.querySelectorAll('.msg-badge').forEach(b=>{const n=unreadN();b.textContent=n;b.style.display=n?'inline-block':'none'})}
function showPopup(items){let box=$('#popup');if(!box){box=document.createElement('div');box.id='popup';document.body.appendChild(box)}
 const first=items[0];box.innerHTML=`<div class="pop" role="alert"><div class="pop-h"><b>🔔 새 문의 ${items.length}건</b><button data-pop="x" aria-label="닫기">✕</button></div><div class="pop-b"><b>${esc(first.studyId)} ${esc(first.name||'')}</b> <span class="pill ${first.kind==='통증'?'o':'g'}">${esc(first.kind)}</span>${first.pain!=null?` <span class="pill o">통증 ${first.pain}</span>`:''}<p>${esc(first.text.length>90?first.text.slice(0,90)+'…':first.text)}</p>${items.length>1?`<span class="sub" style="font-size:.78rem">외 ${items.length-1}건</span>`:''}</div><div class="pop-f"><button class="btn sm" data-pop="open">${S.user.role==='admin'?'문의함 열기':'확인'}</button></div></div>`;
 box.querySelector('[data-pop=x]').onclick=()=>box.innerHTML='';box.querySelector('[data-pop=open]').onclick=()=>{box.innerHTML='';if(S.user&&S.user.role==='admin'){S.a.tab='inbox';if(S.route==='admin')render();else go('admin')}else{items.forEach(x=>S.db.updateMessage(x.id,{read:true}))}}}
function startInbox(){stopInbox();if(!S.user||!S.db.subscribeMessages)return;
 if(S.user.role==='patient'){S.unsub=S.db.subscribeMessages(list=>{S.myMsgs=list;const fresh=list.filter(x=>(x.dir==='out'&&!x.pRead)||(x.dir!=='out'&&x.reply&&!x.replyRead)).filter(x=>!S.seen.has(x.id+(x.reply?'r':'')));if(fresh.length&&S.patient&&!S.preview){fresh.forEach(x=>S.seen.add(x.id+(x.reply?'r':'')));showPatientPopup(fresh)}if(S.modal&&S.modal.t==='contact')render()},{uid:S.user.uid});return}
 if(S.user.role==='patient')return;
 S.unsub=S.db.subscribeMessages(list=>{S.inbox=list;const fresh=list.filter(x=>x.dir!=='out'&&!x.read&&!S.seen.has(x.id));fresh.forEach(x=>S.seen.add(x.id));updBadge();if(fresh.length)showPopup(fresh);if(S.route==='admin'&&S.a.tab==='inbox'&&!S.modal)render()})}
function showPatientPopup(items){let box=$('#popup');if(!box){box=document.createElement('div');box.id='popup';document.body.appendChild(box)}const x=items[0],isReply=x.dir!=='out';
 box.innerHTML=`<div class="pop pop-p" role="alert"><div class="pop-h"><b>💬 ${isReply?'문의에 답변이 왔어요':'담당 연구원 메시지'}</b><button data-pop="x" aria-label="닫기">✕</button></div><div class="pop-b"><span class="sub" style="font-size:.78rem">${esc(isReply?x.repliedBy||'연구팀':x.fromName||'연구팀')}</span><p>${esc((isReply?x.reply:x.text).slice(0,120))}</p>${items.length>1?`<span class="sub" style="font-size:.78rem">외 ${items.length-1}건</span>`:''}</div><div class="pop-f"><button class="btn sm" data-pop="open">보기</button></div></div>`;
 box.querySelector('[data-pop=x]').onclick=()=>box.innerHTML='';box.querySelector('[data-pop=open]').onclick=()=>{box.innerHTML='';if(!S.patient)return;if(S.route==='walk'){toast('걷기를 마친 뒤 확인하세요');return}acts.contact()}}
function markPRead(){(S.myMsgs||[]).forEach(x=>{if(x.dir==='out'&&!x.pRead){x.pRead=true;S.db.updateMessage(x.id,{pRead:true}).catch(()=>{})}else if(x.dir!=='out'&&x.reply&&!x.replyRead){x.replyRead=true;S.db.updateMessage(x.id,{replyRead:true}).catch(()=>{})}})}
function stopInbox(){if(S.unsub){try{S.unsub()}catch{}}S.unsub=null;S.inbox=[];S.seen=new Set();const b=$('#popup');if(b)b.innerHTML=''}

/* ---------- 이벤트 ---------- */
function bind(){const app=$('#app');
 app.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el||el.disabled)return;const f=acts[el.dataset.act];if(f)f(el,e)});
 app.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-act][tabindex]')){e.preventDefault();e.target.click()}});
 app.addEventListener('submit',e=>{const f=e.target.closest('form[data-form]');if(!f)return;e.preventDefault();const fd=new FormData(f);S.draft=Object.fromEntries(fd);S.draft.password=undefined;const fn=forms[f.dataset.form];if(fn)fn(fd)});
 app.addEventListener('input',e=>{const t=e.target,b=t.dataset&&t.dataset.bind;
  if(b==='load'){W.load=+t.value;const v=$('#loadv');if(v)v.textContent=f1(W.load)}
  else if(b==='pain'){S.pain=+t.value;const box=$('#painbox');const hi=S.pain>=4;if(box)box.innerHTML=hi?painNotice():'';const n=t.closest('.card').querySelector('.num');if(n){n.textContent=S.pain;n.style.color=hi?'var(--over)':'var(--deep)'}
   const cb=$('.scr .btn.ghost[data-act="contact"]');if(hi&&!cb){const sb=$('#saveb');sb.insertAdjacentHTML('beforebegin','<button class="btn ghost" data-act="contact" style="margin-bottom:10px">병원에 문의</button>')}else if(!hi&&cb)cb.remove()}
  else if(b==='q'){S.r.q=t.value;render()}
  else if(t.name==='limit'){const f=t.closest('form');if(f)f.dataset.manual='1'}});
 app.addEventListener('change',safe(async e=>{const t=e.target;if(t.dataset&&t.dataset.chg==='urole'){const u=S.a.users.find(x=>x.uid===t.dataset.id);if(u&&u.uid!==S.user.uid){await S.db.saveProfile(u.uid,{role:t.value});u.role=t.value;toast('역할을 '+ROLE_KO[t.value]+'(으)로 바꿨어요');render()}return}const f=t.closest&&t.closest('form');if(!f||!(t.name==='stage'||t.name==='weight'))return;const w=f.querySelector('[name=weight]').value,s=+f.querySelector('[name=stage]').value;if(w&&s)f.querySelector('[name=limit]').value=calcLimit(w,s)}));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&S.modal&&S.route!=='walk'){S.modal=null;render()}});
}

async function init(){bind();S.db=await NewdicDB.open();
 if(S.db.mode==='local'&&!LS.get('seeded',false)){S.user=null;await seedSamples();LS.set('seeded',true)}
 try{S.user=await S.db.restore()}catch{S.user=null}
 if(S.user)await afterLogin();else render()}
window.NewdicApp={S,W,go,acts};
init().catch(e=>{console.error(e);$('#app').innerHTML='<div class="phone"><div class="scr"><h2>앱을 불러오지 못했어요</h2><p class="sub">'+esc(e.message||e)+'</p></div></div>'});
})();
