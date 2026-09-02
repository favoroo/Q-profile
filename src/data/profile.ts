import type { Profile } from './types';
import { withBase } from '../lib/asset';

export const profile: Profile = {
  name: '黄谦',
  title: '汽车技术工程师',
  lead: '现就职于湖南道通科技，任汽车技术工程师。从四轮定位到 VIN 码解析、从 EV 高压测量流程到 AI Agent 工具开发，持续用数据与工程化方法把问题落地。',
  avatar: withBase('/images/avatar-300.webp'),
  badgeBack: {
    skills: [
      '四轮定位工艺与参数标准化',
      '主流车系 VIN 码解析开发',
      '新能源 EV 高压测量安全流程',
      'AI Agent 诊断知识库工具开发',
    ],
    edu: '中南林科大 · 本科',
    location: '中国 · 长沙',
  },
};
