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
  hero: {
    status: '在职 · 湖南道通科技 · 长沙',
    name: '黄谦',
    title: '**AI 时代**的汽车技术工程师',
    eyebrow: 'HUANG QIAN · AUTOMOTIVE TECH ENGINEER',
    tags: ['四轮定位', 'VIN 码解析', 'EV 高压测量', 'AI Agent 开发'],
    scrollCue: '向下滚动',
  },
};
