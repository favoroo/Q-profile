import { about } from '../../data';
import { Icon } from '../ui/icons';
import { Reveal } from '../motion/Reveal';

export function About() {
  return (
    <section className="py-[60px]" id="about">
      <div className="mx-auto w-[min(1080px,calc(100%-48px))]">
        <Reveal className="mb-9 text-center">
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

        <div className="grid grid-cols-[1.15fr_0.85fr] items-start gap-9 max-lg:gap-7 max-md:grid-cols-1 max-md:gap-6">
          {/* 左：自述与理念 */}
          <div className="flex flex-col gap-3.5">
            <Reveal>
              <p className="m-0 text-[16.5px] leading-[1.75] font-medium text-ink">
                {about.paragraphs[0]}
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="m-0 text-[15px] leading-[1.75] text-ink-2">{about.paragraphs[1]}</p>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="m-0 text-[15px] leading-[1.75] text-ink-2">{about.paragraphs[2]}</p>
            </Reveal>

            <Reveal delay={0.24} className="mt-1">
              <div className="flex items-start gap-3 rounded-[20px] border border-accent/[0.12] border-l-4 border-l-accent bg-accent/[0.04] px-5 py-4">
                <span className="mt-0.5 flex-none text-accent">
                  <Icon name="quote" />
                </span>
                <div className="flex flex-col gap-1">
                  <p className="m-0 text-[14.5px] leading-[1.65] font-semibold text-ink">
                    {about.quote.text}
                  </p>
                  <span className="text-[12.5px] text-ink-3">{about.quote.author}</span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* 右：工程师档案卡 */}
          <Reveal delay={0.12}>
            <aside className="flex flex-col gap-[18px] rounded-[28px] border border-black/[0.08] bg-bg-alt p-6 shadow-card max-md:p-[18px]">
              <div className="flex items-center justify-between border-b border-black/[0.08] pb-3">
                <h3 className="m-0 text-[15.5px] font-bold tracking-[-0.01em] text-ink">
                  {about.card.title}
                </h3>
                <span className="rounded-full bg-accent/[0.08] px-2 py-[3px] font-mono text-[11px] font-semibold tracking-[0.12em] text-accent uppercase">
                  {about.card.badge}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {about.card.facts.map((fact) => (
                  <div key={fact.label} className="flex items-start gap-3">
                    <span className="mt-px grid h-[30px] w-[30px] flex-none place-items-center rounded-lg border border-black/[0.08] bg-white text-ink-2">
                      <Icon name={fact.icon} className="h-[15px] w-[15px]" />
                    </span>
                    <div className="flex flex-1 flex-col gap-0.5">
                      <span className="text-[11.5px] font-medium text-ink-3">{fact.label}</span>
                      <span className="text-[14px] leading-[1.45] font-semibold text-ink">
                        {fact.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="h-px bg-black/[0.08]" />

              <div className="flex flex-col gap-2.5">
                <p className="m-0 text-[11.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
                  {about.card.tagsTitle}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {about.card.pills.map((pill) => (
                    <span
                      key={pill}
                      className="rounded-full border border-black/[0.08] bg-white px-2.5 py-1 text-[12px] font-medium text-ink transition-colors duration-200 hover:border-accent hover:text-accent"
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              </div>
            </aside>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
