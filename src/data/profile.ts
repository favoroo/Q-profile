import type { Profile } from './types';
import { withBase } from '../lib/asset';

export const profile: Profile = {
  name: '黄谦',
  title: '汽车技术工程师',
  portrait: withBase('/images/avatar-cutout.webp'),
  highlights: ['EV 高压测量', '四轮定位标定', 'AI Agent 工具开发'],
};
