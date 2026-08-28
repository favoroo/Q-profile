import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ProjectAction } from '../../data/types';

export type LightboxState =
  | { mode: 'video'; payload: { videoKey: string } }
  | { mode: 'frame'; payload: { src: string; title: string } }
  | { mode: 'doc'; payload: { docKey: string } }
  | null;

interface LightboxContextValue {
  state: LightboxState;
  open: (action: ProjectAction) => void;
  close: () => void;
}

const LightboxContext = createContext<LightboxContextValue | null>(null);

/** 弹窗状态提供者：项目卡片 action（iframe/video/doc）统一从这里打开。 */
export function LightboxProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LightboxState>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);

  const open = useCallback((action: ProjectAction) => {
    lastTrigger.current = document.activeElement as HTMLElement | null;
    if (action.kind === 'iframe') {
      setState({ mode: 'frame', payload: { src: action.frameSrc, title: action.ariaLabel } });
    } else if (action.kind === 'video') {
      setState({ mode: 'video', payload: { videoKey: action.videoKey } });
    } else {
      setState({ mode: 'doc', payload: { docKey: action.docKey } });
    }
  }, []);

  const close = useCallback(() => {
    setState(null);
    // 关闭后焦点还原到触发元素（对齐旧站可访问性行为）
    window.setTimeout(() => lastTrigger.current?.focus?.(), 0);
  }, []);

  const value = useMemo(() => ({ state, open, close }), [state, open, close]);
  return <LightboxContext.Provider value={value}>{children}</LightboxContext.Provider>;
}

export function useLightbox(): LightboxContextValue {
  const ctx = useContext(LightboxContext);
  if (!ctx) throw new Error('useLightbox must be used within LightboxProvider');
  return ctx;
}
