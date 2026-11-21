"""Browser acceptance tests for corrected word locks, real consistency and saved progress."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64
root=Path(__file__).resolve().parents[1]
markup=(root/'index.html').read_text()
markup=markup.replace('<link rel="stylesheet" href="style.css">','<style>'+(root/'style.css').read_text()+'</style>')
for name in ('typing-rules.js','wordbanks.js','app.js','multiplayer.js'):
    markup=markup.replace(f'<script src="{name}"></script>',f'<script>\n{(root/name).read_text()}\n</script>')
markup=markup.replace('src="logo.png"','src="data:image/png;base64,'+base64.b64encode((root/'logo.png').read_bytes()).decode()+'"')
mock=(root/'tests/browser_v18.py').read_text().split("mock_js=r'''",1)[1].split("'''",1)[0]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1280,'height':920});errors=[]
    page.on('pageerror',lambda x:errors.append(str(x)))
    page.evaluate(mock)
    page.set_content(markup,wait_until='load',timeout=20000)
    page.locator('#welcomeGuest').click()
    page.click('[data-page="test"]')
    assert page.evaluate("window.UndefinedTypeWordBanks.en.split(' ').length")>=650
    def setup_source():
        page.evaluate('''() => {reset();source='apple banana kiwi';typed='';events=[];renderText();}''')
        page.locator('#typeInput').focus()
    setup_source()
    # Correct prefix is not fully locked.
    page.keyboard.type('appl')
    page.keyboard.press('Backspace')
    assert page.evaluate('typed')=='app', 'incomplete correct word should be editable'
    page.keyboard.type('le')
    page.keyboard.press('Backspace')
    assert page.evaluate('typed')=='apple','completed correct word should be locked'
    page.keyboard.press('Control+Backspace')
    assert page.evaluate('typed')=='apple','completed correct word Ctrl+Backspace should be locked'
    setup_source()
    page.keyboard.type('apole ')  # incorrect word, then separator
    page.keyboard.press('Backspace')
    assert page.evaluate('typed')=='apole'
    for expect in ['apol','apo','ap','a','']:
        page.keyboard.press('Backspace')
        assert page.evaluate('typed')==expect,f'could not erase misspelled word down to {expect!r}'
    setup_source()
    page.keyboard.type('apole ban')
    for _ in range(len(' ban')):page.keyboard.press('Backspace')
    assert page.evaluate('typed')=='apole', 'previous mistake should still be editable after incomplete next word'
    page.keyboard.press('Control+Backspace')
    assert page.evaluate('typed')=='', 'Ctrl+Backspace should remove incorrect word'
    setup_source()
    page.keyboard.type('apple bx')
    page.keyboard.press('Control+Backspace')
    assert page.evaluate('typed')=='apple ', 'should delete partial incorrect word, preserve locked correct word'
    # speed consistency: even 2-second windows are about 100; bursty strokes are lower
    score=page.evaluate('''() => {events=[];for(let i=0;i<12;i++)events.push({type:'input',t:.15+i*.3,correct:true});return getConsistency(6)}''')
    assert score is not None
    a=page.evaluate('''() => {events=[];for(let i=0;i<12;i++)events.push({type:'input',t:.3+i*.28,correct:true});return getConsistency(6)}''')
    b=page.evaluate('''() => {events=[];for(let i=0;i<12;i++)events.push({type:'input',t:.1+i*.03,correct:true});return getConsistency(6)}''')
    assert b < a, f'burst typing consistency {b} should be lower than distributed strokes {a}'
    # Save two actual completed tests and confirm graph/history feedback updates.
    page.evaluate('''() => {reset();mode='words';length=10;source='apple banana kiwi';typed='';events=[];renderText();started=true;startedAt=performance.now()-30000;for(let i=0;i<source.length;i++)events.push({type:'input',t:i*.8,correct:true});typed=source;finish();}''')
    assert page.locator('#results').is_visible(), 'results page not visible'
    assert page.locator('#progressGraph').is_visible(), 'history chart missing'
    assert page.locator('#graph').is_visible(), 'speed chart missing'
    assert len(page.evaluate('JSON.parse(localStorage.getItem("undefinedtype-test-history-v25"))'))>=1
    page.evaluate('''() => {reset();mode='words';length=10;source='apple banana kiwi';typed='';events=[];renderText();started=true;startedAt=performance.now()-20000;for(let i=0;i<source.length;i++)events.push({type:'input',t:i*.6,correct:true});typed=source;finish();}''')
    assert 'vs your previous' in page.locator('#progressInsight').inner_text(),page.locator('#progressInsight').inner_text()
    assert page.locator('#recentTests .recent-test-row').count()>=2
    assert page.locator('#progressCount').inner_text().startswith('2 saved')
    assert page.locator('#finalConsistency').inner_text() not in ('100%', 'NaN%', 'Infinity%'), 'should not fake perfect consistency'
    page.screenshot(path=str(root.parent/'UndefinedType-v2.5-progress-preview.png'),full_page=True)
    # Multiplayer same behavior with mock Socket and own typing field.
    page.click('[data-page="multiplayer"]')
    page.locator('#authUsername').fill('Alice');page.locator('#authPassword').fill('longpassword123')
    page.click('#registerAccount');page.click('#createRoom')
    page.evaluate('''() => window.__ws.deliver({type:'room',code:'ABC12345',visibility:'private',ranked:false,status:'countdown',wordCount:30,players:[{id:'alice-id',name:'Alice',elo:1000,progress:0,position:0,wpm:0,accuracy:100},{id:'bob-id',name:'Bob',elo:1000,progress:0,position:0,wpm:0,accuracy:100}]})''')
    page.evaluate('''() => window.__ws.deliver({type:'countdown',text:'apple banana kiwi',startAt:Date.now()+5000,serverTime:Date.now(),duration:0})''')
    page.evaluate('''() => window.__ws.deliver({type:'start',startAt:Date.now()})''')
    inp=page.locator('#raceInput')
    inp.fill('apole ban')
    for _ in range(len(' ban')): inp.press('Backspace')
    assert inp.input_value()=='apole', 'multiplayer earlier wrong word was locked'
    inp.press('Control+Backspace')
    assert inp.input_value()=='', 'multiplayer wrong word Ctrl+Backspace failed'
    inp.fill('apple')
    inp.press('Backspace')
    assert inp.input_value()=='apple', 'multiplayer completed correct word erased'
    assert not errors,errors
    print('PASS: solo and multiplayer incorrect word erasure, completed word locks, consistency, two charts, saved history, expanded English bank')
    browser.close()
