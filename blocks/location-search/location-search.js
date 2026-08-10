/*
 * Location Search block — "Find a Love's Near You".
 *
 * Recreates the source homepage's location quick-search widget: a labeled input
 * and a submit button that redirects to the location & fuel-price search page,
 * passing the entered location as a query parameter. (The source used a Google
 * Places autocomplete; this is a dependency-free equivalent that preserves the
 * label, placeholder, and destination.)
 *
 * Authored rows (each a block row, first cell = value):
 *   1. Label        (e.g. "Find a Love's Near You")
 *   2. Placeholder  (e.g. "Enter a Location")
 *   3. Target URL   (e.g. /location-and-fuel-price-search)
 */
export default function decorate(block) {
  const rows = [...block.children];
  const readRow = (i) => {
    const cell = rows[i] ? rows[i].querySelector('div') : null;
    return cell ? cell.textContent.trim() : '';
  };
  const labelText = readRow(0) || "Find a Love's Near You";
  const placeholder = readRow(1) || 'Enter a Location';
  // The target URL may be authored as plain text or as a link.
  const linkEl = rows[2] ? rows[2].querySelector('a') : null;
  const targetUrl = (linkEl && linkEl.getAttribute('href'))
    || readRow(2)
    || '/location-and-fuel-price-search';

  block.textContent = '';

  const label = document.createElement('label');
  label.className = 'location-search-label';
  const inputId = 'location-search-input';
  label.setAttribute('for', inputId);
  label.textContent = labelText;

  const form = document.createElement('form');
  form.className = 'location-search-form';
  form.setAttribute('role', 'search');

  const input = document.createElement('input');
  input.type = 'text';
  input.id = inputId;
  input.name = 'location';
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.setAttribute('aria-label', labelText);

  const button = document.createElement('button');
  button.type = 'submit';
  button.className = 'location-search-button';
  button.setAttribute('aria-label', 'Search');
  button.innerHTML = '<span class="location-search-icon" aria-hidden="true">⌕</span>';

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = input.value.trim();
    const base = targetUrl;
    const url = value
      ? `${base}${base.includes('?') ? '&' : '?'}location=${encodeURIComponent(value)}`
      : base;
    window.location.href = url;
  });

  form.append(input, button);
  block.append(label, form);
}
