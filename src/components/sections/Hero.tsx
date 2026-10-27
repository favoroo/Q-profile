import { site } from '../../data';
import { Button } from '../ui/Button';
import { Icon } from '../ui/icons';
import { Reveal } from '../motion/Reveal';
import styles from './Hero.module.css';

export function Hero() {
  return (
    <section className="relative overflow-hidden" id="home">
      {/* 背景装饰：顶部冷光晕（呼吸） + 点阵网格 + 扫光 + 浮动粒子 */}
      <div
        className={`pointer-events-none absolute top-0 left-1/2 z-0 h-[560px] w-[min(1200px,120vw)] -translate-x-1/2 ${styles.glowBreathe}`}
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
      {/* 点阵扫光层 */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-0 h-[560px] ${styles.dotShimmer}`}
        style={{
          backgroundImage: 'radial-gradient(rgba(0,113,227,0.28) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
          maskImage:
            'radial-gradient(ellipse 72% 62% at 50% 18%, black 26%, transparent 74%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 72% 62% at 50% 18%, black 26%, transparent 74%)',
          opacity: 0.8,
        }}
        aria-hidden="true"
      />
      {/* 浮动微粒子 */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[560px] overflow-hidden"
        style={{
          maskImage:
            'radial-gradient(ellipse 72% 62% at 50% 18%, black 26%, transparent 74%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 72% 62% at 50% 18%, black 26%, transparent 74%)',
        }}
        aria-hidden="true"
      >
        <span className={styles.particle} style={{ left: '18%', bottom: '10%', width: 3, height: 3, '--duration': '14s', '--delay': '0s', '--particle-opacity': '0.18', '--drift': '24px', '--rise': '-500px' } as React.CSSProperties} />
        <span className={styles.particle} style={{ left: '32%', bottom: '5%', width: 2, height: 2, '--duration': '18s', '--delay': '3s', '--particle-opacity': '0.15', '--drift': '-18px', '--rise': '-520px' } as React.CSSProperties} />
        <span className={styles.particle} style={{ left: '55%', bottom: '8%', width: 3, height: 3, '--duration': '12s', '--delay': '1.5s', '--particle-opacity': '0.22', '--drift': '30px', '--rise': '-480px' } as React.CSSProperties} />
        <span className={styles.particle} style={{ left: '72%', bottom: '12%', width: 2, height: 2, '--duration': '16s', '--delay': '5s', '--particle-opacity': '0.16', '--drift': '-22px', '--rise': '-540px' } as React.CSSProperties} />
        <span className={styles.particle} style={{ left: '42%', bottom: '2%', width: 2, height: 2, '--duration': '15s', '--delay': '7s', '--particle-opacity': '0.2', '--drift': '16px', '--rise': '-510px' } as React.CSSProperties} />
        <span className={styles.particle} style={{ left: '64%', bottom: '15%', width: 3, height: 3, '--duration': '11s', '--delay': '2s', '--particle-opacity': '0.25', '--drift': '-28px', '--rise': '-460px' } as React.CSSProperties} />
        <span className={styles.particle} style={{ left: '25%', bottom: '6%', width: 2, height: 2, '--duration': '17s', '--delay': '8s', '--particle-opacity': '0.14', '--drift': '20px', '--rise': '-530px' } as React.CSSProperties} />
      </div>

      <div className="relative z-1 mx-auto flex w-full max-w-[980px] flex-col items-center px-6 pt-4 pb-12 md:pb-14">
        {/* 巨型标题（居中双行） */}
        <Reveal delay={0.1} className="w-full">
          <div className="relative mx-auto w-full max-w-[980px] py-12 @container sm:py-16">
            {/* 底部光斑（呼吸） */}
            <div
              aria-hidden="true"
              className={`absolute bottom-[2%] left-1/2 z-0 h-[180px] w-[56%] -translate-x-1/2 rounded-full bg-accent/10 blur-[80px] ${styles.spotBreathe}`}
            />
            <h1 className="relative z-10 text-center text-[clamp(36px,10.5cqw,88px)] leading-[1.14] font-bold tracking-[-0.025em] text-ink">
              <span className="block">
                <span className="text-accent">AI 时代</span>的
              </span>
              <span className="block">汽车技术工程师</span>
            </h1>
          </div>
        </Reveal>

        {/* 行动按钮 */}
        <Reveal delay={0.2}>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3.5">
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
