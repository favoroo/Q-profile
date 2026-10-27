import type { Skill } from './types';

export const skills: Skill[] = [
  {
    index: '01',
    title: '汽车维修资料解析与运用',
    description:
      '熟悉维修资料体系，能快速读懂、拆解维修手册与诊断资料并复用，为诊断与开发服务。',
    tags: ['维修手册', '诊断资料', '资料拆解'],
  },
  {
    index: '02',
    title: '基于维修资料的数据开发',
    description:
      '把海量维修资料整理成结构化数据，支撑 VIN 识别、诊断内容与知识库等产品落地。',
    tags: ['数据开发', 'VIN 识别', '知识库建设'],
  },
  {
    index: '03',
    title: 'AI 工具与 Agent 提效',
    description:
      '熟练使用 AI 工具，用 Agent 把翻译整改、资料治理等重复劳动自动化，提升团队效率。',
    tags: ['AI 工具', 'Agent 开发', '效率提升'],
  },
  {
    index: '04',
    title: '新能源高压测量 / EV 领域',
    description:
      '参与 EV Kit 2 高压测量项目，熟悉全流程与安全规范，对新能源高压系统与行业有较深了解。',
    tags: ['EV 高压测量', '新能源', '高压安全'],
  },
];
