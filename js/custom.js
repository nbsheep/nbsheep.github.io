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

// 首页顶部 hero 浮动光点（淡淡的光点向上飘）
(function () {
  function addHeroParticles() {
    var header = document.getElementById('page-header');
    if (!header || !header.classList.contains('full_page')) return;
    if (header.querySelector('.hero-particles')) return; // 避免重复注入
    var wrap = document.createElement('div');
    wrap.className = 'hero-particles';
    for (var i = 0; i < 14; i++) {
      var dot = document.createElement('span');
      var s = 2 + Math.random() * 3;
      dot.style.left = (Math.random() * 100).toFixed(2) + '%';
      dot.style.top = (30 + Math.random() * 70).toFixed(2) + '%';
      dot.style.width = s.toFixed(1) + 'px';
      dot.style.height = s.toFixed(1) + 'px';
      dot.style.animationDuration = (6 + Math.random() * 8).toFixed(1) + 's';
      dot.style.animationDelay = (-Math.random() * 8).toFixed(1) + 's';
      wrap.appendChild(dot);
    }
    header.appendChild(wrap);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addHeroParticles);
  } else {
    addHeroParticles();
  }
  // PJAX 跳转后若 header 被重渲染，再补一次
  document.addEventListener('pjax:complete', addHeroParticles);
})();

// 首页主题卡片（参考 everoot 的 intro-cards）
(function () {
  var CARDS = [
    { icon: '🛸', title: '无人机', desc: '大疆 M3E 接入 RoboNIX 的进展与踩坑' },
    { icon: '🤖', title: '机器人', desc: '具身智能 / RoboNIX 的学习折腾记录' },
    { icon: '🔌', title: '嵌入式', desc: 'STM32 与工控机的通讯方案笔记' }
  ];
  function addIntroCards() {
    var target = document.getElementById('recent-posts');
    if (!target) return;                       // 只在首页（有文章列表）注入
    if (document.querySelector('.intro-cards')) return; // 避免重复
    var wrap = document.createElement('div');
    wrap.className = 'intro-cards';
    CARDS.forEach(function (c) {
      var card = document.createElement('div');
      card.className = 'intro-card';
      var icon = document.createElement('div');
      icon.className = 'icon';
      icon.textContent = c.icon;
      var h = document.createElement('h3');
      h.textContent = c.title;
      var p = document.createElement('p');
      p.textContent = c.desc;
      card.appendChild(icon);
      card.appendChild(h);
      card.appendChild(p);
      wrap.appendChild(card);
    });
    target.parentNode.insertBefore(wrap, target);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addIntroCards);
  } else {
    addIntroCards();
  }
  document.addEventListener('pjax:complete', addIntroCards);
})();
