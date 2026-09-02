import { projects, site, COMPACT_SUBDIVIDER } from '../../data';
import { ProjectCard } from '../projects/ProjectCard';
import { ProjectCompactCard } from '../projects/ProjectCompactCard';
import { SectionHead } from '../ui/SectionHead';
import { Reveal } from '../motion/Reveal';

export function Projects() {
  const featured = projects.filter((p) => p.size === 'featured');
  const standard = projects.filter((p) => p.size === 'standard');
  const compact = projects.filter((p) => p.size === 'compact');

  return (
    <section className="bg-bg-alt py-[60px]" id="projects">
      <div className="mx-auto w-[min(1080px,calc(100%-48px))]">
        <SectionHead
          eyebrow={site.sections.projects.eyebrow}
          title={site.sections.projects.title}
          description={site.sections.projects.description}
        />

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
