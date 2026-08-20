const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('LOG:', msg.text()));
    page.on('pageerror', err => console.error('ERR:', err.message));

    await page.goto('http://localhost:8000/', { waitUntil: 'networkidle0', timeout: 10000 });
  } catch (err) {
    console.error("PUPPETEER ERROR:", err.message);
  } finally {
    if (browser) await browser.close();
    process.exit(0);
  }
})();
