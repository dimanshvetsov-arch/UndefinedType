'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {WebSocketServer, WebSocket} = require('ws');
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 3000);
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const DATABASE_URL = process.env.DATABASE_URL;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'users.json');
const users = new Map();
const rooms = new Map();
const clients = new Set();
const queue = [];
// Same 70 language word lists used by the solo typing mode.
const languageBanks = require('./languages.json');
const supportedLanguage = code => typeof code === 'string' && Object.prototype.hasOwnProperty.call(languageBanks, code);
const languageOrDefault = code => code === undefined ? 'en' : supportedLanguage(code) ? code : null;
const languageLabel = code => languageBanks[code]?.english || 'English';
let database;

const makeText = (words=80,language='en') => {
  const bank=(languageBanks[language]?.bank||languageBanks.en.bank).split(/\s+/u).filter(Boolean);
  return Array.from({length:words},()=>bank[crypto.randomInt(bank.length)]).join(' ');
};
const send = (ws, data) => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); };
const respond = (res, code, data) => {res.writeHead(code, {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options':'nosniff'}); res.end(JSON.stringify(data));};
const publicUser = u => ({username:u.username, elo:u.elo ?? 1000, wins:u.wins ?? 0, losses:u.losses ?? 0, draws:u.draws ?? 0});
const eloK = rating => rating >= 2200 ? 12 : rating >= 1800 ? 16 : rating >= 1400 ? 22 : rating >= 1100 ? 28 : 34;
const eloChange = (rating, opponentRating, outcome) => Math.round(eloK(rating)*(outcome - 1/(1+10**((opponentRating-rating)/400))));
const usernameKey = str => String(str || '').trim().toLowerCase();
const passwordHash = (password, salt) => crypto.scryptSync(password, salt, 64).toString('hex');
const newPlayer = ws => ({ws, id:ws.id, user:ws.user, typed:'', position:0, correct:0, errors:0, strokes:0,missStrokes:0,lockedBefore:0,progress:0, wpm:0, accuracy:100,finishedAt:0,finishOrder:0});
const uniqueCode = () => {let id; do {id=crypto.randomBytes(4).toString('hex').toUpperCase();} while(rooms.has(id)); return id;};

// Signed tokens survive app restarts when SESSION_SECRET is stable. Do not send the secret to browsers.
function makeToken(key) {
  const payload = Buffer.from(JSON.stringify({sub:key, exp:Date.now()+30*24*3600*1000})).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}
function getUserFromToken(token) {
  try {
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature) return null;
    const expected = crypto.createHmac('sha256', SECRET).update(payload).digest();
    const received = Buffer.from(signature, 'base64url');
    if(received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null;
    const data=JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.sub || !Number.isFinite(data.exp) || data.exp < Date.now()) return null;
    return users.get(data.sub) || null;
  } catch {return null;}
}
function authRequest(req) {const raw=String(req.headers.authorization||''); return getUserFromToken(raw.startsWith('Bearer ')?raw.slice(7):'');}
async function initializeStorage() {
  if (DATABASE_URL) {
    const {Pool} = require('pg');
    database = new Pool({connectionString:DATABASE_URL, max:3, connectionTimeoutMillis:10000});
    await database.query(`CREATE TABLE IF NOT EXISTS undefinedtype_users (
      username_key TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      elo INTEGER NOT NULL DEFAULT 1000,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      draws INTEGER NOT NULL DEFAULT 0
    )`);
    const rows = await database.query('SELECT * FROM undefinedtype_users');
    for(const r of rows.rows) users.set(r.username_key, {username:r.username, salt:r.salt, hash:r.password_hash, elo:r.elo, wins:r.wins, losses:r.losses, draws:r.draws});
    console.log(`PostgreSQL connected; ${users.size} accounts loaded.`);
  } else {
    try {const saved=JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));for(const [key,u] of Object.entries(saved)) users.set(key,u);} catch {}
    console.warn('Using local accounts file. On Render Free, configure DATABASE_URL for permanent accounts.');
  }
}
async function saveUsers(changed) {
  if(database) {
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      for(const u of changed) await client.query(`INSERT INTO undefinedtype_users(username_key,username,salt,password_hash,elo,wins,losses,draws)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT(username_key) DO UPDATE SET username=EXCLUDED.username, salt=EXCLUDED.salt, password_hash=EXCLUDED.password_hash,
          elo=EXCLUDED.elo,wins=EXCLUDED.wins,losses=EXCLUDED.losses,draws=EXCLUDED.draws`,
        [usernameKey(u.username),u.username,u.salt,u.hash,u.elo||1000,u.wins||0,u.losses||0,u.draws||0]);
      await client.query('COMMIT');
    } catch(e) {await client.query('ROLLBACK');throw e;} finally {client.release();}
  } else {
    const json=Object.fromEntries(users.entries());
    const tmp=DATA_FILE + '.tmp';
    fs.writeFileSync(tmp,JSON.stringify(json));
    fs.renameSync(tmp,DATA_FILE);
  }
}

