import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface ProceduralEnvProps {
  /** 环境光强度，整体影响金属 / 高光反射的明暗 */
  intensity?: number;
}

/** 摄影棚柔光箱定义（等距柱状投影坐标：u 环绕 0~1，v 由上到下 0~1） */
interface StudioLight {
  u: number;
  v: number;
  /** 光斑角半径（弧度制的相对量，越大越柔） */
  r: number;
  /** 峰值亮度，可远大于 1 —— 这才是 HDR 环境的意义所在 */
  intensity: number;
  /** 色温：暖光偏黄、冷光偏蓝，制造层次 */
  tint: [number, number, number];
}

/**
 * 摄影棚布光（三灯 + 顶光），完全按 React Bits 官方示例那种「棚拍玩具车」的观感设计：
 *
 *  - 主光 key   ：右前上方，最亮（决定车漆的主要高光）
 *  - 副光 fill  ：左后方，偏冷、稍暗（补暗部，避免死黑）
 *  - 轮廓光 rim ：正后方，勾勒车顶边缘
 *  - 第四点光   ：弱光点缀另一侧，避免某角度完全无高光
 */
const STUDIO_LIGHTS: StudioLight[] = [
  { u: 0.72, v: 0.26, r: 0.11, intensity: 14, tint: [1.0, 0.98, 0.93] },
  { u: 0.18, v: 0.3, r: 0.18, intensity: 4.5, tint: [0.86, 0.92, 1.0] },
  { u: 0.5, v: 0.32, r: 0.12, intensity: 3.0, tint: [0.94, 0.96, 1.0] },
  { u: 0.95, v: 0.24, r: 0.14, intensity: 2.5, tint: [1.0, 0.97, 0.92] },
];

/**
 * 基础环境骨架 —— 这套布局是反复调出来的，每个数都有理由。
 *
 * ## 为什么是「水平亮环」而不是「天顶最亮」
 * 直觉上摄影棚是顶光最强，但实测下来那会让**车顶直接过曝成一片白**、车身侧面却发暗，
 * 整车看起来又平又脏。真实摄影棚是**柔光箱围在四周**，所以亮度峰值应该落在
 * 「斜上方 ~ 水平」（v ≈ 0.38），正上方（天顶）反而要压暗：
 *
 *      v=0.00 天顶    0.17 ──▶ 车顶呈中等亮度，不再过曝
 *      v=0.38 斜上    0.45 ──▶ 引擎盖 / 车顶边缘的主要高光
 *      v=0.44 地平线  0.40 + 亮带 ──▶ 车身腰线那条横向高光
 *      v=0.50 水平    中和衰减 ──▶ 车窗反射的来源
 *      v=1.00 天底    0.006 ──▶ 车身下半反射近黑，体积感来源
 *
 * ## 另一个关键：底色必须压暗
 * 早期版本把天空给到 0.88，整个上半球在 ACES 后全部饱和成 1.0（实测天顶/地平线
 * 显示值都是 0.93~0.99），光斑与背景糊成同一片白 —— 车漆反射出来一片均匀亮，
 * 看着就是"塑料"。压到 0.2~0.45 之后光斑才有对比可言。
 */
const RING: [number, number, number] = [0.33, 0.11, 0.85];
/** 天顶残余光：避免正上方全黑，车顶会失去层次 */
const SKY_TOP = 0.22;
/** 地面：[地平线处亮度, 天底亮度] */
const GROUND: [number, number] = [0.035, 0.006];
/** 地平线亮带：[峰值, 中心 v, 半宽] —— 引擎盖 / 腰线那条锐利的横向高光就靠它 */
const HORIZON: [number, number, number] = [1.9, 0.44, 0.024];
/** 方位调制：[基准, 幅度, 最亮方位] —— 摄影棚总有一侧更亮，这是"纵向明暗层次"的来源 */
const AZIMUTH: [number, number, number] = [0.45, 1.0, 0.22];

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 环境贴图分辨率：等距柱状投影是 2:1。分辨率越高，光斑边缘越锐、反射越"有条理" */
const ENV_W = 1024;
const ENV_H = 512;

/**
 * 本地程序化环境贴图（IBL）—— HDR 摄影棚版
 *
 * ## 为什么不用 drei 的 `<Environment preset="forest" />`
 *  1. `preset` 会去境外 CDN（raw.githack.com → raw.githubusercontent.com）拉 HDR，
 *     国内网络下极易超时/失败；
 *  2. 它需要额外拉一张 1~2k 的 HDR 并走 drei 自己的 cube RT 通道，实测在本机 GPU 上
 *     会在模型首帧渲染后把 WebGL 上下文打挂（canvas 定格成灰白，正好盖住车模）。
 *
 * ## 为什么不是「随便画个渐变」（旧实现的问题）
 * ToyCar.glb 是**扫描级 PBR 素材**，光影几乎 100% 由环境贴图决定：
 *
 *  | 材质   | 关键参数                                    | 依赖               |
 *  | ------ | ------------------------------------------- | ------------------ |
 *  | ToyCar | `clearcoatFactor = 1`（满清漆）+ 法线/粗糙度贴图 | 清漆反光完全来自 IBL |
 *  | Fabric | `sheenColorFactor = [1,0,0]`、`sheenRoughness = 0.5` | 绒面辉光来自掠射光 |
 *
 * 旧实现是 256×128 的 **LDR**（最亮仅 1.0）均匀渐变，两个致命问题：
 *  1. **分辨率太低** → 光斑被 PMREM 卷积糊平，反射出来是一整片同色，"没有反射感"；
 *  2. **LDR 没有动态范围** → 做不出镜面高光那种"过曝"的爆亮点，车漆永远是一块塑料。
 *
 * ## 现在的做法
 * 手工生成 **1024×512 的 HalfFloat HDR** 数据（亮部峰值 14，环境底噪 ~0.01，
 * 动态范围上千比一），内容按摄影棚布光：
 *
 *  - 天顶偏亮 → 车顶 / 引擎盖的镜面高光
 *  - 地面压到近黑 → 车身下半反射暗，这是"体积感"和明暗对比的来源
 *  - 地平线亮带 → 车身腰线 / 引擎盖那条横向高光
 *  - 方位调制（一侧亮一侧暗）→ 车身侧面的纵向明暗层次
 *  - 四组柔光箱 → 车漆上明确的高光团
 *
 * 纯本地、零网络、零离屏场景渲染，只在初始化时算一次数组。
 */
