'use strict';
(()=>{
 const el=id=>document.getElementById(id);
 let socket,me,room=null,matchText='',startAt=0,duration=30,finished=false,typing='',tick=null;
 const status=t=>el('onlineStatus').textContent=t;
 const send=obj=>{if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(obj));};
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function connect(){const protocol=location.protocol==='https:'?'wss':'ws';socket=new WebSocket(`${protocol}://${location.host}/ws`);socket.onopen=()=>status('Connected · create or join a room');socket.onclose=()=>{status('Offline · multiplayer requires the hosted Node.js server. Reconnecting…');clearInterval(tick);setTimeout(connect,3000);};socket.onerror=()=>status('Connection error · run npm start or open the deployed website');socket.onmessage=event=>{let m;try{m=JSON.parse(event.data);}catch{return;}if(m.type==='hello')me=m.id;
 if(m.type==='error')status(m.message);
 if(m.type==='room'){room=m;el('onlineRoom').classList.remove('hidden');el('roomCode').textContent=m.code;el('roomPlayers').textContent=m.players.map(p=>`${p.name} ${p.ready?'✓ ready':'· waiting'}`).join('  |  ');el('readyMatch').classList.toggle('hidden',!m.players.some(p=>p.id===me)||m.status!=='waiting');el('racePlayers').replaceChildren();m.players.forEach(p=>renderPlayer(p));status(`Room ${m.code} · ${m.status}`);}
 if(m.type==='countdown'){matchText=m.text;startAt=m.startAt;duration=m.duration;finished=false;typing='';el('raceInput').value='';el('raceInput').classList.add('hidden');el('raceResult').textContent='';el('raceText').textContent=m.text;clearInterval(tick);tick=setInterval(()=>{const remaining=Math.ceil((startAt-Date.now())/1000);if(remaining>0)el('raceCountdown').textContent=`Starting in ${remaining}…`;else{el('raceCountdown').textContent=`${Math.max(0,Math.ceil((startAt+duration*1000-Date.now())/1000))}s`;if(!finished&&room?.players.some(p=>p.id===me)){el('raceInput').classList.remove('hidden');if(document.activeElement!==el('raceInput'))el('raceInput').focus();}}},100);}
 if(m.type==='start')status('Race started!');
 if(m.type==='progress'){const row=el(`race-${m.id}`);if(row){row.querySelector('progress').value=m.progress;row.querySelector('small').textContent=`${m.progress}% · ${m.wpm} WPM`;}}
 if(m.type==='finished'){finished=true;clearInterval(tick);el('raceInput').disabled=true;el('raceCountdown').textContent='Match finished';const winner=m.players.find(p=>p.id===m.winnerId);el('raceResult').textContent=winner?`${winner.name} wins! · ${winner.wpm} WPM`:'Draw!';status(m.reason==='disconnect'?'Match ended: opponent disconnected':'Match complete');}
 };}
 function renderPlayer(p){const row=document.createElement('div');row.className='race-player';row.id=`race-${p.id}`;const name=document.createElement('span');name.textContent=p.name+(p.id===me?' (you)':'');const bar=document.createElement('progress');bar.max=100;bar.value=p.progress;const stat=document.createElement('small');stat.textContent=`${p.progress}% · ${p.wpm} WPM`;row.append(name,bar,stat);el('racePlayers').append(row);}
 el('createRoom').onclick=()=>{el('raceInput').disabled=false;send({type:'create',name:el('onlineName').value,duration:Number(el('onlineDuration').value)});};
 const join=spectate=>{el('raceInput').disabled=false;send({type:'join',code:el('joinCode').value.trim(),name:el('onlineName').value,spectate});};
 el('joinRoom').onclick=()=>join(false);el('spectateRoom').onclick=()=>join(true);
 el('readyMatch').onclick=()=>send({type:'ready'});
 el('leaveRoom').onclick=()=>{send({type:'leave'});room=null;clearInterval(tick);el('onlineRoom').classList.add('hidden');status('Left room');};
 el('copyInvite').onclick=async()=>{const url=new URL(location.href);url.searchParams.set('room',room?.code||'');try{await navigator.clipboard.writeText(url.href);status('Invite link copied');}catch{status('Room code: '+(room?.code||''));}};
 el('raceInput').addEventListener('input',()=>{if(finished||Date.now()<startAt)return;const val=el('raceInput').value;if(!matchText.startsWith(val)){el('raceInput').value=typing;return;}typing=val;send({type:'input',value:typing});});
 const invited=new URLSearchParams(location.search).get('room');if(invited)el('joinCode').value=invited.toUpperCase();
 if(location.protocol==='file:')status('Multiplayer requires the hosted version. Run npm install and npm start.');else connect();
})();
