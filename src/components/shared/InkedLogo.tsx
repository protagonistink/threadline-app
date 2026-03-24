import { useId } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';

interface InkedLogoProps {
  collapsed?: boolean;
  className?: string;
}

/**
 * InkedLogo — vector SVG logo with ink/stamp filter effects.
 * Collapsed: shows only the bracket + dots mark (square crop).
 * Expanded: shows full wordmark + bracket + dots.
 */
export function InkedLogo({ collapsed = false, className }: InkedLogoProps) {
  const { isLight } = useTheme();
  const filterId = useId();
  const inkFilterId = `${filterId}-ink`;
  const stampFilterId = `${filterId}-stamp`;
  const warmWhite = '#FAFAFA';
  const wordmarkFill = isLight ? '#2C2B29' : warmWhite;
  const bracketFill = isLight ? '#1E1E1E' : warmWhite;

  if (collapsed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-xl shadow-sm opacity-90',
          isLight
            ? 'bg-[#F5F2EB] border border-black/6'
            : 'bg-transparent border-none',
          className
        )}
      >
        <svg
          viewBox="190 -18 240 240"
          fill="none"
          className="h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <filter id={inkFilterId} x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" result="displaced" />
              <feGaussianBlur in="displaced" stdDeviation="0.3" result="blurred" />
              <feComponentTransfer in="blurred">
                <feFuncA type="discrete" tableValues="0 1" />
              </feComponentTransfer>
            </filter>
            <filter id={stampFilterId} x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="4" result="noise" />
              <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 9 -4" in="noise" result="coloredNoise" />
              <feComposite operator="in" in="SourceGraphic" in2="coloredNoise" result="textured" />
              <feTurbulence type="fractalNoise" baseFrequency="0.3" numOctaves="2" result="edgeNoise" />
              <feDisplacementMap in="textured" in2="edgeNoise" scale="3.5" xChannelSelector="R" yChannelSelector="G" result="final" />
            </filter>
          </defs>

          <motion.path
            d="M 235 45 C 255 45, 265 65, 260 80 C 255 90, 255 98, 275 102 C 255 106, 255 114, 260 124 C 265 139, 255 159, 235 159 C 248 152, 252 142, 248 132 C 244 122, 248 112, 262 102 C 248 92, 244 82, 248 72 C 252 62, 248 52, 235 45 Z"
            fill={isLight ? '#1E1E1E' : '#FAFAFA'}
            filter={`url(#${inkFilterId})`}
            initial={{ opacity: 0, scaleY: 0.85, transformOrigin: 'center' }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ delay: 0.2, duration: 0.7, ease: 'easeOut' }}
          />

          <g>
            <motion.circle cx="305" cy="102" r="11" fill="#C83C2F" filter={`url(#${stampFilterId})`}
              initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.5, type: "spring" }} />
            <motion.circle cx="338" cy="102" r="11.5" fill="#C83C2F" filter={`url(#${stampFilterId})`}
              initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7, duration: 0.5, type: "spring" }} />
            <motion.path
              d="M 364 100 L 370 108 L 382 92"
              fill="none" stroke="#C83C2F" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
              filter={`url(#${stampFilterId})`}
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: 1, pathLength: 1 }}
              transition={{ delay: 0.9, duration: 0.5, type: "spring" }}
            />
          </g>
        </svg>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center opacity-90', className)}>
      <svg
        viewBox="-8 42 300 122"
        preserveAspectRatio="xMinYMid meet"
        fill="none"
        className="block h-auto w-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <filter id={inkFilterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" result="displaced" />
            <feGaussianBlur in="displaced" stdDeviation="0.3" result="blurred" />
            <feComponentTransfer in="blurred">
              <feFuncA type="discrete" tableValues="0 1" />
            </feComponentTransfer>
          </filter>
          <filter id={stampFilterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="4" result="noise" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 9 -4" in="noise" result="coloredNoise" />
            <feComposite operator="in" in="SourceGraphic" in2="coloredNoise" result="textured" />
            <feTurbulence type="fractalNoise" baseFrequency="0.3" numOctaves="2" result="edgeNoise" />
            <feDisplacementMap in="textured" in2="edgeNoise" scale="3.5" xChannelSelector="R" yChannelSelector="G" result="final" />
          </filter>
        </defs>

        <motion.text
          x="0" y="115"
          textAnchor="start"
          fill={wordmarkFill}
          style={{
            fontFamily: '"Satoshi", -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '58px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          filter={`url(#${inkFilterId})`}
        >
          inked
        </motion.text>

        <g transform="translate(-100, 0)">
          <motion.path
            d="M 235 45 C 255 45, 265 65, 260 80 C 255 90, 255 98, 275 102 C 255 106, 255 114, 260 124 C 265 139, 255 159, 235 159 C 248 152, 252 142, 248 132 C 244 122, 248 112, 262 102 C 248 92, 244 82, 248 72 C 252 62, 248 52, 235 45 Z"
            fill={bracketFill}
            filter={`url(#${inkFilterId})`}
            initial={{ opacity: 0, scaleY: 0.8, transformOrigin: 'center' }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
          />
        </g>

        <g transform="translate(-90, -2)">
          <motion.circle cx="295" cy="104" r="11" fill="#C83C2F" filter={`url(#${stampFilterId})`}
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.0, duration: 0.5, type: "spring" }} />
          <motion.circle cx="326" cy="105" r="10.5" fill="#C83C2F" filter={`url(#${stampFilterId})`}
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.2, duration: 0.5, type: "spring" }} />
          <motion.path
            d="M 350 101 L 356 109 L 368 93"
            fill="none" stroke="#C83C2F" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"
            filter={`url(#${stampFilterId})`}
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: 1, pathLength: 1 }}
            transition={{ delay: 1.4, duration: 0.5, type: "spring" }}
          />
        </g>
      </svg>
    </div>
  );
}
