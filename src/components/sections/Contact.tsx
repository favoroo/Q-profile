import { contact } from '../../data';
import { Icon } from '../ui/icons';
import { Reveal } from '../motion/Reveal';

export function Contact() {
  return (
    <section className="bg-black pt-[60px] pb-[72px] text-[#F5F5F7]" id="contact">
      <div className="mx-auto w-[min(1080px,calc(100%-48px))]">
        <Reveal className="mb-9 text-center">
          <p className="mb-2 font-mono text-[12.5px] font-semibold tracking-[0.22em] text-accent uppercase">
            {contact.eyebrow}
          </p>
          <h2 className="m-0 text-[clamp(28px,4vw,44px)] leading-[1.1] font-bold tracking-[-0.02em] text-white">
            {contact.title}
          </h2>
          <p className="mx-auto mt-2.5 max-w-[560px] text-[15px] leading-[1.65] text-[rgba(245,245,247,0.62)]">
            {contact.description}
          </p>
        </Reveal>

        <Reveal>
          <div className="mx-auto max-w-[480px]">
            <div className="rounded-[28px] border border-white/[0.1] bg-white/[0.07] p-8 backdrop-blur-2xl max-md:p-6">
              <div className="flex flex-col gap-[20px]">
                {contact.rows.map((row) => (
                  <div key={row.label} className="flex items-center gap-4">
                    <span className="grid h-[44px] w-[44px] flex-none place-items-center rounded-xl bg-white/[0.1] text-white">
                      <Icon name={row.icon} />
                    </span>
                    <div>
                      <div className="text-[12px] tracking-[0.06em] text-[rgba(245,245,247,0.55)]">
                        {row.label}
                      </div>
                      <div className="mt-0.5 text-[15.5px] font-semibold text-white">
                        {row.href ? (
                          <a
                            href={row.href}
                            className="text-white no-underline transition-colors hover:text-accent hover:underline"
                          >
                            {row.value}
                          </a>
                        ) : (
                          row.value
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
