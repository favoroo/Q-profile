import { skills, site } from '../../data';
import { Reveal } from '../motion/Reveal';

export function Skills() {
  return (
    <section className="py-[60px]" id="skills">
      <div className="mx-auto w-[min(1080px,calc(100%-48px))]">
        <Reveal className="mb-9 text-center">
          <p className="mb-2 font-mono text-[12.5px] font-semibold tracking-[0.22em] text-accent uppercase">
            {site.sections.skills.eyebrow}
          </p>
          <h2 className="m-0 text-[clamp(28px,4vw,44px)] leading-[1.1] font-bold tracking-[-0.02em]">
            {site.sections.skills.title}
          </h2>
          <p className="mx-auto mt-2.5 max-w-[560px] text-[15px] leading-[1.65] text-ink-2">
            {site.sections.skills.description}
          </p>
        </Reveal>
        <div className="grid grid-cols-2 gap-x-9 max-md:grid-cols-1">
          {skills.map((skill, i) => (
            <Reveal key={skill.index} delay={i * 0.08}>
              <article
                className={`grid grid-cols-[46px_1fr] gap-3 py-4 max-md:grid-cols-1 max-md:gap-1.5 ${
                  i >= 2 ? 'border-t border-black/[0.08]' : ''
                } max-md:[&:not(:first-child)]:border-t`}
              >
                <div className="pt-0.5 font-mono text-[12px] font-semibold tracking-[0.18em] text-accent max-md:pt-0">
                  {skill.index}
                </div>
                <div className="flex flex-col">
                  <h3 className="mb-1 mt-0 text-[17.5px] font-bold tracking-[-0.015em]">
                    {skill.title}
                  </h3>
                  <p className="m-0 max-w-[560px] text-[13.5px] leading-[1.65] text-ink-2">
                    {skill.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {skill.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-bg-alt px-2.5 py-[3px] text-[11.5px] text-ink-2"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
