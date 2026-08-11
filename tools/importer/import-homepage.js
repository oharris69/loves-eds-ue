/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroParser from './parsers/hero.js';
import cardsParser from './parsers/cards.js';

// TRANSFORMER IMPORTS
import lovesDamImagesTransformer from './transformers/loves-dam-images.js';
import lovesCleanupTransformer from './transformers/loves-cleanup.js';
import lovesLocationSearchTransformer from './transformers/loves-location-search.js';
import lovesSectionsTransformer from './transformers/loves-sections.js';

// PAGE TEMPLATE CONFIGURATION — embedded from page-templates.json (template "homepage")
const PAGE_TEMPLATE = {
  name: 'homepage',
  description: "Love's Travel Stops homepage. Main content is a branded hero/app-promo banner, a 3-column feature cards row, a full-width photographic hero banner (Freight Factoring), and a 4-column feature cards row. Header/navigation and footer are handled by dedicated navigation/footer flows.",
  urls: [
    'https://www.loves.com/',
  ],
  blocks: [
    {
      name: 'hero',
      instances: [
        'main #content section.homeHero_home-hero__s_HdG',
        'main #content section.component.Default section.default_hero__45Dc5',
      ],
    },
    {
      name: 'cards',
      instances: [
        'main #content section.grid_grid__PqGa9',
      ],
    },
  ],
  sections: [
    {
      id: 'hero-app-promo',
      name: 'Hero / App-Promo Banner',
      selector: 'main #content section.homeHero_home-hero__s_HdG',
      style: null,
      blocks: ['hero'],
      defaultContent: [],
    },
    {
      id: 'cards-3col',
      name: '3-Column Feature Cards',
      selector: 'main #content section.grid_grid__PqGa9:nth-of-type(2)',
      style: null,
      blocks: ['cards'],
      defaultContent: [],
    },
    {
      id: 'hero-freight-factoring',
      name: 'Freight Factoring Full-Width Banner',
      selector: 'main #content section.component.Default section.default_hero__45Dc5',
      style: 'theme-dark',
      blocks: ['hero'],
      defaultContent: [],
    },
    {
      id: 'cards-4col',
      name: '4-Column Feature Cards',
      selector: 'main #content section.grid_grid__PqGa9:nth-of-type(4)',
      style: null,
      blocks: ['cards'],
      defaultContent: [],
    },
  ],
};

// PARSER REGISTRY — map parser names to functions
const parsers = {
  hero: heroParser,
  cards: cardsParser,
};

// TRANSFORMER REGISTRY — cleanup runs first; the section transformer runs after
// cleanup (both act in their own hooks). Section transformer only makes sense
// when the template has 2+ sections.
const transformers = [
  // Runs first (beforeTransform): rewrite external Sitecore image URLs to DAM
  // paths so parsers emit DAM references (which render as <img>, not links).
  lovesDamImagesTransformer,
  lovesCleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [lovesSectionsTransformer] : []),
  // Runs last: injects the location-search block after the app-promo hero, once
  // the section transformer has already placed <hr> breaks / metadata by position.
  lovesLocationSearchTransformer,
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

    // 1. beforeTransform (initial cleanup)
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

    // 4. afterTransform (final cleanup + section breaks/metadata)
    executeTransformers('afterTransform', main, payload);

    // Output scope: serialize ONLY `#content`, never document.body. Osano's cookie
    // consent component (a live web component) re-injects its banner into
    // document.body AFTER the transforms run but before the importer serializes the
    // element's outerHTML — so returning body would re-introduce the consent copy no
    // matter how aggressively cleanup removes it. `#content` holds exactly the four
    // parsed blocks (+ section breaks/metadata) and never contains Osano/header/footer.
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

    // 6. Generate sanitized path. Map the root/homepage URL to `/index` (an empty
    //    path would make the bundled importer's path polyfill throw).
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
