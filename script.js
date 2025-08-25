// Animation du logo quand on scrolle
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

// Menu mobile et changement d'icône / fond
const burger = document.querySelector('.burger');
const nav = document.querySelector('.main-nav');

burger.addEventListener('click', () => {
  nav.classList.toggle('open');

  if(nav.classList.contains('open')){
    burger.textContent = "✖";          // croix
    burger.style.background = "transparent"; // fond transparent
  } else {
    burger.textContent = "☰";          // burger
    burger.style.background = "#0cf";       // fond bleu
  }
});

// Fermer le menu quand on clique sur un lien
document.querySelectorAll('.main-nav a').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    burger.textContent = "☰";
    burger.style.background = "#0cf";
  });
});

// Fermer le menu si bouton close-menu existe
const closeMenuBtn = document.querySelector('.close-menu');
if(closeMenuBtn){
  closeMenuBtn.addEventListener('click', () => {
    nav.classList.remove('open');
    burger.textContent = "☰";
    burger.style.background = "#0cf";
  });
}

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

// Scroll avec offset pour centrer la section lors du clic sur un lien
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
