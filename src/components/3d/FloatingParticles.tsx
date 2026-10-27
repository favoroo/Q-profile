/**
 * 3D 浮动尘埃粒子 —— 车模场景的氛围装饰
 *
 * 用 drei <Points> + <PointMaterial> 单次 draw call 渲染 ~40 个微小粒子，
 * 在 useFrame 中按 sin/cos 缓慢漂移，配合 ModelViewer 的 frameloop="demand"
 * 通过 invalidate() 触发重渲染。
 */
import { useRef, useMemo } from 'react';
import { useFrame, invalidate } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

const COUNT = 40;
/** 粒子分布范围（相对于场景原点） */
const SPREAD = { x: 2.5, y: 1.8, z: 2.5 };
/** 粒子尺寸范围 */
const SIZE_MIN = 0.008;
const SIZE_MAX = 0.02;

interface ParticleData {
  /** 初始位置 */
  basePositions: Float32Array;
  /** 每个粒子的随机相位偏移 */
  phases: Float32Array;
  /** 每个粒子的漂移速度 */
  speeds: Float32Array;
  /** 每个粒子的漂移幅度 */
  amplitudes: Float32Array;
}

function generateParticles(): ParticleData {
  const basePositions = new Float32Array(COUNT * 3);
  const phases = new Float32Array(COUNT);
  const speeds = new Float32Array(COUNT);
  const amplitudes = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    basePositions[i * 3] = (Math.random() - 0.5) * 2 * SPREAD.x;
    basePositions[i * 3 + 1] = Math.random() * SPREAD.y - 0.3;
    basePositions[i * 3 + 2] = (Math.random() - 0.5) * 2 * SPREAD.z;
    phases[i] = Math.random() * Math.PI * 2;
    speeds[i] = 0.15 + Math.random() * 0.25;
    amplitudes[i] = 0.02 + Math.random() * 0.04;
  }

  return { basePositions, phases, speeds, amplitudes };
}

export function FloatingParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);

  const data = useMemo(() => generateParticles(), []);

  /** 当前帧的位置数组（在 useFrame 中更新） */
  const positions = useMemo(() => new Float32Array(data.basePositions), [data]);

  /** 每个粒子的大小 */
  const sizes = useMemo(() => {
    const s = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      s[i] = SIZE_MIN + Math.random() * (SIZE_MAX - SIZE_MIN);
    }
    return s;
  }, []);

  useFrame((_, dt) => {
    timeRef.current += dt;
    const t = timeRef.current;

    for (let i = 0; i < COUNT; i++) {
      const phase = data.phases[i];
      const speed = data.speeds[i];
      const amp = data.amplitudes[i];

      positions[i * 3] = data.basePositions[i * 3] + Math.sin(t * speed + phase) * amp;
      positions[i * 3 + 1] =
        data.basePositions[i * 3 + 1] + Math.sin(t * speed * 0.7 + phase * 1.3) * amp * 0.6;
      positions[i * 3 + 2] =
        data.basePositions[i * 3 + 2] + Math.cos(t * speed * 0.5 + phase * 0.8) * amp;
    }

    if (pointsRef.current) {
      const attr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      attr.needsUpdate = true;
    }

    invalidate();
  });

  return (
    <Points ref={pointsRef} positions={positions} sizes={sizes} stride={3}>
      <PointMaterial
        transparent
        opacity={0.35}
        color="#88bbff"
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}
