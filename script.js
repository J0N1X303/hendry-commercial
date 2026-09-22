(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const progress = document.querySelector('.scroll-progress span');
  const heroGlow = document.querySelector('.hero-glow');
  const heroTerms = document.querySelector('.hero-terms');
  const contactAura = document.querySelector('.contact-aura');
  const timeline = document.querySelector('[data-timeline]');
  const timelineItems = [...document.querySelectorAll('.timeline-item')];

  function clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
  }

  function updateScrollEffects() {
    const doc = document.documentElement;
    const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
    const pageProgress = window.scrollY / maxScroll;

    if (progress) progress.style.transform = `scaleX(${clamp(pageProgress, 0, 1)})`;

    if (!reduceMotion) {
      if (heroGlow) heroGlow.style.setProperty('--hero-shift', `${window.scrollY * 0.08}px`);
      if (heroTerms) heroTerms.style.setProperty('--term-shift', `${Math.min(window.scrollY * -0.025, -7)}px`);

      if (contactAura) {
        const rect = contactAura.parentElement.getBoundingClientRect();
        const visible = clamp(1 - rect.top / window.innerHeight, 0, 1);
        contactAura.style.setProperty('--contact-scale', (0.76 + visible * 0.34).toFixed(3));
      }

      if (timeline) {
        const rect = timeline.getBoundingClientRect();
        const start = window.innerHeight * 0.72;
        const end = window.innerHeight * 0.24;
        const total = Math.max(1, rect.height - (start - end));
        const travelled = start - rect.top;
        const timelineProgress = clamp(travelled / total, 0, 1);
        timeline.style.setProperty('--timeline-progress', timelineProgress.toFixed(3));

        timelineItems.forEach((item) => {
          const itemRect = item.getBoundingClientRect();
          if (itemRect.top < window.innerHeight * 0.72) item.classList.add('is-active');
        });
      }
    }
  }

  let ticking = false;
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateScrollEffects();
        ticking = false;
      });
      ticking = true;
    }
  }

  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -4% 0px' });
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  const counters = document.querySelectorAll('.count-up');
  function animateCounter(el) {
    if (el.dataset.counted === 'true' || reduceMotion) return;
    el.dataset.counted = 'true';

    const value = Number(el.dataset.value || 0);
    const decimals = Number(el.dataset.decimals || 0);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const duration = 900;
    const start = performance.now();

    function frame(now) {
      const t = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = value * eased;
      el.textContent = prefix + current.toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if ('IntersectionObserver' in window && !reduceMotion) {
    const countObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.65 });
    counters.forEach((el) => countObserver.observe(el));
  }

  if (!reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.tilt-card').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${(-y * 3.5).toFixed(2)}deg) rotateY(${(x * 4.5).toFixed(2)}deg) translateY(-2px)`;
      });
      card.addEventListener('pointerleave', () => {
        card.style.transform = '';
      });
    });

    document.querySelectorAll('.magnetic').forEach((button) => {
      button.addEventListener('pointermove', (event) => {
        const rect = button.getBoundingClientRect();
        const x = event.clientX - (rect.left + rect.width / 2);
        const y = event.clientY - (rect.top + rect.height / 2);
        button.style.transform = `translate(${(x * 0.08).toFixed(1)}px,${(y * 0.08).toFixed(1)}px)`;
      });
      button.addEventListener('pointerleave', () => {
        button.style.transform = '';
      });
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateScrollEffects();
})();