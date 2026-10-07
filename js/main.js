/* ============================================
   HIẾU XZ — Main JavaScript
   - AOS animations
   - Typed.js cho hero
   - GitHub API (repos + user stats)
   - Mobile menu toggle
   - Back-to-top button
   - Animated counters
   ============================================ */

// Khởi tạo AOS
AOS.init({
    once: true,
    offset: 50,
    easing: 'ease-out-cubic',
    duration: 800
});

// Hiệu ứng gõ chữ cho hero
new Typed('#typed-text', {
    strings: ['Front-End', 'Viết Code Dạo', 'Sáng Tạo Giao Diện', 'UI/UX Enthusiast'],
    typeSpeed: 70,
    backSpeed: 50,
    loop: true,
    backDelay: 1500
});

// === Mobile menu toggle ===
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
const menuIcon = document.getElementById('menu-icon');

if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
        const isOpen = !mobileMenu.classList.contains('hidden');
        mobileMenu.classList.toggle('hidden');
        mobileMenu.classList.toggle('flex');
        menuIcon.className = isOpen ? 'fa-solid fa-bars' : 'fa-solid fa-xmark';
        menuToggle.setAttribute('aria-expanded', String(!isOpen));
    });

    // Đóng menu khi click vào link
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
            mobileMenu.classList.remove('flex');
            menuIcon.className = 'fa-solid fa-bars';
            menuToggle.setAttribute('aria-expanded', 'false');
        });
    });
}

// === Back to top button ===
const backToTop = document.getElementById('back-to-top');
if (backToTop) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            backToTop.style.opacity = '1';
            backToTop.style.pointerEvents = 'auto';
        } else {
            backToTop.style.opacity = '0';
            backToTop.style.pointerEvents = 'none';
        }
    });
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// === Animated counter ===
function animateCounter(el, target, duration = 1500) {
    const start = 0;
    const startTime = performance.now();
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const value = Math.floor(start + (target - start) * easeOut(progress));
        el.textContent = value;
        if (progress < 1) requestAnimationFrame(update);
        else el.textContent = target;
    }
    requestAnimationFrame(update);
}

// === GitHub API integration ===
const username = 'iamhieuxz';
const gridContainer = document.getElementById('github-grid');

const langColors = {
    'JavaScript': '#fbbf24',
    'HTML': '#f43f5e',
    'CSS': '#3b82f6',
    'Python': '#10b981',
    'TypeScript': '#6366f1',
    'Java': '#f97316',
    'C++': '#a855f7',
    'C#': '#8b5cf6',
    'PHP': '#ec4899',
    'Ruby': '#dc2626',
    'Go': '#06b6d4',
    'Swift': '#f59e0b',
    'Kotlin': '#7c3aed',
    'Shell': '#84cc16',
    'Vue': '#22c55e'
};

// Helper: kiểm tra response có phải lỗi API không
function isApiError(data) {
    return data && typeof data === 'object' && 'message' in data;
}

// Load user info (cho stats)
fetch(`https://api.github.com/users/${username}`)
    .then(res => res.json())
    .then(user => {
        if (isApiError(user)) return;
        const reposEl = document.getElementById('stat-repos');
        const starsEl = document.getElementById('stat-stars');
        const followersEl = document.getElementById('stat-followers');
        if (reposEl) animateCounter(reposEl, user.public_repos || 0);
        if (followersEl) animateCounter(followersEl, user.followers || 0);

        // Tổng stars = cần fetch repos
        if (starsEl) {
            fetch(`https://api.github.com/users/${username}/repos?per_page=100`)
                .then(r => r.json())
                .then(repos => {
                    if (isApiError(repos)) return;
                    const total = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
                    animateCounter(starsEl, total);
                })
                .catch(() => {});
        }
    })
    .catch(() => {});

// Load repos
fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100`)
    .then(res => res.json())
    .then(repos => {
        if (isApiError(repos)) throw new Error(repos.message);
        gridContainer.innerHTML = '';

        const targetRepos = repos.filter(repo => !repo.fork).slice(0, 6);

        if (targetRepos.length === 0) {
            gridContainer.innerHTML = `
                <div class="col-span-full text-center py-12 glass-card rounded-3xl">
                    <i class="fa-solid fa-folder-open text-ember-400 text-5xl mb-4"></i>
                    <p class="text-ember-200/80 font-bold text-lg">Chưa có dự án public nào!</p>
                </div>`;
            return;
        }

        targetRepos.forEach((repo, index) => {
            const color = langColors[repo.language] || '#f97316';
            const delay = index * 100;

            const cardHTML = `
                <article class="project-card"
                         data-aos="fade-up" data-aos-delay="${delay}">

                    <div class="relative z-10">
                        <div class="flex justify-between items-start mb-5">
                            <div class="project-icon">
                                <i class="fa-solid fa-laptop-code"></i>
                            </div>
                            <a href="${repo.html_url}" target="_blank" rel="noopener"
                               class="link-btn" aria-label="Mở ${repo.name} trên GitHub">
                                <i class="fa-solid fa-arrow-right"></i>
                            </a>
                        </div>

                        <h3 class="project-title mb-2">
                            <a href="${repo.html_url}" target="_blank" rel="noopener">${repo.name}</a>
                        </h3>
                        <p class="project-desc">
                            ${repo.description
                                ? escapeHtml(repo.description)
                                : 'Click vào icon mũi tên phía trên để xem chi tiết dự án thú vị này nhé! ✨'}
                        </p>
                    </div>

                    <div class="project-meta relative z-10">
                        <span class="flex items-center gap-2">
                            <span class="lang-dot" style="background-color: ${color}; color: ${color};"></span>
                            ${repo.language || 'Code'}
                        </span>
                        <div class="flex items-center gap-3">
                            <span class="flex items-center gap-1" title="Forks">
                                <i class="fa-solid fa-code-fork text-ember-400 text-xs"></i> ${repo.forks_count}
                            </span>
                            <span class="flex items-center gap-1" title="Stars">
                                <i class="fa-solid fa-star text-amber-400"></i> ${repo.stargazers_count}
                            </span>
                        </div>
                    </div>
                </article>
            `;
            gridContainer.innerHTML += cardHTML;
        });

        // Refresh AOS để áp dụng animation cho cards vừa render
        if (typeof AOS !== 'undefined') AOS.refresh();
    })
    .catch(err => {
        console.error('GitHub API error:', err);
        gridContainer.innerHTML = `
            <div class="col-span-full text-center py-12 glass-card rounded-3xl">
                <i class="fa-solid fa-triangle-exclamation text-ember-500 text-5xl mb-4"></i>
                <p class="text-ember-200 font-bold text-lg mb-2">Không tải được dự án từ GitHub</p>
                <p class="text-ember-200/60 text-sm">Có thể do rate-limit. Vui lòng thử lại sau ít phút.</p>
                <a href="https://github.com/${username}?tab=repositories" target="_blank" rel="noopener"
                   class="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full bg-ember-600 hover:bg-ember-500 text-white font-bold transition-colors">
                    <i class="fa-brands fa-github"></i> Xem trên GitHub
                </a>
            </div>`;
    });

// Helper: escape HTML để chống XSS từ repo description
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
