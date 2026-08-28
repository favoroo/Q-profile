import type { Skill } from './types';

export const skills: Skill[] = [
  {
    index: '01',
    title: '汽车维修资料解析与运用',
    description:
      '熟悉汽车维修资料体系，从维修手册到诊断资料都能快速读懂、拆解并复用，让资料真正为诊断与开发服务。',
    tags: ['维修手册', '诊断资料', '资料拆解'],
  },
  {
    index: '02',
    title: '基于维修资料的数据开发',
    description:
      '善于把散落的海量维修资料整理成结构化数据与内容，支撑 VIN 车型识别、诊断内容、知识库等产品稳定落地。',
    tags: ['数据开发', 'VIN 识别', '知识库建设'],
  },
  {
    index: '03',
    title: 'AI 工具与 Agent 提效',
    description:
      '熟练使用 AI 工具，用 Agent 把翻译规范性整改、资料治理等重复劳动自动化，为团队带来实实在在的效率提升。',
    tags: ['AI 工具', 'Agent 开发', '效率提升'],
  },
  {
    index: '04',
    title: '新能源高压测量 / EV 领域',
    description:
      '参与 EV Kit 2 新能源高压测量项目，熟悉高压测量全流程与安全规范，对新能源汽车高压系统及新能源行业知识有较深入的了解。',
    tags: ['EV 高压测量', '新能源', '高压安全'],
  },
];
