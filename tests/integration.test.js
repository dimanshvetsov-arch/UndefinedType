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
  assert.equal((await fetch(base+'/typing-rules.js')).status,200);
  assert.equal((await fetch(base+'/wordbanks.js')).status,200);
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
  assert.equal(result.ratings[b.id].elo,1000+engine.eloChange(1000,1000,1));assert.equal(result.ratings[a.id].elo,1000+engine.eloChange(1000,1000,0));
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
  a.receive({type:'input',value:''}); // allowed: fix an incorrect word
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

test('multiplayer languages match the solo banks and have no empty dictionaries',async()=>{
  const response=await fetch(base+'/api/languages');assert.equal(response.status,200);
  const {languages}=await response.json();assert.equal(languages.length,70);
  for(const code of ['en','de','es','ru','ja','zh','ar'])assert.ok(languages.some(x=>x.code===code));
  const file=require('../server/languages.json');
  assert.ok(Object.values(file).every(x=>x.bank.split(/\s+/).filter(Boolean).length>=5));
  assert.ok(file.en.bank.split(/\s+/).filter(Boolean).length>=650, 'English bank should have over 650 everyday words');
  assert.ok(!file.en.bank.includes('tuberculous'), 'Unusually difficult words should not appear in the easy bank');
});
test('private room host chooses language and both players receive exactly its word bank',async()=>{
  const aToken=await fetch(base+'/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'login',username:'Alice',password:'strongPassword123'})}).then(r=>r.json());
  const bToken=await fetch(base+'/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'login',username:'Bob',password:'strongPassword123'})}).then(r=>r.json());
  const a=makeSocket(),b=makeSocket();a.receive({type:'auth',token:aToken.token});b.receive({type:'auth',token:bToken.token});
  a.receive({type:'create',visibility:'private',wordCount:30,language:'ru'});
  const code=a.latest('room').code;assert.equal(a.latest('room').language,'ru');
  b.receive({type:'join',code});
  assert.equal(b.latest('room').language,'ru');
  const start=a.latest('countdown'),other=b.latest('countdown');
  assert.equal(start.text,other.text);assert.equal(start.language,'ru');
  assert.equal(start.text.split(' ').length,30);
  const valid=new Set(require('../server/languages.json').ru.bank.split(/\s+/));
  for(const word of start.text.split(' '))assert.ok(valid.has(word),`Unexpected Russian word ${word}`);
  a.receive({type:'leave'});b.receive({type:'leave'});a.close();b.close();
});
test('ranked and unranked queue pair only same selected language, still preserve Elo rules',async()=>{
  const tokens=await Promise.all(['Alice','Bob','Carol'].map(async username =>
    (await fetch(base+'/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'login',username,password:'strongPassword123'})})).json()
  ));
  const socks=tokens.map(()=>makeSocket());socks.forEach((s,i)=>s.receive({type:'auth',token:tokens[i].token}));
  socks[0].receive({type:'queue',mode:'ranked',language:'de'});
  socks[1].receive({type:'queue',mode:'ranked',language:'es'});
  assert.equal(socks[0].room,null);assert.equal(socks[1].room,null);
  socks[2].receive({type:'queue',mode:'ranked',language:'de'});
  assert.ok(socks[0].room);assert.equal(socks[0].room,socks[2].room);
  const r=engine.rooms.get(socks[0].room);assert.equal(r.language,'de');assert.equal(r.ranked,true);
  assert.ok(r.text.split(' ').every(w=>require('../server/languages.json').de.bank.split(/\s+/).includes(w)));
  assert.equal(socks[1].room,null,'Spanish queue must not join a German race');
  for(const s of socks){s.receive({type:'leave'});s.close();}
});
test('unsupported language is rejected on the server',async()=>{
  const token=await fetch(base+'/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'login',username:'Alice',password:'strongPassword123'})}).then(r=>r.json());
  const s=makeSocket();s.receive({type:'auth',token:token.token});
  s.receive({type:'create',visibility:'public',language:'not-real'});
  assert.match(s.latest('error').message,/Unsupported text language/);assert.equal(s.room,null);
  s.receive({type:'queue',mode:'ranked',language:'xx'});
  assert.match(s.latest('error').message,/Unsupported text language/);assert.equal(engine.queue.includes(s),false);s.close();
});


test('only completely correct words lock; unfinished or wrong words remain editable',async()=>{
  const tokens=await Promise.all(['Alice','Bob'].map(async username=>(await fetch(base+'/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'login',username,password:'strongPassword123'})})).json()));
  const [a,b]=[makeSocket(),makeSocket()];
  a.receive({type:'auth',token:tokens[0].token});b.receive({type:'auth',token:tokens[1].token});
  a.receive({type:'create',visibility:'private',wordCount:30,language:'en'});
  b.receive({type:'join',code:a.latest('room').code});
  const r=engine.rooms.get(a.room);clearTimeout(r.timer);r.timer=null;r.status='running';r.startAt=Date.now()-30000;
  const text=r.text, firstSpace=text.indexOf(' '),firstWord=text.slice(0,firstSpace);
  assert.ok(firstSpace>2);
  const playerA=r.players.find(x=>x.ws===a);
  a.receive({type:'input',value:firstWord});
  a.receive({type:'input',value:firstWord.slice(0,-1)});
  assert.equal(playerA.typed,firstWord,'a correct word cannot be backspaced');
  a.receive({type:'input',value:firstWord+' '});
  a.receive({type:'input',value:firstWord});
  assert.equal(playerA.typed,firstWord+' ','the separator after a correct word is locked');
  const playerB=r.players.find(x=>x.ws===b);
  const typo=(text[0]==='x'?'q':'x')+firstWord.slice(1);
  b.receive({type:'input',value:typo});
  b.receive({type:'input',value:typo+' '});
  b.receive({type:'input',value:typo});
  assert.equal(playerB.typed,typo,'space after an incorrect word can be erased');
  for(let i=typo.length-1;i>=0;i--)b.receive({type:'input',value:typo.slice(0,i)});
  assert.equal(playerB.typed,'','an incorrect word can be erased and corrected');
  b.receive({type:'input',value:typo+' '});
  b.receive({type:'input',value:typo+' '+text[firstSpace+1]});
  b.receive({type:'input',value:typo+' '});
  assert.equal(playerB.typed,typo+' ','the unfinished second word is still editable');
  b.receive({type:'input',value:typo});
  assert.equal(playerB.typed,typo,'the earlier wrong word is still editable when no correct word was completed');
  b.receive({type:'leave'});a.receive({type:'leave'});a.close();b.close();
});

test('races finish even when a completed word contains an uncorrected error',async()=>{
  const tokens=await Promise.all(['Alice','Bob'].map(async username=>(await fetch(base+'/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'login',username,password:'strongPassword123'})})).json()));
  const a=makeSocket(),b=makeSocket();
  a.receive({type:'auth',token:tokens[0].token});b.receive({type:'auth',token:tokens[1].token});
  a.receive({type:'create',visibility:'private',wordCount:30});b.receive({type:'join',code:a.latest('room').code});
  const room=engine.rooms.get(a.room);clearTimeout(room.timer);room.timer=null;room.status='running';room.startAt=Date.now()-120000;
  const original=room.text;
  const typo=(original[0]==='x'?'y':'x')+original.slice(1);
  for(let i=8;i<typo.length+8;i+=8) a.receive({type:'input',value:typo.slice(0,Math.min(i,typo.length))});
  assert.ok(room.players[0].finishedAt>0,'a typo must not prevent completing the text');
  assert.ok(room.players[0].errors>=1);
  assert.equal(room.players[0].progress,100,'completed passage should show full progress');
  for(let i=8;i<original.length+8;i+=8)b.receive({type:'input',value:original.slice(0,Math.min(i,original.length))});
  assert.equal(room.status,'finished');
  assert.equal(a.latest('finished').reason,'completed');
  a.receive({type:'leave'});b.receive({type:'leave'});a.close();b.close();
});

test('higher rated accounts earn less Elo for winning against the same opponent',()=>{
  assert.equal(engine.eloK(1000),34);
  assert.ok(engine.eloK(1800)<engine.eloK(1000));
  const gainNew=engine.eloChange(1000,1000,1);
  const gainExperienced=engine.eloChange(1800,1000,1);
  assert.ok(gainNew>gainExperienced, `${gainNew} must be greater than ${gainExperienced}`);
  assert.ok(engine.eloChange(1000,1100,0)<0);
});

test('first finisher gets immediate provisional scoreboard; final board includes numeric time for both',async()=>{
  const f=await register('FinishEarly');const g=await register('FinishLater');
  const a=makeSocket(),b=makeSocket();a.receive({type:'auth',token:f.token});b.receive({type:'auth',token:g.token});
  a.receive({type:'create',visibility:'private',wordCount:30});b.receive({type:'join',code:a.room});
  const r=engine.rooms.get(a.room);clearTimeout(r.timer);r.status='running';r.startAt=Date.now()-25000;
  function typeWhole(sock){for(let end=10;end<r.text.length+10;end+=10)sock.receive({type:'input',value:r.text.slice(0,Math.min(end,r.text.length))});}
  typeWhole(a);
  assert.equal(r.status,'running','The other player must still be allowed to race');
  assert.equal(a.latest('provisionalResults').players.find(p=>p.id===a.id).finished,true);
  assert.equal(a.latest('provisionalResults').players.find(p=>p.id===b.id).finished,false);
  assert.ok(Number.isFinite(a.latest('provisionalResults').players.find(p=>p.id===b.id).elapsed));
  assert.equal(b.latest('finished'),undefined,'Do not end for the second player');
  typeWhole(b);
  const final=a.latest('finished');assert.equal(final.winnerId,a.id);
  assert.ok(final.players.every(p=>Number.isFinite(p.elapsed)), 'No DNF time');
  assert.equal(final.players.every(p=>p.finished),true);
  a.receive({type:'leave'});b.receive({type:'leave'});a.close();b.close();
});

test('status tells the visitor whether permanent storage is connected; leaderboard is server-wide',async()=>{
  const status=await (await fetch(base+'/api/status')).json();assert.equal(status.persistent,false);assert.equal(status.storage,'temporary');
  const ranking=await (await fetch(base+'/api/leaderboard')).json();assert.ok(ranking.total>=4);
  assert.ok(ranking.players.some(p=>p.username==='FinishEarly'));
});


test('Backspace can fully erase a misspelled active word without unlocking previous words',async()=>{
  const auth=await Promise.all(['Alice','Bob'].map(async username=>(await fetch(base+'/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'login',username,password:'strongPassword123'})})).json()));
  const a=makeSocket(),b=makeSocket();a.receive({type:'auth',token:auth[0].token});b.receive({type:'auth',token:auth[1].token});
  a.receive({type:'create',visibility:'private',wordCount:30});b.receive({type:'join',code:a.room});
  const r=engine.rooms.get(a.room);clearTimeout(r.timer);r.timer=null;r.status='running';r.startAt=Date.now()-30000;
  const player=r.players.find(p=>p.ws===a);
  const space=r.text.indexOf(' '),first=r.text.slice(0,space);
  // One wrong character in the middle. Erase it and the now-correct prefix.
  let typo=r.text[0]+r.text[1]+(r.text[2]==='x'?'y':'x');
  for(let i=1;i<=typo.length;i++)a.receive({type:'input',value:typo.slice(0,i)});
  for(let i=typo.length-1;i>=0;i--){a.receive({type:'input',value:typo.slice(0,i)});assert.equal(player.typed,typo.slice(0,i),'should erase every character of a word that contained a typo');}
  // Correct completed words should remain protected.
  a.receive({type:'input',value:first});a.receive({type:'input',value:first.slice(0,-1)});
  assert.equal(player.typed,first);
  a.receive({type:'input',value:first+' '});
  // Wrong letter immediately after a space and correction to empty word.
  const bad=r.text[space+1]==='x'?'y':'x';
  a.receive({type:'input',value:first+' '+bad});
  a.receive({type:'input',value:first+' '});
  assert.equal(player.typed,first+' ');
  a.receive({type:'input',value:first});
  assert.equal(player.typed,first+' ','previous completed correct word must stay locked');
  a.receive({type:'leave'});b.receive({type:'leave'});a.close();b.close();
});

test('Ctrl+Backspace can atomically erase only the active wrong word on the multiplayer server', async()=>{
  const tokens=await Promise.all(['Alice','Bob'].map(async username=>(await fetch(base+'/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'login',username,password:'strongPassword123'})})).json()));
  const a=makeSocket(),b=makeSocket();
  a.receive({type:'auth',token:tokens[0].token});b.receive({type:'auth',token:tokens[1].token});
  a.receive({type:'create',visibility:'private',wordCount:30});b.receive({type:'join',code:a.room});
  const r=engine.rooms.get(a.room);clearTimeout(r.timer);r.timer=null;r.status='running';r.startAt=Date.now()-25000;
  const player=r.players.find(x=>x.ws===a);
  const words=r.text.split(' '),first=words[0],second=words[1];
  const bad='x'===first[0]?'y':'x';
  const wrong=bad+first.slice(1);
  for(let end=1;end<=wrong.length;end+=4)a.receive({type:'input',value:wrong.slice(0,end)});
  a.receive({type:'input',value:wrong});
  a.receive({type:'input',value:wrong+' '});
  a.receive({type:'input',value:''});
  assert.equal(player.typed,'','server must accept word-size deletion of wrong word after separator');
  // A correct completed first word is locked.
  a.receive({type:'input',value:first+' '});
  a.receive({type:'input',value:''});
  assert.equal(player.typed,first+' ','server must never delete correct previous word');
  const wrongSecond=(second[0]==='x'?'y':'x')+second.slice(1);
  a.receive({type:'input',value:first+' '+wrongSecond});
  a.receive({type:'input',value:first+' '});
  assert.equal(player.typed,first+' ','server may erase only current wrong word');
  a.receive({type:'input',value:first});
  assert.equal(player.typed,first+' ','cannot erase earlier locked word');
  a.receive({type:'leave'});b.receive({type:'leave'});a.close();b.close();
});
