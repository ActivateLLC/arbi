/**
 * ARBI Presentation - GSAP Animations
 * Cyberpunk motion graphics and transitions
 */

// Initialize animations with passed dependencies
export function initAnimations(Reveal, gsap) {
  if (!gsap) {
    console.warn('GSAP not available, skipping animations');
    return;
  }

  // Initial slide animations
  gsap.defaults({
    ease: 'power3.out',
    duration: 0.8
  });

  // Animate feature cards on slide change
  Reveal.on('slidechanged', (event) => {
    const currentSlide = event.currentSlide;
    
    // Animate feature cards
    const featureCards = currentSlide.querySelectorAll('.feature-card');
    if (featureCards.length > 0) {
      gsap.fromTo(featureCards, 
        { opacity: 0, y: 50 },
        { 
          opacity: 1, 
          y: 0, 
          stagger: 0.2,
          duration: 0.6,
          ease: 'power2.out'
        }
      );
    }

    // Animate capability items
    const capabilityItems = currentSlide.querySelectorAll('.capability-item');
    if (capabilityItems.length > 0) {
      gsap.fromTo(capabilityItems,
        { opacity: 0, x: -30 },
        {
          opacity: 1,
          x: 0,
          stagger: 0.15,
          duration: 0.5
        }
      );
    }

    // Animate architecture nodes
    const archNodes = currentSlide.querySelectorAll('.arch-node');
    if (archNodes.length > 0) {
      gsap.fromTo(archNodes,
        { opacity: 0, scale: 0.8 },
        {
          opacity: 1,
          scale: 1,
          stagger: 0.3,
          duration: 0.6,
          ease: 'back.out(1.7)'
        }
      );
    }

    // Animate data flow stages
    const flowStages = currentSlide.querySelectorAll('.flow-stage');
    if (flowStages.length > 0) {
      gsap.fromTo(flowStages,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.2,
          duration: 0.5
        }
      );
      
      // Animate flow arrows
      const flowArrows = currentSlide.querySelectorAll('.flow-arrow');
      gsap.fromTo(flowArrows,
        { opacity: 0, scale: 0 },
        {
          opacity: 1,
          scale: 1,
          stagger: 0.2,
          delay: 0.5,
          duration: 0.3
        }
      );
    }

    // Animate tech grid
    const techCategories = currentSlide.querySelectorAll('.tech-category');
    if (techCategories.length > 0) {
      gsap.fromTo(techCategories,
        { opacity: 0, y: 30, rotationX: -15 },
        {
          opacity: 1,
          y: 0,
          rotationX: 0,
          stagger: 0.15,
          duration: 0.5
        }
      );
    }

    // Animate risk cards
    const riskCards = currentSlide.querySelectorAll('.risk-card');
    if (riskCards.length > 0) {
      gsap.fromTo(riskCards,
        { opacity: 0, scale: 0.5, rotation: -5 },
        {
          opacity: 1,
          scale: 1,
          rotation: 0,
          stagger: 0.1,
          duration: 0.4,
          ease: 'back.out(1.5)'
        }
      );
    }

    // Animate API endpoints
    const endpoints = currentSlide.querySelectorAll('.endpoint');
    if (endpoints.length > 0) {
      gsap.fromTo(endpoints,
        { opacity: 0, x: -50 },
        {
          opacity: 1,
          x: 0,
          stagger: 0.1,
          duration: 0.4
        }
      );
    }

    // Animate roadmap items
    const roadmapItems = currentSlide.querySelectorAll('.roadmap-item');
    if (roadmapItems.length > 0) {
      gsap.fromTo(roadmapItems,
        { opacity: 0, y: 40 },
        {
          opacity: (index, target) => {
            return target.classList.contains('completed') || target.classList.contains('active') ? 1 : 0.6;
          },
          y: 0,
          stagger: 0.15,
          duration: 0.5
        }
      );
    }

    // Animate code blocks
    const codeBlocks = currentSlide.querySelectorAll('.code-block, .demo-output');
    if (codeBlocks.length > 0) {
      gsap.fromTo(codeBlocks,
        { opacity: 0, scale: 0.95 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.6
        }
      );
    }

    // Animate score meter
    const meterFill = currentSlide.querySelector('.meter-fill');
    if (meterFill) {
      gsap.fromTo(meterFill,
        { width: '0%' },
        {
          width: '75%',
          duration: 1.5,
          ease: 'power2.out'
        }
      );
    }

    // Animate table rows
    const tableRows = currentSlide.querySelectorAll('.revenue-table tbody tr');
    if (tableRows.length > 0) {
      gsap.fromTo(tableRows,
        { opacity: 0, x: -20 },
        {
          opacity: 1,
          x: 0,
          stagger: 0.15,
          duration: 0.4
        }
      );
    }

    // Animate tree view
    const treeView = currentSlide.querySelector('.tree-view');
    if (treeView) {
      gsap.fromTo(treeView,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.8
        }
      );
    }

    // Glitch effect on title slides
    const glitchElements = currentSlide.querySelectorAll('.glitch');
    if (glitchElements.length > 0) {
      gsap.fromTo(glitchElements,
        { opacity: 0, scale: 1.2 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.8,
          ease: 'elastic.out(1, 0.5)'
        }
      );
    }

    // Animate CTA buttons
    const ctaButtons = currentSlide.querySelectorAll('.cta-btn');
    if (ctaButtons.length > 0) {
      gsap.fromTo(ctaButtons,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.2,
          delay: 0.5,
          duration: 0.5
        }
      );
    }
  });
}

// Setup continuous background animations
export function setupContinuousAnimations(gsap) {
  if (!gsap) return;
  
  // Neon glow pulse
  gsap.to('.neon-border', {
    boxShadow: '0 0 30px rgba(0, 255, 65, 0.7), inset 0 0 20px rgba(0, 255, 65, 0.15)',
    duration: 1.5,
    yoyo: true,
    repeat: -1,
    ease: 'power1.inOut'
  });

  gsap.to('.neon-border-purple', {
    boxShadow: '0 0 30px rgba(191, 0, 255, 0.7), inset 0 0 20px rgba(191, 0, 255, 0.15)',
    duration: 1.5,
    yoyo: true,
    repeat: -1,
    ease: 'power1.inOut'
  });

  // Data flow dots
  document.querySelectorAll('.data-flow').forEach((dot, index) => {
    gsap.to(dot, {
      top: '100%',
      opacity: 0,
      duration: 1.5,
      repeat: -1,
      delay: index * 0.3,
      ease: 'none',
      onRepeat: function() {
        gsap.set(dot, { top: '0%', opacity: 1 });
      }
    });
  });
}

// Setup hover animations - called once DOM is ready
export function setupHoverAnimations(gsap) {
  if (!gsap) return;
  
  // Feature card hover
  document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      gsap.to(card, {
        scale: 1.05,
        boxShadow: '0 0 40px rgba(0, 255, 65, 0.6)',
        duration: 0.3
      });
    });
    
    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        scale: 1,
        boxShadow: '0 0 15px rgba(0, 255, 65, 0.3)',
        duration: 0.3
      });
    });
  });

  // CTA button hover
  document.querySelectorAll('.cta-btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      gsap.to(btn, {
        scale: 1.1,
        duration: 0.2
      });
    });
    
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, {
        scale: 1,
        duration: 0.2
      });
    });
  });

  // Risk card hover
  document.querySelectorAll('.risk-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      gsap.to(card, {
        y: -10,
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        duration: 0.3
      });
    });
    
    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        y: 0,
        boxShadow: 'none',
        duration: 0.3
      });
    });
  });
}
