/** 工牌物理系统常量（迁移自 legacy.html initLanyardBadge） */

/* 平动弹簧：适度阻尼，回弹干脆利落不反复晃动 */
export const SPRING_K = 0.11;
export const DAMPING = 0.66;
/* 旋转弹簧：快速归正，避免剧烈摇摆 */
export const ROT_SPRING_K = 0.10;
export const ROT_DAMPING = 0.65;

/* 拖拽限位（px） */
export const DRAG_LIMIT = 180;
/* 拖拽时角度跟随：atan2 增益与平滑插值 */
export const DRAG_ANGLE_GAIN = 0.72;
export const DRAG_ANGLE_LERP = 0.28;
/* 静止时旋转弹簧的 atan2 增益 */
export const REST_ANGLE_GAIN = 0.68;
/* hover 3D 倾斜 */
export const TILT_MAX = 6;
export const TILT_LERP = 0.12;

/* 挂绳 SVG 坐标：扁平宽织带（顶部中央自然垂落） */
export const ANCHOR_X = 160;
export const ANCHOR_Y = 0;
export const REST_X = 160;
export const REST_Y = 46;
/* 拖拽跟随插值系数 */
export const DRAG_LERP = 0.42;
/* 释放甩动角度增益 */
export const FLING_GAIN = 0.06;
/* 挂载入场：初始摆角（deg），弹簧自然回摆形成「刚挂上去」的入场 */
export const MOUNT_ANGLE = 14;

