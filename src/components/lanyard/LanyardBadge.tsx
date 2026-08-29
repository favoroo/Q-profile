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
  const { stageRef, badgeRef, strapRef, strapHighlightRef, isFlipped, toggleFlip } =
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
      {/* 动态工牌织带挂绳 */}
      <svg className={styles.svgContainer} viewBox="0 0 320 180" aria-hidden="true">
        {/* 主织带（深色扁平带） */}
        <path
          ref={strapRef}
          d=""
          fill="none"
          stroke="#262628"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* 织带中间精细编织质感线 */}
        <path
          ref={strapHighlightRef}
          d=""
          fill="none"
          stroke="rgba(255, 255, 255, 0.22)"
          strokeWidth="1.2"
          strokeDasharray="3 2"
          strokeLinecap="round"
        />
      </svg>

      {/* 顶部固定端 */}
      <div className={styles.topAnchor} aria-hidden="true" />

      {/* 工牌主体 */}
      <div ref={badgeRef} className={styles.badgeBody}>
        {/* 工牌金属扣夹 */}
        <div className={styles.clipUnit} aria-hidden="true">
          <svg viewBox="0 0 18 18" fill="none">
            {/* 织带金属压箍 */}
            <rect x="4" y="0" width="10" height="3" rx="1.2" fill="#48484a" />
            {/* 金属连接环 */}
            <rect x="7" y="2.5" width="4" height="5" rx="1.5" fill="none" stroke="#636366" strokeWidth="1.2" />
            {/* 工牌金属夹片 */}
            <rect x="3" y="7" width="12" height="10" rx="2" fill="#242426" />
            {/* 夹片金属亮边 */}
            <rect x="5" y="9.5" width="8" height="1.5" rx="0.75" fill="#8e8e93" />
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
