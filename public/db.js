// 데이터 계층: Firebase(Auth+Firestore) 또는 체험 모드(localStorage)
(function(){
'use strict';
const mem={};
const LS={get(k,d){try{const v=localStorage.getItem('nd_'+k);if(v!=null)return JSON.parse(v)}catch{}return k in mem?mem[k]:d},set(k,v){mem[k]=v;try{localStorage.setItem('nd_'+k,JSON.stringify(v))}catch{}}};
const SS={get(){try{return sessionStorage.getItem('nd_me')||null}catch{return mem.__me||null}},set(v){mem.__me=v;try{v?sessionStorage.setItem('nd_me',v):sessionStorage.removeItem('nd_me')}catch{}}};
const E=m=>{const e=new Error(m);e.friendly=true;return e};
const hash=s=>{try{return btoa(unescape(encodeURIComponent(s)))}catch{return s}};
const uid=()=>'u'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

const Local={mode:'local',
 async signUp({email,password,name,role,extra}){email=email.toLowerCase();const acc=LS.get('acc',{});if(acc[email])throw E('이미 가입된 이메일입니다. 로그인해 주세요.');const id=uid();const prof={uid:id,email,name,role,...extra,createdAt:Date.now()};acc[email]={uid:id,pw:hash(password)};LS.set('acc',acc);const u=LS.get('users',{});u[id]=prof;LS.set('users',u);SS.set(id);return prof},
 async signIn(email,pw){email=email.toLowerCase();const a=LS.get('acc',{})[email];if(!a||a.pw!==hash(pw))throw E('이메일 또는 비밀번호가 맞지 않습니다.');SS.set(a.uid);return LS.get('users',{})[a.uid]},
 async signOut(){SS.set(null)},
 async restore(){const id=SS.get();return id?(LS.get('users',{})[id]||null):null},
 async saveProfile(id,patch){const u=LS.get('users',{});u[id]={...u[id],...patch};LS.set('users',u)},
 async listUsers(){return Object.values(LS.get('users',{}))},
 async deletePatient(id){const a=LS.get('patients',{});delete a[id];LS.set('patients',a)},
 async listPatients(){return Object.values(LS.get('patients',{}))},
 async getPatient(id){return LS.get('patients',{})[id]||null},
 async savePatient(p){const a=LS.get('patients',{});a[p.studyId]={...a[p.studyId],...p};LS.set('patients',a)},
 async claimPatient(id,u){const a=LS.get('patients',{});if(!a[id])throw E('등록되지 않은 연구번호입니다.');if(a[id].uid&&a[id].uid!==u)throw E('이미 다른 앱에 연결된 연구번호입니다.');a[id].uid=u;a[id].linkedAt=Date.now();LS.set('patients',a)},
 async unclaimPatient(id,u){const a=LS.get('patients',{});if(a[id]&&a[id].uid===u){a[id].uid=null;LS.set('patients',a)}},
 async listSessions({studyId,uid:u}){let s=LS.get('sessions',[]);if(u)s=s.filter(x=>x.uid===u);else if(studyId)s=s.filter(x=>x.studyId===studyId);return s.sort((a,b)=>b.start-a.start)},
 async addSession(s){const a=LS.get('sessions',[]);a.push(s);LS.set('sessions',a)},
 async addMessage(m){const a=LS.get('messages',[]);a.push(m);LS.set('messages',a)},
 async listMessages({uid:u}){return LS.get('messages',[]).filter(x=>!u||x.uid===u).sort((a,b)=>b.createdAt-a.createdAt)},
 async updateMessage(id,patch){const a=LS.get('messages',[]);const i=a.findIndex(x=>x.id===id);if(i>=0){a[i]={...a[i],...patch};LS.set('messages',a)}},
 subscribeMessages(cb,o={}){let last='';const tick=()=>{const l=LS.get('messages',[]).filter(x=>!o.uid||x.uid===o.uid);const j=JSON.stringify(l);if(j!==last){last=j;cb(l.slice().sort((a,b)=>b.createdAt-a.createdAt))}};tick();const t=setInterval(tick,1500);return()=>clearInterval(t)},
 async addSessions(list){const a=LS.get('sessions',[]);LS.set('sessions',a.concat(list))}
};

async function fbInit(cfg){
 const base='https://www.gstatic.com/firebasejs/10.12.2/';
 const [{initializeApp},A,F]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')]);
 const app=initializeApp(cfg),auth=A.getAuth(app),db=F.getFirestore(app);
 const ko=e=>{const c=e&&e.code||'';const m={'auth/email-already-in-use':'이미 가입된 이메일입니다. 로그인해 주세요.','auth/invalid-credential':'이메일 또는 비밀번호가 맞지 않습니다.','auth/wrong-password':'이메일 또는 비밀번호가 맞지 않습니다.','auth/user-not-found':'이메일 또는 비밀번호가 맞지 않습니다.','auth/weak-password':'비밀번호는 6자 이상이어야 합니다.','auth/invalid-email':'이메일 형식을 확인해 주세요.','auth/network-request-failed':'네트워크 연결을 확인해 주세요.','permission-denied':'권한이 없습니다. 연구번호나 계정 권한을 확인해 주세요.'};return m[c]?E(m[c]):e};
 const w=async f=>{try{return await f()}catch(e){throw ko(e)}};
 const udoc=id=>F.doc(db,'users',id);
 return {mode:'firebase',
  signUp:({email,password,name,role,extra})=>w(async()=>{const c=await A.createUserWithEmailAndPassword(auth,email,password);const prof={uid:c.user.uid,email:email.toLowerCase(),name,role,...extra,createdAt:Date.now()};await F.setDoc(udoc(c.user.uid),prof);return prof}),
  signIn:(email,pw)=>w(async()=>{const c=await A.signInWithEmailAndPassword(auth,email,pw);const s=await F.getDoc(udoc(c.user.uid));if(!s.exists())throw E('가입 정보가 없습니다. 다시 가입해 주세요.');return s.data()}),
  signOut:()=>A.signOut(auth),
  restore:()=>new Promise(res=>{const un=A.onAuthStateChanged(auth,async u=>{un();if(!u)return res(null);try{const s=await F.getDoc(udoc(u.uid));res(s.exists()?s.data():null)}catch{res(null)}})}),
  saveProfile:(id,patch)=>w(()=>F.setDoc(udoc(id),patch,{merge:true})),
  listUsers:()=>w(async()=>(await F.getDocs(F.collection(db,'users'))).docs.map(x=>x.data())),
  deletePatient:id=>w(()=>F.deleteDoc(F.doc(db,'patients',id))),
  listPatients:()=>w(async()=>(await F.getDocs(F.collection(db,'patients'))).docs.map(d=>d.data())),
  getPatient:id=>w(async()=>{const s=await F.getDoc(F.doc(db,'patients',id));return s.exists()?s.data():null}),
  savePatient:p=>w(()=>F.setDoc(F.doc(db,'patients',p.studyId),p,{merge:true})),
  claimPatient:(id,u)=>w(()=>F.updateDoc(F.doc(db,'patients',id),{uid:u,linkedAt:Date.now()})),
  unclaimPatient:(id,u)=>w(()=>F.updateDoc(F.doc(db,'patients',id),{uid:null,linkedAt:Date.now()})),
  listSessions:({studyId,uid:u})=>w(async()=>{const c=F.collection(db,'sessions');const q=u?F.query(c,F.where('uid','==',u)):studyId?F.query(c,F.where('studyId','==',studyId)):c;return (await F.getDocs(q)).docs.map(d=>d.data()).sort((a,b)=>b.start-a.start)}),
  addSession:s=>w(()=>F.setDoc(F.doc(db,'sessions',s.id),s)),
  addMessage:m=>w(()=>F.setDoc(F.doc(db,'messages',m.id),m)),
  listMessages:({uid:u})=>w(async()=>(await F.getDocs(F.query(F.collection(db,'messages'),F.where('uid','==',u)))).docs.map(x=>x.data()).sort((a,b)=>b.createdAt-a.createdAt)),
  updateMessage:(id,patch)=>w(()=>F.updateDoc(F.doc(db,'messages',id),patch)),
  subscribeMessages:(cb,o={})=>F.onSnapshot(o.uid?F.query(F.collection(db,'messages'),F.where('uid','==',o.uid)):F.collection(db,'messages'),snap=>cb(snap.docs.map(x=>x.data()).sort((a,b)=>b.createdAt-a.createdAt)),e=>console.error(e)),
  addSessions:l=>w(async()=>{for(const s of l)await F.setDoc(F.doc(db,'sessions',s.id),s)})
 };
}
window.NewdicDB={LS,async open(){const cfg=window.NEWDIC_FIREBASE;if(cfg&&cfg.apiKey){try{return await fbInit(cfg)}catch(e){console.error('Firebase 초기화 실패, 체험 모드로 전환',e)}}return Local}};
})();
