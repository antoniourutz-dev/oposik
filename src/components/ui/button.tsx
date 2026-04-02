import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[1.05rem] text-[0.95rem] font-extrabold leading-none tracking-[-0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-quantia-pink text-white shadow-[0_16px_30px_-26px_rgba(15,23,42,0.22)] hover:-translate-y-0.5 hover:bg-quantia-pink/92',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-slate-200 bg-white/92 text-slate-900 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.14)] hover:-translate-y-0.5 hover:border-[#bfd2f6]',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'text-slate-700 hover:bg-slate-100/70',
        link: 'text-primary underline-offset-4 hover:underline',
        premium:
          'quantia-bg-gradient text-white shadow-[0_24px_60px_-34px_rgba(141,147,242,0.32)] hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-34px_rgba(141,147,242,0.36)] border border-white/20',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-[0.8125rem] tracking-[0.01em]',
        lg: 'h-10 rounded-md px-8 text-[1rem]',
        xl: 'h-14 rounded-[1.15rem] px-6 py-4 text-[1.01rem] font-black uppercase tracking-[0.11em]',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
