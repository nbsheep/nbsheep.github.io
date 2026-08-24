(function () {
  var CHOICE_KEY = 'bgm-choice';      // 用户对背景音乐的选择：'play' 或 'dismiss'
  var POSITION_KEY = 'bgm-position';  // 播放进度（秒）

  function getAudio() { return document.getElementById('bgm-player'); }
  function getBtn() { return document.getElementById('music-btn'); }

  function getChoice() {
    try { return localStorage.getItem(CHOICE_KEY); } catch (e) { return null; }
  }
  function setChoice(v) {
    try { localStorage.setItem(CHOICE_KEY, v); } catch (e) {}
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

  // 悬浮按钮：播放 / 暂停切换
  window.toggleMusic = function () {
    var audio = getAudio();
    var btn = getBtn();
    if (!audio) return;
    if (audio.paused) {
      playAudio();
    } else {
      audio.pause();
      if (btn) btn.classList.remove('playing');
    }
  };

  // 弹窗「开启播放」：记住选择，后续页面不再询问
  window.startMusic = function () {
    setChoice('play');
    playAudio();
    hideTip();
  };

  // 弹窗「暂不播放」：记住选择，后续页面不再询问
  window.closeMusicTip = function () {
    setChoice('dismiss');
    hideTip();
  };

  function hideTip() {
    var tip = document.getElementById('music-tip');
    if (tip) tip.classList.remove('show');
  }

  // 记住播放进度（整页刷新 / 关闭前保存；PJAX 切换页面不触发，音乐元素常驻无感）
  function savePosition() {
    var audio = getAudio();
    if (audio && isFinite(audio.currentTime)) {
      try { localStorage.setItem(POSITION_KEY, String(audio.currentTime)); } catch (e) {}
    }
  }
  window.addEventListener('beforeunload', savePosition);
  window.addEventListener('pagehide', savePosition);

  function init() {
    var audio = getAudio();
    var choice = getChoice();

    if (choice === 'play') {
      // 之前选择过播放：恢复进度并继续播放，不再弹窗
      if (audio) {
        var pos = 0;
        try { pos = parseFloat(localStorage.getItem(POSITION_KEY)) || 0; } catch (e) {}
        if (pos > 0) {
          var seek = function () { try { audio.currentTime = pos; } catch (e) {} };
          if (audio.readyState >= 1) seek();
          else audio.addEventListener('loadedmetadata', seek, { once: true });
        }
        playAudio();
      }
      return;
    }

    if (choice === 'dismiss') {
      // 之前选择过暂不播放：不再询问
      return;
    }

    // 首次访问：约 1 秒后弹出询问（浏览器不允许自动播放，需用户点击）
    var tip = document.getElementById('music-tip');
    if (tip) setTimeout(function () { tip.classList.add('show'); }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
