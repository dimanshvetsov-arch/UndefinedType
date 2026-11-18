"""Simulated touch-phone deletion regression for solo and multiplayer."""
from pathlib import Path
import base64
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
markup=(root/'index.html').read_text()
markup=markup.replace('<link rel="stylesheet" href="style.css">','<style>'+(root/'style.css').read_text()+'</style>')
for name in ('app.js','multiplayer.js'):
    markup=markup.replace(f'<script src="{name}"></script>',f'<script>{(root/name).read_text()}</script>')
markup=markup.replace('src="logo.png"','src="data:image/png;base64,'+base64.b64encode((root/'logo.png').read_bytes()).decode()+'"')
mock=(root/'tests/browser_v18.py').read_text().split("mock_js=r'''",1)[1].split("'''",1)[0]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    ctx=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
    phone=ctx.new_page();errors=[];phone.on('pageerror',lambda e:errors.append(str(e)))
    phone.evaluate(mock)
    phone.set_content(markup,wait_until='load',timeout=15000)
    phone.wait_for_timeout(80)
    phone.locator('#welcomeGuest').click()
    assert phone.evaluate('undefinedtypeIsPhone()')
    # Simulate a soft keyboard which sends beforeinput instead of keydown.
    source=phone.evaluate('source')
    phone.locator('#typeInput').focus()
    phone.keyboard.type(('x' if source[0]!='x' else 'y'))
    assert phone.evaluate('typed.length')==1
    phone.evaluate('''() => document.querySelector('#typeInput').dispatchEvent(new InputEvent('beforeinput',{inputType:'deleteContentBackward',bubbles:true,cancelable:true}))''')
    assert phone.evaluate('typed')=='', 'phone delete did not remove wrong solo letter'
    phone.keyboard.type(source[:3])
    original=phone.evaluate('typed')
    phone.evaluate('''() => document.querySelector('#typeInput').dispatchEvent(new InputEvent('beforeinput',{inputType:'deleteContentBackward',bubbles:true,cancelable:true}))''')
    assert phone.evaluate('typed')==original, 'correct prefix should stay protected'
    # Mobile multiplayer uses the same controlled Backspace logic.
    phone.click('[data-page="multiplayer"]')
    phone.locator('#authUsername').fill('Alice');phone.locator('#authPassword').fill('strongPassword123')
    phone.click('#registerAccount');phone.click('#createRoom')
    phone.evaluate('''() => window.__ws.deliver({type:'room',code:'ABC12345',visibility:'private',ranked:false,status:'countdown',wordCount:30,players:[{id:'alice-id',name:'Alice',elo:1000,progress:0,position:0,wpm:0,accuracy:100},{id:'bob-id',name:'Bob',elo:1000,progress:0,position:0,wpm:0,accuracy:100}]})''')
    phone.evaluate('''() => window.__ws.deliver({type:"countdown",text:'alpha beta gamma delta',startAt:Date.now()+5000,serverTime:Date.now(),duration:0})''')
    phone.evaluate('window.__ws.deliver({type:"start",startAt:Date.now()})')
    inp=phone.locator('#raceInput')
    inp.fill('alx')
    inp.evaluate("el=>el.dispatchEvent(new InputEvent('beforeinput',{inputType:'deleteContentBackward',bubbles:true,cancelable:true}))")
    assert inp.input_value()=='al','phone multiplayer did not remove wrong letter'
    inp.evaluate("el=>el.dispatchEvent(new InputEvent('beforeinput',{inputType:'deleteContentBackward',bubbles:true,cancelable:true}))")
    assert inp.input_value()=='a','phone multiplayer got stuck after deleting typo'
    inp.evaluate("el=>el.dispatchEvent(new InputEvent('beforeinput',{inputType:'deleteContentBackward',bubbles:true,cancelable:true}))")
    assert inp.input_value()=='','phone multiplayer did not erase incorrect word'
    assert not errors, errors
    browser.close()
    print('PASS: touch-phone solo and multiplayer Backspace, including beforeinput soft-keyboard deletion')