function view(r){return {type:'room',code:r.code,visibility:r.visibility,ranked:r.ranked,status:r.status,duration:r.duration,wordCount:r.wordCount,language:r.language,
  players:r.players.map(p=>({id:p.id,name:p.user.username,elo:p.user.elo||1000,progress:p.progress,position:p.position,correct:p.correct,wpm:p.wpm,accuracy:p.accuracy})),
  matchmaking:r.matchmaking||false,startAt:r.startAt||0, serverTime:Date.now()};}
function broadcast(r,msg) {for(const p of r.players) send(p.ws,msg);}
function lobby() {
  const open=[...rooms.values()].filter(r=>r.visibility==='public'&&r.status==='waiting'&&r.players.length===1)
    .map(r=>({code:r.code,host:r.players[0].user.username,players:r.players.length,duration:r.duration,wordCount:r.wordCount,language:r.language}));
  const message={type:'lobby',rooms:open,queue:queue.length};
  for(const ws of clients) send(ws,message);
}
function removeQueue(ws) {const i=queue.indexOf(ws);if(i!==-1)queue.splice(i,1);ws.queuedAt=0;}
function cleanRoom(r){clearTimeout(r.timer);clearTimeout(r.endTimer);rooms.delete(r.code);}
function leave(ws) {
  removeQueue(ws);
  const r=rooms.get(ws.room); ws.room=null;
  if(!r) {lobby();return;}
  const i=r.players.findIndex(p=>p.ws===ws);
  if(i!==-1) {
    if(r.status==='running'&&r.players.length===2) {
      const opponent=r.players.find(p=>p.ws!==ws);
      const finished=r.players.find(p=>p.finishedAt);
      endMatch(r,'forfeit',finished?.id||opponent?.id||null);
    }
    r.players.splice(i,1);
    if(r.status==='countdown') {
      clearTimeout(r.timer);
      r.status='waiting';r.startAt=0;r.text='';
      for(const p of r.players) Object.assign(p,{typed:'',position:0,correct:0,errors:0,strokes:0,missStrokes:0,lockedBefore:0,progress:0,wpm:0,accuracy:100,finishedAt:0,finishOrder:0});
      broadcast(r,{type:'countdownCancelled',message:'Player left. Waiting for another opponent.'});
    }
  }
  if(r.players.length===0) cleanRoom(r);
  else broadcast(r,view(r));
  lobby();
}
function join(ws,r) {
  if(!ws.user) return send(ws,{type:'error',message:'Please log in to play multiplayer.'});
  if(r.status!=='waiting'||r.players.length>=2) return send(ws,{type:'error',message:'Room is full or already started.'});
  if(r.players.some(p=>usernameKey(p.user.username)===usernameKey(ws.user.username))) return send(ws,{type:'error',message:'You cannot race your own account.'});
  leave(ws);
  r.players.push(newPlayer(ws));ws.room=r.code;
  broadcast(r,view(r));
  if(r.players.length===2) startCountdown(r);
  lobby();
}
function createRoom(ws,visibility,ranked,wordCount=80,language='en') {
  leave(ws);
  const r={code:uniqueCode(),visibility,ranked,language,duration:0,wordCount:[30,60,100,150].includes(wordCount)?wordCount:80,status:'waiting',players:[],startAt:0,text:'',timer:null,endTimer:null,finishSerial:0};
  rooms.set(r.code,r);join(ws,r);
  return r;
}
function startCountdown(r) {
  if(r.status!=='waiting'||r.players.length!==2) return;
  r.status='countdown';r.text=makeText(r.wordCount,r.language);r.startAt=Date.now()+5000;
  broadcast(r,view(r));
  broadcast(r,{type:'countdown',text:r.text,language:r.language,startAt:r.startAt,serverTime:Date.now(),duration:r.duration});
  r.timer=setTimeout(()=>{
    if(r.status!=='countdown'||r.players.length!==2) return;
    r.status='running';broadcast(r,{type:'start',startAt:r.startAt,serverTime:Date.now()});
    // No race deadline: both players must finish the passage.
  },5000);
}
async function endMatch(r,reason='time',forcedWinnerId=null) {
  if(r.status!=='running') return;
  r.status='finished';clearTimeout(r.endTimer);clearTimeout(r.timer);
  const scores=r.players.map(p=>{
    const elapsed=Math.max(.01,((p.finishedAt||Date.now())-r.startAt)/1000);
    const seconds=elapsed;
    return {id:p.id,name:p.user.username,
      wpm:Math.round((p.correct/5)/(seconds/60)),
      rawWpm:Math.round((p.strokes/5)/(seconds/60)),
      accuracy:p.accuracy, progress:p.progress,position:p.position,correct:p.correct,
      elapsed:Math.round(elapsed*10)/10,
      errors:p.missStrokes, currentErrors:p.errors,strokes:p.strokes,finished:!!p.finishedAt,finishOrder:p.finishOrder};
  });
  const ordered=[...scores].sort((a,b)=>Number(b.finished)-Number(a.finished)||(a.finished&&b.finished?a.finishOrder-b.finishOrder:a.elapsed-b.elapsed)||b.accuracy-a.accuracy);
  const isDraw=!forcedWinnerId&&(ordered.length!==2||(!ordered[0].finished&&!ordered[1].finished&&ordered[0].elapsed===ordered[1].elapsed));
  const winnerId=forcedWinnerId||(isDraw?null:ordered[0].id);
  const changes={};
  if(r.ranked&&r.players.length===2) {
    const [a,b]=r.players;
    const oldA=a.user.elo||1000,oldB=b.user.elo||1000;
    const score=isDraw?0.5:winnerId===a.id?1:0;
    a.user.elo=Math.max(100,oldA+eloChange(oldA,oldB,score));b.user.elo=Math.max(100,oldB+eloChange(oldB,oldA,1-score));
    for(const p of [a,b]) {const key=isDraw?'draws':winnerId===p.id?'wins':'losses';p.user[key]=(p.user[key]||0)+1;}
    changes[a.id]={...publicUser(a.user),delta:a.user.elo-oldA};
    changes[b.id]={...publicUser(b.user),delta:b.user.elo-oldB};
    try {await saveUsers([a.user,b.user]);}catch(e){console.error('Failed to save match:',e);}
  }
  broadcast(r,{type:'finished',reason,winnerId,players:scores,ratings:changes,roomCode:r.code});
  lobby();
}
function checkQueue() {
  for(let i=0;i<queue.length;i++) {
    const a=queue[i];if(a.readyState!==WebSocket.OPEN||!a.user||a.room) {queue.splice(i--,1);continue;}
  }
  for(let i=0;i<queue.length;i++) {
    const a=queue[i],aWait=(Date.now()-a.queuedAt)/1000;
    const rangeA=Math.min(2000,150+Math.floor(aWait/5)*75);
    const j=queue.findIndex((b,k)=>k>i&&b.user&&b.queueMode===a.queueMode&&b.queueLanguage===a.queueLanguage&&usernameKey(b.user.username)!==usernameKey(a.user.username)
      &&(a.queueMode==='unranked'||Math.abs((a.user.elo||1000)-(b.user.elo||1000)) <= Math.max(rangeA,Math.min(2000,150+Math.floor((Date.now()-b.queuedAt)/5000)*75))));
    if(j<0)continue;
    const b=queue[j];removeQueue(a);removeQueue(b);
    const r=createRoom(a,'private',a.queueMode!=='unranked',80,a.queueLanguage||'en');r.matchmaking=true;join(b,r);
    send(a,{type:'matchFound'});send(b,{type:'matchFound'});
    lobby();return;
  }
}
// One-step correction rule shared conceptually with the browser:
// correctly typed words cannot be erased, and beginning a new word locks
// every earlier word, including incorrectly typed ones.
function canEraseRacerWord(value, reference, floor){
  if(!value||value.length-1<floor)return false;
  const end=value.endsWith(' ')?value.length-1:value.length;
  const start=value.lastIndexOf(' ',end-1)+1;
  return value.slice(start,end)!==reference.slice(start,end);
}
function acceptInput(ws, raw) {
  const r=rooms.get(ws.room);
  const p=r?.players.find(player=>player.ws===ws);
  if(!p||r.status!=='running'||p.finishedAt) return;
  if(typeof raw!=='string'||raw.length>r.text.length||raw.includes('\n')||raw.includes('\r')) return;
  const elapsedSeconds=Math.max(.01,(Date.now()-r.startAt)/1000);
  // Prevent skipping forward, rewriting finished words, or backspacing past
  // an already correct word. This must be enforced server-side as well.
  if(raw.length-p.typed.length>12 || raw.length>Math.floor(elapsedSeconds*30)+12) return;
  if(raw===p.typed) return;
  const before=p.typed;
  if(raw===before.slice(0,-1)){
    if(!canEraseRacerWord(before,r.text,p.lockedBefore))return;
  }else if(raw.startsWith(before)&&raw.length>before.length){
    for(let i=before.length;i<raw.length;i++){
      if(i>0&&raw[i-1]===' ')p.lockedBefore=i;
    }
  }else return;
  let prefix=before.length;
  if(raw.length<before.length)prefix=raw.length;
  for(let i=prefix;i<raw.length;i++){p.strokes++;if(raw[i]!==r.text[i])p.missStrokes++;}
  p.typed=raw;p.position=raw.length;
  let correct=0;
  for(let i=0;i<raw.length;i++) if(raw[i]===r.text[i]) correct++;
  p.correct=correct;p.errors=raw.length-correct;
  p.progress=Math.round(100*raw.length/r.text.length);
  p.wpm=Math.round(correct/5/(elapsedSeconds/60));
  p.accuracy=p.strokes?Math.round((p.strokes-p.missStrokes)/p.strokes*1000)/10:100;
  broadcast(r,{type:'progress',id:p.id,progress:p.progress,position:p.position,correct:p.correct,wpm:p.wpm,accuracy:p.accuracy});
  if(raw.length===r.text.length) {
    p.finishedAt=Date.now();p.finishOrder=++r.finishSerial;
    broadcast(r,{type:'playerFinished',id:p.id,name:p.user.username});
    if(r.players.every(player=>player.finishedAt)) endMatch(r,'completed');
    else {const now=Date.now();send(ws,{type:'provisionalResults',winnerId:p.id,reason:'in progress',players:r.players.map(x=>{const elapsed=Math.max(.01,((x.finishedAt||now)-r.startAt)/1000);return {id:x.id,name:x.user.username,finished:!!x.finishedAt,elapsed:Math.round(elapsed*10)/10,wpm:Math.round((x.correct/5)/(elapsed/60)),rawWpm:Math.round((x.strokes/5)/(elapsed/60)),accuracy:x.accuracy,errors:x.missStrokes};})});}
  }
}
const allowedFiles=new Map([['/','index.html'],['/index.html','index.html'],['/style.css','style.css'],['/app.js','app.js'],['/multiplayer.js','multiplayer.js'],['/logo.png','logo.png']]);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'};
const authFailures=new Map();
function recordFailure(ip) {const now=Date.now();const x=authFailures.get(ip)||{count:0,since:now};if(now-x.since>15*60*1000){x.count=0;x.since=now;}x.count++;authFailures.set(ip,x);}
function tooManyFailures(ip) {const entry=authFailures.get(ip);return entry&&Date.now()-entry.since<15*60*1000&&entry.count>=15;}
const server=http.createServer((req,res)=>{
  let pathname;
  try {pathname=new URL(req.url,'http://localhost').pathname;}catch{return respond(res,400,{error:'Invalid URL'});}
  if(pathname==='/health')return respond(res,200,{ok:true});
  if(pathname==='/api/status')return respond(res,200,{persistent:Boolean(database),storage:database?'postgresql':'temporary',accounts:users.size});
  if(pathname==='/api/languages' && req.method==='GET')return respond(res,200,{languages:Object.entries(languageBanks).map(([code,details])=>({code,english:details.english,native:details.native}))});
  if(pathname==='/api/me')return respond(res,200,{user:authRequest(req)?publicUser(authRequest(req)):null});
  if(pathname==='/api/leaderboard') {
    if(database){Promise.all([database.query('SELECT username,elo,wins,losses,draws FROM undefinedtype_users ORDER BY elo DESC, wins DESC, username ASC LIMIT 100'),database.query('SELECT count(*)::int AS total FROM undefinedtype_users')]).then(([result,count])=>respond(res,200,{players:result.rows.map(publicUser),total:count.rows[0].total,persistent:true})).catch(e=>{console.error('Leaderboard error:',e);respond(res,503,{error:'Leaderboard unavailable'});});return;}
    return respond(res,200,{players:[...users.values()].map(publicUser).sort((a,b)=>b.elo-a.elo||b.wins-a.wins).slice(0,100),total:users.size,persistent:false});
  }
  if(pathname==='/api/auth'&&req.method==='POST') {
    const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0].trim();
    if(tooManyFailures(ip))return respond(res,429,{error:'Too many attempts. Try again later.'});
    let body='',aborted=false;
    req.on('data',chunk=>{body+=chunk;if(body.length>4096&&!aborted){aborted=true;respond(res,413,{error:'Request too large'});}});
    req.on('end',async()=>{
      if(aborted)return;
      let data;try {data=JSON.parse(body);}catch{return respond(res,400,{error:'Invalid request'});}
      const name=String(data.username||'').trim(),key=usernameKey(name),password=String(data.password||'');
      if(!/^[a-zA-Z0-9_]{3,20}$/.test(name)||password.length<8||password.length>128)return respond(res,400,{error:'Username: 3–20 letters, numbers or _. Password: 8–128 characters.'});
      let u=users.get(key);
      if(data.action==='register') {
        if(u)return respond(res,409,{error:'Username already taken.'});
        const salt=crypto.randomBytes(16).toString('hex');
        u={username:name,salt,hash:passwordHash(password,salt),elo:1000,wins:0,losses:0,draws:0};
        users.set(key,u);
        try {await saveUsers([u]);}catch(e){users.delete(key);console.error('Registration storage error:',e);return respond(res,503,{error:'Accounts are temporarily unavailable.'});}
      } else if(data.action==='login') {
        const claimedHash=passwordHash(password, u?.salt || 'invalid-user-salt');
        if(!u||!crypto.timingSafeEqual(Buffer.from(claimedHash,'hex'),Buffer.from(u.hash,'hex'))) {
          recordFailure(ip);return respond(res,401,{error:!u?'Account not found. Check your username or create an account.':'Incorrect password.'});
        }
      } else return respond(res,400,{error:'Unknown action'});
      return respond(res,200,{token:makeToken(key),user:publicUser(u)});
    });return;
  }
  const filename=allowedFiles.get(pathname);
  if(req.method!=='GET'||!filename)return respond(res,404,{error:'Not found'});
  const file=path.join(ROOT,filename);
  res.writeHead(200,{'content-type':mime[path.extname(file)],'x-content-type-options':'nosniff','cache-control':filename==='index.html'?'no-cache':'public, max-age=300'});
  fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
});
const wss=new WebSocketServer({server,path:'/ws',maxPayload:8192});
wss.on('connection',(ws,req)=>{
  const origin=req.headers.origin;
  if(origin){try{if(new URL(origin).host!==req.headers.host){ws.close(1008,'Invalid origin');return;}}catch{ws.close(1008,'Invalid origin');return;}}
  ws.id=crypto.randomUUID();ws.room=null;ws.queuedAt=0;ws.user=null;clients.add(ws);
  let rate=0,last=Date.now();
  send(ws,{type:'hello',id:ws.id,serverTime:Date.now()});lobby();
  ws.on('message',buf=>{
    const now=Date.now();if(now-last>1000){rate=0;last=now;}if(++rate>40)return;
    let m;try{m=JSON.parse(buf.toString());}catch{return;}
    if(!m||typeof m.type!=='string')return;
    if(m.type==='auth') {const next=getUserFromToken(m.token);if(ws.room && usernameKey(ws.user?.username)!==usernameKey(next?.username)) leave(ws);ws.user=next;send(ws,{type:'auth',user:ws.user?publicUser(ws.user):null});return;}
    if(m.type==='unauth') {leave(ws);ws.user=null;send(ws,{type:'auth',user:null});return;}
    if(m.type==='lobby') {lobby();return;}
    if(!ws.user)return send(ws,{type:'error',message:'Log in to play multiplayer.'});
    if(m.type==='leave') {leave(ws);send(ws,{type:'leftRoom'});return;}
    if(m.type==='create') {
      const lang=languageOrDefault(m.language);
      if(!lang)return send(ws,{type:'error',message:'Unsupported text language.'});
      createRoom(ws,m.visibility==='public'?'public':'private',false,Number(m.wordCount),lang);return;
    }
    if(m.type==='join') {const r=rooms.get(String(m.code||'').toUpperCase());return r?join(ws,r):send(ws,{type:'error',message:'Room not found.'});}
    if(m.type==='queue') {
      const lang=languageOrDefault(m.language);
      if(!lang)return send(ws,{type:'error',message:'Unsupported text language.'});
      if(ws.room){leave(ws);}
      if(!queue.includes(ws)){ws.queuedAt=Date.now();ws.queueMode=m.mode==='unranked'?'unranked':'ranked';ws.queueLanguage=lang;queue.push(ws);send(ws,{type:'queued',mode:ws.queueMode,language:lang});}
      checkQueue();lobby();return;
    }
    if(m.type==='cancelQueue'){removeQueue(ws);send(ws,{type:'queueCancelled'});lobby();return;}
    if(m.type==='input')acceptInput(ws,m.value);
  });
  ws.on('close',()=>{clients.delete(ws);leave(ws);});
  ws.on('error',()=>{});
});
const queueTimer=setInterval(checkQueue,1000);
queueTimer.unref?.();
async function start() {
  try{await initializeStorage();server.listen(PORT,'0.0.0.0',()=>console.log(`UndefinedType v2.1 online at port ${PORT}`));}
  catch(e){console.error('Cannot start: storage initialization failed.',e);process.exitCode=1;}
}
if(require.main===module) start();
module.exports={start,server,users,rooms,queue,checkQueue,makeToken,getUserFromToken,acceptInput,endMatch,eloChange,eloK};
