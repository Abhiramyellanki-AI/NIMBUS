const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', error => console.error('BROWSER ERROR:', error.message));
  
  try {
    await page.goto('http://localhost:3000/buildings/Building_A_Lecture', { waitUntil: 'networkidle0', timeout: 15000 });
  } catch(e) {
    console.log("Navigation error:", e);
  }
  
  await browser.close();
})();
