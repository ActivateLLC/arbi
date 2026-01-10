/**
 * Modern UGC-Style Product Ad Template
 * Authentic, creator-style videos that don't look like ads
 * Following 2026 best practices: Hook-first, captions, fast-paced
 */

import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Sequence,
  Img,
  spring,
} from 'remotion';

export interface ModernProductAdProps {
  productTitle: string;
  productImages: string[];
  marketplacePrice: number;
  originalPrice?: number;
  hook: string; // AI-generated hook line
  benefits: string[]; // 3-4 key benefits
  format: 'deal-discovery' | 'problem-solution' | 'gift-idea' | 'day-in-life';
}

export const ModernProductAd: React.FC<ModernProductAdProps> = ({
  productTitle,
  productImages,
  marketplacePrice,
  originalPrice,
  hook,
  benefits,
  format,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Modern color palette - vibrant and authentic
  const colors = {
    primary: '#FF6B6B',
    accent: '#4ECDC4',
    text: '#2D3436',
    caption: '#FFFFFF',
    captionBg: 'rgba(0, 0, 0, 0.75)',
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#FAFAFA' }}>
      {/* Scene 1: Hook (0-2s) - CRITICAL for stopping scroll */}
      <Sequence from={0} durationInFrames={fps * 2}>
        <HookScene hook={hook} colors={colors} />
      </Sequence>

      {/* Scene 2: Product Reveal (2-5s) */}
      <Sequence from={fps * 2} durationInFrames={fps * 3}>
        <ProductRevealScene
          productTitle={productTitle}
          productImage={productImages[0]}
          price={marketplacePrice}
          originalPrice={originalPrice}
          colors={colors}
        />
      </Sequence>

      {/* Scene 3: Benefits Fast Cut (5-11s) */}
      <Sequence from={fps * 5} durationInFrames={fps * 6}>
        <BenefitsScene
          benefits={benefits}
          productImages={productImages}
          colors={colors}
        />
      </Sequence>

      {/* Scene 4: CTA (11-15s) */}
      <Sequence from={fps * 11} durationInFrames={fps * 4}>
        <CTAScene
          productTitle={productTitle}
          price={marketplacePrice}
          colors={colors}
        />
      </Sequence>

      {/* Always-visible captions at bottom */}
      <CaptionOverlay frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};

/**
 * Scene 1: Hook - Stop the scroll in 0.5 seconds
 */
const HookScene: React.FC<{ hook: string; colors: any }> = ({ hook, colors }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Zoom in animation for urgency
  const scale = spring({
    frame,
    fps,
    from: 1.2,
    to: 1,
    config: { damping: 15 },
  });

  // Bounce effect for attention
  const bounce = interpolate(frame, [0, 10, 20], [0, -10, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
      }}
    >
      <div
        style={{
          transform: `scale(${scale}) translateY(${bounce}px)`,
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: 120,
            fontWeight: 900,
            color: '#FFFFFF',
            margin: 0,
            textShadow: '4px 4px 0px rgba(0,0,0,0.2)',
            lineHeight: 1.2,
            fontFamily: 'Arial, sans-serif',
          }}
        >
          {hook}
        </h1>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Scene 2: Product Reveal - Show what they're getting
 */
const ProductRevealScene: React.FC<{
  productTitle: string;
  productImage: string;
  price: number;
  originalPrice?: number;
  colors: any;
}> = ({ productTitle, productImage, price, originalPrice, colors }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slide in from right
  const slideX = spring({
    frame,
    fps,
    from: 1920,
    to: 0,
    config: { damping: 20 },
  });

  const savings = originalPrice ? originalPrice - price : 0;
  const savingsPercent = originalPrice ? Math.round((savings / originalPrice) * 100) : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#FFFFFF' }}>
      <div
        style={{
          transform: `translateX(${slideX}px)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 80,
        }}
      >
        {/* Product Image */}
        <div
          style={{
            width: 600,
            height: 600,
            borderRadius: 30,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            marginBottom: 40,
          }}
        >
          <Img
            src={productImage}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>

        {/* Price Badge - UGC style */}
        {originalPrice && (
          <div
            style={{
              backgroundColor: colors.primary,
              color: '#FFFFFF',
              padding: '20px 40px',
              borderRadius: 50,
              fontSize: 60,
              fontWeight: 900,
              boxShadow: '0 10px 30px rgba(255,107,107,0.4)',
              transform: 'rotate(-3deg)',
            }}
          >
            SAVE {savingsPercent}%! 🔥
          </div>
        )}

        {/* Product Title */}
        <h2
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: colors.text,
            margin: '30px 0 0 0',
            textAlign: 'center',
            maxWidth: 800,
          }}
        >
          {productTitle}
        </h2>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Scene 3: Benefits - Fast cuts with captions
 */
const BenefitsScene: React.FC<{
  benefits: string[];
  productImages: string[];
  colors: any;
}> = ({ benefits, productImages, colors }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const framesPerBenefit = Math.floor((fps * 6) / Math.min(benefits.length, 3));
  const currentBenefitIndex = Math.min(
    Math.floor(frame / framesPerBenefit),
    benefits.length - 1
  );
  const currentBenefit = benefits[currentBenefitIndex];
  const currentImage = productImages[Math.min(currentBenefitIndex, productImages.length - 1)];

  // Pop animation for each benefit
  const benefitFrame = frame % framesPerBenefit;
  const pop = spring({
    frame: benefitFrame,
    fps,
    from: 0.8,
    to: 1,
    config: { damping: 15 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#F8F9FA' }}>
      {/* Background image with overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.3,
        }}
      >
        <Img
          src={currentImage}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(20px)',
          }}
        />
      </div>

      {/* Benefit text - Large and bold */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 100,
        }}
      >
        <div
          style={{
            transform: `scale(${pop})`,
            backgroundColor: colors.captionBg,
            padding: '40px 60px',
            borderRadius: 20,
            maxWidth: 1400,
          }}
        >
          <p
            style={{
              fontSize: 80,
              fontWeight: 900,
              color: colors.caption,
              margin: 0,
              textAlign: 'center',
              lineHeight: 1.3,
            }}
          >
            ✓ {currentBenefit}
          </p>
        </div>
      </div>

      {/* Benefit counter */}
      <div
        style={{
          position: 'absolute',
          bottom: 200,
          right: 100,
          display: 'flex',
          gap: 15,
        }}
      >
        {benefits.slice(0, 3).map((_, idx) => (
          <div
            key={idx}
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              backgroundColor: idx === currentBenefitIndex ? colors.primary : '#DDD',
              transition: 'background-color 0.3s',
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Scene 4: CTA - Clear call to action
 */
const CTAScene: React.FC<{
  productTitle: string;
  price: number;
  colors: any;
}> = ({ productTitle, price, colors }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Pulse animation for CTA button
  const pulse = interpolate(
    frame,
    [0, fps / 2, fps],
    [1, 1.05, 1],
    { extrapolateRight: 'repeat' }
  );

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 80,
      }}
    >
      <h1
        style={{
          fontSize: 90,
          fontWeight: 900,
          color: '#FFFFFF',
          margin: 0,
          marginBottom: 40,
          textAlign: 'center',
          textShadow: '3px 3px 0px rgba(0,0,0,0.2)',
        }}
      >
        Get Yours Now!
      </h1>

      {/* Price */}
      <div
        style={{
          fontSize: 120,
          fontWeight: 900,
          color: '#FFD700',
          marginBottom: 60,
          textShadow: '4px 4px 0px rgba(0,0,0,0.3)',
        }}
      >
        ${price.toFixed(2)}
      </div>

      {/* CTA Button */}
      <div
        style={{
          transform: `scale(${pulse})`,
          backgroundColor: colors.primary,
          color: '#FFFFFF',
          padding: '40px 100px',
          borderRadius: 60,
          fontSize: 70,
          fontWeight: 900,
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          cursor: 'pointer',
        }}
      >
        Shop Now →
      </div>

      {/* Trust signal */}
      <p
        style={{
          fontSize: 36,
          color: 'rgba(255,255,255,0.9)',
          marginTop: 50,
          textAlign: 'center',
        }}
      >
        ✓ Free Shipping • ✓ Secure Checkout
      </p>
    </AbsoluteFill>
  );
};

/**
 * Caption Overlay - Always visible at bottom (UGC style)
 */
const CaptionOverlay: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  // Caption text changes based on scene
  let captionText = '';

  if (frame < fps * 2) {
    captionText = "Wait... you need to see this! 😱";
  } else if (frame < fps * 5) {
    captionText = "This is actually crazy good...";
  } else if (frame < fps * 11) {
    captionText = "Here's why everyone's buying it:";
  } else {
    captionText = "Link in bio! Don't miss out 👆";
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '30px 50px',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
      }}
    >
      <p
        style={{
          fontSize: 48,
          fontWeight: 700,
          color: '#FFFFFF',
          margin: 0,
          textAlign: 'center',
          lineHeight: 1.3,
        }}
      >
        {captionText}
      </p>
    </div>
  );
};
