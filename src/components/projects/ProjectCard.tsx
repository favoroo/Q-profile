import type { Project, ProjectAction } from '../../data';
import { projectImageSrcSet } from '../../lib/asset';
import { Icon } from '../ui/icons';
import { Button } from '../ui/Button';
import { useLightbox } from '../modal/LightboxProvider';
import { Reveal } from '../motion/Reveal';

function DemoButtons({ actions }: { actions: ProjectAction[] }) {
  const { open } = useLightbox();
  return (
    <>
      {actions.map((action, i) => (
        <Button
          key={i}
          variant="primary"
          className="shrink-0"
          onClick={() => open(action)}
          ariaLabel={action.ariaLabel}
        >
          <Icon name="play" className="h-4 w-4" stroke={false} />
          {action.label}
        </Button>
      ))}
    </>
  );
}

/**
 * featured（全宽横幅）/ standard（半宽）项目卡。
 * hover 上浮 + 图片微缩放微动效；视频/文档按钮叠加在配图右上角。
 */
export function ProjectCard({ project }: { project: Project }) {
  const { open, openGallery } = useLightbox();
  const featured = project.size === 'featured';
  const gallery = project.gallery;
  const mediaActions = (project.actions ?? [])
    .filter((a) => a.kind === 'doc' || a.kind === 'video')
    .sort((a, b) => (a.kind === 'doc' ? -1 : 1) - (b.kind === 'doc' ? -1 : 1));
  const demoActions = (project.actions ?? []).filter((a) => a.kind === 'iframe');

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
        {/* 媒体区：主图 + （可选）配套工具截图缩略图行 */}
        <div
          className={`relative overflow-hidden ${
            gallery
              ? 'flex flex-col lg:h-full lg:min-h-[280px]'
              : featured
                ? 'lg:h-full lg:min-h-[280px]'
                : 'aspect-16/10'
          }`}
        >
          <div
            className={`w-full ${gallery ? 'overflow-hidden lg:min-h-0 lg:flex-1' : 'h-full'}`}
          >
            <img
              src={project.image}
              srcSet={projectImageSrcSet(project.image) || undefined}
              sizes={featured ? '(max-width: 1023px) 100vw, 562px' : '(max-width: 767px) 100vw, 531px'}
              alt={project.imageAlt}
              width={1376}
              height={768}
              loading="lazy"
              decoding="async"
              className="block h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-out-apple)] group-hover:scale-[1.04]"
            />
          </div>
          {gallery && gallery.length > 0 && (
            <div className="flex-none p-2 max-lg:p-2.5 lg:p-2.5">
              <div className="grid grid-cols-3 gap-2">
                {gallery.map((img, i) => (
                  <button
                    key={img.src}
                    type="button"
                    aria-label={img.demoSrc ? `在线体验${img.caption}` : `查看${img.caption}界面截图`}
                    title={img.demoSrc ? `在线体验 · ${img.caption}` : img.caption}
                    onClick={() =>
                      img.demoSrc
                        ? open({
                            kind: 'iframe',
                            label: img.caption,
                            ariaLabel: `在线体验${img.caption}`,
                            frameSrc: img.demoSrc,
                          })
                        : openGallery(gallery, i)
                    }
                    className="group/thumb relative cursor-pointer overflow-hidden rounded-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-[var(--ease-out-apple)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.14)]"
                  >
                    <img
                      src={img.src}
                      srcSet={projectImageSrcSet(img.src, img.width) || undefined}
                      sizes="(max-width: 767px) 30vw, 180px"
                      alt={img.alt}
                      width={800}
                      height={400}
                      loading="lazy"
                      decoding="async"
                      className="block aspect-[2/1] w-full object-cover transition-transform duration-500 ease-[var(--ease-out-apple)] group-hover/thumb:scale-[1.06]"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pt-4 pb-2 text-left text-[11px] leading-none font-medium text-white">
                      {img.demoSrc && (
                        <span
                          aria-hidden="true"
                          className="mr-1 inline-block align-[-1px] text-[9px] leading-none"
                        >
                          ▶
                        </span>
                      )}
                      {img.caption}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
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
          {/* 成果徽章与「在线体验」按钮同一行，按钮固定在行尾 */}
          <div className="mt-auto flex flex-wrap items-center gap-3 max-lg:mt-2">
            <p className="min-w-[220px] flex-1 rounded-xl bg-accent/[0.08] px-3.5 py-2.5 text-[13px] leading-[1.65] text-accent-deep">
              {project.result}
            </p>
            {demoActions.length > 0 && <DemoButtons actions={demoActions} />}
          </div>
        </div>
      </article>
    </Reveal>
  );
}
