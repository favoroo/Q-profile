import type { Project } from './types';
import { withBase } from '../lib/asset';

export const projects: Project[] = [
  /* ── 重点项目：全宽横幅大卡片 ── */
  {
    id: 'evkit2',
    size: 'featured',
    tag: '重点项目',
    meta: 'EV Kit 2 · 高压测量 · 全流程',
    title: 'EV Kit 2：新能源高压测量项目',
    description:
      '负责整个高压测量数据项目的流程开发，覆盖从 UE 交互设计到测量流程落地的完整链路，打通界面与测试环节。',
    points: [
      '负责 UE 设计，输出清晰可用的测量交互流程',
      '落地高压测量流程，保障测量数据准确、流程规范',
    ],
    result: '成果：高压测量全流程从设计到落地完整交付',
    image: withBase('/images/project-1.jpg'),
    imageAlt: 'EV Kit 2 高压测量项目配图',
    actions: [
      {
        kind: 'iframe',
        label: '在线体验',
        ariaLabel: '打开 EV Kit 2 高压测量在线体验',
        frameSrc: withBase('/evkit/05WZT/TSL-GYKT-MD3-1_CN.html'),
      },
    ],
  },

  /* ── AI 工具项目 ── */
  {
    id: 'trans-agent',
    size: 'standard',
    tag: 'AI 工具',
    meta: 'Agent · 主导开发 · 翻译提效',
    title: '翻译 Agent 工具',
    description:
      '主导开发公司的翻译 Agent 工具，为翻译同事提供翻译与规范性整改能力，显著提升协作效率。',
    points: [
      '设计并主导整个翻译 Agent 工具的开发',
      '覆盖翻译与规范化整改，直接服务翻译同事日常提效',
    ],
    result: '成果：翻译环节效率与规范性显著提升',
    image: withBase('/images/project-4.jpg'),
    imageAlt: '翻译 Agent 工具配图',
    actions: [
      { kind: 'video', ariaLabel: '查看翻译 Agent 演示视频', videoKey: 'trans' },
      { kind: 'doc', ariaLabel: '查看翻译 Agent 开发手册', docKey: 'trans-doc' },
    ],
  },
  {
    id: 'docs-agent',
    size: 'standard',
    tag: 'AI 工具',
    meta: 'Agent · 知识库 · 检索',
    title: '资料治理 Agent（知识库）',
    description:
      '参与资料治理 Agent 的开发：从大量资料中提取信息、梳理为可检索的知识库，让 Agent 工具可以快速检索使用。',
    points: [
      '从海量资料中提取关键信息并结构化',
      '梳理成可检索知识库，供 Agent 工具检索调用',
    ],
    result: '成果：资料治理为知识库，检索使用更高效',
    image: withBase('/images/project-5.jpg'),
    imageAlt: '资料治理 Agent 项目配图',
    actions: [
      { kind: 'video', ariaLabel: '查看资料治理 Agent 演示视频', videoKey: 'docs' },
      { kind: 'doc', ariaLabel: '查看资料问答 Agent 开发手册', docKey: 'docs-doc' },
    ],
  },

  /* ── 专项研发与技术支撑（紧凑横条卡） ── */
  {
    id: 'alignment',
    size: 'compact',
    tag: '四轮定位',
    meta: '四轮定位 · 参数与流程标定',
    title: '四轮定位项目',
    description:
      '负责四轮定位功能中定位参数与作业流程的开发，精准定义底盘定位参数并完成标定，保障定位作业规范、数据精准且可工程化复用。',
    result: '成果：四轮定位参数与流程稳定交付',
    image: withBase('/images/project-2.jpg'),
    imageAlt: '四轮定位项目配图',
    tags: [
      { label: '四轮定位' },
      { label: '参数标定' },
      { label: '作业流程开发' },
      { label: '数据交付', highlight: true },
    ],
  },
  {
    id: 'vin',
    size: 'compact',
    tag: 'VIN 识别',
    meta: 'VIN · 车型识别解析 · 覆盖数十品牌',
    title: 'VIN 车型识别解析',
    description:
      '负责公司覆盖几十个汽车品牌的 VIN 车型识别解析规则与数据开发，把车辆底层 VIN 码准确、结构化地识别解析为具体车型与配置信息。',
    result: '成果：几十个品牌的 VIN 车型识别稳定可用',
    image: withBase('/images/project-3.jpg'),
    imageAlt: 'VIN 车型识别项目配图',
    tags: [
      { label: 'VIN 识别' },
      { label: '多品牌覆盖' },
      { label: '规则引擎开发' },
      { label: '结构化解析', highlight: true },
    ],
  },
  {
    id: 'support',
    size: 'compact',
    tag: '专项支撑',
    meta: 'TPMS · IM · BT 608 · 跨项目技术答疑与深度资料检索',
    title: 'TPMS / IM / BT 608 项目技术答疑与专业支撑',
    description:
      '负责部门对于 TPMS（胎压监测）、IM（防盗匹配）、BT 608（电池检测）等多个项目与产品线的日常技术答疑与底层专业支撑。在海量原厂维修手册、通信协议及技术文档中具备极强的信息查找、精准检索与资料沉淀能力，能够快速定位疑难问题根因并输出标准化解答与技术支持方案。',
    result: '成果：具备极强的技术资料查找与沉淀能力，跨项目高效攻关与技术赋能',
    image: withBase('/images/project-6.jpg'),
    imageAlt: 'TPMS / IM / BT 608 项目支撑配图',
    tags: [
      { label: 'TPMS 胎压监测' },
      { label: 'IM 防盗匹配' },
      { label: 'BT 608 电池检测' },
      { label: '深度资料检索', highlight: true },
      { label: '技术答疑支撑', highlight: true },
    ],
  },
];

export const COMPACT_SUBDIVIDER = '专项研发与技术支撑';
