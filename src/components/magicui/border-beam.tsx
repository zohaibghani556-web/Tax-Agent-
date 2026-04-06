import { cn } from '@/lib/utils';

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

export function BorderBeam({
  className,
  size = 200,
  duration = 10,
  colorFrom = '#10B981',
  colorTo = '#1A2744',
  delay = 0,
}: BorderBeamProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit] [border:1.5px_solid_transparent]',
        '[background:linear-gradient(#fff,#fff)_padding-box,conic-gradient(from_var(--angle),transparent_10%,var(--color-from),var(--color-to),transparent_90%)_border-box]',
        className,
      )}
      style={
        {
          '--size': size,
          '--duration': duration,
          '--delay': `-${delay}s`,
          '--color-from': colorFrom,
          '--color-to': colorTo,
          '--angle': '0deg',
          animation: `border-rotate ${duration}s linear infinite`,
        } as React.CSSProperties
      }
    >
      <style>{`
        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes border-rotate {
          to { --angle: 360deg; }
        }
      `}</style>
    </div>
  );
}
