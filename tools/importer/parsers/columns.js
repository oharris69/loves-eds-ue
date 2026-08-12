/* eslint-disable */
/* global WebImporter */

/**
 * Parser for the `columns` block. Base: columns.
 * Source: https://www.loves.com/about-us/tom-love-legacy
 * Selector (page-templates.json instances[], about-content-article template):
 *   - #content > section.grid_grid__PqGa9:nth-of-type(2)
 *
 * Block library convention (migration-work/block-context/columns/library-description.txt):
 *   Row 1 = block name; the next row has one cell per column. This instance is a
 *   2-column, single-row layout: cell 1 = image, cell 2 = rich text
 *   (h4 heading "The Man Behind the Brand" + biographical paragraph).
 *
 * Columns is a CORE component (blocks/columns/_columns.json →
 * core/franklin/components/columns/v1/columns). Per the xwalk field-hinting
 * rules, Columns blocks do NOT carry <!-- field:* --> comments — the columns/rows
 * model values are derived from the rendered table dimensions, and each cell
 * holds default content directly.
 *
 * Source DOM (migration-work/block-context/columns/source.html):
 *   section.grid_grid__PqGa9
 *     section.Default → img.default_responsiveImg__JqaUH   (image column)
 *     div             → h4 + loose bio text node            (text column)
 *   The bio copy is a bare text node wedged between empty <p> tags and <br>s,
 *   so we prefer real non-empty <p> elements and fall back to the loose text.
 */
export default function parse(element, { document }) {
  // --- Image column: bare <img> or wrapped <picture>. ---
  const img = element.querySelector('img');
  const imageEl = img ? (img.closest('picture') || img) : null;

  // --- Text column: the direct-child block-level element that does NOT contain
  //     the image (the image lives in a sibling <section class="Default">). ---
  const textContainer = [...element.children]
    .find((c) => !imageEl || !c.contains(imageEl)) || element;

  // Heading — source uses <h4>; accept any level for cross-page resilience.
  const headingSrc = textContainer.querySelector('h1, h2, h3, h4, h5, h6');

  // Body copy: prefer non-empty <p> elements; otherwise recover the loose text
  // node used by this source (strip the heading, collapse whitespace).
  function extractParagraphs(container, headingEl) {
    const paras = [...container.querySelectorAll('p')]
      .map((p) => p.textContent.trim())
      .filter((t) => t.length > 0);
    if (paras.length) return paras;
    const clone = container.cloneNode(true);
    clone.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => h.remove());
    const text = clone.textContent.replace(/\s+/g, ' ').trim();
    return text ? [text] : [];
  }
  const bodyParas = extractParagraphs(textContainer, headingSrc);

  // --- Empty-block guard: nothing useful found → unwrap the element. ---
  if (!imageEl && !headingSrc && bodyParas.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // --- Build the text column (rich text: heading + paragraph[s]). ---
  const textCell = [];
  if (headingSrc) {
    const h = document.createElement(headingSrc.tagName.toLowerCase());
    h.textContent = headingSrc.textContent.trim();
    textCell.push(h);
  }
  bodyParas.forEach((t) => {
    const p = document.createElement('p');
    p.textContent = t;
    textCell.push(p);
  });

  // --- Assemble a 2-column, single-row Columns table (NO field hints). ---
  // Both columns must be present so md2jcr derives columns=2, rows=1; pad a
  // missing side with '' rather than dropping the cell (uneven rows are invalid).
  const imageCell = imageEl || '';
  const cells = [[imageCell, textCell.length ? textCell : '']];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns', cells });
  element.replaceWith(block);
}
