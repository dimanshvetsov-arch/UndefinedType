'use strict';
const {test,after} = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {mkdtempSync,rmSync} = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');

const tempDir = mkdtempSync(path.join(os.tmpdir(),'undefinedtype-test-'));
process.env.DATA_FILE=path.join(tempDir,'users.json');
process.env.SESSION_SECRET='unit-test-only-stable-session-secret';
let mockWss;
class FakeSocket extends EventEmitter {
  constructor(){super();this.readyState=1;this.messages=[];}
  send(json){this.messages.push(JSON.parse(json));}
  receive(obj){this.emit('message',Buffer.from(JSON.stringify(obj)));}
  latest(type){return this.messages.filter(m=>m.type===type).at(-1);}
  close(){this.readyState=3;this.emit('close');}
}
class FakeWss extends EventEmitter {constructor(){super();mockWss=this;}}
const originalLoad=Module._load;
Module._load=function(request,parent,isMain){if(request==='ws')return {WebSocketServer:FakeWss,WebSocket:{OPEN:1}};return originalLoad.apply(this,arguments);};
const engine=require('../server/index');
Module._load=originalLoad;
const server=engine.server;
let base;
function makeSocket() {const s=new FakeSocket();mockWss.emit('connection',s,{headers:{origin:base,host:new URL(base).host}});return s;}
async function register(username,password='strongPassword123') {
  const r=await fetch(base+'/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'register',username,password})});
  return {code:r.status,...await r.json()};
}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('initialize server',async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;
  const health=await (await fetch(base+'/health')).json();assert.equal(health.ok,true);
  assert.equal((await fetch(base+'/server/users.json')).status,404);
  assert.equal((await fetch(base+'/README.md')).status,404);
  assert.equal((await fetch(base+'/')).status,200);
});
test('guest blocked, account signup, login and durable token',async()=>{
  const guest=makeSocket();guest.receive({type:'create',visibility:'public'});
  assert.match(guest.latest('error').message,/Log in/i);
  const alice=await register('Alice');const bob=await register('Bob');
  assert.equal(alice.code,200);assert.equal(bob.code,200);
  assert.equal((await register('ALICE')).code,409);
  assert.equal(engine.getUserFromToken(alice.token).username,'Alice');
  const me=await (await fetch(base+'/api/me',{headers:{Authorization:'Bearer '+alice.token}})).json();
  assert.equal(me.user.username,'Alice');
  const wrong=await fetch(base+'/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'login',username:'Alice',password:'incorrect'})});
  assert.equal(wrong.status,401);
  const sock=makeSocket();sock.receive({type:'auth',token:alice.token});assert.equal(sock.latest('auth').user.username,'Alice');
  sock.receive({type:'unauth'});sock.receive({type:'queue'});assert.match(sock.latest('error').message,/Log in/i);
});
test('public room lists, join, five-second countdown, leaving resets it',async()=>{
  const alice=await fetch(base+'/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'login',username:'Alice',password:'strongPassword123'})}).then(x=>x.json());
  const bob=await fetch(base+'/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'login',username:'Bob',password:'strongPassword123'})}).then(x=>x.json());
  const a=makeSocket(),b=makeSocket();a.receive({type:'auth',token:alice.token});b.receive({type:'auth',token:bob.token});
  a.receive({type:'create',visibility:'public',wordCount:60});
  const room=a.latest('room');assert.equal(room.players.length,1);assert.equal(room.visibility,'public');
  assert.ok(b.latest('lobby').rooms.some(r=>r.code===room.code));
  b.receive({type:'join',code:room.code});
  const count=a.latest('countdown');assert.equal(count.duration,0);assert.equal(count.text.split(' ').length,60);assert.ok(count.startAt>Date.now());
  assert.equal(engine.rooms.get(room.code).status,'countdown');
  b.receive({type:'leave'});
  assert.equal(engine.rooms.get(room.code).status,'waiting');
  assert.ok(a.latest('countdownCancelled'));
  a.receive({type:'leave'});
  assert.equal(engine.rooms.has(room.code),false);
  a.close();b.close();
});
test('ranked queue auto-matches, starts without ready, and counts a forfeit in Elo',async()=>{
  const alice=await fetch(base+'/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'login',username:'Alice',password:'strongPassword123'})}).then(x=>x.json());
  const bob=await fetch(base+'/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'login',username:'Bob',password:'strongPassword123'})}).then(x=>x.json());
  const a=makeSocket(),b=makeSocket();a.receive({type:'auth',token:alice.token});b.receive({type:'auth',token:bob.token});
  a.receive({type:'queue'});assert.equal(a.latest('queued').type,'queued');
  b.receive({type:'queue'});assert.ok(a.latest('matchFound'));assert.ok(b.latest('matchFound'));
  const room=engine.rooms.get(a.room);assert.equal(room.ranked,true);assert.equal(room.players.length,2);
  assert.equal(room.status,'countdown');assert.ok(a.latest('countdown'));assert.ok(b.latest('countdown'));
  await pause(5200);assert.equal(room.status,'running');assert.ok(a.latest('start'));assert.ok(b.latest('start'));
  b.receive({type:'input',value:room.text.slice(0,8)});
  assert.equal(a.latest('progress').position,8);
  a.receive({type:'leave'});
  await pause(60);
  const result=b.latest('finished');assert.equal(result.reason,'forfeit');assert.equal(result.winnerId,b.id);
  assert.equal(result.ratings[b.id].elo,1016);assert.equal(result.ratings[a.id].elo,984);
  assert.equal(engine.users.get('bob').wins,1);assert.equal(engine.users.get('alice').losses,1);
  const ranks=await (await fetch(base+'/api/leaderboard')).json();assert.equal(ranks.players[0].username,'Bob');
  b.receive({type:'leave'});a.close();b.close();
});
test('re-authenticating the same account does not eject them from a private room',async()=>{
  const carol=await register('Carol');
  const c=makeSocket();
  c.receive({type:'auth',token:carol.token});
  c.receive({type:'create',visibility:'private',duration:30});
  const code=c.latest('room').code;
  assert.equal(engine.rooms.get(code).players.length,1);
  c.receive({type:'auth',token:carol.token});
  assert.equal(c.latest('auth').user.username,'Carol');
  assert.equal(c.room,code);
  assert.equal(engine.rooms.get(code).players.length,1);
  c.receive({type:'leave'});
  assert.equal(engine.rooms.has(code),false);
  c.close();
});
after(async()=>{await new Promise(resolve=>server.close(resolve));rmSync(tempDir,{recursive:true,force:true});});
test('unranked queue pairs players without changing Elo',async()=>{
  const alice=await fetch(base+'/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'login',username:'Alice',password:'strongPassword123'})}).then(x=>x.json());
  const bob=await fetch(base+'/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'login',username:'Bob',password:'strongPassword123'})}).then(x=>x.json());
  const a=makeSocket(),b=makeSocket();a.receive({type:'auth',token:alice.token});b.receive({type:'auth',token:bob.token});
  const oldA=a.user.elo,oldB=b.user.elo;
  a.receive({type:'queue',mode:'unranked'});b.receive({type:'queue',mode:'unranked'});
  const room=engine.rooms.get(a.room);
  assert.equal(room.ranked,false);assert.equal(room.matchmaking,true);
  assert.equal(room.duration,0);assert.equal(room.wordCount,80);
  assert.equal(room.players.length,2);
  a.receive({type:'leave'});
  assert.equal(a.user.elo,oldA);assert.equal(b.user.elo,oldB);
  a.close();b.close();
});

test('both racers must finish before unranked results, and corrected mistakes count',async()=>{
  const aToken=await fetch(base+'/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'login',username:'Alice',password:'strongPassword123'})}).then(r=>r.json());
  const bToken=await fetch(base+'/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'login',username:'Bob',password:'strongPassword123'})}).then(r=>r.json());
  const a=makeSocket(),b=makeSocket();
  a.receive({type:'auth',token:aToken.token}); b.receive({type:'auth',token:bToken.token});
  const oldEloA=a.user.elo,oldEloB=b.user.elo;
  a.receive({type:'create',visibility:'private',wordCount:30});
  const code=a.latest('room').code;
  b.receive({type:'join',code});
  const r=engine.rooms.get(code);
  assert.equal(r.ranked,false);
  clearTimeout(r.timer);r.timer=null;
  r.status='running';r.startAt=Date.now()-120000;
  const source=r.text;
  const wrong=source[0]==='x'?'y':'x';
  a.receive({type:'input',value:wrong}); // one mistake
  for(let i=1;i<=source.length;i+=8)a.receive({type:'input',value:source.slice(0,Math.min(source.length,i+7))});
  assert.equal(r.players[0].finishedAt>0,true);
  assert.equal(r.status,'running','first finisher must not end the match');
  assert.equal(a.latest('finished'),undefined);
  assert.equal(b.latest('finished'),undefined);
  await pause(120);
  for(let i=1;i<=source.length;i+=8)b.receive({type:'input',value:source.slice(0,Math.min(source.length,i+7))});
  assert.equal(r.status,'finished');
  const result=b.latest('finished');
  assert.equal(result.reason,'completed');
  assert.equal(result.players.length,2);
  assert.equal(result.players[0].finished,true);
  assert.equal(result.players[1].finished,true);
  assert.ok(result.players[0].errors>=1,'corrected wrong keystrokes count as mistakes');
  assert.ok(result.players[0].accuracy<100);
  assert.ok(Number.isFinite(result.players[0].rawWpm));
  assert.ok(result.players.every(p=>p.elapsed!==null));
  assert.deepEqual(result.ratings,{});
  assert.equal(a.user.elo,oldEloA);assert.equal(b.user.elo,oldEloB);
  a.receive({type:'leave'});b.receive({type:'leave'});a.close();b.close();
});
