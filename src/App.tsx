import { LightboxProvider } from './components/modal/LightboxProvider';
import { LightboxModal } from './components/modal/LightboxModal';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { BackToTop } from './components/layout/BackToTop';
import { Hero } from './components/sections/Hero';
import { About } from './components/sections/About';
import { Journey } from './components/sections/Journey';
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
        <Journey />
        <Skills />
        <Projects />
        <Contact />
      </main>
      <Footer />
      <BackToTop />
      <LightboxModal />
    </LightboxProvider>
  );
}
