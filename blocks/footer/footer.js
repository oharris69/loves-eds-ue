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
 * Fetch the footer fragment. The footer document lives alongside the page in
 * the content tree (published at `<lang>/footer`), so resolve it relative to the
 * current locale. A `meta[name="footer"]` override wins if present; otherwise
 * fall back to the language-root footer, then a top-level `/footer`.
 */
async function fetchFooter() {
  const footerMeta = document.querySelector('meta[name="footer"]');
  const seg = window.location.pathname.split('/').filter(Boolean);
  const langRoot = seg.length ? `/${seg[0]}` : '';
  const candidates = [
    footerMeta && footerMeta.content,
    langRoot && `${langRoot}/footer`,
    '/footer',
    '/content/footer',
  ].filter(Boolean);
  return fetchFirstFragment(candidates);
}

export default async function decorate(block) {
  block.textContent = '';
  const source = await fetchFooter();
  if (!source) return;

  const sections = [...source.children];
  // Section 0: legal link list. Section 1: copyright. Section 2: social icons.
  const legalSection = sections[0];
  const copyrightSection = sections[1];
  const socialSection = sections[2];

  const footer = document.createElement('div');
  footer.className = 'footer-inner';

  // --- Legal / utility links ---
  if (legalSection) {
    const legal = document.createElement('nav');
    legal.className = 'footer-legal';
    legal.setAttribute('aria-label', 'Footer');
    const ul = legalSection.querySelector('ul');
    if (ul) legal.appendChild(ul.cloneNode(true));
    footer.appendChild(legal);
  }

  // --- Copyright ---
  if (copyrightSection) {
    const copy = document.createElement('div');
    copy.className = 'footer-copyright';
    const p = copyrightSection.querySelector('p');
    copy.textContent = p ? p.textContent.trim() : copyrightSection.textContent.trim();
    footer.appendChild(copy);
  }

  // --- Social icons ---
  if (socialSection) {
    const social = document.createElement('div');
    social.className = 'footer-social';
    const ul = socialSection.querySelector('ul');
    if (ul) {
      const newUl = document.createElement('ul');
      [...ul.querySelectorAll('li')].forEach((li) => {
        const a = li.querySelector('a');
        const img = li.querySelector('img');
        if (!a) return;
        const nLi = document.createElement('li');
        const nA = document.createElement('a');
        nA.href = a.getAttribute('href');
        nA.setAttribute('target', '_blank');
        nA.setAttribute('rel', 'noopener');
        if (img) {
          const nImg = document.createElement('img');
          nImg.src = img.getAttribute('src');
          nImg.alt = img.getAttribute('alt') || '';
          nImg.loading = 'lazy';
          nA.setAttribute('aria-label', nImg.alt);
          nA.appendChild(nImg);
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
