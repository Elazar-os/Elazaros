(function(){
'use strict';

var params = (function(){
  var m = window.location.pathname.match(/\/screen\/(\w+)\/(\d+)/);
  if (m) return { screenType: m[1], screenNumber: parseInt(m[2]) };
  return { screenType: 'main', screenNumber: 1 };
})();

var ST = params.screenType;
var SN = params.screenNumber;

document.body.classList.add(ST === 'sushi' ? 'theme-sushi' : 'theme-main');

if (ST === 'sushi') {
  document.getElementById('header-logo').textContent = 'Sushi Bar';
  document.getElementById('header-subtitle').textContent = 'King of Delancey';
} else {
  document.getElementById('header-logo').textContent = 'King of Delancey';
  document.getElementById('header-subtitle').textContent = '';
}
document.getElementById('header-screen-id').textContent = (ST === 'sushi' ? 'Sushi' : 'Main') + ' Screen ' + SN;

var tickerMain = 'Made fresh to order \u00B7 Ask about daily specials \u00B7 Gluten-free options available \u00B7 All beef franks \u00B7 Served with fries or salad';
var tickerSushi = 'Fresh fish daily \u00B7 Gluten-free soy sauce available \u00B7 Brown rice available on request \u00B7 Ask about our platters';
document.getElementById('footer-ticker').textContent = ST === 'sushi' ? tickerSushi : tickerMain;

var frozen = false;
var currentMenuItems = [];
var priceIntervals = [];
var pageIntervals = [];
var pollLastVersion = null;
var pollLastFrozen = null;
var pollLastFeatured = null;
var pollLastCampfire = null;
var campfireEnabled = true;
var closingTime = false;
var closingVolume = 0.3;
var audioUnlocked = false;

function updateClock() {
  var now = new Date();
  var h = now.getHours(); var m = now.getMinutes(); var s = now.getSeconds();
  var ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  var ms = m < 10 ? '0' + m : m;
  var ss = s < 10 ? '0' + s : s;
  document.getElementById('footer-clock').textContent = h + ':' + ms + ':' + ss + ' ' + ap;
}
updateClock();
setInterval(updateClock, 1000);

function itemKey(item) {
  return String(item.id || item.item_name || item.name || '').toLowerCase();
}

function itemDisplayName(item) {
  return item.item_name || item.name || '';
}

function unlockAudio() {
  audioUnlocked = true;
  var audio = document.getElementById('closing-time-audio');
  if (!audio) return;
  var p = audio.play();
  if (p && p.then) {
    p.then(function() {
      if (!closingTime) {
        audio.pause();
        audio.currentTime = 0;
      }
    }).catch(function() {});
  }
}

function toggleCampfire(enabled) {
  campfireEnabled = enabled;
  var layer = document.getElementById('flame-smoke-layer');
  if (layer) layer.style.display = enabled ? 'block' : 'none';
}

function toggleClosingTime(enabled) {
  closingTime = !!enabled;
  var audio = document.getElementById('closing-time-audio');
  if (!audio) return;
  if (closingTime) {
    audio.volume = closingVolume;
    audio.play().catch(function() {});
  } else {
    audio.pause();
    audio.currentTime = 0;
  }
}

function updateClosingVolume(volume) {
  closingVolume = volume !== undefined ? volume : 0.3;
  var audio = document.getElementById('closing-time-audio');
  if (audio) audio.volume = closingVolume;
}

function applyInitialState(state) {
  pollLastVersion = state.version;
  pollLastFrozen = state.frozen;
  pollLastFeatured = state.featured ? JSON.stringify(state.featured) : null;
  pollLastCampfire = state.campfireEnabled;
  campfireEnabled = state.campfireEnabled !== undefined ? state.campfireEnabled : true;
  closingVolume = state.closingVolume !== undefined ? state.closingVolume : 0.3;
  updateClosingVolume(closingVolume);
  toggleCampfire(campfireEnabled);
  if (state.frozen) {
    frozen = true;
    document.getElementById('frozen-badge').classList.add('visible');
  }
  if (state.featured) showFeaturedItem(state.featured);
  if (state.closingTime) toggleClosingTime(true);
}

function applyStateDiff(state) {
  var versionChanged = state.version !== pollLastVersion;
  var frozenChanged = state.frozen !== pollLastFrozen;
  var featuredKey = state.featured ? JSON.stringify(state.featured) : null;
  var featuredChanged = featuredKey !== pollLastFeatured;
  var campfireChanged = state.campfireEnabled !== pollLastCampfire;
  var closingChanged = !!state.closingTime !== !!closingTime;
  var volumeChanged = state.closingVolume !== closingVolume;

  pollLastVersion = state.version;
  pollLastFrozen = state.frozen;
  pollLastFeatured = featuredKey;
  pollLastCampfire = state.campfireEnabled;

  if (frozenChanged) {
    frozen = state.frozen;
    var badge = document.getElementById('frozen-badge');
    if (state.frozen) badge.classList.add('visible');
    else badge.classList.remove('visible');
  }

  if (featuredChanged) {
    if (state.featured) showFeaturedItem(state.featured);
    else clearFeaturedItem();
  }

  if (campfireChanged) {
    toggleCampfire(state.campfireEnabled !== undefined ? state.campfireEnabled : true);
  }

  if (volumeChanged) updateClosingVolume(state.closingVolume);
  if (closingChanged) toggleClosingTime(state.closingTime);

  return versionChanged;
}

async function pollScreenState() {
  try {
    var r = await fetchWithTimeout('/api/screen-state', 5000);
    if (!r.ok) return;
    var state = await r.json();

    if (pollLastVersion === null) {
      applyInitialState(state);
      return;
    }

    var versionChanged = applyStateDiff(state);
    if (versionChanged) {
      var items = await fetchMenu();
      if (items.length > 0) applyMenuUpdate(items);
    }
  } catch (e) {}
}

function startPolling() {
  pollScreenState();
  setInterval(pollScreenState, 2000);
}

function connectSocket() {
  var protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  var ws;
  try {
    ws = new WebSocket(protocol + '//' + window.location.host + '/ws');
  } catch (e) {
    setTimeout(connectSocket, 4000);
    return;
  }
  ws.onmessage = function(evt) {
    try {
      var msg = JSON.parse(evt.data);
      if (msg.type === 'PRICE_UPDATE') {
        updatePriceInPlace(msg.id, msg.name || msg.item, msg.price || msg.newPrice);
      } else if (msg.type === 'CLOSING_TIME') {
        toggleClosingTime(!!msg.enabled);
      } else if (msg.type === 'CAMPFIRE_UPDATE') {
        toggleCampfire(!!msg.enabled);
      } else if (msg.type === 'VOLUME_UPDATE') {
        updateClosingVolume(msg.volume);
      } else if (msg.type === 'FEATURED_UPDATE') {
        showFeaturedItem(msg.data || msg);
      } else if (msg.type === 'FEATURED_CLEAR') {
        clearFeaturedItem();
      } else if (msg.type === 'FREEZE_SCREEN') {
        frozen = true;
        document.getElementById('frozen-badge').classList.add('visible');
      } else if (msg.type === 'UNFREEZE_SCREEN') {
        frozen = false;
        document.getElementById('frozen-badge').classList.remove('visible');
      } else if (msg.type === 'MENU_UPDATE') {
        fetchMenu().then(function(items) {
          if (items.length > 0) applyMenuUpdate(items);
        });
      }
    } catch (e) {}
  };
  ws.onclose = function() { setTimeout(connectSocket, 4000); };
}

function fetchWithTimeout(url, ms) {
  var controller = new AbortController();
  var timer = setTimeout(function() { controller.abort(); }, ms);
  return fetch(url, { signal: controller.signal, cache: 'no-store' }).finally(function() { clearTimeout(timer); });
}

async function fetchMenu() {
  try {
    var r = await fetchWithTimeout('/menu-' + ST + '-' + SN + '.json?t=' + Date.now(), 5000);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    var j = await r.json();
    if (!j.success) throw new Error(j.error || 'API error');
    return j.data;
  } catch (e) {
    return [];
  }
}

function sameItemSet(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  var keysA = a.map(itemKey).sort().join('|');
  var keysB = b.map(itemKey).sort().join('|');
  return keysA === keysB;
}

function applyMenuUpdate(items) {
  if (currentMenuItems.length && sameItemSet(currentMenuItems, items)) {
    items.forEach(function(item) {
      updatePriceInPlace(item.id, itemDisplayName(item), item.price);
    });
    currentMenuItems = items;
    return;
  }
  renderScreen(items);
}

function groupByCategory(items) {
  var enabledItems = items.filter(function(item) { return item.enabled !== false; });
  var groups = {}; var order = [];
  enabledItems.forEach(function(item) {
    var cat = item.category || 'Other';
    if (!groups[cat]) { groups[cat] = []; order.push(cat); }
    groups[cat].push(item);
  });
  return { groups: groups, order: order };
}

function formatPrice(price) {
  if (typeof price === 'string') {
    if (price.includes('/') || price.includes('$')) return price;
  }
  var n = parseFloat(price);
  return isNaN(n) ? '' : n.toFixed(2);
}

function createMenuItem(item) {
  var el = document.createElement('div');
  el.className = 'menu-item';
  el.setAttribute('data-item-name', itemDisplayName(item).toLowerCase());
  if (item.id != null) el.setAttribute('data-item-id', String(item.id));

  var info = document.createElement('div');
  info.className = 'mi-info';

  var name = document.createElement('div');
  name.className = 'mi-name';
  name.textContent = itemDisplayName(item);
  info.appendChild(name);

  el.appendChild(info);

  var priceStr = String(item.price || '');
  var priceNum = parseFloat(priceStr);
  if (priceNum !== 0 && priceStr !== '') {
    var priceEl = document.createElement('div');
    priceEl.className = 'mi-price';
    if (priceStr.includes('/')) {
      var opts = priceStr.split('/').map(function(p) { return p.trim(); });
      setupRotatingPrice(priceEl, opts);
    } else {
      priceEl.textContent = formatPrice(item.price);
    }
    el.appendChild(priceEl);
  }

  return el;
}

function setupRotatingPrice(el, opts) {
  el.classList.add('rotating');
  el.textContent = opts[0];
  var idx = 0;
  var iv = setInterval(function() {
    if (frozen) return;
    el.classList.add('price-fade-out');
    setTimeout(function() {
      idx = (idx + 1) % opts.length;
      el.textContent = opts[idx];
      el.classList.remove('price-fade-out');
      el.classList.add('price-fade-in');
      setTimeout(function() { el.classList.remove('price-fade-in'); }, 200);
    }, 200);
  }, 4000);
  priceIntervals.push(iv);
}

function clearAllIntervals() {
  priceIntervals.forEach(function(iv) { clearInterval(iv); });
  priceIntervals = [];
  pageIntervals.forEach(function(iv) { clearInterval(iv); });
  pageIntervals = [];
}

function chunkArray(arr, size) {
  var chunks = [];
  for (var i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function createPanel(opts) {
  var panel = document.createElement('div');
  panel.className = 'panel' + (opts.large ? ' panel-large' : '');

  var header = document.createElement('div');
  header.className = 'panel-header';

  var title = document.createElement('div');
  title.className = 'panel-title';
  title.textContent = opts.title;
  header.appendChild(title);

  if (opts.subtitle) {
    var sub = document.createElement('div');
    sub.className = 'panel-subtitle';
    sub.textContent = opts.subtitle;
    header.appendChild(sub);
  }

  if (opts.note) {
    var note = document.createElement('div');
    note.className = 'panel-note';
    note.textContent = opts.note;
    header.appendChild(note);
  }

  panel.appendChild(header);

  var itemsWrap = document.createElement('div');
  itemsWrap.className = 'panel-items';

  var items = opts.items || [];
  var pageSize = opts.pageSize || items.length;
  var isStatic = items.length <= pageSize;

  if (isStatic) {
    var page = document.createElement('div');
    page.className = 'items-page active';
    items.forEach(function(item) { page.appendChild(createMenuItem(item)); });
    itemsWrap.appendChild(page);
  } else {
    var pages = chunkArray(items, pageSize);
    pages.forEach(function(pageItems, pi) {
      var page = document.createElement('div');
      page.className = 'items-page' + (pi === 0 ? ' active' : '');
      page.setAttribute('data-page', pi);
      pageItems.forEach(function(item) { page.appendChild(createMenuItem(item)); });
      itemsWrap.appendChild(page);
    });

    if (pages.length > 1) {
      setupPagination(itemsWrap, pages.length, opts.panelIndex || 0, header);
    }
  }

  panel.appendChild(itemsWrap);

  if (!isStatic && items.length > pageSize) {
    var pages2 = chunkArray(items, pageSize);
    if (pages2.length > 1) {
      var dotsRow = document.createElement('div');
      dotsRow.className = 'pagination-dots';
      for (var i = 0; i < pages2.length; i++) {
        var dot = document.createElement('div');
        dot.className = 'pagination-dot' + (i === 0 ? ' active' : '');
        dotsRow.appendChild(dot);
      }
      panel.appendChild(dotsRow);
    }
  }

  return panel;
}

function setupPagination(container, totalPages, panelIndex, headerEl) {
  var currentPage = 0;
  var isTransitioning = false;
  var delay = panelIndex * 1800;
  var panel = container.parentElement;

  function doTransition() {
    if (frozen || isTransitioning) return;
    if (!panel) panel = container.parentElement;
    if (!panel) return;
    var pages = container.querySelectorAll('.items-page');
    if (pages.length <= 1) return;

    isTransitioning = true;
    var cur = pages[currentPage];
    var next = (currentPage + 1) % totalPages;
    var nextEl = pages[next];

    cur.classList.add('fade-out');
    cur.classList.remove('active');

    setTimeout(function() {
      cur.classList.remove('fade-out');
      nextEl.classList.add('active');
      currentPage = next;
      isTransitioning = false;

      var dots = panel.querySelectorAll('.pagination-dot');
      dots.forEach(function(d, i) {
        d.classList.toggle('active', i === currentPage);
      });

      var subEl = headerEl.querySelector('.panel-subtitle');
      if (subEl) {
        var baseText = subEl.getAttribute('data-base') || subEl.textContent;
        if (!subEl.getAttribute('data-base')) subEl.setAttribute('data-base', baseText);
        subEl.textContent = 'Page ' + (currentPage + 1) + ' of ' + totalPages;
      }
    }, 700);
  }

  function startTimer() {
    var iv = setInterval(doTransition, 12000);
    pageIntervals.push(iv);
  }

  if (delay > 0) {
    setTimeout(startTimer, delay);
  } else {
    startTimer();
  }
}

function createKODBrandStrip() {
  var strip = document.createElement('div');
  strip.className = 'kod-brand-strip';
  strip.id = 'kod-brand-strip';

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

  return strip;
}

function renderScreen(items) {
  clearAllIntervals();
  currentMenuItems = items;
  var body = document.getElementById('screen-body');
  body.textContent = '';

  if (!items || items.length === 0) {
    body.innerHTML = '<div class="loading"><div class="spinner"></div><p>No menu items available</p></div>';
    return;
  }

  var data = groupByCategory(items);
  var groups = data.groups;

  if (ST === 'main' && SN === 1) renderMain1(body, groups);
  else if (ST === 'main' && SN === 2) renderMain2(body, groups);
  else if (ST === 'main' && SN === 3) renderMain3(body, groups);
  else if (ST === 'sushi' && SN === 1) renderSushi1(body, groups);
  else if (ST === 'sushi' && SN === 2) renderSushi2(body, groups);
  else renderGeneric(body, groups, data.order);

  addFlameAndSmoke();
  toggleCampfire(campfireEnabled);
}

function renderMain1(body, groups) {
  body.className = 'screen-body layout-main1';

  var startersItems = groups['Starters'] || [];
  var mid = Math.ceil(startersItems.length / 2);
  var col1Items = startersItems.slice(0, mid);
  var col2Items = startersItems.slice(mid);

  body.appendChild(createPanel({ title: 'Starters', subtitle: 'Part 1 of 2', items: col1Items, panelIndex: 0 }));
  body.appendChild(createPanel({ title: 'Starters', subtitle: 'Part 2 of 2', items: col2Items, panelIndex: 1 }));

  var col3 = document.createElement('div');
  col3.className = 'col3-stack';

  var soupsItems = groups['Soups'] || [];
  col3.appendChild(createPanel({ title: 'Soups', items: soupsItems, pageSize: 5, panelIndex: 2 }));

  var saladsItems = groups['Salads'] || [];
  col3.appendChild(createPanel({ title: 'Salads', items: saladsItems, pageSize: 2, panelIndex: 3 }));

  body.appendChild(col3);
}

function renderMain2(body, groups) {
  body.className = 'screen-body layout-main2';

  var col1 = document.createElement('div');
  col1.className = 'col1-stack';

  var burgersItems = groups['Burgers'] || [];
  col1.appendChild(createPanel({ title: 'Burgers', items: burgersItems, panelIndex: 0 }));
  col1.appendChild(createKODBrandStrip());
  body.appendChild(col1);

  var wrapsItems = groups['Wraps'] || [];
  body.appendChild(createPanel({ title: 'Wraps', items: wrapsItems, pageSize: 7, panelIndex: 1 }));

  var sandwichItems = groups['Sandwiches'] || [];
  body.appendChild(createPanel({ title: 'Sandwiches', items: sandwichItems, pageSize: 9, panelIndex: 2 }));
}

function renderMain3(body, groups) {
  body.className = 'screen-body layout-main3';

  var plattersItems = groups['Platters'] || [];
  body.appendChild(createPanel({ title: 'Platters', items: plattersItems, pageSize: 4, panelIndex: 0 }));

  var shawarmaItems = groups['Shawarma'] || [];
  body.appendChild(createPanel({ title: 'Shawarma', items: shawarmaItems, panelIndex: 1 }));

  var chickenItems = groups['Fried Chicken'] || [];
  body.appendChild(createPanel({ title: 'Fried Chicken', items: chickenItems, panelIndex: 2 }));

  var sideItems = groups['On the Side'] || [];
  body.appendChild(createPanel({ title: 'On the Side', items: sideItems, pageSize: 4, panelIndex: 3 }));

  var kidsItems = groups['Specials & Kids'] || [];
  body.appendChild(createPanel({ title: 'Specials & Kids', items: kidsItems, pageSize: 5, panelIndex: 4 }));

  var drinkItems = groups['Drinks'] || [];
  body.appendChild(createPanel({ title: 'Drinks', items: drinkItems, panelIndex: 5 }));
}

function renderSushi1(body, groups) {
  body.className = 'screen-body layout-sushi1';

  var allSpecialty = groups['Specialty Rolls'] || [];
  var third = Math.ceil(allSpecialty.length / 3);
  var part1 = allSpecialty.slice(0, third);
  var part2 = allSpecialty.slice(third, third * 2);
  var part3 = allSpecialty.slice(third * 2);

  body.appendChild(createPanel({ title: 'Specialty Rolls', subtitle: 'Part 1 of 3', items: part1, panelIndex: 0 }));
  body.appendChild(createPanel({ title: 'Specialty Rolls', subtitle: 'Part 2 of 3', items: part2, panelIndex: 1 }));
  body.appendChild(createPanel({ title: 'Specialty Rolls', subtitle: 'Part 3 of 3', items: part3, panelIndex: 2 }));
}

function renderSushi2(body, groups) {
  body.className = 'screen-body layout-sushi2';

  var messItems = groups['Sushi Mess'] || [];
  body.appendChild(createPanel({ title: 'Sushi Mess', note: 'Served over sushi rice topped with avocado & spicy mayo', items: messItems, pageSize: 4, panelIndex: 0 }));

  var rollItems = groups['Sushi Rolls'] || [];
  body.appendChild(createPanel({ title: 'Sushi Rolls', items: rollItems, pageSize: 4, panelIndex: 1 }));

  var vegItems = groups['Vegetable Rolls'] || [];
  body.appendChild(createPanel({ title: 'Vegetable Rolls', items: vegItems, pageSize: 4, panelIndex: 2 }));

  var tempuraItems = groups['Tempura Rolls'] || [];
  body.appendChild(createPanel({ title: 'Tempura Rolls', items: tempuraItems, pageSize: 4, panelIndex: 3 }));

  var nigiriItems = groups['Nigiri / Sashimi'] || [];
  body.appendChild(createPanel({ title: 'Nigiri / Sashimi', note: '1 pc per order', items: nigiriItems, pageSize: 4, panelIndex: 4 }));

  var platterItems = groups['Platters'] || [];
  body.appendChild(createPanel({ title: 'Sushi Platters', items: platterItems, panelIndex: 5 }));
}

function renderGeneric(body, groups, order) {
  body.className = 'screen-body';
  body.style.gridTemplateColumns = 'repeat(' + Math.min(order.length, 3) + ',1fr)';
  var pi = 0;
  order.forEach(function(cat) {
    body.appendChild(createPanel({ title: cat, items: groups[cat], panelIndex: pi++ }));
  });
}

function updatePriceInPlace(itemId, itemName, newPrice) {
  var name = (itemName || '').toLowerCase();
  currentMenuItems.forEach(function(item) {
    var matchesId = itemId != null && String(item.id) === String(itemId);
    var matchesName = name && itemDisplayName(item).toLowerCase() === name;
    if (matchesId || matchesName) item.price = newPrice;
  });

  var nodes = document.querySelectorAll('.menu-item');
  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i];
    var idMatch = itemId != null && el.getAttribute('data-item-id') === String(itemId);
    var nameMatch = name && el.getAttribute('data-item-name') === name;
    if (!idMatch && !nameMatch) continue;
    var priceEl = el.querySelector('.mi-price');
    if (!priceEl) continue;
    if (priceEl.classList.contains('rotating')) continue;
    priceEl.textContent = formatPrice(newPrice);
  }
}

function showFeaturedItem(data) {
  var strip = document.getElementById('kod-brand-strip');
  if (!strip) return;
  strip.innerHTML = '';
  strip.className = 'kod-brand-strip';

  var name = document.createElement('div');
  name.style.cssText = "font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--item-name);letter-spacing:3px;text-align:center;padding:0 8px;";
  name.textContent = data.name;
  strip.appendChild(name);

  if (data.description) {
    var desc = document.createElement('div');
    desc.style.cssText = "font-family:'Barlow Condensed',sans-serif;font-weight:300;font-size:11px;color:var(--item-desc);text-align:center;margin-top:4px;";
    desc.textContent = data.description;
    strip.appendChild(desc);
  }

  if (data.price) {
    var price = document.createElement('div');
    price.style.cssText = "font-family:'Bebas Neue',sans-serif;font-size:32px;color:var(--item-price);margin-top:6px;";
    price.textContent = data.price;
    strip.appendChild(price);
  }
}

function clearFeaturedItem() {
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
}

function addFlameAndSmoke() {
  if (ST !== 'main' || SN !== 2) return;
  
  var existing = document.getElementById('flame-smoke-layer');
  if (existing) existing.remove();

  var wrapsPanel = document.querySelector('.screen-body > .panel:nth-child(2)');
  if (!wrapsPanel) return;

  var layer = document.createElement('div');
  layer.id = 'flame-smoke-layer';
  layer.style.cssText = 'position:absolute;bottom:20px;left:50%;transform:translateX(-50%);width:200px;height:200px;pointer-events:none;z-index:5;';

  var canvas = document.createElement('canvas');
  canvas.id = 'kodCampfire';
  canvas.width = 200;
  canvas.height = 200;
  canvas.style.cssText = 'width:100%;height:100%;';
  
  layer.appendChild(canvas);
  wrapsPanel.style.position = 'relative';
  wrapsPanel.appendChild(layer);

  if (!campfireEnabled) {
    layer.style.display = 'none';
  }

  var ctx = canvas.getContext('2d');
  var W = canvas.width;
  var H = canvas.height;
  var centerX = W / 2;
  var baseY = H * 0.78;
  var flameGradient;

  function buildGradients() {
    flameGradient = ctx.createRadialGradient(centerX, baseY - 20, 5, centerX, baseY - 40, 60);
    flameGradient.addColorStop(0, 'rgba(255, 240, 200, 1)');
    flameGradient.addColorStop(0.3, 'rgba(255, 160, 60, 0.9)');
    flameGradient.addColorStop(0.6, 'rgba(255, 100, 40, 0.7)');
    flameGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  }
  buildGradients();

  function drawLogs() {
    ctx.save();
    ctx.translate(centerX, baseY + 10);
    ctx.fillStyle = '#3b2a1f';
    ctx.strokeStyle = '#1d140f';
    ctx.lineWidth = 3;
    ctx.save();
    ctx.rotate(-0.35);
    ctx.beginPath();
    ctx.roundRect(-50, -10, 100, 20, 10);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.rotate(0.35);
    ctx.beginPath();
    ctx.roundRect(-50, -10, 100, 20, 10);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  var flicker = 0;
  var flickerSpeed = 0.04;

  function drawFlame() {
    flicker += flickerSpeed * 2;
    var flicker2 = flicker * 1.3;
    var flicker3 = flicker * 0.7;
    var sway = Math.sin(flicker) * 3;
    var heightVar = Math.sin(flicker2) * 8;
    var widthVar = Math.sin(flicker3) * 4;
    var alphaFlicker = 0.85 + Math.sin(flicker * 2) * 0.15;
    ctx.save();
    ctx.globalAlpha = alphaFlicker;
    ctx.fillStyle = flameGradient;
    ctx.beginPath();
    var baseWidth = 28 + widthVar;
    var tipY = baseY - 55 + heightVar;
    ctx.moveTo(centerX - baseWidth, baseY);
    ctx.bezierCurveTo(centerX - baseWidth, baseY - 20, centerX - 15 + sway, baseY - 35, centerX + sway, tipY);
    ctx.bezierCurveTo(centerX + 15 + sway, baseY - 35, centerX + baseWidth, baseY - 20, centerX + baseWidth, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawGlow() {
    var glow = ctx.createRadialGradient(centerX, baseY, 5, centerX, baseY, 80);
    glow.addColorStop(0, 'rgba(174, 49, 54, 0.35)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }

  function loop() {
    if (!campfireEnabled) {
      ctx.clearRect(0, 0, W, H);
      return;
    }
    ctx.clearRect(0, 0, W, H);
    drawGlow();
    drawLogs();
    drawFlame();
    requestAnimationFrame(loop);
  }
  loop();
}

function enterFullscreen() {
  var el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  else if (el.msRequestFullscreen) el.msRequestFullscreen();
  document.getElementById('fullscreen-overlay').classList.add('hidden');
  enableKiosk();
  unlockAudio();
}

var kioskTimeout;
function enableKiosk() {
  document.body.classList.add('kiosk-mode');
  resetKioskTimeout();
}

function resetKioskTimeout() {
  clearTimeout(kioskTimeout);
  document.body.classList.remove('kiosk-mode');
  kioskTimeout = setTimeout(function() { document.body.classList.add('kiosk-mode'); }, 3000);
}

document.getElementById('fullscreen-overlay').addEventListener('click', enterFullscreen);
document.addEventListener('click', unlockAudio, { once: true });
document.addEventListener('touchstart', unlockAudio, { once: true });
document.addEventListener('fullscreenchange', function() {
  if (!document.fullscreenElement) {
    document.getElementById('fullscreen-overlay').classList.remove('hidden');
    document.body.classList.remove('kiosk-mode');
  }
});
document.addEventListener('mousemove', resetKioskTimeout);

try {
  document.documentElement.requestFullscreen().then(function() {
    document.getElementById('fullscreen-overlay').classList.add('hidden');
    enableKiosk();
  }).catch(function() {});
} catch (e) {}

document.addEventListener('wheel', function(e) { e.preventDefault(); }, { passive: false });
document.addEventListener('touchmove', function(e) { e.preventDefault(); }, { passive: false });
document.addEventListener('touchstart', function(e) { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
document.addEventListener('contextmenu', function(e) { e.preventDefault(); });

document.addEventListener('keydown', function(e) {
  var blocked = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' '];
  if (blocked.indexOf(e.key) !== -1) e.preventDefault();
  if (e.key === 'F11') { e.preventDefault(); enterFullscreen(); }
});

async function init() {
  connectSocket();
  startPolling();
  var items = await fetchMenu();
  if (items.length > 0) renderScreen(items);
}

init();

})();
