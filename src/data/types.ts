/* ============================================================
 * 全站数据类型定义 —— 所有页面文案均由 src/data/ 供给
 * ============================================================ */

export type IconName =
  | 'mail'
  | 'phone'
  | 'wechat'
  | 'briefcase'
  | 'graduation'
  | 'location'
  | 'clock'
  | 'quote'
  | 'play'
  | 'doc'
  | 'chevron'
  | 'close'
  | 'menu';

export interface NavLink {
  label: string;
  href: string;
}

/** 区块标题三件套（eyebrow / 标题 / 描述） */
export interface SectionCopy {
  eyebrow: string;
  title: string;
  description?: string;
}

export interface HeroAction {
  label: string;
  href: string;
  variant: 'primary' | 'secondary';
}

export interface Site {
  brand: { name: string; subtitle: string };
  navLinks: NavLink[];
  mobileHomeLink: NavLink;
  sections: {
    skills: SectionCopy;
    projects: SectionCopy;
  };
  heroActions: HeroAction[];
}

export interface Profile {
  name: string;
  title: string;
  lead: string;
  avatar: string;
  badgeBack: {
    skills: string[];
    edu: string;
    location: string;
  };
}

export interface AboutFact {
  icon: IconName;
  label: string;
  value: string;
}

export interface TimelineItem {
  period: string;
  organization: string;
  role: string;
  /** 状态徽章文案 */
  badge?: string;
  /** 是否为当前在职/在读经历（时间线圆点与徽章用强调色） */
  current?: boolean;
  description: string;
  tags?: string[];
}

export interface About {
  eyebrow: string;
  title: string;
  description: string;
  paragraphs: string[];
  quote: {
    text: string;
    author: string;
  };
  facts: AboutFact[];
  timeline: {
    title: string;
    items: TimelineItem[];
  };
  skillsTagsTitle: string;
  skillsTags: string[];
}

export interface Skill {
  index: string;
  title: string;
  description: string;
  tags: string[];
}

export type VideoKey = 'trans' | 'docs';
export type DocKey = 'trans-doc' | 'docs-doc';

export type ProjectAction =
  | { kind: 'iframe'; label: string; ariaLabel: string; frameSrc: string; frameTabs?: FrameTab[] }
  | { kind: 'video'; ariaLabel: string; videoKey: VideoKey }
  | { kind: 'doc'; ariaLabel: string; docKey: DocKey };

export type ProjectSize = 'featured' | 'standard' | 'compact';

export interface ProjectTag {
  label: string;
  highlight?: boolean;
}

/** 项目配图画廊的单张截图（点击后在 Lightbox 画廊模式中浏览） */
export interface GalleryImage {
  src: string;
  alt: string;
  /** 缩略图叠加与弹窗底部展示的名称 */
  caption: string;
  /** 主图实际宽度（用于 srcset 描述符） */
  width: number;
  /** 配套可交互静态演示页（存在时点击缩略图直接打开该 Demo） */
  demoSrc?: string;
}

export interface Project {
  id: string;
  size: ProjectSize;
  tag?: string;
  meta: string;
  title: string;
  description: string;
  points?: string[];
  result: string;
  image: string;
  imageAlt: string;
  /** 配套工具截图画廊（展示在卡片媒体区，点击进入画廊弹窗） */
  gallery?: GalleryImage[];
  actions?: ProjectAction[];
  tags?: ProjectTag[];
}

export interface VideoTab {
  src: string;
  label: string;
}

/** iframe 弹窗内的顶部板块切换标签（如 EV Kit 在线体验的多个板块） */
export interface FrameTab {
  label: string;
  src: string;
}

export interface DocResource {
  title: string;
  /** 手册 Markdown 的请求地址（public/docs/ 下） */
  url: string;
  /** 手册内相对图片链接的解析基路径 */
  base: string;
}

export interface ContactRow {
  icon: IconName;
  label: string;
  value: string;
  href?: string;
  copyValue?: string;
  copyNotice?: string;
}

export interface Contact {
  eyebrow: string;
  title: string;
  description: string;
  rows: ContactRow[];
}
