/* eslint-disable */
/* global WebImporter */

/**
 * Parser for the `cards` block — DEDICATED to the "about-landing" template.
 * Base block: cards (the emitted block name stays "cards"; only this PARSER FILE is
 * template-specific so it can make DOM assumptions unique to
 * https://www.loves.com/about-us without disturbing the shared
 * tools/importer/parsers/cards.js used by the homepage, whose cards are
 * `section.card_card__XA4YI` anchors — a structure that does NOT exist here).
 *
 * Selector (page-templates.json → about-landing → blocks[].instances):
 *   - #content > section.grid_grid__PqGa9:nth-of-type(2)   (the 4-up grid)
 *
 * Project cards model (blocks/cards/_cards.json) = 3 fields per card row:
 *   image (reference) | text (richtext) | ctastyle (select, default "button").
 * We emit the SAME field-hinting convention as the existing cards.js:
 * <!-- field:image -->, <!-- field:text -->, <!-- field:ctastyle -->, 3 cells/row.
 *
 * Source DOM (migration-work/block-context/cards/source.html): the matched element
 * is the grid section; the 4 cards are its direct-child `section.container`
 * descendants. Each card:
 *   section.container
 *     section.Default > section > img.default_responsiveImg__JqaUH   ← company photo
 *     div > div
 *       h3 > a[href]                       ← linked company name
 *       p                                  ← description
 *       (LinkedIn link) an <a href="linkedin…"> that WRAPS an <img alt="Follow us
 *        on LinkedIn">. Its wrapper varies per card: inside a <table><td> for
 *        Gemini / Love's Alternative Energy / Speedco, but inside a <p> for Musket.
 *        We locate it structurally (the anchor that wraps an <img>), so the wrapper
 *        (table vs p) does not matter.
 *
 * Per-card output:
 *   • Column 1 (field:image): the company photo (<img>, or its closest <picture>).
 *   • Column 2 (field:text): the linked H3 (rebuilt as <h3><a href>…</a></h3> so the
 *     link is preserved), then the description <p> (cloned deep to keep it as rich
 *     text incl. curly apostrophes), then the LinkedIn link as
 *     <p><a href=…>Follow us on LinkedIn</a></p>. The LinkedIn anchor wraps an icon
 *     <img> whose binary is NOT in the DAM map and is not meaningful in richtext, so
 *     we use the img's alt ("Follow us on LinkedIn") as the visible link text and
 *     keep the anchor's href. Real anchors are preserved — never flattened to text.
 *   • Column 3 (field:ctastyle): the text node "button" (matches existing cards.js).
 *
 * Guards: cards with no image AND no heading AND no description AND no LinkedIn link
 * are skipped; if no cards are found at all, the element is unwrapped.
 */
export default function parse(element, { document }) {
  // Each family-of-companies card is a direct-child `section.container` of the grid.
  // Fall back to any descendant `section.container` in case wrapper nesting shifts.
  let cards = [...element.querySelectorAll(':scope > section.container')];
  if (cards.length === 0) cards = [...element.querySelectorAll('section.container')];

  const cells = [];

  cards.forEach((card) => {
    // --- Company photo: prefer the responsive-img class; fall back to the image
    //     inside section.Default. (Do NOT grab a bare `img` first — the LinkedIn
    //     icon is also an <img>, so we anchor on the known photo class/location.) ---
    const photo = card.querySelector('img.default_responsiveImg__JqaUH')
      || card.querySelector('section.Default img');
    const imageEl = photo ? (photo.closest('picture') || photo) : null;

    // --- Linked heading. Keep the <a href> on the heading. ---
    const headingSrc = card.querySelector('h1, h2, h3, h4, h5, h6');
    const headingAnchor = headingSrc ? headingSrc.querySelector('a[href]') : null;
    const headingText = headingSrc ? headingSrc.textContent.replace(/\s+/g, ' ').trim() : '';

    // --- LinkedIn link: the anchor that WRAPS an <img> icon (structural match, so it
    //     works whether the source nests it in a <table> or a <p>). This never
    //     matches the heading anchor (which has no img). ---
    const linkedinAnchor = [...card.querySelectorAll('a[href]')].find((a) => a.querySelector('img'));

    // --- Description: first <p> with real (non-whitespace) text. The Musket card's
    //     LinkedIn wrapper is also a <p> but holds only the icon anchor (no text),
    //     so this text filter naturally skips it. ---
    const descP = [...card.querySelectorAll('p')].find(
      (p) => p.textContent.replace(/[\s ]+/g, '').length > 0,
    );

    // --- Guard: an empty/placeholder card contributes nothing → skip it. ---
    if (!imageEl && !headingText && !descP && !linkedinAnchor) return;

    // --- Column 1: image ---
    const imageFrag = document.createDocumentFragment();
    if (imageEl) {
      imageFrag.appendChild(document.createComment(' field:image '));
      imageFrag.appendChild(imageEl);
    }

    // --- Column 2: text (linked heading + description + LinkedIn link) ---
    const textFrag = document.createDocumentFragment();
    textFrag.appendChild(document.createComment(' field:text '));
    if (headingText) {
      const h = document.createElement(headingSrc.tagName.toLowerCase());
      if (headingAnchor) {
        const a = document.createElement('a');
        a.setAttribute('href', headingAnchor.getAttribute('href'));
        a.textContent = headingText;
        h.appendChild(a);
      } else {
        h.textContent = headingText;
      }
      textFrag.appendChild(h);
    }
    if (descP) {
      textFrag.appendChild(descP.cloneNode(true));
    }
    if (linkedinAnchor) {
      const icon = linkedinAnchor.querySelector('img');
      const label = ((icon && icon.getAttribute('alt')) || '').trim() || 'Follow us on LinkedIn';
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.setAttribute('href', linkedinAnchor.getAttribute('href'));
      a.textContent = label;
      p.appendChild(a);
      textFrag.appendChild(p);
    }

    // --- Column 3: cta-style config (matches existing cards.js) ---
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
