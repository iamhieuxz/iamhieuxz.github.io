/* =========================================================
   Hiếu Thế — portfolio behaviour
   Vanilla JS. No AOS, no Typed.js, no framework.

   BUDGET NOTE
     Unauthenticated GitHub is 60 requests/hour/IP. We make EXACTLY
     two calls (user + repos) and derive everything else from them.

   MOTION NOTE
     Everything that moves is gated behind prefers-reduced-motion.
     The same gate also disables 3-D tilt and stack parallax because
     those don't degrade gracefully — they reset to flat if disabled.
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

    /* Single source of truth for motion state.
       Order matters: an explicit user choice on the toggle wins over
       the OS setting, so someone who enabled animations in Windows can
       still switch them off here, and vice versa. */
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

    /* ----- reveal ----- */
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
       Multi-section parallax — drives --section-scroll on every
       section, so each can pick its own depth ratio. rAF-throttled.
    --------------------------------------------------------------- */
    /* ---------------------------------------------------------------
       Multi-section parallax — drives --section-scroll on every
       section, so each can pick its own depth ratio. rAF-throttled.
       Kept running under reduced-motion: the travel is only a few
       pixels and is scroll-linked (not autonomous), which is the
       kind of motion reduced-motion users tolerate. CSS resets the
       transform anyway if the user prefers it fully off.
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
                // Distance of section's vertical center from the viewport mid,
                // clamped so a deeply scrolled-away section doesn't yank.
                const d = Math.max(-window.innerHeight, Math.min(window.innerHeight, vpMid - r.top - r.height * 0.5));
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
       Pointer-driven 3D tilt + inner parallax for cards and the
       terminal. rAF-throttled. Skipped on touch (no hover) and on
       reduced-motion users (no graceful fallback).
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
                const tiltX = (py - 0.5) * -6;   // -3 .. 3 deg
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

        const onEnter = (el) => {
            el._rect = el.getBoundingClientRect();
        };
        const onMove = (e) => {
            const el = e.currentTarget;
            const r = el._rect || el.getBoundingClientRect();
            el._rect = r;
            el._px = (e.clientX - r.left) / r.width;
            el._py = (e.clientY - r.top) / r.height;
            queue(el);
        };
        const onLeave = (el) => {
            el.style.transform = '';
            el.style.removeProperty('--mx');
            el.style.removeProperty('--my');
        };

        items.forEach(el => {
            el.addEventListener('pointerenter', () => onEnter(el));
            el.addEventListener('pointermove', onMove, { passive: true });
            el.addEventListener('pointerleave', () => onLeave(el));
        });
    }

    /* ---------------------------------------------------------------
       Stagger entry for grid items that all enter at once.
       Cards get index-based delay; terminal uses left+top auto-stagger.
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

    /* ---------------------------------------------------------------
       Counter that ticks up as cards hydrate (visually delightful)
    --------------------------------------------------------------- */
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
        // Typing animation for the label
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
        // Counter counts up from 0 to target once the grid is hydrated
        const obs = new IntersectionObserver((es) => {
            if (es[0].isIntersecting) {
                countUp(el, target);
                if (prefix) {
                    setTimeout(() => { prefix.textContent = '✓'; }, 600);
                }
                obs.disconnect();
            }
        });
        obs.observe(el);
    }

    /* ---------------------------------------------------------------
       Projects — render cards with per-language accent.
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
    function extIcon() {
        return '<svg class="card-external" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 3.5H3.5v9h9v-3M9.5 2.5h4v4M13 3l-6.5 6.5"/></svg>';
    }

    function renderCard(repo) {
        const lang = repo.language || 'Other';
        const color = LANG_COLOR[lang] || LANG_COLOR.Other;

        const desc = repo.description
            ? `<p class="card-desc">${escapeHtml(repo.description)}</p>`
            : `<p class="card-desc is-empty">Chưa có mô tả trên GitHub.</p>`;

        const metrics = [
            repo.stargazers_count > 0 ? `<span class="card-stat star">${starIcon()}${formatCount(repo.stargazers_count)}</span>` : '',
            repo.forks_count > 0      ? `<span class="card-stat">${forkIcon()}${formatCount(repo.forks_count)}</span>` : '',
        ].filter(Boolean).join('') || '<span class="card-mute">Chưa có chỉ số</span>';

        /* Per-card CSS custom props used by .card-glow, .card-lang,
           .card-title:hover, .card-foot, .card-external. One source
           of truth per card so the whole card reads as one accent. */
        const style = `--card-accent:${color};`;

        return `
        <article class="card" data-tilt style="${style}">
            <span class="card-glow" aria-hidden="true"></span>
            ${extIcon()}
            <div class="flex items-center gap-2">
                <span class="card-lang">
                    <span class="card-lang-dot"></span>${escapeHtml(lang)}
                </span>
                <span class="text-xs text-ink-mute">${repo.fork ? 'fork' : 'source'}</span>
            </div>
            <a class="card-title" href="${repo.html_url}" target="_blank" rel="noopener"
               style="${style.replace('--card-accent', 'color')}">${escapeHtml(repo.name)}</a>
            ${desc}
            <div class="card-foot">
                <span>${relativeTime(repo.updated_at)}</span>
                <span class="flex items-center gap-3">${metrics}</span>
            </div>
        </article>`;
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

        stagger($$('.card', projectGrid), 80, 55);
        initTilt();    // re-bind the new cards
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
       Stack
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
                    <div class="stack-fill" style="width:${pct}%;background-color:${LANG_COLOR[lang] || '#71717A'}"></div>
                </div>
                <span class="stack-pct">${pct}%</span>
            </div>`;
        }).join('');
    }

    /* ---------------------------------------------------------------
       Terminal — type-typed whoami output. Reduced-motion users see
       the whole thing instantly (which is fine — it's content, not
       decoration). The static header is constructed up-front; the
       year-dependent JSON line is filled in just before typing.
    --------------------------------------------------------------- */
    const TERM_HEADER = [
        { cmd: 'whoami',  output: 'hiuexz' },
        { cmd: 'git log --oneline | head -3', output: [
            `a1b2c3d  ${new Date().getFullYear()}-10 — giữ portfolio ít "cutesy" hơn`,
            'f1e2d3c  tắt gradient blob & typewriter; giữ type chứ không để trống',
            'c1a2b3d  xác minh mọi text qua GitHub API chứ không bịa',
        ]},
        { cmd: 'open https://github.com/iamhieuxz/issues/new', output:
            '↳ mở trình duyệt · trang trời bắc, Việt Nam' },
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

    function renderTerminalLine(parent, parts, opts = {}) {
        const line = document.createElement('div');
        line.className = 'term-line';
        parts.forEach((p) => {
            const span = document.createElement('span');
            span.className = p.cls || '';
            span.textContent = p.text || '';
            line.appendChild(span);
        });
        parent.appendChild(line);
        return line;
    }

    /* Wait a frame so layout is stable before we measure scrollHeight. */
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
            // Speed jitter keeps it from feeling robotic.
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

    function renderJSON(parent, obj) {
        // Render each JSON line with lightweight syntax highlighting.
        // We deliberately strip only leading whitespace from the source
        // string and rebuild the indent via padding — that keeps the
        // content matched by the regex (key + colon + value) intact.
        const lines = JSON.stringify(obj, null, 2).split('\n');

        lines.forEach((raw) => {
            const lead = raw.match(/^(\s*)/)[0];
            const body = raw.slice(lead.length);

            const line = document.createElement('p');
            line.className = 'term-line';
            // Preserve indentation using non-breaking spaces so they
            // don't collapse and don't break word-wrap.
            line.appendChild(document.createTextNode(lead.replace(/\s/g, ' ')));

            // Captures: 1: "key":   2: "string"   3: number   4: punctuation
            const re = /("(?:[^"\\]|\\.)*"\s*:)|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?)|([{}\[\],])|(\s+)|([^\s"{}\[\],:-]+|-)/g;
            let m;
            while ((m = re.exec(body)) !== null) {
                const [_, key, str, num, punc, _ws, other] = m;
                if (key) {
                    const colonAt = key.lastIndexOf(':');
                    const ks = key.slice(0, colonAt);
                    const cs = key.slice(colonAt);  // ":"
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

            // If the regex didn't match anything (e.g. a bare bare line),
            // fall back to the raw body so nothing is lost.
            if (line.childNodes.length === 1) {
                line.appendChild(document.createTextNode(body));
            }
            parent.appendChild(line);
        });
    }

    async function bootTerminal() {
        const root = $('#term-body');
        if (!root) return;

        // Inline screen-reader announcer
        root.querySelector('[aria-live]').textContent = 'Bắt đầu giới thiệu.';

        // Build the full list at runtime so we can read userCreatedAt (set
        // by loadGitHub). The static + dynamic seam is just one line.
        const fullList = [
            TERM_HEADER[0],
            { cmd: 'cat profile.json', isJson: true, output: TERM_PROFILE() },
            ...TERM_HEADER.slice(1),
        ];

        if (prefersReducedMotion()) {
            // Reduced motion: show everything at once. This is content,
            // not decoration, so instant rendering is the correct answer.
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

            // Blank gap line between commands
            root.appendChild(document.createElement('p'));

            scrollTerminalToBottom(root);
            await new Promise(res => setTimeout(res, 320));
        }

        // Final blinking cursor
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
        startCounter(allRepos.length);    // animated counter up to N
        renderFilters();
        renderGrid();
        renderStack(allRepos);

        // Terminal shows after the user has begun reading: footer is in view
        // path; the about section's IntersectionObserver triggers it.
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
            bootTerminal();   // reduced-motion: render inline instantly
        }

        // Reveal the about section from below the fold. The data-reveal
        // markup on .terminal takes care of the frame; we just kick it
        // when the section enters view.
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
    }

    function boot() {
        const yearEl = $('[data-year]');
        if (yearEl) yearEl.textContent = String(new Date().getFullYear());

        initMotionToggle();
        initReveal();
        initParallax();
        initTilt();
        initHeader();

        loadGitHub().catch(err => {
            console.error('[portfolio] GitHub load failed:', err);
            renderError(err.status);
            // Boot terminal anyway with whatever data we had
            bootTerminal();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();