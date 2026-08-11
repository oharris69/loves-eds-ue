/*
 * Love's Travel Stops — header / navigation.
 *
 * Self-contained: fetches the portable nav fragment (content/nav.plain.html),
 * reads its content (logo, Customer Login, and the primary nav tree with
 * dropdowns) from the DOM, and builds a two-band header:
 *   Band 1 (brand bar, yellow): logo left, Customer Login + site search right.
 *   Band 2 (nav band, dark translucent): the 9 primary nav items; each item
 *   with children opens a single-column dropdown on hover (desktop) / tap
 *   (mobile). On mobile the whole nav collapses behind a hamburger.
 *
 * All copy/links live in the fragment; the search form is built here (form
 * controls are not embedded in the portable fragment).
 */

const MOBILE = window.matchMedia('(max-width: 899px)');

/**
 * Try each candidate `.plain.html` path in order; resolve with the parsed DOM of
 * the first that responds OK, or null. Sequential (reduce over a promise chain)
 * to respect the project's no-await-in-loop / no-restricted-syntax rules.
 */
function fetchFirstFragment(paths) {
  return paths.reduce((chain, path) => chain.then((found) => {
    if (found) return found;
    return fetch(`${path}.plain.html`)
      .then((resp) => (resp.ok ? resp.text() : null))
      .then((html) => {
        if (!html) return null;
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp;
      })
      .catch(() => null);
  }), Promise.resolve(null));
}

/**
 * Fetch the nav fragment. The nav document lives at the site's language root:
 * for this site `.../language-masters/en` maps to `/` (so nav is `/nav`), while
 * other locales map to `/<lang>` (so nav is `/<lang>/nav`). Only treat the first
 * path segment as a locale when it's a 2-letter code; otherwise the page is under
 * the default (root) locale. A `meta[name="nav"]` override always wins.
 */
async function fetchNav() {
  const navMeta = document.querySelector('meta[name="nav"]');
  const seg = window.location.pathname.split('/').filter(Boolean);
  const langRoot = (seg[0] && /^[a-z]{2}$/.test(seg[0])) ? `/${seg[0]}` : '';
  // The nav doc is authored under the locale in the content tree (delivered at
  // `/en/nav`). The default English homepage is at `/` (no locale prefix), so we
  // must also try the default `/en/nav` there. Order: explicit meta, current
  // locale, default `en` locale, then bare/local fallbacks.
  const candidates = [
    navMeta && navMeta.content,
    langRoot && `${langRoot}/nav`,
    '/en/nav',
    '/nav',
    '/content/nav',
  ].filter(Boolean);
  return fetchFirstFragment(candidates);
}

/** Build the site-search form (not embedded in the portable fragment). */
function buildSearch() {
  const form = document.createElement('form');
  form.className = 'nav-search';
  form.setAttribute('role', 'search');
  form.action = 'https://www.loves.com/search';
  const input = document.createElement('input');
  input.type = 'search';
  input.name = 'q';
  input.placeholder = 'Search Loves.com';
  input.setAttribute('aria-label', 'Search Loves.com');
  const btn = document.createElement('button');
  btn.type = 'submit';
  btn.setAttribute('aria-label', 'Search');
  btn.innerHTML = '<span class="nav-search-icon" aria-hidden="true">⌕</span>';
  form.append(input, btn);
  return form;
}

