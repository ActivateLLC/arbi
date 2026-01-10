/**
 * Remotion Composition Entry Point
 * Defines all available video templates
 */

import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { ProductShowcase, ProductShowcaseProps } from './ProductShowcase';

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
    </>
  );
};

// Register the root component
registerRoot(RemotionRoot);
