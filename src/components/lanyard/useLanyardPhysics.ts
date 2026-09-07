import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ANCHOR_X,
  ANCHOR_Y,
  DAMPING,
  DRAG_ANGLE_GAIN,
  DRAG_ANGLE_LERP,
  DRAG_LIMIT,
  DRAG_LERP,
  FLING_GAIN,
  MOUNT_ANGLE,
  REST_ANGLE_GAIN,
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
/** 静止判定阈值：位置/速度/角度均小于该值视为收敛 */
const SETTLE_EPS = 0.05;

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
 * - 静止状态保持平稳无晃动，鼠标悬浮 3D 倾斜与拖拽甩动自然响应
 * - 完全收敛或滚出视口后 rAF 自动停帧，交互/重新可见时唤醒
 */
export function useLanyardPhysics(reducedMotion: boolean): LanyardPhysics {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const strapRef = useRef<SVGPathElement | null>(null);
  const stateRef = useRef<LanyardState>(initialState());
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;
  /* 主循环的唤醒函数，供 pointer 事件与翻转调用 */
  const wakeRef = useRef<() => void>(() => {});

  const [isFlipped, setIsFlipped] = useState(false);
  const toggleFlip = useCallback(() => {
    const s = stateRef.current;
    /* 翻面瞬间归零倾斜，避免斜着翻面 */
    s.targetTiltX = 0;
    s.targetTiltY = 0;
    setIsFlipped((v) => !v);
    wakeRef.current();
  }, []);

  const justDragged = useCallback(() => {
    return performance.now() - stateRef.current.lastDragEnd < DRAG_COOLDOWN;
  }, []);

  /* pointerdown 由 stage 的 React 合成事件触发 */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    /* hover 倾斜用的 badge 静止位置缓存：stage 本身不被 transform，
       用 stage rect + badge 的 offset 布局值还原 badge 位置，
       scroll/resize 时失效重取，避免每次 pointermove 强制布局 */
    let stageRect: DOMRect | null = null;
    const getBadgeRect = () => {
      const badge = badgeRef.current;
      if (!badge) return null;
      if (!stageRect) stageRect = stage.getBoundingClientRect();
      return {
        left: stageRect.left + badge.offsetLeft,
        top: stageRect.top + badge.offsetTop,
        width: badge.offsetWidth,
        height: badge.offsetHeight,
      };
    };
    const invalidateRect = () => {
      stageRect = null;
    };

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
      invalidateRect();
      wakeRef.current();
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

        const dragAngle = Math.atan2(s.x, REST_Y + s.y) * (180 / Math.PI) * DRAG_ANGLE_GAIN;
        s.angle += (dragAngle - s.angle) * DRAG_ANGLE_LERP;
      } else if (e.pointerType === 'mouse' && !reducedRef.current) {
        const rect = getBadgeRect();
        if (!rect) return;
        const normX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
        const normY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);

        if (Math.abs(normX) <= 1.6 && Math.abs(normY) <= 1.6) {
          s.targetTiltY = Math.max(-TILT_MAX, Math.min(TILT_MAX, normX * 12));
          s.targetTiltX = Math.max(-TILT_MAX, Math.min(TILT_MAX, -normY * 12));
        } else {
          s.targetTiltX = 0;
          s.targetTiltY = 0;
        }
        wakeRef.current();
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
    window.addEventListener('scroll', invalidateRect, { passive: true, capture: true });
    window.addEventListener('resize', invalidateRect);
    return () => {
      stage.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('scroll', invalidateRect, true);
      window.removeEventListener('resize', invalidateRect);
    };
  }, [toggleFlip]);

  /* rAF 主循环：弹簧积分 + 挂绳贝塞尔重算；收敛静止或滚出视口后停帧 */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const s = stateRef.current;
    let raf = 0;
    let running = false;
    let visible = true;

    const render = () => {
      const badge = badgeRef.current;
      if (badge) {
        badge.style.transform =
          `translate3d(${s.x.toFixed(2)}px,${s.y.toFixed(2)}px,0) ` +
          `rotate(${s.angle.toFixed(2)}deg) ` +
          `rotateX(${s.tiltX.toFixed(2)}deg) rotateY(${s.tiltY.toFixed(2)}deg)`;
      }

      /* 扁平纯黑宽织带挂绳贝塞尔曲线 */
      const bx = REST_X + s.x;
      const by = REST_Y + s.y;
      const rad = (s.angle * Math.PI) / 180;
      const cp1x = ANCHOR_X;
      const cp1y = ANCHOR_Y + (by - ANCHOR_Y) * 0.45;
      const cp2x = bx - Math.sin(rad) * 20;
      const cp2y = by - Math.cos(rad) * 20;

      strapRef.current?.setAttribute(
        'd',
        `M ${ANCHOR_X.toFixed(1)},${ANCHOR_Y.toFixed(1)} C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`,
      );
    };

    const stop = () => {
      if (!running) return;
      cancelAnimationFrame(raf);
      running = false;
    };

    const isSettled = () =>
      !s.isDragging &&
      Math.abs(s.x) < SETTLE_EPS &&
      Math.abs(s.vx) < SETTLE_EPS &&
      Math.abs(s.y) < SETTLE_EPS &&
      Math.abs(s.vy) < SETTLE_EPS &&
      Math.abs(s.angle) < SETTLE_EPS &&
      Math.abs(s.vAngle) < SETTLE_EPS &&
      Math.abs(s.tiltX - s.targetTiltX) < SETTLE_EPS &&
      Math.abs(s.tiltY - s.targetTiltY) < SETTLE_EPS;

    const loop = () => {
      if (!reducedRef.current) {
        if (!s.isDragging) {
          const fx = -s.x * SPRING_K;
          const fy = -s.y * SPRING_K;
          s.vx = (s.vx + fx) * DAMPING;
          s.vy = (s.vy + fy) * DAMPING;
          s.x += s.vx;
          s.y += s.vy;

          if (Math.abs(s.x) < 0.02 && Math.abs(s.vx) < 0.02) {
            s.x = 0;
            s.vx = 0;
          }
          if (Math.abs(s.y) < 0.02 && Math.abs(s.vy) < 0.02) {
            s.y = 0;
            s.vy = 0;
          }

          const targetAngle = Math.atan2(s.x, REST_Y + s.y) * (180 / Math.PI) * REST_ANGLE_GAIN;
          const torque = (targetAngle - s.angle) * ROT_SPRING_K;
          s.vAngle = (s.vAngle + torque) * ROT_DAMPING;
          s.angle += s.vAngle;

          if (Math.abs(s.angle) < 0.02 && Math.abs(s.vAngle) < 0.02) {
            s.angle = 0;
            s.vAngle = 0;
          }
        }
        s.tiltX += (s.targetTiltX - s.tiltX) * TILT_LERP;
        s.tiltY += (s.targetTiltY - s.tiltY) * TILT_LERP;
      }

      render();

      if (isSettled()) {
        /* 收敛后吸附到目标值，写最终帧后停帧 */
        s.x = 0;
        s.vx = 0;
        s.y = 0;
        s.vy = 0;
        s.angle = 0;
        s.vAngle = 0;
        s.tiltX = s.targetTiltX;
        s.tiltY = s.targetTiltY;
        render();
        running = false;
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    const wake = () => {
      if (running || !visible || reducedRef.current) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    wakeRef.current = wake;

    /* 入场摆角脉冲：像刚挂上去一样自然回摆（减动效下跳过，保持静帧） */
    if (!reducedRef.current) s.angle = MOUNT_ANGLE;
    /* 首帧渲染静止基线（挂绳初始路径），减动效下无物理、不启动循环 */
    render();
    wake();

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
      else stop();
    });
    io.observe(stage);

    return () => {
      stop();
      io.disconnect();
      wakeRef.current = () => {};
    };
  }, []);

  return {
    stageRef,
    badgeRef,
    strapRef,
    isFlipped,
    toggleFlip,
    justDragged,
  };
}
