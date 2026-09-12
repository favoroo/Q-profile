import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface ProceduralEnvProps {
  /** 环境光强度，整体影响金属 / 高光反射的明暗 */
  intensity?: number;
}

/** 摄影棚光源定义（等距柱状投影坐标：u 环绕 0~1，v 由上到下 0~1） */
interface StudioLight {
  u: number;
  v: number;
  /** 灯板方位向半宽（u 空间相对量；du×2 ≈ 弧度）—— 平顶部分的边界 */
  ru: number;
  /** 灯板俯仰向半宽（v 空间相对量） */
  rv: number;
  /**
   * 灯板内峰值亮度，可远大于 1 —— 这才是 HDR 环境的意义所在。
   * 车漆金属层的 F0 就是车漆本色（反射率 ~0.5），清漆/玻璃镜面层 F0 ≈ 0.04
   * 且 roughness = 0（完美镜面）：峰值几十的镜子只是「浅灰斑」（旧版峰值 14 的
   * 塑料感来源）；必须到数百量级才能在 ACES 后过曝成白色爆点 —— 这正是真实
   * 棚拍 HDR 柔光箱的亮度区间，也是「镜面感」和「塑料感」的分水岭。
   */
  intensity: number;
  /** 色温：暖光偏黄、冷光偏蓝，制造层次 */
  tint: [number, number, number];
}

/**
 * 灯板边缘的软过渡占比：核心区（t < 1-EDGE）全亮，边缘 35% 内平滑衰减到 0。
 *
 * ⚠️ 必须用「平顶 + 窄过渡」而不能用高斯：系数 2.2 的高斯在半半径处仍有 ~68% 亮度，
 * 裙摆会铺满半个半球 —— 金属车漆把这片"均匀亮"模糊反射出来就是一整片奶白，
 * 什么对比都没有（实测 v8~v12 全栽在这里）。真实柔光箱就是带软边的平面灯板。
 */
const EDGE = 0.35;

/** 平顶软边剖面：t ∈ [0,1]（0 = 灯板中心，1 = 灯板外边界），返回 0~1 亮度 */
const edgeProfile = (t: number) => {
  if (t >= 1) return 0;
  const s = Math.min(1, (1 - t) / EDGE);
  return s * s * (3 - 2 * s);
};

/**
 * 摄影棚布光 = 四组柔光箱（方位沿用旧版调好的布局）+ 两条长条灯板。
 *
 * 长条灯板（ru ≫ rv）是汽车棚拍的灵魂：真实车棚顶上是一排长条柔光管，
 * 车漆上那些沿曲率流动的「拉丝」长条反光只能由细长的光源产生。
 * 车漆金属层粗糙度 ≈ 0.27，反射会被卷积糊开 —— 灯板必须足够大、峰值足够高，
 * 模糊之后才能存活成一条白色光带；同时骨架底色要暗，反差才出得来。
 *
 *  - 主光 key   ：右前上方，最亮（决定车漆的主要高光）
 *  - 天窗灯板   ：横贯上方的长条白光板 → 车顶 / 引擎盖长条拉丝
 *  - 侧腰灯板   ：亮侧近地平线的长条光板 → 车身腰线拉丝
 *  - 副光 fill  ：左后方，偏冷、弱（补暗部，避免死黑）
 *  - 轮廓光 rim ：正后方，勾勒车顶边缘
 *  - 第四点光   ：弱光点缀另一侧，避免某角度完全无高光
 */
const STUDIO_LIGHTS: StudioLight[] = [
  // 主柔光箱：v1 验证过的方位（车漆主高光正好落进默认视角的镜面方向）
  { u: 0.72, v: 0.26, ru: 0.09, rv: 0.09, intensity: 220, tint: [1.0, 0.97, 0.9] },
  // 天窗灯板：宽长的顶光板 → 车顶 / 引擎盖的白色长条反光
  { u: 0.55, v: 0.14, ru: 0.17, rv: 0.035, intensity: 300, tint: [0.98, 0.99, 1.0] },
  // 侧腰灯板：亮侧近地平线的横长光板 → 车身腰线拉丝
  { u: 0.08, v: 0.4, ru: 0.12, rv: 0.028, intensity: 200, tint: [0.92, 0.96, 1.0] },
  { u: 0.18, v: 0.31, ru: 0.13, rv: 0.13, intensity: 18, tint: [0.86, 0.92, 1.0] },
  { u: 0.5, v: 0.32, ru: 0.09, rv: 0.09, intensity: 45, tint: [0.94, 0.96, 1.0] },
  { u: 0.95, v: 0.24, ru: 0.1, rv: 0.1, intensity: 16, tint: [1.0, 0.97, 0.92] },
];

