import { Reveal } from '../motion/Reveal';

interface SectionHeadProps {
  eyebrow: string;
  title: string;
  description?: string;
}

export function SectionHead({ eyebrow, title, description }: SectionHeadProps) {
  return (
    <Reveal className="mb-9 text-center">
      <p className="mb-2 font-mono text-[12.5px] font-semibold tracking-[0.22em] text-accent uppercase">
        {eyebrow}
      </p>
      <h2 className="m-0 text-[clamp(28px,4vw,44px)] leading-[1.1] font-bold tracking-[-0.02em]">
        {title}
      </h2>
      {description && (
        <p className="mx-auto mt-2.5 max-w-[560px] text-[15px] leading-[1.65] text-ink-2">
          {description}
        </p>
      )}
    </Reveal>
  );
}
