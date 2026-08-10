/*
 * Love's Travel Stops — footer.
 *
 * Self-contained: fetches the portable footer fragment (content/footer.plain.html)
 * and renders a black footer bar with three parts: a legal/utility link row, a
 * centered copyright line, and a row of social icons. All copy/links/images come
 * from the fragment; nothing is hardcoded here.
 */

/** Fetch the footer fragment: localhost/aem-up first, then DA/EDS production. */
async function fetchFooter() {
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) {
    const footerMeta = document.querySelector('meta[name="footer"]');
    const footerPath = footerMeta ? footerMeta.content : '/footer';
    resp = await fetch(`${footerPath}.plain.html`);
  }
  if (!resp.ok) return null;
  const html = await resp.text();
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp;
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
