/*
 * Love's Travel Stops — footer.
 *
 * Self-contained: fetches the portable footer fragment (content/footer.plain.html)
 * and renders a black footer bar with three parts: a legal/utility link row, a
 * centered copyright line, and a row of social icons. All copy/links/images come
 * from the fragment; nothing is hardcoded here.
 */

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
 * Fetch the footer fragment. The footer document lives at the site's language
 * root: for this site `.../language-masters/en` maps to `/` (so footer is
 * `/footer`), while other locales map to `/<lang>` (so footer is
 * `/<lang>/footer`). Only treat the first path segment as a locale when it's a
 * 2-letter code; otherwise the page is under the default (root) locale. A
 * `meta[name="footer"]` override always wins.
 */
async function fetchFooter() {
  const footerMeta = document.querySelector('meta[name="footer"]');
  const seg = window.location.pathname.split('/').filter(Boolean);
  const langRoot = (seg[0] && /^[a-z]{2}$/.test(seg[0])) ? `/${seg[0]}` : '';
  // The footer doc is authored under the locale (delivered at `/en/footer`). The
  // default English homepage is at `/`, so also try `/en/footer` there. Order:
  // explicit meta, current locale, default `en` locale, then bare/local fallbacks.
  const candidates = [
    footerMeta && footerMeta.content,
    langRoot && `${langRoot}/footer`,
    '/en/footer',
    '/footer',
    '/content/footer',
  ].filter(Boolean);
  return fetchFirstFragment(candidates);
}

export default async function decorate(block) {
  block.textContent = '';
  const source = await fetchFooter();
  if (!source) return;

  // Locate content by WHAT it is, not by section index. Delivery may keep the
  // three authored sections separate (local) OR collapse them into one section
  // (AEM stores the fragment as one text node). Both cases work:
  //   - legal links  = the first <ul> whose links are NOT social (no images)
  //   - social icons = the <ul> whose <li> contain images/icons
  //   - copyright    = the <p> containing "Copyright"
  const uls = [...source.querySelectorAll('ul')];
  const socialUl = uls.find((ul) => ul.querySelector('img, picture, span[class*="icon"]'));
  const legalUl = uls.find((ul) => ul !== socialUl);
  const copyrightP = [...source.querySelectorAll('p')]
    .find((p) => /copyright|all rights reserved/i.test(p.textContent));

  const footer = document.createElement('div');
  footer.className = 'footer-inner';

  // --- Legal / utility links ---
  if (legalUl) {
    const legal = document.createElement('nav');
    legal.className = 'footer-legal';
    legal.setAttribute('aria-label', 'Footer');
    legal.appendChild(legalUl.cloneNode(true));
    footer.appendChild(legal);
  }

  // --- Copyright ---
  if (copyrightP) {
    const copy = document.createElement('div');
    copy.className = 'footer-copyright';
    copy.textContent = copyrightP.textContent.trim();
    footer.appendChild(copy);
  }

  // --- Social icons ---
  if (socialUl) {
    const social = document.createElement('div');
    social.className = 'footer-social';
    const ul = socialUl;
    if (ul) {
      const newUl = document.createElement('ul');
      [...ul.querySelectorAll('li')].forEach((li) => {
        const a = li.querySelector('a');
        if (!a) return;
        // On delivery the icon may be an <img>, an optimized <picture>, or an
        // icon <span> — keep whichever is present.
        const media = li.querySelector('picture, img, span[class*="icon"]');
        const nLi = document.createElement('li');
        const nA = document.createElement('a');
        nA.href = a.getAttribute('href');
        nA.setAttribute('target', '_blank');
        nA.setAttribute('rel', 'noopener');
        const altText = (li.querySelector('img') && li.querySelector('img').getAttribute('alt'))
          || a.textContent.trim();
        nA.setAttribute('aria-label', altText);
        if (media) {
          nA.appendChild(media.cloneNode(true));
        } else {
          nA.textContent = altText;
        }
        nLi.appendChild(nA);
        newUl.appendChild(nLi);
      });
      social.appendChild(newUl);
    }
    footer.appendChild(social);
  }

  block.appendChild(footer);
}
