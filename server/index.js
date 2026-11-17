'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {WebSocketServer,WebSocket}=require('ws');
const root=path.resolve(__dirname,'..');
const PORT=Number(process.env.PORT||3000);
const rooms=new Map();
const words='the quick brown fox jumps over the lazy dog typing practice keyboard speed accuracy focus modern design challenge world always never another little after before under above between around smooth rhythm learn create better simple words text people time every day can make this work well and grow fast with care'.split(' ');
const textForRoom=()=>Array.from({length:95},()=>words[crypto.randomInt(words.length)]).join(' ');
const safeSend=(ws,msg)=>{if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(msg));};
const cleanName=s=>String(s||'guest').replace(/[^\p{L}\p{N}_ -]/gu,'').trim().slice(0,24)||'guest';
const roomCode=()=>crypto.randomBytes(4).toString('hex').toUpperCase();
function broadcast(room,msg){room.players.forEach(p=>safeSend(p.ws,msg));room.spectators.forEach(s=>safeSend(s,msg));}
function state(room){return {type:'room',code:room.code,status:room.status,duration:room.duration,players:room.players.map(p=>({id:p.id,name:p.name,ready:p.ready,progress:p.progress,wpm:p.wpm,accuracy:p.accuracy,connected:p.ws.readyState===WebSocket.OPEN})),spectators:room.spectators.size};}
function leave(ws){const code=ws.room;if(!code)return;const room=rooms.get(code);ws.room=null;if(!room)return;room.spectators.delete(ws);const i=room.players.findIndex(p=>p.ws===ws);if(i>=0){const player=room.players[i];if(room.status==='running'){room.status='finished';const winner=room.players.find(p=>p!==player);broadcast(room,{type:'finished',reason:'disconnect',winnerId:winner?.id||null,players:room.players.map(p=>({id:p.id,name:p.name,wpm:p.wpm,accuracy:p.accuracy}))});}room.players.splice(i,1);}if(!room.players.length&&!room.spectators.size){rooms.delete(code);clearTimeout(room.startTimer);clearTimeout(room.endTimer);}else broadcast(room,state(room));}
function start(room){if(room.status!=='waiting'||room.players.length!==2||!room.players.every(p=>p.ready))return;room.status='countdown';room.text=textForRoom();room.startAt=Date.now()+5000;broadcast(room,{type:'countdown',text:room.text,startAt:room.startAt,duration:room.duration});room.startTimer=setTimeout(()=>{if(room.status!=='countdown')return;room.status='running';broadcast(room,{type:'start',startAt:room.startAt});room.endTimer=setTimeout(()=>finish(room),room.duration*1000);},5000);}
function finish(room){if(room.status!=='running')return;room.status='finished';const players=room.players.map(p=>({id:p.id,name:p.name,wpm:p.wpm,accuracy:p.accuracy,progress:p.progress}));const ranked=[...players].sort((a,b)=>b.wpm-a.wpm||b.accuracy-a.accuracy);const winnerId=ranked.length===2&&(ranked[0].wpm!==ranked[1].wpm||ranked[0].accuracy!==ranked[1].accuracy)?ranked[0].id:null;broadcast(room,{type:'finished',reason:'time',winnerId,players});}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname==='/health'){res.writeHead(200,{'content-type':'application/json'});return res.end(JSON.stringify({ok:true,rooms:rooms.size}));}const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)||file.includes('/server/')||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','x-content-type-options':'nosniff'});fs.createReadStream(file).pipe(res);});
const wss=new WebSocketServer({server,path:'/ws',maxPayload:8192});
wss.on('connection',ws=>{ws.id=crypto.randomUUID();let rate=0,last=Date.now();safeSend(ws,{type:'hello',id:ws.id});ws.on('message',buf=>{if(Date.now()-last>1000){rate=0;last=Date.now();}if(++rate>45)return;let msg;try{msg=JSON.parse(buf.toString());}catch{return;}if(!msg||typeof msg.type!=='string')return;
 if(msg.type==='create'){leave(ws);const code=roomCode();const room={code,status:'waiting',duration:[15,30,60,120].includes(msg.duration)?msg.duration:30,players:[],spectators:new Set(),text:'',startAt:0};rooms.set(code,room);room.players.push({ws,id:ws.id,name:cleanName(msg.name),ready:false,progress:0,wpm:0,accuracy:100,input:''});ws.room=code;safeSend(ws,state(room));return;}
 if(msg.type==='join'){leave(ws);const room=rooms.get(String(msg.code||'').toUpperCase());if(!room)return safeSend(ws,{type:'error',message:'Room not found'});if(msg.spectate){room.spectators.add(ws);ws.room=room.code;safeSend(ws,state(room));if(room.status==='running'||room.status==='countdown')safeSend(ws,{type:'countdown',text:room.text,startAt:room.startAt,duration:room.duration});return;}if(room.players.length>=2||room.status!=='waiting')return safeSend(ws,{type:'error',message:'Room is full or already started'});room.players.push({ws,id:ws.id,name:cleanName(msg.name),ready:false,progress:0,wpm:0,accuracy:100,input:''});ws.room=room.code;broadcast(room,state(room));return;}
 const room=rooms.get(ws.room);if(!room)return;const player=room.players.find(p=>p.ws===ws);
 if(msg.type==='ready'&&player&&room.status==='waiting'){player.ready=true;broadcast(room,state(room));start(room);}
 if(msg.type==='input'&&player&&room.status==='running'){
  const val=String(msg.value||'');if(val.length>room.text.length||val.length<player.input.length||!room.text.startsWith(val))return;
  const elapsed=Math.max(.001,(Date.now()-room.startAt)/60000);const added=val.length-player.input.length;if(added>Math.max(20,elapsed*1500))return;
  player.input=val;player.progress=Math.round(val.length/room.text.length*100);player.wpm=Math.round((val.length/5)/elapsed);player.accuracy=100;broadcast(room,{type:'progress',id:player.id,progress:player.progress,wpm:player.wpm,accuracy:player.accuracy});if(room.players.every(p=>p.input.length>=room.text.length))finish(room);
 }
 if(msg.type==='leave')leave(ws);
 });ws.on('close',()=>leave(ws));ws.on('error',()=>{});});
server.listen(PORT,'0.0.0.0',()=>console.log(`undefinedtype online listening on ${PORT}`));
