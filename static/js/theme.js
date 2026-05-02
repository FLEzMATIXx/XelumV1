(function() {
  const html = document.documentElement;
  const hljsTheme = document.getElementById('hljs-theme');
  const LIGHT_HLJS = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
  const DARK_HLJS  = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';

  function setTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('xelum-theme', theme);
    if (hljsTheme) hljsTheme.href = theme === 'dark' ? DARK_HLJS : LIGHT_HLJS;
    updateIcon(theme);
  }

  function updateIcon(theme) {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (icon) icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }

  const saved = localStorage.getItem('xelum-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = saved || (prefersDark ? 'dark' : 'light');
  setTheme(initial);

  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const cur = html.getAttribute('data-theme');
      setTheme(cur === 'dark' ? 'light' : 'dark');
    });
  }
})();
