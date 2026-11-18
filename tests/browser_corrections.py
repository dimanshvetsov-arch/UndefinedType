"""Browser check for correction boundaries in solo and multiplayer."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64
root=Path(__file__).resolve().parents[1]
markup=(root/'index.html').read_text()
css=(root/'style.css').read_text()
markup=markup.replace('<link rel="stylesheet" href="style.css">','<style>'+css+'</style>')
for name in ['app.js','multiplayer.js']:
    markup=markup.replace(f'<script src="{name}"></script>',f'<script>{(root/name).read_text()}</script>')
markup=markup.replace('src="logo.png"','src="data:image/png;base64,'+base64.b64encode((root/'logo.png').read_bytes()).decode()+'"')
mock=(root/'tests/browser_v18.py').read_text().split("mock_js=r'''",1)[1].split("'''",1)[0]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page()
    errors=[]
    page.on('pageerror',lambda x: errors.append(str(x)))
    page.evaluate(mock)
    page.set_content(markup,wait_until='load',timeout=15000)
    page.wait_for_timeout(100)
    page.click('#welcomeGuest')
    # Solo: an accurately typed prefix cannot be backspaced.
    page.click('[data-page="test"]')
    original=page.evaluate('source')
    word=original.split(' ')[0]
    page.locator('#typeInput').focus()
    page.keyboard.type(word)
    assert page.evaluate('typed')==word
    page.keyboard.press('Backspace')
    assert page.evaluate('typed')==word, 'solo correct word erased'
    page.keyboard.type(' ')
    page.keyboard.press('Backspace')
    assert page.evaluate('typed')==word+' ', 'solo correct completed word erased'
    # Solo: incorrect word can be erased (unless moved on).
    page.evaluate('reset()')
    original=page.evaluate('source')
    word=original.split(' ')[0]
    typo=('x' if word[0]!='x' else 'q')+word[1:]
    page.keyboard.type(typo+' ')
    assert page.evaluate('typed')==typo+' '
    page.keyboard.press('Backspace')
    assert page.evaluate('typed')==typo
    page.keyboard.type(original[len(typo)+1])
    # Progression back into word is allowed only when you're still fixing it.
    # multiplayer
    page.click('[data-page="multiplayer"]')
    page.locator('#authUsername').fill('Alice');page.locator('#authPassword').fill('longpassword123')
    page.click('#registerAccount')
    page.click('#createRoom')
    page.evaluate('''() => window.__ws.deliver({type:'room',code:'ABC12345',visibility:'private',ranked:false,status:'countdown',wordCount:30,players:[{id:'alice-id',name:'Alice',elo:1000,progress:0,position:0,wpm:0,accuracy:100},{id:'bob-id',name:'Bob',elo:1000,progress:0,position:0,wpm:0,accuracy:100}]})''')
    text='alpha beta gamma delta epsilon zeta'
    page.evaluate('(text)=>window.__ws.deliver({type:"countdown",text,startAt:Date.now()+5000,serverTime:Date.now(),duration:0})',text)
    page.evaluate('window.__ws.deliver({type:"start",startAt:Date.now()})')
    inp=page.locator('#raceInput')
    inp.fill('alpha')
    inp.press('Backspace')
    assert inp.input_value()=='alpha', 'multiplayer correct word erased'
    inp.fill('alpha ')
    inp.press('Backspace')
    assert inp.input_value()=='alpha ', 'multiplayer correct word space erased'
    inp.type('x')
    assert inp.input_value()=='alpha x'
    inp.press('Backspace')
    assert inp.input_value()=='alpha ', 'multiplayer incorrect current word cannot be edited'
    # Wrong word followed by Space: can return, before starting next word.
    page.evaluate('(text)=>window.__ws.deliver({type:"countdown",text,startAt:Date.now()+5000,serverTime:Date.now(),duration:0})',text)
    page.evaluate('window.__ws.deliver({type:"start",startAt:Date.now()})')
    inp.fill('alxha ')
    inp.press('Backspace')
    assert inp.input_value()=='alxha', 'multiplayer wrong word separator not removable'
    inp.press('Backspace')
    assert inp.input_value()=='alxh'
    # Once new word has started, cannot return to the old incorrect word.
    page.evaluate('(text)=>window.__ws.deliver({type:"countdown",text,startAt:Date.now()+5000,serverTime:Date.now(),duration:0})',text)
    page.evaluate('window.__ws.deliver({type:"start",startAt:Date.now()})')
    inp.fill('alxha b')
    inp.press('Backspace')
    assert inp.input_value()=='alxha b', 'correct prefix of new word should lock prior word'
    inp.type('x')
    inp.press('Backspace')
    assert inp.input_value()=='alxha b', 'wrong character must be correctable'
    inp.press('Backspace')
    assert inp.input_value()=='alxha b', 'wrong prior word incorrectly unlocked'
    assert not errors, errors
    print('PASS: solo and multiplayer correct-word lock, wrong-word correction before space, next-word locking; no browser errors')
    browser.close()
