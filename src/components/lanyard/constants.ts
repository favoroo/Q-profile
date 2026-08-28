/** 工牌物理系统常量（迁移自 legacy.html initLanyardBadge） */

/* 平动弹簧 */
export const SPRING_K = 0.046;
export const DAMPING = 0.88;
/* 旋转弹簧 */
export const ROT_SPRING_K = 0.058;
export const ROT_DAMPING = 0.86;

/* 拖拽限位（px） */
export const DRAG_LIMIT = 180;
/* hover 3D 倾斜 */
export const TILT_MAX = 14;
export const TILT_LERP = 0.12;

/* 挂绳 SVG 坐标 */
export const ANCHOR_X = 160;
export const ANCHOR_Y = 0;
export const REST_X = 160;
export const REST_Y = 46;
/* 拖拽跟随插值系数 */
export const DRAG_LERP = 0.42;
/* 释放甩动角度增益 */
export const FLING_GAIN = 0.35;
