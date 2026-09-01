/* 点击粒子特效 — 蓝绿配色，与 GitHub 主页一致 */
(function () {
  var COLORS = ['#06b6d4', '#0ea5e9', '#10b981', '#22d3ee'];
  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
  resize();
  addEventListener('resize', resize);
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  var parts = [];
  var running = false;

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.vy += 0.3;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
      ctx.globalAlpha = Math.max(p.life / p.max, 0);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      if (p.life <= 0) parts.splice(i, 1);
    }
    ctx.globalAlpha = 1;
    if (parts.length) requestAnimationFrame(frame);
    else running = false;
  }

  addEventListener('click', function (e) {
    for (var i = 0; i < 14; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 2 + Math.random() * 4.5;
      parts.push({
        x: e.clientX,
        y: e.clientY,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 2,
        r: 1.5 + Math.random() * 2.5,
        color: COLORS[i % COLORS.length],
        life: 40 + Math.random() * 25,
        max: 60
      });
    }
    if (!running) { running = true; requestAnimationFrame(frame); }
  }, true);
})();
