const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const html = fs.readFileSync('okk/app/index.html', 'utf8');
const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("error", (err) => { console.log("JSDOM ERROR:", err); });
virtualConsole.on("jsdomError", (err) => { console.log("JSDOM jsdomError:", err); });
virtualConsole.sendTo(console);
const dom = new JSDOM(html, { runScripts: "dangerously", virtualConsole });
