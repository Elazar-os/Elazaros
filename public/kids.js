(function(){
  var lastKids = undefined;
  var stingTimer = null;
  var launchTimer = null;

  function isMain3() {
    return /\/screen\/main\/3\b/.test(window.location.pathname);
  }

  function findKidsPanel() {
    var titles = document.querySelectorAll('.panel-title');
    for (var i = 0; i < titles.length; i++) {
      if (/specials\s*&\s*kids/i.test(titles[i].textContent || '')) {
        return titles[i].closest('.panel');
      }
    }
    return null;
  }

  function ensureAudio() {
    var el = document.getElementById('kids-audio');
    if (el) return el;
    el = document.createElement('audio');
    el.id = 'kids-audio';
    el.src = '/kids.mp3';
    document.body.appendChild(el);
    return el;
  }

  function playSting() {
    var audio = ensureAudio();
    audio.currentTime = 0;
    audio.play().catch(function() {});
    clearTimeout(stingTimer);
    stingTimer = setTimeout(function() {
      audio.pause();
      audio.currentTime = 0;
    }, 10000);
  }

  function launchBalloon(layer, panel) {
    var rect = panel.getBoundingClientRect();
    var colors = ['#E8102E', '#FFC107', '#4FC3F7', '#81C784', '#FF8A65', '#BA68C8', '#FFF176'];
    var color = colors[Math.floor(Math.random() * colors.length)];
    var size = 36 + Math.random() * 28;
    var startX = rect.left + 16 + Math.random() * Math.max(40, rect.width - 32);
    var startY = rect.bottom - 8;
    var drift = (Math.random() * 70 - 35);
    var dur = 4.5 + Math.random() * 2.5;

    var wrap = document.createElement('div');
    wrap.style.cssText = [
      'position:fixed',
      'left:' + startX + 'px',
      'top:' + startY + 'px',
      'width:' + size + 'px',
      'height:' + Math.round(size * 1.35) + 'px',
      'pointer-events:none',
      'z-index:50',
      'animation:kodBalloonRise ' + dur + 's ease-out forwards'
    ].join(';');
    wrap.style.setProperty('--drift', drift + 'px');
    wrap.style.setProperty('--rise', '-' + Math.round(rect.height + 160) + 'px');

    var balloon = document.createElement('div');
    balloon.style.cssText = [
      'width:100%',
      'height:78%',
      'border-radius:50%',
      'background:radial-gradient(circle at 30% 28%, #fff 0 8%, ' + color + ' 28%)',
      'box-shadow:inset -6px -8px 12px rgba(0,0,0,0.2), 0 6px 12px rgba(0,0,0,0.28)'
    ].join(';');

    var knot = document.createElement('div');
    knot.style.cssText = 'position:absolute;left:50%;bottom:16%;width:7px;height:7px;margin-left:-3px;background:' + color + ';transform:rotate(45deg);';

    var string = document.createElement('div');
    string.style.cssText = 'position:absolute;left:50%;top:82%;width:2px;height:28px;margin-left:-1px;background:rgba(255,255,255,0.55);';

    wrap.appendChild(balloon);
    wrap.appendChild(knot);
    wrap.appendChild(string);
    layer.appendChild(wrap);
    setTimeout(function() { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, dur * 1000 + 50);
  }

  window.showKidsMode = function() {
    playSting();
    if (!isMain3()) return;
    window.stopKidsMode(true);

    var panel = findKidsPanel();
    if (!panel) return;

    var layer = document.createElement('div');
    layer.id = 'kod-kids-balloons';
    document.body.appendChild(layer);

    var title = panel.querySelector('.panel-title');
    if (title && !title.dataset.kidsHighlight) {
      title.dataset.kidsHighlight = '1';
      title.style.textShadow = '0 0 12px rgba(255,193,7,0.8)';
    }

    function burst() {
      if (!document.getElementById('kod-kids-balloons')) return;
      var p = findKidsPanel();
      if (!p) return;
      var count = 3 + Math.floor(Math.random() * 3);
      for (var i = 0; i < count; i++) launchBalloon(layer, p);
    }

    burst();
    launchTimer = setInterval(burst, 1200);
  };

  window.stopKidsMode = function(keepAudio) {
    if (!keepAudio) {
      clearTimeout(stingTimer);
      var audio = document.getElementById('kids-audio');
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    }
    clearInterval(launchTimer);
    launchTimer = null;
    var layer = document.getElementById('kod-kids-balloons');
    if (layer) layer.remove();
    var panel = findKidsPanel();
    if (panel) {
      var title = panel.querySelector('.panel-title');
      if (title) {
        title.style.textShadow = '';
        delete title.dataset.kidsHighlight;
      }
    }
  };

  if (!document.getElementById('kod-kids-style')) {
    var style = document.createElement('style');
    style.id = 'kod-kids-style';
    style.textContent = '@keyframes kodBalloonRise{0%{transform:translate3d(0,0,0) scale(.85);opacity:0}12%{opacity:1}100%{transform:translate3d(var(--drift,20px),var(--rise,-280px),0) scale(1.05);opacity:0}}';
    document.head.appendChild(style);
  }

  async function pollKids() {
    try {
      var r = await fetch('/api/kids-state', { cache: 'no-store' });
      if (!r.ok) return;
      var state = await r.json();
      var next = !!state.kidsMode;
      if (lastKids === undefined) {
        lastKids = next;
        if (next) window.showKidsMode();
        return;
      }
      if (next === lastKids) return;
      lastKids = next;
      if (next) window.showKidsMode();
      else window.stopKidsMode();
    } catch (e) {}
  }

  setInterval(pollKids, 1500);
  setTimeout(pollKids, 900);
})();
