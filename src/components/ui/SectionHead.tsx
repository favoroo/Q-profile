import { Reveal } from '../motion/Reveal';

interface SectionHeadProps {
  eyebrow: string;
  title: string;
  description?: string;
  /** 覆盖默认下边距（mb-9），如 About 的 mb-10 */
  className?: string;
}

/** 区块统一标题头：eyebrow + 大标题 + 可选描述，居中排版。 */
export function SectionHead({ eyebrow, title, description, className }: SectionHeadProps) {
  return (
    <Reveal className={`text-center ${className ?? 'mb-9'}`}>
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
