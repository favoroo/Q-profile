import type { Site } from './types';

export const site: Site = {
  brand: { name: '黄谦', subtitle: '汽车技术工程师' },
  navLinks: [
    { label: '关于', href: '#about' },
    { label: '能力', href: '#skills' },
    { label: '项目', href: '#projects' },
    { label: '联系', href: '#contact' },
  ],
  mobileHomeLink: { label: '首页', href: '#home' },
  sections: {
    skills: {
      eyebrow: 'Expertise',
      title: '专业能力',
    },
    projects: {
      eyebrow: 'Projects',
      title: '项目经历',
    },
  },
  heroActions: [
    { label: '查看项目经历', href: '#projects', variant: 'primary' },
    { label: '联系我', href: '#contact', variant: 'secondary' },
  ],
};
