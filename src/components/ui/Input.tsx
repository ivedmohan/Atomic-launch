'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[#8888aa] mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6666aa]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full bg-[#0f0f1a] border border-[#2a2a4a] rounded-xl px-4 py-3 text-white placeholder-[#4a4a6a] transition-all duration-200',
              'focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/50',
              'hover:border-[#3a3a5a]',
              icon && 'pl-10',
              error && 'border-[#ff4444] focus:border-[#ff4444] focus:ring-[#ff4444]/50',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-[#ff4444]">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };


