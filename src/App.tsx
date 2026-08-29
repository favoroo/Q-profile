import { LightboxProvider } from './components/modal/LightboxProvider';
import { LightboxModal } from './components/modal/LightboxModal';
import { Header } from './components/layout/Header';
import { BackToTop } from './components/layout/BackToTop';
import { Hero } from './components/sections/Hero';
import { About } from './components/sections/About';
import { Skills } from './components/sections/Skills';
import { Projects } from './components/sections/Projects';
import { Contact } from './components/sections/Contact';

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
      <LightboxModal />
    </LightboxProvider>
  );
}
