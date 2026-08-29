import type { ContactRow } from './types';

export const contact = {
  eyebrow: 'Contact',
  title: '联系我',
  description: '无论是项目合作、职位机会，还是行业交流，都欢迎随时联系。',
  rows: [
    { icon: 'mail', label: '邮箱', value: 'favoro@qq.com', href: 'mailto:favoro@qq.com' },
    { icon: 'phone', label: '电话', value: '137-8913-0001', href: 'tel:13789130001' },
    { icon: 'wechat', label: '微信号', value: '同上' },
  ] as ContactRow[],
  cta: {
    title: '有合适的机会，\n或想聊聊技术？',
    text: '看到这里，说明我们可能有交集。发一封邮件，我们从一次简单的沟通开始。',
    buttonLabel: '发邮件给我',
    href: 'mailto:favoro@qq.com',
  },
};
