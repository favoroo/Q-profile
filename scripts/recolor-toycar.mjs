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
 *
 * 注意：产物 public/models/ToyCar.glb 需提交；CI 不跑本脚本（与 export:evkit-share 同理）。
 */

import { NodeIO } from '@gltf-transform/core';
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
const GLASS_COLOR = '#b9d2e8';

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
  console.log(`✓ Glass.baseColorFactor → ${GLASS_COLOR}`);
}

await io.write(MODEL, doc);
console.log(`\n已写回 ${MODEL}`);
