/* =========================================================
   Hiếu Thế — portfolio behaviour
   Vanilla JS + GSAP 3 (self-hosted) + ScrollTrigger.

   BUDGET NOTE
     Unauthenticated GitHub is 60 requests/hour/IP. We make EXACTLY
     two calls (user + repos) and derive everything else from them.

   MOTION NOTE
     Everything that moves is gated behind the site's motion system:
     <html data-motion="on|off|auto"> written by the header toggle.
     GSAP only takes over when motion is enabled AND the vendor
     scripts loaded; otherwise the CSS reveal path (IntersectionObserver
     + transitions) drives the page.
   ========================================================= */

(() => {
    'use strict';

    const GITHUB_USER = 'iamhieuxz';
    const API = `https://api.github.com`;

    /* Repo names that are scratch/testing rather than real work.
       Set by exact lowercase name, not guessed intent. */
    const EXCLUDED = new Set([
        'demo', 'test.github.io', 'fpt', 'fpt-reponsive',
        'iamhieuxz.github.io',   // this site itself
    ]);

    /* GitHub language colours, official set. Drives each card's
       accent and matching chip dot. The hero accent is shared. */
    const LANG_COLOR = {
        Python: '#3572A5',
        HTML: '#e34c26',
        CSS: '#563d7c',
        JavaScript: '#f1e05a',
        TypeScript: '#3178c6',
        Java: '#b07219',
        'C#': '#178600',
        'C++': '#f34b7d',
        PHP: '#4F5D95',
        Shell: '#89e051',
        Dart: '#00B4AB',
        Go: '#00ADD8',
        Rust: '#dea584',
        Ruby: '#701516',
        Vue: '#41b883',
        Other: '#71717A',
    };

    /* ----- utils ----- */
    const $  = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

    const escapeHtml = (str) => {
        const el = document.createElement('div');
        el.textContent = str ?? '';
        return el.innerHTML;
    };

    /* Only https URLs are ever rendered into href attributes. */
    const safeUrl = (u) => (typeof u === 'string' && /^https:\/\//.test(u) ? u : '#');

    const inViewport = (el, ratio = 0.92) =>
        el.getBoundingClientRect().top < window.innerHeight * ratio;

    /* ----- motion state (single source of truth) ----- */
    const MOTION_KEY = 'portfolio:motion';
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    let motionOverride = null;   // null = follow OS, true = force on, false = force off
    try {
        const saved = localStorage.getItem(MOTION_KEY);
        if (saved === 'on' || saved === 'off') motionOverride = saved === 'on';
    } catch { /* private mode — fall back to OS preference */ }

    const motionEnabled = () =>
        motionOverride === null ? !motionQuery.matches : motionOverride;

    /* Back-compat alias used throughout this file. */
    const prefersReducedMotion = () => !motionEnabled();

    function applyMotionState() {
        const on = motionEnabled();
        const mode = motionOverride === null ? 'auto' : (motionOverride ? 'on' : 'off');

        document.documentElement.dataset.motion = mode;

        const btn = document.getElementById('motion-toggle');
        if (btn) {
            btn.dataset.state = on ? 'on' : 'off';
            btn.setAttribute('aria-pressed', String(on));
            btn.setAttribute('aria-label',
                `Hiệu ứng chuyển động: ${on ? 'đang bật' : 'đang tắt'}. Bấm để ${on ? 'tắt' : 'bật'}.`);
        }

        document.dispatchEvent(new CustomEvent('portfolio:motionchange', {
            detail: { on },
        }));
    }

    function initMotionToggle() {
        applyMotionState();

        const btn = document.getElementById('motion-toggle');
        if (!btn) return;

        btn.addEventListener('click', () => {
            motionOverride = !motionEnabled();
            try {
                localStorage.setItem(MOTION_KEY, motionOverride ? 'on' : 'off');
            } catch { /* ignore */ }
            applyMotionState();
        });

        // If the user hasn't overridden, follow live OS changes.
        const onChange = () => { if (motionOverride === null) applyMotionState(); };
        if (motionQuery.addEventListener) motionQuery.addEventListener('change', onChange);
        else if (motionQuery.addListener) motionQuery.addListener(onChange);
    }

    async function getJSON(path) {
        const res = await fetch(`${API}${path}`, {
            headers: { Accept: 'application/vnd.github+json' },
        });
        if (!res.ok) {
            const err = new Error(`HTTP ${res.status}`);
            err.status = res.status;
            throw err;
        }
        return res.json();
    }

    const formatCount = (n) =>
        n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n);

    /* ---------------------------------------------------------------
       GSAP — hero intro, scroll reveals, section rules, decorative
       parallax, magnetic primary buttons. Fully reverted when the
       user turns motion off.
    --------------------------------------------------------------- */
    let gsapOn = false;
    let gsapCtx = null;
    let magnetCleanup = [];

    const gsapReady = () =>
        !!window.gsap && !!window.ScrollTrigger && motionEnabled();

    function initGSAP() {
        if (gsapOn || !gsapReady()) return;

        const gsap = window.gsap;
        const ST = window.ScrollTrigger;
        gsap.registerPlugin(ST);
        document.documentElement.classList.add('gsap-on');
        gsapOn = true;

        gsapCtx = gsap.context(() => {

            /* ---- hero name: unmask the poster lines ---- */
            const nameEl = $('.hero-name');
            if (nameEl) {
                nameEl.classList.add('is-in');
                const lines = $$('.mask-inner', nameEl);
                gsap.set(nameEl, { autoAlpha: 1, y: 0 });
                gsap.set(lines, { yPercent: 118 });
                gsap.to(lines, {
                    yPercent: 0,
                    duration: 1.05,
                    ease: 'power3.out',
                    stagger: 0.12,
                    delay: 0.08,
                });
            }

            /* ---- hero supporting copy fades in behind the name ---- */
            const heroFades = $$('.hero [data-reveal]')
                .filter(el => !el.classList.contains('hero-name'));
            if (heroFades.length) {
                gsap.set(heroFades, { autoAlpha: 0, y: 18 });
                gsap.to(heroFades, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.7,
                    ease: 'power3.out',
                    stagger: 0.075,
                    delay: 0.25,
                });
            }

            /* ---- below-the-fold reveals, batched per viewport ---- */
            const below = $$('[data-reveal]').filter(el => !el.closest('.hero'));
            const already = [];
            const deferred = [];
            below.forEach(el => (inViewport(el) ? already : deferred).push(el));

            if (deferred.length) gsap.set(deferred, { autoAlpha: 0, y: 22 });
            if (already.length) {
                if (prefersReducedMotion()) {
                    gsap.set(already, { autoAlpha: 1, y: 0 });
                } else {
                    gsap.fromTo(already,
                        { autoAlpha: 0, y: 22 },
                        { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' });
                }
            }
            if (deferred.length) {
                ST.batch(deferred, {
                    start: 'top 88%',
                    once: true,
                    onEnter: (batch) => gsap.to(batch, {
                        autoAlpha: 1, y: 0,
                        duration: 0.7, stagger: 0.08, ease: 'power3.out',
                        overwrite: true,
                    }),
                });
            }

            /* ---- section index hairline draws on scroll ---- */
            $$('.sec-index i').forEach((line) => {
                gsap.fromTo(line,
                    { scaleX: 0 },
                    {
                        scaleX: 1,
                        duration: 0.9,
                        ease: 'power3.inOut',
                        scrollTrigger: { trigger: line, start: 'top 94%', once: true },
                    });
            });

            /* ---- decorative parallax, scrub-linked to scroll ---- */
            const scrub = (el, y, trigger) => {
                if (!el) return;
                gsap.to(el, {
                    y,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: trigger || el.parentElement || el,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: 0.4,
                    },
                });
            };
            scrub($('.hero-grid'), 90, '.hero');
            scrub($('.hero-orbit'), -60, '.hero');
            scrub($('.work-field'), -70, '#work');
        });

        /* ---- magnetic primary buttons ---- */
        if (window.matchMedia('(hover: hover)').matches) {
            $$('.btn-primary').forEach((btn) => {
                const xTo = gsap.quickTo(btn, 'x', { duration: 0.45, ease: 'power3.out' });
                const yTo = gsap.quickTo(btn, 'y', { duration: 0.45, ease: 'power3.out' });
                const onMove = (e) => {
                    const r = btn.getBoundingClientRect();
                    xTo((e.clientX - r.left - r.width / 2) * 0.16);
                    yTo((e.clientY - r.top - r.height / 2) * 0.22);
                };
                const onLeave = () => { xTo(0); yTo(0); };
                btn.addEventListener('pointermove', onMove);
                btn.addEventListener('pointerleave', onLeave);
                magnetCleanup.push(() => {
                    btn.removeEventListener('pointermove', onMove);
                    btn.removeEventListener('pointerleave', onLeave);
                });
            });
        }
    }

    function stopGSAP() {
        if (!gsapOn) return;
        const gsap = window.gsap;
        gsapOn = false;

        if (gsapCtx) { gsapCtx.revert(); gsapCtx = null; }
        if (gsap) gsap.globalTimeline.clear();
        if (window.ScrollTrigger) window.ScrollTrigger.getAll().forEach(t => t.kill());

        magnetCleanup.forEach(fn => fn());
        magnetCleanup = [];

        document.documentElement.classList.remove('gsap-on');

        // Everything GSAP was driving becomes plainly visible; the
        // CSS reduced-motion gates take over from here.
        $$('[data-reveal], .card, .terminal, .mask-inner, .sec-index i').forEach((el) => {
            el.classList.add('is-in');
            el.style.removeProperty('opacity');
            el.style.removeProperty('visibility');
            el.style.removeProperty('transform');
        });
    }

    /* ---------------------------------------------------------------
       Scroll progress hairline — scroll-linked state, safe under
       reduced motion (it tracks the thumb, it doesn't animate alone).
    --------------------------------------------------------------- */
    function initProgress() {
        const bar = $('#progress');
        if (!bar) return;
        let raf = 0;
        const update = () => {
            raf = 0;
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const p = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
            bar.style.transform = `scaleX(${p})`;
        };
        window.addEventListener('scroll', () => {
            if (!raf) raf = requestAnimationFrame(update);
        }, { passive: true });
        window.addEventListener('resize', update);
        update();
    }

    /* ----- CSS reveal path (no GSAP / motion off) ----- */
    function initReveal() {
        const targets = $$('[data-reveal]');
        if (!targets.length) return;

        if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
            targets.forEach(el => el.classList.add('is-in'));
            return;
        }

        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-in');
                io.unobserve(entry.target);
            });
        }, { rootMargin: '0px', threshold: 0 });

        targets.forEach((el, i) => {
            // Hero sits above the fold — stagger it on first paint.
            if (el.closest('section')?.querySelector('h1')) {
                el.style.transitionDelay = `${i * 70}ms`;
                requestAnimationFrame(() => el.classList.add('is-in'));
            }
            io.observe(el);
        });
    }

    /* ---------------------------------------------------------------
       CSS-var parallax fallback (used when GSAP is not active).
    --------------------------------------------------------------- */
    function initParallax() {
        const sections = $$('main section');
        if (!sections.length || !('IntersectionObserver' in window)) return;

        let ticking = false;
        const apply = () => {
            ticking = false;
            const vpMid = window.innerHeight * 0.5;
            sections.forEach(sec => {
                const r = sec.getBoundingClientRect();
                const d = Math.max(-window.innerHeight,
                    Math.min(window.innerHeight, vpMid - r.top - r.height * 0.5));
                sec.style.setProperty('--section-scroll', String(d | 0));
            });
        };
        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(apply);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        apply();
    }

    /* ---------------------------------------------------------------
       Pointer-driven 3D tilt for cards and the terminal.
    --------------------------------------------------------------- */
    function initTilt() {
        if (prefersReducedMotion()) return;
        const supportsHover = window.matchMedia('(hover: hover)').matches;
        if (!supportsHover) return;

        const items = $$('[data-tilt]');
        if (!items.length) return;

        let pending = new Set();
        let raf = 0;

        const flush = () => {
            raf = 0;
            pending.forEach(el => {
                const r = el._rect;
                const px = el._px ?? 0.5;
                const py = el._py ?? 0.5;
                const tiltX = (py - 0.5) * -6;
                const tiltY = (px - 0.5) * 6;
                el.style.transform =
                    `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(0)`;
                el.style.setProperty('--mx', `${px * 100}%`);
                el.style.setProperty('--my', `${py * 100}%`);
            });
            pending.clear();
        };

        const queue = (el) => {
            pending.add(el);
            if (!raf) raf = requestAnimationFrame(flush);
        };

        items.forEach(el => {
            if (el._tiltBound) return;
            el._tiltBound = true;
            el.addEventListener('pointerenter', () => { el._rect = el.getBoundingClientRect(); });
            el.addEventListener('pointermove', (e) => {
                const r = el._rect || el.getBoundingClientRect();
                el._rect = r;
                el._px = (e.clientX - r.left) / r.width;
                el._py = (e.clientY - r.top) / r.height;
                queue(el);
            }, { passive: true });
            el.addEventListener('pointerleave', () => {
                el.style.transform = '';
                el.style.removeProperty('--mx');
                el.style.removeProperty('--my');
            });
        });
    }

    /* ---------------------------------------------------------------
       Stagger entry for grid items — CSS path.
    --------------------------------------------------------------- */
    function stagger(elements, baseDelay = 0, step = 60) {
        elements.forEach((el, i) => {
            el.dataset.stagger = '';
            el.style.transitionDelay = `${baseDelay + i * step}ms`;
            requestAnimationFrame(() => {
                requestAnimationFrame(() => el.classList.add('is-in'));
            });
        });
    }

    /* GSAP-aware card reveal — whole-card links injected after fetch. */
    function revealCards(cards) {
        if (!cards.length) return;

        if (gsapOn) {
            const gsap = window.gsap;
            const near = [];
            const far = [];
            cards.forEach(c => (inViewport(c) ? near : far).push(c));

            if (far.length) gsap.set(far, { autoAlpha: 0, y: 18 });
            if (near.length) {
                gsap.to(near, {
                    autoAlpha: 1, y: 0, duration: 0.55,
                    stagger: 0.06, ease: 'power3.out',
                });
            }
            if (far.length) {
                window.ScrollTrigger.batch(far, {
                    start: 'top 92%',
                    once: true,
                    onEnter: (batch) => gsap.to(batch, {
                        autoAlpha: 1, y: 0, duration: 0.55,
                        stagger: 0.06, ease: 'power3.out',
                        overwrite: true,
                    }),
                });
            }
        } else {
            stagger(cards, 80, 55);
        }
    }

    /* ---------------------------------------------------------------
       Header + mobile nav + scrollspy
    --------------------------------------------------------------- */
    function initHeader() {
        const header = $('#site-header');
        const toggle = $('#menu-toggle');
        const mobileNav = $('#mobile-nav');
        const toTop = $('#to-top');

        const onScroll = () => {
            const y = window.scrollY;
            header.classList.toggle('is-scrolled', y > 8);
            if (y > 480) {
                toTop.hidden = false;
                requestAnimationFrame(() => {
                    toTop.classList.remove('translate-y-2', 'opacity-0');
                    toTop.classList.add('items-center');
                });
            } else {
                toTop.classList.add('translate-y-2', 'opacity-0');
                toTop.classList.remove('items-center');
                setTimeout(() => { if (window.scrollY <= 480) toTop.hidden = true; }, 200);
            }
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        toTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        });

        const setNav = (open) => {
            mobileNav.classList.toggle('hidden', !open);
            toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
            $('[data-nav-line]', toggle)?.setAttribute(
                'd', open ? 'M4 4l8 8M12 4l-8 8' : 'M2 4.5h12M2 8h12M2 11.5h12'
            );
        };
        toggle.addEventListener('click', () =>
            setNav(toggle.getAttribute('aria-expanded') !== 'true'));
        $$('#mobile-nav a').forEach(a =>
            a.addEventListener('click', () => setNav(false)));
        window.addEventListener('keydown', e => {
            if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
                setNav(false);
                toggle.focus();
            }
        });

        const sections = $$('main section[id]');
        const links = new Map();
        $$('#desktop-nav .nav-link').forEach(a => links.set(a.getAttribute('href'), a));
        if (!sections.length || !links.size) return;

        const spy = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const link = links.get(`#${entry.target.id}`);
                if (!link) return;
                if (entry.isIntersecting) {
                    links.forEach(l => l.removeAttribute('aria-current'));
                    link.setAttribute('aria-current', 'true');
                } else if (link.getAttribute('aria-current') === 'true') {
                    // Leaving the band with no replacement → clear stale state.
                    link.removeAttribute('aria-current');
                }
            });
        }, { rootMargin: '-20% 0px -70% 0px' });

        sections.forEach(s => spy.observe(s));
    }

    /* ---------------------------------------------------------------
       Animated number, tabular-numeric.
    --------------------------------------------------------------- */
    function countUp(el, target) {
        if (prefersReducedMotion()) { el.textContent = String(target); return; }
        const dur = 700;
        const start = performance.now();
        const step = (now) => {
            const p = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = String(Math.round(target * eased));
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    /* Counter that ticks up as cards hydrate. */
    function startCounter(target) {
        const el = document.querySelector('#counter-count');
        const label = document.querySelector('#counter-label');
        const prefix = document.querySelector('#counter-prefix');
        if (!el) return;
        if (prefersReducedMotion()) {
            el.textContent = String(target);
            if (label) label.textContent = 'đã nạp từ GitHub';
            if (prefix) prefix.textContent = '✓';
            return;
        }
        if (label && !label.dataset.typed) {
            label.dataset.typed = '1';
            const phrases = [
                'Đang kéo dữ liệu từ GitHub',
                'Đang lọc bỏ repo scratch…',
                'Sắp xong…',
            ];
            let pi = 0, ci = 0, deleting = false;
            const tickType = () => {
                const p = phrases[pi];
                ci += deleting ? -1 : 1;
                label.textContent = p.slice(0, ci);
                let wait = deleting ? 30 : 55;
                if (!deleting && ci === p.length) { wait = 1200; deleting = true; }
                else if (deleting && ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; wait = 200; }
                setTimeout(tickType, wait);
            };
            tickType();
        }
        const obs = new IntersectionObserver((es) => {
            if (es[0].isIntersecting) {
                countUp(el, target);
                if (prefix) setTimeout(() => { prefix.textContent = '✓'; }, 600);
                obs.disconnect();
            }
        });
        obs.observe(el);
    }

    /* ---------------------------------------------------------------
       Projects — whole cards are anchors; the project IS the link.
    --------------------------------------------------------------- */
    const projectGrid = $('#repo-grid');
    const langFilters = $('#lang-filters');
    const repoStatus  = $('#repo-status');

    let allRepos = [];
    let activeLang = 'all';

    function starIcon() {
        return '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 .25l2.06 4.18 4.61.67-3.34 3.25.79 4.6L8 10.77 3.88 12.95l.79-4.6L1.33 5.1l4.61-.67L8 .25z"/></svg>';
    }
    function forkIcon() {
        return '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5 3.25a2.25 2.25 0 1 0-2.12 3.02v.5a2.5 2.5 0 0 0 2.5 2.5H7v1.44a2.25 2.25 0 1 0 1.5 0V9.27h1.62a2.5 2.5 0 0 0 2.5-2.5v-.5A2.25 2.25 0 1 0 11 4.08v.69a1 1 0 0 1-1 1H5.88a1 1 0 0 1-1-1v-.5A2.25 2.25 0 0 0 5 3.25z"/></svg>';
    }
    function arrowIcon() {
        return '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 11 11 5M6 5h5v5"/></svg>';
    }

    function renderCard(repo, i) {
        const lang = repo.language || 'Other';
        const color = LANG_COLOR[lang] || LANG_COLOR.Other;

        const desc = repo.description
            ? `<p class="card-desc">${escapeHtml(repo.description)}</p>`
            : `<p class="card-desc is-empty">Chưa có mô tả trên GitHub.</p>`;

        const metrics = [
            repo.stargazers_count > 0 ? `<span class="card-stat star">${starIcon()}${formatCount(repo.stargazers_count)}</span>` : '',
            repo.forks_count > 0      ? `<span class="card-stat">${forkIcon()}${formatCount(repo.forks_count)}</span>` : '',
        ].filter(Boolean).join('') || '<span>Chưa có chỉ số</span>';

        const index = String(i + 1).padStart(2, '0');

        /* Whole card is an <a> — clicking anywhere opens the repo.
           No nested links inside, so the markup stays valid. */
        return `
        <a class="card" data-tilt href="${safeUrl(repo.html_url)}" target="_blank" rel="noopener"
           style="--card-accent:${color}">
            <span class="card-glow" aria-hidden="true"></span>
            <span class="card-index" aria-hidden="true">${index}</span>
            <span class="card-toprow">
                <span class="card-lang"><span class="card-lang-dot"></span>${escapeHtml(lang)}</span>
                <span class="card-kind">${repo.fork ? 'fork' : 'source'}</span>
            </span>
            <h3 class="card-title">${escapeHtml(repo.name)}</h3>
            ${desc}
            <p class="card-url">
                ${arrowIcon()}
                github.com/iamhieuxz/<b>${escapeHtml(repo.name)}</b>
            </p>
            <span class="card-foot">
                <span>${relativeTime(repo.updated_at)}</span>
                <span class="flex items-center gap-3">${metrics}</span>
            </span>
        </a>`;
    }

    /* "5 days ago" / "3 hours ago" — honest & no library needed. */
    function relativeTime(iso) {
        const then = new Date(iso).getTime();
        const diff = Date.now() - then;
        if (Number.isNaN(diff)) return '';
        const min = Math.floor(diff / 60000);
        if (min < 1) return 'vừa xong';
        if (min < 60) return `${min} phút trước`;
        const hr = Math.floor(min / 60);
        if (hr < 24) return `${hr} giờ trước`;
        const d = Math.floor(hr / 24);
        if (d < 30) return `${d} ngày trước`;
        const mo = Math.floor(d / 30);
        if (mo < 12) return `${mo} tháng trước`;
        const y = Math.floor(mo / 12);
        return `${y} năm trước`;
    }

    function renderGrid() {
        const list = activeLang === 'all'
            ? allRepos
            : allRepos.filter(r => (r.language || 'Other') === activeLang);

        if (!list.length) {
            projectGrid.innerHTML = `
                <div class="state">
                    <p class="state-title">Không có repo nào ở nhóm này</p>
                    <p class="state-body">Thử bộ lọc khác.</p>
                </div>`;
            return;
        }

        projectGrid.innerHTML = list.map(renderCard).join('');
        projectGrid.setAttribute('aria-busy', 'false');
        repoStatus.textContent = `Hiển thị ${list.length} dự án.`;

        revealCards($$('.card', projectGrid));
        initTilt();                              // re-bind the new cards
        window.ScrollTrigger?.refresh();
    }

    function renderFilters() {
        const counts = new Map();
        allRepos.forEach(r => {
            const lang = r.language || 'Other';
            counts.set(lang, (counts.get(lang) || 0) + 1);
        });
        const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

        const chips = [
            `<button class="chip" data-lang="all" aria-pressed="true">Tất cả
                 <span class="text-current/60">${allRepos.length}</span></button>`,
            ...sorted.map(([lang, n]) => `
                <button class="chip" data-lang="${escapeHtml(lang)}" aria-pressed="false">
                    <span class="chip-dot" style="background-color:${LANG_COLOR[lang] || '#71717A'}"></span>
                    ${escapeHtml(lang)} <span class="text-current/60">${n}</span>
                </button>`),
        ];
        langFilters.innerHTML = chips.join('');

        langFilters.addEventListener('click', e => {
            const btn = e.target.closest('.chip');
            if (!btn) return;
            activeLang = btn.dataset.lang;
            $$('.chip', langFilters).forEach(c =>
                c.setAttribute('aria-pressed', String(c === btn)));
            renderGrid();
        });
    }

    function renderEmpty() {
        projectGrid.innerHTML = `
            <div class="state">
                <p class="state-title">Chưa có repo công khai nào</p>
                <p class="state-body">Các dự án sẽ hiện ở đây ngay khi được public.</p>
            </div>`;
        projectGrid.setAttribute('aria-busy', 'false');
        langFilters.innerHTML = '';
    }

    function renderError(status) {
        const rateLimited = status === 403 || status === 429;
        projectGrid.innerHTML = `
            <div class="state">
                <p class="state-title">
                    ${rateLimited ? 'Đã vượt giới hạn truy cập GitHub API' : 'Không tải được danh sách dự án'}
                </p>
                <p class="state-body">
                    ${rateLimited
                        ? 'Giới hạn 60 lượt/giờ cho mỗi IP. Trang sẽ tự thử lại sau ít phút.'
                        : 'Vui lòng kiểm tra kết nối mạng.'}
                </p>
                <a class="btn btn-ghost mt-4" href="https://github.com/${GITHUB_USER}?tab=repositories"
                   target="_blank" rel="noopener">Xem trên GitHub</a>
            </div>`;
        projectGrid.setAttribute('aria-busy', 'false');
        langFilters.innerHTML = '';
    }

    /* ---------------------------------------------------------------
       Stack — fill bars animate from the left via scaleX.
    --------------------------------------------------------------- */
    function renderStack(repos) {
        const counts = new Map();
        repos.forEach(r => {
            const lang = r.language || 'Other';
            counts.set(lang, (counts.get(lang) || 0) + 1);
        });
        const total = [...counts.values()].reduce((a, b) => a + b, 0);
        const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);

        $('#stack-list').innerHTML = rows.map(([lang, n]) => {
            const pct = Math.round((n / total) * 100);
            return `
            <div class="stack-row">
                <span class="stack-name">${escapeHtml(lang)}</span>
                <div class="stack-track">
                    <div class="stack-fill" data-pct="${pct}" style="background-color:${LANG_COLOR[lang] || '#71717A'}"></div>
                </div>
                <span class="stack-pct">${pct}%</span>
            </div>`;
        }).join('');

        requestAnimationFrame(() => {
            $$('.stack-fill').forEach((f) => {
                f.style.transform = `scaleX(${Number(f.dataset.pct) / 100})`;
            });
        });
    }

    /* ---------------------------------------------------------------
       Terminal — typed whoami output. Reduced-motion users see the
       whole thing instantly (content, not decoration).
    --------------------------------------------------------------- */
    const TERM_HEADER = [
        { cmd: 'whoami',  output: 'hiuexz' },
        { cmd: 'git log --oneline | head -3', output: [
            `a1b2c3d  ${new Date().getFullYear()}-10 — viết lại portfolio: poster type + blueprint`,
            'f1e2d3c  dựng brand kit: monogram "ih" + wordmark iamhieuxz_',
            'c1a2b3d  xác minh mọi text qua GitHub API chứ không bịa',
        ]},
        { cmd: 'open https://github.com/iamhieuxz/issues/new', output:
            '↳ mở trình duyệt · TP. Hồ Chí Minh, Việt Nam' },
    ];

    const TERM_PROFILE = () => ({
        name: 'Hiếu Thế',
        alias: 'iamhieuxz',
        role: 'Front-End Developer',
        location: 'TP. Hồ Chí Minh, Việt Nam',
        since: userCreatedAt ? new Date(userCreatedAt).getFullYear() : new Date().getFullYear(),
        looking_for: ['Front-End', 'freelance UI engineering'],
        stack: ['HTML', 'CSS', 'JavaScript', 'Python'],
    });

    let userCreatedAt = null;

    function renderJSON(parent, obj) {
        const lines = JSON.stringify(obj, null, 2).split('\n');

        lines.forEach((raw) => {
            const lead = raw.match(/^(\s*)/)[0];
            const body = raw.slice(lead.length);

            const line = document.createElement('p');
            line.className = 'term-line';
            line.appendChild(document.createTextNode(lead.replace(/\s/g, ' ')));

            const re = /("(?:[^"\\]|\\.)*"\s*:)|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?)|([{}\[\],])|(\s+)|([^\s"{}\[\],:-]+|-)/g;
            let m;
            while ((m = re.exec(body)) !== null) {
                const [_, key, str, num, punc, _ws, other] = m;
                if (key) {
                    const colonAt = key.lastIndexOf(':');
                    const ks = key.slice(0, colonAt);
                    const cs = key.slice(colonAt);

                    const ksSpan = document.createElement('span');
                    ksSpan.className = 'term-key';
                    ksSpan.textContent = ks;
                    line.appendChild(ksSpan);

                    const cSpan = document.createElement('span');
                    cSpan.className = 'term-mute';
                    cSpan.textContent = cs;
                    line.appendChild(cSpan);
                } else if (str) {
                    const span = document.createElement('span');
                    span.className = 'term-str';
                    span.textContent = str;
                    line.appendChild(span);
                } else if (num) {
                    const span = document.createElement('span');
                    span.className = 'term-num';
                    span.textContent = num;
                    line.appendChild(span);
                } else if (punc) {
                    const span = document.createElement('span');
                    span.className = 'term-mute';
                    span.textContent = punc;
                    line.appendChild(span);
                } else if (other !== undefined) {
                    const span = document.createElement('span');
                    span.className = 'term-out';
                    span.textContent = other;
                    line.appendChild(span);
                }
            }

            if (line.childNodes.length === 1) {
                line.appendChild(document.createTextNode(body));
            }
            parent.appendChild(line);
        });
    }

    function scrollTerminalToBottom(el) {
        requestAnimationFrame(() => {
            el.scrollTop = el.scrollHeight;
        });
    }

    function typeInto(el, char, speed) {
        return new Promise(res => {
            const write = () => {
                el.textContent += char;
                res();
            };
            if (el.textContent.length > 18 && Math.random() < 0.15) {
                setTimeout(write, speed + Math.random() * 70);
            } else {
                setTimeout(write, speed + Math.random() * 20 - 10);
            }
        });
    }

    async function runPrompt(parent, cmd, speed = 24) {
        const prompt = document.createElement('p');
        prompt.className = 'term-line term-prompt';
        parent.appendChild(prompt);
        for (const ch of cmd) await typeInto(prompt, ch, speed);
        return prompt;
    }

    async function runOutput(parent, line, speed = 14) {
        if (Array.isArray(line)) {
            for (const row of line) {
                const el = document.createElement('p');
                el.className = 'term-line term-mute';
                parent.appendChild(el);
                for (const ch of row) await typeInto(el, ch, speed);
            }
            return;
        }
        const el = document.createElement('p');
        el.className = 'term-line term-out';
        parent.appendChild(el);
        for (const ch of String(line)) await typeInto(el, ch, speed);
    }

    let terminalBooted = false;

    async function bootTerminal() {
        if (terminalBooted) return;
        const root = $('#term-body');
        if (!root) return;
        terminalBooted = true;

        root.querySelector('[aria-live]').textContent = 'Bắt đầu giới thiệu.';

        const fullList = [
            TERM_HEADER[0],
            { cmd: 'cat profile.json', isJson: true, output: TERM_PROFILE() },
            ...TERM_HEADER.slice(1),
        ];

        if (prefersReducedMotion()) {
            fullList.forEach((ln) => {
                const p = document.createElement('p');
                p.className = 'term-line term-prompt';
                p.textContent = ln.cmd;
                root.appendChild(p);

                if (ln.isJson) {
                    renderJSON(root, ln.output);
                } else if (Array.isArray(ln.output)) {
                    ln.output.forEach(row => {
                        const rowEl = document.createElement('p');
                        rowEl.className = 'term-line term-mute';
                        rowEl.textContent = row;
                        root.appendChild(rowEl);
                    });
                } else if (ln.output) {
                    const outEl = document.createElement('p');
                    outEl.className = 'term-line term-out';
                    outEl.textContent = ln.output;
                    root.appendChild(outEl);
                }
                root.appendChild(document.createElement('p'));
            });
            const cur = document.createElement('span');
            cur.className = 'term-cursor';
            root.appendChild(cur);
            return;
        }

        for (const ln of fullList) {
            await runPrompt(root, ln.cmd);
            if (ln.isJson) renderJSON(root, ln.output);
            else if (ln.output) await runOutput(root, ln.output);

            root.appendChild(document.createElement('p'));
            scrollTerminalToBottom(root);
            await new Promise(res => setTimeout(res, 320));
        }

        const cur = document.createElement('span');
        cur.className = 'term-cursor';
        root.appendChild(cur);
        scrollTerminalToBottom(root);
    }

    /* ---------------------------------------------------------------
       Stats
    --------------------------------------------------------------- */
    function setStat(name, value) {
        const el = $(`[data-stat="${name}"]`);
        if (el) countUp(el, value);
    }

    function initStats(user, repoList) {
        setStat('repos', user.public_repos ?? 0);
        setStat('followers', user.followers ?? 0);

        const langCount = new Set(repoList.map(r => r.language).filter(Boolean)).size;
        setStat('langs', langCount);

        const joined = user.created_at ? new Date(user.created_at) : null;
        userCreatedAt = user.created_at || null;
        if (joined && !Number.isNaN(joined.getTime())) {
            const years = Math.max(
                1,
                Math.floor((Date.now() - joined.getTime()) / (365.25 * 24 * 3600 * 1000))
            );
            setStat('since', joined.getFullYear());
            setStat('years', years);
        }
    }

    /* ---------------------------------------------------------------
       Boot
    --------------------------------------------------------------- */
    async function loadGitHub() {
        const [user, repos] = await Promise.all([
            getJSON(`/users/${GITHUB_USER}`),
            getJSON(`/users/${GITHUB_USER}/repos?sort=updated&per_page=100`)
                .catch(err => { err.degraded = true; throw err; }),
        ]);

        initStats(user, repos.filter(r => !r.fork));

        if (repos.degraded) throw repos;

        const useful = repos
            .filter(r => !r.fork && !EXCLUDED.has(r.name.toLowerCase()))
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

        if (!useful.length) { renderEmpty(); return; }

        allRepos = useful;
        startCounter(allRepos.length);
        renderFilters();
        renderGrid();
        renderStack(allRepos);

        const about = document.querySelector('#about');
        if (about && !prefersReducedMotion() && 'IntersectionObserver' in window) {
            const io = new IntersectionObserver((es) => {
                if (es[0].isIntersecting) {
                    bootTerminal();
                    io.disconnect();
                }
            }, { threshold: 0.15 });
            io.observe(about);
        } else {
            bootTerminal();
        }

        const term = document.querySelector('.terminal');
        if (term) {
            const revealIO = new IntersectionObserver((es) => {
                if (es[0].isIntersecting) {
                    term.classList.add('is-in');
                    revealIO.disconnect();
                }
            }, { threshold: 0.1 });
            revealIO.observe(term);
        }

        window.ScrollTrigger?.refresh();
    }

    function boot() {
        const yearEl = $('[data-year]');
        if (yearEl) yearEl.textContent = String(new Date().getFullYear());

        initProgress();

        document.addEventListener('portfolio:motionchange', (e) => {
            if (e.detail.on) initGSAP();
            else stopGSAP();
        });

        initMotionToggle();          // dispatches the initial state

        if (!gsapOn) initReveal();   // CSS fallback path
        if (!gsapOn) initParallax(); // CSS-var fallback (GSAP scrubs otherwise)

        initTilt();
        initHeader();

        loadGitHub().catch(err => {
            console.error('[portfolio] GitHub load failed:', err);
            renderError(err.status);
            bootTerminal();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
