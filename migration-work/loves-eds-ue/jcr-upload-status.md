# JCR Conversion & Upload — Status

## ✅ Content package built (ready to upload)
- **Package:** `migration-work/loves-eds-ue/loves-eds-ue-homepage-1.0.zip`
- **Target JCR path:** `/content/loves-eds-ue/language-masters/en` (the homepage node)
- **Structure:** `jcr_root/.../en/.content.xml` + `META-INF/vault/filter.xml` (scoped to that path) + `properties.xml`.
- **Contents (verified, XML well-formed):** cq:Page with page title/description; hero ×2
  (overlay + image-background-text-left/theme-dark), cards ×2 with 7 card items
  (image/text/ctastyle), location-search block, section-metadata (theme-dark).
- **Built with** the real `@adobe/helix-md2jcr` (source page → import transform → block-table
  markdown → md2jcr with component-models/definition/filters). The webpacked importer-bundle
  `md2jcr` is a stub and was NOT used.

### How to upload (manual, in your AEM)
1. AEM author → **Package Manager** (`/crx/packmgr`) → Upload Package → choose the ZIP.
2. **Install** it (installs the page at /content/loves-eds-ue/language-masters/en).
3. Publish/preview via the sidekick or admin.hlx.page so it appears at
   https://main--loves-eds-ue--oharris69.aem.page/

---


## Content is JCR-ready
- content/index.plain.html: validated field hints for all blocks
  (hero: image/text/enableunderline/herolayout/backgroundstyle/ctalabel/ctalink/ctastyle;
   cards: image/text/ctastyle; location-search; section-metadata; metadata).
- Block models present: blocks/hero/_hero.json, blocks/cards/_cards.json, blocks/location-search/_location-search.json.
- component-definition.json / component-models.json / component-filters.json built (npm run build:json clean);
  all include Hero, Cards, Card, Location Search.

## BLOCKED — no Adobe credentials in this environment (both conversion AND upload)
Verified endpoint probes (re-confirmed):
- AEM author (JCR install target, franklin.delivery) -> HTTP 401
- JCR-build service (spacecat import jobs) -> HTTP 401
- admin.hlx.page status (public) -> HTTP 200
- admin.da.live source -> HTTP 404 (not a DA project; xwalk uses the AEM author)
- No AEM/IMS/Adobe credential env vars present.

## Local JCR conversion is NOT viable here — verified empirically
I drove the bundled helix-importer `md2jcr` locally (Playwright + component-models.json)
against the correct block-table markdown produced by the import transform. It returned
MALFORMED JCR: the whole block-table markdown collapsed into a single flattened `text`
node instead of parsing into hero/cards/location-search block nodes. The bundle's
`md2jcr` is effectively a stub — the REAL xwalk JCR conversion runs server-side in the
spacecat import service (which ingests the component models and runs @adobe/helix-md2jcr),
and that service is the same 401-gated endpoint above. So there is no credential-free
local path to a valid JCR package; the malformed local output was discarded (not a deliverable).

## To complete conversion + upload
Enable Settings -> LLM Permissions -> "Allow LLM to use my Adobe credentials for
admin.hlx.page and Document Authoring uploads" (IMS/DA). Then the credentialed flow is:
`aem-import-helper import` (runs the remote spacecat job with --models/--filters/--definitions,
which produces the real JCR content package) -> `aem-import-helper aem upload --zip <pkg>
--target <author> --token <injected>` -> preview/publish via admin.hlx.page.
Do NOT paste a token into chat.

---

## v2.1 — post-install fixes (2026-08-11)
Live feedback after v2.0 install: images as links, empty nav/footer, black (not yellow) nav.

Root causes + fixes (all on main, commit 7d2f690):
1. DAM path: assets are under /content/dam/loves-eds-ue/en/{homepage,brand,social}.
   Content now references /en/... so image reference fields resolve (render as <img>).
2. Nav yellow: set --brand-nav-background-color:#ffeb00 (+ footer vars) in brand.css.
3. Nav/footer fetch: header.js/footer.js now try /en/nav and /en/footer.

Nav/footer PLACEMENT — decided: children of en (/content/.../en/nav & /en/footer).
Reason: paths.json maps en/ -> /en/, so en/nav delivers at /en/nav (reachable).
A SIBLING at language-masters/nav is NOT url-mapped (parent not in paths.json), so
it would only be reachable at the raw /content path — not viable without a
paths.json change. Sibling variant was built, found non-viable, and discarded.

Deliverable: loves-eds-ue-homepage-2.1.zip (filters scoped to homepage jcr:content
+ en/nav + en/footer — does NOT replace the whole en subtree). Assets unchanged
(already uploaded to /en). Install v2.1 + publish homepage, en/nav, en/footer.
