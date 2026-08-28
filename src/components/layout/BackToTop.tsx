import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/** 回到顶部悬浮按钮（>640px 显示，AnimatePresence 进出场）。 */
export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 640);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          aria-label="回到顶部"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed right-[26px] bottom-[26px] z-90 grid h-11 w-11 cursor-pointer place-items-center rounded-full border-none bg-[rgba(29,29,31,0.85)] text-white backdrop-blur-xl transition-colors duration-200 hover:bg-accent"
          style={{ boxShadow: '0 12px 32px -10px rgba(0,0,0,0.35)' }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 19V5" />
            <path d="m5 12 7-7 7 7" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
