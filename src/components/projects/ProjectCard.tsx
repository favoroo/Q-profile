import type { Project, ProjectAction } from '../../data';
import { Icon } from '../ui/icons';
import { Button } from '../ui/Button';
import { useLightbox } from '../modal/LightboxProvider';
import { Reveal } from '../motion/Reveal';

function ActionButtons({ actions }: { actions: ProjectAction[] }) {
  const { open } = useLightbox();
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {actions.map((action, i) => {
        if (action.kind === 'iframe') {
          return (
            <Button key={i} variant="primary" onClick={() => open(action)} ariaLabel={action.ariaLabel}>
              <Icon name="play" className="h-4 w-4" stroke={false} />
              {action.label}
            </Button>
          );
        }
        /* 视频/文档以媒体角上的圆形按钮呈现，此处不渲染 */
        return null;
      })}
    </div>
  );
}

/**
 * featured（全宽横幅）/ standard（半宽）项目卡。
 * hover 上浮 + 图片微缩放微动效；视频/文档按钮叠加在配图右上角。
 */
export function ProjectCard({ project }: { project: Project }) {
  const { open } = useLightbox();
  const featured = project.size === 'featured';
  const mediaActions = (project.actions ?? [])
    .filter((a) => a.kind === 'doc' || a.kind === 'video')
    .sort((a) => (a.kind === 'doc' ? -1 : 1));

  return (
    <Reveal
      className={featured ? 'col-span-2 max-md:col-span-1' : undefined}
      delay={featured ? 0 : 0.08}
    >
      <article
        className={`group flex h-full flex-col overflow-hidden rounded-[28px] bg-bg-alt transition-all duration-500 ease-[var(--ease-out-apple)] hover:-translate-y-1 hover:shadow-card-hover ${
          featured ? 'lg:grid lg:grid-cols-[1.1fr_1fr]' : ''
        }`}
      >
        {/* 媒体区 */}
        <div
          className={`relative overflow-hidden ${
            featured ? 'lg:h-full lg:min-h-[280px]' : 'aspect-16/10'
          }`}
        >
          <img
            src={project.image}
            alt={project.imageAlt}
            width={1152}
            height={864}
            loading="lazy"
            className="block h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-out-apple)] group-hover:scale-[1.04]"
          />
        </div>

        {/* 内容区 */}
        <div
          className={`flex flex-1 flex-col gap-2.5 p-7 pb-7 ${
            featured ? 'lg:justify-center lg:px-8 lg:py-7' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="font-mono text-[12px] tracking-[0.03em] text-ink-3">{project.meta}</div>
            {mediaActions.length > 0 && (
              <div className="flex items-center gap-2">
                {mediaActions.map((action, i) => {
                  const isDoc = action.kind === 'doc';
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-label={action.ariaLabel}
                      title={isDoc ? '查看开发手册' : '查看演示视频'}
                      onClick={() => open(action)}
                      className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-black/[0.08] bg-white text-ink shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-300 ease-[var(--ease-out-apple)] hover:scale-[1.08] hover:border-black/[0.18] hover:text-accent hover:shadow-[0_4px_14px_rgba(0,0,0,0.1)] active:scale-95"
                    >
                      <Icon
                        name={isDoc ? 'doc' : 'play'}
                        className={`h-4 w-4 ${isDoc ? '' : 'ml-0.5'}`}
                        stroke={isDoc}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <h3 className="m-0 text-[21px] font-bold tracking-[-0.015em]">{project.title}</h3>
          <p className="m-0 text-[14.5px] leading-[1.7] text-ink-2">{project.description}</p>
          {project.points && (
            <ul className="m-0 list-none p-0">
              {project.points.map((pt) => (
                <li
                  key={pt}
                  className="relative pl-4 text-[13.5px] leading-[1.7] text-ink-2 [&:not(:first-child)]:mt-1 before:absolute before:top-[0.72em] before:left-0 before:h-[1.5px] before:w-[7px] before:rounded-full before:bg-accent before:content-['']"
                >
                  {pt}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-auto rounded-xl bg-accent/[0.08] px-3.5 py-2.5 text-[13px] leading-[1.65] text-accent-deep max-lg:mt-2">
            {project.result}
          </p>
          {project.actions && <ActionButtons actions={project.actions} />}
        </div>
      </article>
    </Reveal>
  );
}
