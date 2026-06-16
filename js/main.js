AOS.init({
    once: true,
    offset: 50,
    easing: 'ease-out-cubic'
});

new Typed('#typed-text', {
    strings: ['Front-End', 'Viết Code Dạo', 'Sáng Tạo Giao Diện'],
    typeSpeed: 70,
    backSpeed: 50,
    loop: true,
    backDelay: 1500
});

const username = 'iamhieuxz';
const gridContainer = document.getElementById('github-grid');

const langColors = {
    'JavaScript': '#fbbf24',
    'HTML': '#f43f5e',
    'CSS': '#3b82f6',
    'Python': '#10b981',
    'TypeScript': '#6366f1'
};

fetch(`https://api.github.com/users/${username}/repos?sort=updated`)
    .then(res => res.json())
    .then(repos => {
        gridContainer.innerHTML = '';

        const targetRepos = repos.filter(repo => !repo.fork).slice(0, 6);

        if (targetRepos.length === 0) {
            gridContainer.innerHTML = `<p class="text-slate-500 font-bold col-span-full text-center py-8">Chưa có dự án nào được public!</p>`;
            return;
        }

        targetRepos.forEach((repo, index) => {
            const color = langColors[repo.language] || '#a855f7';
            const delay = index * 100;

            const cardHTML = `
                <div class="glass-card rounded-3xl p-8 hover:-translate-y-3 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 flex flex-col justify-between group relative overflow-hidden"
                     data-aos="fade-up" data-aos-delay="${delay}">

                    <div class="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-1000 ease-in-out"></div>

                    <div class="relative z-10">
                        <div class="flex justify-between items-start mb-6">
                            <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-xl shadow-inner text-slate-700 group-hover:bg-pink-100 group-hover:text-pink-600 transition-colors">
                                <i class="fa-solid fa-laptop-code"></i>
                            </div>
                            <a href="${repo.html_url}" target="_blank" class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400 hover:text-violet-600 hover:scale-110 transition-all">
                                <i class="fa-solid fa-arrow-right -rotate-45"></i>
                            </a>
                        </div>

                        <h3 class="text-2xl font-extrabold mb-3 text-slate-800 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-pink-500 group-hover:to-violet-500 transition-all">
                            <a href="${repo.html_url}" target="_blank">${repo.name}</a>
                        </h3>
                        <p class="text-slate-500 mb-6 line-clamp-2 font-medium">
                            ${repo.description ? repo.description : 'Click vào icon mũi tên phía trên để xem chi tiết dự án thú vị này nhé! ✨'}
                        </p>
                    </div>

                    <div class="flex items-center justify-between text-sm font-bold text-slate-600 bg-white/50 rounded-2xl py-3 px-4 relative z-10">
                        <span class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full shadow-sm" style="background-color: ${color}"></span>
                            ${repo.language ? repo.language : 'Code'}
                        </span>
                        <span class="flex items-center gap-1">
                            <i class="fa-solid fa-star text-yellow-400 text-base"></i> ${repo.stargazers_count}
                        </span>
                    </div>
                </div>
            `;
            gridContainer.innerHTML += cardHTML;
        });
    })
    .catch(() => {
        gridContainer.innerHTML = `<p class="text-red-500 font-bold col-span-full text-center py-8">Lỗi tải dữ liệu GitHub API!</p>`;
    });
