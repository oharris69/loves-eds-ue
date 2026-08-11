/*
 * Block smoke test — dependency-free.
 *
 * Drives the locally-served, decorated homepage (aem up on :3000) with Playwright
 * and asserts the structural invariants the migration relies on:
 *   - hero  : 2 instances, background <img>, heading, CTA button, config hidden
 *   - cards : 3-up + 4-up grids, each card image + heading + CTA
 *   - header: logo, Customer Login, search, 9 nav items with dropdowns
 *   - footer: 7 legal links, copyright, 6 social icons
 *   - location-search: label + input + submit
 *
 * No test framework / new deps: run with `npm run test:blocks` (needs `aem up`
 * running on http://localhost:3000). Resolves Playwright from the scrape-webpage
 * skill's install; override with PLAYWRIGHT_DIR if needed.
 *
 * Exit 0 = all pass; exit 1 = one or more assertions failed (details printed).
 */
import { createRequire } from 'module';

const URL = process.env.TEST_URL || 'http://localhost:3000/content/index';
const PW_DIR = process.env.PLAYWRIGHT_DIR
  || '/home/node/.excat-marketplaces/excat-marketplace/edge-delivery-services/skills/scrape-webpage/scripts';

const require = createRequire(`${PW_DIR}/`);
// playwright is resolved at runtime from the skill install (not a project dep).
// eslint-disable-next-line import/no-dynamic-require, import/no-unresolved
const { chromium } = require('playwright');

const results = [];
const check = (name, cond, detail) => {
  results.push({ name, pass: !!cond, detail });
  // eslint-disable-next-line no-console
  console.log(`${cond ? '✓' : '✗'} ${name}${cond ? '' : ` — ${detail}`}`);
};

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(URL, { waitUntil: 'networkidle', timeout: 45000 });
// header/footer fetch their fragments async — give them a moment.
await page.waitForTimeout(1500);

const snap = await page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const qa = (s) => [...document.querySelectorAll(s)];
  const heroes = qa('.hero.block');
  const cards = qa('.cards.block');
  return {
    heroCount: heroes.length,
    heroWithImg: heroes.filter((h) => h.querySelector('img')).length,
    heroWithHeading: heroes.filter((h) => h.querySelector('h1,h2,h3')).length,
    heroCtaButtons: heroes.filter((h) => h.querySelector('.button-container a.button')).length,
    heroVisibleConfig: heroes.reduce((n, h) => n
      + [...h.querySelectorAll(':scope > div')].filter((d, i) => i > 1 && d.style.display !== 'none').length, 0),
    cardsGrids: cards.length,
    cardsCounts: cards.map((c) => c.querySelectorAll('li').length),
    cardImgs: cards.reduce((n, c) => n + c.querySelectorAll('li .cards-card-image img').length, 0),
    cardBodies: cards.reduce((n, c) => n + c.querySelectorAll('li .cards-card-body').length, 0),
    navItems: qa('header .nav-item').length,
    navLogo: !!q('header .nav-logo img'),
    navLogin: !!q('header .nav-login'),
    navSearch: !!q('header .nav-search input'),
    navDropdowns: qa('header .nav-item.has-dropdown .nav-dropdown').length,
    footerLegal: qa('footer .footer-legal a').length,
    footerCopyright: !!q('footer .footer-copyright'),
    footerSocial: qa('footer .footer-social a').length,
    locationSearch: !!(q('.location-search .location-search-label')
      && q('.location-search input') && q('.location-search .location-search-button')),
  };
});

check('hero: 2 instances', snap.heroCount === 2, `got ${snap.heroCount}`);
check('hero: both have background image', snap.heroWithImg === 2, `got ${snap.heroWithImg}`);
check('hero: both have heading', snap.heroWithHeading === 2, `got ${snap.heroWithHeading}`);
check('hero: both have CTA button', snap.heroCtaButtons === 2, `got ${snap.heroCtaButtons}`);
check('hero: no visible config rows', snap.heroVisibleConfig === 0, `got ${snap.heroVisibleConfig}`);
check('cards: 2 grids', snap.cardsGrids === 2, `got ${snap.cardsGrids}`);
check('cards: 3-up + 4-up', JSON.stringify(snap.cardsCounts) === JSON.stringify([3, 4]), `got ${JSON.stringify(snap.cardsCounts)}`);
check('cards: 7 card images', snap.cardImgs === 7, `got ${snap.cardImgs}`);
check('cards: 7 card bodies', snap.cardBodies === 7, `got ${snap.cardBodies}`);
check('header: 9 nav items', snap.navItems === 9, `got ${snap.navItems}`);
check('header: logo', snap.navLogo, 'missing');
check('header: Customer Login', snap.navLogin, 'missing');
check('header: search input', snap.navSearch, 'missing');
check('header: dropdowns present', snap.navDropdowns >= 8, `got ${snap.navDropdowns}`);
check('footer: 7 legal links', snap.footerLegal === 7, `got ${snap.footerLegal}`);
check('footer: copyright', snap.footerCopyright, 'missing');
check('footer: 6 social icons', snap.footerSocial === 6, `got ${snap.footerSocial}`);
check('location-search: label+input+button', snap.locationSearch, 'incomplete');

await browser.close();

const failed = results.filter((r) => !r.pass);
// eslint-disable-next-line no-console
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
