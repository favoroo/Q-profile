import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ANCHOR_X,
  ANCHOR_Y,
  DAMPING,
  DRAG_LIMIT,
  DRAG_LERP,
  FLING_GAIN,
  REST_X,
  REST_Y,
  ROT_DAMPING,
  ROT_SPRING_K,
  SPRING_K,
  TILT_LERP,
  TILT_MAX,
} from './constants';

interface LanyardState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  vAngle: number;
  tiltX: number;
  tiltY: number;
  targetTiltX: number;
  targetTiltY: number;
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  lastPointerX: number;
  lastPointerY: number;
  lastPointerTime: number;
  time: number;
}

function initialState(): LanyardState {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    vAngle: 0,
    tiltX: 0,
    tiltY: 0,
    targetTiltX: 0,
    targetTiltY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    lastPointerX: 0,
    lastPointerY: 0,
    lastPointerTime: 0,
    time: 0,
  };
}

export interface LanyardPhysics {
  stageRef: React.RefObject<HTMLDivElement | null>;
  badgeRef: React.RefObject<HTMLDivElement | null>;
  strapRef: React.RefObject<SVGPathElement | null>;
  shadowRef: React.RefObject<SVGPathElement | null>;
  glareRef: React.RefObject<HTMLDivElement | null>;
  isFlipped: boolean;
  toggleFlip: () => void;
}

/**
 * 悬吊工牌物理系统（React 化）：
 * - 全部物理状态存于 useRef，rAF 每帧直接写 DOM，零 setState、零 re-render
 * - Pointer Events 统一鼠标/触摸（替代旧站 mouse+touch 两套监听）
 * - reducedMotion 时跳过 idle 摆动/倾斜积分
 */
