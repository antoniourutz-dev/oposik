import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

const cardVariants = cva('rounded-[1.5rem] border transition-all duration-300', {
  variants: {
    variant: {
      default: 'border-slate-200/90 bg-white/92 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.12)]',
      glass:
        'backdrop-blur-2xl border-white/40 bg-white/60 shadow-[0_32px_64px_-32px_rgba(15,23,42,0.2)]',
      premium:
        'border-[#bdd3f1]/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.95)_0%,rgba(240,247,255,0.9)_100%)] shadow-[0_24px_60px_-40px_rgba(141,147,242,0.15)]',
      colored:
        'border-[#c8d8fb]/70 quantia-bg-gradient text-white shadow-[0_22px_52px_-42px_rgba(141,147,242,0.22)]',
    },
    p: {
      none: 'p-0',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    },
    hover: {
      none: '',
      lift: 'hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.1)]',
      glow: 'hover:border-[#8d93f2]/40 hover:shadow-[0_0_20px_rgba(141,147,242,0.15)]',
    },
  },
  defaultVariants: {
    variant: 'default',
    p: 'md',
    hover: 'none',
  },
});

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>
>(({ className, variant, hover, p, ...props }, ref) => (
  <div ref={ref} className={cn(cardVariants({ variant, hover, p, className }))} {...props} />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-0 mb-4', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-[1.08rem] font-black leading-[1.18] tracking-[-0.025em] text-slate-950 border-none',
        className,
      )}
      {...props}
    />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-[0.9rem] font-medium leading-[1.56] text-slate-500', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('p-0', className)} {...props} />,
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-0 mt-4', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
