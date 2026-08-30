(function(){
  var lastKey = '';

  function ensureStyle() {
    var el = document.getElementById('kod-live-theme');
    if (el) return el;
    el = document.createElement('style');
    el.id = 'kod-live-theme';
    document.head.appendChild(el);
    return el;
  }

  function applyTheme(theme) {
    if (!theme || document.body.classList.contains('theme-sushi')) return;
    var t = theme;
    ensureStyle().textContent = [
      'body.theme-main{',
      '--bg:' + t.bg + ';',
      '--surface:' + t.surface + ';',
      '--card:' + t.card + ';',
      '--border:' + t.border + ';',
      '--accent:' + t.accent + ';',
      '--cat:' + t.cat + ';',
      '--item-name:' + t.itemName + ';',
      '--item-desc:' + t.itemDesc + ';',
      '--item-price:' + t.itemPrice + ';',
      'background:' + t.bg + ';',
      '}',
      'body.theme-main .screen-wrap{background:' + t.bg + ';}',
      'body.theme-main .screen-header,body.theme-main .screen-footer{background:' + t.surface + ';}',
      'body.theme-main .panel,body.theme-main .kod-brand-strip{',
      'background:' + t.card + ';',
      'border:1px solid ' + t.border + ';',
      'box-shadow:none;',
      '}',
      'body.theme-main .panel-title{color:' + t.cat + ';text-shadow:0 1px 2px rgba(0,0,0,.55);}',
      'body.theme-main .mi-name{color:' + t.itemName + ';text-shadow:0 1px 2px rgba(0,0,0,.65);}',
      'body.theme-main .mi-price{color:' + t.itemPrice + ';text-shadow:0 1px 2px rgba(0,0,0,.55);}',
      'body.theme-main .header-logo,body.theme-main .kod-brand-logo,body.theme-main .footer-brand{color:' + t.accent + ';}',
      'body.theme-main #kod-bg-ambient{display:none;}'
    ].join('');
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
