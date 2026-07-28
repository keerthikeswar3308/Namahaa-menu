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
      sm: { width: 44, height: 44 },
      md: { width: 68, height: 68 },
      lg: { width: 115, height: 115 },
      xl: { width: 165, height: 165 },
    },
    banner: {
      sm: { width: 150, height: 50 },
      md: { width: 225, height: 75 },
      lg: { width: 330, height: 110 },
      xl: { width: 450, height: 150 },
    },
    text: {
      sm: { width: 130, height: 36 },
      md: { width: 190, height: 52 },
      lg: { width: 270, height: 72 },
      xl: { width: 370, height: 98 },
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
