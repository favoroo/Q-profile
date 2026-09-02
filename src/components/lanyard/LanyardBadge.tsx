import { useReducedMotion } from 'framer-motion';
import { profile } from '../../data';
import { useLanyardPhysics } from './useLanyardPhysics';
import styles from './LanyardBadge.module.css';

/**
 * 悬吊工牌组件：极简扁平纯黑宽织带挂绳、拖拽晃动、hover 3D 倾斜、双击卡片翻转。
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
      {/* 极简扁平纯黑宽织带挂绳 */}
      <svg className={styles.svgContainer} viewBox="0 0 320 180" aria-hidden="true">
        {/* 纯黑扁平织带主身（宽度 11px，直垂自然悬挂） */}
        <path
          ref={strapRef}
          d=""
          fill="none"
          stroke="#1c1c1e"
          strokeWidth="11"
          strokeLinecap="round"
        />
      </svg>

      {/* 工牌主体 */}
      <div ref={badgeRef} className={styles.badgeBody}>
        {/* 一体化 3D 翻转卡片（扣夹随卡片一同 3D 翻转，避免分离穿模与 Z-fighting 异常） */}
        <div className={`${styles.cardInner} ${isFlipped ? styles['is-flipped'] : ''}`}>
          {/* 正面极简纯黑扣夹 */}
          <div className={styles.clipUnitFront} aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none">
              {/* 织带金属压箍 */}
              <rect x="4.5" y="1.5" width="11" height="3" rx="1.5" fill="#3a3a3c" />
              {/* 扁平工牌夹片 */}
              <rect x="4.5" y="5.5" width="11" height="10" rx="2" fill="#1c1c1e" />
            </svg>
          </div>

          {/* 背面极简纯黑扣夹 */}
          <div className={styles.clipUnitBack} aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none">
              {/* 织带金属压箍 */}
              <rect x="4.5" y="1.5" width="11" height="3" rx="1.5" fill="#3a3a3c" />
              {/* 扁平工牌夹片背面 */}
              <rect x="4.5" y="5.5" width="11" height="10" rx="2" fill="#1c1c1e" />
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