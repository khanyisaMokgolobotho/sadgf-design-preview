// Progressive enhancement: navigation, content and native forms work without JS.
document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.getElementById('mobileToggle');
  const nav = document.getElementById('mainNav');
  const header = document.querySelector('.site-header');
  const mobile = window.matchMedia('(max-width: 1100px)');
  function closeMenu(restoreFocus = false) {
    nav?.classList.remove('active');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', 'Open navigation');
    if (restoreFocus) toggle?.focus();
  }
  if (toggle && nav) {
    header.classList.add('nav-ready');
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      nav.classList.toggle('active', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && nav.classList.contains('active')) closeMenu(true);
    });
    document.addEventListener('click', event => {
      if (!header.contains(event.target)) closeMenu();
    });
    header.addEventListener('focusout', () => {
      setTimeout(() => { if (!header.contains(document.activeElement)) closeMenu(); }, 0);
    });
    nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
    mobile.addEventListener('change', () => closeMenu());
  }
  const backToTop = document.getElementById('backToTop');
  function onScroll() {
    header?.classList.toggle('scrolled', window.scrollY > 40);
    if (backToTop) {
      backToTop.hidden = window.scrollY < 500;
      backToTop.classList.toggle('visible', !backToTop.hidden);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'instant' : 'smooth' });
    document.querySelector('.logo')?.focus({ preventScroll: true });
  });
  document.querySelectorAll('[data-topic-explorer]').forEach(explorer => {
    const tablist = explorer.querySelector('.topic-tabs');
    const tabs = [...explorer.querySelectorAll('[data-topic-target]')];
    const panels = [...explorer.querySelectorAll('[data-topic-panel]')];
    tablist.hidden = false;
    tablist.setAttribute('role', 'tablist');
    tabs.forEach(tab => {
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', tab.dataset.topicTarget);
    });
    panels.forEach(panel => {
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', 'tab-' + panel.id);
      panel.tabIndex = 0;
    });
    function selectTopic(id, focus = false) {
      if (!panels.some(panel => panel.id === id)) return;
      tabs.forEach(tab => {
        const selected = tab.dataset.topicTarget === id;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        if (selected && focus) tab.focus({ preventScroll: true });
      });
      panels.forEach(panel => { panel.hidden = panel.id !== id; });
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => selectTopic(tab.dataset.topicTarget));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next === undefined) return;
        event.preventDefault();
        selectTopic(tabs[next].dataset.topicTarget, true);
      });
    });
    document.querySelectorAll('[data-topic-link]').forEach(link => {
      link.addEventListener('click', event => {
        event.preventDefault();
        const id = link.dataset.topicLink;
        selectTopic(id, true);
        history.pushState(null, '', '#' + id);
        explorer.scrollIntoView({ behavior: reduceMotion.matches ? 'instant' : 'smooth', block: 'start' });
      });
    });
    const selectHash = () => selectTopic(location.hash.slice(1));
    window.addEventListener('hashchange', selectHash);
    selectTopic(panels.some(panel => panel.id === location.hash.slice(1)) ? location.hash.slice(1) : panels[0].id);
  });
  document.querySelectorAll('[data-slideshow]').forEach(slideshow => {
    const slides = [...slideshow.querySelectorAll('[data-slide]')];
    if (slides.length < 2) return;
    const frames = slideshow.querySelector('.summit-slideshow-frames');
    const controls = slideshow.querySelector('[data-slideshow-controls]');
    const rotation = slideshow.querySelector('[data-slideshow-toggle]');
    const counter = slideshow.querySelector('[data-slide-count]');
    const announcement = slideshow.querySelector('[data-slideshow-announcement]');
    let current = 0;
    let paused = reduceMotion.matches;
    let hovered = false;
    let focusHeld = false;
    let inView = false;
    let timer;
    let touchStart;
    controls.hidden = false;
    slideshow.querySelector('[data-slideshow-fallback]').hidden = true;
    slideshow.tabIndex = 0;

    function warmImages() {
      if (!inView) return;
      [slides[current], slides[(current + 1) % slides.length]].forEach(slide => {
        slide.querySelectorAll('img').forEach(img => { img.loading = 'eager'; });
      });
    }
    function syncRotation() {
      clearTimeout(timer);
      rotation.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
      rotation.querySelector('[data-slideshow-label]').textContent = paused ? 'Play' : 'Pause';
      rotation.querySelector('[data-slideshow-icon]').textContent = paused ? '▶' : 'Ⅱ';
      const playing = !paused && !hovered && !focusHeld && inView && !document.hidden;
      slideshow.dataset.playing = String(playing);
      if (playing) timer = setTimeout(() => showSlide(current + 1), 6000);
    }
    function showSlide(index, manual = false) {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => { slide.hidden = i !== current; });
      counter.textContent = String(current + 1).padStart(2, '0') + ' / ' + slides.length;
      if (manual) {
        paused = true;
        announcement.textContent = 'Photo ' + (current + 1) + ' of ' + slides.length + ': ' + slides[current].dataset.caption;
      }
      warmImages();
      syncRotation();
    }
    rotation.addEventListener('click', () => {
      paused = !paused;
      // An explicit Play action can resume from the keyboard; moving focus pauses again.
      if (!paused) focusHeld = false;
      syncRotation();
    });
    slideshow.addEventListener('keydown', event => {
      const targets = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: slides.length - 1 };
      if (!(event.key in targets)) return;
      event.preventDefault();
      showSlide(targets[event.key], true);
    });
    slideshow.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse') return;
      hovered = true;
      syncRotation();
    });
    slideshow.addEventListener('pointerleave', () => { hovered = false; syncRotation(); });
    slideshow.addEventListener('focusin', () => { focusHeld = true; syncRotation(); });
    slideshow.addEventListener('focusout', event => {
      focusHeld = slideshow.contains(event.relatedTarget);
      syncRotation();
    });
    frames.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch') touchStart = { x: event.clientX, y: event.clientY };
    });
    frames.addEventListener('pointercancel', () => { touchStart = undefined; });
    frames.addEventListener('pointerup', event => {
      if (!touchStart) return;
      const dx = event.clientX - touchStart.x;
      const dy = event.clientY - touchStart.y;
      touchStart = undefined;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) showSlide(current + (dx < 0 ? 1 : -1), true);
    });
    document.addEventListener('visibilitychange', syncRotation);
    reduceMotion.addEventListener('change', () => {
      if (reduceMotion.matches) paused = true;
      syncRotation();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        inView = entries[0].isIntersecting && entries[0].intersectionRatio >= .25;
        warmImages();
        syncRotation();
      }, { threshold: [0, .25] }).observe(slideshow);
    } else {
      inView = true;
      warmImages();
    }
    syncRotation();
  });
  document.querySelectorAll('[data-resource-browser]').forEach(browser => {
    const controls = browser.querySelector('.resource-filters');
    const inputs = [...browser.querySelectorAll('[data-filter]')];
    const cards = [...browser.querySelectorAll('[data-resource]')];
    const counter = browser.querySelector('[data-results-count]');
    const empty = browser.querySelector('[data-empty-state]');
    controls.hidden = false;
    const initial = new URLSearchParams(location.search);
    inputs.forEach(input => {
      const value = initial.get(input.dataset.filter) || '';
      if (input.tagName !== 'SELECT' || [...input.options].some(option => option.value === value)) input.value = value;
    });
    function filter(updateURL = true) {
      const state = Object.fromEntries(inputs.map(input => [input.dataset.filter, input.value.trim()]));
      const terms = state.search.toLocaleLowerCase().split(/\s+/).filter(Boolean);
      let visible = 0;
      cards.forEach(card => {
        const match = terms.every(term => card.dataset.search.includes(term)) && (!state.type || card.dataset.type === state.type) && (!state.status || card.dataset.status === state.status);
        card.hidden = !match;
        if (match) visible++;
      });
      counter.textContent = `${visible} ${visible === 1 ? 'publication' : 'publications'} shown`;
      empty.hidden = visible !== 0;
      if (updateURL) {
        const url = new URL(location.href);
        inputs.forEach(input => {
          const value = input.value.trim();
          if (value) url.searchParams.set(input.dataset.filter, value);
          else url.searchParams.delete(input.dataset.filter);
        });
        history.replaceState(null, '', url);
      }
    }
    inputs.forEach(input => input.addEventListener('input', () => filter()));
    browser.querySelector('[data-reset-filters]').addEventListener('click', () => {
      inputs.forEach(input => { input.value = ''; });
      filter();
      inputs[0].focus();
    });
    filter(false);
  });
  const interest = document.getElementById('contact-interest');
  const requestedInterest = new URLSearchParams(location.search).get('interest');
  if (interest && [...interest.options].some(option => option.value === requestedInterest)) interest.value = requestedInterest;
  document.querySelectorAll('.enhanced-form').forEach(form => {
    let submitting = false;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (submitting || !form.reportValidity()) return;
      const status = form.querySelector('.form-status');
      const button = form.querySelector('[type="submit"]');
      const label = button.textContent;
      const body = new URLSearchParams(new FormData(form));
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      submitting = true;
      button.disabled = true;
      button.textContent = 'Sending…';
      form.setAttribute('aria-busy', 'true');
      status.hidden = true;
      try {
        const response = await fetch('/', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(), signal: controller.signal, credentials: 'same-origin'
        });
        if (!response.ok || response.type === 'opaque') throw new Error('Submission was not accepted');
        form.reset();
        status.textContent = form.dataset.success;
        status.dataset.state = 'success';
      } catch {
        status.textContent = `We could not confirm your submission. Your details are still here. Please try again or email ${document.body.dataset.contactEmail}.`;
        status.dataset.state = 'error';
      } finally {
        clearTimeout(timeout);
        submitting = false;
        button.disabled = false;
        button.textContent = label;
        form.removeAttribute('aria-busy');
        status.hidden = false;
      }
    });
  });
  document.querySelectorAll('.print-publication').forEach(button => button.addEventListener('click', () => window.print()));
});
