import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'white' | 'link';

interface ButtonProps {
  variant?: Variant;
  href?: string;
  onClick?: () => void;
  ariaLabel?: string;
  children: ReactNode;
}

const baseClass =
  'inline-flex items-center gap-[7px] rounded-full px-[22px] py-[10px] text-[15px] font-medium no-underline cursor-pointer transition-all duration-300 ease-[var(--ease-out-apple)]';

const variantClass: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-deep hover:scale-[1.03] hover:shadow-[0_12px_32px_-10px_rgba(0,113,227,0.5)]',
  secondary:
    'bg-black/[0.04] text-ink border border-black/[0.08] hover:bg-black/[0.08] hover:border-black/[0.14] hover:scale-[1.03]',
  white:
    'bg-white text-ink hover:scale-[1.03] hover:shadow-[0_12px_32px_-10px_rgba(0,0,0,0.45)]',
  link: 'px-[4px] bg-transparent text-accent hover:underline hover:underline-offset-4',
};

export function Button({
  variant = 'primary',
  href,
  onClick,
  ariaLabel,
  children,
}: ButtonProps) {
  const cls = `${baseClass} ${variantClass[variant]}`;
  if (href) {
    return (
      <a className={cls} href={href} aria-label={ariaLabel}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
