/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Love's section breaks + section metadata.
 *
 * Source site: https://www.loves.com/. Template `homepage` defines 4 in-scope
 * sections (page-templates.json), in document order:
 *   1. hero-app-promo             (style: none)
 *   2. cards-3col                 (style: none)
 *   3. hero-freight-factoring     (style: theme-dark)
 *   4. cards-4col                 (style: none)
 *
 * Runs in afterTransform only. Per the section-transformer contract it:
 *   - inserts an <hr> before every section except the first (section breaks), and
 *   - appends a Section Metadata block to every section that has a `style`.
 *
 * Anchoring strategy — positional, not by template selector:
 *   The template's card selectors use `:nth-of-type(1|2)`, which is unreliable
 *   here: `#content`'s <section> children are [homeHero, grid, component, grid],
 *   so `section.grid_grid__PqGa9:nth-of-type(1)` matches nothing (the 1st
 *   section-of-type is homeHero, which lacks the grid class). The freight section
 *   selector also targets the *nested* `section.default_hero__45Dc5`, not the
 *   direct `#content` child. On top of that, block parsers run between the two
 *   transform hooks and `replaceWith()` each section root with a block table, so
 *   the original selectors no longer resolve by the time this runs.
 *   Both the validator (raw DOM, no parsers) and the real import pipeline
 *   (post-parse tables) keep the SAME ordered set of top-level `#content`
 *   children — one node per section — so we map template `sections[i]` to the
 *   i-th element child of `#content`. This is stable across both contexts.
 *   (Reference to payload.template.sections below also flags this file as a
 *   section transformer so the validator runs section validation.)
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.afterTransform) {
    const doc = (payload && payload.document) || element.ownerDocument;
    const template = (payload && payload.template) || {};
    const sections = Array.isArray(template.sections) ? template.sections : [];

    // Only meaningful when the template defines 2+ sections.
    if (sections.length >= 2) {
      // Main authorable region. Falls back to `element` if `#content` is absent.
      const content = element.querySelector('#content') || element;

      // One top-level element child per section, in document order. Snapshot the
      // references up front so later inserts don't shift positional lookups.
      const anchors = Array.from(content.children);

      // Process sections in reverse so inserting <hr>/metadata never disturbs the
      // positions of not-yet-processed anchors.
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        const anchor = anchors[i];
        if (section && anchor) {
          // Section Metadata block for styled sections (only #3 `theme-dark` here).
          if (section.style) {
            const metadata = WebImporter.Blocks.createBlock(doc, {
              name: 'Section Metadata',
              cells: { style: section.style },
            });
            // Place at the end of this section's content (before the next break).
            anchor.after(metadata);
          }
          // Section break before every section except the first.
          if (i > 0) {
            const hr = doc.createElement('hr');
            anchor.before(hr);
          }
        }
      }
    }
  }
}
