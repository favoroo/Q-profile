import { profile, site } from '../../data';
import { Button } from '../ui/Button';
import { Icon } from '../ui/icons';
import { Reveal } from '../motion/Reveal';

export function Hero() {
  return (
    <section className="relative overflow-hidden" id="home">
      {/* 背景装饰：顶部冷光晕 + 点阵网格 */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 z-0 h-[560px] w-[min(1200px,120vw)] -translate-x-1/2"
        style={{
          background:
            'radial-gradient(circle at 50% 30%, rgba(0,113,227,0.08) 0%, rgba(0,113,227,0.02) 46%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[560px]"
        style={{
          backgroundImage: 'radial-gradient(rgba(0,113,227,0.12) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
          maskImage:
            'radial-gradient(ellipse 72% 62% at 50% 18%, black 26%, transparent 74%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 72% 62% at 50% 18%, black 26%, transparent 74%)',
          opacity: 0.5,
        }}
        aria-hidden="true"
      />

      <div className="relative z-1 mx-auto flex w-full max-w-[980px] flex-col items-center px-6 pt-6 pb-16 md:pb-20">
        {/* 居中舞台：巨型标题(中层) < 人物(最上)，标题穿过颈部、下缘沉入深色衣服自然融合 */}
        <Reveal delay={0.1} className="w-full">
          <div className="relative mx-auto h-[440px] w-full max-w-[980px] @container sm:h-[480px] lg:h-[520px]">
            {/* 底部光斑 */}
            <div
              aria-hidden="true"
              className="absolute bottom-[4%] left-1/2 z-0 h-[220px] w-[64%] -translate-x-1/2 rounded-full bg-accent/10 blur-[80px]"
            />

            {/* 巨型标题（中层）：双行环抱人物 —— 第一行悬于头顶上方零遮挡，第二行穿过颈部 */}
            <h1 className="absolute inset-x-0 top-[8%] z-10 text-center text-[clamp(36px,10.5cqw,88px)] leading-[1.12] font-bold tracking-[-0.025em] text-ink sm:inset-x-0 sm:top-0 sm:h-full">
              <span className="block sm:absolute sm:inset-x-0 sm:top-[5%]">
                <span className="text-accent">AI 时代</span>的
              </span>
              <span className="block sm:absolute sm:inset-x-0 sm:top-[71%] sm:-translate-y-1/2 sm:flex sm:justify-center sm:gap-[min(280px,28.6cqw)]">
                <span>汽车技术</span>
                <span>工程师</span>
              </span>
            </h1>

            {/* 人物舞台（最上层） */}
            <div className="absolute bottom-0 left-1/2 z-20 h-[74%] w-[min(420px,88%)] -translate-x-1/2 sm:h-[64%]">
              {/* 人物抠像 */}
              <img
                src={profile.portrait}
                alt={profile.name}
                draggable={false}
                className="absolute bottom-0 left-1/2 z-20 h-full w-auto max-w-none -translate-x-1/2 object-contain object-bottom"
                style={{ filter: 'drop-shadow(0 28px 36px rgba(29,29,31,0.16))' }}
              />
            </div>
          </div>
        </Reveal>

        {/* 行动按钮 */}
        <Reveal delay={0.2}>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3.5">
            {site.heroActions.map((action) => (
              <Button
                key={action.href}
                href={action.href}
                variant={action.variant}
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
