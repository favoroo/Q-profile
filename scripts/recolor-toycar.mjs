#!/usr/bin/env node
/**
 * ToyCar.glb 一键重涂：绿色车身 / 红色内饰 / 红绒布 → 品牌蓝白涂装
 *
 * 背景：ToyCar.glb（Khronos 官方样例）的颜色全部「烤」在贴图与材质因子里，
 * 乘法 tint 无法把绿贴图调成蓝，所以用「选择性色相迁移」逐像素重涂：
 * 保明暗光影、只迁色相 —— 蓝漆仍是原车漆的金属颗粒与高光过渡，只是换了涂装。
 *
 * 车身 baseColor 其实是一张纹理图集，包含：
 *   绿色车漆区 + 橙黄火焰贴花 + 黑白格子旗 + 「1」号圆标 + 红色内饰块 + 暗红座椅块
 * 因此规则按「色相带」设计而非整图换色：绿色→品牌蓝、橙黄火焰→冰蓝白、
 * 红色内饰→白色皮革；低饱和像素（黑白格子、铬件、轮胎）一律不动。
 *
 * 用法：npm run recolor:toycar
 * 幂等可重跑（蓝图里已没有绿/红/橙色带，再跑是无操作）；换配色改下方参数即可。
 * 除重涂外，本脚本还会给 4 个车门窗洞补玻璃面片（原版模型是开放式座舱，车门
 * 侧窗处没有玻璃几何，详见 DOOR_GLASS 注释）；面片已存在时自动跳过。
 *
 * ⚠️ 改 BODY_BANDS 等贴图参数后重跑时，必须先恢复**原始绿模**再跑（蓝图上色相带
 * 不再命中，改了也不会生效）：
 *   git checkout 41bf5e1 -- public/models/ToyCar.glb   # 41bf5e1 = 蓝白涂装引入前的提交
 *   npm run recolor:toycar
 * 只改 SHEEN/GLASS 等材质因子参数、或重跑车门玻璃补面，则无需恢复（因子是绝对
 * 赋值、补面有幂等守卫，直接重跑即可）。
 *
 * 注意：产物 public/models/ToyCar.glb 需提交；CI 不跑本脚本（与 export:evkit-share 同理）。
 */

import { NodeIO, Primitive } from '@gltf-transform/core';
import {
  KHRMaterialsClearcoat,
  KHRMaterialsSheen,
  KHRMaterialsTransmission,
  KHRMaterialsSpecular,
  KHRMaterialsEmissiveStrength,
  KHRTextureTransform,
} from '@gltf-transform/extensions';
import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const MODEL = 'public/models/ToyCar.glb';
/** 调试预览输出目录（重涂后的关键贴图，供人眼核对色相映射） */
const PREVIEW_DIR = '/tmp/toycar-recolor-preview';

// ─────────────────────────────────────────────────────────────────────────────
// 配色参数（sRGB hex；glTF 材质因子需要线性空间，脚本自动转换）
// ─────────────────────────────────────────────────────────────────────────────

/** 绒布 sheen 色：深蓝丝绒辉光（原 [1,0,0] 正红） */
const SHEEN_COLOR = '#2f7bff';
/** 车窗透射色：浅蓝灰玻璃（原 [0.3,0.8,0.3] 绿玻璃） */
const GLASS_COLOR = '#cfe3f6';
/**
 * 车窗透射率（原 1 = 全透射）。全透射玻璃在黑色页面背景里透进来的只有黑色，
 * 车窗看上去就是几个黑洞；调低后玻璃本体的浅蓝着色参与混合，车窗清晰可见。
 */
const GLASS_TRANSMISSION = 0.2;
/** 车窗粗糙度（原 0 = 完美镜面）：轻微磨砂让环境反射更宽，玻璃「存在感」更强 */
const GLASS_ROUGHNESS = 0.09;
/**
 * 车窗自发光（极淡的蓝）。挡风玻璃是斜面、吃得到环境顶光，但四个车门侧窗是
 * 垂直面 —— 环境光主要从上往下打，垂直面 irradiance 很低，只靠本体色侧视角
 * 依然发黑。自发光是与视角/光照无关的项，保证任何角度下车窗都「在」。
 * 值要克制：这是暗棚 + 霓虹蓝的场景，淡淡一层刚好，亮了会像灯箱。
 */
