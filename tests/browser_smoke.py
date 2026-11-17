import json,base64,time
from pathlib import Path
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parents[1]
markup=(root/'index.html').read_text()
css=(root/'style.css').read_text()
js=(root/'app.js').read_text()
multiplayer=(root/'multiplayer.js').read_text().replace('new WebSocket(`${scheme}//${location.host}/ws`)','new WebSocket("ws://mock/ws")')
markup=markup.replace('<link rel="stylesheet" href="style.css">','<style>'+css+'</style>')
markup=markup.replace('<script src="app.js"></script>','<script>'+js+'</script>')
markup=markup.replace('<script src="multiplayer.js"></script>','<script>'+multiplayer+'</script>')
markup=markup.replace('src="logo.png"','src="data:image/png;base64,'+base64.b64encode((root/'logo.png').read_bytes()).decode()+'"')
mock_js = r"""
window.__messages=[];
class MockWS {
 static OPEN=1;
 constructor(url){this.readyState=1;window.__ws=this;
  setTimeout(()=>{this.onopen?.();this.deliver({type:'hello',id:'alice-id',serverTime:Date.now()});this.deliver({type:'lobby',rooms:[],queue:0});},20);
 }
 send(json){let data=JSON.parse(json);window.__messages.push(data);
  if(data.type==='auth')this.deliver({type:'auth',user:{username:'Alice',elo:1000,wins:0,losses:0,draws:0}});
  if(data.type==='create')this.deliver({type:'room',code:'ABC12345',visibility:'public',ranked:false,status:'waiting',duration:30,players:[{id:'alice-id',name:'Alice',elo:1000,progress:0,position:0,wpm:0,accuracy:100}]});
 }
 deliver(data){this.onmessage?.({data:JSON.stringify(data)});}
}
window.WebSocket=MockWS;
window.fetch=async (url,options={})=>({ok:true,status:200,json:async()=>url.includes('/api/me')?{user:null}:url.includes('/api/leaderboard')?{players:[]}:{user:{username:'Alice',elo:1000,wins:0,losses:0,draws:0},token:'fake-token'}});
const storage=new Map(); const session=new Map();
Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)}});
Object.defineProperty(window,'sessionStorage',{configurable:true,value:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,String(v)),removeItem:k=>session.delete(k)}});
"""
with sync_playwright() as p:
 print('launching',flush=True)
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1440,'height':950},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 print('before evaluate',flush=True)
 page.evaluate(mock_js)
 print('after evaluate',flush=True)
 print('before set_content',flush=True)
 page.set_content(markup,wait_until='load',timeout=10000)
 print('after set_content',flush=True)
 page.wait_for_timeout(100)
 print('DEBUG',errors, page.evaluate('({w:document.querySelector("#welcomeGate")?.className,js:typeof window.__ws,login:document.querySelector("#welcomeLogin")?.onclick!==null})'))
 assert page.locator('#welcomeGate').is_visible(), 'Welcome screen missing'
 page.click('#welcomeGuest')
 assert page.locator('#welcomeGate').is_hidden()
 assert page.locator('#wordsDisplay').inner_text().strip()!=''
 page.click('[data-page="multiplayer"]')
 assert page.locator('#authGate').is_visible()
 page.locator('#authUsername').fill('Alice')
 page.locator('#authPassword').fill('strongPassword123')
 page.click('#registerAccount')
 assert page.locator('#multiplayerContent').is_visible()
 page.click('#createRoom')
 assert page.locator('#onlineRoom').is_visible()
 assert page.locator('#roomCode').inner_text()=='ABC12345'
 text=('the quick brown fox jumps over the lazy dog and types a race with another player on the same text screen ' * 9).strip()
 page.evaluate('''() => {
  window.__ws.deliver({type:'room',code:'ABC12345',visibility:'public',ranked:false,status:'countdown',duration:30,players:[{id:'alice-id',name:'Alice',elo:1000,progress:0,position:0,wpm:0,accuracy:100},{id:'bob-id',name:'Bob',elo:1000,progress:0,position:0,wpm:0,accuracy:100}]});
 }''')
 page.evaluate('(text) => window.__ws.deliver({type:"countdown",text,startAt:Date.now()+5000,serverTime:Date.now(),duration:30})',text)
 assert page.locator('#raceSharedText').inner_text().startswith('the quick')
 assert page.locator('#raceSharedText .race-word').count()>5
 assert page.locator('#raceSharedText .race-char').count()==len(text)+1
 assert page.locator('#raceOpponentTag').inner_text()=='Bob'
 assert page.locator('#raceCountdown').inner_text().startswith('starting in')
 assert page.locator('#raceInput').is_disabled()
 page.evaluate('window.__ws.deliver({type:"start",startAt:Date.now()})')
 assert page.locator('#raceInput').is_enabled()
 page.locator('#raceInput').fill('the')
 page.locator('#raceInput').press('Enter')
 assert page.locator('#raceInput').input_value() == 'the ', 'Enter should act like a space at word boundary'
 page.locator('#raceInput').fill('the quick')
 assert page.locator('#raceSharedText .race-correct').count()==0
 color=page.evaluate('''() => {
  const chars=document.querySelectorAll('#raceSharedText .race-char');
  return [getComputedStyle(chars[0]).color,getComputedStyle(chars[30]).color];
 }''')
 assert color[0]==color[1], f'Typed progress should never change text color: {color}'
 page.evaluate('window.__ws.deliver({type:"progress",id:"bob-id",progress:20,position:12,correct:12,wpm:41,accuracy:100})')
 assert page.locator('#raceSharedText .race-other-typed').count()==0
 assert page.locator('#raceOpponentTag').inner_text()=='Bob'
 page.wait_for_timeout(200)
 assert page.locator('#raceYouMarker').is_visible()
 assert page.locator('#raceOpponentMarker').is_visible()
 assert page.locator('#raceYouMarker').evaluate('(el)=>parseFloat(el.style.left)') > 0
 assert page.locator('#raceOpponentMarker').evaluate('(el)=>parseFloat(el.style.left)') > page.locator('#raceYouMarker').evaluate('(el)=>parseFloat(el.style.left)')
 assert page.locator('.race-shared-legend').count()==0, 'Legend must be removed'
 assert page.locator('.race-shared-heading').count()==0, 'Heading must be removed'
 assert page.locator('.race-marker-label').count()==2
 badge=page.locator('#raceOpponentTag').evaluate('el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color,shadow:getComputedStyle(el).boxShadow})')
 assert badge['background']=='rgba(0, 0, 0, 0)',badge
 assert badge['shadow']=='none',badge
 assert badge['color']=='rgb(198, 160, 255)',badge
 bg=page.locator('.race-arena-shared').evaluate('el=>({backgroundImage:getComputedStyle(el).backgroundImage,backgroundColor:getComputedStyle(el).backgroundColor})')
 assert bg['backgroundImage']=='none',bg
 # Verify line-by-line following using actual measured wrapping, not guessed indices.
 lines=page.evaluate('''() => {
  const chars=[...document.querySelectorAll('#raceSharedText .race-char')];
  const result=[];let y=null;
  for(let i=0;i<chars.length;i++) {
    let top=chars[i].getBoundingClientRect().top;
    if(y===null||Math.abs(top-y)>3) {result.push(i);y=top;}
  }
  return result;
 }''')
 assert len(lines)>4, lines
 # Opponent is one visual row ahead: their caret sits on the lower row.
 own=lines[0]+5;ahead=lines[1]+4
 page.locator('#raceInput').fill(text[:own])
 page.evaluate('(p) => window.__ws.deliver({type:"progress",id:"bob-id",progress:20,position:p,correct:p,wpm:88,accuracy:99})',ahead)
 page.wait_for_timeout(150)
 assert page.locator('#raceOpponentMarker').is_visible(), 'Opponent one row ahead should be shown'
 # Two visual rows ahead: hide the opponent's caret.
 far=lines[2]+4
 page.evaluate('(p) => window.__ws.deliver({type:"progress",id:"bob-id",progress:30,position:p,correct:p,wpm:88,accuracy:99})',far)
 page.wait_for_timeout(150)
 assert page.locator('#raceOpponentMarker').is_hidden(), 'Opponent two lines ahead should be hidden'
 # Catch up to the second row: both are back on the first visible row.
 page.locator('#raceInput').fill(text[:lines[1]+2])
 page.evaluate('(p) => window.__ws.deliver({type:"progress",id:"bob-id",progress:30,position:p,correct:p,wpm:88,accuracy:99})',lines[1]+7)
 page.wait_for_timeout(150)
 assert page.locator('#raceOpponentMarker').is_visible(), 'Opponent on same line should be visible'
 assert page.locator('#raceSharedText .race-other-typed').count()==0
 data=page.evaluate('''() => ({viewportScroll:document.getElementById('raceSharedViewport').scrollTop,
   you:document.getElementById('raceYouMarker').getBoundingClientRect().top,
   other:document.getElementById('raceOpponentMarker').getBoundingClientRect().top,
   opacity:getComputedStyle(document.getElementById('raceOpponentMarker')).opacity})''')
 assert data['viewportScroll']>0, data
 assert abs(data['you']-data['other'])<15, data
 assert 0.65 < float(data['opacity']) < 0.83, data
 # Preview an interesting stage: you on the first visible line, the rival on the next.
 page.evaluate('(p) => window.__ws.deliver({type:"progress",id:"bob-id",progress:40,position:p,correct:p,wpm:90,accuracy:100})',lines[2]+5)
 page.wait_for_timeout(150)
 assert page.locator('#raceOpponentMarker').is_visible()
 page.locator('.race-arena').screenshot(path='/mnt/data/UndefinedType-v1.5-preview.png')
 page.screenshot(path='/mnt/data/UndefinedType-v1.5-preview-full.png',full_page=True)
 page.evaluate('window.__ws.deliver({type:"finished",reason:"time",winnerId:"alice-id",players:[{id:"alice-id",name:"Alice",wpm:100,accuracy:100,correct:150},{id:"bob-id",name:"Bob",wpm:60,accuracy:92,correct:90}],ratings:{}})')
 assert page.locator('#raceResult').inner_text().startswith('You won!')
 print('BROWSER SMOKE TEST PASSED; JS errors:',errors)
 assert not errors,errors
 b.close()
