import type { Profile } from './types';
import { withBase } from '../lib/asset';

export const profile: Profile = {
  name: '黄谦',
  title: '汽车技术工程师',
  lead: '现就职于湖南道通科技，任汽车技术工程师。从四轮定位到 VIN 码解析、从 EV 高压测量流程到 AI Agent 工具开发，持续用**数据与工程化方法**把问题落地。',
  avatar: withBase('/images/avatar-300.webp'),
  badgeBack: {
    emojis: ['😊', '😎', '🤩', '🥰', '🤓', '😍', '😇', '🤣'],
  },
};
