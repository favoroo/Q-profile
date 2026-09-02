import type { Contact } from './types';

export const contact: Contact = {
  eyebrow: 'Contact',
  title: '联系我',
  description: '无论是项目合作、职位机会，还是行业交流，都欢迎随时联系。',
  rows: [
    { icon: 'mail', label: '邮箱', value: 'favoro@qq.com', href: 'mailto:favoro@qq.com' },
    { icon: 'phone', label: '电话', value: '137-8913-0001', href: 'tel:13789130001' },
    {
      icon: 'wechat',
      label: '微信号',
      value: '同上',
      copyValue: '13789130001',
      copyNotice: '微信号 (13789130001) 已复制，打开微信即可粘贴添加',
    },
  ],
};
