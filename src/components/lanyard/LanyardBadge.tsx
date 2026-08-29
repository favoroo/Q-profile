import { useReducedMotion } from 'framer-motion';
import { profile } from '../../data';
import { useLanyardPhysics } from './useLanyardPhysics';
import styles from './LanyardBadge.module.css';

/**
 * 悬吊工牌组件：拖拽晃动（钟摆阻尼）、hover 3D 倾斜、双击卡片翻转。
 * 物理状态在 useLanyardPhysics 内以 ref 管理，rAF 每帧直写 DOM。
 */
export function LanyardBadge() {
  const reducedMotion = useReducedMotion() ?? false;
  const { stageRef, badgeRef, strapRef, isFlipped, toggleFlip } =
    useLanyardPhysics(reducedMotion);

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
      {/* 动态挂绳（极简细线） */}
      <svg className={styles.svgContainer} viewBox="0 0 320 180" aria-hidden="true">
        <path ref={strapRef} d="" fill="none" stroke="#c8c8cc" strokeWidth="1.5" strokeLinecap="round" />
      </svg>

      {/* 顶部极简固定横条 */}
      <div className={styles.topAnchor} aria-hidden="true" />

      {/* 工牌主体 */}
      <div ref={badgeRef} className={styles.badgeBody}>
        {/* 极简扁平扣夹 */}
        <div className={styles.clipUnit} aria-hidden="true">
          <svg viewBox="0 0 16 12" fill="none">
            <rect x="5" y="0" width="6" height="2.5" rx="1.25" fill="#3a3a3c" />
            <rect x="2" y="2" width="12" height="10" rx="2" fill="#1d1d1f" />
            <rect x="4" y="5" width="8" height="1.5" rx="0.75" fill="#48484a" />
          </svg>
        </div>

        {/* 一体化 3D 翻转卡片（无多层套娃框） */}
        <div className={`${styles.cardInner} ${isFlipped ? styles['is-flipped'] : ''}`}>
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
