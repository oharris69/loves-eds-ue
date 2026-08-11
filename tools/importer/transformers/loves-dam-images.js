/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: rewrite external Sitecore image URLs to AEM DAM paths.
 *
 * Love's homepage images are hosted on the Sitecore CDN (edge.sitecorecloud.io).
 * An `image` (reference) field pointing at an external URL renders as a LINK, not
 * an <img>. For proper DAM ingestion the image must reference a DAM path, so this
 * maps each known source image (by a stable substring of its path) to its
 * /content/dam/loves-eds-ue/... location. The binaries are delivered separately
 * to be uploaded into AEM Assets at these same paths.
 *
 * Runs in beforeTransform so the block parsers see DAM paths when they read img src.
 */

// Assets were uploaded to AEM under the /en locale folder, keeping the
// homepage/ brand/ social/ subfolders: /content/dam/loves-eds-ue/en/...
const DAM_ROOT = '/content/dam/loves-eds-ue/en';

// Match by a stable, query-independent substring of the source URL path.
const URL_TO_DAM = [
  ['my-love-rewards/2026lovesrewards/loves26webheader', `${DAM_ROOT}/homepage/loves26webheader.jpg`],
  ['loves-beauty-shots/400x300/mlr_400x300', `${DAM_ROOT}/homepage/mlr_400x300.jpg`],
  ['lovestruckcare/400x300/lovestruckcare_400x300', `${DAM_ROOT}/homepage/lovestruckcare_400x300.jpg`],
  ['privatebrands/400x300/merch25_kidswater', `${DAM_ROOT}/homepage/merch25_kidswater_400x300.jpg`],
  ['factoring/2021/hero_2000x600', `${DAM_ROOT}/homepage/factoring_hero_2000x600.jpg`],
  ['loves-beauty-shots/400x300/careers_400x300', `${DAM_ROOT}/homepage/careers_400x300.jpg`],
  ['loves-beauty-shots/400x300/fleet_400x300', `${DAM_ROOT}/homepage/fleet_400x300.jpg`],
  ['loves-beauty-shots/400x300/lovesconnectapp_400x300', `${DAM_ROOT}/homepage/lovesconnectapp_400x300.jpg`],
  ['newsandblogs/2022/roadsidespeedco_400x300', `${DAM_ROOT}/homepage/roadsidespeedco_400x300.jpg`],
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
