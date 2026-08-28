import { projects, site, COMPACT_SUBDIVIDER } from '../../data';
import { ProjectCard } from '../projects/ProjectCard';
import { ProjectCompactCard } from '../projects/ProjectCompactCard';
import { Reveal } from '../motion/Reveal';

export function Projects() {
  const featured = projects.filter((p) => p.size === 'featured');
  const standard = projects.filter((p) => p.size === 'standard');
  const compact = projects.filter((p) => p.size === 'compact');

  return (
    <section className="bg-bg-alt py-[60px]" id="projects">
      <div className="mx-auto w-[min(1080px,calc(100%-48px))]">
        <Reveal className="mb-9 text-center">
          <p className="mb-2 font-mono text-[12.5px] font-semibold tracking-[0.22em] text-accent uppercase">
            {site.sections.projects.eyebrow}
          </p>
          <h2 className="m-0 text-[clamp(28px,4vw,44px)] leading-[1.1] font-bold tracking-[-0.02em]">
            {site.sections.projects.title}
          </h2>
          <p className="mx-auto mt-2.5 max-w-[560px] text-[15px] leading-[1.65] text-ink-2">
            {site.sections.projects.description}
          </p>
        </Reveal>

        <div className="grid grid-cols-2 gap-[18px] max-md:grid-cols-1">
          {featured.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
          {standard.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}

          {/* 分隔条 */}
          <Reveal className="col-span-2 mt-2 max-md:col-span-1" delay={0.2}>
            <div className="flex items-center gap-3.5">
              <span className="h-px flex-1 bg-black/[0.08]" />
              <span className="font-mono text-[11.5px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
                {COMPACT_SUBDIVIDER}
              </span>
              <span className="h-px flex-1 bg-black/[0.08]" />
            </div>
          </Reveal>

          {compact.map((p, i) => (
            <ProjectCompactCard key={p.id} project={p} delay={0.24 + i * 0.06} />
          ))}
        </div>
      </div>
    </section>
  );
}
