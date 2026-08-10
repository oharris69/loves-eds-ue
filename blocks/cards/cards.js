import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');

    // Card cells match the `card` model (blocks/cards/_cards.json):
    //   index 0 = image, index 1 = text (richtext), index 2 = ctastyle (select).
    // Read CTA style from the third div (index 2).
    const ctaDiv = row.children[2];
    const ctaParagraph = ctaDiv?.querySelector('p');
    const ctaStyle = ctaParagraph?.textContent?.trim() || 'default';

    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);

    // Process the li children to identify and style them correctly
    [...li.children].forEach((div, index) => {
      if (index === 0) {
        // First div (index 0) - Image
        div.className = 'cards-card-image';
      } else if (index === 1) {
        // Second div (index 1) - Content with button
        div.className = 'cards-card-body';
      } else if (index === 2) {
        // Third div (index 2) - CTA style configuration
        div.className = 'cards-config';
        const p = div.querySelector('p');
        if (p) {
          p.style.display = 'none'; // Hide the configuration text
        }
      } else {
        // Any other divs
        div.className = 'cards-card-body';
      }
    });

    // Apply CTA styles to button containers
    const buttonContainers = li.querySelectorAll('p.button-container');
    buttonContainers.forEach((buttonContainer) => {
      // Remove any existing CTA classes
      buttonContainer.classList.remove('default', 'cta-button', 'cta-button-secondary', 'cta-button-dark', 'cta-default');
      // Add the correct CTA class
      buttonContainer.classList.add(ctaStyle);
    });

    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  block.textContent = '';
  block.append(ul);
}
