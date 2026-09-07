import { useReducedMotion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { profile } from '../../data';
import { useLanyardPhysics } from './useLanyardPhysics';
import styles from './LanyardBadge.module.css';

/** 背面 emoji 表情墙：错位菱形花纹（隔行错开半格、统一微倾、间距宽松），错峰轻微浮动 */
const BADGE_EMOJIS = (() => {
  const pool = profile.badgeBack.emojis;
  const spacingX = 36; // 横向间距（卡宽百分比）
  const spacingY = spacingX / 1.36; // 卡片宽高比 1:1.36，等像素间距
  const items: Array<{
    emoji: string;
    top: number;
    left: number;
    size: number;
    rotate: number;
    delay: number;
    duration: number;
  }> = [];
  let row = 0;
  for (let y = spacingY / 2; y < 100; y += spacingY, row++) {
    const start = spacingX * 0.25 + (row % 2 === 0 ? 0 : spacingX / 2);
    for (let x = start; x <= 100 - start + 0.01; x += spacingX) {
      const i = items.length;
      items.push({
        emoji: pool[i % pool.length],
        top: y,
        left: x,
        size: 26,
        rotate: -15,
        delay: (i % 3) * 0.4 + row * 0.25,
        duration: 3.5 + (i % 3) * 0.6,
      });
    }
  }
  return items;
})();

/**
 * 悬吊工牌组件：极简扁平纯白宽织带挂绳（适配首屏蓝色色块）、拖拽晃动、
 * hover 3D 倾斜 + 光泽扫过、双击卡片翻转、待机 CSS 微摆。
 * 物理状态在 useLanyardPhysics 内以 ref 管理，rAF 每帧直写 DOM。
 */
export function LanyardBadge() {
  const reducedMotion = useReducedMotion() ?? false;
  const { stageRef, badgeRef, strapRef, isFlipped, toggleFlip, justDragged } =
    useLanyardPhysics(reducedMotion);

  return (
    <div
      ref={stageRef}
      className={styles.stage}
      role="region"
      tabIndex={0}
      aria-label={`${profile.name}的工程师工牌（支持拖拽晃动，双击或按回车翻转查看背面）`}
      onDoubleClick={() => {
        /* 拖拽释放后的双击是误触，不翻转 */
        if (!justDragged()) toggleFlip();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleFlip();
        }
      }}
    >
      {/* 极简扁平纯白宽织带挂绳 */}
      <svg className={styles.svgContainer} viewBox="0 0 320 180" aria-hidden="true">
        {/* 纯白扁平织带主身（宽度 11px，直垂自然悬挂） */}
        <path
          ref={strapRef}
          d=""
          fill="none"
          stroke="#f5f5f7"
          strokeWidth="11"
          strokeLinecap="round"
        />
      </svg>

      {/* 工牌主体 */}
      <div ref={badgeRef} className={styles.badgeBody}>
        {/* 待机微摆层：CSS 动画独立于物理直写的 badgeBody transform */}
        <div className={styles.sway}>
          {/* 一体化 3D 翻转卡片（扣夹随卡片一同 3D 翻转，避免分离穿模与 Z-fighting 异常） */}
          <div className={`${styles.cardInner} ${isFlipped ? styles['is-flipped'] : ''}`}>
            {/* 正面极简纯白扣夹 */}
            <div className={styles.clipUnitFront} aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none">
                {/* 织带金属压箍 */}
                <rect x="4.5" y="1.5" width="11" height="3" rx="1.5" fill="#c7c7cc" />
                {/* 扁平工牌夹片 */}
                <rect x="4.5" y="5.5" width="11" height="10" rx="2" fill="#f5f5f7" />
              </svg>
            </div>

            {/* 背面极简纯白扣夹 */}
            <div className={styles.clipUnitBack} aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none">
                {/* 织带金属压箍 */}
                <rect x="4.5" y="1.5" width="11" height="3" rx="1.5" fill="#c7c7cc" />
                {/* 扁平工牌夹片背面 */}
                <rect x="4.5" y="5.5" width="11" height="10" rx="2" fill="#f5f5f7" />
              </svg>
            </div>

            {/* 正面 */}
            <div className={`${styles.face} ${styles.faceFront}`}>
              <div className={styles.photoBox}>
                <img
                  src={profile.avatar}
                  alt={`${profile.name}的个人工牌照片`}
                  width={300}
                  height={360}
                  loading="eager"
                  draggable={false}
                />
              </div>
              <div className={styles.infoBox}>
                <div className={styles.nameCn}>{profile.name}</div>
                <div className={styles.titleCn}>{profile.title}</div>
              </div>
            </div>

            {/* 背面：emoji 表情墙（纯装饰，错位菱形花纹） */}
            <div className={`${styles.face} ${styles.faceBack}`} aria-hidden="true">
              <div className={styles.emojiField}>
                {BADGE_EMOJIS.map((item, i) => (
                  <span
                    key={i}
                    className={styles.emojiItem}
                    style={
                      {
                        top: `${item.top}%`,
                        left: `${item.left}%`,
                        fontSize: `${item.size}px`,
                        transform: `translate(-50%, -50%) rotate(${item.rotate}deg)`,
                        '--float-delay': `${item.delay}s`,
                        '--float-duration': `${item.duration}s`,
                      } as CSSProperties
                    }
                  >
                    {item.emoji}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}