/**
 * 基础环境骨架 —— 每个数都有理由。
 *
 * ## 为什么骨架必须整体压暗
 * 车漆是 62% 面积 metallic=1 的金属层（粗糙度≈0.27），它把环境**模糊地**照单全收：
 * 环境哪里亮，车身就哪里泛白。均匀亮的骨架（早期 0.88、后来 0.85 的亮环）只会让
 * 整车反射成一片奶白 —— 实测 v8~v12 全栽在这里。只有「暗骨架 + 平顶亮灯板」
 * 才能反射出「深绿车身 + 白色光带」的棚拍对比（红色地面实验验证）。
 *
 *      v=0.00 天顶    0.08 ──▶ 车顶深色底，白色拉丝全靠天窗灯板
 *      v=0.33 斜上    0.35 ──▶ 一点点过渡亮度，避免车顶死黑
 *      v=0.45 地平线  亮带    ──▶ 车身侧面那条横向高光
 *      v=1.00 天底    0.006 ──▶ 车身下半反射近黑，体积感来源
 */
const RING: [number, number, number] = [0.33, 0.09, 0.35];
/** 天顶残余光：避免正上方全黑，车顶会失去层次 */
const SKY_TOP = 0.08;
/** 地面：[地平线处亮度, 天底亮度] */
const GROUND: [number, number] = [0.04, 0.006];
/** 地平线亮带：[峰值, 中心 v, 半宽] —— 窄而亮，车身侧面水平镜面方向的横向高光。
 *  不能给太高：绒布的 sheen 层专吃掠射角，这里过亮会把整块布染成粉白 */
const HORIZON: [number, number, number] = [3.5, 0.45, 0.02];
/** 方位调制：[基准, 幅度, 最亮方位] —— 摄影棚总有一侧更亮，这是"纵向明暗层次"的来源 */
const AZIMUTH: [number, number, number] = [0.45, 1.0, 0.22];

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 环境贴图分辨率：等距柱状投影是 2:1。分辨率越高，光条 / 光斑边缘越锐、反射越"有条理"。
 *  1536×768 下长条灯管（rv≈0.02 ≈ 15 像素宽）边缘足够锐利；
 *  不再往上加是刻意的 —— 软件渲染（SwiftShader）设备上 2048×1024 的
 *  HalfFloat 贴图 + PMREM 链路有打挂 WebGL 上下文的风险。 */
const ENV_W = 1536;
const ENV_H = 768;

