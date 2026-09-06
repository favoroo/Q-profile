# AGENTS.md

面向 AI Agent / 协作开发者的项目导读。读完本文件即可快速上手，无需通读源码。

## 项目简介

**黄谦 · 个人主页**（huang-web）—— 汽车技术工程师的个人作品集单页站点。

核心亮点：悬吊工牌（纯 CSS 3D + 自研弹簧物理模拟）、项目经历展示（视频 / 在线体验 iframe / 开发手册弹窗）、能力与联系方式。

- 线上地址：<https://favoroo.github.io/Q-profile/>
- 形态：**无路由、无状态库、无后端**的单页站点，锚点导航
- 版本 2.0，由 `archive/legacy.html`（旧版纯 HTML）重构而来

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | React 19 + TypeScript（strict） |
| 构建 | Vite 8 |
| 样式 | Tailwind CSS 4（**CSS-first `@theme`，无 tailwind.config**） |
| 动效 | framer-motion 13 |

## 常用命令

```bash
npm ci        # 安装依赖（CI 用 ci，本地可用 npm install）
npm run dev   # 启动开发服务器
npm run build # tsc -b 类型检查 + vite build，产物输出 dist/
npm run preview # 本地预览构建产物
```

**注意：`build` 包含 `tsc -b`，类型错误会导致构建失败。提交前务必跑一次 `npm run build`。**

## 部署

推送 `main` 分支后由 [.github/workflows/deploy.yml](.github/workflows/deploy.yml) 自动构建并发布到 GitHub Pages（Node 20 + `npm ci`）。

- **不要**手动提交 `dist/`（已在 .gitignore）
- 部署在 `/Q-profile/` 二级路径下，`vite.config.ts` 的 `base` 已处理；换域名/路径时设 `BASE_PATH` 环境变量

## 架构与核心机制

### 1. 数据驱动 —— 改内容只动 `src/data/`

全站文案与项目数据集中在 `src/data/`，组件只负责渲染：

| 文件 | 内容 |
| --- | --- |
| `types.ts` | 全站数据类型定义（单一事实来源） |
| `site.ts` / `profile.ts` | 品牌信息、导航、Hero 文案 |
| `about.ts` / `skills.ts` | 自我介绍、时间线、技能 |
| `projects.ts` | 项目列表（含画廊、弹窗动作） |
| `videos.ts` / `docs.ts` | 弹窗用的视频/手册资源映射 |
| `contact.ts` | 联系方式 |
| `index.ts` | 统一出口，组件从这里 import |

**规范：改文案/加项目 → 只改 `src/data/`；改样式/交互 → 才动 `src/components/`。**

### 2. 组件分层 `src/components/`

- `sections/` —— Hero / About / Skills / Projects / Contact 五大区块
- `lanyard/` —— 悬吊工牌（CSS 3D + `useLanyardPhysics` 自研物理模拟，独立模块）
- `projects/` —— 项目卡片
- `modal/` —— Lightbox 弹窗体系（视频 / iframe / 文档 / 画廊，`React.lazy` 按需加载）
- `layout/` —— Header / BackToTop
- `ui/` —— Icon / Button / SectionHead 基础件
- `motion/` —— Reveal 等动效封装

### 3. 资源路径适配（重要）

GitHub Pages 部署在二级路径，**组件内引用静态资源必须经 `src/lib/asset.ts` 的 `withBase()` 包裹**，否则线上 404：

```tsx
import { withBase } from '../lib/asset';
<img src={withBase('/images/avatar.jpg')} />
```

外链（http/https/mailto 等）会被自动跳过，可放心统一包裹。

### 4. 图片性能约定

项目配图用 WebP 双档 srcset：主图 `project-N.webp`（约 1376w）+ 小图 `project-N-800w.webp`，用 `projectImageSrcSet()` 派生。**新增图片请遵循此命名约定。**

### 5. 静态资源 `public/`

| 目录 | 内容 |
| --- | --- |
| `images/` | 头像、项目配图（WebP） |
| `videos/` | 演示视频（mp4） |
| `docs/` | 项目开发手册（Markdown + 图片） |
| `evkit/` | EV Kit 在线体验的静态演示页 |

### 6. 样式规范

- Tailwind 4 CSS-first：品牌 token（颜色/圆角/阴影/缓动/字体）全部定义在 `src/styles/global.css` 的 `@theme` 中，**不要创建 tailwind.config**
- 主色 `--color-accent: #0071e3`，Apple 风格视觉（大圆角、克制阴影、`--ease-out-apple` 缓动）
- 特殊场景才用 CSS Modules（如 `lanyard/LanyardBadge.module.css`、`modal/modal.css`）

## 开发规范

1. **无路由原则**：保持单页锚点导航，不要引入 router / 状态库 / 后端依赖
2. **数据与视图分离**：新增可配置内容先在 `types.ts` 定型，再补 `data/` 数据，组件只消费
3. **可访问性**：所有交互元素保留 `focus-visible` 焦点态；动效遵守 `prefers-reduced-motion`（全局已有 MotionConfig `reducedMotion="user"` 与 CSS 兜底）；弹窗需键盘可达（Esc 关闭等）
4. **性能**：大组件（如弹窗）用 `React.lazy` 按需加载；图片优先 WebP + srcset；不在首屏渲染的资源不打包进主 chunk
5. **类型安全**：禁止 `any`；公共数据形状必须过 `types.ts`，享受编译期检查
6. **提交规范**：Conventional Commits + 中文描述（`feat: xxx` / `fix: xxx` / `perf: xxx` / `refactor: xxx` / `chore: xxx`），参照 git log 现有风格
7. **本地素材目录勿动**：`组件/`、`项目展示素材/` 是未跟踪的本地原始素材，仅作参考，不要提交也不要修改；`archive/legacy.html` 为旧版存档

## 验证清单（完成任务前自查）

- [ ] `npm run build` 通过（含 tsc 类型检查）
- [ ] `npm run dev` 本地视觉/交互正常
- [ ] 新增静态资源路径均经 `withBase()` 包裹
- [ ] 改动涉及文案时只动了 `src/data/`
- [ ] 推送 main 即触发部署，确认线上路径资源可达
