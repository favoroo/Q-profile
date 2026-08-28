import type { About } from './types';

export const about: About = {
  eyebrow: 'About',
  title: '关于我',
  description: '扎根汽车工程一线实践，持续探索工程标准化与 AI 工具提效',
  paragraphs: [
    '我是黄谦，来自湖南邵阳，本科毕业于中南林业科技大学汽车服务工程专业，现就职于湖南道通科技，任汽车技术工程师。从学校到职场，我先后参与了汽车诊断、四轮定位、新能源高压测量等多个项目，并主导了公司内部 AI 工具的开发。',
    '我习惯先拆解问题、再用数据和流程去验证，把每个环节做到可落地。四轮定位的参数与流程、几十个品牌的 VIN 车型识别，都在我手上从方案走向了量产交付。',
    '近两年我把重心转向用 Agent 工具给团队提效：翻译的规范性整改、资料的治理与知识库检索，都是我亲手设计和推动落地的事。',
  ],
  quote: {
    text: '“敏锐洞察业务中的提效痛点，善用 AI 与自动化工具重塑流程，把繁琐工作转化为高效生产力。”',
    author: '提效与实践理念',
  },
  card: {
    title: '工程师档案',
    badge: 'Profile',
    facts: [
      { icon: 'briefcase', label: '现任职位', value: '湖南道通科技 · 汽车技术工程师' },
      { icon: 'graduation', label: '教育背景', value: '中南林业科技大学 · 汽车服务工程' },
      { icon: 'location', label: '工作坐标', value: '湖南长沙' },
      { icon: 'clock', label: '当前状态', value: '在职 · 开放机会与技术交流' },
    ],
    tagsTitle: '核心实践方向',
    pills: [
      'EV 新能源高压测量',
      '四轮定位标定',
      'VIN 车型识别',
      'AI Agent 工具开发',
      '知识库治理',
      '技术资料检索与答疑',
    ],
  },
};
