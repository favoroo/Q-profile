import { motion, useReducedMotion } from 'framer-motion';
import { profile, site } from '../../data';
import { LanyardBadge } from '../lanyard/LanyardBadge';
import { EmText } from '../ui/EmText';
import { Reveal } from '../motion/Reveal';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * 首屏「蓝色工位」大色块：品牌蓝整屏铺开、底部大圆角过渡到内容区。
 * 左列编辑式大字排版，右列悬挂工牌（挂绳从色块顶端垂下）。
 * 入场编排：状态徽章 → 姓名遮罩上移 → 定位语/署名/自介 → 标签交错 → 工牌入场摆动 → 注记与滚动指引。
 */
export function Hero() {
  const reduce = useReducedMotion() ?? false;
  const { hero } = site;

  return (
    <section
      id="home"
      className="relative isolate -mt-[52px] overflow-hidden rounded-b-[24px] bg-accent text-white md:rounded-b-[40px]"
    >
      {/* 纹理层：顶部径向提亮 + 工程网格（呼应汽车图纸身份）+ 工牌位聚光 */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.03) 45%, transparent 72%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.065) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.065) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
            maskImage: 'linear-gradient(to bottom, black 0%, black 62%, transparent 96%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 62%, transparent 96%)',
          }}
        />
        <div
          className="absolute right-[4%] top-[8%] hidden h-[560px] w-[560px] rounded-full lg:block"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.10) 0%, transparent 65%)',
          }}
        />
      </div>

      <div className="relative z-1 mx-auto flex min-h-svh w-[min(1080px,calc(100%-48px))] flex-col pb-9 pt-[76px]">
        <div className="grid flex-1 gap-x-8 md:grid-cols-[1.15fr_0.85fr]">
          {/* 左列：编辑式排版 */}
          <div className="flex flex-col items-start py-12 md:self-center md:py-0">
            <Reveal>
              <p className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-[2px]">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute h-full w-full animate-[pulse-dot_2.4s_ease-in-out_infinite] rounded-full bg-white" />
                  <span className="relative h-2 w-2 rounded-full bg-white" />
                </span>
                <span className="text-[12.5px] font-medium tracking-[0.02em] text-white/90">
                  {hero.status}
                </span>
              </p>
            </Reveal>

            {/* display 巨字姓名：遮罩式上移入场 */}
            <div className="mt-6 overflow-hidden pb-1 md:mt-7">
              <motion.h1
                className="text-[clamp(72px,12vw,148px)] font-bold leading-none tracking-[0.02em]"
                initial={reduce ? { opacity: 0 } : { y: '112%' }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.85, delay: 0.08, ease: EASE }}
              >
                {hero.name}
                <span className="text-white/50">.</span>
              </motion.h1>
            </div>

            <Reveal delay={0.16}>
              <p className="mt-5 text-[clamp(20px,2.6vw,30px)] font-semibold leading-snug text-white/85 md:mt-6">
                <EmText text={hero.title} accentClass="font-bold text-white" />
              </p>
            </Reveal>

            <Reveal delay={0.22}>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">
                {hero.eyebrow}
              </p>
            </Reveal>

            <Reveal delay={0.28}>
              <p className="mt-6 max-w-[36em] text-[15.5px] leading-[1.85] text-white/80 md:text-[16.5px]">
                <EmText text={profile.lead} accentClass="font-semibold text-white" />
              </p>
            </Reveal>

            {/* 实践方向标签：信息件而非按钮 */}
            <div className="mt-7 flex flex-wrap gap-2.5">
              {hero.tags.map((tag, i) => (
                <Reveal key={tag} delay={0.36 + i * 0.06} y={14}>
                  <span className="inline-block rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 font-mono text-[12px] tracking-[0.04em] text-white/85">
                    {tag}
                  </span>
                </Reveal>
              ))}
            </div>
          </div>

          {/* 右列：悬挂工牌（挂绳垂自色块顶端）+ 工程注记（图纸边注式，避开卡片） */}
          <div className="relative max-md:mt-2">
            <Reveal delay={0.1} y={16}>
              <LanyardBadge />
            </Reveal>
            <Reveal
              delay={0.55}
              y={8}
              className="pointer-events-none absolute right-2 top-6 hidden whitespace-nowrap font-mono text-[11px] tracking-[0.08em] text-white/40 lg:block"
            >
              <span aria-hidden="true">+ TORQUE 110 N·m ✓</span>
            </Reveal>
            <Reveal
              delay={0.65}
              y={8}
              className="pointer-events-none absolute bottom-6 right-2 hidden whitespace-nowrap font-mono text-[11px] tracking-[0.08em] text-white/40 lg:block"
            >
              <span aria-hidden="true">EV 400V · ISOLATION OK</span>
            </Reveal>
          </div>
        </div>

        {/* 滚动指引 */}
        <Reveal delay={0.6} y={10} className="mt-12">
          <div className="flex items-center gap-3 text-white/60">
            <span
              className="h-7 w-px animate-[scroll-line_2.2s_ease-in-out_infinite] bg-white/50"
              aria-hidden="true"
            />
            <span className="font-mono text-[11px] tracking-[0.2em]">{hero.scrollCue}</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
