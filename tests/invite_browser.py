"""Browser checks for auto-joining rooms through ?room=ABCDEFGH links.
Run with: python tests/invite_browser.py (requires Playwright and Chromium)
"""
from pathlib import Path
import base64
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]

mock=r'''
(() => {
  const storage=new Map(), session=new Map();
  Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)}});
  Object.defineProperty(window,'sessionStorage',{configurable:true,value:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,String(v)),removeItem:k=>session.delete(k)}});
  const initialToken = window.__preloadToken || false;
  if (initialToken) localStorage.setItem('ut_token', 'test-session-token');
  window.__messages=[];
  class MockSocket {
    static OPEN=1;
    static CONNECTING=0;
    constructor(url){this.readyState=0;window.__ws=this;
      setTimeout(()=>{this.readyState=1;this.onopen?.();this.deliver({type:'hello',id:'alice-id',serverTime:Date.now()});this.deliver({type:'lobby',rooms:[],queue:0});},20);
    }
    send(payload){const data=JSON.parse(payload); window.__messages.push(data);
      if(data.type==='auth')queueMicrotask(()=>this.deliver({type:'auth',user:{username:'Alice',elo:1000,wins:0,losses:0,draws:0}}));
      if(data.type==='join')queueMicrotask(()=>this.deliver(data.code==='ABC12345'?{
        type:'room',code:'ABC12345',visibility:'private',ranked:false,status:'waiting',duration:30,
        players:[{id:'alice-id',name:'Alice',elo:1000,progress:0,position:0,wpm:0,accuracy:100}]
      }:{type:'error',message:'Room not found.'}));
    }
    deliver(payload){this.onmessage?.({data:JSON.stringify(payload)});}
  }
  window.WebSocket=MockSocket;
  window.fetch=async (url,options={})=>({ok:true,status:200,json:async()=>
    url.includes('/api/me')?{user:localStorage.getItem('ut_token')?{username:'Alice',elo:1000,wins:0,losses:0,draws:0}:null}:
    url.includes('/api/leaderboard')?{players:[]}:
    {user:{username:'Alice',elo:1000,wins:0,losses:0,draws:0},token:'test-session-token'}
  });
})();
'''

markup=(root/'index.html').read_text()
markup=markup.replace('<link rel="stylesheet" href="style.css">','<style>'+(root/'style.css').read_text()+'</style>')
markup=markup.replace('<script src="app.js"></script>','<script>'+(root/'app.js').read_text()+'</script>')
markup=markup.replace('<script src="multiplayer.js"></script>','<script>'+(root/'multiplayer.js').read_text().replace("history.replaceState(history.state, '', current.pathname + current.search + current.hash);","window.__lastReplace=current.pathname + current.search + current.hash;")+'</script>')
markup=markup.replace('src="logo.png"','src="data:image/png;base64,'+base64.b64encode((root/'logo.png').read_bytes()).decode()+'"')
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        def open_invite(preload=False,code='ABC12345'):
            context=browser.new_context(viewport={'width':1360,'height':900})
            page=context.new_page()
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.evaluate(('window.__preloadToken=true;\n' if preload else '')+'window.__testSearch="?room='+code+'";window.history.replaceState=(state,title,url)=>window.__lastReplace=url;'+mock)
            html=markup.replace('new URLSearchParams(location.search).get(\'room\')', 'new URLSearchParams(window.__testSearch || location.search).get(\'room\')')
            page.set_content(html,wait_until='load',timeout=15000)
            return context,page,errors
        # New visitor: invited room selected but no premature join as guest.
        context,page,errors=open_invite()
        assert page.locator('#multiplayer').get_attribute('class').endswith('active')
        assert page.locator('#welcomeGate').is_visible()
        assert 'ABC12345' in page.locator('#welcomeIntro').inner_text()
        assert page.locator('#inviteBanner').is_visible()
        assert page.evaluate('window.__messages.filter(m=>m.type==="join").length')==0
        page.locator('#welcomeUsername').fill('Alice')
        page.locator('#welcomePassword').fill('123456789')
        page.locator('#welcomeLogin').click()
        page.locator('#onlineRoom').wait_for(state='visible',timeout=2500)
        assert page.locator('#roomCode').inner_text()=='ABC12345'
        assert page.evaluate('window.__messages.filter(m=>m.type==="join").length')==1
        assert page.locator('#inviteBanner').is_hidden()
        assert page.evaluate('window.__lastReplace') == 'blank'
        assert not errors,errors
        print('PASS: invite opens multiplayer; visitor auto-joins after login')
        context.close()
        # Signed in: automatic join without click.
        context,page,errors=open_invite(preload=True)
        page.locator('#onlineRoom').wait_for(state='visible',timeout=2500)
        assert page.locator('#welcomeGate').is_hidden()
        assert page.evaluate('window.__messages.filter(m=>m.type==="join").length')==1
        assert not errors,errors
        print('PASS: returning signed-in visitor auto-joins exactly once')
        context.close()
        # A guest is not allowed into multiplayer; sign-in later still auto-joins.
        context,page,errors=open_invite()
        page.locator('#welcomeGuest').click()
        assert page.locator('#welcomeGate').is_hidden()
        assert page.locator('#authGate').is_visible()
        assert page.evaluate('window.__messages.filter(m=>m.type==="join").length')==0
        page.locator('#authUsername').fill('Alice')
        page.locator('#authPassword').fill('123456789')
        page.locator('#loginAccount').click()
        page.locator('#onlineRoom').wait_for(state='visible',timeout=2500)
        assert page.evaluate('window.__messages.filter(m=>m.type==="join").length')==1
        assert not errors,errors
        print('PASS: guest restricted, then login completes invitation')
        context.close()
        # Invalid/expired rooms show usable error, no endless retries.
        context,page,errors=open_invite(preload=True,code='DEADBEEF')
        page.locator('#onlineStatus').wait_for(state='visible')
        page.wait_for_function('document.querySelector("#onlineStatus").textContent.includes("Room not found")',timeout=2500)
        assert page.locator('#inviteBanner').is_hidden()
        assert page.locator('#lobbySection').is_visible()
        assert page.evaluate('window.__messages.filter(m=>m.type==="join").length')==1
        assert not errors,errors
        print('PASS: expired invite offers clear error and lobby fallback')
        context.close()
        # Invite can be dismissed without ever joining.
        context,page,errors=open_invite()
        page.locator('#welcomeGuest').click()
        page.locator('#dismissInvite').click()
        page.locator('#authUsername').fill('Alice')
        page.locator('#authPassword').fill('123456789')
        page.locator('#loginAccount').click()
        page.wait_for_timeout(120)
        assert page.evaluate('window.__messages.filter(m=>m.type==="join").length')==0
        assert not errors,errors
        print('PASS: cancelled invite does not auto-join')
        context.close()
        browser.close()
finally:
    pass
