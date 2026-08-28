import { timeline, site } from '../../data';
import { Reveal } from '../motion/Reveal';

export function Journey() {
  return (
    <section className="bg-bg-alt py-[60px]" id="journey">
      <div className="mx-auto w-[min(760px,calc(100%-48px))]">
        <Reveal className="mb-9 text-center">
          <p className="mb-2 font-mono text-[12.5px] font-semibold tracking-[0.22em] text-accent uppercase">
            {site.sections.journey.eyebrow}
          </p>
          <h2 className="m-0 text-[clamp(28px,4vw,44px)] leading-[1.1] font-bold tracking-[-0.02em]">
            {site.sections.journey.title}
          </h2>
        </Reveal>
        <ol className="m-0 list-none p-0">
          {timeline.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.1}>
              <li
                className={`grid grid-cols-[170px_1fr] gap-8 py-6 max-md:grid-cols-1 max-md:gap-2 max-md:py-[18px] ${
                  i > 0 ? 'border-t border-black/[0.08]' : ''
                }`}
              >
                <div className="pt-1 font-mono text-[13.5px] font-semibold tracking-[0.03em] text-ink-3 max-md:pt-0">
                  {item.period}
                </div>
                <div>
                  <h3 className="mb-1.5 mt-0 text-[19px] font-bold tracking-[-0.015em]">
                    {item.title}
                  </h3>
                  <p className="m-0 max-w-[560px] text-[14.5px] leading-[1.7] text-ink-2">
                    {item.description}
                  </p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
