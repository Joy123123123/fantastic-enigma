const toggleButton = document.getElementById('toggleTheme');
const root = document.documentElement;

const setTheme = (theme) => {
  root.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
};

const storedTheme = localStorage.getItem('theme');
if (storedTheme) {
  setTheme(storedTheme);
}

toggleButton?.addEventListener('click', () => {
  const isDark = root.getAttribute('data-theme') === 'dark';
  setTheme(isDark ? 'light' : 'dark');
});
