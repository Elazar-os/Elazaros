(function(){
  var lastName = undefined;

  function isMain2() {
    return /\/screen\/main\/2\b/.test(window.location.pathname);
  }

  function ensureAudio() {
    var el = document.getElementById('anniversary-audio');
    if (el) return el;
    el = document.createElement('audio');
    el.id = 'anniversary-audio';
    el.src = '/anniversary.mp3';
    el.addEventListener('error', function() { el.src = '/birthday.mp3'; });
    document.body.appendChild(el);
    return el;
  }

  function labelFor(name) {
    var n = (name || '').trim();
    if (!n || /^mazal tov$/i.test(n) || /^mazel tov$/i.test(n)) return 'MAZAL TOV';
    if (/^mazal tov\b/i.test(n) || /^mazel tov\b/i.test(n)) return n.toUpperCase();
    return ('MAZAL TOV ' + n).toUpperCase();
  }

  window.showAnniversary = function(name) {
    var audio = ensureAudio();
    audio.currentTime = 0;
    audio.play().catch(function() {});
    if (!isMain2()) return;
    var strip = document.getElementById('kod-brand-strip');
    if (!strip) return;
    strip.innerHTML = '';
    var line = document.createElement('div');
    line.className = 'kod-brand-logo';
    line.style.letterSpacing = '2px';
    line.style.fontSize = '26px';
    line.textContent = labelFor(name);
    strip.appendChild(line);
  };

  window.stopAnniversary = function() {
    var audio = document.getElementById('anniversary-audio');
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (!isMain2()) return;
    var strip = document.getElementById('kod-brand-strip');
    if (!strip) return;
    strip.innerHTML = '';
    strip.className = 'kod-brand-strip';
    var logo = document.createElement('div');
    logo.className = 'kod-brand-logo';
    logo.textContent = 'KING OF DELANCEY';
    strip.appendChild(logo);
    var bar = document.createElement('div');
    bar.className = 'kod-brand-bar';
    strip.appendChild(bar);
    var est = document.createElement('div');
    est.className = 'kod-brand-est';
    est.textContent = 'EST. 2009';
    strip.appendChild(est);
  };

  async function poll() {
    try {
      var r = await fetch('/api/anniversary-state', { cache: 'no-store' });
      if (!r.ok) return;
      var state = await r.json();
      var next = state.name || null;
      if (lastName === undefined) {
        lastName = next;
        if (next) window.showAnniversary(next);
        return;
      }
      if (next === lastName) return;
      lastName = next;
      if (next) window.showAnniversary(next);
      else window.stopAnniversary();
    } catch (e) {}
  }

  setInterval(poll, 1500);
  setTimeout(poll, 800);
})();
