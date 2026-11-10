// UI smoke test of dist/index.html in Chromium at phone width. node tests/e2e.cjs
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const out = process.argv[2] || path.join(__dirname, '..', '.e2e');
fs.mkdirSync(out, { recursive: true });
const page0 = fs.readFileSync(path.join(__dirname, '..', 'dist', 'index.html'), 'utf8');
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>' + page0 + '</body></html>';
const file = path.join(out, 'page.html'); fs.writeFileSync(file, html);
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 380, height: 800 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push('console: ' + m.text()); });
  const url = 'file://' + file;
  let step = 0; const ok = (m) => console.log('  ✓ ' + m);
  const shot = async (n) => page.screenshot({ path: path.join(out, (++step).toString().padStart(2, '0') + '-' + n + '.png'), fullPage: false });
  const overflow = async (where) => { const w = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (w > 1) throw new Error('horizontal overflow ' + w + 'px on ' + where); };
  await page.goto(url);
  await page.waitForSelector('#ob-name');
  await shot('onboarding'); await overflow('onboarding');
  await page.fill('#ob-name', 'Jordan');
  for (let i = 0; i < 7; i++) { await page.click('#ob-next'); await page.waitForTimeout(60); await overflow('onboarding step ' + (i + 2)); if (i === 3) await shot('ob-spec'); if (i === 4) await shot('ob-schedule'); }
  await page.click('#ob-next');
  await page.waitForSelector('#start-quest'); ok('onboarding completes');
  await page.click('#ready-fresh'); await page.waitForTimeout(50);
  await shot('home'); await overflow('home');
  await page.screenshot({ path: path.join(out, 'home-full.png'), fullPage: true });
  // start a recommended activity and log it, whatever it is
  await page.click('#start-quest'); await page.waitForTimeout(100);
  if (await page.$('#tap-make')) { for (let i = 0; i < 7; i++) await page.click('#tap-make'); for (let i = 0; i < 3; i++) await page.click('#tap-miss'); await shot('quest-run'); await page.click('#log-quest'); }
  else if (await page.$('#log-report')) { await page.click('.sheet .chip:has-text("Worked")'); await shot('report'); await page.click('#log-report'); }
  else if (await page.$('#log-gym')) { await shot('gym'); await page.click('#log-gym'); }
  else { const b = await page.$('#log-quest'); if (b) await b.click(); }
  await page.waitForSelector('#reward-ok'); await shot('reward'); await page.click('#reward-ok'); ok('recommended activity logged');
  // log a specific quest from the library
  await page.click('nav button:has-text("Train")'); await page.waitForTimeout(50); await overflow('train');
  await shot('train');
  await page.click('.item:has-text("Five-Spot Layup Ladder")'); await page.click('.sheet .start');
  await page.fill('#in-makes', '17'); await page.dispatchEvent('#in-makes', 'change'); await page.fill('#in-att', '20'); await page.dispatchEvent('#in-att', 'change');
  await page.click('#log-quest'); await page.waitForSelector('#reward-ok');
  const unlockedTxt = await page.textContent('.sheet'); if (!/Newly unlocked/.test(unlockedTxt)) throw new Error('baseline did not unlock nodes'); ok('baseline unlocks nodes');
  await page.click('#reward-ok');
  // weight room
  await page.click('.seg button:has-text("Weight room")'); await overflow('weight room'); await shot('weightroom');
  await page.click('.item:has-text("Foundation A")'); await page.click('.sheet .start'); await page.waitForSelector('#log-gym');
  await page.click('.sheet .chip:has-text("Solid")'); await shot('gym-run'); await page.click('#log-gym'); await page.waitForSelector('#reward-ok'); await page.click('#reward-ok'); ok('workout logged');
  await page.waitForSelector('#explosive-list'); await page.locator('#explosive-list').scrollIntoViewIfNeeded(); await shot('explosive-list');
  await page.click('#explosive-list .item:has-text("Jump-Landing Mechanics")'); await page.waitForSelector('.sheet .start'); await shot('explosive-detail'); await page.click('.sheet .start');
  await page.fill('#in-makes', '14'); await page.dispatchEvent('#in-makes', 'change'); await page.fill('#in-att', '15'); await page.dispatchEvent('#in-att', 'change');
  await page.click('#log-quest'); await page.waitForSelector('#reward-ok');
  if (!/Jumping and landing mechanics/.test(await page.textContent('.sheet'))) throw new Error('landing baseline did not unlock str.c1'); await page.click('#reward-ok'); ok('explosiveness drill logged and unlocks jump-and-land');
  await page.click('#btn-custom'); await page.click('#log-custom'); await page.waitForSelector('#reward-ok'); await page.click('#reward-ok'); ok('coach workout logged');
  // game report
  await page.click('.seg button:has-text("Game application")'); await page.click('#btn-report'); await page.click('.sheet .chip:has-text("Mixed")'); await page.click('#log-report'); await page.waitForSelector('#reward-ok'); await page.click('#reward-ok'); ok('game report logged');
  // progress tabs
  await page.click('nav button:has-text("Progress")'); await page.waitForSelector('#treewrap'); await overflow('trees'); await shot('tree');
  await page.click('.chips.scroll .chip:has-text("Finishing")'); await page.waitForTimeout(40); await shot('tree-fin');
  await page.click('.tnode[data-node="fin.b1"]'); await page.waitForSelector('.sheet'); await shot('node'); await page.click('.sheet .iconbtn'); ok('node panel opens');
  await page.click('.tnode[data-node="fin.e1"]'); await page.waitForSelector('.sheet'); if (!/Contact finishing/.test(await page.textContent('.sheet'))) throw new Error('contact node sheet'); await shot('contact-node'); await page.click('.sheet .iconbtn'); ok('contact branch node opens');
  await page.locator('#treewrap').screenshot({ path: path.join(out, 'tree-fin-full.png') });
  await page.click('.tnode[data-node="fin.c2"]'); await page.waitForSelector('.sheet'); await page.click('.sheet .iconbtn');
  await page.click('[aria-label="Zoom in"]'); await page.click('[aria-label="Zoom out"]');
  for (const segName of ['Assessment', 'Records', 'Awards', 'History']) { await page.click('.seg button:has-text("' + segName + '")'); await page.waitForTimeout(40); await overflow(segName); await shot(segName.toLowerCase()); }
  for (const t of ['sht', 'bh', 'sep', 'iq', 'def', 'cond', 'str']) { await page.click('.seg button:has-text("Skill trees")'); await page.click('.chips.scroll .chip:has-text("' + ({ sht: 'Shooting', bh: 'Ball handling', sep: 'Creating separation', iq: 'Playmaking', def: 'Defense', cond: 'Conditioning', str: 'Strength' })[t] + '")'); await overflow('tree ' + t); }
  ok('all progress views render');
  // schedule
  await page.click('nav button:has-text("Schedule")'); await overflow('schedule'); await shot('schedule');
  await page.click('#add-event'); await page.fill('#ev-title', 'Tournament'); await page.click('.sheet .chip:has-text("One time")'); await page.click('#ev-save'); await page.waitForTimeout(50);
  const sch = await page.textContent('#app'); if (!/Tournament/.test(sch)) throw new Error('event not added'); ok('event added');
  await page.click('.evrow:has-text("Tournament")'); await page.click('.sheet .btn.danger'); ok('event deleted');
  // profile
  await page.click('nav button:has-text("Profile")'); await overflow('profile'); await shot('profile');
  await page.click('#edit-spec'); await page.click('.sheet .tile:has-text("Finishing")'); await page.click('.sheet .iconbtn'); ok('specialization edited');
  await page.click('#btn-export'); const exp = await page.inputValue('#export-text'); if (!exp.includes('project-maxey-ascension')) throw new Error('export missing'); await page.click('.sheet .iconbtn'); ok('export works');
  await page.click('#btn-import'); await page.fill('#import-text', exp); await page.click('#import-check'); await page.waitForSelector('#import-go'); await page.click('#import-go'); ok('import works');
  // persistence across reload
  const before = await page.evaluate(() => MX.Store.state.logs.length);
  await page.reload(); await page.waitForSelector('#start-quest');
  const after = await page.evaluate(() => MX.Store.state.logs.length);
  if (before !== after || before < 5) throw new Error('persistence: ' + before + ' vs ' + after); ok('reload restores ' + after + ' logs and skips onboarding');
  // legacy (pre-update) save through the real Import screen
  const legacy = fs.readFileSync(path.join(__dirname, 'fixtures', 'v1-save.json'), 'utf8');
  await page.click('nav button:has-text("Profile")'); await page.click('#btn-import'); await page.fill('#import-text', legacy); await page.click('#import-check'); await page.waitForSelector('#import-go'); await page.click('#import-go');
  await page.reload(); await page.waitForSelector('#start-quest');
  const lv = await page.evaluate(() => MX.progress(MX.Store.state, '2026-09-20').level.level); if (lv < 12) throw new Error('legacy level ' + lv);
  await page.click('nav button:has-text("Progress")'); await page.click('.seg button:has-text("Skill trees")'); await page.click('.chips.scroll .chip:has-text("Finishing")'); await overflow('legacy finishing tree');
  await page.locator('#treewrap').screenshot({ path: path.join(out, 'tree-legacy.png') }); ok('legacy save imports, survives reload, level ' + lv);
  // desktop width
  await page.setViewportSize({ width: 1100, height: 900 }); await page.waitForTimeout(50); await overflow('desktop'); await shot('desktop');
  await page.setViewportSize({ width: 320, height: 640 }); for (const t of ['Home', 'Train', 'Progress', 'Schedule', 'Profile']) { await page.click('nav button:has-text("' + t + '")'); await overflow('320px ' + t); }
  ok('no overflow at 320px');
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : '  ✓ no console errors');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