const GLASS_EMISSIVE = '#16283c';

/**
 * 车门侧窗玻璃补面。Khronos 原版 ToyCar 是「开放式座舱」：Glass 网格只有前挡风
 * （带包角）和后窗两块面片，4 个车门窗洞处从来没有玻璃——洞里透出暗内饰 + 黑背景，
 * 侧视角下车窗看上去就是「空的/黑的」。本步骤按车身网格自动提取每侧窗洞的边界
 * （腰线轨顶 / 车顶轨下沿 / A 柱内缘 / B 柱 / C 柱斜缘），生成贴合的玻璃面片并入
 * Glass mesh，与前挡/后窗共用 Glass 材质（调 GLASS_* 参数四处同步生效）。
 *
 * 已测得的洞口结构（原始顶点坐标系，见下）：每侧一个大连通开口，B 柱圆珠
 * （L≈-2.5..2.5）把它分成前后两个门窗洞；前缘 A 柱内缘后倾（(≈-66,91)→(≈-54,113)）、
 * 后缘 C 柱内缘前倾（(≈76,91)→(≈53,116)）、顶部沿车顶轨下沿（U≈117-119，前部
 * 下潜到≈113）、底部腰线轨顶（U≈89-92）。窗框轨/柱都是圆珠，截面 |x|≈47-66
 * （凹槽内缘≈55、外缘≈65），面片放在 |x|=58 恰好落进凹槽，边缘藏进珠体。
 *
 * 坐标系：原始顶点空间（节点变换前）x=车宽、y=车长、-z=向上；三个 mesh 节点共享
 * 同一变换（绕 X +90° + 统一缩放 1e-4），按原始坐标建面即可与现有玻璃对齐。
 * 幂等：Glass mesh 已含车门玻璃 primitive（>1 个 primitive）时跳过，可安全重跑。
 */
const DOOR_GLASS = {
  /** 玻璃所在横向平面 |x|：与现有玻璃house最大半宽（57.4）齐平，落进窗框轨凹槽 */
  HALF_W: 58,
  /** 面片边界相对洞口轮廓的内收量（原始单位），防止与钣金圆角共面闪烁 */
  INSET: 1.2,
  /** 每块面片的网格密度（车长向 × 高度向段数），Coons 补片拟合斜边与车顶起伏 */
  COLS: 14,
  ROWS: 6,
};

/**
 * 车身贴图（ToyCar.baseColor）的色相迁移规则。
 * 作用域 = 色相带，带内平滑过渡、带外零影响；饱和度低于 NEUTRAL_S 的像素不动。
 *  - targetHue：目标色相（度）
 *  - satMul / lum：带内像素的饱和度倍率与明度变换（保留明暗结构的关键）
 */
const BODY_BANDS = [
  // 绿色车漆 → 品牌蓝（#0071e3 色相 ≈ 208°）：略提饱和与明度，比原绿漆更亮一档贴近站点蓝
  { center: 120, half: 55, targetHue: 208, satMul: 1.25, lum: (l) => l * 1.12 + 0.03 },
  // 橙黄火焰贴花 → 冰蓝→白渐变（压饱和、提亮，保住火焰的渐变层次）
  { center: 35, half: 30, targetHue: 207, satMul: 0.28, lum: (l) => l * 0.75 + 0.22 },
  // 红色内饰块 → 白色皮革（去饱和 + 大幅提亮）
  { center: 0, half: 22, targetHue: 210, satMul: 0.07, lum: (l) => Math.min(0.93, l * 1.6 + 0.35) },
];

