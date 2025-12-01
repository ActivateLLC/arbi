/**
 * ARBI Presentation - Main Entry Point
 * Imports and initializes Reveal.js, GSAP, and custom animations
 */

// Import Reveal.js and plugins
import Reveal from 'reveal.js';
import RevealHighlight from 'reveal.js/plugin/highlight/highlight';
import RevealNotes from 'reveal.js/plugin/notes/notes';
import RevealMarkdown from 'reveal.js/plugin/markdown/markdown';

// Import GSAP
import gsap from 'gsap';

// Make gsap globally available for animation scripts
window.gsap = gsap;

// Import custom animations
import { initAnimations, setupContinuousAnimations } from './animations.js';
import { initParticles, createFloatingCode } from './particles.js';

// Initialize Reveal.js
Reveal.initialize({
  hash: true,
  transition: 'fade',
  transitionSpeed: 'slow',
  backgroundTransition: 'fade',
  controls: true,
  progress: true,
  center: true,
  plugins: [RevealHighlight, RevealNotes, RevealMarkdown]
}).then(() => {
  // Initialize GSAP animations
  initAnimations(Reveal, gsap);
  initParticles();
  createFloatingCode(gsap);
  setupContinuousAnimations(gsap);
  
  console.log('ARBI Presentation initialized');
});
