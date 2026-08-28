import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface RevealProps {
  children: ReactNode;
  /** 交错延迟（秒），对齐旧站的 --d 变量 */
  delay?: number;
  y?: number;
  className?: string;
}

/**
 * 滚动进入渐显（Framer Motion whileInView），替代旧站 IntersectionObserver + .reveal 方案。
 * viewport margin 对齐旧站 rootMargin: '0px 0px -5% 0px'。
 */
export function Reveal({ children, delay = 0, y = 24, className }: RevealProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : y, scale: reduce ? 1 : 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '0px 0px -5% 0px' }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
