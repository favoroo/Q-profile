import { useEffect, useState } from 'react';

/**
 * 滚动监听当前 section id（对齐旧站 navObs：rootMargin '-45% 0px -50% 0px'）。
 */
export function useScrollSpy(): string {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('main section[id]'));
    if (!('IntersectionObserver' in window) || sections.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) setActiveId(en.target.id);
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  return activeId;
}
