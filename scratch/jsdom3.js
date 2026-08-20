const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('okk/app/index.html', 'utf8');
const virtualConsole = new (require('jsdom')).VirtualConsole();
virtualConsole.on("error", (e) => console.log("JS ERROR:", e));
virtualConsole.on("jsdomError", (e) => console.log("JSDOM ERROR:", e));
virtualConsole.sendTo(console, { omitJSDOMErrors: true });

const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", virtualConsole });
setTimeout(() => {
  console.log("APP HTML:", dom.window.document.getElementById('app').innerHTML.substring(0, 50));
  process.exit(0);
}, 3000);
