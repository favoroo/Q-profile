import { useEffect } from 'react';

/** 弹窗打开时锁定 body 滚动，关闭时还原（对齐旧站 lb-lock）。 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const lockedY = window.scrollY || 0;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      window.scrollTo(0, lockedY);
    };
  }, [locked]);
}
