/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Love's "about-content-article" template cleanup.
 *
 * Source site: https://www.loves.com/about-us/tom-love-legacy (Next.js app;
 * CSS-module hashed class names). This runs IN ADDITION TO the site-wide
 * `loves-cleanup.js` transformer, handling two things that are specific to the
 * article content region (`#content`) and that the homepage cleanup does not:
 *
 *   1. Breadcrumb — `#content` opens with `ul.breadcrumb_breadcrumb__idc32`
 *      ("Home > About Us > Honoring Tom Love"). It is auto-populated navigation,
 *      not authorable content (page-structure.json → notes.excluded). Left in, it
 *      would import as a stray bulleted list at the top of the page. The homepage
 *      has no breadcrumb, so site-wide cleanup never needed to remove it.
 *
 *   2. Empty spacer sections — the article interleaves real content grids
 *      (`section.grid_grid__PqGa9` at nth-of-type 1,2,5,7,9) with EMPTY spacer
 *      grids (nth-of-type 3,4,6,8,10) that render as `<section> </section>` with
 *      no text and no image. They carry no content and would only produce empty
 *      nodes in the import, so we drop them.
 *
 * Runs in beforeTransform, after `loves-cleanup.js` has scoped the DOM to
 * `#content` and BEFORE the columns block parser inspects its section, so the
 * removed nodes never reach a parser or the serialized output. `element` is
 * document.body.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.beforeTransform) return;

  const scope = (element.querySelector && element.querySelector('#content')) || element;
  if (!scope) return;

  // 1. Remove the breadcrumb navigation list (hashed class, matched by prefix).
  scope.querySelectorAll('ul[class*="breadcrumb"]').forEach((el) => el.remove());

  // 2. Remove empty spacer grid sections: a grid section with no text content
  //    and no image/picture is a layout spacer, not authorable content.
  scope.querySelectorAll('section[class*="grid_grid"]').forEach((section) => {
    const hasText = section.textContent.replace(/\s+/g, '').length > 0;
    const hasMedia = !!section.querySelector('img, picture, video, iframe');
    if (!hasText && !hasMedia) section.remove();
  });
}
