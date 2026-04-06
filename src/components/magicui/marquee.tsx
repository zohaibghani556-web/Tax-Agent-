import { cn } from '@/lib/utils';
import React from 'react';

interface MarqueeProps {
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  children: React.ReactNode;
  vertical?: boolean;
  repeat?: number;
  duration?: string;
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  duration = '30s',
}: MarqueeProps) {
  return (
    <div
      className={cn(
        'group flex overflow-hidden',
        vertical ? 'flex-col' : 'flex-row',
        className,
      )}
    >
      {Array.from({ length: repeat }).map((_, i) => (
        <div
          key={i}
          className={cn('flex shrink-0 gap-4', vertical ? 'flex-col' : 'flex-row', {
            'animate-marquee': !vertical,
            'animate-marquee-vertical': vertical,
            '[animation-direction:reverse]': reverse,
            'group-hover:[animation-play-state:paused]': pauseOnHover,
          })}
          style={{ '--duration': duration } as React.CSSProperties}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
