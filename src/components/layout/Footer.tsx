import { site } from '../../data';

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-black py-[22px]">
      <div className="mx-auto flex w-[min(1080px,calc(100%-48px))] flex-wrap items-center justify-between gap-4 text-[13px] text-[rgba(245,245,247,0.45)]">
        <span>{site.footer.left}</span>
        <span>{site.footer.right}</span>
      </div>
    </footer>
  );
}
