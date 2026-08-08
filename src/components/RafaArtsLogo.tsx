import React from 'react';
import { cn } from './SharedUI';

interface RafaArtsLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  layout?: 'stacked' | 'horizontal';
  className?: string;
}

const SIZE_PX: Record<string, number> = { sm: 140, md: 220, lg: 320, xl: 420 };

// Wrapper: usa a logo enviada pelo usuário (Configurações > Identidade) se existir,
// senão cai para o SVG padrão desenhado abaixo. imageUrl deve ser a variante
// "clara" (para fundos escuros, ex: navbar/login) ou "escura" (para fundos claros).
export const BrandLogo: React.FC<RafaArtsLogoProps & { imageUrl?: string | null }> = ({
  imageUrl,
  size = 'md',
  layout = 'stacked',
  className = '',
}) => {
  if (imageUrl) {
    const width = SIZE_PX[size] || SIZE_PX.md;
    return (
      <img
        src={imageUrl}
        alt="Logo"
        className={cn("inline-block select-none object-contain", className)}
        style={{ width: `${width}px`, height: 'auto', maxWidth: '100%' }}
      />
    );
  }
  return <RafaArtsLogo size={size} layout={layout} className={className} />;
};

export const RafaArtsLogo: React.FC<RafaArtsLogoProps> = ({
  size = 'md',
  layout = 'stacked',
  className = '',
}) => {
  const sizeMap = {
    sm: { width: 140, height: 85 },
    md: { width: 220, height: 135 },
    lg: { width: 320, height: 195 },
    xl: { width: 420, height: 255 },
  };

  const { width } = sizeMap[size] || sizeMap.md;

  const fontStyle = "Montserrat, 'Arial Black', Impact, system-ui, sans-serif";

  if (layout === 'horizontal') {
    return (
      <div className={cn("inline-flex items-center select-none", className)}>
        <svg
          viewBox="0 0 460 260"
          style={{ width: `${width}px`, height: 'auto', maxWidth: '100%' }}
          className="drop-shadow-md"
        >
          <text
            x="10"
            y="90"
            style={{ fill: '#FFFFFF' }}
            fontFamily={fontStyle}
            fontWeight="900"
            fontSize="102"
            letterSpacing="3"
          >
            RAFA
          </text>
          <text
            x="10"
            y="185"
            style={{ fill: '#FFFFFF' }}
            fontFamily={fontStyle}
            fontWeight="900"
            fontSize="102"
            letterSpacing="3"
          >
            ARTS
          </text>
          <g transform="translate(305, 25)">
            <path d="M 30 65 C 30 35, 65 10, 65 10" stroke="#00aeef" strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M 65 10 L 10 10" stroke="#00aeef" strokeWidth="5" strokeLinecap="round" />
            <path d="M 22 0 L 8 10 L 22 20" stroke="#00aeef" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <rect x="22" y="57" width="16" height="16" fill="#00aeef" rx="1.5" />
            <rect x="57" y="2" width="16" height="16" fill="#00aeef" rx="1.5" />
          </g>
          <g transform="translate(10, 218)">
            <clipPath id="cmyk-clip-horiz">
              <rect x="0" y="0" width="220" height="18" rx="9" />
            </clipPath>
            <g clipPath="url(#cmyk-clip-horiz)">
              <rect x="0" y="0" width="75" height="18" fill="#ec008c" />
              <rect x="73" y="0" width="75" height="18" fill="#fff200" />
              <rect x="146" y="0" width="75" height="18" fill="#00aeef" />
            </g>
          </g>
          <text
            x="248"
            y="233"
            style={{ fill: '#FFFFFF' }}
            fontFamily={fontStyle}
            fontWeight="900"
            fontSize="27"
            letterSpacing="9"
          >
            GRAPHICS
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div className={cn("inline-block select-none", className)}>
      <svg
        viewBox="0 0 460 260"
        style={{ width: `${width}px`, height: 'auto', maxWidth: '100%' }}
        className="drop-shadow-md"
      >
        {/* RAFA */}
        <text
          x="10"
          y="90"
          style={{ fill: '#FFFFFF' }}
          fontFamily={fontStyle}
          fontWeight="900"
          fontSize="102"
          letterSpacing="3"
        >
          RAFA
        </text>

        {/* ARTS */}
        <text
          x="10"
          y="185"
          style={{ fill: '#FFFFFF' }}
          fontFamily={fontStyle}
          fontWeight="900"
          fontSize="102"
          letterSpacing="3"
        >
          ARTS
        </text>

        {/* VECTOR PEN NODE (Top Right Accent) */}
        <g transform="translate(305, 25)">
          {/* Bezier Handle Arc */}
          <path d="M 30 65 C 30 35, 65 10, 65 10" stroke="#00aeef" strokeWidth="5" fill="none" strokeLinecap="round" />
          {/* Directional Tangent Line & Arrow Pointing Left */}
          <path d="M 65 10 L 10 10" stroke="#00aeef" strokeWidth="5" strokeLinecap="round" />
          <path d="M 22 0 L 8 10 L 22 20" stroke="#00aeef" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {/* Vector Control Node Anchor Boxes */}
          <rect x="22" y="57" width="16" height="16" fill="#00aeef" rx="1.5" />
          <rect x="57" y="2" width="16" height="16" fill="#00aeef" rx="1.5" />
        </g>

        {/* BOTTOM ROW: CMYK BAR + GRAPHICS */}
        <g transform="translate(10, 218)">
          <clipPath id="cmyk-clip-vert">
            <rect x="0" y="0" width="220" height="18" rx="9" />
          </clipPath>
          <g clipPath="url(#cmyk-clip-vert)">
            <rect x="0" y="0" width="75" height="18" fill="#ec008c" />
            <rect x="73" y="0" width="75" height="18" fill="#fff200" />
            <rect x="146" y="0" width="75" height="18" fill="#00aeef" />
          </g>
        </g>

        {/* GRAPHICS */}
        <text
          x="248"
          y="233"
          style={{ fill: '#FFFFFF' }}
          fontFamily={fontStyle}
          fontWeight="900"
          fontSize="27"
          letterSpacing="9"
        >
          GRAPHICS
        </text>
      </svg>
    </div>
  );
};
