(function () {
  const canvas = document.createElement('canvas');
  canvas.id = 'bg-particles';
  const ctx = canvas.getContext('2d');

  const style = document.createElement('style');
  style.textContent = `
    #bg-particles {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 0;
    }
  `;
  document.head.appendChild(style);
  document.body.insertBefore(canvas, document.body.firstChild);

  let width, height;
  let particles = [];
  const PARTICLE_COUNT = 60;
  const CONNECTION_DIST = 120;
  const MOUSE_DIST = 150;

  let mouse = { x: null, y: null };

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  window.addEventListener('resize', resize);
  resize();

  document.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  document.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
  });

  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
      this.radius = Math.random() * 2 + 1;
      this.baseAlpha = Math.random() * 0.3 + 0.2;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0 || this.x > width) this.vx *= -1;
      if (this.y < 0 || this.y > height) this.vy *= -1;

      // Mouse interaction
      if (mouse.x !== null) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_DIST) {
          const force = (MOUSE_DIST - dist) / MOUSE_DIST;
          this.x -= dx * force * 0.02;
          this.y -= dy * force * 0.02;
        }
      }
    }

    draw() {
      const dark = isDark();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = dark
        ? `rgba(255, 255, 255, ${this.baseAlpha})`
        : `rgba(0, 0, 0, ${this.baseAlpha * 0.6})`;
      ctx.fill();
    }
  }

  function initParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle());
    }
  }

  function drawConnections() {
    const dark = isDark();
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONNECTION_DIST) {
          const alpha = (1 - dist / CONNECTION_DIST) * 0.15;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = dark
            ? `rgba(255, 255, 255, ${alpha})`
            : `rgba(0, 0, 0, ${alpha * 0.7})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.update();
      p.draw();
    });

    drawConnections();
    requestAnimationFrame(animate);
  }

  initParticles();
  animate();
})();