/**
 * 本地程序化环境贴图（IBL）—— 零资产兜底方案
 *
 * ## 当前定位
 * 主方案已切换为 `ModelViewer environment="hdr"`：加载自托管的真实摄影 HDR
 * （public/hdr/forest_slope_1k.hdr，React Bits 同款文件，照片级动态范围）。
 * 本组件保留为 `environment="procedural"` 时的兜底：不依赖任何资产、纯代码生成。
 * 注意：本方案观感到不了照片级 —— 均匀的数学亮斑替代不了真实 HDR 的
 * 太阳爆点与天空色彩渐变，主视觉请勿回退到此方案。
 *
 * ## 为什么不直接用 drei 的 `<Environment preset="forest" />`（CDN 在线加载）
 *  1. `preset` 会去境外 CDN（raw.githack.com）拉 HDR，实测该域名 403 不可达；
 *  2. 正确做法是自托管 HDR 文件 + `<Environment files={...} />`（已采用），
 *     而不是退回 CDN preset。
 *
 * ## 为什么不是「随便画个渐变」（旧实现的问题）
 * ToyCar.glb 是**扫描级 PBR 素材**，光影几乎 100% 由环境贴图决定：
 *
 *  | 材质   | 关键参数                                    | 依赖               |
 *  | ------ | ------------------------------------------- | ------------------ |
 *  | ToyCar | `clearcoatFactor = 1`（满清漆）+ 法线/粗糙度贴图 | 清漆反光完全来自 IBL |
 *  | Fabric | `sheenColorFactor = [1,0,0]`、`sheenRoughness = 0.5` | 绒面辉光来自掠射光 |
 *
 * 更早的版本是 256×128 的 **LDR** 均匀渐变，上一版把峰值提到了 14 但全是圆形软高斯，
 * 两个问题一脉相承：
 *  1. **没有锐利光源** → 光斑被 PMREM 卷积糊平，反射是一整片同色渐变，"没有反射感"；
 *  2. **峰值不够高** → 清漆 F0≈0.04 乘完过不了 ACES 的白点，车漆永远是一块塑料。
 *
 * ## 现在的做法
 * 手工生成 **1536×768 的 HalfFloat HDR** 数据（灯板内峰值 16~300，环境底噪 ~0.006，
 * 动态范围数万比一），内容按汽车棚拍布光：
 *
 *  - 两条平顶软边长条灯板 → 车顶 / 腰线沿曲率流动的「拉丝」镜面反光（质感的核心来源）
 *  - 高峰值主光柔光箱 → 车漆上过曝的白色爆点
 *  - 地面压到近黑 → 车身下半反射暗，这是"体积感"和明暗对比的来源
 *  - 地平线亮带 → 车身腰线 / 引擎盖那条横向高光的底色
 *  - 方位调制（一侧亮一侧暗）→ 车身侧面的纵向明暗层次
 *
 * 性能上，灯板剖面（平顶软边矩形）天然可分离（列 profile × 行 profile），
 * 逐像素只剩一次乘法；1.2M 像素一次性生成几十毫秒，之后零持续开销。
 * 纯本地、零网络、零离屏场景渲染。
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

    const lights = STUDIO_LIGHTS;
    const n = lights.length;

    // ── 预计算：把二维灯板剖面拆成「列 × 行」两个一维 profile
    //    （平顶软边矩形 = 行剖面的乘积，可分离），2M 像素的内层循环只剩一次乘法。
    //    列 profile 直接预乘 intensity，行 profile 存原始值。
    const rowProf: Float32Array[] = Array.from({ length: n }, () => new Float32Array(ENV_H));
    const colI: Float32Array[] = Array.from({ length: n }, () => new Float32Array(ENV_W));
    /** 每行只依赖 v 的骨架：环形天空 + 地面混合 */
    const rowBase = new Float32Array(ENV_H);
    /** 每行只依赖 v 的地平线亮带 */
    const rowBand = new Float32Array(ENV_H);
    /** 每列只依赖 u 的方位调制 */
    const colMul = new Float32Array(ENV_W);

    for (let y = 0; y < ENV_H; y++) {
      // ⚠️ v 必须翻转：three 的 equirectUv() 里 v = asin(dir.y) / π + 0.5，
      // 即 v=0 指向「正下方」；而 DataTexture 的 flipY 默认是 false，数据第 0 行
      // 正好对应 v=0。不翻转的话整张环境图会上下颠倒 —— 天空的亮环落到地面方向，
      // 车顶/引擎盖反而去反射"地面"那片近黑，表现为「最该亮的引擎盖最暗」。
      const v = 1 - y / (ENV_H - 1);

      // 1) 垂直方向：水平亮环 + 天顶残余光
      const ring = ringI * Math.exp(-Math.pow((v - ringV) / ringW, 2) * 1.3);
      const sky = SKY_TOP * Math.pow(1 - Math.min(v, 0.5) / 0.5, 1.2);
      const upper = ring + sky;

      // 2) 地面：近黑
      const gnd = (gndTop - gndBot) * Math.pow(Math.max(0, 1 - (v - 0.5) / 0.5), 2.5) + gndBot;

      // 3) 天地过渡：留一条短过渡带，避免硬边在车漆上留下突兀的"一刀切"
      const tt = smoothstep(0.46, 0.56, v);
      rowBase[y] = upper * (1 - tt) + gnd * tt;

      // 4) 地平线亮带（窄、锐）—— 只存在于天空一侧，不拖到地面
      rowBand[y] = hzI * Math.exp(-Math.pow((v - hzV) / hzW, 2)) * (1 - tt);

      for (let i = 0; i < n; i++) {
        rowProf[i][y] = edgeProfile((v - lights[i].v) / lights[i].rv);
      }
    }

    for (let x = 0; x < ENV_W; x++) {
      const u = x / (ENV_W - 1);

      // 5) 方位调制：摄影棚一侧亮、一侧暗。这一项是「立体感」的关键 ——
      //    缺了它，环境在水平方向完全均匀，车身侧面会反射成同一片亮，车就是平的。
      colMul[x] = azBase + azAmp * (0.5 + 0.5 * Math.cos(2 * Math.PI * (u - azCenter)));

      //    等距柱状投影里 u 方向一圈 360°、v 方向半圈 180°，
      //    所以 u 方向的距离要乘 2 才能和 v 方向同尺度比较
      for (let i = 0; i < n; i++) {
        const L = lights[i];
        let du = Math.abs(u - L.u);
        if (du > 0.5) du = 1 - du; // u 方向首尾环绕
        colI[i][x] = edgeProfile((du * 2) / L.ru) * L.intensity;
      }
    }

    const alpha = toHalf(1);
    for (let y = 0; y < ENV_H; y++) {
      const base = rowBase[y] + rowBand[y];
      const o0 = y * ENV_W * 4;
      for (let x = 0; x < ENV_W; x++) {
        // 底色乘方位调制：亮带一起乘，地平线高光条自然形成"一头亮一头暗"的走向
        let r = base * colMul[x];
        let g = r;
        let b = r;

        for (let i = 0; i < n; i++) {
          const k = rowProf[i][y] * colI[i][x];
          if (k > 0) {
            const t = lights[i].tint;
            r += k * t[0];
            g += k * t[1];
            b += k * t[2];
          }
        }

        const o = o0 + x * 4;
        data[o] = toHalf(r);
        data[o + 1] = toHalf(g);
        data[o + 2] = toHalf(b);
        data[o + 3] = alpha;
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
