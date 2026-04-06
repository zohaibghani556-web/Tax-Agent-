import { cn } from '@/lib/utils';
import React from 'react';

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children: React.ReactNode;
}

export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = '#ffffff',
      shimmerSize = '0.05em',
      shimmerDuration = '2.5s',
      borderRadius = '0.5rem',
      background = 'rgba(16, 185, 129, 1)',
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          'group relative z-0 cursor-pointer overflow-hidden whitespace-nowrap px-6 py-3 font-semibold text-white',
          'transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]',
          className,
        )}
        style={{ background, borderRadius }}
        {...props}
      >
        {/* shimmer layer */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${shimmerColor}30 40%, ${shimmerColor}60 50%, ${shimmerColor}30 60%, transparent 100%)`,
            backgroundSize: '200% 100%',
            animation: `shimmer ${shimmerDuration} linear infinite`,
          }}
        />
        {children}
      </button>
    );
  },
);

ShimmerButton.displayName = 'ShimmerButton';
