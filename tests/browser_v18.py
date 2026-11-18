"""Interactive browser regression with mocked WebSocket, no external network required."""
from pathlib import Path
import base64
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
markup=(root/'index.html').read_text()
css=(root/'style.css').read_text()
js=(root/'app.js').read_text()
multiplayer=(root/'multiplayer.js').read_text()
markup=markup.replace('<link rel="stylesheet" href="style.css">','<style>'+css+'</style>')
markup=markup.replace('<script src="app.js"></script>','<script>'+js+'</script>')
markup=markup.replace('<script src="multiplayer.js"></script>','<script>'+multiplayer+'</script>')
markup=markup.replace('src="logo.png"','src="data:image/png;base64,'+base64.b64encode((root/'logo.png').read_bytes()).decode()+'"')
mock_js=r'''
window.__messages=[];
class MockWS {
 static OPEN=1;
 constructor(){this.readyState=1;window.__ws=this;
  setTimeout(()=>{this.onopen?.();this.deliver({type:'hello',id:'alice-id',serverTime:Date.now()});this.deliver({type:'lobby',rooms:[],queue:0});},10);
 }
 send(data){const m=JSON.parse(data);window.__messages.push(m);
  if(m.type==='auth')this.deliver({type:'auth',user:{username:'Alice',elo:1000,wins:0,losses:0,draws:0}});
  if(m.type==='create')this.deliver({type:'room',code:'ABC12345',visibility:m.visibility,ranked:false,status:'waiting',wordCount:m.wordCount,players:[{id:'alice-id',name:'Alice',elo:1000,progress:0,position:0,wpm:0,accuracy:100}]});
  if(m.type==='queue')this.deliver({type:'queued',mode:m.mode});
 }
 deliver(data){this.onmessage?.({data:JSON.stringify(data)});}
}
window.WebSocket=MockWS;
window.fetch=async (url,options={})=>({ok:true,status:200,json:async()=>url.includes('/api/me')?{user:null}:url.includes('/api/leaderboard')?{players:[]}:{user:{username:'Alice',elo:1000,wins:0,losses:0,draws:0},token:'fake-token'}});
const storage=new Map(),session=new Map();
Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)}});
Object.defineProperty(window,'sessionStorage',{configurable:true,value:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,String(v)),removeItem:k=>session.delete(k)}});
'''
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1440,'height':950},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.evaluate(mock_js)
 page.set_content(markup,wait_until='load',timeout=15000)
 page.wait_for_timeout(100)
 assert page.locator('#welcomeGate').is_visible()
 page.click('#welcomeGuest')
 page.click('[data-page="multiplayer"]')
 assert page.locator('#authGate').is_visible()
 page.locator('#authUsername').fill('Alice');page.locator('#authPassword').fill('strongPassword123')
 page.click('#registerAccount')
 assert page.locator('#multiplayerContent').is_visible(), 'multiplayer account gate did not unlock'
 assert page.locator('#rankedQueue').is_visible()
 assert page.locator('#unrankedQueue').is_visible()
 assert page.locator('#roomVisibilityChoices button').count()==2
 assert page.locator('#roomLengthChoices button').count()==5
 page.locator('[data-visibility="public"]').click()
 page.locator('[data-words="100"]').click()
 assert page.locator('#roomVisibility').input_value()=='public'
 assert page.locator('#onlineDuration').input_value()=='100'
 page.screenshot(path='/mnt/data/UndefinedType-v1.8-lobby.png',full_page=True)
 page.click('#createRoom')
 assert page.evaluate('window.__messages.filter(x=>x.type==="create").at(-1).wordCount')==100
 assert page.locator('#onlineRoom').is_visible()
 # Inject second player, automatic countdown, one shared passage.
 text=('the quick brown fox jumps over the lazy dog practice typing with calm and steady focus ' * 9).strip()
 page.evaluate('''() => window.__ws.deliver({type:'room',code:'ABC12345',visibility:'public',ranked:false,status:'countdown',wordCount:100,players:[{id:'alice-id',name:'Alice',elo:1000,progress:0,position:0,wpm:0,accuracy:100},{id:'bob-id',name:'Bob',elo:1000,progress:0,position:0,wpm:0,accuracy:100}]})''')
 page.evaluate('(text)=>window.__ws.deliver({type:"countdown",text,startAt:Date.now()+5000,serverTime:Date.now(),duration:0})',text)
 assert page.locator('#raceTimeLabel').text_content()=='starts in'
 assert page.locator('#raceCountdown').inner_text()=='5'
 assert page.locator('#raceInput').is_disabled()
 assert page.locator('#raceSharedText .race-word').count()>40
 assert page.locator('#raceOpponentTag').inner_text()=='Bob'
 assert page.locator('#raceYouMarker .race-marker-label').inner_text()=='You'
 page.evaluate('window.__ws.deliver({type:"start",startAt:Date.now()})')
 assert page.locator('#raceInput').is_enabled()
 assert page.locator('#raceTimeLabel').text_content()=='elapsed'
 page.locator('#raceInput').fill('the xuick')
 assert page.locator('#raceSharedText .race-word-error').count()==1,'whole-word error underline missing'
 assert page.locator('#raceSharedText .race-error').count()==1
 for _ in range(len('xuick')): page.locator('#raceInput').press('Backspace')
 page.locator('#raceInput').type('quick')
 assert page.locator('#raceSharedText .race-word-error').count()==0,'word underline must clear after correction'
 assert page.locator('#raceSharedText .race-correct').count()==len('the quick')
 page.locator('#raceInput').press('Enter')
 assert page.locator('#raceInput').input_value()=='the quick '
 page.evaluate('window.__ws.deliver({type:"progress",id:"alice-id",position:10,correct:10,progress:10,wpm:66,accuracy:96})')
 assert page.locator('#raceLiveWpm').inner_text()=='66'
 assert page.locator('#raceLiveAccuracy').inner_text()=='96%'
 page.evaluate('window.__ws.deliver({type:"progress",id:"bob-id",position:21,correct:21,progress:20,wpm:90,accuracy:100})')
 page.wait_for_timeout(150)
 assert page.locator('#raceSharedText .race-other-typed').count()==0, 'opponent must never color letters'
 assert page.locator('#raceOpponentMarker').is_visible()
 assert page.locator('#raceYouMarker').is_visible()
 assert page.locator('#raceSharedText').evaluate('(el)=>getComputedStyle(el).userSelect')=='none'
 # Screenshot during the race with visible text and two markers.
 page.locator('.race-arena-shared').screenshot(path='/mnt/data/UndefinedType-v1.8-race.png')
 page.screenshot(path='/mnt/data/UndefinedType-v1.8-full.png',full_page=True)
 # Check the opponent only appears in the current or next wrapped text row.
 lines=page.evaluate("""() => {
   const spans=[...document.querySelectorAll('#raceSharedText .race-char')];
   let last=null;const starts=[];
   spans.forEach((el,i)=>{const y=el.getBoundingClientRect().top;
     if(last===null||Math.abs(y-last)>3){starts.push(i);last=y;}});
   return starts;
 }""")
 assert len(lines)>3, lines
 page.evaluate('(p)=>window.__ws.deliver({type:"progress",id:"bob-id",position:p,correct:p,wpm:95,accuracy:99})', lines[2]+3)
 page.wait_for_timeout(140)
 assert page.locator('#raceOpponentMarker').is_hidden(), 'opponent must hide when two rows ahead'
 page.locator('#raceInput').fill(text[:lines[1]+2]);page.wait_for_timeout(140)
 assert page.locator('#raceOpponentMarker').is_visible(), 'opponent must reappear when you catch up'
 # Both players must finish before scoreboard appears (not after first player).
 page.evaluate('window.__ws.deliver({type:"playerFinished",id:"alice-id",name:"Alice"})')
 assert page.locator('#raceFinishNotice').is_visible()
 assert not page.locator('.match-score-table').count()
 page.evaluate('''() => window.__ws.deliver({type:'finished',reason:'completed',winnerId:'alice-id',players:[
  {id:'alice-id',name:'Alice',wpm:72,rawWpm:75,accuracy:98,correct:460,errors:2,elapsed:78.2},
  {id:'bob-id',name:'Bob',wpm:64,rawWpm:68,accuracy:94,correct:460,errors:7,elapsed:89.4}],ratings:{}})''')
 assert page.locator('#raceResult h2').inner_text()=='You won!'
 assert page.locator('.match-score-table tbody tr').count()==2
 assert '78.2s' in page.locator('.match-score-table').inner_text()
 assert 'No Elo changes' in page.locator('#raceResult').inner_text()
 page.locator('#raceResult').screenshot(path='/mnt/data/UndefinedType-v1.8-results.png')
 assert not errors,errors
 print('PASS: browser GUI, room controls, countdown, error words, corrections, markers, scoreboard. No JS errors.')
 b.close()
