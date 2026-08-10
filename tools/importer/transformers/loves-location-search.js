/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: inject the "Find a Love's Near You" location-search block.
 *
 * The source homepage renders an interactive location quick-search widget inside
 * the app-promo hero (a Google Places autocomplete). The site-wide cleanup
 * transformer removes that raw widget (no content-model equivalent), so here we
 * re-introduce it as a dependency-free `location-search` block placed immediately
 * after the first (app-promo) hero — matching the source's placement and intent.
 *
 * Runs in afterTransform, AFTER the hero parser has produced the hero block table
 * (div.hero) and AFTER cleanup has removed the original widget.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.afterTransform) return;

  const doc = (payload && payload.document) || element.ownerDocument;
  const scope = element.querySelector('#content') || element;
  // (debug logging removed after verification)

  // At afterTransform time the block parsers have already replaced each section
  // with a block TABLE (the `div.hero` / `div.cards` classes only appear in the
  // final rendered markup). `#content`'s first element child is the app-promo
  // hero's block table — anchor to it. Bail if there is no table yet.
  const firstBlock = [...scope.children].find((c) => c.tagName === 'TABLE');
  if (!firstBlock) return;

  // Avoid duplicate injection: check for a table whose first cell says
  // "location-search".
  const existing = [...scope.querySelectorAll('table')].some((t) => {
    const first = t.querySelector('td, th');
    return first && /location-search/i.test(first.textContent);
  });
  if (existing) return;

  // Build the location-search block table:
  //   row 1: label, row 2: placeholder, row 3: target link
  const cells = [];
  const labelCell = doc.createElement('div');
  labelCell.textContent = "Find a Love's Near You";
  cells.push([labelCell]);

  const phCell = doc.createElement('div');
  phCell.textContent = 'Enter a Location';
  cells.push([phCell]);

  const targetCell = doc.createElement('div');
  const a = doc.createElement('a');
  a.setAttribute('href', '/location-and-fuel-price-search');
  a.textContent = 'Location & Fuel Price Search';
  targetCell.appendChild(a);
  cells.push([targetCell]);

  const block = WebImporter.Blocks.createBlock(doc, { name: 'location-search', cells });
  firstBlock.after(block);
}
