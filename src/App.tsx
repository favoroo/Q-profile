import { lazy, Suspense } from 'react';
import { LightboxProvider } from './components/modal/LightboxProvider';
import { Header } from './components/layout/Header';
import { BackToTop } from './components/layout/BackToTop';
import { Hero } from './components/sections/Hero';
import { About } from './components/sections/About';
import { Skills } from './components/sections/Skills';
import { Projects } from './components/sections/Projects';
import { Contact } from './components/sections/Contact';

/* 弹窗（含 markdown 渲染器 / 视频 / iframe）仅在点击项目卡后使用，按需加载 */
const LightboxModal = lazy(() =>
  import('./components/modal/LightboxModal').then((m) => ({ default: m.LightboxModal })),
);

export default function App() {
  return (
    <LightboxProvider>
      <Header />
      <main>
        <Hero />
        <About />
        <Skills />
        <Projects />
        <Contact />
      </main>
      <BackToTop />
      <Suspense fallback={null}>
        <LightboxModal />
      </Suspense>
    </LightboxProvider>
  );
}
