/* eslint-disable */
/* global WebImporter */

/**
 * Parser for the intro section of the "about-landing" template.
 * Registered under the block name "dynamic-media-video" in the import script's
 * parser registry (it OWNS the intro grid section and emits default content +
 * a Dynamic Media Video block for it).
 * Selector (page-templates.json → about-landing → blocks[].instances):
 *   - #content > section.grid_grid__PqGa9:nth-of-type(1)
 *
 * LAYOUT DECISION (updated): the intro is no longer a two-column block. The
 * company-overview text + social links render as DEFAULT CONTENT, and the brand
 * video renders as its OWN full-width `Dynamic Media Video` block placed directly
 * BELOW the intro text. So this parser replaces the source grid section with:
 *   1. the overview paragraph (rich text, inline anchors preserved)
 *   2. a paragraph of the five social-media links
 *   3. a full-width `Dynamic Media Video` block pointing at an AEM Assets video
 *
 * WHY the DM video is a real block (not the columns YouTube auto-embed): the
 * project's columns.js only auto-embeds YouTube/.mp4 links — it does NOT recognise
 * Dynamic Media OpenAPI URLs. The `dynamic-media-video` block (blocks/dynamic-media-video)
 * is decorated by its own block JS, which reads an <a href> to a DM delivery URL
 * (/adobe/assets/urn:aaid:aem:<uuid>/play) and builds the DM VideoViewer.
 *
 * PLACEHOLDER ASSET: the source page used a YouTube embed; there is no DM asset
 * URL to migrate. Per the migration decision we emit a clearly-marked PLACEHOLDER
 * DM delivery URL so the block/structure lands now; swap DM_VIDEO_URL for the real
 * AEM Assets video (or set it in the Universal Editor) before publishing.
 *
 * DM VIDEO BLOCK FIELD NOTE: the dynamic-media-video model fields are
 * [video, enableSmartCrop, videoTitle, autoplay, loop, muted]. md2jcr collapses a
 * `videoTitle` field into the `video` field (video+Title suffix convention), which
 * shifts every following field by one. We therefore OMIT the videoTitle cell — the
 * accessible title is optional and set in the editor — and emit
 * video + the four boolean fields, each with a `<!-- field:NAME -->` hint so md2jcr
 * binds them positionally-independent. "Match the current embed" playback =
 * standard controls, so autoplay/loop/muted are all false.
 */

// Clearly-marked placeholder — REPLACE with the real AEM Assets DM video delivery URL.
const DM_VIDEO_URL = 'https://delivery-p153659-e1620914.adobeaemcloud.com/adobe/assets/urn:aaid:aem:00000000-0000-0000-0000-000000000000/play';

export default function parse(element, { document }) {
  // Text lives in the first direct-child <div> (the RIGHT/video section has no <p>
  // and no img-wrapped <a>, so element-scoped queries still isolate left content).
  const leftContainer = element.querySelector(':scope > div') || element;

  // --- Overview paragraph: first <p> with real (non-whitespace, non-&nbsp;) text.
  //     Cloned deep to keep its inline anchors as rich text. ---
  const overviewP = [...leftContainer.querySelectorAll('p')].find(
    (p) => p.textContent.replace(/[\s ]+/g, '').length > 0,
  );

  // --- Social links: only anchors that WRAP an <img> icon (the 5 table links).
  //     Rebuilt as text anchors using each icon's alt as label. ---
  const socialAnchors = [...leftContainer.querySelectorAll('a[href]')].filter(
    (a) => a.querySelector('img'),
  );

  // --- Build the default-content nodes (overview paragraph + social links). ---
  const contentNodes = [];
  if (overviewP) contentNodes.push(overviewP.cloneNode(true));
  if (socialAnchors.length) {
    const p = document.createElement('p');
    socialAnchors.forEach((a, i) => {
      const na = document.createElement('a');
      na.setAttribute('href', a.getAttribute('href'));
      const icon = a.querySelector('img');
      const label = ((icon && icon.getAttribute('alt')) || '').trim() || na.getAttribute('href');
      na.textContent = label;
      if (i > 0) p.appendChild(document.createTextNode(' '));
      p.appendChild(na);
    });
    contentNodes.push(p);
  }

  // --- Build the full-width Dynamic Media Video block. ---
  // Field hint + value per cell; omit videoTitle (see header note). Booleans are
  // "false" to match the current embed (standard controls, no autoplay/loop/mute).
  const fieldCell = (name, buildValue) => {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(` field:${name} `));
    buildValue(frag);
    return frag;
  };
  const textFieldCell = (name, value) => fieldCell(name, (frag) => {
    const p = document.createElement('p');
    p.textContent = value;
    frag.appendChild(p);
  });
  const videoCell = fieldCell('video', (frag) => {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.setAttribute('href', DM_VIDEO_URL);
    a.textContent = DM_VIDEO_URL;
    p.appendChild(a);
    frag.appendChild(p);
  });
  const videoBlockCells = [
    [videoCell],
    [textFieldCell('enableSmartCrop', 'false')],
    [textFieldCell('autoplay', 'false')],
    [textFieldCell('loop', 'false')],
    [textFieldCell('muted', 'false')],
  ];
  const videoBlock = WebImporter.Blocks.createBlock(document, {
    name: 'Dynamic Media Video',
    cells: videoBlockCells,
  });

  // --- Empty-block guard: nothing to emit → unwrap. ---
  if (contentNodes.length === 0 && !videoBlock) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // --- Replace the source grid with: default content, then the video block. ---
  const replacements = [...contentNodes, videoBlock];
  element.replaceWith(...replacements);
}
