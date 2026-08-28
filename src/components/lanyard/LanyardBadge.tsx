import { useReducedMotion } from 'framer-motion';
import { profile } from '../../data';
import { useLanyardPhysics } from './useLanyardPhysics';
import styles from './LanyardBadge.module.css';
import { Icon } from '../ui/icons';

/**
 * 悬吊工牌组件：拖拽晃动（钟摆阻尼）、hover 3D 倾斜 + 光泽反射、双击/按钮翻转。
 * 物理状态在 useLanyardPhysics 内以 ref 管理，rAF 每帧直写 DOM。
 */
export function LanyardBadge() {
  const reducedMotion = useReducedMotion() ?? false;
  const { stageRef, badgeRef, strapRef, shadowRef, glareRef, isFlipped, toggleFlip } =
    useLanyardPhysics(reducedMotion);

  return (
    <div
      ref={stageRef}
      className={styles.stage}
      role="region"
      aria-label={`${profile.name}的工程师工牌（支持拖拽晃动与翻转）`}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-flip-btn]')) return;
        toggleFlip();
      }}
    >
      {/* 动态挂绳 SVG（主带 + 阴影） */}
      <svg className={styles.svgContainer} viewBox="0 0 320 180" aria-hidden="true">
        <path ref={shadowRef} d="" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="12" strokeLinecap="round" />
        <path ref={strapRef} d="" fill="none" stroke="#18181b" strokeWidth="9" strokeLinecap="round" />
      </svg>

      {/* 顶部固定扣 */}
      <div className={styles.topAnchor} aria-hidden="true" />

      {/* 工牌主体 */}
      <div ref={badgeRef} className={styles.badgeBody}>
        {/* 金属卡扣 */}
        <div className={styles.clipUnit} aria-hidden="true">
          <svg viewBox="0 0 22 22" fill="none">
            <rect x="4" y="0" width="14" height="4" rx="1.2" fill="#27272a" stroke="#3f3f46" strokeWidth="0.8" />
            <rect x="7" y="3.5" width="8" height="7.5" rx="1.5" fill="#3f3f46" stroke="#52525b" strokeWidth="0.8" />
            <path
              d="M8.5 10v7.5a2.5 2.5 0 0 0 5 0V10"
              stroke="#52525b"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* 透明卡套 */}
        <div className={styles.cardCase}>
          <div className={styles.slotHole} aria-hidden="true" />

          {/* 3D 翻转卡片 */}
          <div className={`${styles.cardInner} ${isFlipped ? styles['is-flipped'] : ''}`}>
            {/* 正面 */}
            <div className={`${styles.face} ${styles.faceFront}`}>
              <div ref={glareRef} className={styles.glare} aria-hidden="true" />
              <div className={styles.photoBox}>
                <img
                  src={profile.avatar}
                  alt={`${profile.name}的个人工牌照片`}
                  width={864}
                  height={1152}
                  loading="eager"
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

          {/* 翻转按钮 */}
          <button
            type="button"
            data-flip-btn
            className={styles.flipBtn}
            aria-label="翻转工牌查看背面技能"
            title="点击翻转工牌"
            onClick={(e) => {
              e.stopPropagation();
              toggleFlip();
            }}
          >
            <Icon name="flip" className="h-3 w-3" strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
}
