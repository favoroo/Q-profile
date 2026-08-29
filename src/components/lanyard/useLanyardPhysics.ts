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

/** 双击判定：两次点按间隔与位移上限 */
const TAP_INTERVAL = 300;
const TAP_MOVE_MAX = 10;
/** 拖动判定阈值（px），超过则视为拖拽而非点按 */
const DRAG_MOVE_MIN = 8;
/** justDragged 冷却时间（ms） */
const DRAG_COOLDOWN = 250;

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
  /* 本次拖动是否产生位移（区分点按与拖拽） */
  dragMoved: boolean;
  dragStartClientX: number;
  dragStartClientY: number;
  /* 上次拖拽结束时间（justDragged 冷却用） */
  lastDragEnd: number;
  /* 移动端双击检测 */
  lastTapTime: number;
  lastTapX: number;
  lastTapY: number;
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
    dragMoved: false,
    dragStartClientX: 0,
    dragStartClientY: 0,
    lastDragEnd: 0,
    lastTapTime: 0,
    lastTapX: 0,
    lastTapY: 0,
    time: 0,
  };
}

export interface LanyardPhysics {
  stageRef: React.RefObject<HTMLDivElement | null>;
  badgeRef: React.RefObject<HTMLDivElement | null>;
  strapRef: React.RefObject<SVGPathElement | null>;
  isFlipped: boolean;
  toggleFlip: () => void;
  /** 最近一次拖拽刚结束（250ms 内），用于抑制双击误触 */
  justDragged: () => boolean;
}

/**
 * 悬吊工牌物理系统（React 化）：
 * - 全部物理状态存于 useRef，rAF 每帧直接写 DOM，零 setState、零 re-render
 * - Pointer Events 统一鼠标/触摸（替代旧站 mouse+touch 两套监听）
 * - 双击翻转：桌面走 React onDoubleClick，移动端由 pointerup 兜底检测
 * - reducedMotion 时跳过 idle 摆动/倾斜积分
 */
export function useLanyardPhysics(reducedMotion: boolean): LanyardPhysics {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const strapRef = useRef<SVGPathElement | null>(null);
  const stateRef = useRef<LanyardState>(initialState());
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;

  const [isFlipped, setIsFlipped] = useState(false);
  const toggleFlip = useCallback(() => {
    const s = stateRef.current;
    /* 翻面瞬间归零倾斜，避免斜着翻面 */
    s.targetTiltX = 0;
    s.targetTiltY = 0;
    setIsFlipped((v) => !v);
  }, []);

  const justDragged = useCallback(() => {
    return performance.now() - stateRef.current.lastDragEnd < DRAG_COOLDOWN;
  }, []);

  /* pointerdown 由 stage 的 React 合成事件触发 */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const onPointerDown = (e: PointerEvent) => {
      const s = stateRef.current;
      s.isDragging = true;
      s.dragMoved = false;
      s.dragStartClientX = e.clientX;
      s.dragStartClientY = e.clientY;
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

        const movedDist = Math.hypot(
          e.clientX - s.dragStartClientX,
          e.clientY - s.dragStartClientY,
        );
        if (movedDist > DRAG_MOVE_MIN) s.dragMoved = true;

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

    const onPointerUp = (e: PointerEvent) => {
      const s = stateRef.current;
      if (s.isDragging) {
        s.isDragging = false;
        badgeRef.current?.classList.remove('is-dragging');
        s.vAngle = s.vx * FLING_GAIN;
        if (s.dragMoved) {
          s.lastDragEnd = performance.now();
        } else if (e.pointerType !== 'mouse') {
          /* 移动端双击兜底：iOS Safari 对 dblclick 支持不稳 */
          const now = performance.now();
          const dx = e.clientX - s.lastTapX;
          const dy = e.clientY - s.lastTapY;
          if (now - s.lastTapTime < TAP_INTERVAL && Math.hypot(dx, dy) < TAP_MOVE_MAX) {
            s.lastTapTime = 0;
            toggleFlip();
          } else {
            s.lastTapTime = now;
            s.lastTapX = e.clientX;
            s.lastTapY = e.clientY;
          }
        }
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
  }, [toggleFlip]);

  /* rAF 主循环：弹簧积分 + 挂绳贝塞尔重算 */
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

      /* 挂绳贝塞尔 */
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

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return { stageRef, badgeRef, strapRef, isFlipped, toggleFlip, justDragged };
}
