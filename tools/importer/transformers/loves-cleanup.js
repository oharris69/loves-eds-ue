/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Love's site-wide cleanup.
 *
 * Source site: https://www.loves.com/ (Next.js app; CSS-module hashed class names).
 * Removes non-authorable site chrome, third-party widgets, and tracking so the
 * import contains only the authorable main-content region (`main #content`).
 *
 * Every selector below was validated against migration-work/cleaned.html
 * (line references are to that file). Nothing here touches the four in-scope
 * content sections (hero x2, cards x2) inside `#content`.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // --- Content-scoping pass (timing- and class-independent) ---
    // The Osano cookie banner is injected by a lit web component. During a bulk
    // import the page is snapshotted at `domcontentloaded` — after Osano's text
    // bindings render but BEFORE its `osano-cm-*` classes/ids apply — and at that
    // moment the banner is a CLASSLESS <div> living inside the Next.js app root
    // (`#__next`), NOT yet a direct <body> child. So neither class/id selectors nor a
    // body-child allowlist catch it, and the consent copy ("This website utilizes
    // technologies…", "Manage Preferences", "Opens in a new window", etc.) leaks in.
    //
    // The only authorable region is `main #content`. Rather than chase Osano's
    // shifting position/classes, scope the whole import to `#content`: keep `#content`,
    // its ancestor chain (so `main #content …` still resolves for the parsers), and
    // its descendants — and remove everything else (banner, header, footer, scripts,
    // injected link/img/iframe, route announcer). `element` is document.body here.
    const doc = element.ownerDocument || (element.tagName === 'BODY' ? element.ownerDocument : element);
    const scopeRoot = element.querySelector ? element.querySelector('#content') : null;
    if (scopeRoot) {
      const body = element.tagName === 'BODY' ? element : (doc && doc.body) || element;
      [...body.querySelectorAll('*')].forEach((el) => {
        if (el === scopeRoot) return; // the content root itself
        if (el.contains(scopeRoot)) return; // ancestor of #content — keep the chain
        if (scopeRoot.contains(el)) return; // descendant of #content — real content
        el.remove(); // anything else (banner, chrome, scripts, tracking) — drop
      });
    }

    // Run before block parsing so these are gone before the hero/cards parsers
    // inspect their sections.
    WebImporter.DOMUtils.remove(element, [
      // Osano cookie consent banner (cleaned.html line 2) — global chrome overlay.
      // Osano injects its lit-based banner asynchronously, so the visible consent
      // window, the "Storage Preferences" info-dialog, and the visually-hidden aria
      // helper spans are not always inside a single `.osano-cm-window` container at
      // transform time. Remove every Osano element by class/id prefix so none of the
      // consent copy ("This website utilizes technologies…", "Manage Preferences",
      // "Storage Preferences", "Opens in a new window", etc.) leaks into the import.
      '.osano-cm-window',
      '[class*="osano-cm"]',
      '[class*="osano-visually-hidden"]',
      '[id^="osano-"]',
      // Interactive "Find a Love's Near You" location quick-search widget nested
      // inside the app-promo hero (cleaned.html line 327): label + Google Places
      // react-select autocomplete + submit button. No content-model equivalent;
      // handled separately. Removed pre-parse so it does not pollute the hero block.
      'section.homeHero_location-quick-search__KUN8_',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Non-authorable content and leftover elements. The import output scope is the
    // whole document.body, so all site-shell chrome must be stripped here.
    WebImporter.DOMUtils.remove(element, [
      // Site header + navigation (cleaned.html lines 48-49: <header> > #header).
      // Handled by the dedicated navigation flow. Removing <header> also removes
      // the desktop nav, mobile flyout menu, utility links, and site search.
      'header',
      // Site footer (cleaned.html lines 511-512: <footer> > #footer). Handled by
      // the dedicated footer flow (legal links, copyright, social icons).
      'footer',
      // reCAPTCHA container (cleaned.html line 509).
      '#recaptcha-container',
      // Next.js route announcer, a11y live-region element (cleaned.html line 593).
      'next-route-announcer',
      // Kampyle Feedback button (cleaned.html line 599).
      '#kampyleButtonContainer',
      // Tracking / ad iframes: flashtalking universal pageview, TTD/adsrvr universal
      // pixels, and the empty bare iframe (cleaned.html lines 597, 607, 619, 621).
      // No in-scope content section uses an iframe, so removing all <iframe> is safe.
      'iframe',
      // Tracking-pixel <img> tags (page-structure.json trackingPixelsExcluded).
      // On the live page these load from their original hosts; removed by source host
      // so they are never imported as content images.
      'img[src*="arttrk.com"]',       // arttrk.com pixels (action=content, action=lead)
      'img[src*="r.turn.com"]',       // r.turn.com tracking beacon
      'img[src*="veritone-ce.com"]',  // p.veritone-ce.com tracking pixel
      'img[src*="flashtalking.com"]', // servedby.flashtalking.com tracking pixel
      // Scraper-injected capture timestamp (cleaned.html line 591).
      '.timestamp',
      // Body-injected <link> preload/prefetch tags (cleaned.html lines 30-45).
      'link',
    ]);
  }
}