export function useLanyardPhysics(reducedMotion: boolean): LanyardPhysics {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const strapRef = useRef<SVGPathElement | null>(null);
  const shadowRef = useRef<SVGPathElement | null>(null);
  const glareRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<LanyardState>(initialState());
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;

  const [isFlipped, setIsFlipped] = useState(false);
  const toggleFlip = useCallback(() => setIsFlipped((v) => !v), []);

  /* pointerdown 由 stage 的 React 合成事件触发 */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest?.('[data-flip-btn]')) return;
      const s = stateRef.current;
      s.isDragging = true;
      badgeRef.current?.classList.add('is-dragging');
      s.dragStartX = e.clientX - s.x;
      s.dragStartY = e.clientY - s.y;
      s.lastPointerX = e.clientX;
      s.lastPointerY = e.clientY;
      s.lastPointerTime = performance.now();
      s.vx = 0;
      s.vy = 0;
      s.vAngle = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      const s = stateRef.current;
      if (s.isDragging) {
        let targetX = e.clientX - s.dragStartX;
        let targetY = e.clientY - s.dragStartY;

        const dist = Math.sqrt(targetX * targetX + targetY * targetY);
        if (dist > DRAG_LIMIT) {
          targetX = (targetX / dist) * DRAG_LIMIT;
          targetY = (targetY / dist) * DRAG_LIMIT;
        }

        const now = performance.now();
        const dt = Math.max(1, now - s.lastPointerTime);
        s.vx = ((e.clientX - s.lastPointerX) / dt) * 10;
        s.vy = ((e.clientY - s.lastPointerY) / dt) * 10;
        s.lastPointerX = e.clientX;
        s.lastPointerY = e.clientY;
        s.lastPointerTime = now;

        s.x += (targetX - s.x) * DRAG_LERP;
        s.y += (targetY - s.y) * DRAG_LERP;

        const dragAngle = Math.atan2(s.x, REST_Y + s.y) * (180 / Math.PI) * 0.72;
        s.angle += (dragAngle - s.angle) * 0.28;
      } else if (e.pointerType === 'mouse' && !reducedRef.current) {
        const badge = badgeRef.current;
        if (!badge) return;
        const rect = badge.getBoundingClientRect();
        const normX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
        const normY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);

        if (Math.abs(normX) <= 1.6 && Math.abs(normY) <= 1.6) {
          s.targetTiltY = Math.max(-TILT_MAX, Math.min(TILT_MAX, normX * 12));
          s.targetTiltX = Math.max(-TILT_MAX, Math.min(TILT_MAX, -normY * 12));
        } else {
          s.targetTiltX = 0;
          s.targetTiltY = 0;
        }
      }
    };

    const onPointerUp = () => {
      const s = stateRef.current;
      if (s.isDragging) {
        s.isDragging = false;
        badgeRef.current?.classList.remove('is-dragging');
        s.vAngle = s.vx * FLING_GAIN;
      }
      s.targetTiltX = 0;
      s.targetTiltY = 0;
    };

    stage.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      stage.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  /* rAF 主循环：弹簧积分 + 挂绳贝塞尔重算 + 光泽跟随 */
  useEffect(() => {
    let raf = 0;
    const s = stateRef.current;

    const loop = () => {
      s.time += 0.024;

      if (!reducedRef.current) {
        if (!s.isDragging) {
          const idleX = Math.sin(s.time * 1.3) * 2.0;
          const idleAngle = Math.sin(s.time * 1.3 + 0.5) * 1.3;

          const fx = -(s.x - idleX) * SPRING_K;
          const fy = -s.y * SPRING_K;
          s.vx = (s.vx + fx) * DAMPING;
          s.vy = (s.vy + fy) * DAMPING;
          s.x += s.vx;
          s.y += s.vy;

          const targetAngle = Math.atan2(s.x, REST_Y + s.y) * (180 / Math.PI) * 0.68 + idleAngle;
          const torque = (targetAngle - s.angle) * ROT_SPRING_K;
          s.vAngle = (s.vAngle + torque) * ROT_DAMPING;
          s.angle += s.vAngle;
        }
        s.tiltX += (s.targetTiltX - s.tiltX) * TILT_LERP;
        s.tiltY += (s.targetTiltY - s.tiltY) * TILT_LERP;
      }

      const badge = badgeRef.current;
      if (badge) {
        badge.style.transform =
          `translate3d(${s.x.toFixed(2)}px,${s.y.toFixed(2)}px,0) ` +
          `rotate(${s.angle.toFixed(2)}deg) ` +
          `rotateX(${s.tiltX.toFixed(2)}deg) rotateY(${s.tiltY.toFixed(2)}deg)`;
      }

      const glare = glareRef.current;
      if (glare) {
        const glareShiftX = (s.tiltY * 2.5).toFixed(1);
        const glareShiftY = (-s.tiltX * 2.5).toFixed(1);
        const glareOpacity = 0.15 + (Math.abs(s.tiltX) + Math.abs(s.tiltY)) * 0.015;
        glare.style.transform = `translate3d(${glareShiftX}px,${glareShiftY}px,2px)`;
        glare.style.opacity = String(Math.min(0.5, Math.max(0.08, glareOpacity)));
      }

      /* 挂绳贝塞尔（主带 + 阴影偏移 4px） */
      const ax = ANCHOR_X;
      const ay = ANCHOR_Y;
      const bx = REST_X + s.x;
      const by = REST_Y + s.y;
      const rad = (s.angle * Math.PI) / 180;
      const cp1x = ax;
      const cp1y = ay + (by - ay) * 0.48;
      const cp2x = bx - Math.sin(rad) * 24;
      const cp2y = by - Math.cos(rad) * 24;

      strapRef.current?.setAttribute(
        'd',
        `M ${ax.toFixed(1)},${ay.toFixed(1)} C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`,
      );
      shadowRef.current?.setAttribute(
        'd',
        `M ${(ax + 2).toFixed(1)},${(ay + 4).toFixed(1)} C ${(cp1x + 4).toFixed(1)},${(cp1y + 4).toFixed(1)} ${(cp2x + 4).toFixed(1)},${(cp2y + 4).toFixed(1)} ${(bx + 2).toFixed(1)},${(by + 4).toFixed(1)}`,
      );

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return { stageRef, badgeRef, strapRef, shadowRef, glareRef, isFlipped, toggleFlip };
}
