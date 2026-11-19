"""Regression tests for the v2.5.1 consistency fix, including saved results."""
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
    page=browser.new_page(viewport={'width':1280,'height':900})
    errors=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    page.evaluate(mock)
    page.set_content(markup,wait_until='load',timeout=20000)
    page.locator('#welcomeGuest').click()
    # These bursts used to produce 0% from the old standard-deviation formula.
    measures=page.evaluate('''() => {
      events=[];
      const insufficient=getConsistency(6);
      for(let i=0;i<20;i++)events.push({type:'input',t:0.1+i*0.025,correct:true});
      const extremeBurst=getConsistency(10);
      events=[];
      for(let i=0;i<20;i++)events.push({type:'input',t:.1+i*.48,correct:true});
      const steady=getConsistency(10);
      events=[];
      for(let i=0;i<20;i++)events.push({type:'input',t:(i<10?.1+i*.04:8.1+(i-10)*.04),correct:true});
      const intermittent=getConsistency(10);
      events=[];
      for(let i=0;i<3;i++)events.push({type:'input',t:.1+i*.5,correct:true});
      const sparse=getConsistency(10);
      events=[];
      for(let i=0;i<18;i++)events.push({type:'zen-delta',t:i*.42,count:1});
      const zen=getConsistency(8,true);
      return {insufficient,extremeBurst,steady,intermittent,sparse,zen};
    }''')
    assert measures['insufficient'] is None,measures
    assert measures['sparse'] is None,measures
    assert 1 <= measures['extremeBurst'] <= 40,measures
    assert measures['steady'] > 85,measures
    assert 1 <= measures['intermittent'] < measures['steady'],measures
    assert measures['zen'] > 0,measures
    # Normal result rendering must display the computed number, never 0%.
    page.evaluate('''() => {
      reset();mode='words';length=10;source='alpha bravo charlie delta';typed=source;
      started=true;startedAt=performance.now()-10000;
      events=[];
      for(let i=0;i<25;i++)events.push({type:'input',t:.15+i*.015,correct:true});
      finish();
    }''')
    consistency=page.locator('#finalConsistency').inner_text()
    assert consistency not in ('0%','—','NaN%','Infinity%'),consistency
    saved=page.evaluate('JSON.parse(localStorage.getItem("undefinedtype-test-history-v25")).at(-1).consistency')
    assert isinstance(saved,(int,float)) and saved>0,saved
    assert page.locator('#progressGraph').is_visible()
    assert page.locator('#graph').is_visible()
    assert not errors,errors
    print('PASS: sparse samples show —; steady > stop/start > bursts; Zen; result != 0%; history + charts',measures)
    browser.close()
