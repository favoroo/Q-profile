import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface ProceduralEnvProps {
  /** 环境光强度，整体影响金属 / 高光反射的明暗 */
  intensity?: number;
}

/**
 * 本地程序化环境贴图（IBL）
 *
 * 为什么不用 drei 的 `<Environment preset="forest" />`：
 *  1. `preset` 会去境外 CDN（raw.githack.com → raw.githubusercontent.com）拉 HDR，
 *     国内网络下极易超时/失败；
 *  2. 它需要走离屏 FBO + PMREM 那一整条渲染通道，实测在本机 GPU 上会在模型首帧渲染后
 *     直接把 WebGL 上下文打挂（canvas 定格成一块灰白色，正好盖住车模）。
 *
 * 这里改成用 canvas 画一张等距柱状投影的渐变图直接当环境贴图：纯本地、零网络、
 * 零离屏通道，肉眼效果与 HDR 预设非常接近（顶光 + 地平线亮带 + 暗地面）。
 */
export function ProceduralEnv({ intensity = 1 }: ProceduralEnvProps) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  const texture = useMemo(() => {
    const W = 256;
    const H = 128;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 天空 → 地平线亮带 → 地面
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0.0, '#7d90ad');
    sky.addColorStop(0.38, '#c3cee0');
    sky.addColorStop(0.48, '#ffffff');
    sky.addColorStop(0.52, '#f2f5fa');
    sky.addColorStop(0.62, '#7c828d');
    sky.addColorStop(1.0, '#131519');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // 主光软箱（右前上方）
    const key = ctx.createRadialGradient(W * 0.68, H * 0.34, 2, W * 0.68, H * 0.34, H * 0.42);
    key.addColorStop(0, 'rgba(255,255,255,0.95)');
    key.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = key;
    ctx.fillRect(0, 0, W, H);

    // 冷色补光（左后）
    const fill = ctx.createRadialGradient(W * 0.24, H * 0.46, 2, W * 0.24, H * 0.46, H * 0.38);
    fill.addColorStop(0, 'rgba(150,190,255,0.55)');
    fill.addColorStop(1, 'rgba(150,190,255,0)');
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, W, H);

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
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
  }, [gl, scene, texture, intensity]);

  return null;
}

export default ProceduralEnv;
