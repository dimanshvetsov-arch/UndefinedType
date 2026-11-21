"""Check precise WPM tooltips, mouse hover, touch tap and keyboard navigation."""
from pathlib import Path
import base64
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+ (root/'style.css').read_text()+'</style>')
for name in ('typing-rules.js','wordbanks.js','app.js','multiplayer.js'):
    html=html.replace(f'<script src="{name}"></script>',f'<script>\n{(root/name).read_text()}\n</script>')
html=html.replace('src="logo.png"','src="data:image/png;base64,'+base64.b64encode((root/'logo.png').read_bytes()).decode()+'"')
mock=(root/'tests/browser_v18.py').read_text().split("mock_js=r'''",1)[1].split("'''",1)[0]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage'])
    page=b.new_page(viewport={'width':1300,'height':1000})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.evaluate(mock)
    page.set_content(html,wait_until='load',timeout=25000)
    page.locator('#welcomeGuest').click()
    # The game is seeded with two comparable results, not fabricated chart points.
    page.evaluate('''() => {
      mode='words';length=10;lang='en';reset();source='water some happy';typed='';events=[];renderText();
      started=true;startedAt=performance.now()-22000;
      for(let i=0;i<source.length;i++)events.push({type:'input',t:i*.6,correct:true});
      typed=source;finish();
    }''')
    page.evaluate('''() => {
      mode='words';length=10;lang='en';reset();source='water some happy';typed='';events=[];renderText();
      started=true;startedAt=performance.now()-14000;
      for(let i=0;i<source.length;i++)events.push({type:'input',t:i*.45,correct:true});
      typed=source;finish();
    }''')
    assert page.locator('#results').is_visible()
    assert page.evaluate('document.querySelector("#progressGraph")._plotPoints.length')==2
    assert page.evaluate('document.querySelector("#graph")._plotPoints.length')>2
    for graphid,idx in [('progressGraph',0),('progressGraph',1),('graph',3)]:
        canvas=page.locator('#'+graphid)
        point=page.evaluate('''([id,idx])=>{const c=document.getElementById(id),p=c._plotPoints[idx],r=c.getBoundingClientRect();return {x:r.left+p.x*r.width/c._plotWidth,y:r.top+p.y*r.height/c._plotHeight,wpm:p.value.toFixed(1)};}''',[graphid,idx])
        page.mouse.move(point['x'],point['y'])
        tooltip=page.locator('#'+graphid+' + .chart-tooltip')
        assert tooltip.is_visible(), (graphid,idx,'no tooltip')
        assert f"{point['wpm']} WPM" in tooltip.inner_text(),(graphid,idx,tooltip.inner_text())
        if graphid=='progressGraph':assert 'Test ' in tooltip.inner_text()
        if graphid=='graph': assert 'seconds into the test' in tooltip.inner_text()
    # tapping the first historic WPM point must also show it.
    point=page.evaluate('''() =>{const c=document.getElementById('progressGraph'),p=c._plotPoints[0],r=c.getBoundingClientRect();return {x:r.left+p.x*r.width/c._plotWidth,y:r.top+p.y*r.height/c._plotHeight};}''')
    page.evaluate('''({x,y})=>document.getElementById('progressGraph').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:x,clientY:y,pointerType:'touch'}))''',point)
    assert page.locator('#progressGraph + .chart-tooltip').is_visible(),'mobile tap tooltip missing'
    page.locator('#progressGraph').focus()
    page.keyboard.press('ArrowRight')
    assert page.locator('#progressGraph + .chart-tooltip').is_visible(),'keyboard tooltip missing'
    assert not errors,errors
    page.evaluate("document.getElementById('progressGraph').blur()")
    page.mouse.move(point['x'],point['y'])
    page.screenshot(path=str(root.parent/'UndefinedType-v2.5.3-graph-preview.png'),full_page=True)
    print('PASS: saved WPM and speed WPM tooltips on hover, tap and keyboard')
    b.close()
