"""v2.4 regression: consistent word deletion and two-color, gapless wordmark."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64

root=Path(__file__).resolve().parents[1]
markup=(root/'index.html').read_text()
markup=markup.replace('<link rel="stylesheet" href="style.css">','<style>'+(root/'style.css').read_text()+'</style>')
for name in ('app.js','multiplayer.js'):
    markup=markup.replace(f'<script src="{name}"></script>',f'<script>{(root/name).read_text()}</script>')
markup=markup.replace('src="logo.png"','src="data:image/png;base64,'+base64.b64encode((root/'logo.png').read_bytes()).decode()+'"')
mock=(root/'tests/browser_v18.py').read_text().split("mock_js=r'''",1)[1].split("'''",1)[0]

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1320,'height':900}); errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.evaluate(mock)
    page.set_content(markup,wait_until='load',timeout=15000)
    page.locator('#welcomeGuest').click()
    # Header has NO extra whitespace between its two differently colored words.
    assert page.locator('.brand-wordmark').text_content()=='UndefinedType'
    assert page.locator('.brand-undefined').inner_text()=='Undefined'
    assert page.locator('.brand-type').inner_text()=='Type'
    assert page.evaluate('''() => getComputedStyle(document.querySelector('.brand-undefined')).color !== getComputedStyle(document.querySelector('.brand-type')).color''')
    assert page.evaluate('''() => Math.abs(document.querySelector('.brand-undefined').getBoundingClientRect().right-document.querySelector('.brand-type').getBoundingClientRect().left)<2'''), 'wordmark contains a visible space'
    page.click('[data-page="test"]')
    page.evaluate('reset()')
    source=page.evaluate('source')
    word=source.split(' ')[0]
    typo=(('x' if word[0]!='x' else 'y')+word[1:])
    page.locator('#typeInput').focus()
    page.keyboard.type(typo)
    page.keyboard.press('Control+Backspace')
    assert page.evaluate('typed')=='','Solo Ctrl+Backspace failed to erase wrong word'
    page.keyboard.type(word)
    page.keyboard.press('Control+Backspace')
    assert page.evaluate('typed')==word,'Solo Ctrl+Backspace erased correct word'
    page.keyboard.type(' ')
    second=source[len(word)+1]
    bad='x' if second!='x' else 'z'
    page.keyboard.type(bad)
    page.keyboard.press('Control+Backspace')
    assert page.evaluate('typed')==word+' ','Solo Ctrl+Backspace erased previous locked word'
    page.keyboard.press('Control+Backspace')
    assert page.evaluate('typed')==word+' ','Solo could erase correct word after deleting current one'
    page.keyboard.type(bad)
    page.keyboard.press('Delete')
    assert page.evaluate('typed')==word+' ','Solo Delete key did not fix wrong letter'

    page.click('[data-page="multiplayer"]')
    page.locator('#authUsername').fill('Alice');page.locator('#authPassword').fill('longpassword123')
    page.click('#registerAccount');page.click('#createRoom')
    page.evaluate('''() => window.__ws.deliver({type:'room',code:'ABC12345',visibility:'private',ranked:false,status:'countdown',wordCount:30,players:[{id:'alice-id',name:'Alice',elo:1000,progress:0,position:0,wpm:0,accuracy:100},{id:'bob-id',name:'Bob',elo:1000,progress:0,position:0,wpm:0,accuracy:100}]})''')
    race_text='alpha beta gamma delta epsilon'
    page.evaluate('(text)=>window.__ws.deliver({type:"countdown",text,startAt:Date.now()+5000,serverTime:Date.now(),duration:0})',race_text)
    page.evaluate('window.__ws.deliver({type:"start",startAt:Date.now()})')
    inp=page.locator('#raceInput')
    inp.fill('alxha ')
    inp.press('Control+Backspace')
    assert inp.input_value()=='','Multiplayer Ctrl+Backspace failed for wrong word after Space'
    inp.fill('alpha ')
    inp.press('Control+Backspace')
    assert inp.input_value()=='alpha ', 'Multiplayer Ctrl+Backspace erased locked word'
    inp.fill('alpha bx')
    inp.press('Control+Backspace')
    assert inp.input_value()=='alpha ','Multiplayer Ctrl+Backspace removed too much'
    inp.press('Control+Backspace')
    assert inp.input_value()=='alpha ','Multiplayer could erase previous locked word'
    inp.type('x')
    inp.press('Delete')
    assert inp.input_value()=='alpha ','Multiplayer Delete key did not erase mistake'
    inp.type('x')
    inp.evaluate('''el=>el.dispatchEvent(new InputEvent('beforeinput',{inputType:'deleteWordBackward',bubbles:true,cancelable:true}))''')
    assert inp.input_value()=='alpha ','Phone/IME word deletion failed in multiplayer'
    # Check Ctrl+Backspace text was actually sent to backend.
    assert page.evaluate('''() => window.__messages.some(m=>m.type==='input'&&m.value==='alpha ')''')
    assert not errors,errors
    print('PASS: no-gap two-color UndefinedType; Ctrl+Backspace, Delete, phone word-delete, locked words (solo + multiplayer)')
    browser.close()
