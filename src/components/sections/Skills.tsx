import { skills, site } from '../../data';
import { SectionHead } from '../ui/SectionHead';
import { Reveal } from '../motion/Reveal';

/** 桌面端列数，与容器 grid-cols-2 及分隔线判断保持一致 */
const SKILLS_GRID_COLS = 2;

export function Skills() {
  return (
    <section className="py-[60px]" id="skills">
      <div className="mx-auto w-[min(1080px,calc(100%-48px))]">
        <SectionHead
          eyebrow={site.sections.skills.eyebrow}
          title={site.sections.skills.title}
          description={site.sections.skills.description}
        />
        <div className="grid grid-cols-2 gap-x-9 max-md:grid-cols-1">
          {skills.map((skill, i) => (
            <Reveal key={skill.index} delay={i * 0.08}>
              <article
                className={`grid grid-cols-[46px_1fr] gap-3 py-4 max-md:grid-cols-1 max-md:gap-1.5 ${
                  i >= SKILLS_GRID_COLS ? 'border-t border-black/[0.08]' : ''
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
