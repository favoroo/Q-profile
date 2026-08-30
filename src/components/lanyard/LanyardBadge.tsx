import { useReducedMotion } from 'framer-motion';
import { profile } from '../../data';
import { useLanyardPhysics } from './useLanyardPhysics';
import styles from './LanyardBadge.module.css';

/**
 * 悬吊工牌组件：双边 V 型挂绳、拖拽晃动（钟摆阻尼）、hover 3D 倾斜、双击卡片翻转。
 * 物理状态在 useLanyardPhysics 内以 ref 管理，rAF 每帧直写 DOM。
 */
export function LanyardBadge() {
  const reducedMotion = useReducedMotion() ?? false;
  const {
    stageRef,
    badgeRef,
    leftStrapRef,
    rightStrapRef,
    leftHighlightRef,
    rightHighlightRef,
    isFlipped,
    toggleFlip,
  } = useLanyardPhysics(reducedMotion);

  return (
    <div
      ref={stageRef}
      className={styles.stage}
      role="region"
      aria-label={`${profile.name}的工程师工牌（支持拖拽晃动，双击可翻转查看背面）`}
      onDoubleClick={() => {
        toggleFlip();
      }}
    >
      {/* 动态工牌 V 型双边织带挂绳 */}
      <svg className={styles.svgContainer} viewBox="0 0 320 180" aria-hidden="true">
        <defs>
          <filter id="strapShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* 左侧织带（深色扁平编织带） */}
        <path
          ref={leftStrapRef}
          d=""
          fill="none"
          stroke="#262628"
          strokeWidth="4.8"
          strokeLinecap="round"
          filter="url(#strapShadow)"
        />
        {/* 左织带精细编织质感缝线 */}
        <path
          ref={leftHighlightRef}
          d=""
          fill="none"
          stroke="rgba(255, 255, 255, 0.28)"
          strokeWidth="1.1"
          strokeDasharray="2.5 2"
          strokeLinecap="round"
        />

        {/* 右侧织带（深色扁平编织带） */}
        <path
          ref={rightStrapRef}
          d=""
          fill="none"
          stroke="#262628"
          strokeWidth="4.8"
          strokeLinecap="round"
          filter="url(#strapShadow)"
        />
        {/* 右织带精细编织质感缝线 */}
        <path
          ref={rightHighlightRef}
          d=""
          fill="none"
          stroke="rgba(255, 255, 255, 0.28)"
          strokeWidth="1.1"
          strokeDasharray="2.5 2"
          strokeLinecap="round"
        />
      </svg>

      {/* 工牌主体 */}
      <div ref={badgeRef} className={styles.badgeBody}>
        {/* 一体化 3D 翻转卡片（扣夹随卡片一同 3D 翻转，避免分离穿模与 Z-fighting 异常） */}
        <div className={`${styles.cardInner} ${isFlipped ? styles['is-flipped'] : ''}`}>
          {/* 正面金属扣夹 */}
          <div className={styles.clipUnitFront} aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none">
              {/* 双带金属束口滑块 */}
              <rect x="4.5" y="0.5" width="11" height="3.5" rx="1.75" fill="#3a3a3c" />
              <rect x="5.5" y="1.2" width="9" height="1" rx="0.5" fill="#636366" />
              {/* 金属转环 */}
              <rect x="8" y="3.5" width="4" height="4.5" rx="1.5" fill="none" stroke="#636366" strokeWidth="1.3" />
              {/* 工牌金属夹身 */}
              <rect x="3.5" y="7.5" width="13" height="10" rx="2.5" fill="#1c1c1e" />
              {/* 钛金属高光倒角 */}
              <rect x="5" y="9" width="10" height="1.2" rx="0.6" fill="#8e8e93" opacity="0.85" />
              {/* 夹扣锁孔小圆点 */}
              <circle cx="10" cy="13.5" r="1.2" fill="#3a3a3c" />
            </svg>
          </div>

          {/* 背面金属扣夹 */}
          <div className={styles.clipUnitBack} aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none">
              {/* 双带金属束口滑块背面 */}
              <rect x="4.5" y="0.5" width="11" height="3.5" rx="1.75" fill="#3a3a3c" />
              <rect x="6" y="1.2" width="8" height="1" rx="0.5" fill="#2c2c2e" />
              {/* 金属转环 */}
              <rect x="8" y="3.5" width="4" height="4.5" rx="1.5" fill="none" stroke="#636366" strokeWidth="1.3" />
              {/* 工牌金属夹身背面 */}
              <rect x="3.5" y="7.5" width="13" height="10" rx="2.5" fill="#1c1c1e" />
              {/* 背面螺丝/紧固点 */}
              <circle cx="7" cy="12.5" r="0.9" fill="#48484a" />
              <circle cx="13" cy="12.5" r="0.9" fill="#48484a" />
            </svg>
          </div>

          {/* 正面 */}
          <div className={`${styles.face} ${styles.faceFront}`}>
            <div className={styles.photoBox}>
              <img
                src={profile.avatar}
                alt={`${profile.name}的个人工牌照片`}
                width={864}
                height={1152}
                loading="eager"
                draggable={false}
              />
            </div>
            <div className={styles.infoBox}>
              <div className={styles.nameCn}>{profile.name}</div>
              <div className={styles.titleCn}>{profile.title}</div>
            </div>
          </div>

          {/* 背面 */}
          <div className={`${styles.face} ${styles.faceBack}`}>
            <div className={styles.backHead}>
              <div className={styles.nameCn}>{profile.name}</div>
              <div className={styles.titleCn}>{profile.title}</div>
            </div>
            <ul className={styles.backList}>
              {profile.badgeBack.skills.map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
            <div className={styles.backFooter}>
              <span>{profile.badgeBack.edu}</span>
              <span>{profile.badgeBack.location}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
