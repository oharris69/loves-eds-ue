/* eslint-disable */
/* global WebImporter */

/**
 * Parser for the `cards` block. Base: cards.
 * Source: https://www.loves.com/
 * Selector (page-templates.json instances[]):
 *   - main #content section.grid_grid__PqGa9   (matches BOTH the 3-column and the
 *     4-column feature-card grids; the parser runs once per matched grid)
 *
 * Project cards model (blocks/cards/_cards.json): a container whose children are
 * `card` items. Per blocks/cards/cards.js the row cells are read positionally:
 *   div0 = image, div1 = body (heading + description + CTA), div2 = card-style
 *   config, div3 = cta-style config.
 * The card model fields (image, text richtext, ctastyle) are emitted with field
 * hints; imageAlt collapses into the <img>. Each source card is an <a href> that
 * wraps the image, an <h3>, a description, and a "Learn More"-style label — the
 * anchor's href becomes the card CTA link.
 */
export default function parse(element, { document }) {
  // Each card is a <section class="card_card__XA4YI"> containing a single <a href>.
  const cards = [...element.querySelectorAll(':scope > section.card_card__XA4YI, :scope > .card_card__XA4YI')];

  const cells = [];

  cards.forEach((card) => {
    const anchor = card.querySelector('a[href]');
    const href = anchor ? anchor.getAttribute('href') : '';
    const scope = anchor || card;

    const img = scope.querySelector('img');
    const imageEl = img ? (img.closest('picture') || img) : null;
    const heading = scope.querySelector('h1, h2, h3, h4, h5, h6');

    // Description: paragraph text inside the card body. Falls back to the loose
    // text span some cards use instead of a <p>.
    const descPara = scope.querySelector('p');
    let descText = '';
    if (descPara) {
      descText = descPara.textContent.trim();
    } else {
      // Cards like "Love's Exclusive Brands" wrap the copy in nested <span>s rather
      // than a <p>. Pull the body text that isn't the heading or the CTA label.
      const bodyDiv = scope.querySelector('article > div, .card_card-content__iWMpV > div');
      if (bodyDiv) descText = bodyDiv.textContent.trim();
    }

    // CTA label: the trailing "Learn More" / "Join Our Team" / "Download today!"
    // text. On the source it is the last DIRECT-CHILD <span> of the card content
    // <article> (a sibling that follows the heading and the description). We must use
    // direct children only — some cards (e.g. "Love's Exclusive Brands") wrap their
    // description copy in nested <span>s, and a deep querySelectorAll('span') would
    // wrongly grab that description text as the CTA label. The importer also snapshots
    // the page at varying hydration states, so the span may be absent even though the
    // card's wrapping <a href> is always present; in that case fall back below.
    let ctaLabel = '';
    const contentEl = scope.querySelector('article, .card_card-content__iWMpV') || scope;
    const directSpanLabels = [...contentEl.children]
      .filter((c) => c.tagName === 'SPAN')
      .map((s) => s.textContent.trim())
      .filter((t) => t.length > 0);
    if (directSpanLabels.length) {
      ctaLabel = directSpanLabels[directSpanLabels.length - 1];
    }
    if (!ctaLabel) {
      // The importer sometimes snapshots the page before the CTA span text has
      // hydrated, so the label is missing even though the card's href/heading are
      // present. Two source cards use non-default CTA labels; map them by their
      // (unique, stable) heading text so the label survives regardless of hydration
      // state. Everything else uses the source default "Learn More".
      const headingText = heading ? heading.textContent.trim() : '';
      const CTA_BY_HEADING = {
        'Fuel Your Drive': 'Join Our Team',
        "Download the Love's Rewards App": 'Download today!',
      };
      if (href) ctaLabel = CTA_BY_HEADING[headingText] || 'Learn More';
    }

    // --- Column 1: image ---
    const imageFrag = document.createDocumentFragment();
    if (imageEl) {
      imageFrag.appendChild(document.createComment(' field:image '));
      imageFrag.appendChild(imageEl);
    }

    // --- Column 2: text (heading + description + CTA link) ---
    const textFrag = document.createDocumentFragment();
    textFrag.appendChild(document.createComment(' field:text '));
    if (heading) {
      const h = document.createElement(heading.tagName);
      h.textContent = heading.textContent.trim();
      textFrag.appendChild(h);
    }
    if (descText) {
      const p = document.createElement('p');
      p.textContent = descText;
      textFrag.appendChild(p);
    }
    if (href && ctaLabel) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.setAttribute('href', href);
      a.textContent = ctaLabel;
      p.appendChild(a);
      textFrag.appendChild(p);
    }

    // --- Column 3: cta-style config ---
    // The `card` model (blocks/cards/_cards.json) has exactly 3 fields —
    // image, text, ctastyle — so the row must be 3 cells. (An extra empty
    // "card-style" cell breaks md2jcr, which maps each cell to a model field.)
    const ctaStyleFrag = document.createDocumentFragment();
    ctaStyleFrag.appendChild(document.createComment(' field:ctastyle '));
    ctaStyleFrag.appendChild(document.createTextNode('button'));

    cells.push([imageFrag, textFrag, ctaStyleFrag]);
  });

  // Empty-block guard: no cards found → unwrap.
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards', cells });
  element.replaceWith(block);
}
