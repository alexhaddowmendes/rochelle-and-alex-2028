(function () {
  const nav = document.querySelector('.site-nav');
  const target = document.querySelector('[data-nav-fade]');
  const onSplash = target.classList.contains('hero');
  const rsvpLink = nav.querySelector('a[href="#rsvp"]');
  const photo = document.querySelector('.print');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Arriving from another page's RSVP link: land on the RSVP section straight away.
  if (document.documentElement.classList.contains('jump')) {
    document.documentElement.style.scrollBehavior = 'auto';
    document.getElementById('rsvp').scrollIntoView();
    document.documentElement.style.scrollBehavior = '';
    document.documentElement.classList.remove('jump');
  }

  // On the home page the whole nav fades in over the last 200px of the splash screen.
  // On other pages the nav is always there and only its backing fades in, once the title has scrolled away.
  function updateNav() {
    const edge = target.getBoundingClientRect().bottom - nav.offsetHeight;
    if (onSplash) {
      const shown = Math.min(1, Math.max(0, 1 - edge / 200));
      nav.style.setProperty('--nav-show', shown);
      nav.style.setProperty('--nav-fade', 1);
      nav.style.pointerEvents = shown < 0.05 ? 'none' : '';

      // The photo scrolls slower than the page, so it slips behind the next section.
      if (!reducedMotion.matches) photo.style.setProperty('--parallax', Math.max(0, window.scrollY) * 0.06 + 'px');

      // Highlight RSVP while the RSVP section is on screen, as Info is on its own page.
      const inRsvp = document.getElementById('rsvp').getBoundingClientRect().top <= window.innerHeight / 2;
      rsvpLink.toggleAttribute('aria-current', inRsvp);
      if (inRsvp) rsvpLink.setAttribute('aria-current', 'page');
    } else {
      nav.style.setProperty('--nav-fade', Math.min(1, Math.max(0, -edge / 120)));
    }
  }
  window.addEventListener('scroll', updateNav, { passive: true });
  window.addEventListener('resize', updateNav);
  updateNav();

  // Fade out before moving to another page.
  document.addEventListener('click', function (event) {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || link.target) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname) return;
    event.preventDefault();
    document.body.classList.add('leaving');
    setTimeout(function () {
      location.href = link.href;
    }, 350);
  });

  window.addEventListener('pageshow', function () {
    document.body.classList.remove('leaving');
  });
})();
