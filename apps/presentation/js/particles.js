/**
 * ARBI Presentation - Particle System
 * Cyberpunk floating particles with neon glow
 */

export function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;

  const particleCount = 50;
  const particles = [];

  // Create particles
  for (let i = 0; i < particleCount; i++) {
    const particle = createParticle();
    container.appendChild(particle);
    particles.push({
      element: particle,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 3 + 1
    });
  }

  // Animation loop
  function animate() {
    particles.forEach(p => {
      // Update position
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around edges
      if (p.x < 0) p.x = window.innerWidth;
      if (p.x > window.innerWidth) p.x = 0;
      if (p.y < 0) p.y = window.innerHeight;
      if (p.y > window.innerHeight) p.y = 0;

      // Apply position
      p.element.style.left = p.x + 'px';
      p.element.style.top = p.y + 'px';
    });

    requestAnimationFrame(animate);
  }

  animate();

  // Draw connections between nearby particles
  createConnectionCanvas(container, particles);
}

function createParticle() {
  const particle = document.createElement('div');
  particle.className = 'particle';
  
  // Randomize color between green and purple
  const isGreen = Math.random() > 0.5;
  const color = isGreen ? '#00ff41' : '#bf00ff';
  const glow = isGreen ? 'rgba(0, 255, 65, 0.8)' : 'rgba(191, 0, 255, 0.8)';
  
  particle.style.cssText = `
    position: absolute;
    width: ${Math.random() * 3 + 1}px;
    height: ${Math.random() * 3 + 1}px;
    background: ${color};
    border-radius: 50%;
    box-shadow: 0 0 ${Math.random() * 10 + 5}px ${glow};
    opacity: ${Math.random() * 0.5 + 0.3};
    pointer-events: none;
  `;
  
  return particle;
}

function createConnectionCanvas(container, particles) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  `;
  container.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');
  
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  function drawConnections() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const connectionDistance = 150;
    
    particles.forEach((p1, i) => {
      particles.slice(i + 1).forEach(p2 => {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < connectionDistance) {
          const opacity = 1 - (distance / connectionDistance);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          
          // Gradient line
          const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
          gradient.addColorStop(0, `rgba(0, 255, 65, ${opacity * 0.3})`);
          gradient.addColorStop(1, `rgba(191, 0, 255, ${opacity * 0.3})`);
          
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });
    });
    
    requestAnimationFrame(drawConnections);
  }
  
  drawConnections();
}

// Floating code snippets effect
export function createFloatingCode(gsap) {
  const codeSnippets = [
    'const arbi = new ArbitrageEngine();',
    'await analyzer.score(opportunity);',
    'riskManager.validate(trade);',
    'if (score >= 70) execute();',
    'scout.scan(["ebay", "amazon"]);',
    'profit = sellPrice - buyPrice - fees;',
    'ai.predict(marketTrends);',
    'autonomous.run(24/7);'
  ];
  
  const container = document.querySelector('.reveal');
  if (!container) return;
  
  setInterval(() => {
    const snippet = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
    const floating = document.createElement('div');
    floating.className = 'floating-code';
    floating.textContent = snippet;
    floating.style.cssText = `
      position: fixed;
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.7rem;
      color: rgba(0, 255, 65, 0.3);
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
      left: ${Math.random() * 80 + 10}%;
      top: ${Math.random() * 80 + 10}%;
    `;
    
    container.appendChild(floating);
    
    // Animate and remove
    if (gsap) {
      gsap.fromTo(floating, 
        { opacity: 0, y: 20 },
        { 
          opacity: 0.3, 
          y: -50, 
          duration: 3,
          ease: 'power1.out',
          onComplete: () => floating.remove()
        }
      );
    } else {
      setTimeout(() => floating.remove(), 3000);
    }
  }, 4000);
}

// Matrix rain effect (optional, can be enabled)
export function createMatrixRain() {
  const canvas = document.createElement('canvas');
  canvas.id = 'matrix-rain';
  canvas.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: -1;
    opacity: 0.1;
  `;
  document.body.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  const chars = 'ARBI01アイビトレード利益$€£¥%+-*/=<>[]{}';
  const fontSize = 14;
  const columns = canvas.width / fontSize;
  const drops = Array(Math.floor(columns)).fill(1);
  
  function draw() {
    ctx.fillStyle = 'rgba(10, 10, 15, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#00ff41';
    ctx.font = fontSize + 'px monospace';
    
    drops.forEach((y, i) => {
      const text = chars[Math.floor(Math.random() * chars.length)];
      const x = i * fontSize;
      ctx.fillText(text, x, y * fontSize);
      
      if (y * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    });
  }
  
  setInterval(draw, 50);
  
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}
