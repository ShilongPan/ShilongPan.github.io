// Profile Popup
const overlay = document.getElementById('profile-popup-overlay');
const trigger = document.getElementById('profile-trigger');
const portrait = document.getElementById('profile-popup-portrait');
const closeBtn = document.querySelector('.profile-popup-close');

if (trigger && overlay && portrait) {
  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    portrait.src = 'images/ShilongPanPortrait.JPG';
    overlay.style.display = 'flex';
  });

  closeBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.style.display = 'none';
    }
  });
}
