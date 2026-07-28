import React from 'react';
import Image from 'next/image';

interface NamahaLogoProps {
  variant?: 'circle' | 'banner' | 'text';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const NamahaLogo: React.FC<NamahaLogoProps> = ({
  variant = 'circle',
  size = 'md',
  className = '',
}) => {
  const dimensions = {
    circle: {
      sm: { width: 48, height: 48 },
      md: { width: 72, height: 72 },
      lg: { width: 120, height: 120 },
      xl: { width: 180, height: 180 },
    },
    banner: {
      sm: { width: 220, height: 66 },
      md: { width: 340, height: 102 },
      lg: { width: 520, height: 156 },
      xl: { width: 680, height: 204 },
    },
    text: {
      sm: { width: 140, height: 40 },
      md: { width: 200, height: 56 },
      lg: { width: 280, height: 76 },
      xl: { width: 380, height: 100 },
    },
  };

  const { width, height } = dimensions[variant][size];
  const src = variant === 'banner' ? '/logo-banner.svg' : '/logo-circle.svg';

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <Image
        src={src}
        alt="Namahaa Tiffin Room Logo"
        width={width}
        height={height}
        className="object-contain transition-transform duration-300 hover:scale-105"
        priority
      />
    </div>
  );
};
