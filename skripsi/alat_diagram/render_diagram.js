// Render SVG -> PNG (skala 4x) dengan Chrome dan periksa teks yang keluar dari kotaknya.
// Pemakaian: node render.js <dir_svg> <dir_png> nama1 nama2 ...
const path = require('path');
const { chromium } = require(process.env.PW_CORE);

(async () => {
  const [svgDir, pngDir, ...names] = process.argv.slice(2);
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  const page = await browser.newPage({ deviceScaleFactor: 4 });
  for (const n of names) {
    const file = 'file:///' + path.resolve(svgDir, n + '.svg').replace(/\\/g, '/');
    await page.goto(file);
    const svg = await page.$('svg');
    const problems = await page.evaluate(() => {
      const rects = [...document.querySelectorAll('rect')]
        .map((r) => r.getBBox())
        .filter((b) => b.width < document.querySelector('svg').viewBox.baseVal.width - 1);
      const out = [];
      for (const t of document.querySelectorAll('text')) {
        const b = t.getBBox();
        const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
        const owners = rects.filter((r) => cx > r.x && cx < r.x + r.width && cy > r.y && cy < r.y + r.height)
          .sort((a, c) => a.width * a.height - c.width * c.height);
        const o = owners[0];
        if (!o) { out.push('NO-BOX: ' + t.textContent); continue; }
        if (b.x < o.x + 4 || b.x + b.width > o.x + o.width - 4)
          out.push(`OVERFLOW-X (${b.width.toFixed(0)}>${(o.width - 8).toFixed(0)}): ${t.textContent}`);
        if (b.y < o.y + 1 || b.y + b.height > o.y + o.height - 1)
          out.push(`OVERFLOW-Y: ${t.textContent}`);
      }
      return out;
    });
    await svg.screenshot({ path: path.resolve(pngDir, n + '.png'), omitBackground: false });
    console.log(n, problems.length ? '\n  ' + problems.join('\n  ') : 'OK');
  }
  await browser.close();
})();
