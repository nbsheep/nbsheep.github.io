(function () {
  var CHOICE_KEY = 'bgm-choice';      // 'play' | 'dismiss'
  var POSITION_KEY = 'bgm-position';  // 播放进度（秒）
  var NAME_KEY = 'bgm-name';          // 已选文件名（仅展示用）

  var currentObjectUrl = null; // 当前选中歌曲的 object URL，null 表示还没选歌

  function getAudio() { return document.getElementById('bgm-player'); }
  function getBtn() { return document.getElementById('music-btn'); }

  function getChoice() {
    try { return localStorage.getItem(CHOICE_KEY); } catch (e) { return null; }
  }
  function setChoice(v) {
    try { localStorage.setItem(CHOICE_KEY, v); } catch (e) {}
  }
  function getPosition() {
    try { return parseFloat(localStorage.getItem(POSITION_KEY)) || 0; } catch (e) { return 0; }
  }

  function playAudio() {
    var audio = getAudio();
    var btn = getBtn();
    if (!audio) return;
    var p = audio.play();
    if (p && typeof p.then === 'function') {
      p.then(function () { if (btn) btn.classList.add('playing'); })
       .catch(function () { if (btn) btn.classList.remove('playing'); });
    }
  }

  function hideTip() {
    var tip = document.getElementById('music-tip');
    if (tip) tip.classList.remove('show');
  }

  function setTipSub(text) {
    var tip = document.getElementById('music-tip');
    if (!tip) return;
    var sub = tip.querySelector('.sub');
    if (sub) sub.textContent = text;
  }

  // ---------- IndexedDB：持久化用户选择的 mp3 文件（整页刷新后也能恢复） ----------
  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open('bgm-store', 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function saveFile(blob) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').put(blob, 'bgm-file');
        tx.oncomplete = function () { db.close(); resolve(); };
        tx.onerror = function () { db.close(); reject(tx.error); };
      });
    });
  }

  function loadFile() {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction('files', 'readonly');
        var req = tx.objectStore('files').get('bgm-file');
        req.onsuccess = function () { db.close(); resolve(req.result || null); };
        req.onerror = function () { db.close(); reject(req.error); };
      });
    });
  }

  // ---------- 文件选择 ----------
  var fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'audio/*';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  function useFile(file) {
    if (!file) return;
    if (currentObjectUrl) { try { URL.revokeObjectURL(currentObjectUrl); } catch (e) {} }
    currentObjectUrl = URL.createObjectURL(file);
    var audio = getAudio();
    if (audio) {
      audio.src = currentObjectUrl;
      audio.load();
    }
    saveFile(file).catch(function () {});
    try { localStorage.setItem(NAME_KEY, file.name); } catch (e) {}
    setChoice('play');
    setTipSub('正在播放：' + file.name);
  }

  function pickFile(callback) {
    fileInput.onchange = function () {
      var file = fileInput.files && fileInput.files[0];
      fileInput.value = ''; // 允许再次选择同一个文件
      if (file) {
        useFile(file);
        if (callback) callback();
      }
    };
    fileInput.click();
  }

  // ---------- 悬浮按钮：播放/暂停；没选歌时先选歌 ----------
  window.toggleMusic = function () {
    var audio = getAudio();
    var btn = getBtn();
    if (!audio) return;
    if (!currentObjectUrl) {
      pickFile(function () { playAudio(); });
      return;
    }
    if (audio.paused) {
      playAudio();
    } else {
      audio.pause();
      if (btn) btn.classList.remove('playing');
    }
  };

  // ---------- 弹窗 ----------
  window.startMusic = function () {
    pickFile(function () {
      hideTip();
      playAudio();
    });
  };

  window.closeMusicTip = function () {
    setChoice('dismiss');
    hideTip();
  };

  // ---------- 进度 ----------
  function savePosition() {
    var audio = getAudio();
    if (audio && isFinite(audio.currentTime) && audio.currentTime > 0) {
      try { localStorage.setItem(POSITION_KEY, String(audio.currentTime)); } catch (e) {}
    }
  }
  window.addEventListener('beforeunload', savePosition);
  window.addEventListener('pagehide', savePosition);

  function seekTo(audio, pos) {
    if (!(pos > 0)) return;
    var seek = function () { try { audio.currentTime = pos; } catch (e) {} };
    if (audio.readyState >= 1) seek();
    else audio.addEventListener('loadedmetadata', seek, { once: true });
  }

  function init() {
    var choice = getChoice();

    if (choice === 'play') {
      // 之前开启过：从 IndexedDB 恢复上次选的歌，不再弹窗
      loadFile().then(function (blob) {
        if (blob) {
          currentObjectUrl = URL.createObjectURL(blob);
          var audio = getAudio();
          if (audio) {
            audio.src = currentObjectUrl;
            audio.load();
            seekTo(audio, getPosition());
            playAudio();
          }
          try { setTipSub('正在播放：' + (localStorage.getItem(NAME_KEY) || '')); } catch (e) {}
        }
        // 文件被清理（如浏览器清缓存）时：不弹窗，点右下角 ♫ 可重新选歌
      }).catch(function () {});
      return;
    }

    if (choice === 'dismiss') {
      // 之前选择不开启：不做任何处理
      return;
    }

    // 首次访问：约 1 秒后弹出询问
    var tip = document.getElementById('music-tip');
    if (tip) setTimeout(function () { tip.classList.add('show'); }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// 首页 hero 星野背景：生成大量闪烁的小星星，填满顶部空白
(function () {
  function addStars() {
    var header = document.getElementById('page-header');
    if (!header || !header.classList.contains('full_page')) return;
    if (header.querySelector('.hero-stars')) return; // 避免重复
    var wrap = document.createElement('div');
    wrap.className = 'hero-stars';
    for (var i = 0; i < 90; i++) {
      var s = document.createElement('span');
      var size = (0.8 + Math.random() * 2.2).toFixed(1);
      s.style.left = (Math.random() * 100).toFixed(2) + '%';
      s.style.top = (Math.random() * 100).toFixed(2) + '%';
      s.style.width = size + 'px';
      s.style.height = size + 'px';
      s.style.animationDuration = (2.5 + Math.random() * 4).toFixed(1) + 's';
      s.style.animationDelay = (-Math.random() * 6).toFixed(1) + 's';
      // 少量星星带淡淡颜色（暖黄 / 冷蓝），更接近真实星野
      var r = Math.random();
      if (r > 0.85) s.style.background = 'rgba(240, 200, 140, 0.9)';
      else if (r > 0.7) s.style.background = 'rgba(150, 200, 255, 0.9)';
      wrap.appendChild(s);
    }
    header.appendChild(wrap);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addStars);
  } else {
    addStars();
  }
  document.addEventListener('pjax:complete', addStars);
})();

// 全屏流星特效：仍是往右下坠落，但进场位置在「顶部」和「左侧」之间随机
(function () {
  function addMeteors() {
    if (document.querySelector('.meteor-wrap')) return; // 避免重复，fixed 层只建一次
    var wrap = document.createElement('div');
    wrap.className = 'meteor-wrap';
    var COUNT = 22;
    for (var i = 0; i < COUNT; i++) {
      var m = document.createElement('div');
      m.className = 'meteor';
      var fromLeft = Math.random() < 0.4;   // 约四成从左侧屏幕外进场
      if (fromLeft) {
        m.style.left = (-(8 + Math.random() * 8)).toFixed(1) + '%';   // 左侧屏幕外
        m.style.top = (Math.random() * 55).toFixed(1) + '%';           // 上半部出现，留出下落空间
      } else {
        m.style.left = (Math.random() * 95).toFixed(1) + '%';          // 顶部任意横向位置
        m.style.top = (-(8 + Math.random() * 7)).toFixed(1) + '%';     // 屏幕上方出现
      }
      m.style.setProperty('--dur', (8 + Math.random() * 7).toFixed(1) + 's'); // 慢一些
      m.style.setProperty('--delay', (Math.random() * 6).toFixed(1) + 's');
      var line = document.createElement('i');
      line.className = 'line';
      m.appendChild(line);
      wrap.appendChild(m);
    }
    document.body.appendChild(wrap);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addMeteors);
  } else {
    addMeteors();
  }
})();

