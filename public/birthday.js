(function(){
  var lastBirthday = undefined;

  function isMain2() {
    return /\/screen\/main\/2\b/.test(window.location.pathname);
  }

  function ensureAudio() {
    var el = document.getElementById('birthday-audio');
    if (el) return el;
    el = document.createElement('audio');
    el.id = 'birthday-audio';
    el.src = '/birthday.mp3';
    document.body.appendChild(el);
    return el;
  }

  function labelFor(name) {
    var n = (name || '').trim();
    if (!n || /^happy birthday$/i.test(n)) return 'HAPPY BIRTHDAY';
    if (/^happy birthday\b/i.test(n)) return n.toUpperCase();
    return ('HAPPY BIRTHDAY ' + n).toUpperCase();
  }

  window.showBirthday = function(name) {
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

  window.stopBirthday = function() {
    var audio = document.getElementById('birthday-audio');
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

  async function pollBirthday() {
    try {
      var r = await fetch('/api/screen-state', { cache: 'no-store' });
      if (!r.ok) return;
      var state = await r.json();
      var next = state.birthday || null;
      if (lastBirthday === undefined) {
        lastBirthday = next;
        if (next) window.showBirthday(next);
        return;
      }
      if (next === lastBirthday) return;
      lastBirthday = next;
      if (next) window.showBirthday(next);
      else window.stopBirthday();
    } catch (e) {}
  }

  setInterval(pollBirthday, 1500);
  setTimeout(pollBirthday, 800);
})();
