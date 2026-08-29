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

      <div className="relative z-1 flex flex-col items-center pt-6 pb-10 max-md:pt-4 max-md:pb-8">
        {/* 悬吊工牌 */}
        <Reveal>
          <LanyardBadge />
        </Reveal>

        {/* 标语与文案 */}
        <Reveal delay={0.14}>
          <h1 className="mx-auto mt-4 mb-3.5 max-w-[700px] text-[clamp(24px,3.2vw,36px)] leading-[1.35] font-bold tracking-[-0.02em] text-ink max-md:mt-3 max-md:mb-2.5 max-md:text-[22px]">
            {taglineLine1}
            <br />
            {taglineLine2}
          </h1>
        </Reveal>
        <Reveal delay={0.22}>
          <p className="mx-auto mb-6 max-w-[620px] text-[15.5px] leading-[1.75] text-ink-2 max-md:mb-5 max-md:text-[14px]">
            {profile.lead}
          </p>
        </Reveal>

        {/* 行动按钮 */}
        <Reveal delay={0.32}>
          <div className="flex flex-wrap items-center justify-center gap-4 max-md:gap-3">
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
      </div>
    </section>
  );
}
