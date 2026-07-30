/**
 * Remotion Composition Entry Point
 * Defines all available video templates
 */

import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { ProductShowcase, ProductShowcaseProps } from './ProductShowcase';
import { ModernProductAd, ModernProductAdProps } from './ModernProductAd';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ProductShowcase"
        component={ProductShowcase}
        durationInFrames={450} // 15 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          productTitle: 'Sample Product',
          productImages: [
            'https://res.cloudinary.com/demo/image/upload/sample.jpg',
          ],
          marketplacePrice: 99.99,
          ctaText: 'Shop Now',
          includePrice: true,
        } as ProductShowcaseProps}
      />

      <Composition
        id="ProductShowcase30s"
        component={ProductShowcase}
        durationInFrames={900} // 30 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          productTitle: 'Sample Product',
          productImages: [
            'https://res.cloudinary.com/demo/image/upload/sample.jpg',
          ],
          marketplacePrice: 99.99,
          ctaText: 'Shop Now',
          includePrice: true,
        } as ProductShowcaseProps}
      />

      {/* Vertical/Portrait version for Stories/Reels */}
      <Composition
        id="ProductShowcaseVertical"
        component={ProductShowcase}
        durationInFrames={450} // 15 seconds at 30fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          productTitle: 'Sample Product',
          productImages: [
            'https://res.cloudinary.com/demo/image/upload/sample.jpg',
          ],
          marketplacePrice: 99.99,
          ctaText: 'Shop Now',
          includePrice: true,
        } as ProductShowcaseProps}
      />

      {/* MODERN UGC-STYLE TEMPLATES - 2026 Best Practices */}

      {/* Deal Discovery Format - Horizontal */}
      <Composition
        id="ModernDealDiscovery"
        component={ModernProductAd}
        durationInFrames={450} // 15 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          productTitle: 'Sample Product',
          productImages: [
            'https://res.cloudinary.com/demo/image/upload/sample.jpg',
          ],
          marketplacePrice: 99.99,
          originalPrice: 149.99,
          hook: 'Wait... 50% OFF?! 😱',
          benefits: [
            'Insane deal on this',
            'Way cheaper than retail',
            'Limited stock available',
          ],
          format: 'deal-discovery',
        } as ModernProductAdProps}
      />

      {/* Problem Solution Format - Horizontal */}
      <Composition
        id="ModernProblemSolution"
        component={ModernProductAd}
        durationInFrames={450} // 15 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          productTitle: 'Sample Product',
          productImages: [
            'https://res.cloudinary.com/demo/image/upload/sample.jpg',
          ],
          marketplacePrice: 99.99,
          hook: 'Okay but FINALLY... ✨',
          benefits: [
            'Solves the problem instantly',
            'Works exactly as promised',
            "Can't live without it now",
          ],
          format: 'problem-solution',
        } as ModernProductAdProps}
      />

      {/* Gift Idea Format - Horizontal */}
      <Composition
        id="ModernGiftIdea"
        component={ModernProductAd}
        durationInFrames={450} // 15 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          productTitle: 'Sample Product',
          productImages: [
            'https://res.cloudinary.com/demo/image/upload/sample.jpg',
          ],
          marketplacePrice: 99.99,
          hook: 'Best gift EVER? 🎁',
          benefits: [
            'Everyone will love this',
            'Unique and thoughtful',
            'Arrives ready to gift',
          ],
          format: 'gift-idea',
        } as ModernProductAdProps}
      />

      {/* Day in Life Format - Horizontal */}
      <Composition
        id="ModernDayInLife"
        component={ModernProductAd}
        durationInFrames={450} // 15 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          productTitle: 'Sample Product',
          productImages: [
            'https://res.cloudinary.com/demo/image/upload/sample.jpg',
          ],
          marketplacePrice: 99.99,
          hook: 'POV: Your new daily essential ☀️',
          benefits: [
            'Use it every single day',
            'Makes life so much easier',
            "Can't imagine life without it",
          ],
          format: 'day-in-life',
        } as ModernProductAdProps}
      />

      {/* VERTICAL (Stories/Reels) versions of modern templates */}

      <Composition
        id="ModernDealDiscoveryVertical"
        component={ModernProductAd}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          productTitle: 'Sample Product',
          productImages: [
            'https://res.cloudinary.com/demo/image/upload/sample.jpg',
          ],
          marketplacePrice: 99.99,
          originalPrice: 149.99,
          hook: 'Wait... 50% OFF?! 😱',
          benefits: [
            'Insane deal on this',
            'Way cheaper than retail',
            'Limited stock available',
          ],
          format: 'deal-discovery',
        } as ModernProductAdProps}
      />
    </>
  );
};

// Register the root component
registerRoot(RemotionRoot);
