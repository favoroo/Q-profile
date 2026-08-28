import { profile, site } from '../../data';
import { LanyardBadge } from '../lanyard/LanyardBadge';
import { Button } from '../ui/Button';
import { Icon } from '../ui/icons';
import { Reveal } from '../motion/Reveal';

export function Hero() {
  const [taglineLine1, taglineLine2] = profile.tagline.split('\n');

  return (
    <section className="relative overflow-hidden text-center" id="home">
      {/* 顶部层次光影 */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 z-0 h-[560px] w-[min(960px,94vw)] -translate-x-1/2"
        style={{
          background:
            'radial-gradient(circle at 50% 30%, rgba(0,113,227,0.08) 0%, rgba(0,113,227,0.02) 48%, transparent 72%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-1 flex flex-col items-center pt-12 pb-10 max-md:pt-10 max-md:pb-8">
        {/* 状态徽章 */}
        <Reveal>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/[0.16] bg-white/82 px-4 py-1.5 backdrop-blur-[14px] transition-all duration-300 ease-[var(--ease-out-apple)] hover:-translate-y-px hover:border-accent/[0.35] max-md:mb-[18px]">
            <span className="h-[7px] w-[7px] rounded-full bg-[#10b981] shadow-[0_0_0_3px_rgba(16,185,129,0.2)] [animation:pulse-dot_2.4s_infinite_ease-in-out]" />
            <span className="text-[12.5px] font-semibold tracking-[0.06em] text-accent uppercase max-md:text-[11.5px]">
              {profile.pill}
            </span>
          </div>
        </Reveal>

        {/* 悬吊工牌 */}
        <Reveal delay={0.08}>
          <LanyardBadge />
        </Reveal>

        {/* 标题与文案 */}
        <Reveal delay={0.14}>
          <h1 className="mt-4 mb-2.5 text-[clamp(38px,6vw,64px)] leading-[1.08] font-bold tracking-[-0.025em] text-ink max-md:mt-3 max-md:mb-2 max-md:text-[clamp(34px,9vw,44px)]">
            {profile.name}
            <span className="text-accent">{profile.nameSuffix}</span>
          </h1>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mx-auto mb-3 max-w-[680px] text-[clamp(20px,2.6vw,28px)] leading-[1.42] font-semibold tracking-[-0.01em] text-ink max-md:mb-2.5 max-md:text-[18px]">
            {taglineLine1}
            <br />
            {taglineLine2}
          </p>
        </Reveal>
        <Reveal delay={0.26}>
          <p className="mx-auto mb-6 max-w-[620px] text-[15.5px] leading-[1.75] text-ink-2 max-md:mb-5 max-md:text-[14px]">
            {profile.lead}
          </p>
        </Reveal>

        {/* 行动按钮 */}
        <Reveal delay={0.32}>
          <div className="mb-7 flex flex-wrap items-center justify-center gap-4 max-md:mb-[22px] max-md:gap-3">
            {site.heroActions.map((action) => (
              <Button
                key={action.href}
                href={action.href}
                variant={action.variant as 'primary' | 'secondary'}
              >
                {action.label}
                {action.variant === 'secondary' && (
                  <Icon name="chevron" className="h-4 w-4" strokeWidth={2} />
                )}
              </Button>
            ))}
          </div>
        </Reveal>

        {/* 亮点微指标条 */}
        <Reveal delay={0.38}>
          <div className="inline-flex items-center justify-center gap-[clamp(16px,3vw,36px)] rounded-full border border-black/[0.08] bg-bg-alt/85 px-[26px] py-[11px] backdrop-blur-[10px] max-md:flex-col max-md:gap-2 max-md:rounded-2xl max-md:w-full max-md:max-w-[320px] max-md:px-5 max-md:py-3.5">
            {profile.metrics.map((metric, i) => (
              <div key={metric.label} className="contents max-md:contents">
                {i > 0 && <span className="h-[13px] w-px bg-black/[0.08] max-md:hidden" aria-hidden="true" />}
                <div className="flex items-baseline gap-1.5 max-md:justify-center">
                  <span className="font-mono text-[14.5px] font-bold tracking-[-0.01em] text-ink">
                    {metric.value}
                  </span>
                  <span className="text-[12.5px] font-medium text-ink-2">{metric.label}</span>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
