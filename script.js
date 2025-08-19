// Animation du logo quand on scrolle vers le bas
window.addEventListener('scroll', () => {
  const logo = document.querySelector('.logo');
  if (window.scrollY > 100) {
    logo.style.transform = 'rotate(-5deg) scale(0.9)';
  } else {
    logo.style.transform = 'rotate(0) scale(1)';
  }
});

// Animation d'apparition au scroll
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

// Bouton retour en haut
const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  if (window.scrollY > 300) {
    backToTop.classList.add('show');
  } else {
    backToTop.classList.remove('show');
  }
});
backToTop.addEventListener('click', () => {
  window.scrollTo({top: 0, behavior: 'smooth'});
});

// Menu burger coulissant + overlay
const burger = document.querySelector('.burger');
const navUl = document.querySelector('.main-nav ul');

// Ajout overlay dynamiquement si pas déjà dans le HTML
let overlay = document.querySelector('.menu-overlay');
if (!overlay) {
  overlay = document.createElement('div');
  overlay.className = 'menu-overlay';
  document.body.appendChild(overlay);
}

function closeMenu() {
  navUl.classList.remove('open');
  document.body.classList.remove('menu-open');
}

function openMenu() {
  navUl.classList.add('open');
  document.body.classList.add('menu-open');
}

burger.addEventListener('click', () => {
  if (navUl.classList.contains('open')) {
    closeMenu();
  } else {
    openMenu();
  }
});

// Ferme le menu quand on clique sur un lien du menu
navUl.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    closeMenu();
  });
});

// Ferme le menu si on clique sur l'overlay
overlay.addEventListener('click', () => {
  closeMenu();
});

// Loader
const loader = document.getElementById('loader');
window.addEventListener('load', () => {
  if(loader){
    loader.style.opacity = 0;
    setTimeout(() => {
      loader.style.display = 'none';
    }, 500);
  }
});

// Scroll avec offset pour centrer la section à l'écran lors du clic sur le menu
document.querySelectorAll('.main-nav a[href^="#"]').forEach(link => {
  link.addEventListener('click', function(e) {
    const targetId = this.getAttribute('href').slice(1);
    const target = document.getElementById(targetId);
    if (target) {
      e.preventDefault();
      const rect = target.getBoundingClientRect();
      const scrollY = window.scrollY + rect.top - (window.innerHeight/2) + (rect.height/2);
      window.scrollTo({ top: scrollY, behavior: 'smooth' });
    }
  });
});

// Mode sombre/clair
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