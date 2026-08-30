(function(){
  var lastKids = undefined;
  var stingTimer = null;

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

  function makeBalloon(delay) {
    var b = document.createElement('div');
    b.className = 'kod-balloon';
    var colors = ['#E8102E', '#FFC107', '#4FC3F7', '#81C784', '#FF8A65', '#BA68C8'];
    var color = colors[Math.floor(Math.random() * colors.length)];
    var left = 8 + Math.random() * 84;
    var size = 18 + Math.random() * 16;
    var dur = 6 + Math.random() * 5;
    b.style.cssText = [
      'position:absolute',
      'bottom:-30px',
      'left:' + left + '%',
      'width:' + size + 'px',
      'height:' + (size * 1.25) + 'px',
      'border-radius:50% 50% 50% 50% / 45% 45% 55% 55%',
      'background:' + color,
      'opacity:0.9',
      'pointer-events:none',
      'animation:kodBalloonRise ' + dur + 's linear ' + delay + 's infinite',
      'z-index:6'
    ].join(';');
    var string = document.createElement('div');
    string.style.cssText = 'position:absolute;top:100%;left:50%;width:1px;height:18px;background:rgba(255,255,255,0.5);';
    b.appendChild(string);
    return b;
  }

  window.showKidsMode = function() {
    playSting();
    if (!isMain3()) return;
    var panel = findKidsPanel();
    if (!panel) return;
    panel.style.position = 'relative';
    panel.style.overflow = 'hidden';
    var existing = document.getElementById('kod-kids-balloons');
    if (existing) existing.remove();
    var layer = document.createElement('div');
    layer.id = 'kod-kids-balloons';
    layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:6;';
    for (var i = 0; i < 12; i++) layer.appendChild(makeBalloon(i * 0.35));
    var badge = document.createElement('div');
    badge.textContent = 'KIDS HOUR';
    badge.style.cssText = "position:absolute;top:8px;right:10px;font-family:'Bebas Neue',sans-serif;letter-spacing:2px;font-size:16px;color:#FFC107;z-index:7;";
    layer.appendChild(badge);
    panel.appendChild(layer);
  };

  window.stopKidsMode = function() {
    clearTimeout(stingTimer);
    var audio = document.getElementById('kids-audio');
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    var layer = document.getElementById('kod-kids-balloons');
    if (layer) layer.remove();
  };

  if (!document.getElementById('kod-kids-style')) {
    var style = document.createElement('style');
    style.id = 'kod-kids-style';
    style.textContent = '@keyframes kodBalloonRise{0%{transform:translateY(0) rotate(-6deg);opacity:0}10%{opacity:.9}100%{transform:translateY(-120%) rotate(8deg);opacity:0}}';
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
