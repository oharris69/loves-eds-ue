import md2jcr from '@adobe/helix-md2jcr/src/md2jcr/index.js';
import JSZip from 'jszip';
import { readFileSync, writeFileSync } from 'fs';

const BASE = '/workspace/current';
const JCRB = `${BASE}/migration-work/loves-eds-ue/jcr-build`;
const SITE = '/content/loves-eds-ue/language-masters/en';

let models = JSON.parse(readFileSync(`${BASE}/component-models.json`, 'utf-8'));
const definition = JSON.parse(readFileSync(`${BASE}/component-definition.json`, 'utf-8'));
const filters = JSON.parse(readFileSync(`${BASE}/component-filters.json`, 'utf-8'));
const seen = new Map();
models.forEach((m) => seen.set(m.id, m));
models = [...seen.values()];
const opts = { models, definition, filters };

const xmlEscape = (s) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

// Nav/footer are default-content docs the header/footer JS fetches as .plain.html.
// Store the fragment HTML verbatim in a single text node so the delivered markup
// (real <img>, <ul>, <a>) is exactly what the JS expects — bypassing html2md,
// which would tokenize DAM SVGs into :icon: tokens and reshape the structure.
function fragmentPage(fragmentHtml) {
  const body = fragmentHtml.trim();
  return `<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:nt="http://www.jcp.org/jcr/nt/1.0" xmlns:cq="http://www.day.com/jcr/cq/1.0" xmlns:sling="http://sling.apache.org/jcr/sling/1.0" jcr:primaryType="cq:Page">
  <jcr:content cq:template="/libs/core/franklin/templates/page" sling:resourceType="core/franklin/components/page/v1/page" jcr:primaryType="cq:PageContent">
    <root jcr:primaryType="nt:unstructured" sling:resourceType="core/franklin/components/root/v1/root">
      <section sling:resourceType="core/franklin/components/section/v1/section" jcr:primaryType="nt:unstructured">
        <text sling:resourceType="core/franklin/components/text/v1/text" jcr:primaryType="nt:unstructured" text="${xmlEscape(body)}"/>
      </section>
    </root>
  </jcr:content>
</jcr:root>`;
}

// Homepage: real block conversion via md2jcr.
let homeXml = await md2jcr(readFileSync(`${JCRB}/index.md`, 'utf-8'), opts);
homeXml = homeXml.replace(/https?:\/\/[^"/]+(\/content\/dam\/)/g, '$1');
// md2jcr's wrapParagraphs wraps headings in a <p> inside richtext fields,
// producing invalid <p><hN>…</hN></p>. Unwrap so headings stand alone. The
// text lives XML-escaped in the attribute (&lt;p&gt;&lt;h2&gt;…), so match escaped.
homeXml = homeXml
  .replace(/&lt;p&gt;(&lt;h[1-6]&gt;.*?&lt;\/h[1-6]&gt;)&lt;\/p&gt;/g, '$1');

const pages = [
  { jcrPath: SITE, xml: homeXml, name: 'index' },
  { jcrPath: `${SITE}/nav`, xml: fragmentPage(readFileSync(`${BASE}/content/nav.plain.html`, 'utf-8')), name: 'nav' },
  { jcrPath: `${SITE}/footer`, xml: fragmentPage(readFileSync(`${BASE}/content/footer.plain.html`, 'utf-8')), name: 'footer' },
];

const zip = new JSZip();
const roots = [];
pages.forEach((p) => {
  zip.file(`jcr_root${p.jcrPath}/.content.xml`, p.xml);
  writeFileSync(`${JCRB}/${p.name}.xml`, p.xml, 'utf-8');
  roots.push(p.jcrPath);
});

// Scope filters precisely. The homepage IS the `en` node, so filtering `en`
// broadly would replace the whole locale subtree (wiping sibling pages). Use a
// filter on `en` that only updates its jcr:content + the nav/footer child pages,
// leaving other children of `en` untouched.
zip.file('META-INF/vault/filter.xml', `<?xml version="1.0" encoding="UTF-8"?>
<workspaceFilter version="1.0">
  <filter root="${SITE}">
    <include pattern="${SITE}/jcr:content"/>
    <include pattern="${SITE}/jcr:content/.*"/>
  </filter>
  <filter root="${SITE}/nav"/>
  <filter root="${SITE}/footer"/>
</workspaceFilter>
`);
zip.file('META-INF/vault/properties.xml', `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
  <comment>Love's homepage + nav + footer content package</comment>
  <entry key="name">loves-eds-ue-homepage</entry>
  <entry key="group">loves-eds-ue</entry>
  <entry key="version">2.1</entry>
  <entry key="packageType">content</entry>
  <entry key="path">/etc/packages/loves-eds-ue/loves-eds-ue-homepage-2.1.zip</entry>
  <entry key="description">Migrated Love's homepage, nav, footer for /content/loves-eds-ue/language-masters/en. Images reference /content/dam/loves-eds-ue - upload the dam-assets folder to AEM Assets.</entry>
</properties>
`);
const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
writeFileSync(`${BASE}/migration-work/loves-eds-ue/loves-eds-ue-homepage-2.1.zip`, buf);
console.log('package:', buf.length, 'bytes | pages:', roots.length);