/** 各贴图采用哪套规则；未列出的贴图（法线/金属粗糙度/清漆遮罩等）一律不动 */
const TEXTURE_RULES = {
  'ToyCar.baseColor': BODY_BANDS,
  // 暗红织物纹理 → 暗蓝织物（绒布本体的织纹颜色，sheen 辉光色由 SHEEN_COLOR 提供）
  'Fabric.baseColor': [{ center: 0, half: 35, targetHue: 218, satMul: 0.9, lum: (l) => l }],
  // 红色氛围发光 → 蓝白氛围光（车灯/舱内自发光，明度即发光强度，保持不变）
  'ToyCar.emissive': [{ center: 0, half: 35, targetHue: 210, satMul: 0.12, lum: (l) => l }],
};

/** 低于此饱和度（0~1）视为中性色（黑白灰/铬件），不参与迁移 */
const NEUTRAL_S = 0.12;

// ─────────────────────────────────────────────────────────────────────────────

const io = new NodeIO().registerExtensions([
  KHRMaterialsClearcoat,
  KHRMaterialsSheen,
  KHRMaterialsTransmission,
  KHRMaterialsSpecular,
  KHRMaterialsEmissiveStrength,
  KHRTextureTransform,
]);

/** sRGB hex → glTF 线性空间 [r,g,b] */
function srgbHexToLinear(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
}

/** rgb(0~1) → hsl(度,0~1,0~1) */
function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [h, s, l];
}

function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

/** hsl(度,0~1,0~1) → rgb(0~1) */
function hslToRgb(h, s, l) {
  if (s === 0) return [l, l, l];
  const hN = (((h % 360) + 360) % 360) / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, hN + 1 / 3), hue2rgb(p, q, hN), hue2rgb(p, q, hN - 1 / 3)];
}

/** 色相环上两角度的最小距离（度） */
function hueDistance(a, b) {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

/** 带内权重：核心区全量，边缘 40% 平滑衰减到 0（避免彩色镶边） */
function bandWeight(dist, half) {
  if (dist >= half) return 0;
  const t = dist / half;
  const edge = 0.6;
  if (t <= edge) return 1;
  const s = (t - edge) / (1 - edge);
  return 1 - s * s * (3 - 2 * s);
}

/** 对一张 RGBA 图执行色相带迁移，返回 [新PNG字节, 各规则命中像素数] */
function recolorImage(pngBytes, bands) {
  const png = PNG.sync.read(Buffer.from(pngBytes));
  const { width, height, data } = png;
  const hits = new Array(bands.length).fill(0);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const [h, s, l] = rgbToHsl(r, g, b);
    if (s < NEUTRAL_S) continue; // 黑白灰/铬件/格子旗不动

    // 多带重叠时按权重混合各带的目标值
    let wSum = 0;
    let hT = 0;
    let sT = 0;
    let lT = 0;
    for (let k = 0; k < bands.length; k++) {
      const band = bands[k];
      const w = bandWeight(hueDistance(h, band.center), band.half);
      if (w === 0) continue;
      hits[k]++;
      wSum += w;
      hT += w * band.targetHue;
      sT += w * Math.min(1, s * band.satMul);
      lT += w * band.lum(l);
    }
    if (wSum === 0) continue;

    const [nr, ng, nb] = hslToRgb(hT / wSum, sT / wSum, lT / wSum);
    data[i] = Math.round(nr * 255);
    data[i + 1] = Math.round(ng * 255);
    data[i + 2] = Math.round(nb * 255);
  }

  const out = PNG.sync.write(png, { colorType: 6 });
  return [out, hits];
}

// ── 主流程 ───────────────────────────────────────────────────────────────────

const doc = await io.read(MODEL);
const root = doc.getRoot();
const textures = root.listTextures();

/** key: `${材质名}.${槽位}` → texture 索引 */
const slotMap = {};
for (const mat of root.listMaterials()) {
  const name = mat.getName();
  const slots = {
    baseColor: mat.getBaseColorTexture(),
    emissive: mat.getEmissiveTexture(),
  };
  for (const [slot, tex] of Object.entries(slots)) {
    if (tex) slotMap[`${name}.${slot}`] = textures.indexOf(tex);
  }
}
console.log('贴图槽位映射:', slotMap);

