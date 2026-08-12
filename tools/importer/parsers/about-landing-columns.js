/* eslint-disable */
/* global WebImporter */

/**
 * Parser for the `columns` block — DEDICATED to the "about-landing" template.
 * Base block: columns (the emitted block name stays "columns"; only this PARSER
 * FILE is template-specific so it can make DOM assumptions unique to
 * https://www.loves.com/about-us without disturbing the shared
 * tools/importer/parsers/columns.js used by about-content-article/tom-love-legacy).
 *
 * Selector (page-templates.json → about-landing → blocks[].instances):
 *   - #content > section.grid_grid__PqGa9:nth-of-type(1)   (the intro two-column row)
 *
 * Columns is a CORE component (blocks/columns/_columns.json →
 * core/franklin/components/columns/v1/columns). Per the xwalk field-hinting rules
 * — and matching the existing columns.js — Columns blocks carry NO <!-- field:* -->
 * comments: the columns/rows model is derived from the rendered table dimensions
 * and each cell holds its default content directly. This is a 2-column, single-row
 * layout: LEFT = rich text, RIGHT = a plain YouTube link.
 *
 * Source DOM (migration-work/block-context/columns/source.html):
 *   section.grid_grid__PqGa9
 *     div                                   ← LEFT column
 *       p (company overview WITH inline anchors: loves.com, Facebook, Instagram,
 *          LinkedIn, X)
 *       p (empty), table (5 social icon links in <td>s), p(&nbsp;), span(empty anchors)
 *     section.youTube_you-tube__Sv7OS       ← RIGHT column
 *       iframe[src="https://www.youtube.com/embed/YcIKvAxS0Ks"]
 *
 * Decisions:
 *   • LEFT cell — the overview paragraph is CLONED (cloneNode(true)) so its inline
 *     anchors survive as real, clickable links (never flattened to textContent).
 *     The five social-media links follow as a paragraph of real anchors. The source
 *     wraps each social link around an <img> icon; those icon binaries are NOT in
 *     the DAM map (loves-dam-images.js) and would render broken, and the reference
 *     guidance is that icon images are not meaningful in richtext — so each social
 *     anchor is rebuilt as a text anchor using the icon's alt text as the label
 *     (href preserved). Only anchors that actually WRAP an img are treated as social
 *     links, which naturally excludes both the inline text anchors (already inside
 *     the cloned overview <p>) and the trailing <span> of empty duplicate anchors.
 *   • RIGHT cell — the project's blocks/columns/columns.js auto-embeds a YouTube link
 *     that appears as a plain link inside a column (isVideoLink → loadVideoEmbed →
 *     embedYoutube, which reads the "?v=" param). So we emit a single plain anchor
 *     whose href is the canonical WATCH url. The video id is extracted from the
 *     iframe embed src (youtube.com/embed/<ID>); if extraction fails we fall back to
 *     the known id YcIKvAxS0Ks.
 *   • Empty-block guard — if neither text nor video is found, unwrap the element.
 */
export default function parse(element, { document }) {
  // LEFT column container: the first direct-child <div>. Fall back to the whole
  // element (safe: the RIGHT/video section has no <p> and no img-wrapped <a>, so the
  // element-scoped queries below still isolate the left-column content).
  const leftContainer = element.querySelector(':scope > div') || element;

  // --- Overview paragraph: first <p> that has real (non-whitespace, non-&nbsp;)
  //     text. Cloned deep to keep its inline anchors as rich text. ---
  const overviewP = [...leftContainer.querySelectorAll('p')].find(
    (p) => p.textContent.replace(/[\s ]+/g, '').length > 0,
  );

  // --- Social links: only anchors that WRAP an <img> icon (the 5 table links).
  //     This excludes the inline text anchors (no img) and the trailing empty
  //     <span> anchors. Rebuilt as text anchors using each icon's alt as label. ---
  const socialAnchors = [...leftContainer.querySelectorAll('a[href]')].filter(
    (a) => a.querySelector('img'),
  );

  // --- Build the LEFT cell (rich text). ---
  const leftCell = [];
  if (overviewP) leftCell.push(overviewP.cloneNode(true));
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
    leftCell.push(p);
  }

  // --- RIGHT column: the YouTube embed → a single plain WATCH-url anchor. ---
  const iframe = element.querySelector(
    'iframe[src*="youtube.com"], iframe[src*="youtube-nocookie.com"], iframe[src*="youtu.be"]',
  );
  let videoAnchor = null;
  if (iframe) {
    const src = iframe.getAttribute('src') || '';
    const match = src.match(/\/embed\/([^/?&#]+)/);
    const videoId = (match && match[1]) || 'YcIKvAxS0Ks';
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    videoAnchor = document.createElement('a');
    videoAnchor.setAttribute('href', watchUrl);
    videoAnchor.textContent = watchUrl;
  }

  // --- Empty-block guard: nothing on either side → unwrap. ---
  if (leftCell.length === 0 && !videoAnchor) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // --- Assemble a 2-column, single-row Columns table (NO field hints). Pad a
  //     missing side with '' so md2jcr still derives columns=2, rows=1. ---
  const cells = [[leftCell.length ? leftCell : '', videoAnchor || '']];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns', cells });
  element.replaceWith(block);
}
