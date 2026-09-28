(function () {
  var deco = 'campfire';
  var enabled = true;

  function isMain2() {
    return /\/screen\/main\/2\b/.test(location.pathname);
  }

  function ensureSuccah() {
    if (!isMain2()) return;
    var layer = document.getElementById('flame-smoke-layer');
    if (!layer) return;
    var fire = document.getElementById('kodCampfire');
    var hut = document.getElementById('kod-succah');
    if (!hut) {
      hut = document.createElement('div');
      hut.id = 'kod-succah';
      hut.style.cssText = 'display:none;width:200px;height:200px;';
      hut.innerHTML = '<svg viewBox="0 0 200 200" width="200" height="200" xmlns="http://www.w3.org/2000/svg">'
        + '<rect x="38" y="78" width="124" height="96" rx="4" fill="#b56a2b" stroke="#3b2414" stroke-width="4"/>'
        + '<rect x="70" y="96" width="60" height="78" fill="#f0b43a"/>'
        + '<rect x="74" y="100" width="52" height="70" fill="#f6c75a"/>'
        + '<rect x="30" y="70" width="140" height="14" rx="2" fill="#7a4a22" stroke="#3b2414" stroke-width="3"/>'
        + '<path d="M28 72 L48 48 L70 70 L92 42 L112 70 L134 46 L158 72 Z" fill="#3f9a3a" stroke="#1d5a22" stroke-width="3"/>'
        + '<path d="M40 58 L58 70 L78 52 L98 70 L118 50 L140 70 L156 60" fill="#58b44a" stroke="#1d5a22" stroke-width="2"/>'
        + '<path d="M78 108 q22 18 44 0" fill="none" stroke="#e85aa0" stroke-width="6" stroke-linecap="round"/>'
        + '<path d="M84 114 q16 12 32 0" fill="none" stroke="#7ac944" stroke-width="5" stroke-linecap="round"/>'
        + '<circle cx="80" cy="108" r="5" fill="#f08a2a"/>'
        + '<circle cx="120" cy="108" r="5" fill="#8a5ad4"/>'
        + '</svg>';
      layer.appendChild(hut);
    }
    if (!enabled) {
      layer.style.display = 'none';
      return;
    }
    layer.style.display = 'block';
    if (fire) fire.style.display = deco === 'campfire' ? 'block' : 'none';
    hut.style.display = deco === 'succah' ? 'block' : 'none';
  }

  async function poll() {
    try {
      var r = await fetch('/api/kod-decoration', { cache: 'no-store' });
      if (!r.ok) return;
      var j = await r.json();
      if (j.decoration) deco = j.decoration;
      if (typeof j.enabled === 'boolean') enabled = j.enabled;
      ensureSuccah();
    } catch (e) {}
  }

  setInterval(poll, 2000);
  setInterval(ensureSuccah, 1000);
  poll();
})();
