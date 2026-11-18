"""Prevent clipboard paste, drop, copy in generated typing tests and races.
Custom text editor intentionally allows paste to author a test.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64

root=Path(__file__).resolve().parents[1]
markup=(root/'index.html').read_text()
markup=markup.replace('<link rel="stylesheet" href="style.css">','<style>'+(root/'style.css').read_text()+'</style>')
for file in ('app.js','multiplayer.js'):
    markup=markup.replace(f'<script src="{file}"></script>',f'<script>{(root/file).read_text()}</script>')
markup=markup.replace('src="logo.png"','src="data:image/png;base64,'+base64.b64encode((root/'logo.png').read_bytes()).decode()+'"')
mock=(root/'tests/browser_v18.py').read_text().split("mock_js=r'''",1)[1].split("'''",1)[0]

def clipboard_experiment(page, selector, expected_input_value=None, mode='paste'):
    return page.locator(selector).evaluate('''(el,kind)=>{
      let event;
      if(kind==='paste') event=new Event('paste',{bubbles:true,cancelable:true});
      if(kind==='drop') event=new Event('drop',{bubbles:true,cancelable:true});
      if(kind==='copy') event=new Event('copy',{bubbles:true,cancelable:true});
      const dispatched=el.dispatchEvent(event);
      return {defaultPrevented:event.defaultPrevented,dispatched};
    }''',mode)

def assert_before_input_blocked(page, selector, input_type):
    result=page.locator(selector).evaluate('''(el,kind)=>{
      const event=new Event('beforeinput',{bubbles:true,cancelable:true});
      Object.defineProperty(event,'inputType',{value:kind});
      el.dispatchEvent(event);
      return event.defaultPrevented;
    }''',input_type)
    assert result, f'{selector} allowed {input_type}'

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    for mobile in (False,True):
        options={'viewport':{'width':390,'height':844},'has_touch':True,'is_mobile':True} if mobile else {'viewport':{'width':1380,'height':910}}
        ctx=browser.new_context(**options)
        page=ctx.new_page()
        errors=[]
        page.on('pageerror',lambda x:errors.append(str(x)))
        page.evaluate(mock)
        page.set_content(markup,wait_until='load',timeout=15000)
        page.wait_for_timeout(100)
        page.locator('#welcomeGuest').click()
        inp=page.locator('#typeInput')
        inp.focus()
        for kind in ('paste','drop'):
            assert clipboard_experiment(page,'#typeInput',mode=kind)['defaultPrevented'],f'solo allows {kind} on {mobile}'
        assert_before_input_blocked(page,'#typeInput','insertFromPaste')
        assert_before_input_blocked(page,'#typeInput','insertFromPasteAsQuotation')
        assert_before_input_blocked(page,'#typeInput','insertFromDrop')
        assert clipboard_experiment(page,'#wordsDisplay',mode='copy')['defaultPrevented']
        assert clipboard_experiment(page,'#typingWrap',mode='copy')['defaultPrevented']
        assert page.locator('#wordsDisplay').evaluate('(el)=>getComputedStyle(el).userSelect')=='none'
        # A browser that sends only an input event is still blocked.
        inp.evaluate('''el=>{el.value='copied paragraph';el.dispatchEvent(new InputEvent('input',{inputType:'insertFromPaste',data:'copied paragraph',bubbles:true}));}''')
        assert page.evaluate('typed')==''
        assert inp.input_value()==''
        # Actual typing still works.
        word=page.evaluate('source.split(" ")[0]')
        inp.focus();page.keyboard.type(word)
        assert page.evaluate('typed')==word
        # Custom authoring intentionally permits paste (needed to create tests).
        page.locator('[data-mode="custom"]').click()
        assert not clipboard_experiment(page,'#customText')['defaultPrevented']
        page.locator('#customText').fill('A custom passage is allowed')
        assert page.locator('#customText').input_value()=='A custom passage is allowed'
        # Zen is also a typing test, so it cannot accept pasted words.
        page.locator('[data-mode="zen"]').click()
        zen=page.locator('#zenInput');zen.focus();page.keyboard.type('hello')
        assert zen.input_value()=='hello'
        assert clipboard_experiment(page,'#zenInput')['defaultPrevented']
        assert_before_input_blocked(page,'#zenInput','insertFromPaste')
        zen.evaluate('''el=>{el.value='hello pasted!';el.dispatchEvent(new InputEvent('input',{inputType:'insertFromPaste',data:' pasted!',bubbles:true}));}''')
        assert zen.input_value()=='hello',f'Zen paste bypassed fallback: {zen.input_value()!r}'
        # Online race setup.
        page.locator('[data-page="multiplayer"]').click()
        page.locator('#authUsername').fill('Alice');page.locator('#authPassword').fill('strongPassword123')
        page.locator('#registerAccount').click();page.locator('#createRoom').click()
        page.evaluate('''() => window.__ws.deliver({type:'room',code:'ABC12345',visibility:'private',ranked:false,status:'countdown',wordCount:30,players:[{id:'alice-id',name:'Alice',elo:1000,progress:0,position:0,wpm:0,accuracy:100},{id:'bob-id',name:'Bob',elo:1000,progress:0,position:0,wpm:0,accuracy:100}]})''')
        page.evaluate('''() => window.__ws.deliver({type:'countdown',text:'alpha beta gamma delta',startAt:Date.now()+5000,serverTime:Date.now(),duration:0})''')
        page.evaluate('window.__ws.deliver({type:"start",startAt:Date.now()})')
        race=page.locator('#raceInput');race.fill('alp')
        assert race.input_value()=='alp'
        assert clipboard_experiment(page,'#raceInput')['defaultPrevented']
        assert clipboard_experiment(page,'#raceInput',mode='drop')['defaultPrevented']
        assert clipboard_experiment(page,'#raceSharedViewport',mode='copy')['defaultPrevented']
        assert_before_input_blocked(page,'#raceInput','insertFromPaste')
        assert_before_input_blocked(page,'#raceInput','insertFromDrop')
        race.evaluate('''el=>{el.value='alpha beta gamma delta';el.dispatchEvent(new InputEvent('input',{inputType:'insertFromPaste',data:'ha beta gamma delta',bubbles:true}));}''')
        assert race.input_value()=='alp', 'Race paste made progress'
        assert not errors, errors
        ctx.close()
        print(f'PASS: {"phone" if mobile else "desktop"} solo, zen, custom, multiplayer paste/copy/drop and normal typing')
    browser.close()
