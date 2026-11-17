'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const page = $('multiplayer');
  let socket = null, reconnectTimer = null, connected = false;
  let me = '', user = null, token = localStorage.getItem('ut_token') || '';
  let room = null, phase = 'waiting', matchText = '', startAt = 0, duration = 30, clockOffset = 0;
  let countdownTimer = null, queued = false, queueMode = 'ranked', typingValue = '', positions = {}, players = {};
  let audioContext = null, finishedMine = false;
  let sharedChars = [], sharedWords = [], ownPainted = '', otherPainted = 0;
  let youPosition = 0, opponentPosition = 0;
  let markerFrame = 0;
  let lineForChar = [], lineTops = [], currentLine = 0;
  // An invitation opens the room automatically after the visitor has authenticated.
  const roomParameter = new URLSearchParams(location.search).get('room') || '';
  let pendingInvite = /^[a-f0-9]{8}$/i.test(roomParameter) ? roomParameter.toUpperCase() : null;
  let inviteAttempted = false;
  if (pendingInvite) $('joinCode').value = pendingInvite;

  function updateInviteNotice() {
    const notice = $('inviteBanner');
    notice.classList.toggle('hidden', !pendingInvite);
    if (!pendingInvite) return;
    $('inviteMessage').textContent = user
      ? `Invitation to room ${pendingInvite} — connecting you automatically…`
      : `You've been invited to room ${pendingInvite}. Log in or create an account to join automatically.`;
    $('welcomeIntro').textContent = `You've been invited to a multiplayer race! Log in or create an account to join room ${pendingInvite}. Guests can only play solo.`;
    $('authGateIntro').textContent = `You've been invited to room ${pendingInvite}. Log in or create an account and you'll join automatically.`;
  }
  function dismissInvite() {
    pendingInvite = null;
    inviteAttempted = false;
    const current = new URL(location.href);
    current.searchParams.delete('room');
    history.replaceState(history.state, '', current.pathname + current.search + current.hash);
    $('inviteBanner').classList.add('hidden');
    $('welcomeIntro').textContent = 'Practice typing as a guest, or create an account to compete online.';
    $('authGateIntro').textContent = 'Guests can practice solo. Create a free account or log in to race.';
  }
  function tryJoinInvite() {
    if (!pendingInvite || inviteAttempted || !connected || !user || room) return;
    inviteAttempted = true;
    if (send({type:'join',code:pendingInvite})) status(`Joining invited room ${pendingInvite}…`);
    else inviteAttempted = false;
  }
  $('dismissInvite').onclick = () => {dismissInvite(); status('Invite dismissed. Choose a multiplayer mode.');};

  function status(message, isError = false) {
    $('onlineStatus').textContent = message;
    $('onlineStatus').classList.toggle('online-error', isError);
  }
  function send(data) {
    if (socket?.readyState !== WebSocket.OPEN) {
      status('Disconnected. Reconnecting to the multiplayer server…', true);
      return false;
    }
    socket.send(JSON.stringify(data));
    return true;
  }
  function updateProfile() {
    document.querySelector('.profile').textContent = user ? `${user.username} · ${user.elo} Elo` : 'guest';
    $('authGate').classList.toggle('hidden', Boolean(user));
    $('multiplayerContent').classList.toggle('hidden', !user);
    $('accountState').textContent = user ? `signed in as ${user.username} · ${user.elo} Elo` : '';
    $('welcomeGate').classList.toggle('hidden', !!user || sessionStorage.getItem('ut_guest_chosen') === '1');
    updateInviteNotice();
  }
  function showLobby() {
    room = null; phase='waiting';
    $('onlineRoom').classList.add('hidden');
    $('lobbySection').classList.remove('hidden');
    $('raceResult').replaceChildren();
    $('raceInput').blur();
    $('raceInput').value='';
    clearSharedText();
    clearInterval(countdownTimer);
    if (!queued) status(connected ? 'Connected · choose how to play' : 'Connecting to multiplayer…');
  }
  async function restoreAccount() {
    if (!token) {updateProfile();return;}
    try {
      const response = await fetch('/api/me', {headers:{Authorization:'Bearer '+token}});
      const data = await response.json();
      if (data.user) {user=data.user;sessionStorage.removeItem('ut_guest_chosen');}
      else {token='';localStorage.removeItem('ut_token');}
    } catch { /* offline state handled by the connection banner */ }
    updateProfile();
  }
  async function authenticate(action, welcome=false) {
    const nameField=$(welcome?'welcomeUsername':'authUsername');
    const passField=$(welcome?'welcomePassword':'authPassword');
    const error=$(welcome?'welcomeError':'authError');
    error.textContent='';
    const username=nameField.value.trim(), password=passField.value;
    if (!username || !password) {error.textContent='Enter your username and password.';return;}
    try {
      const response=await fetch('/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,username,password})});
      const data=await response.json();
      if(!response.ok)throw Error(data.error || 'Login failed');
      token=data.token;user=data.user;localStorage.setItem('ut_token',token);
      sessionStorage.removeItem('ut_guest_chosen');
      passField.value='';
      updateProfile();
      if (connected) send({type:'auth',token});
      else connect();
      status(`Welcome, ${user.username}! Pick a multiplayer mode.`);
    } catch(e) {error.textContent=e.message;}
  }
  $('welcomeRegister').onclick=()=>authenticate('register',true);
  $('welcomeLogin').onclick=()=>authenticate('login',true);
  $('welcomeGuest').onclick=()=>{sessionStorage.setItem('ut_guest_chosen','1');$('welcomeGate').classList.add('hidden');};
  $('registerAccount').onclick=()=>authenticate('register');
  $('loginAccount').onclick=()=>authenticate('login');
  $('guestChoice').onclick=()=>document.querySelector('[data-page="test"]').click();
  $('logoutAccount').onclick=()=>{
    send({type:'unauth'});
    token='';user=null;queued=false;
    localStorage.removeItem('ut_token');sessionStorage.setItem('ut_guest_chosen','1');
    updateProfile();showLobby();status('Logged out · solo typing remains available');
  };
  document.querySelectorAll('.online-controls input[type="password"]').forEach(input => {
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){
      if(input.id==='welcomePassword')$('welcomeLogin').click();else $('loginAccount').click();
    }});
  });

  function connect() {
    if(location.protocol==='file:') {status('Multiplayer works on your hosted website, not through a local file.',true);return;}
    if(socket && (socket.readyState===WebSocket.OPEN||socket.readyState===WebSocket.CONNECTING))return;
    const scheme=location.protocol==='https:'?'wss:':'ws:';
    socket=new WebSocket(`${scheme}//${location.host}/ws`);
    socket.onopen=()=>{
      connected=true;inviteAttempted=false;status('Connected · choose how to play');
      if(token)send({type:'auth',token});send({type:'lobby'});
      if(room){showLobby();status('Connection restored. Your previous room was left.',true);}
    };
    socket.onmessage=event=>{
      let m;try{m=JSON.parse(event.data);}catch{return;}
      onMessage(m);
    };
    socket.onclose=()=>{
      connected=false;queued=false;inviteAttempted=false;
      clearInterval(countdownTimer);
      $('raceInput').disabled=true;
      status('Connection lost · reconnecting automatically…',true);
      clearTimeout(reconnectTimer);
      reconnectTimer=setTimeout(connect,3000);
    };
    socket.onerror=()=>status('Unable to reach the multiplayer server.',true);
  }

  function drawLobby(rooms, waiting) {
    $('queueCount').textContent = waiting===1 ? '1 player searching now' : `${waiting} players searching now`;
    const list=$('publicRooms');list.replaceChildren();
    if(!rooms.length) {const e=document.createElement('p');e.className='empty-room';e.textContent='No open rooms yet. Create one below!';list.append(e);return;}
    for(const r of rooms) {
      const button=document.createElement('button');button.className='room-list-entry';
      const name=document.createElement('strong');name.textContent=r.host;
      const details=document.createElement('span');details.textContent=`${r.wordCount||80} words · ${r.players}/2 players · ${r.code}`;
      button.append(name,details);
      button.onclick=()=>send({type:'join',code:r.code});list.append(button);
    }
  }
  function createPlayerRow(p) {
    const item=document.createElement('div');item.className='race-player';item.id=`race-${p.id}`;
    const name=document.createElement('strong');name.className='race-player-name';name.textContent=p.name+(p.id===me?' · you':'');
    const track=document.createElement('div');track.className='race-progress-track';
    const fill=document.createElement('div');fill.className='race-progress-fill';track.append(fill);
    const numbers=document.createElement('small');numbers.textContent='0 WPM · 100%';
    item.append(name,track,numbers);
    $('racePlayers').append(item);
    updatePlayerRow(p);
  }
  function updatePlayerRow(p) {
    const item=document.getElementById(`race-${p.id}`);
    if(!item)return;
    item.querySelector('.race-progress-fill').style.width=`${Math.max(0,Math.min(100,p.progress||0))}%`;
    item.querySelector('small').textContent=`${p.wpm||0} WPM · ${p.accuracy??100}%`;
  }
  // Both players use one passage. Only your mistakes are marked; the opponent never paints text.
  function createSharedText() {
    const el=$('raceSharedText');
    el.querySelectorAll('.race-word,.race-end').forEach(node=>node.remove());
    const chars=[],words=[],fragment=document.createDocumentFragment();
    for(const chunk of (matchText.match(/\S+\s*|\s+/g)||[])) {
      const word=document.createElement('span');word.className='race-word';word.dataset.start=chars.length;words.push(word);
      for(const letter of chunk) {
        const span=document.createElement('span');span.className='race-char';span.textContent=letter;
        word.append(span);chars.push(span);
      }
      word.dataset.end=chars.length;fragment.append(word);
    }
    const end=document.createElement('span');end.className='race-char race-end';end.textContent='\u200b';
    chars.push(end);fragment.append(end);el.prepend(fragment);sharedWords=words;
    return chars;
  }
  function clearSharedText() {
    $('raceSharedText').querySelectorAll('.race-word,.race-end').forEach(node=>node.remove());
    for(const id of ['raceYouMarker','raceOpponentMarker'])$(id).classList.add('hidden');
    $('raceSharedViewport').scrollTop=0;
    sharedChars=[];sharedWords=[];ownPainted='';otherPainted=0;youPosition=0;opponentPosition=0;
    lineForChar=[];lineTops=[];currentLine=0;
  }
  // Measure the actual wrapped lines. This is responsive: resizing the window
  // can change word wrapping, so we recalculate rather than hardcoding a length.
  function measureLines() {
    lineForChar=[];lineTops=[];
    if(!sharedChars.length)return;
    const contentRect=$('raceSharedText').getBoundingClientRect();
    let lastY=null,line=-1;
    sharedChars.forEach((node,i)=>{
      const y=node.getBoundingClientRect().top-contentRect.top;
      if(lastY===null||Math.abs(y-lastY)>3){line++;lineTops.push(y);lastY=y;}
      lineForChar[i]=line;
    });
  }
  // Scroll by a complete visual row, not by individual pixels as the player types.
  // Two lines are shown: your current row at the top, the next row below it.
  function paintMarkers() {
    markerFrame=0;
    if(!sharedChars.length)return;
    const content=$('raceSharedText'),viewport=$('raceSharedViewport');
    const contentRect=content.getBoundingClientRect();
    if(lineForChar.length!==sharedChars.length) measureLines();
    const ownIndex=Math.min(youPosition,sharedChars.length-1);
    const opponentIndex=Math.min(opponentPosition,sharedChars.length-1);
    const activeLine=lineForChar[ownIndex]||0;
    // Keep the current line at the very top every time the line changes.
    if(currentLine!==activeLine||Math.abs(viewport.scrollTop-(lineTops[activeLine]-lineTops[0]))>2){
      currentLine=activeLine;
      viewport.scrollTop=Math.max(0,lineTops[activeLine]-lineTops[0]);
    }
    // A rival on the next row is visible below. Two or more rows ahead or
    // behind is deliberately offscreen (and cannot overlap unrelated text).
    for(const [index,id,isOpponent] of [[ownIndex,'raceYouMarker',false],[opponentIndex,'raceOpponentMarker',true]]) {
      const marker=$(id),node=sharedChars[index],line=lineForChar[index]||0;
      const withinView=!isOpponent||(line>=activeLine&&line<=activeLine+1);
      if(!node||!withinView){marker.classList.add('hidden');continue;}
      const rect=node.getBoundingClientRect();
      marker.style.left=`${rect.left-contentRect.left}px`;
      marker.style.top=`${rect.top-contentRect.top}px`;
      marker.classList.remove('hidden');
    }
    content.classList.toggle('race-tied',youPosition===opponentPosition);
  }
  function scheduleMarkers(remeasure=false) {
    if(remeasure){lineForChar=[];lineTops=[];}
    if(!markerFrame)markerFrame=requestAnimationFrame(paintMarkers);
  }
  function showOwnText(value) {
    if(!sharedChars.length)return;
    // Highlight your mistakes like solo mode, without revealing opponent keystrokes.
    for(let i=0;i<sharedChars.length-1;i++){
      sharedChars[i].classList.toggle('race-correct',i<value.length && value[i]===matchText[i]);
      sharedChars[i].classList.toggle('race-error',i<value.length && value[i]!==matchText[i]);
    }
    // An incorrect letter also marks the entire word subtly red, like the solo test.
    for(const word of sharedWords){
      let wrong=false;
      for(let i=Number(word.dataset.start);i<Math.min(Number(word.dataset.end),value.length);i++){
        if(value[i]!==matchText[i]) {wrong=true;break;}
      }
      word.classList.toggle('race-word-error',wrong);
    }
    youPosition=value.length;ownPainted=value;typingValue=value;
    scheduleMarkers();
  }
  function showOtherText(position) {
    if(!sharedChars.length)return;
    opponentPosition=Math.max(0,Math.min(Number(position)||0,matchText.length));
    otherPainted=opponentPosition;
    // Do not paint/highlight the opponent's typed characters.
    scheduleMarkers();
  }
  function setOpponentName() {
    // The moving caret shows only the name, not a separate color legend.
    const other=Object.values(players).find(p=>p.id!==me);
    $('raceOpponentTag').textContent=other?.name||'opponent';
  }
  window.addEventListener('resize',()=>scheduleMarkers(true));
  function prepareRace(m) {
    matchText=m.text;startAt=m.startAt;duration=m.duration;
    clockOffset=Date.now()-(m.serverTime||Date.now());
    phase='countdown';typingValue='';otherPainted=0;ownPainted='';youPosition=0;opponentPosition=0;
    positions={};finishedMine=false;$('raceFinishNotice').classList.add('hidden');
    $('raceTimeLabel').textContent='starts in';$('raceLiveWpm').textContent='0';$('raceLiveAccuracy').textContent='100%';
    $('racePassageLength').textContent=`${matchText.trim().split(/\s+/).length} words`;
    $('raceResult').replaceChildren();
    $('raceInput').disabled=true;$('raceInput').value='';$('raceInput').maxLength=matchText.length;
    $('raceSharedViewport').scrollTop=0;
    sharedChars=createSharedText();
    measureLines();currentLine=0;
    setOpponentName();
    showOwnText('');showOtherText(0);
    $('raceCountdown').classList.add('countdown-active');
    clearInterval(countdownTimer);
    countdownTimer=setInterval(tick,70);tick();
  }
  function tick() {
    const now=Date.now()-clockOffset;
    if(phase==='countdown') {
      const remaining=Math.max(1,Math.ceil((startAt-now)/1000));
      $('raceCountdown').textContent=String(remaining);
    } else if(phase==='running') {
      const elapsed=Math.max(0,Math.floor((now-startAt)/1000));
      $('raceCountdown').textContent=`${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')}`;
    }
  }
  function startRace() {
    if(phase==='finished')return;
    phase='running';
    $('raceCountdown').classList.remove('countdown-active');
    $('raceTimeLabel').textContent='elapsed';$('raceInput').disabled=false;
    status('Race started · follow your yellow cursor!');
    focusRace();tick();
  }
  function focusRace() {if(!room||phase!=='running'||!page.classList.contains('active'))return;$('raceInput').focus({preventScroll:true});}
  $('raceSharedViewport').addEventListener('click',focusRace);
  document.querySelector('[data-page="multiplayer"]').addEventListener('click',()=>setTimeout(focusRace,0));
  $('raceInput').addEventListener('paste',e=>{e.preventDefault();status('Pasting is disabled during races.');});
  $('raceInput').addEventListener('drop',e=>e.preventDefault());
  // Enter works like Space only when the passage expects a space,
  // such as at the end of a wrapped visual line.
  $('raceInput').addEventListener('keydown',e=>{
    if(e.key!=='Enter')return;
    e.preventDefault();
    if(phase!=='running'||finishedMine)return;
    const next=matchText[typingValue.length];
    if(next!==' '&&next!=='\n')return;
    const value=typingValue+(next==='\n'?'\n':' ');
    $('raceInput').value=value;
    showOwnText(value);playKeySound();
    send({type:'input',value});
  });
  $('raceInput').addEventListener('input',()=>{
    if(phase!=='running'||finishedMine) {$('raceInput').value=typingValue;return;}
    const val=$('raceInput').value.slice(0,matchText.length).replace(/[\n\r]/g,'');
    if(val!==$('raceInput').value)$('raceInput').value=val;
    showOwnText(val);playKeySound();
    send({type:'input',value:val});
  });
  function playKeySound(){
    try{audioContext=audioContext||new(window.AudioContext||window.webkitAudioContext)();
      if(audioContext.state==='suspended')audioContext.resume();
      const o=audioContext.createOscillator(),g=audioContext.createGain();
      o.type='triangle';o.frequency.value=360+Math.random()*90;
      g.gain.setValueAtTime(.012,audioContext.currentTime);
      g.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+.028);
      o.connect(g);g.connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+.03);
    }catch{}
  }
  function showFinished(m) {
    phase='finished';clearInterval(countdownTimer);
    $('raceInput').disabled=true;$('raceInput').blur();
    $('raceCountdown').classList.remove('countdown-active');
    $('raceCountdown').textContent='finished';$('raceTimeLabel').textContent='race';
    const winner=m.players.find(p=>p.id===m.winnerId);
    const mine=m.players.find(p=>p.id===me);
    const box=$('raceResult');box.replaceChildren();
    const heading=document.createElement('h2');heading.textContent=!winner?'Draw!':winner.id===me?'You won!':`${winner.name} won!`;
    const details=document.createElement('p');
    details.textContent=`${m.reason==='forfeit'?'A player left the race.':'Both players completed the text.'} ${m.ratings?.[me]?'Ranked Elo updated.':'No Elo changes in this mode.'}`;
    box.append(heading,details);
    const board=document.createElement('div');board.className='match-scoreboard';
    const table=document.createElement('table');table.className='match-score-table';
    const head=document.createElement('thead');head.innerHTML='<tr><th>place / player</th><th>wpm</th><th>raw</th><th>accuracy</th><th>mistakes</th><th>time</th><th>elo</th></tr>';
    const body=document.createElement('tbody');
    [...m.players].sort((a,b)=>(a.elapsed??Infinity)-(b.elapsed??Infinity)||b.accuracy-a.accuracy).forEach((p,i)=>{
      const tr=document.createElement('tr');
      if(p.id===me)tr.className='score-you';
      const rating=m.ratings?.[p.id],delta=rating?.delta;
      const fields=[`#${i+1}  ${p.name}${p.id===me?' (You)':''}`,String(p.wpm??0),String(p.rawWpm??0),`${p.accuracy??100}%`,String(p.errors??0),p.elapsed==null?'DNF':`${p.elapsed}s`,delta===undefined?'—':`${delta>=0?'+':''}${delta}`];
      fields.forEach((value,j)=>{const cell=document.createElement(j===0?'th':'td');cell.textContent=value;tr.append(cell);});
      body.append(tr);
    });table.append(head,body);board.append(table);box.append(board);
    if(m.ratings?.[me]) {
      user=m.ratings[me];updateProfile();
      const delta=document.createElement('strong');delta.className='elo-change';
      delta.textContent=`${user.delta>=0?'+':''}${user.delta} Elo · now ${user.elo}`;
      box.append(delta);
    }
    const returnButton=document.createElement('button');returnButton.className='primary';returnButton.textContent='back to multiplayer';
    returnButton.onclick=()=>{send({type:'leave'});queued=false;showLobby();};
    box.append(returnButton);
    status(m.reason==='forfeit'?'A player left the match.': 'Match complete');
    refreshLeaderboard();
  }
  function onMessage(m) {
    if(m.type==='hello') {me=m.id;clockOffset=Date.now()-(m.serverTime||Date.now());}
    if(m.type==='auth') {
      if(!m.user) {
        user=null;token='';localStorage.removeItem('ut_token');
        updateProfile();showLobby();status('Please log in to play multiplayer.',true);
      } else {user=m.user;updateProfile();tryJoinInvite();}
    }
    if(m.type==='error') {
      if (pendingInvite && inviteAttempted) {
        const code = pendingInvite; dismissInvite();
        status(`Could not join room ${code}: ${m.message} Ask for a new invite link.`, true);
      } else status(m.message,true);
    }
    if(m.type==='lobby')drawLobby(m.rooms,m.queue);
    if(m.type==='queued') {queued=true;$('queueIndicator').classList.remove('hidden');$('queueTitle').textContent=queueMode==='ranked'?'⟳ searching ranked…':'⟳ searching unranked…';status(queueMode==='ranked'?'Finding an opponent with similar Elo…':'Finding an unranked opponent…');}
    if(m.type==='queueCancelled') {queued=false;$('queueIndicator').classList.add('hidden');status('Match search cancelled.');}
    if(m.type==='matchFound') {queued=false;$('queueIndicator').classList.add('hidden');status('Match found! Starting automatically…');}
    if(m.type==='room') {
      if (pendingInvite && m.code === pendingInvite) dismissInvite();
      const isNew=!room||m.code!==room.code;
      room=m;players=Object.fromEntries(m.players.map(p=>[p.id,p]));
      $('lobbySection').classList.add('hidden');$('onlineRoom').classList.remove('hidden');
      $('roomCode').textContent=m.code;
      const url=new URL(location.href);url.searchParams.set('room',m.code);
      $('roomInviteUrl').value=url.href;
      $('roomInviteRow').classList.toggle('hidden',m.status!=='waiting');
      $('roomType').textContent=m.ranked?'ranked 1v1':m.matchmaking?'unranked 1v1':m.visibility==='public'?'open room':'private room';
      $('roomPlayers').textContent=m.players.map(p=>`${p.name} (${p.elo} Elo)`).join('  vs  ');
      $('racePlayers').replaceChildren();m.players.forEach(createPlayerRow);
      setOpponentName();
      if(isNew){matchText='';clearSharedText();typingValue='';$('raceResult').replaceChildren();}
      if(m.status==='waiting') {
        phase='waiting';$('raceCountdown').textContent='waiting for another player…';
        $('raceInput').disabled=true;status('Room created · invite a friend or wait for someone to join.');
      }
    }
    if(m.type==='countdown')prepareRace(m);
    if(m.type==='countdownCancelled') {
      phase='waiting';clearInterval(countdownTimer);$('raceCountdown').textContent=m.message;
      $('raceInput').disabled=true;matchText='';clearSharedText();status(m.message);
    }
    if(m.type==='start') startRace();
    if(m.type==='progress') {
      positions[m.id]=m.position;players[m.id]={...(players[m.id]||{}),...m};
      updatePlayerRow(players[m.id]);
      if(m.id===me) { $('raceLiveWpm').textContent=String(m.wpm??0);$('raceLiveAccuracy').textContent=`${m.accuracy??100}%`; }
      else showOtherText(m.position);
    }
    if(m.type==='playerFinished'){
      if(m.id===me){finishedMine=true;$('raceInput').disabled=true;$('raceInput').blur();
        $('raceFinishNotice').textContent='You finished! Waiting for your opponent to complete the text…';
        $('raceFinishNotice').classList.remove('hidden');
      } else {status(`${m.name} finished. Keep typing to the end!`);}
    }
    if(m.type==='finished')showFinished(m);
    if(m.type==='leftRoom') {if(room)showLobby();}
  }
  // Visual room choices keep the underlying selects in sync for accessibility and tests.
  for(const [group,selector,attr] of [[$('roomVisibilityChoices'),$('roomVisibility'),'visibility'],[$('roomLengthChoices'),$('onlineDuration'),'words']]){
    group.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
      selector.value=button.dataset[attr];
      group.querySelectorAll('button').forEach(choice=>{
        const selected=choice===button;choice.classList.toggle('selected',selected);
        choice.setAttribute('aria-pressed',String(selected));
      });
    }));
  }
  $('createRoom').onclick=()=>send({type:'create',visibility:$('roomVisibility').value,wordCount:Number($('onlineDuration').value)});
  $('joinRoom').onclick=()=>{const code=$('joinCode').value.trim().toUpperCase();if(code)send({type:'join',code});else status('Enter your room code first.',true);};
  $('joinCode').addEventListener('keydown',e=>{if(e.key==='Enter')$('joinRoom').click();});
  $('rankedQueue').onclick=()=>{if(queued)return;queueMode='ranked';send({type:'queue',mode:'ranked'});};
  $('unrankedQueue').onclick=()=>{if(queued)return;queueMode='unranked';send({type:'queue',mode:'unranked'});};
  $('cancelQueue').onclick=()=>send({type:'cancelQueue'});
  $('leaveRoom').onclick=()=>{send({type:'leave'});showLobby();};
  $('copyInvite').onclick=async()=>{
    if(!room)return;
    const input=$('roomInviteUrl');
    try {
      if(!navigator.clipboard?.writeText)throw Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(input.value);
      status('Invite link copied! Send it to your friend.');
    } catch {
      input.focus();input.select();
      try {
        if(!document.execCommand?.('copy'))throw Error('Copy unavailable');
        status('Invite link copied! Send it to your friend.');
      } catch {status('Select the invite link and press Ctrl+C (or Command+C) to copy it.');}
    }
  };
  async function refreshLeaderboard() {
    try {
      const response=await fetch('/api/leaderboard');const data=await response.json();
      const el=$('globalRanks');el.replaceChildren();
      if(!data.players?.length){el.textContent='No ranked players yet. Be the first!';return;}
      data.players.forEach((p,i)=>{
        const row=document.createElement('div');row.className='ranking-row';
        row.textContent=`#${i+1}   ${p.username}   ·   ${p.elo} Elo   ·   ${p.wins} wins · ${p.losses} losses`;
        el.append(row);
      });
    }catch{}
  }
  updateProfile();
  if (pendingInvite) document.querySelector('[data-page="multiplayer"]').click();
  restoreAccount();refreshLeaderboard();connect();
})();
