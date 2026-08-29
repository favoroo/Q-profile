import { about } from '../../data';
import { Icon } from '../ui/icons';
import { Reveal } from '../motion/Reveal';

export function About() {
  return (
    <section className="py-[60px]" id="about">
      <div className="mx-auto w-[min(1080px,calc(100%-48px))]">
        {/* 顶部标题区 */}
        <Reveal className="mb-10 text-center">
          <p className="mb-2 font-mono text-[12.5px] font-semibold tracking-[0.22em] text-accent uppercase">
            {about.eyebrow}
          </p>
          <h2 className="m-0 text-[clamp(28px,4vw,44px)] leading-[1.1] font-bold tracking-[-0.02em]">
            {about.title}
          </h2>
          <p className="mx-auto mt-2.5 max-w-[560px] text-[15px] leading-[1.65] text-ink-2">
            {about.description}
          </p>
        </Reveal>

        {/* 核心双栏复合网格（等宽对齐） */}
        <div className="grid grid-cols-2 items-start gap-8 lg:gap-9 max-lg:grid-cols-1">
          {/* 左栏：个人自述、工程理念与档案速览 */}
          <div className="flex flex-col gap-4.5">
            {/* 自述文本 */}
            <div className="flex flex-col gap-3">
              <Reveal>
                <p className="m-0 text-[15px] leading-[1.75] font-medium text-ink">
                  {about.paragraphs[0]}
                </p>
              </Reveal>
              {about.paragraphs[1] && (
                <Reveal delay={0.08}>
                  <p className="m-0 text-[14.5px] leading-[1.75] text-ink-2">
                    {about.paragraphs[1]}
                  </p>
                </Reveal>
              )}
            </div>

            {/* 提效理念金句卡片 */}
            <Reveal delay={0.14}>
              <div className="flex items-start gap-3 rounded-[20px] border border-accent/[0.15] border-l-4 border-l-accent bg-accent/[0.04] p-4 transition-shadow duration-300 hover:shadow-xs">
                <span className="mt-0.5 grid h-6.5 w-6.5 flex-none place-items-center rounded-lg bg-accent/10 text-accent">
                  <Icon name="quote" className="h-3.5 w-3.5" />
                </span>
                <div className="flex flex-col gap-1">
                  <p className="m-0 text-[13.5px] leading-[1.6] font-semibold text-ink">
                    {about.quote.text}
                  </p>
                  <span className="font-mono text-[11px] font-medium text-ink-3">
                    {about.quote.author}
                  </span>
                </div>
              </div>
            </Reveal>

            {/* 个人档案微型卡片矩阵 */}
            <Reveal delay={0.2}>
              <div className="grid grid-cols-2 gap-2.5 max-sm:grid-cols-1">
                {about.facts.map((fact) => (
                  <div
                    key={fact.label}
                    className="flex items-start gap-2.5 rounded-[16px] border border-black/[0.06] bg-bg-alt/70 p-3 transition-colors hover:bg-bg-alt"
                  >
                    <span className="mt-0.5 grid h-[28px] w-[28px] flex-none place-items-center rounded-lg border border-black/[0.06] bg-white text-ink-2 shadow-xs">
                      <Icon name={fact.icon} className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[11px] font-medium text-ink-3">{fact.label}</span>
                      <span className="text-[12.5px] leading-[1.4] font-semibold text-ink break-words">
                        {fact.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* 右栏：教育与职业经历成长时间轴卡片 */}
          <Reveal delay={0.12} className="lg:-mt-2">
            <div className="flex flex-col gap-4 rounded-[24px] border border-black/[0.08] bg-bg-alt p-5 lg:p-5.5 shadow-card">
              {/* 卡片头部 */}
              <div className="flex items-center justify-between border-b border-black/[0.08] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-white text-ink shadow-xs">
                    <Icon name="briefcase" className="h-3.5 w-3.5" />
                  </span>
                  <h3 className="m-0 text-[15.5px] font-bold tracking-[-0.01em] text-ink">
                    {about.timeline.title}
                  </h3>
                </div>
              </div>

              {/* 时间线列表 */}
              <div className="relative flex flex-col gap-3.5 pl-1 before:absolute before:top-2 before:bottom-3 before:left-[13px] before:w-[1.5px] before:bg-black/[0.08]">
                {about.timeline.items.map((item) => (
                  <div key={item.organization} className="relative flex items-start gap-3.5">
                    {/* 时间线圆点指示器 */}
                    <div className="relative z-1 mt-0.5 grid h-4.5 w-4.5 flex-none place-items-center rounded-full bg-white shadow-xs ring-2 ring-black/[0.08]">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          item.badge === '现任' ? 'bg-accent' : 'bg-ink-3'
                        }`}
                      />
                    </div>

                    {/* 经历详情 */}
                    <div className="flex flex-1 flex-col">
                      {/* 年份与状态徽章 */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[12px] font-semibold tracking-[0.03em] text-ink-3">
                          {item.period}
                        </span>
                        {item.badge && (
                          <span
                            className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                              item.badge === '现任'
                                ? 'bg-accent/10 text-accent'
                                : 'bg-black/[0.06] text-ink-2'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>

                      {/* 单位与岗位 */}
                      <h4 className="mt-0.5 mb-0.5 text-[14.5px] font-bold text-ink">
                        {item.organization}{' '}
                        <span className="font-normal text-ink-2">· {item.role}</span>
                      </h4>

                      {/* 概述 */}
                      <p className="mt-0.5 mb-0 text-[13px] leading-[1.55] text-ink-2">
                        {item.description}
                      </p>

                      {/* 关键标签 */}
                      {item.tags && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-ink-2 shadow-2xs transition-colors hover:text-accent"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 底部核心实践标签 */}
              <div className="border-t border-black/[0.08] pt-3">
                <p className="mb-2 mt-0 font-mono text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase">
                  {about.skillsTagsTitle}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {about.skillsTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-black/[0.08] bg-white px-2.5 py-0.5 text-[11.5px] font-medium text-ink transition-all duration-200 hover:border-accent hover:text-accent"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
