// ================================================
// Particles Background — Performance-Optimized
// Floating particles with constellation effect for the Hero section
// ================================================

class ParticleSystem {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.maxParticles = 50;
    this.connectionDist = 120;
    this.animationFrameId = null;
    this.isActive = true;

    // Harmonious colors matching the Chapter's branding
    this.colors = [
      'rgba(37, 99, 235, 0.45)',  // Royal Blue
      'rgba(29, 78, 216, 0.35)',  // Deep Blue
      'rgba(96, 165, 250, 0.35)', // Accent Blue
    ];

    this.init();
    this.setupListeners();
  }

  init() {
    this.resizeCanvas();
    this.createParticles();
    this.animate();
  }

  resizeCanvas() {
    const parent = this.canvas.parentElement;
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;
  }

  createParticles() {
    this.particles = [];
    // Adjust particle density based on screen width
    const densityMultiplier = window.innerWidth < 768 ? 0.4 : 1.0;
    const count = Math.floor(this.maxParticles * densityMultiplier);

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.4, // Slow speed
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2.5 + 1,
        color: this.colors[Math.floor(Math.random() * this.colors.length)]
      });
    }
  }

  setupListeners() {
    // Resize with debouncing
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (this.canvas) {
          this.resizeCanvas();
          this.createParticles();
        }
      }, 200);
    });

    // Performance optimization: stop rendering if hero section is scrolled out of view
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          this.isActive = entry.isIntersecting;
          if (this.isActive && !this.animationFrameId) {
            this.animate();
          }
        });
      }, { threshold: 0.1 });

      const hero = this.canvas.closest('header, section, .hero-section');
      if (hero) observer.observe(hero);
    }
  }

  animate() {
    if (!this.isActive) {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      return;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawAndMoveParticles();
    this.drawConnections();

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  drawAndMoveParticles() {
    this.particles.forEach(p => {
      // Draw particle
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.fill();

      // Move particle
      p.x += p.vx;
      p.y += p.vy;

      // Bounce/Wrap boundaries
      if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;
    });
  }

  drawConnections() {
    const len = this.particles.length;
    for (let i = 0; i < len; i++) {
      for (let j = i + 1; j < len; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.connectionDist) {
          // Opacity fades out as distance increases
          const opacity = (1 - dist / this.connectionDist) * 0.15;
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(147, 197, 253, ${opacity})`;
          this.ctx.lineWidth = 0.8;
          this.ctx.stroke();
        }
      }
    }
  }
}

// Initialize when DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ParticleSystem('heroParticles');
});
