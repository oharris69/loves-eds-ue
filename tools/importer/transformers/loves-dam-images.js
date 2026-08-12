/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: rewrite external Sitecore image URLs to AEM DAM paths.
 *
 * Love's page images are hosted on the Sitecore CDN (edge.sitecorecloud.io).
 * An `image` (reference) field pointing at an external URL renders as a LINK, not
 * an <img>. For proper DAM ingestion the image must reference a DAM path, so this
 * maps each known source image (by a stable substring of its path) to its
 * /content/dam/loves-eds-ue/... location. The binaries are delivered separately
 * to be uploaded into AEM Assets at these same paths.
 *
 * Site-wide and additive: the map covers the homepage template images and the
 * about-content-article template images. Because matching is by stable path
 * substring, entries only rewrite URLs that actually appear on a given page, so
 * the about entries are inert on the homepage and vice versa.
 *
 * Runs in beforeTransform so the block parsers see DAM paths when they read img src.
 */

// Assets were uploaded to AEM under the /en locale folder, keeping the
// homepage/ brand/ social/ subfolders: /content/dam/loves-eds-ue/en/...
const DAM_ROOT = '/content/dam/loves-eds-ue/en';

// Match by a stable, query-independent substring of the source URL path.
const URL_TO_DAM = [
  // --- homepage template ---
  ['my-love-rewards/2026lovesrewards/loves26webheader', `${DAM_ROOT}/homepage/loves26webheader.jpg`],
  ['loves-beauty-shots/400x300/mlr_400x300', `${DAM_ROOT}/homepage/mlr_400x300.jpg`],
  ['lovestruckcare/400x300/lovestruckcare_400x300', `${DAM_ROOT}/homepage/lovestruckcare_400x300.jpg`],
  ['privatebrands/400x300/merch25_kidswater', `${DAM_ROOT}/homepage/merch25_kidswater_400x300.jpg`],
  ['factoring/2021/hero_2000x600', `${DAM_ROOT}/homepage/factoring_hero_2000x600.jpg`],
  ['loves-beauty-shots/400x300/careers_400x300', `${DAM_ROOT}/homepage/careers_400x300.jpg`],
  ['loves-beauty-shots/400x300/fleet_400x300', `${DAM_ROOT}/homepage/fleet_400x300.jpg`],
  ['loves-beauty-shots/400x300/lovesconnectapp_400x300', `${DAM_ROOT}/homepage/lovesconnectapp_400x300.jpg`],
  ['newsandblogs/2022/roadsidespeedco_400x300', `${DAM_ROOT}/homepage/roadsidespeedco_400x300.jpg`],

  // --- about-content-article template (in-content authorable images) ---
  // Columns block image (section 2) + inline default-content images (sections 3-5).
  // All live under media/images/community/communitygiving/ — no overlap with the
  // homepage needles above, so these are inert on the homepage.
  ['community/communitygiving/400x300-tom-judy-young-couple', `${DAM_ROOT}/about/tom-judy-young-couple.jpg`],
  ['community/communitygiving/store-1-in-watonga-ok', `${DAM_ROOT}/about/store-1-in-watonga-ok.png`],
  ['community/communitygiving/lovescares', `${DAM_ROOT}/about/lovescares.png`],
  ['community/communitygiving/g2g3', `${DAM_ROOT}/about/g2g3.png`],

  // --- about-landing template (family-of-companies card images) ---
  // The 4-up "Love's Family of Companies" grid on https://www.loves.com/about-us.
  // Needles are stable path substrings of the source Sitecore CDN URLs
  // (see migration-work/metadata.json .images.mapping). Each maps to a dedicated
  // /about/company/ DAM path. These needles are unique to the about-landing page,
  // so the entries are inert on the homepage and about-content-article templates.
  ['trillium-images/website-refresh-images/company/laecanopy400x300', `${DAM_ROOT}/about/company/laecanopy400x300.png`],
  ['newsandblogs/2017/loves-hauler-aero-tanker', `${DAM_ROOT}/about/company/gemini-hauler-aero-tanker.jpg`],
  ['loves-beauty-shots/400x300/speedcotruckbay2_400x300', `${DAM_ROOT}/about/company/speedcotruckbay2.jpg`],
  ['musket/400x300/musket-oil-rig-400x300', `${DAM_ROOT}/about/company/musket-oil-rig.jpg`],
];

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.beforeTransform) return;

  element.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src') || '';
    const match = URL_TO_DAM.find(([needle]) => src.includes(needle));
    if (match) {
      img.setAttribute('src', match[1]);
      img.removeAttribute('srcset');
    }
  });
}
