import { JSDOM } from 'jsdom';
import * as helixImporter from '@adobe/helix-importer';
import JSZip from 'jszip';
import { readFileSync, writeFileSync } from 'fs';

// Build an installable JCR content package for the About Us LANDING page
// (https://www.loves.com/about-us → /content/loves-eds-ue/language-masters/en/about-us,
// delivered at /en/about-us per paths.json).
//
// APPROACH — run the REAL importer pipeline end to end:
//   source DOM (migration-work/cleaned.html)
//     → helix-importer md2jcr() with OUR import module as the transform config
//        (this executes tools/importer/parsers/about-landing-*.js + transformers,
//         building block TABLES → gridtable markdown → real JCR block nodes)
//     → JCR XML with proper columns/cards block nodes (NOT flattened text)
//     → JSZip (scoped content package)
//
// This mirrors how the runner produces content, but captures the JCR form directly.
// We must expose the same `WebImporter` global the import module expects; the npm
// helix-importer package provides all the statics the bundle references
// (Blocks.createBlock, rules.*, DOMUtils.remove, FileUtils.sanitizePath).
globalThis.WebImporter = helixImporter;

const BASE = '/workspace/current';
const JCRB = `${BASE}/migration-work/loves-eds-ue/jcr-build`;
const SITE = '/content/loves-eds-ue/language-masters/en';
const PAGE = `${SITE}/about-us`;
const SOURCE_URL = 'https://www.loves.com/about-us';
const VERSION = '1.0';
const OUT = `${BASE}/migration-work/loves-eds-ue/loves-eds-ue-about-landing-${VERSION}.zip`;

// --- Component models/definition/filters (dedupe models by id, as homepage build). ---
let models = JSON.parse(readFileSync(`${BASE}/component-models.json`, 'utf-8'));
const definition = JSON.parse(readFileSync(`${BASE}/component-definition.json`, 'utf-8'));
const filters = JSON.parse(readFileSync(`${BASE}/component-filters.json`, 'utf-8'));
const seen = new Map();
models.forEach((m) => seen.set(m.id, m));
models = [...seen.values()];

// --- Our import module = the transform config (parsers + transformers wired in). ---
const importMod = (await import(`${JCRB}/../../..//tools/importer/import-about-landing.js`)).default;

// --- Source document from the scraped, cleaned HTML. ---
// The scraper localizes <img src> to hashed ./images/<hash> paths, but the DAM
// image transformer (loves-dam-images.js) matches the ORIGINAL Sitecore URLs by
// path substring. Restore the originals from metadata.json's image mapping
// (source URL → local path) so every card/intro image rewrites to its DAM path.
let sourceHtml = readFileSync(`${BASE}/migration-work/cleaned.html`, 'utf-8');
const metadata = JSON.parse(readFileSync(`${BASE}/migration-work/metadata.json`, 'utf-8'));
const imageMapping = (metadata.images && metadata.images.mapping) || {};
Object.entries(imageMapping).forEach(([sourceUrl, localPath]) => {
  // localPath looks like "./images/<hash>.<ext>"; match it wherever it appears
  // in a src attribute (with or without the leading "./").
  const bare = String(localPath).replace(/^\.\//, '');
  [localPath, bare, `/${bare}`].forEach((needle) => {
    if (!needle) return;
    sourceHtml = sourceHtml.split(`"${needle}"`).join(`"${sourceUrl}"`);
  });
});
const createDocumentFromString = (html) => new JSDOM(html).window.document;

// --- Run md2jcr with our transform + the component models. ---
const result = await helixImporter.md2jcr(
  SOURCE_URL,
  sourceHtml,
  importMod,
  {
    createDocumentFromString,
  },
  {
    originalURL: SOURCE_URL,
    // PageImporter passes params.components straight to md2jcr as its opts
    // ({ models, definition, filters }) — this is what resolves block model ids.
    components: { models, definition, filters },
  },
);

let xml = Array.isArray(result) ? result[0].jcr : result.jcr;
if (!xml) throw new Error('md2jcr produced no jcr output');

// Keep DAM references root-relative (strip any absolutized origin).
xml = xml.replace(/https?:\/\/[^"/]+(\/content\/dam\/)/g, '$1');
// Unwrap md2jcr's <p><hN>…</hN></p> (invalid) in escaped richtext attributes.
xml = xml.replace(/&lt;p&gt;(&lt;h[1-6]&gt;.*?&lt;\/h[1-6]&gt;)&lt;\/p&gt;/g, '$1');
writeFileSync(`${JCRB}/about-us.xml`, xml, 'utf-8');
if (result.md || (Array.isArray(result) && result[0].md)) {
  writeFileSync(`${JCRB}/about-us.md`, result.md || result[0].md, 'utf-8');
}

// --- Package the page node. ---
// IMPORTANT: the about-us landing page has a CHILD page (about-us/tom-love-legacy).
// A plain `<filter root=".../about-us"/>` means "replace the whole about-us subtree",
// which would DELETE the tom-love-legacy child (it is not in this package). Exclude
// that child subtree from the filter so installing this package creates/updates only
// the about-us page's own content and leaves tom-love-legacy (and any other child
// pages) untouched.
const zip = new JSZip();
zip.file(`jcr_root${PAGE}/.content.xml`, xml);
zip.file('META-INF/vault/filter.xml', `<?xml version="1.0" encoding="UTF-8"?>
<workspaceFilter version="1.0">
  <filter root="${PAGE}">
    <exclude pattern="${PAGE}/tom-love-legacy(/.*)?"/>
  </filter>
</workspaceFilter>
`);
zip.file('META-INF/vault/properties.xml', `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
  <comment>Love's About Us landing page content package</comment>
  <entry key="name">loves-eds-ue-about-landing</entry>
  <entry key="group">loves-eds-ue</entry>
  <entry key="version">${VERSION}</entry>
  <entry key="packageType">content</entry>
  <entry key="path">/etc/packages/loves-eds-ue/loves-eds-ue-about-landing-${VERSION}.zip</entry>
  <entry key="description">Migrated Love's About Us landing page (Family of Companies) for ${PAGE}. Images reference /content/dam/loves-eds-ue/en/about/company - ensure the dam-assets are uploaded to AEM Assets.</entry>
</properties>
`);

const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
writeFileSync(OUT, buf);
console.log('xml bytes:', xml.length);
console.log('package:', OUT.replace(`${BASE}/`, ''), '|', buf.length, 'bytes | page:', PAGE);
