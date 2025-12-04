# ARBI Technical Presentation

A reveal.js technical presentation showcasing ARBI's architecture and AI capabilities with a cyberpunk green/purple neon aesthetic and GSAP animations.

## Features

- **Cyberpunk Reveal.js Template** - Dark theme with neon green and purple accents
- **GSAP Animations** - Smooth transitions, staggered animations, and motion graphics
- **13 Interactive Slides**:
  1. Title slide with glitch effect
  2. What is ARBI - feature cards
  3. System architecture diagram
  4. AI capabilities overview
  5. AI scoring algorithm with code block
  6. Real-time data flow visualization
  7. Tech stack overview
  8. Monorepo architecture tree view
  9. Risk management controls
  10. REST API endpoints
  11. Revenue projection table
  12. Development roadmap
  13. Closing slide with CTAs

## Visual Effects

- Neon glow effects on text and borders
- Glitch animation on title text
- Particle system with canvas connections
- Floating code snippets
- Pulsing architecture nodes
- Animated data flow indicators

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

The development server will start on `http://localhost:8080`.

## Navigation

- **Arrow keys** or click **< >** buttons to navigate slides
- **Escape** - Overview mode
- **F** - Fullscreen
- **S** - Speaker notes
- **?** - Help with shortcuts

## Tech Stack

- [Reveal.js](https://revealjs.com/) v5.1.0 - HTML presentation framework
- [GSAP](https://greensock.com/gsap/) v3.12.5 - Animation library
- [Vite](https://vitejs.dev/) v5.0.11 - Build tool

## Customization

### Colors

Edit the CSS variables in `css/cyberpunk.css`:

```css
:root {
  --neon-green: #00ff41;
  --neon-purple: #bf00ff;
  --cyber-black: #0a0a0f;
}
```

### Fonts

The presentation uses Google Fonts:
- **Orbitron** - Headers (futuristic)
- **Rajdhani** - Body text
- **Share Tech Mono** - Code blocks

### Adding Slides

Add new `<section>` elements in `index.html`:

```html
<section data-background-color="#0a0a0f">
  <h2 class="neon-text">Your Title</h2>
  <!-- Content -->
</section>
```

## Screenshots

![Title Slide](https://github.com/user-attachments/assets/fa8629b2-cb2d-4efc-933f-dc23c35e0bd2)

![Architecture](https://github.com/user-attachments/assets/c0e9b6f3-9026-48b9-86f8-35492ee66b89)

## License

MIT
