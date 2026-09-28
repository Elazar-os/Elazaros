(function () {
  var deco = 'campfire';
  var enabled = true;
  var ART = 'v2';

  function isMain2() {
    return /\/screen\/main\/2\b/.test(location.pathname);
  }

  function hutSvg() {
    return ''
      + '<svg viewBox="0 0 220 220" width="200" height="200" xmlns="http://www.w3.org/2000/svg">'
      + '<defs>'
      + '<linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0" stop-color="#ffe08a"/>'
      + '<stop offset="1" stop-color="#f5b423"/>'
      + '</linearGradient>'
      + '</defs>'
      + '<ellipse cx="110" cy="198" rx="52" ry="8" fill="#000" opacity="0.28"/>'
      + '<rect x="48" y="92" width="124" height="100" fill="#c9843c" stroke="#3a2212" stroke-width="4"/>'
      + '<path d="M56 92 V192 M68 92 V192 M80 92 V192 M92 92 V192 M128 92 V192 M140 92 V192 M152 92 V192 M164 92 V192" stroke="#8a5424" stroke-width="2"/>'
      + '<rect x="80" y="108" width="60" height="84" fill="url(#glow)" stroke="#3a2212" stroke-width="4"/>'
      + '<path d="M84 118 H136 M84 130 H136 M84 142 H136 M84 154 H136 M84 166 H136" stroke="#d9922a" stroke-width="2" opacity="0.45"/>'
      + '<rect x="42" y="84" width="136" height="16" fill="#8b5a2b" stroke="#3a2212" stroke-width="3"/>'
      + '<path d="M18 96 C40 40 70 58 90 78 C100 40 120 40 130 78 C150 50 180 40 202 96 C170 78 150 88 130 84 C120 88 100 88 90 84 C70 90 44 80 18 96Z" fill="#3fa13a" stroke="#1d5a22" stroke-width="3"/>'
      + '<path d="M28 88 C50 62 72 70 88 84" fill="#58c04a" stroke="#1d5a22" stroke-width="2"/>'
      + '<path d="M132 84 C150 68 176 62 196 88" fill="#58c04a" stroke="#1d5a22" stroke-width="2"/>'
      + '<path d="M70 54 C86 44 102 48 110 70 C118 48 136 44 150 54 C138 66 122 70 110 66 C98 70 82 66 70 54Z" fill="#2f8f32" stroke="#1d5a22" stroke-width="3"/>'
      + '<g fill="none" stroke-width="7" stroke-linecap="round">'
      + '<circle cx="86" cy="118" r="8" stroke="#ff4fa3"/>'
      + '<circle cx="100" cy="126" r="8" stroke="#3fcf4a"/>'
      + '<circle cx="114" cy="128" r="8" stroke="#ff8a2a"/>'
      + '<circle cx="128" cy="122" r="8" stroke="#b24bff"/>'
      + '</g>'
      + '</svg>';
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
      hut.setAttribute('data-art', ART);
      hut.style.cssText = 'display:none;width:200px;height:200px;';
      hut.innerHTML = hutSvg();
      layer.appendChild(hut);
    } else if (hut.getAttribute('data-art') !== ART) {
      hut.setAttribute('data-art', ART);
      hut.innerHTML = hutSvg();
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
