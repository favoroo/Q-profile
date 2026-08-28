import { useEffect, useState } from 'react';
import { site } from '../../data';
import { Icon } from '../ui/icons';
import { useScrollSpy } from '../../lib/useScrollSpy';

/** sticky 毛玻璃顶栏：滚动 >8px 加边框，滚动监听高亮当前区块，移动端汉堡菜单。 */
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const activeId = useScrollSpy();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const linkCls = (href: string) =>
    `relative py-1 text-[13px] text-ink-2 no-underline transition-colors duration-200 hover:text-ink after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[1.5px] after:rounded-full after:bg-ink after:transition-transform after:duration-300 after:ease-[var(--ease-out-apple)] hover:after:scale-x-100 after:scale-x-0 after:origin-center ${
      activeId === href.slice(1)
        ? 'font-semibold text-ink after:scale-x-100'
        : ''
    }`;

  return (
    <header
      className={`sticky top-0 z-100 border-b bg-white/72 backdrop-blur-[20px] backdrop-saturate-180 transition-all duration-300 ${
        scrolled ? 'bg-white/82' : ''
      }`}
      style={{ borderColor: scrolled ? 'rgba(0,0,0,0.08)' : 'transparent' }}
    >
      <div className="mx-auto flex h-[52px] w-[min(1080px,calc(100%-48px))] items-center justify-between">
        <a className="flex items-baseline gap-2 no-underline" href="#home" aria-label="回到顶部">
          <strong className="text-[17px] font-bold tracking-[-0.01em] text-ink">{site.brand.name}</strong>
          <small className="text-[12px] tracking-[0.02em] text-ink-3">{site.brand.subtitle}</small>
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
          className="grid h-[38px] w-[38px] cursor-pointer place-items-center rounded-[10px] border-none bg-transparent text-ink hover:bg-black/5 md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} strokeWidth={2} />
        </button>
      </div>
      {menuOpen && (
        <div id="mobileMenu" className="border-t border-black/[0.08] md:hidden">
          <div className="mx-auto w-[calc(100%-36px)]">
            {[site.mobileHomeLink, ...site.navLinks].map((l, i) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className={`block border-b border-black/[0.08] py-[15px] text-[15px] no-underline last:border-b-0 ${
                  activeId === l.href.slice(1) ? 'font-semibold text-ink' : 'text-ink-2'
                } ${i === 0 ? '' : ''}`}
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
