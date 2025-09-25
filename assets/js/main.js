(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  let appsData = [];
  let currentOS = 'android';
  let basePath = '';

  function getBodyOS() {
    const os = document.body?.getAttribute('data-os');
    return os === 'android' || os === 'ios' || os === 'windows' ? os : null;
  }

  function getAppsGrid() { return $('#apps-grid'); }
  function getEmptyState() { return $('#apps-empty'); }

  function setBusy(isBusy) {
    const grid = getAppsGrid();
    if (!grid) return;
    if (isBusy) {
      grid.setAttribute('aria-busy', 'true');
    } else {
      grid.removeAttribute('aria-busy');
    }

    // Accordion interactions
    $$('.accordion-header').forEach(h => {
      h.addEventListener('click', ()=>{
        const item = h.closest('[data-acc]');
        if (item) item.classList.toggle('open');
      });
    });
    // Accordion item routing
    $$('.list-item[data-route]')?.forEach(li => {
      li.addEventListener('click', ()=>{
        const type = li.getAttribute('data-route');
        const base = location.pathname.includes('/pages/') ? '../' : '';
        if (type === 'os') {
          const os = li.getAttribute('data-os');
          if (os) { location.href = base + `pages/os-${os}.html`; }
        } else if (type === 'anchor') {
          const target = li.getAttribute('data-target');
          if (target) scrollToId(target);
        } else if (type === 'hash') {
          const href = li.getAttribute('data-href');
          if (href === '#/dns') { location.href = base + 'pages/dns.html'; return; }
          if (href) { location.hash = href; handleRoute(); }
        } else if (type === 'page') {
          const page = li.getAttribute('data-page') || '';
          if (page) location.href = base + 'pages/' + page;
        }
      });
    });
  }

  function updateTabsState(os) {
    $$('.os-tab').forEach(b => {
      const active = b.dataset.os === os;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });
  }

  function renderApps(os) {
    currentOS = os;
    updateTabsState(os);

    const appsGrid = getAppsGrid();
    const emptyState = getEmptyState();
    if (!appsGrid || !emptyState) return;

    setBusy(true);
    const items = appsData.filter(a => (a.os || []).includes(os));

    appsGrid.innerHTML = '';

    if (!items.length) {
      emptyState.classList.remove('hidden');
      setBusy(false);
      return;
    }

    emptyState.classList.add('hidden');

    const frag = document.createDocumentFragment();
    for (const app of items) {
      const card = document.createElement('article');
      card.className = 'card glass';

      const header = document.createElement('div');
      header.className = 'card-header';

      const img = document.createElement('img');
      img.alt = app.name;
      img.src = basePath + app.icon;

      const title = document.createElement('h4');
      title.textContent = app.name;

      header.append(img, title);

      const p = document.createElement('p');
      p.textContent = 'دانلود مستقیم از منبع اصلی';

      const actions = document.createElement('div');
      actions.className = 'card-actions';

      const a = document.createElement('a');
      a.href = app.link;
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'btn primary';
      a.textContent = 'دانلود';

      actions.appendChild(a);
      card.append(header, p, actions);
      frag.appendChild(card);
    }

    appsGrid.appendChild(frag);
    setBusy(false);
  }

  async function loadApps() {
    try {
      setBusy(true);
      // Try Cloudflare Pages Functions relative API first
      let data = null;
      try {
        const resRel = await fetch('/api/apps', { cache: 'no-store' });
        if (resRel.ok) data = await resRel.json();
      } catch {}

      // Fallback to local apps.json
      if (!data) {
        const res = await fetch(basePath + 'apps.json', { cache: 'no-store' });
        if (!res.ok) throw new Error('apps.json not found');
        data = await res.json();
      }

      appsData = Array.isArray(data?.apps) ? data.apps : [];
      renderApps(currentOS);
    } catch (err) {
      console.error('Failed to load apps.json', err);
      const emptyState = getEmptyState();
      if (emptyState) {
        emptyState.textContent = 'خطا در بارگذاری لیست برنامه‌ها.';
        emptyState.classList.remove('hidden');
      }
      setBusy(false);
    }
  }

  function setupTabHandlers() {
    $$('.os-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const os = btn.dataset.os;
        renderApps(os);
      });
    });
  }

  async function loadComponents() {
    const base = location.pathname.includes('/pages/') ? '../' : '';
    basePath = base;
    const map = {
      header: base + 'components/header.html',
      hero: base + 'components/hero.html',
      'home-intro': base + 'components/home-intro.html',
      accordion: base + 'components/accordion.html',
      os: base + 'components/os.html',
      'os-android': base + 'components/os-android.html',
      'os-ios': base + 'components/os-ios.html',
      'os-windows': base + 'components/os-windows.html',
      dns: base + 'components/dns.html',
      panels: base + 'components/panels.html',
      servers: base + 'components/servers.html',
      contact: base + 'components/contact.html',
      footer: base + 'components/footer.html',
    };

    const placeholders = $$('[data-component]');
    await Promise.all(placeholders.map(async (ph) => {
      const name = ph.getAttribute('data-component');
      const url = map[name];
      if (!url) return;
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load ' + url);
        const html = await res.text();
        ph.outerHTML = html; // replace placeholder with component markup
      } catch (e) {
        console.error(e);
      }
    }));

    // After components mount, set year
    const yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Fix image paths after components are loaded
    fixImagePaths();

      // After header is mounted, wire dropdown and hamburger
      setupNavDropdown();
      setupHamburgerMenu();

    // If a body data-os is set on dedicated OS pages, set default
    const bodyOS = getBodyOS();
    if (bodyOS) {
      currentOS = bodyOS;
    }

      // Init particles if canvas exists
      const canvas = document.getElementById('particles');
      if (canvas && window.Particles) {
        window.Particles.init(canvas);
      } else if (canvas) {
        // Lazy-load particles script if not loaded
        const s = document.createElement('script');
        s.src = base + 'assets/js/particles.js'; // Use basePath
        s.defer = true;
        s.onload = () => window.Particles && window.Particles.init(canvas);
        document.head.appendChild(s);
      }

      // Make hero larger on homepage only
      if (!location.pathname.includes('/pages/')) {
        const hero = document.getElementById('hero');
        if (hero) hero.classList.add('hero-full');
      }
  }

  function setupNavDropdown() {
    const items = $$('.nav-item.has-menu');
    const base = location.pathname.includes('/pages/') ? '../' : '';

    // Ensure backdrop exists
    let backdrop = document.getElementById('nav-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'nav-backdrop';
      document.body.appendChild(backdrop);
    }

    function anyOpen() { return items.some(i => i.classList.contains('open')); }
    function closeAll() { items.forEach(i=> i.classList.remove('open')); }
    function updateBackdrop(){ backdrop.classList.toggle('show', anyOpen()); }
    function setBodyScroll(lock){ document.body.classList.toggle('nav-open', !!lock); }

    items.forEach(item => {
      const btn = item.querySelector('.nav-link');
      const menu = item.querySelector('.menu');
      if (!btn || !menu) return;

      function close(){ item.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }
      function open(){ item.classList.add('open'); btn.setAttribute('aria-expanded','true'); }

      btn.addEventListener('click', (e)=>{
        e.stopPropagation();
        const isOpen = item.classList.contains('open');
        // close others
        items.forEach(i=> i!==item && i.classList.remove('open'));
        if (isOpen) close(); else open();
        updateBackdrop();
        setBodyScroll(anyOpen());
      });

      document.addEventListener('click', (e)=>{ if (!item.contains(e.target)) { close(); updateBackdrop(); setBodyScroll(anyOpen()); } });
      backdrop.addEventListener('click', ()=>{ closeAll(); updateBackdrop(); setBodyScroll(false); });

      btn.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') { close(); updateBackdrop(); setBodyScroll(anyOpen()); } if (e.key === 'ArrowDown') { open(); updateBackdrop(); setBodyScroll(true); } });

      // OS links inside each menu
      item.querySelectorAll('[data-rel="route-os"]').forEach(a => {
        const os = a.getAttribute('data-os');
        if (os) {
          a.href = base + `pages/os-${os}.html`;
        }
        a.addEventListener('click', (e)=>{
          e.preventDefault();
          const os = a.getAttribute('data-os');
          if (os) { 
            closeAll(); 
            updateBackdrop(); 
            setBodyScroll(false);
            window.location.href = base + `pages/os-${os}.html`; 
          }
        });
      });
    });

    // Hash routes and generic pages across the navbar
    document.querySelectorAll('[data-rel="route-link"]').forEach(a => {
      a.addEventListener('click', (e)=>{
        const href = a.getAttribute('href') || '';
        if (href.startsWith('#/')) { e.preventDefault(); closeAll(); updateBackdrop(); setBodyScroll(false); location.hash = href; handleRoute(); }
      });
    });

    document.querySelectorAll('[data-rel="page-link"]').forEach(a => {
      const page = a.getAttribute('data-page') || '';
      a.href = base + 'pages/' + page;
      a.addEventListener('click', (e)=>{
        e.preventDefault();
        closeAll(); 
        updateBackdrop(); 
        setBodyScroll(false);
        window.location.href = base + 'pages/' + page;
      });
    });

    // Handle home link
    document.querySelectorAll('[data-rel="home-link"]').forEach(a => {
      // If we're in pages folder, go back to root, otherwise stay at root
      a.href = base === '../' ? '../index.html' : './index.html';
      a.addEventListener('click', (e)=>{
        e.preventDefault();
        closeAll(); 
        updateBackdrop(); 
        setBodyScroll(false);
        window.location.href = base === '../' ? '../index.html' : './index.html';
      });
    });

  }

  function setupHamburgerMenu() {
    const hamburger = document.querySelector('.hamburger');
    const topnav = document.querySelector('.top-nav');
    
    if (!hamburger || !topnav) {
      console.log('Hamburger or topnav not found');
      return;
    }

    // Ensure backdrop exists
    let backdrop = document.getElementById('nav-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'nav-backdrop';
      document.body.appendChild(backdrop);
    }

    // Add close button to mobile menu
    const closeButton = document.createElement('div');
    closeButton.className = 'mobile-menu-close';
    closeButton.setAttribute('aria-label', 'بستن منو');
    topnav.appendChild(closeButton);

    function closeMenu() {
      topnav.classList.remove('open');
      hamburger.classList.remove('active');
      backdrop.classList.remove('show');
      document.body.classList.remove('nav-open');
    }

    function toggleMenu() {
      const isOpen = topnav.classList.contains('open');
      
      if (isOpen) {
        closeMenu();
      } else {
        topnav.classList.add('open');
        hamburger.classList.add('active');
        backdrop.classList.add('show');
        document.body.classList.add('nav-open');
      }
    }

    // Hamburger click handler
    hamburger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleMenu();
    });

    // Close menu when clicking backdrop
    backdrop.addEventListener('click', closeMenu);

    // Close menu when clicking close button
    closeButton.addEventListener('click', closeMenu);

    // Close menu when clicking nav links
    topnav.addEventListener('click', (e) => {
      if (e.target.matches('a')) {
        closeMenu();
      }
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && topnav.classList.contains('open')) {
        closeMenu();
      }
    });
  }

  function scrollToId(id){ const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior:'smooth', block:'start' }); }

  function fixImagePaths() {
    // Fix all images with data-src attribute
    const images = $$('img[data-src]');
    images.forEach(img => {
      const dataSrc = img.getAttribute('data-src');
      if (dataSrc) {
        img.src = basePath + dataSrc;
      }
    });
  }

  function setupStartNowButton() {
    // Setup "همین الان شروع کنید" button functionality
    document.addEventListener('click', (e) => {
      if (e.target.id === 'btn-start-now') {
        e.preventDefault();
        
        // Find the signup button in intro section
        const signupButton = document.querySelector('.intro-actions .btn.primary');
        if (signupButton) {
          // Smooth scroll to signup button
          signupButton.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          
          // Add a subtle highlight effect
          setTimeout(() => {
            signupButton.style.transform = 'scale(1.05)';
            signupButton.style.boxShadow = '0 0 20px rgba(247, 126, 45, 0.5)';
            
            setTimeout(() => {
              signupButton.style.transform = '';
              signupButton.style.boxShadow = '';
            }, 1000);
          }, 500);
        }
      }
    });
  }

  function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal');
    
    // Fallback: Show all elements after 2 seconds if observer doesn't work
    setTimeout(() => {
      revealElements.forEach(el => {
        if (!el.classList.contains('reveal-show')) {
          el.classList.add('reveal-show');
        }
      });
    }, 2000);
    
    // Check if IntersectionObserver is supported
    if (!window.IntersectionObserver) {
      // Fallback for older browsers
      revealElements.forEach(el => {
        el.classList.add('reveal-show');
      });
      return;
    }

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-show');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach((el) => {
      revealObserver.observe(el);
    });

    // Add staggered animation for intro cards
    const introCards = document.querySelectorAll('.intro-card');
    introCards.forEach((card, index) => {
      card.style.animationDelay = `${index * 0.1}s`;
    });
    
    // Show intro cards immediately if they're in viewport
    const introSection = document.getElementById('home-intro');
    if (introSection) {
      const rect = introSection.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        introCards.forEach(card => {
          card.classList.add('reveal-show');
        });
      }
    }
  }

  function handleRoute(){
    const h = location.hash || '';
    if (h.startsWith('#/os/')){
      const os = h.split('/')[2] || '';
      if (os) { renderApps(os); }
      scrollToId('os-section');
      return;
    }
    if (h === '#/dns') { scrollToId('dns-section'); return; }
    if (h === '#/account') { scrollToId('account-page'); return; }
  }

  // Note: fetching files requires serving via HTTP(s). Use a local server during development.
  document.addEventListener('DOMContentLoaded', async () => {
    // Global loading overlay
    let loading = document.getElementById('loading');
    if (!loading) {
      loading = document.createElement('div');
      loading.id = 'loading';
      loading.innerHTML = `
        <div class="loader">
          <div class="ring"></div>
          <div class="ring"></div>
          <div class="ring"></div>
          <div class="ring"></div>
        </div>
        <div class="text">در حال بارگذاری...</div>
      `;
      document.body.appendChild(loading);
    }

    await loadComponents();
    setupTabHandlers();
    await loadApps();

    // Lazy load page-specific scripts
    const base = location.pathname.includes('/pages/') ? '../' : '';
    if (document.getElementById('dns-section')) {
      const s = document.createElement('script');
      s.src = base + 'assets/js/dns.js';
      s.defer = true;
      document.head.appendChild(s);
    }
    if (document.getElementById('admin-page')) {
      const s = document.createElement('script');
      s.src = base + 'assets/js/admin.js';
      s.defer = true;
      document.head.appendChild(s);
    }
    if (document.getElementById('account-page')) {
      const s = document.createElement('script');
      s.src = base + 'assets/js/account.js';
      s.defer = true;
      document.head.appendChild(s);
    }


    // Route handling
    window.addEventListener('hashchange', handleRoute);
    handleRoute();

    // Initialize scroll reveal animations
    initScrollReveal();

    // Setup start now button
    setupStartNowButton();

    // Hide loading overlay
    loading?.remove();
  });
})();
