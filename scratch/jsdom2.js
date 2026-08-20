const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('okk/app/index.html', 'utf8');
const virtualConsole = new (require('jsdom')).VirtualConsole();
virtualConsole.on("error", (e) => console.log("JS ERROR:", e));
virtualConsole.on("warn", (e) => console.log("JS WARN:", e));
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", virtualConsole });
setTimeout(() => {
  console.log("APP HTML:", dom.window.document.getElementById('app').innerHTML.substring(0, 50));
  process.exit(0);
}, 3000);
