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
  description: string;
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
  | { kind: 'iframe'; label: string; ariaLabel: string; frameSrc: string }
  | { kind: 'video'; ariaLabel: string; videoKey: VideoKey }
  | { kind: 'doc'; ariaLabel: string; docKey: DocKey };

export type ProjectSize = 'featured' | 'standard' | 'compact';

export interface ProjectTag {
  label: string;
  highlight?: boolean;
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
  actions?: ProjectAction[];
  tags?: ProjectTag[];
}

export interface VideoTab {
  src: string;
  label: string;
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