export default async function decorate(block) {
  block.textContent = '';
  const source = await fetchNav();
  if (!source) return;

  // Locate content by WHAT it is, not by section index. Delivery may keep the
  // three authored sections separate (local) OR collapse them into one section
  // (AEM stores the fragment as one text node). Both cases work:
  //   - logo  = the first <img>/<picture> in the fragment
  //   - login = the "Customer Login" link (by text/href), excluding nav links
  //   - nav   = the primary <ul> (the one whose items have nested <ul> submenus,
  //             or otherwise the <ul> with the most top-level <li>s)
  const uls = [...source.querySelectorAll('ul')];
  const navUl = uls
    .filter((ul) => ul.querySelector(':scope > li'))
    .sort((a, b) => {
      const score = (ul) => ul.querySelectorAll(':scope > li > ul').length * 100
        + ul.querySelectorAll(':scope > li').length;
      return score(b) - score(a);
    })[0];
  const logoImg = source.querySelector('picture, img');
  const loginLink = [...source.querySelectorAll('a')]
    .find((a) => /customer login|login|sign in/i.test(a.textContent)
      || /fleetportal|login/i.test(a.getAttribute('href') || ''));

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main navigation');

  // --- Brand bar (band 1) ---
  const brandBar = document.createElement('div');
  brandBar.className = 'nav-brand-bar';

  // Hamburger (mobile)
  const hamburger = document.createElement('button');
  hamburger.className = 'nav-hamburger';
  hamburger.setAttribute('aria-label', 'Open navigation');
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.innerHTML = '<span class="nav-hamburger-icon"></span>';

  // Logo
  const logoWrap = document.createElement('a');
  logoWrap.className = 'nav-logo';
  logoWrap.href = '/';
  logoWrap.setAttribute('aria-label', "Love's Travel Stops home");
  if (logoImg) {
    // Keep the delivered <picture>/<img> (optimized rendition) as-is.
    logoWrap.appendChild(logoImg.cloneNode(true));
  } else {
    logoWrap.textContent = "Love's Travel Stops";
  }

  // Tools: Customer Login + search
  const tools = document.createElement('div');
  tools.className = 'nav-tools';
  if (loginLink) {
    const a = document.createElement('a');
    a.className = 'nav-login';
    a.href = loginLink.getAttribute('href');
    a.textContent = loginLink.textContent.trim();
    tools.appendChild(a);
  }
  tools.appendChild(buildSearch());

  brandBar.append(hamburger, logoWrap, tools);

  // --- Nav band (band 2) ---
  const navBand = document.createElement('div');
  navBand.className = 'nav-band';
  const navList = document.createElement('ul');
  navList.className = 'nav-list';

  const topUl = navUl;
  const topItems = topUl ? [...topUl.children].filter((c) => c.tagName === 'LI') : [];
  topItems.forEach((li) => {
    const topLink = li.querySelector(':scope > a');
    const subUl = li.querySelector(':scope > ul');
    const item = document.createElement('li');
    item.className = 'nav-item';

    const a = document.createElement('a');
    a.className = 'nav-item-link';
    a.href = topLink.getAttribute('href');
    a.textContent = topLink.textContent.trim();
    item.appendChild(a);

    if (subUl) {
      item.classList.add('has-dropdown');
      a.setAttribute('aria-haspopup', 'true');
      a.setAttribute('aria-expanded', 'false');
      // chevron
      const chev = document.createElement('span');
      chev.className = 'nav-chevron';
      chev.setAttribute('aria-hidden', 'true');
      item.appendChild(chev);

      const panel = document.createElement('ul');
      panel.className = 'nav-dropdown';
      [...subUl.children].filter((c) => c.tagName === 'LI').forEach((subLi) => {
        const subA = subLi.querySelector('a');
        if (!subA) return;
        const dLi = document.createElement('li');
        const dA = document.createElement('a');
        dA.href = subA.getAttribute('href');
        dA.textContent = subA.textContent.trim();
        dLi.appendChild(dA);
        panel.appendChild(dLi);
      });
      item.appendChild(panel);

      // Mobile: tap the chevron/row toggles the dropdown; desktop uses hover (CSS).
      const toggle = (e) => {
        if (!MOBILE.matches) return;
        e.preventDefault();
        const open = item.classList.toggle('open');
        a.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      chev.addEventListener('click', toggle);
      a.addEventListener('click', (e) => {
        if (MOBILE.matches) toggle(e);
      });
    }
    navList.appendChild(item);
  });
  navBand.appendChild(navList);

  nav.append(brandBar, navBand);

  // Hamburger toggle (mobile)
  hamburger.addEventListener('click', () => {
    const open = nav.classList.toggle('nav-open');
    hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
    hamburger.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    document.body.style.overflowY = open && MOBILE.matches ? 'hidden' : '';
  });

  // Reset state when crossing the desktop/mobile breakpoint.
  MOBILE.addEventListener('change', () => {
    nav.classList.remove('nav-open');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Open navigation');
    document.body.style.overflowY = '';
    nav.querySelectorAll('.nav-item.open').forEach((it) => {
      it.classList.remove('open');
      const link = it.querySelector('.nav-item-link');
      if (link) link.setAttribute('aria-expanded', 'false');
    });
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'nav-wrapper';
  wrapper.appendChild(nav);
  block.appendChild(wrapper);
}
