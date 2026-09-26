import type { Profile } from './types';
import { withBase } from '../lib/asset';

export const profile: Profile = {
  name: '黄谦',
  title: '汽车技术工程师',
  portrait: withBase('/images/avatar-cutout.webp'),
};
