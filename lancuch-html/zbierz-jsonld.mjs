const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs').catch(()=>import('playwright'));
import fs from 'node:fs';
const slugi = fs.readFileSync('/tmp/slugi.txt','utf8').trim().split('\n');
const W = parseInt(process.argv[2] || '1440', 10);
const H = parseInt(process.argv[3] || '900', 10);
const DPR = parseFloat(process.argv[4] || '1');
const OUT = process.argv[5] || '/tmp/zniwa/w1440';
fs.mkdirSync(OUT, {recursive:true});

const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
  proxy:{server:process.env.HTTPS_PROXY},
  args:['--no-sandbox','--ssl-version-max=tls1.2','--ignore-certificate-errors']});
const ctx = await b.newContext({viewport:{width:W,height:H}, deviceScaleFactor:DPR, ignoreHTTPSErrors:true});

for (const url of slugi) {
  const slug = url.split('/').pop();
  const p = await ctx.newPage();
  let stan = 'ok';
  try {
    await p.goto(url, {waitUntil:'domcontentloaded', timeout:60000});
    await p.waitForFunction(()=>document.getElementById('mp-jsonld'), {timeout:45000});
    await p.waitForTimeout(400);
  } catch (e) { stan = 'BRAK BLOKU'; }
  const r = await p.evaluate(()=>{
    const s = document.getElementById('mp-jsonld');
    return { tekst: s ? s.textContent : null, diag: window.mpJsonLd || null };
  });
  if (r.tekst) fs.writeFileSync(`${OUT}/${slug}.json`, r.tekst);
  console.log(`${stan==='ok'?'✓':'✗'} ${slug.padEnd(50)} ${r.tekst?String(r.tekst.length).padStart(6):'     -'} B  ${r.diag?`zrodlo=${r.diag.zrodlo} skl=${r.diag.skladnikow} krok=${r.diag.krokow}`:stan}`);
  await p.close();
}
await b.close();
