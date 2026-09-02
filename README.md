# 黄谦 · 个人主页

个人作品集单页站点：悬吊工牌（纯 CSS 3D + 自研弹簧物理）、项目经历展示（视频 / 在线体验 / 开发手册弹窗）、能力与联系方式。

线上地址：<https://favoroo.github.io/Q-profile/>

## 技术栈

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4（CSS-first `@theme`，无 tailwind.config）
- framer-motion（动效）

无路由、无状态库、无后端：单页锚点导航，所有页面文案集中在 `src/data/`，组件只负责渲染。

## 本地开发

```bash
npm ci        # 安装依赖
npm run dev   # 启动开发服务器
```

## 构建与部署

```bash
npm run build     # 产物输出到 dist/
npm run preview   # 本地预览构建产物
```

部署到 GitHub Pages：推送到 `main` 分支后由 [.github/workflows/deploy.yml](.github/workflows/deploy.yml) 自动构建并发布。

路径适配：GitHub Pages 部署在 `/Q-profile/` 二级路径下，`vite.config.ts` 通过 `base` 处理，组件内的资源路径统一经 `src/lib/asset.ts` 的 `withBase()` 适配；部署到其他域名/路径时设置 `BASE_PATH` 环境变量即可。

## 目录结构

```
src/
├── components/
│   ├── lanyard/    # 悬吊工牌（CSS 3D + useLanyardPhysics 自研物理模拟）
│   ├── sections/   # Hero / About / Skills / Projects / Contact 区块
│   ├── projects/   # 项目卡片
│   ├── modal/      # Lightbox 弹窗（视频 / iframe / 文档，React.lazy 按需加载）
│   ├── layout/     # Header / BackToTop
│   └── ui/         # Icon / Button / SectionHead 等基础件
├── data/           # 全站文案与项目数据（改内容只需要动这里）
└── lib/            # 资源路径 / 滚动监听等工具
```
