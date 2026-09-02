// Profile Popup
const overlay = document.getElementById('profile-popup-overlay');
const trigger = document.getElementById('profile-trigger');
const portrait = document.getElementById('profile-popup-portrait');
const closeBtn = document.querySelector('.profile-popup-close');

if (trigger && overlay && portrait) {
  // Only show the popup when already on the home page.
  // On every other page, clicking the name navigates back home.
  const normalizeHomeUrl = (href) => {
    const url = new URL(href, window.location.origin);
    if (url.pathname.endsWith('/index.html')) {
      url.pathname = url.pathname.slice(0, -'index.html'.length);
    }
    return url.href;
  };

  const isHome = normalizeHomeUrl(trigger.href) === normalizeHomeUrl(window.location.href);

  if (isHome) {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      portrait.src = 'images/ShilongPanPortrait.JPG';
      overlay.style.display = 'flex';
    });
  }

  closeBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.style.display = 'none';
    }
  });
}
