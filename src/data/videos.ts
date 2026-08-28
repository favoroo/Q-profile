import type { VideoTab, VideoKey } from './types';

export const VIDEO_TABS: Record<VideoKey, VideoTab[]> = {
  trans: [
    { src: '/videos/trans-agent-01.mp4', label: '中英整改翻译' },
    { src: '/videos/trans-agent-02.mp4', label: '小语种翻译' },
  ],
  docs: [
    { src: '/videos/docs-agent-01.mp4', label: '资料检索' },
    { src: '/videos/docs-agent-02.mp4', label: '资料数量统计' },
  ],
};