// ============ 中英界面切换：默认英文，可一键切换，localStorage 记忆 ============
(function () {
  var LANG_KEY = 'site-lang';

  function getMap() { return window.I18N || {}; }
  function getLang() {
    try { return localStorage.getItem(LANG_KEY) || 'en'; } catch (e) { return 'en'; }
  }
  function setLang(v) { try { localStorage.setItem(LANG_KEY, v); } catch (e) {} }

  // 只会把"整段就是一个标签"的文本节点替换成目标语言；
  // 文章正文是整句，不会命中，因此正文保持中文不变。
  function applyLang(lang) {
    var map = getMap();
    var source;
    if (lang === 'en') {
      source = map;               // 中文 -> 英文
    } else {
      source = {};                // 英文 -> 中文
      for (var k in map) source[map[k]] = k;
    }
    if (!document.body) return;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) nodes.push(n);
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var t = node.nodeValue;
      if (!t || !t.trim()) continue;
      var key = t.trim();
      if (source[key] !== undefined) {
        node.nodeValue = t.replace(key, source[key]);
      }
    }
    applyTitles(lang);
    updateToggle(lang);
    document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'zh-CN');
  }

  // 只替换首页卡片 + 侧边栏“最新文章”里的标题，文章页标题与正文保持中文
  function applyTitles(lang) {
    var t = window.I18N_TITLES || {};
    if (lang !== 'en') {
      var rev = {};
      for (var k in t) rev[t[k]] = k;
      t = rev;
    }
    var scopes = document.querySelectorAll('.recent-post-info .article-title, .card-recent-post .content a.title');
    for (var i = 0; i < scopes.length; i++) {
      var el = scopes[i];
      var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
      var nodes = [];
      var n;
      while ((n = w.nextNode())) nodes.push(n);
      for (var j = 0; j < nodes.length; j++) {
        var node = nodes[j];
        var key = node.nodeValue.trim();
        if (key && t[key] !== undefined) node.nodeValue = node.nodeValue.replace(key, t[key]);
      }
    }
  }

  function updateToggle(lang) {
    var btns = document.querySelectorAll('.lang-switch .lang-opt');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].getAttribute('data-lang') === lang) btns[i].classList.add('active');
      else btns[i].classList.remove('active');
    }
  }

  window.switchLang = function (lang) {
    setLang(lang);
    applyLang(lang);
  };

  function ensureToggle() {
    if (document.querySelector('.lang-switch')) return;
    var wrap = document.createElement('div');
    wrap.className = 'lang-switch';
    [['en', 'EN'], ['zh-CN', '中文']].forEach(function (o) {
      var b = document.createElement('button');
      b.className = 'lang-opt';
      b.type = 'button';
      b.setAttribute('data-lang', o[0]);
      b.textContent = o[1];
      b.addEventListener('click', function () { window.switchLang(o[0]); });
      wrap.appendChild(b);
    });
    document.body.appendChild(wrap);
  }

  function init() {
    ensureToggle();
    applyLang(getLang());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('pjax:complete', init);
})();
