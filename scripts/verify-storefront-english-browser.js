async (page) => {
  if (!page.url().startsWith('http://127.0.0.1:5371/')) throw new Error('Isolated *_test fixture required');
  let checks = 0;
  const check = (condition, message) => { if (!condition) throw new Error(message); checks++; };
  const english = async () => check(!/[\u3400-\u9fff]/u.test(await page.locator('body').innerText()), `Non-English interface on ${page.url()}`);
  await page.setViewportSize({width:1600,height:1000});
  await page.getByRole('textbox',{name:'Email'}).fill('buyer@gingtto.test');
  await page.getByRole('textbox',{name:'Password'}).fill('Wrong-Fixture');
  await page.getByRole('button',{name:'Login to Continue'}).click();
  await page.getByText('Invalid account or password.', {exact:true}).waitFor();
  await english();
  await page.screenshot({path:'output/playwright/storefront-english-login.png'});
  // Mixed frontend/backend releases must not leak a legacy Chinese login error.
  await page.route('**/api/auth/store/login', route => route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({message:'\u8d26\u53f7\u6216\u5bc6\u7801\u9519\u8bef'})}));
  await page.getByRole('button',{name:'Login to Continue'}).click();
  await page.getByText('Invalid account or password.',{exact:true}).waitFor();
  await english();
  await page.unroute('**/api/auth/store/login');
  await page.getByRole('textbox',{name:'Password'}).fill('Fixture-Only');
  await page.getByRole('button',{name:'Login to Continue'}).click();
  await page.waitForURL('**/shop');
  await page.locator('.style-group').first().waitFor();
  await english();
  for (const path of ['/presale','/inventory','/orders','/account','/checkout']) {
    await page.goto(`http://127.0.0.1:5371${path}`);
    await page.locator('.site-header').waitFor();
    await page.waitForLoadState('networkidle');
    check(new URL(page.url()).pathname === path, `Unexpected redirect from ${path}`);
    await english();
  }
  await page.goto('http://127.0.0.1:5371/product/cat-13-white?lang=zh');
  await page.getByRole('spinbutton',{name:'Quantity 28/S',exact:true}).waitFor();
  await english();
  await page.setViewportSize({width:390,height:844});
  await english();
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile horizontal overflow');
  await page.screenshot({path:'output/playwright/storefront-english-mobile.png',fullPage:true});
  return {checks,loginErrorEnglish:true,legacyErrorEnglish:true,pagesEnglish:true,mobileEnglish:true};
}
