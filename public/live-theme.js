(function(){
  var lastKey = '';

  function applyTheme(theme) {
    if (!theme || document.body.classList.contains('theme-sushi')) return;
    var root = document.body;
    var map = {
      bg: '--bg',
      surface: '--surface',
      card: '--card',
      border: '--border',
      accent: '--accent',
      cat: '--cat',
      itemName: '--item-name',
      itemDesc: '--item-desc',
      itemPrice: '--item-price'
    };
    Object.keys(map).forEach(function(key) {
      if (theme[key]) root.style.setProperty(map[key], theme[key]);
    });
    document.documentElement.style.background = theme.bg || '';
    var wrap = document.querySelector('.screen-wrap');
    if (wrap && theme.bg) {
      wrap.style.background = 'radial-gradient(ellipse at 50% 0%, rgba(208,18,48,0.14), transparent 46%), ' + theme.bg;
    }
    document.querySelectorAll('.panel, .kod-brand-strip').forEach(function(el) {
      el.style.background = theme.card || '';
      el.style.borderColor = theme.border || '';
    });
    document.querySelectorAll('.panel-title').forEach(function(el) {
      el.style.color = theme.cat || '';
    });
    document.querySelectorAll('.mi-name').forEach(function(el) {
      el.style.color = theme.itemName || '';
    });
    document.querySelectorAll('.mi-price').forEach(function(el) {
      el.style.color = theme.itemPrice || '';
    });
    var header = document.querySelector('.screen-header');
    var footer = document.querySelector('.screen-footer');
    if (header && theme.surface) header.style.background = theme.surface;
    if (footer && theme.surface) footer.style.background = theme.surface;
    var logo = document.getElementById('header-logo');
    if (logo && theme.accent) logo.style.color = theme.accent;
  }

  function swapStylesheet(version) {
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href') || '';
      if (href.indexOf('styles.css') === -1) continue;
      var next = '/styles.css?v=' + version;
      if (href !== next) links[i].setAttribute('href', next);
    }
  }

  async function pollTheme() {
    try {
      var r = await fetch('/api/theme', { cache: 'no-store' });
      if (!r.ok) return;
      var data = await r.json();
      var key = JSON.stringify(data);
      if (key === lastKey) return;
      lastKey = key;
      if (data.version) swapStylesheet(data.version);
      applyTheme(data.main);
    } catch (e) {}
  }

  setInterval(pollTheme, 2000);
  setTimeout(pollTheme, 300);
})();
