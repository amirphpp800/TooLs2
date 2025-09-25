(function(){
  'use strict';
  function rand(min, max){ return Math.random() * (max - min) + min; }
  function dist(a, b){ const dx = a.x - b.x, dy = a.y - b.y; return Math.hypot(dx, dy); }

  function init(canvas){
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const DPR = Math.max(1, Math.floor(window.devicePixelRatio || 1));

    let width = 0, height = 0, points = [], animId = 0; 
    const COUNT = 80; // particle count
    const MAX_LINK = 120; // link distance in px

    function resize(){
      const rect = canvas.getBoundingClientRect();
      width = Math.floor(rect.width);
      height = Math.floor(rect.height);
      canvas.width = width * DPR;
      canvas.height = height * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function spawn(){
      points = Array.from({length: COUNT}).map(()=>({
        x: rand(0, width), y: rand(0, height),
        vx: rand(-0.5, 0.5), vy: rand(-0.5, 0.5)
      }));
    }

    function step(){
      ctx.clearRect(0, 0, width, height);

      // links
      ctx.strokeStyle = 'rgba(176,212,210,0.25)'; // #B0D4D2 with alpha
      for (let i=0;i<points.length;i++){
        for (let j=i+1;j<points.length;j++){
          const a = points[i], b = points[j];
          const d = dist(a,b);
          if (d < MAX_LINK){
            ctx.globalAlpha = 1 - d / MAX_LINK;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;

      // points
      ctx.fillStyle = 'rgba(243,246,247,0.7)'; // icy white
      for (const p of points){
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI*2);
        ctx.fill();
      }

      // move
      for (const p of points){
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      }

      animId = requestAnimationFrame(step);
    }

    function start(){
      resize();
      spawn();
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(step);
    }

    const ro = new ResizeObserver(start);
    ro.observe(canvas);

    return { start };
  }

  window.Particles = { init };
})();