export function ProceduralEnv({ intensity = 1 }: ProceduralEnvProps) {
  const scene = useThree((s) => s.scene);

  const texture = useMemo(() => {
    const data = new Uint16Array(ENV_W * ENV_H * 4);
    const toHalf = THREE.DataUtils.toHalfFloat;

    const [ringV, ringW, ringI] = RING;
    const [gndTop, gndBot] = GROUND;
    const [hzI, hzV, hzW] = HORIZON;
    const [azBase, azAmp, azCenter] = AZIMUTH;

    for (let y = 0; y < ENV_H; y++) {
      // ⚠️ v 必须翻转：three 的 equirectUv() 里 v = asin(dir.y) / π + 0.5，
      // 即 v=0 指向「正下方」；而 DataTexture 的 flipY 默认是 false，数据第 0 行
      // 正好对应 v=0。不翻转的话整张环境图会上下颠倒 —— 天空的亮环落到地面方向，
      // 车顶/引擎盖反而去反射"地面"那片近黑，表现为「最该亮的引擎盖最暗」。
      const v = 1 - y / (ENV_H - 1);

      // 1) 垂直方向：水平亮环 + 天顶残余光，两者只与 v 有关，提到内层循环外算
      const ring = ringI * Math.exp(-Math.pow((v - ringV) / ringW, 2) * 1.3);
      const sky = SKY_TOP * Math.pow(1 - Math.min(v, 0.5) / 0.5, 1.2);
      const upper = ring + sky;

      // 2) 地面：近黑
      const gnd = (gndTop - gndBot) * Math.pow(Math.max(0, 1 - (v - 0.5) / 0.5), 2.5) + gndBot;

      // 3) 天地过渡：留一条短过渡带，避免硬边在车漆上留下突兀的"一刀切"
      const tt = smoothstep(0.46, 0.56, v);
      const base = upper * (1 - tt) + gnd * tt;

      // 4) 地平线亮带（窄、锐）—— 只存在于天空一侧，不拖到地面
      const band = hzI * Math.exp(-Math.pow((v - hzV) / hzW, 2)) * (1 - tt);

      for (let x = 0; x < ENV_W; x++) {
        const u = x / (ENV_W - 1);

        // 5) 方位调制：摄影棚一侧亮、一侧暗。这一项是「立体感」的关键 ——
        //    缺了它，环境在水平方向完全均匀，车身侧面会反射成同一片亮，车就是平的。
        //    亮带也一起乘，于是地平线高光条自然形成"一头亮一头暗"的走向。
        const uMul = azBase + azAmp * (0.5 + 0.5 * Math.cos(2 * Math.PI * (u - azCenter)));

        let r = (base + band) * uMul;
        let g = r;
        let b = r;

        // 6) 柔光箱：等距柱状投影里 u 方向一圈 360°、v 方向半圈 180°，
        //    所以 u 方向的距离要乘 2 才能和 v 方向同尺度比较
        for (let i = 0; i < STUDIO_LIGHTS.length; i++) {
          const L = STUDIO_LIGHTS[i];
          let du = Math.abs(u - L.u);
          if (du > 0.5) du = 1 - du; // u 方向首尾环绕
          const dx = du * 2;
          const dy = v - L.v;
          const k = Math.exp(-((dx * dx + dy * dy) / (L.r * L.r)) * 2.2);
          if (k < 0.002) continue;
          const I = L.intensity * k;
          r += I * L.tint[0];
          g += I * L.tint[1];
          b += I * L.tint[2];
        }

        const o = (y * ENV_W + x) * 4;
        data[o] = toHalf(r);
        data[o + 1] = toHalf(g);
        data[o + 2] = toHalf(b);
        data[o + 3] = toHalf(1);
      }
    }

    const tex = new THREE.DataTexture(data, ENV_W, ENV_H, THREE.RGBAFormat, THREE.HalfFloatType);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    // HDR 光照数据是线性的，不能走 sRGB 解码
    tex.colorSpace = THREE.LinearSRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
  }, []);

  useEffect(() => {
    if (!texture) return;
    const prevEnv = scene.environment;
    const prevIntensity = scene.environmentIntensity;
    scene.environment = texture;
    scene.environmentIntensity = intensity;
    return () => {
      scene.environment = prevEnv;
      scene.environmentIntensity = prevIntensity;
      texture.dispose();
    };
  }, [scene, texture, intensity]);

  return null;
}

export default ProceduralEnv;