mkdirSync(PREVIEW_DIR, { recursive: true });

for (const [key, rule] of Object.entries(TEXTURE_RULES)) {
  const idx = slotMap[key];
  if (idx === undefined) {
    console.warn(`⚠️ 找不到贴图槽位 ${key}，跳过`);
    continue;
  }
  const tex = textures[idx];
  const [outPng, hits] = recolorImage(tex.getImage(), rule);
  tex.setImage(outPng);
  console.log(
    `✓ ${key}（texture#${idx}，${tex.getSize().join('x')}）已重涂；` +
      `各规则命中像素: ${hits.map((n) => (n / 1000).toFixed(0) + 'k').join(' / ')}`,
  );
  writeFileSync(path.join(PREVIEW_DIR, key.replace('.', '-') + '.png'), outPng);
}

// 材质因子：hex → 线性空间
const sheenMat = root.listMaterials().find((m) => m.getName() === 'Fabric');
if (sheenMat) {
  sheenMat.getExtension('KHR_materials_sheen')?.setSheenColorFactor(srgbHexToLinear(SHEEN_COLOR));
  console.log(`✓ Fabric.sheenColorFactor → ${SHEEN_COLOR}（线性 ${srgbHexToLinear(SHEEN_COLOR).map((v) => v.toFixed(3))}）`);
}
const glassMat = root.listMaterials().find((m) => m.getName() === 'Glass');
if (glassMat) {
  glassMat.setBaseColorFactor([...srgbHexToLinear(GLASS_COLOR), 1]);
  glassMat.setRoughnessFactor(GLASS_ROUGHNESS);
  glassMat.setEmissiveFactor(srgbHexToLinear(GLASS_EMISSIVE));
  glassMat.getExtension('KHR_materials_transmission')?.setTransmissionFactor(GLASS_TRANSMISSION);
  console.log(
    `✓ Glass.baseColorFactor → ${GLASS_COLOR}，transmission → ${GLASS_TRANSMISSION}，` +
      `roughness → ${GLASS_ROUGHNESS}，emissive → ${GLASS_EMISSIVE}`,
  );
}

