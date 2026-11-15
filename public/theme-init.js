// Apply the saved/system theme before first paint to avoid a light flash.
// Kept as an external file so the Content-Security-Policy can forbid inline scripts.
(function () {
  try {
    var t = localStorage.getItem('rotor_clash_theme');
    if (t !== 'light' && t !== 'dark') {
      t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
      var m = document.querySelector('meta[name="theme-color"]');
      if (m) m.setAttribute('content', '#0F1D26');
    }
  } catch (e) {}
})();
