/* eslint-disable */
/* global WebImporter */

/**
 * Parser for the `hero` block. Base: hero.
 * Source: https://www.loves.com/
 * Selectors (page-templates.json instances[]):
 *   - main #content section.homeHero_home-hero__s_HdG   (App-promo banner  → overlay / default)
 *   - main #content section.default_hero__45Dc5          (Freight Factoring → image-background-text-left / theme-dark)
 *
 * Project hero model (blocks/hero/_hero.json), 1-column simple block. Fields emitted
 * as field-hinted rows (imageAlt collapses into <img>):
 *   image, text, herolayout, backgroundstyle, ctalabel, ctalink, ctastyle
 *
 * The interactive location quick-search widget inside the app-promo hero is removed
 * by the loves-cleanup transformer (beforeTransform) — it is not seen here.
 */
export default function parse(element, { document }) {
  // --- Background image (bare <img> or wrapped <picture>) ---
  const img = element.querySelector('img');
  const imageEl = img ? (img.closest('picture') || img) : null;

  // --- Heading ---
  const heading = element.querySelector('h1, h2, h3, h4');

  // --- CTA: the section's anchor. In the app-promo hero the anchor wraps the
  //     heading + a "Learn More" <p>; in the Freight hero it is a dedicated
  //     <a>Learn More</a>. ---
  const ctaAnchor = element.querySelector('a[href]');
  const ctaLink = ctaAnchor ? (ctaAnchor.getAttribute('href') || '') : '';
  let ctaLabel = '';
  if (ctaAnchor) {
    const innerP = ctaAnchor.querySelector('p');
    ctaLabel = (innerP ? innerP.textContent : ctaAnchor.textContent).trim();
    // If the anchor also wraps the heading, strip the heading text from the label.
    if (heading && ctaAnchor.contains(heading)) {
      ctaLabel = ctaLabel.replace(heading.textContent.trim(), '').trim();
    }
  }

  // --- Body paragraphs: any <p> NOT inside the CTA anchor (excludes the
  //     "Learn More" label paragraph of the app-promo hero). ---
  const bodyParas = [...element.querySelectorAll('p')]
    .filter((p) => !(ctaAnchor && ctaAnchor.contains(p)) && p.textContent.trim());

  // --- Layout / theme: Freight Factoring banner is a dark, text-left background
  //     hero; the app-promo banner is the default overlay hero. ---
  const isTextLeft = /default_hero/.test(element.className)
    || !!element.querySelector('[class*="default_text"]')
    || bodyParas.length > 0;
  const herolayout = isTextLeft ? 'image-background-text-left' : 'overlay';
  const backgroundstyle = isTextLeft ? 'theme-dark' : 'default';

  // --- Empty-block guard ---
  if (!heading && !imageEl && bodyParas.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Row: image
  if (imageEl) {
    const f = document.createDocumentFragment();
    f.appendChild(document.createComment(' field:image '));
    f.appendChild(imageEl);
    cells.push([f]);
  }

  // Row: text (heading + body paragraphs as richtext)
  {
    const f = document.createDocumentFragment();
    f.appendChild(document.createComment(' field:text '));
    if (heading) {
      const h = document.createElement(heading.tagName);
      h.textContent = heading.textContent.trim();
      f.appendChild(h);
    }
    bodyParas.forEach((p) => {
      const np = document.createElement('p');
      np.textContent = p.textContent.trim();
      f.appendChild(np);
    });
    cells.push([f]);
  }

  // Row: enableunderline (boolean). Must be emitted so the block's positional
  // fallback (used when no data-aue-prop attributes exist, e.g. plain-html preview)
  // keeps every later field aligned with the model order defined in _hero.json:
  //   image, text, enableunderline, herolayout, backgroundstyle, ctalabel, ctalink, ctastyle.
  {
    const f = document.createDocumentFragment();
    f.appendChild(document.createComment(' field:enableunderline '));
    f.appendChild(document.createTextNode('true'));
    cells.push([f]);
  }

  // Row: herolayout (select value)
  {
    const f = document.createDocumentFragment();
    f.appendChild(document.createComment(' field:herolayout '));
    f.appendChild(document.createTextNode(herolayout));
    cells.push([f]);
  }

  // Row: backgroundstyle (select value)
  {
    const f = document.createDocumentFragment();
    f.appendChild(document.createComment(' field:backgroundstyle '));
    f.appendChild(document.createTextNode(backgroundstyle));
    cells.push([f]);
  }

  // Row: ctalabel + ctalink + ctastyle (only when a CTA exists)
  if (ctaLabel && ctaLink) {
    const labelFrag = document.createDocumentFragment();
    labelFrag.appendChild(document.createComment(' field:ctalabel '));
    labelFrag.appendChild(document.createTextNode(ctaLabel));
    cells.push([labelFrag]);

    const linkFrag = document.createDocumentFragment();
    linkFrag.appendChild(document.createComment(' field:ctalink '));
    const a = document.createElement('a');
    a.setAttribute('href', ctaLink);
    a.textContent = ctaLabel;
    linkFrag.appendChild(a);
    cells.push([linkFrag]);

    const styleFrag = document.createDocumentFragment();
    styleFrag.appendChild(document.createComment(' field:ctastyle '));
    styleFrag.appendChild(document.createTextNode('link'));
    cells.push([styleFrag]);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero', cells });
  element.replaceWith(block);
}