// ── 车门侧窗玻璃补面（详见 DOOR_GLASS 注释）──────────────────────────────────
function addDoorGlass(doc, root, glassMat) {
  const glassMesh = root.listMeshes().find((m) => m.getName() === 'Glass');
  const bodyMesh = root.listMeshes().find((m) => m.getName() === 'ToyCar');
  const mat = glassMat || root.listMaterials().find((m) => m.getName() === 'Glass');
  if (!glassMesh || !bodyMesh || !mat) {
    console.warn('⚠️ 找不到 Glass/ToyCar 网格或 Glass 材质，跳过车门玻璃补面');
    return;
  }
  if (glassMesh.listPrimitives().length > 1) {
    console.log('✓ 车门侧窗玻璃已存在（Glass mesh 多 primitive），跳过补面');
    return;
  }

  const bodyPos = bodyMesh.listPrimitives()[0].getAttribute('POSITION').getArray();
  // 侧窗带内的车身顶点（原始坐标）：宽 |x|∈[40,72]、L=y、U=-z
  const V = [];
  for (let i = 0; i < bodyPos.length / 3; i++) {
    const W = Math.abs(bodyPos[i * 3]);
    const L = bodyPos[i * 3 + 1];
    const U = -bodyPos[i * 3 + 2];
    if (W < 40 || W > 72 || U < 80 || U > 126 || L < -82 || L > 102) continue;
    V.push([L, U]);
  }
  const colExtremumU = (Lc, half, lo, hi, isMin) => {
    let m = isMin ? Infinity : -Infinity;
    for (const [L, U] of V) {
      if (Math.abs(L - Lc) > half || U < lo || U > hi) continue;
      m = isMin ? Math.min(m, U) : Math.max(m, U);
    }
    return m;
  };
  const rowExtremumL = (Ur, half, lo, hi, isMin) => {
    let m = isMin ? Infinity : -Infinity;
    for (const [L, U] of V) {
      if (Math.abs(U - Ur) > half || L < lo || L > hi) continue;
      m = isMin ? Math.min(m, L) : Math.max(m, L);
    }
    return m;
  };

  // 底沿 = 腰线轨顶（中段各列取最大 U 的中位数，再略下沉藏进轨珠）
  const beltTops = [];
  for (let L = -40; L <= 44; L += 4) {
    const m = colExtremumU(L, 2.5, 84, 96, false);
    if (isFinite(m)) beltTops.push(m);
  }
  beltTops.sort((a, b) => a - b);
  const beltU = (beltTops.length ? beltTops[Math.floor(beltTops.length / 2)] : 89.5) - 0.5;

  // 前洞前缘 = A 柱内缘（后倾直线）：底/顶两点采样（顶部封顶 -50 防车顶前檐污染）
  const frontLBottom = rowExtremumL(93, 1.75, -80, -8, true);
  const frontLTop = Math.min(rowExtremumL(112.5, 1.75, -80, -8, true), -50);
  // 后洞后缘 = C 柱内缘（前倾直线）：顶点取 U≈115 采样，底点由 U≈96 采样向腰线外推
  const rearLTop = rowExtremumL(115, 1.75, 6, 100, true);
  const rearLBottom = Math.min(rowExtremumL(96, 1.75, 6, 100, true) + 4, 82);
  console.log(
    `窗洞边界采样：腰线 U=${beltU.toFixed(1)}，A柱内缘 L ${frontLBottom?.toFixed?.(1)}→${frontLTop?.toFixed?.(1)}，` +
      `C柱内缘 L ${rearLBottom?.toFixed?.(1)}→${rearLTop?.toFixed?.(1)}`,
  );

  const bPillar = 2.5 + DOOR_GLASS.INSET; // B 柱珠（L≈±2.5）两侧各内收
  /** 前洞：前缘 A 柱斜边，后缘 B 柱竖直；后洞：前缘 B 柱竖直，后缘 C 柱斜边 */
  const edges = [
    { l0: isFinite(frontLBottom) ? frontLBottom : -64, l1: isFinite(frontLTop) ? frontLTop : -54, r0: -bPillar, r1: -bPillar },
    { l0: bPillar, l1: bPillar, r0: isFinite(rearLBottom) ? rearLBottom : 76, r1: isFinite(rearLTop) ? Math.max(rearLTop, 46) : 52 },
  ];

  /** 车顶轨下沿逐列采样（U 带 [112,124]），NaN 邻列补齐 + 轻平滑，端点即角点 */
  function roofEdge(l0, l1) {
    const { COLS, INSET } = DOOR_GLASS;
    const half = (l1 - l0) / COLS / 2 + 0.6;
    const raw = [];
    for (let i = 0; i <= COLS; i++) {
      const m = colExtremumU(l0 + ((l1 - l0) * i) / COLS, half, 112, 124, true);
      raw.push(isFinite(m) ? m : NaN);
    }
    for (let i = 0; i <= COLS; i++) {
      if (isFinite(raw[i])) continue;
      const prev = raw[i - 1];
      const next = raw[i + 1];
      raw[i] = isFinite(prev) && isFinite(next) ? (prev + next) / 2 : isFinite(prev) ? prev : isFinite(next) ? next : 117.5;
    }
    return raw
      .map((v, i) => (raw[Math.max(0, i - 1)] + v + raw[Math.min(COLS, i + 1)]) / 3)
      .map((u) => Math.min(Math.max(u - INSET, beltU + 12), 122));
  }

  /** 一块侧窗面片：Coons 补片（底=腰线水平线，顶=车顶下沿采样线，前后=直边） */
  function buildPanel(side, e) {
    const { COLS, ROWS, HALF_W } = DOOR_GLASS;
    const top = roofEdge(e.l1, e.r1);
    const lerp = (a, b, t) => a + (b - a) * t;
    // 角点 P00=前下 P10=后下 P01=前上 P11=后上（L,U）
    const P00 = [e.l0, beltU];
    const P10 = [e.r0, beltU];
    const P01 = [e.l1, top[0]];
    const P11 = [e.r1, top[COLS]];
    const grid = [];
    for (let j = 0; j <= ROWS; j++) {
      const v = j / ROWS;
      for (let i = 0; i <= COLS; i++) {
        const u = i / COLS;
        const bL = lerp(P00[0], P10[0], u);
        const tL = lerp(P01[0], P11[0], u);
        const fL = lerp(P00[0], P01[0], v);
        const rL = lerp(P10[0], P11[0], v);
        const bU = beltU;
        const tU = top[i];
        const fU = lerp(beltU, P01[1], v);
        const rU = lerp(beltU, P11[1], v);
        const bil = (1 - u) * (1 - v) * P00[0] + u * (1 - v) * P10[0] + (1 - u) * v * P01[0] + u * v * P11[0];
        const bilU = (1 - u) * (1 - v) * P00[1] + u * (1 - v) * P10[1] + (1 - u) * v * P01[1] + u * v * P11[1];
        const L = (1 - v) * bL + v * tL + (1 - u) * fL + u * rL - bil;
        const U = (1 - v) * bU + v * tU + (1 - u) * fU + u * rU - bilU;
        grid.push([side * HALF_W, L, -U]); // 原始坐标：x=宽、y=车长、z=-向上
      }
    }
    const idx = (i, j) => j * (COLS + 1) + i;
    const indices = [];
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        const a = idx(i, j);
        const b = idx(i + 1, j);
        const c = idx(i + 1, j + 1);
        const d = idx(i, j + 1);
        indices.push(a, b, c, a, c, d);
      }
    }
    // 绕序校验：首三角形法线须指向车外（+x 侧 → +x，-x 侧 → -x）
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const n = cross(sub(grid[indices[1]], grid[indices[0]]), sub(grid[indices[2]], grid[indices[0]]));
    if (n[0] * side < 0) {
      for (let k = 0; k < indices.length; k += 3) {
        const t = indices[k + 1];
        indices[k + 1] = indices[k + 2];
        indices[k + 2] = t;
      }
    }
    return { grid, indices };
  }

  const panels = [];
  for (const side of [1, -1]) for (const e of edges) panels.push(buildPanel(side, e));
  const vertTotal = panels.reduce((n, p) => n + p.grid.length, 0);
  const idxTotal = panels.reduce((n, p) => n + p.indices.length, 0);
  const positions = new Float32Array(vertTotal * 3);
  const normals = new Float32Array(vertTotal * 3);
  const indices = new Uint16Array(idxTotal);
  let vOff = 0;
  let iOff = 0;
  for (const p of panels) {
    p.grid.forEach((v, k) => {
      positions.set(v, (vOff + k) * 3);
      normals.set([Math.sign(v[0]), 0, 0], (vOff + k) * 3);
    });
    for (const ix of p.indices) indices[iOff++] = vOff + ix;
    vOff += p.grid.length;
  }

  const buffer = doc.getRoot().listBuffers()[0];
  const posAcc = doc.createAccessor('DoorGlassPosition', buffer).setArray(positions).setType('VEC3');
  const nrmAcc = doc.createAccessor('DoorGlassNormal', buffer).setArray(normals).setType('VEC3');
  const idxAcc = doc.createAccessor('DoorGlassIndices', buffer).setArray(indices).setType('SCALAR');
  const prim = doc
    .createPrimitive()
    .setMode(Primitive.Mode.TRIANGLES)
    .setAttribute('POSITION', posAcc)
    .setAttribute('NORMAL', nrmAcc)
    .setIndices(idxAcc)
    .setMaterial(mat);
  glassMesh.addPrimitive(prim);
  console.log(`✓ 车门侧窗玻璃补面：4 块 Coons 面片（${vertTotal} 顶点 / ${idxTotal / 3} 三角）已并入 Glass mesh`);
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

addDoorGlass(doc, root, glassMat);

await io.write(MODEL, doc);
console.log(`\n已写回 ${MODEL}`);
