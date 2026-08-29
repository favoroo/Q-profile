import type { NavLink } from './types';

export const site = {
  brand: { name: '黄谦', subtitle: '汽车技术工程师' },
  navLinks: [
    { label: '关于', href: '#about' },
    { label: '能力', href: '#skills' },
    { label: '项目', href: '#projects' },
    { label: '联系', href: '#contact' },
  ] as NavLink[],
  mobileHomeLink: { label: '首页', href: '#home' },
  footer: {
    left: '黄谦 · 汽车技术工程师',
    right: '',
  },
  sections: {
    skills: {
      eyebrow: 'Expertise',
      title: '专业能力',
      description:
        '围绕维修资料、数据开发、AI 提效与新能源高压测量，介绍我的核心能力。',
    },
    projects: {
      eyebrow: 'Projects',
      title: '项目经历',
      description: '每个项目写清楚三件事：做了什么、我负责什么、结果如何。',
    },
  },
  heroActions: [
    { label: '查看项目经历', href: '#projects', variant: 'primary' },
    { label: '联系我', href: '#contact', variant: 'secondary' },
  ],
};
