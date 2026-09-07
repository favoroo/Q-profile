import { useEffect, useState } from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { site } from '../../data';
import { Icon } from '../ui/icons';
import { useScrollSpy } from '../../lib/useScrollSpy';

/* 悬浮面板：缩放 + 下落入场，条目错落滑入（全局 MotionConfig 对 reduced-motion 用户自动降级为纯淡入淡出） */
const panelVariants: Variants = {
  hidden: { opacity: 0, y: -6, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.26,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.035,
      delayChildren: 0.02,
    },
  },
  exit: { opacity: 0, y: -6, scale: 0.96, transition: { duration: 0.16, ease: 'easeIn' } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: 10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

/** sticky 毛玻璃顶栏：滚动 >8px 加边框，滚动监听高亮当前区块，移动端悬浮下拉菜单。
 *  悬浮于首屏蓝色色块之上时切换为透明白字（on-accent），滚过色块恢复玻璃态。 */
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [onAccent, setOnAccent] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const activeId = useScrollSpy();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      /* 色块底边在页面坐标 offsetHeight - 52（Hero 以 -mt-52 顶到视口顶部），
         顶栏底沿接近色块底边前切换回玻璃态，避免压到圆角过渡区 */
      const hero = document.getElementById('home');
      setOnAccent(!!hero && window.scrollY < hero.offsetHeight - 110);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  /* 移动菜单打开时支持 Escape 关闭 */
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const linkCls = (href: string) =>
    `relative py-1 text-[13px] no-underline transition-colors duration-200 ${
      onAccent ? 'text-white/70 hover:text-white after:bg-white/60' : 'text-ink-2 hover:text-ink after:bg-ink'
    } after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[1.5px] after:rounded-full after:transition-transform after:duration-300 after:ease-[var(--ease-out-apple)] hover:after:scale-x-100 after:scale-x-0 after:origin-center ${
      activeId === href.slice(1)
        ? `font-semibold ${onAccent ? 'text-white' : 'text-ink'} after:scale-x-100`
        : ''
    }`;

  return (
    <>
      {/* 点击空白处关闭的轻遮罩，压在页面内容上、位于顶栏之下 */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobileMenuBackdrop"
            className="fixed inset-0 z-90 bg-ink/15 backdrop-blur-[2px] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <header
        data-on-accent={onAccent || undefined}
        className={`sticky top-0 z-100 border-b transition-all duration-300 ${
          onAccent
            ? scrolled
              ? /* 色块内滚动：半透明蓝玻璃保持白字可读 */
                'bg-accent/60 backdrop-blur-[20px] backdrop-saturate-180'
              : 'bg-transparent'
            : `bg-white/72 backdrop-blur-[20px] backdrop-saturate-180 ${scrolled ? 'bg-white/82' : ''}`
        }`}
        style={{ borderColor: !onAccent && scrolled ? 'rgba(0,0,0,0.08)' : 'transparent' }}
      >
        <div className="mx-auto flex h-[52px] w-[min(1080px,calc(100%-48px))] items-center justify-between">
          <a className="flex items-baseline gap-2 no-underline" href="#home" aria-label="回到顶部">
            <strong
              className={`text-[17px] font-bold tracking-[-0.01em] transition-colors duration-300 ${
                onAccent ? 'text-white' : 'text-ink'
              }`}
            >
              {site.brand.name}
              <span className={onAccent ? 'text-white/60' : 'text-accent'}>.</span>
            </strong>
            <small
              className={`text-[12px] tracking-[0.02em] transition-colors duration-300 ${
                onAccent ? 'text-white/60' : 'text-ink-3'
              }`}
            >
              {site.brand.subtitle}
            </small>
          </a>
          <nav className="hidden gap-[34px] md:flex" aria-label="主导航">
            {site.navLinks.map((l) => (
              <a key={l.href} className={linkCls(l.href)} href={l.href}>
                {l.label}
              </a>
            ))}
          </nav>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobileMenu"
            aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
            className={`grid h-[38px] w-[38px] cursor-pointer place-items-center rounded-[10px] border-none transition-colors duration-200 md:hidden ${
              onAccent ? 'text-white' : 'text-ink'
            } ${
              menuOpen
                ? onAccent
                  ? 'bg-white/20'
                  : 'bg-black/[0.06]'
                : onAccent
                  ? 'bg-transparent hover:bg-white/10'
                  : 'bg-transparent hover:bg-black/5'
            }`}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} strokeWidth={2} />
          </button>
        </div>

        {/* 悬浮下拉面板：绝对定位、不占据文档流，展开时不再把页面内容往下挤 */}
        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              key="mobileMenu"
              id="mobileMenu"
              aria-label="移动端导航"
              className="absolute right-6 top-[calc(100%+8px)] w-[min(216px,calc(100%-48px))] overflow-hidden rounded-2xl border border-black/[0.06] bg-white/85 p-1.5 shadow-[0_18px_48px_-12px_rgba(0,0,0,0.22)] backdrop-blur-[24px] backdrop-saturate-180 md:hidden"
              style={{ transformOrigin: 'top right' }}
              variants={panelVariants}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              {[site.mobileHomeLink, ...site.navLinks].map((l) => {
                const active = activeId === l.href.slice(1);
                return (
                  <motion.a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    variants={itemVariants}
                    aria-current={active ? 'true' : undefined}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-[15px] no-underline transition-colors duration-200 ${
                      active
                        ? 'bg-accent/[0.09] font-semibold text-accent'
                        : 'text-ink-2 hover:bg-black/[0.04] hover:text-ink'
                    }`}
                  >
                    {l.label}
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />}
                  </motion.a>
                );
              })}
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
