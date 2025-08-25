// ==========================
// Animation du logo au scroll
// ==========================
window.addEventListener('scroll', () => {
  const logo = document.querySelector('.logo');
  if (window.scrollY > 100) {
    logo.style.transform = 'rotate(-5deg) scale(0.9)';
  } else {
    logo.style.transform = 'rotate(0) scale(1)';
  }
});

// ==========================
// Animation d'apparition au scroll
// ==========================
const revealElements = document.querySelectorAll('.section, .card, .gallerie-item');
function revealOnScroll() {
  revealElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight - 50) {
      el.classList.add('visible');
    }
  });
}
window.addEventListener('scroll', revealOnScroll);
window.addEventListener('load', revealOnScroll);

// ==========================
// Bouton retour en haut
// ==========================
const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  if (window.scrollY > 300) {
    backToTop.classList.add('show');
  } else {
    backToTop.classList.remove('show');
  }
});
backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ==========================
// Menu mobile et burger animé
// ==========================
const burger = document.querySelector('.burger');
const nav = document.querySelector('.main-nav');

burger.addEventListener('click', () => {
  nav.classList.toggle('open');
  burger.classList.toggle('open');
  // Change l'icône
  burger.dataset.icon = burger.classList.contains('open') ? '✖' : '☰';
});

// Fermer le menu au clic sur un lien
document.querySelectorAll('.main-nav a').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    burger.classList.remove('open');
    burger.dataset.icon = '☰';
  });
});

// ==========================
// Loader
// ==========================
const loader = document.getElementById('loader');
window.addEventListener('load', () => {
  if(loader){
    loader.style.opacity = 0;
    setTimeout(() => loader.style.display = 'none', 500);
  }
});

// ==========================
// Scroll avec offset centré
// ==========================
document.querySelectorAll('.main-nav a[href^="#"]').forEach(link => {
  link.addEventListener('click', function(e) {
    const targetId = this.getAttribute('href').slice(1);
    const target = document.getElementById(targetId);
    if(target){
      e.preventDefault();
      const rect = target.getBoundingClientRect();
      const scrollY = window.scrollY + rect.top - (window.innerHeight/2) + (rect.height/2);
      window.scrollTo({ top: scrollY, behavior: 'smooth' });
    }
  });
});

// ==========================
// Mode sombre / clair
// ==========================
const themeToggle = document.getElementById('theme-toggle');
function setTheme(light) {
  document.body.classList.toggle('light', light);
  themeToggle.classList.toggle('light', light);
  themeToggle.textContent = light ? "🌞" : "🌙";
  localStorage.setItem('theme', light ? 'light' : 'dark');
}
themeToggle.addEventListener('click', () => {
  setTheme(!document.body.classList.contains('light'));
});
if (localStorage.getItem('theme') === 'light') setTheme(true);

// ==========================
// Mise à jour visuelle du burger via CSS data-icon
// ==========================
const updateBurgerIcon = () => {
  burger.textContent = burger.dataset.icon || '☰';
};
updateBurgerIcon();

// Observer pour mettre à jour à chaque changement de classe open
const observer = new MutationObserver(updateBurgerIcon);
observer.observe(burger, { attributes: true, attributeFilter: ['class'] });
