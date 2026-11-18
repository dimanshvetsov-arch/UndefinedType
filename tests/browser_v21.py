import asyncio, os, json
from playwright.async_api import async_playwright

URL = os.environ.get('UT_URL','http://127.0.0.1:3199/')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  pc=await browser.new_context(viewport={'width':1365,'height':900})
  page=await pc.new_page()
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto(URL,wait_until='domcontentloaded')
  await page.locator('#welcomeGuest').click()
  await page.locator('button[data-page="settings"]').click()
  assert await page.locator('#settings').evaluate('(el)=>el.classList.contains("active")')
  assert await page.locator('#correction').count()==0
  assert await page.locator('#sound').count()==0
  assert await page.locator('.color-ring').count()==2
  assert await page.locator('#settingsSignedOut').is_visible()
  assert 'temporary account' in (await page.locator('#welcomeStorageNotice').inner_text()).lower()
  await page.locator('#settingsUsername').fill('BrowserTester')
  await page.locator('#settingsPassword').fill('correctHorseBattery1')
  await page.locator('#settingsRegister').click()
  await page.wait_for_function('document.querySelector("#settingsAccountState").textContent.includes("BrowserTester")')
  assert await page.locator('#settingsSignedIn').is_visible()
  await page.locator('#settingsLogout').click()
  assert await page.locator('#settingsSignedOut').is_visible()
  await page.locator('#settingsUsername').fill('BrowserTester')
  await page.locator('#settingsPassword').fill('correctHorseBattery1')
  await page.locator('#settingsLogin').click()
  await page.wait_for_function('document.querySelector("#settingsAccountState").textContent.includes("BrowserTester")')
  await page.locator('button[data-page="leaderboards"]').click()
  await page.wait_for_function('document.querySelector("#globalRanks").textContent.includes("BrowserTester")')
  assert await page.locator('#records').count()==0
  await page.locator('button[data-page="test"]').click()
  t1=await page.locator('#wordsDisplay').inner_text()
  await page.locator('#restart').click()
  t2=await page.locator('#wordsDisplay').inner_text()
  assert t1!=t2, 'Restart must create new text'
  await page.wait_for_timeout(650)
  assert not await page.locator('#restart').evaluate('(el)=>el.classList.contains("restart-animate")')
  await page.screenshot(path='/mnt/data/UndefinedType-v2.1-desktop.png',full_page=True)
  print('DESKTOP: signup/login/logout, global rankings, settings circles and restart passed')
  print('PAGE_ERRORS',errors)
  assert not errors
  mobile=await browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
  phone=await mobile.new_page();phone_errors=[];phone.on('pageerror',lambda e:phone_errors.append(str(e)))
  await phone.goto(URL,wait_until='domcontentloaded')
  await phone.locator('#welcomeGuest').click()
  await phone.locator('button[data-page="test"]').click()
  before=await phone.locator('#wordsDisplay').inner_text()
  await phone.locator('#restart').click()
  after=await phone.locator('#wordsDisplay').inner_text()
  assert before!=after, 'Phone restart must generate new text'
  assert await phone.evaluate('window.matchMedia("(pointer: coarse)").matches')
  input=phone.locator('#typeInput')
  await input.focus();await phone.keyboard.type('abc')
  n1=await phone.locator('#wordsDisplay .char.correct, #wordsDisplay .char.incorrect').count()
  # Disallow backspace / mobile beforeinput deletion
  await phone.keyboard.press('Backspace')
  n2=await phone.locator('#wordsDisplay .char.correct, #wordsDisplay .char.incorrect').count()
  assert n1==n2, f'Mobile Backspace should not remove letters: {n1}, {n2}'
  await phone.wait_for_timeout(700)
  assert not await phone.locator('#restart').evaluate('(el)=>el.classList.contains("restart-animate")')
  await phone.locator('button[data-page="settings"]').click()
  assert await phone.locator('.color-ring').count()==2
  await phone.screenshot(path='/mnt/data/UndefinedType-v2.1-mobile.png',full_page=True)
  print('MOBILE: restart new text, no correction and color circles passed')
  print('MOBILE_PAGE_ERRORS',phone_errors)
  assert not phone_errors
  await browser.close()
asyncio.run(main())
