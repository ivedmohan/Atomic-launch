'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-[#1f1f35] text-[#8888aa]',
      success: 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30',
      warning: 'bg-[#ffaa00]/10 text-[#ffaa00] border border-[#ffaa00]/30',
      danger: 'bg-[#ff4444]/10 text-[#ff4444] border border-[#ff4444]/30',
      info: 'bg-[#4488ff]/10 text-[#4488ff] border border-[#4488ff]/30',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };


