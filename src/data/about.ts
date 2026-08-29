import type { About } from './types';

export const about: About = {
  eyebrow: 'About & Journey',
  title: '关于我',
  description: '扎根汽车工程一线实践，持续探索工程标准化与 AI 工具提效',
  paragraphs: [
    '我是黄谦，现就职于湖南道通科技，担任汽车技术工程师。在汽车电控、诊断标定与新能源高压测量等核心业务中积累了扎实的落地经验，擅长用严谨的工程思维将方案转化为可量产交付的标准流程。',
    '近两年我将技术视野拓展至 AI Agent 与工程自动化提效：主导推进了技术翻译规范性整改、海量资料治理与智能知识库检索工具的设计与落地，以数字化工具重塑团队生产力。',
  ],
  quote: {
    text: '“敏锐洞察业务中的提效痛点，善用 AI 与自动化工具重塑流程，把繁琐工作转化为高效生产力。”',
    author: '提效与实践理念',
  },
  facts: [
    { icon: 'briefcase', label: '现任职位', value: '湖南道通科技 · 汽车技术工程师' },
    { icon: 'graduation', label: '教育背景', value: '中南林业科技大学 · 汽车服务工程' },
    { icon: 'location', label: '工作坐标', value: '湖南长沙' },
    { icon: 'clock', label: '当前状态', value: '在职 · 开放机会与技术交流' },
  ],
  timeline: {
    title: '教育与职业经历',
    badge: '2017 – 至今',
    items: [
      {
        period: '2017.09 – 2021.06',
        organization: '中南林业科技大学',
        role: '汽车服务工程 · 本科',
        badge: '专业前 20%',
        description:
          '成绩位列前 20%，获校级奖学金与大学英语四级（CET-4），系统掌握汽车构造、电控与诊断专业体系。',
        tags: ['汽车构造', '电控与诊断', '校级奖学金'],
      },
      {
        period: '2021.06 – 至今',
        organization: '湖南道通科技',
        role: '汽车技术工程师',
        badge: '现任',
        description:
          '深耕新能源高压测量全流程、四轮定位标定与车型识别开发；主导自研系列 AI Agent 工具推动团队流程自动化与效率革新。',
        tags: ['EV高压测量', '四轮定位', 'VIN车型识别', 'AI Agent开发'],
      },
    ],
  },
  skillsTagsTitle: '核心实践方向',
  skillsTags: [
    'EV 新能源高压测量',
    '四轮定位标定',
    'VIN 车型识别',
    'AI Agent 工具开发',
    '知识库治理',
    '技术资料检索与答疑',
  ],
};
