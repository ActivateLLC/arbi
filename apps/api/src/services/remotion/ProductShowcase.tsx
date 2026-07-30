/**
 * Remotion Video Template: Product Showcase
 * Generates 15-30 second product videos from images
 */

import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export interface ProductShowcaseProps {
  productTitle: string;
  productImages: string[];
  marketplacePrice: number;
  ctaText?: string;
  includePrice?: boolean;
}

export const ProductShowcase: React.FC<ProductShowcaseProps> = ({
  productTitle,
  productImages,
  marketplacePrice,
  ctaText = 'Shop Now',
  includePrice = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Calculate duration per image
  const imagesCount = productImages.length;
  const framesPerImage = Math.floor(durationInFrames / imagesCount);

  // Determine which image to show
  const currentImageIndex = Math.min(
    Math.floor(frame / framesPerImage),
    imagesCount - 1
  );
  const currentImage = productImages[currentImageIndex];

  // Animation: zoom in slightly
  const zoom = interpolate(
    frame % framesPerImage,
    [0, framesPerImage],
    [1, 1.05],
    {
      extrapolateRight: 'clamp',
    }
  );

  // Title animation: fade in at start
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Price animation: bounce in at middle
  const priceAnimation = spring({
    frame: frame - Math.floor(durationInFrames / 2),
    fps,
    config: {
      damping: 200,
    },
  });

  const priceScale = interpolate(priceAnimation, [0, 1], [0, 1]);

  // CTA animation: fade in at end
  const ctaOpacity = interpolate(
    frame,
    [durationInFrames - 60, durationInFrames - 30],
    [0, 1],
    {
      extrapolateRight: 'clamp',
      extrapolateLeft: 'clamp',
    }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#000000',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* Product Image with Zoom */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Img
          src={currentImage}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${zoom})`,
          }}
        />
      </AbsoluteFill>

      {/* Dark Overlay for Text Contrast */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* Product Title - Top */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-start',
          alignItems: 'center',
          padding: '60px 40px',
          opacity: titleOpacity,
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            padding: '20px 40px',
            borderRadius: '10px',
            maxWidth: '80%',
          }}
        >
          <h1
            style={{
              fontSize: '60px',
              fontWeight: 'bold',
              color: '#ffffff',
              margin: 0,
              textAlign: 'center',
              textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
            }}
          >
            {productTitle}
          </h1>
        </div>
      </AbsoluteFill>

      {/* Price - Center (if enabled) */}
      {includePrice && frame > Math.floor(durationInFrames / 2) && (
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            transform: `scale(${priceScale})`,
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(255, 215, 0, 0.95)',
              padding: '30px 60px',
              borderRadius: '20px',
              border: '4px solid #ffffff',
            }}
          >
            <p
              style={{
                fontSize: '120px',
                fontWeight: 'bold',
                color: '#000000',
                margin: 0,
                textShadow: '2px 2px 4px rgba(255,255,255,0.5)',
              }}
            >
              ${marketplacePrice.toFixed(2)}
            </p>
          </div>
        </AbsoluteFill>
      )}

      {/* CTA - Bottom */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: '60px 40px',
          opacity: ctaOpacity,
        }}
      >
        <div
          style={{
            backgroundColor: '#4CAF50',
            padding: '30px 80px',
            borderRadius: '50px',
            border: '4px solid #ffffff',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <p
            style={{
              fontSize: '70px',
              fontWeight: 'bold',
              color: '#ffffff',
              margin: 0,
              textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
            }}
          >
            {ctaText}
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
