/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import columnsParser from './parsers/columns.js';

// TRANSFORMER IMPORTS
import lovesDamImagesTransformer from './transformers/loves-dam-images.js';
import lovesCleanupTransformer from './transformers/loves-cleanup.js';
import lovesAboutCleanupTransformer from './transformers/loves-about-cleanup.js';

// PAGE TEMPLATE CONFIGURATION — embedded from page-templates.json (template "about-content-article")
const PAGE_TEMPLATE = {
  name: 'about-content-article',
  description: "About Us content article page (Tom Love Legacy). Structure: breadcrumb navigation, an H1 page title, a lead/intro paragraph, then a series of full-width content sections each pairing an image with rich text (headings, paragraphs, and bulleted lists). No hero banner or feature-card grids like the homepage.",
  urls: [
    'https://www.loves.com/about-us/tom-love-legacy',
  ],
  blocks: [
    {
      name: 'columns',
      instances: [
        '#content > section.grid_grid__PqGa9:nth-of-type(2)',
      ],
    },
  ],
  // NOTE: Sections are intentionally NOT wired into a section transformer. The
  // whole article renders on a single continuous white background with no color
  // dividers (page-structure.json → notes.backgroundSummary), so it maps to a
  // single EDS section — no <hr> breaks and no section-metadata. This is why the
  // homepage's positional `loves-sections.js` transformer is NOT included here
  // (it also assumes a 1:1 section-to-#content-child layout that this page, with
  // its breadcrumb + empty spacer grids, does not have).
  sections: [
    {
      id: 'section-1-title-intro',
      name: 'Page Title + Intro',
      selector: ['#content > h1.heading_heading__8mSev'],
      style: null,
      blocks: [],
      defaultContent: [
        '#content > h1.heading_heading__8mSev',
        '#content > section.grid_grid__PqGa9:nth-of-type(1)',
      ],
    },
    {
      id: 'section-2-man-behind-brand',
      name: 'The Man Behind the Brand',
      selector: ['#content > section.grid_grid__PqGa9:nth-of-type(2)'],
      style: null,
      blocks: ['columns'],
      defaultContent: [],
    },
    {
      id: 'section-3-first-steps',
      name: "Love's First Steps + Core Values",
      selector: ['#content > section.grid_grid__PqGa9:nth-of-type(5)'],
      style: null,
      blocks: [],
      defaultContent: ['#content > section.grid_grid__PqGa9:nth-of-type(5)'],
    },
    {
      id: 'section-4-innovation-community',
      name: 'Innovation and Milestones + Community and Giving Back',
      selector: ['#content > section.grid_grid__PqGa9:nth-of-type(7)'],
      style: null,
      blocks: [],
      defaultContent: ['#content > section.grid_grid__PqGa9:nth-of-type(7)'],
    },
    {
      id: 'section-5-family-legacy',
      name: 'Family and Lasting Legacy',
      selector: ['#content > section.grid_grid__PqGa9:nth-of-type(9)'],
      style: null,
      blocks: [],
      defaultContent: ['#content > section.grid_grid__PqGa9:nth-of-type(9)'],
    },
  ],
};

// PARSER REGISTRY — map parser names to functions
const parsers = {
  columns: columnsParser,
};

// TRANSFORMER REGISTRY.
//   beforeTransform order: rewrite Sitecore image URLs → DAM paths, then site-wide
//   cleanup (scope to #content, strip chrome), then about-specific cleanup (remove
//   breadcrumb + empty spacer grids).
//   afterTransform: loves-cleanup strips header/footer/iframes/tracking.
// Deliberately EXCLUDES:
//   - loves-sections.js       (single continuous section — no breaks/metadata; its
//                              positional mapping does not fit this page layout)
//   - loves-location-search.js (homepage-only location widget)
const transformers = [
  lovesDamImagesTransformer,
  lovesCleanupTransformer,
  lovesAboutCleanupTransformer,
];

/**
 * Execute all page transformers for a specific hook.
 * @param {string} hookName - 'beforeTransform' or 'afterTransform'
 * @param {Element} element - The DOM element to transform (document.body)
 * @param {Object} payload - { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration.
 * @param {Document} document
 * @param {Object} template - PAGE_TEMPLATE
 * @returns {Array} block instances found on the page
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

// EXPORT DEFAULT CONFIGURATION
export default {
  transform: (payload) => {
    const {
      document, url, html, params,
    } = payload;

    // Transformers run against document.body so the cleanup transformer can scope
    // the whole page down to `#content` (removing header/footer/banner siblings).
    const main = document.body;

    // 1. beforeTransform (image URL rewrite + cleanup + about-specific cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page using embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block using registered parsers. Skip elements already
    //    replaced by a prior parser (detached from DOM).
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform (final cleanup: header/footer/iframes/tracking)
    executeTransformers('afterTransform', main, payload);

    // Output scope: serialize ONLY `#content`, never document.body. Osano's cookie
    // consent component (a live web component) re-injects its banner into
    // document.body AFTER the transforms run but before the importer serializes the
    // element's outerHTML — so returning body would re-introduce the consent copy no
    // matter how aggressively cleanup removes it.
    const output = document.querySelector('#content') || main;

    // 5. Built-in importer rules (scoped to the output region)
    const hr = document.createElement('hr');
    output.appendChild(hr);
    WebImporter.rules.createMetadata(output, document);
    WebImporter.rules.transformBackgroundImages(output, document);
    WebImporter.rules.adjustImageUrls(output, url, params.originalURL);

    // 5b. Re-relativize DAM references. adjustImageUrls() absolutizes every
    //     image against the source origin (e.g. https://www.loves.com/content/dam/…),
    //     but DAM paths must stay root-relative (/content/dam/…) for AEM/JCR.
    output.querySelectorAll('img[src*="/content/dam/"]').forEach((img) => {
      img.setAttribute('src', img.getAttribute('src').replace(/^https?:\/\/[^/]+/, ''));
    });

    // 6. Generate sanitized path from the localized pathname (no extension).
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: output,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
