import { useEffect } from 'react';

/** 弹窗打开时锁定 body 滚动，关闭时还原（对齐旧站 lb-lock）。
 *  lb-lock 类是统一开关：ModelViewer 用它停掉鼠标视差重渲染（毛玻璃背后静止），
 *  CSS 用它暂停扫光 / 表情浮动等 infinite 动画，避免全屏 backdrop-blur 每帧重算。 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const lockedY = window.scrollY || 0;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('lb-lock');
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('lb-lock');
      window.scrollTo(0, lockedY);
    };
  }, [locked]);
}
