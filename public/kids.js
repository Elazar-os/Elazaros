(function(){
  var lastKids = undefined;
  var stingTimer = null;

  function isMain3() {
    return /\/screen\/main\/3\b/.test(window.location.pathname);
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
    var wrap = document.createElement('div');
    var colors = ['#E8102E', '#FFC107', '#4FC3F7', '#81C784', '#FF8A65', '#BA68C8', '#FFF176'];
    var color = colors[Math.floor(Math.random() * colors.length)];
    var left = 4 + Math.random() * 92;
    var size = 42 + Math.random() * 36;
    var dur = 7 + Math.random() * 6;
    var drift = (Math.random() * 80 - 40).toFixed(0);
    wrap.className = 'kod-balloon-wrap';
    wrap.style.cssText = [
      'position:absolute',
      'bottom:-80px',
      'left:' + left + 'vw',
      'width:' + size + 'px',
      'height:' + Math.round(size * 1.35) + 'px',
      'pointer-events:none',
      'z-index:40',
      'animation:kodBalloonRise ' + dur + 's linear ' + delay + 's infinite'
    ].join(';');
    wrap.style.setProperty('--drift', drift + 'px');

    var balloon = document.createElement('div');
    balloon.style.cssText = [
      'width:100%',
      'height:78%',
      'border-radius:50%',
      'background:radial-gradient(circle at 30% 28%, #fff 0 8%, ' + color + ' 28%)',
      'box-shadow:inset -8px -10px 16px rgba(0,0,0,0.18), 0 8px 16px rgba(0,0,0,0.25)'
    ].join(';');

    var knot = document.createElement('div');
    knot.style.cssText = 'position:absolute;left:50%;bottom:18%;width:8px;height:8px;margin-left:-4px;background:' + color + ';transform:rotate(45deg);';

    var string = document.createElement('div');
    string.style.cssText = 'position:absolute;left:50%;top:82%;width:2px;height:34px;margin-left:-1px;background:rgba(255,255,255,0.55);';

    wrap.appendChild(balloon);
    wrap.appendChild(knot);
    wrap.appendChild(string);
    return wrap;
  }

  window.showKidsMode = function() {
    playSting();
    if (!isMain3()) return;
    var existing = document.getElementById('kod-kids-balloons');
    if (existing) existing.remove();

    var layer = document.createElement('div');
    layer.id = 'kod-kids-balloons';
    layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:40;';
    for (var i = 0; i < 18; i++) layer.appendChild(makeBalloon(i * 0.22));

    var badge = document.createElement('div');
    badge.textContent = 'KIDS HOUR';
    badge.style.cssText = "position:fixed;top:18px;right:24px;font-family:'Bebas Neue',sans-serif;letter-spacing:3px;font-size:42px;color:#FFC107;text-shadow:0 2px 10px rgba(0,0,0,0.6);z-index:41;";
    layer.appendChild(badge);
    document.body.appendChild(layer);
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
    style.textContent = '@keyframes kodBalloonRise{0%{transform:translate3d(0,0,0) rotate(-8deg);opacity:0}8%{opacity:1}100%{transform:translate3d(var(--drift,20px),-110vh,0) rotate(10deg);opacity:.15}}';
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
