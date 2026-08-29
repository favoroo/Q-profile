import type { Project } from '../../data';
import { Reveal } from '../motion/Reveal';

/** 紧凑横条项目卡（四轮定位 / VIN 识别 / 专项支撑）。 */
export function ProjectCompactCard({ project, delay = 0 }: { project: Project; delay?: number }) {
  return (
    <Reveal className="col-span-2 max-md:col-span-1" delay={delay}>
      <article className="group grid h-full grid-cols-[200px_1fr] overflow-hidden rounded-[28px] border border-black/[0.08] bg-bg-alt transition-all duration-500 ease-[var(--ease-out-apple)] hover:-translate-y-[3px] hover:border-accent/[0.24] hover:shadow-card-hover max-md:grid-cols-1">
        <div className="relative h-full min-h-[135px] overflow-hidden bg-black/[0.04] max-md:aspect-16/9 max-md:h-auto max-md:min-h-0">
          <img
            src={project.image}
            alt={project.imageAlt}
            width={1152}
            height={864}
            loading="lazy"
            className="block h-full w-full object-cover transition-transform duration-500 ease-[var(--ease-out-apple)] group-hover:scale-[1.06]"
          />

        </div>

        <div className="flex flex-col justify-between gap-2 px-5 py-4 max-sm:px-3.5 max-sm:py-3.5">
          <div className="flex flex-col gap-[3px]">
            <div className="font-mono text-[11.5px] tracking-[0.02em] text-ink-3">{project.meta}</div>
            <h3 className="m-0 text-[17.5px] font-bold tracking-[-0.015em] text-ink">
              {project.title}
            </h3>
          </div>
          <p className="m-0 text-[13.5px] leading-[1.65] text-ink-2">{project.description}</p>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-black/[0.08] pt-2 max-sm:flex-col max-sm:items-start max-sm:gap-1.5">
            <div className="flex flex-wrap gap-[5px]">
              {project.tags?.map((tag) => (
                <span
                  key={tag.label}
                  className={`rounded-[5px] px-[7px] py-[2px] text-[11px] font-medium ${
                    tag.highlight
                      ? 'bg-accent/[0.08] font-semibold text-accent-deep'
                      : 'bg-black/[0.04] text-ink-2'
                  }`}
                >
                  {tag.label}
                </span>
              ))}
            </div>
            <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent-deep">
              {project.result}
            </span>
          </div>
        </div>
      </article>
    </Reveal>
  );
}
