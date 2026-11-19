(() => {
  function initSnow() {
    if (!document.body) return;

    let canvas = document.getElementById("snow-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "snow-canvas";
      canvas.setAttribute("aria-hidden", "true");
      document.body.appendChild(canvas);
    }

    if (canvas.dataset.snowInit === "1") return;
    canvas.dataset.snowInit = "1";

    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "3";

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const groundEl = document.querySelector(".snow-ground");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let groundTop = 0;
    let flakes = [];
    let lastStep = 0;
    const stepMs = 83; // 約12 FPSで控えめに落下

    function updateGroundTop() {
      groundTop = groundEl ? groundEl.getBoundingClientRect().top : height;
    }

    function createFlake(randomY) {
      const size = Math.random() > 0.45 ? 3 : 4;
      const maxSpawnY = Math.max(40, groundTop - size);
      return {
        x: Math.random() * width,
        y: randomY ? Math.random() * maxSpawnY : -size,
        size,
        vy: 0.9 + Math.random() * 0.9,
        swayAmp: Math.random() * 0.18,
        swayFreq: 0.0005 + Math.random() * 0.0007,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.4 + Math.random() * 0.45,
        tint: Math.random() > 0.3 ? "238, 240, 247" : "210, 212, 222"
      };
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      updateGroundTop();

      const targetCount = Math.min(36, Math.max(20, Math.floor((width * height) / 36000)));
      if (flakes.length === 0) {
        flakes = Array.from({ length: targetCount }, () => createFlake(true));
      } else if (flakes.length < targetCount) {
        while (flakes.length < targetCount) flakes.push(createFlake(true));
      } else if (flakes.length > targetCount) {
        flakes.length = targetCount;
      }
    }

    function render() {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        const px = Math.round(f.x);
        const py = Math.round(f.y);
        ctx.fillStyle = `rgba(${f.tint}, ${f.alpha})`;
        ctx.fillRect(px, py, f.size, f.size);
      }
    }

    function tick(now) {
      if (!lastStep) {
        lastStep = now;
        render();
      }

      if (!reducedMotion && now - lastStep >= stepMs) {
        lastStep = now;
        updateGroundTop();

        for (let i = 0; i < flakes.length; i++) {
          const f = flakes[i];
          f.y += f.vy;
          f.x += Math.sin(now * f.swayFreq + f.phase) * f.swayAmp;

          if (f.y + f.size >= groundTop) {
            f.y = -f.size;
            f.x = Math.random() * width;
          }
          if (f.x > width) {
            f.x = -f.size;
          } else if (f.x + f.size < 0) {
            f.x = width;
          }
        }

        render();
      }

      if (!reducedMotion) {
        requestAnimationFrame(tick);
      }
    }

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        lastStep = 0;
      }
    });
    requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSnow, { once: true });
  } else {
    initSnow();
  }
})();
