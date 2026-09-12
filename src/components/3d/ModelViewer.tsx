/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Suspense,
  useCallback,
  useRef,
  useState,
  useLayoutEffect,
  useEffect,
  useMemo,
  type CSSProperties,
} from 'react';
import { Canvas, useFrame, useThree, invalidate } from '@react-three/fiber';
import { OrbitControls, useGLTF, useProgress, Html, ContactShadows, Environment } from '@react-three/drei';
import { ProceduralEnv } from './ProceduralEnv';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';

export interface ModelViewerProps {
  url: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  modelXOffset?: number;
  modelYOffset?: number;
  defaultRotationX?: number;
  defaultRotationY?: number;
  defaultZoom?: number;
  minZoomDistance?: number;
  maxZoomDistance?: number;
  enableMouseParallax?: boolean;
  enableManualRotation?: boolean;
  enableHoverRotation?: boolean;
  enableManualZoom?: boolean;
  ambientIntensity?: number;
  keyLightIntensity?: number;
  fillLightIntensity?: number;
  rimLightIntensity?: number;
  /**
   * 环境贴图（IBL）来源：
   *  - `'hdr'`       ：drei `<Environment files={environmentFiles} />` 加载真实 HDR（推荐，
   *                    与 React Bits 官方示例同款观感，需传入自托管的 .hdr 文件 URL）
   *  - `'procedural'`：本地程序化生成的 HDR 环境布光（零资产兜底方案）
   *  - `false`       ：不使用环境贴图，仅靠灯光照明
   */
  environment?: 'hdr' | 'procedural' | false;
  /** `'hdr'` 模式下加载的 .hdr 文件 URL（public 静态资源，需经 withBase 包裹） */
  environmentFiles?: string;
  /** 环境光强度（作用于 scene.environmentIntensity） */
  environmentIntensity?: number;
  autoFrame?: boolean;
  /**
   * 需要从模型中剔除的网格名（不区分大小写、子串匹配）。
   * 很多扫描件 / 素材 GLB 会把「布料、地板、背景板」一起打进文件，这些面片往往比主体大好几倍，
   * 会把取景包围盒撑满整个画面，看起来就像主体被一块白色背景盖住。
   */
  excludeMeshes?: string[];
  /** 归一化后模型包围球半径（默认 0.5），同时决定相机取景距离 */
  fitRadius?: number;
  /**
   * 轻量材质：只把 transmission（透射/折射）降级成普通的 alpha 玻璃。
   *
   * 很多 GLB 会给玻璃件挂 KHR_materials_transmission，three 会因此每帧多跑一遍
   * 全场透射渲染通道，开销极大，并额外申请一张全屏 RT（实测会把本机 WebGL 上下文打挂，
   * 画面定格成一块灰白色遮住模型）。降级后仅保留透明观感。
   *
   * 注意：sheen（绒布光泽）与 clearcoat（车漆清漆）**不降级** —— 它们是这类素材的
   * 核心观感来源（ToyCar.glb 的红布靠 sheen 才显绒面，车漆靠 clearcoat 才亮）。
   */
  lightweightMaterials?: boolean;
  /**
   * 计算「地面高度」时参考的网格名（子串匹配，不区分大小写）。留空则用整个模型的最低点。
   *
   * 用于模型自带底板 / 布料台座的场景：地板阴影要铺在「车底」而不是「布料最底部」，
   * 否则阴影会被布料自身挡住，车看起来像飘在空中。
   */
  floorMeshes?: string[];
  /** 完成取景后回调，给出模型底部的高度与包围半径，便于摆放地面阴影 */
  onFit?: (info: { floorY: number; radius: number }) => void;
  placeholderSrc?: string;
  showScreenshotButton?: boolean;
  fadeIn?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  onModelLoaded?: () => void;
}

const isTouch =
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);
const deg2rad = (d: number) => (d * Math.PI) / 180;
const DECIDE = 8;
const ROTATE_SPEED = 0.005;
const INERTIA = 0.925;
const PARALLAX_MAG = 0.05;
const PARALLAX_EASE = 0.12;
const HOVER_MAG = deg2rad(6);
const HOVER_EASE = 0.15;
/**
 * 降级后玻璃的不透明度。给到偏高：低不透明度会让车内的红布透出来，
 * 车窗变成一块暗红色 —— 而这类扫描件车内并没有内饰，透过去只会更难看的。
 */
const GLASS_OPACITY = 0.82;
/**
 * 降级后玻璃的固有色。原始 baseColor 是 (0.3, 0.8, 0.3) 的**绿色** —— 那是给
 * transmission 当「透射色」用的（光穿过玻璃后染成绿），换成普通不透明玻璃后
 * 会变成一块生硬的绿板。这里压暗、去饱和，交给环境反射来出效果。
 */
const GLASS_TINT: [number, number, number] = [0.02, 0.028, 0.026];

function Loader({ placeholderSrc }: { placeholderSrc?: string }) {
  const { progress, active } = useProgress();
  if (!active && placeholderSrc) return null;
  return (
    <Html center>
      {placeholderSrc ? (
        <img
          src={placeholderSrc}
          width={128}
          height={128}
          alt="3D Loading"
          style={{ filter: 'blur(8px)', borderRadius: 8 }}
        />
      ) : (
        <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-4 py-1.5 text-xs text-white/80 backdrop-blur-md">
          <span className="inline-block h-2 w-2 animate-ping rounded-full bg-accent" />
          <span>{Math.round(progress)}%</span>
        </div>
      )}
    </Html>
  );
}

function DesktopControls({
  pivot,
  min,
  max,
  zoomEnabled,
}: {
  pivot: THREE.Vector3;
  min: number;
  max: number;
  zoomEnabled: boolean;
}) {
  const ref = useRef<OrbitControlsImpl>(null);
  useFrame(() => ref.current?.target.copy(pivot));
  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enablePan={false}
      enableRotate={false}
      enableZoom={zoomEnabled}
      minDistance={min}
      maxDistance={max}
    />
  );
}

interface ModelInnerProps {
  url: string;
  xOff: number;
  yOff: number;
  pivot: THREE.Vector3;
  initYaw: number;
  initPitch: number;
  minZoom: number;
  maxZoom: number;
  enableMouseParallax: boolean;
  enableManualRotation: boolean;
  enableHoverRotation: boolean;
  enableManualZoom: boolean;
  autoFrame: boolean;
  fadeIn: boolean;
  autoRotate: boolean;
  autoRotateSpeed: number;
  camZ: number;
  excludeMeshes: string[];
  fitRadius: number;
  lightweightMaterials: boolean;
  floorMeshes: string[];
  onFit?: (info: { floorY: number; radius: number }) => void;
  onLoaded?: () => void;
}

function ModelInner({
  url,
  xOff,
  yOff,
  pivot,
  initYaw,
  initPitch,
  minZoom,
  maxZoom,
  enableMouseParallax,
  enableManualRotation,
  enableHoverRotation,
  enableManualZoom,
  autoFrame,
  fadeIn,
  autoRotate,
  autoRotateSpeed,
  camZ,
  excludeMeshes,
  fitRadius,
  lightweightMaterials,
  floorMeshes,
  onFit,
  onLoaded,
}: ModelInnerProps) {
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();

  const vel = useRef({ x: 0, y: 0 });
  const tPar = useRef({ x: 0, y: 0 });
  const cPar = useRef({ x: 0, y: 0 });
  const tHov = useRef({ x: 0, y: 0 });
  const cHov = useRef({ x: 0, y: 0 });

  const gltf = useGLTF(url) as any;
  const content = useMemo(() => {
    if (gltf?.scene) {
      return gltf.scene.clone();
    }
    return null;
  }, [gltf]);

  const pivotW = useRef(new THREE.Vector3());
  const fitKeyRef = useRef('');
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;
  const excludeKey = excludeMeshes.join('|');
  const floorKey = floorMeshes.join('|');

  useLayoutEffect(() => {
    if (!content || !inner.current || !outer.current) return;
    // 只对「同一个模型的同一套配置」取景一次，避免父组件重渲染导致反复适配 / 淡入闪烁
    const fitKey = `${content.uuid}|${excludeKey}|${floorKey}|${fitRadius}`;
    if (fitKeyRef.current === fitKey) return;
    fitKeyRef.current = fitKey;

    const g = inner.current;

    // 复位，保证每次测量都在未缩放的原始坐标系里进行（幂等）
    g.position.set(0, 0, 0);
    g.scale.setScalar(1);
    g.rotation.set(0, 0, 0);

    // 1) 剔除干扰网格：布料 / 地板 / 背景板等（按名字子串匹配，大小写不敏感）
    const excludes = excludeMeshes.map((n) => n.toLowerCase()).filter(Boolean);
    if (excludes.length) {
      g.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const name = (m.name || '').toLowerCase();
        if (excludes.some((n) => name.includes(n))) m.visible = false;
      });
    }

    g.updateWorldMatrix(true, true);

    // 2) 只按「可见网格」计算包围盒 —— 否则尺寸巨大的布料会把取景撑满整屏
    const box = new THREE.Box3();
    // 地面参考盒：默认等同整体包围盒；指定 floorMeshes 时只统计这些网格（如车身），
    // 这样地板阴影能落在车底，而不是被自带底板 / 布料挡在下面
    const floors = floorMeshes.map((n) => n.toLowerCase()).filter(Boolean);
    const floorBox = new THREE.Box3();
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.visible) return;
      box.expandByObject(m);
      if (!floors.length) return;
      const name = (m.name || '').toLowerCase();
      if (floors.some((n) => name.includes(n))) floorBox.expandByObject(m);
    });
    if (box.isEmpty()) box.setFromObject(g);
    if (floorBox.isEmpty()) floorBox.copy(box);

    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const s = fitRadius / (sphere.radius || 1);
    // 先缩放，再按「缩放后的球心」反向平移，保证包围球心正好落在原点
    // （原实现只减了未缩放的 center，等效于把模型整体推偏了一个 center 的距离）
    g.scale.setScalar(s);
    g.position.set(-sphere.center.x * s, -sphere.center.y * s, -sphere.center.z * s);

    g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const m = o as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;

        // 3) 材质降级：只处理 transmission（全场折射通道，性能与稳定性的头号杀手）。
        //    sheen（绒布光泽）/ clearcoat（车漆清漆）是这类素材的核心观感，原样保留。
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat) => {
          const p = mat as THREE.MeshPhysicalMaterial;
          if (lightweightMaterials && p.isMeshPhysicalMaterial && p.transmission > 0) {
            p.transmission = 0;
            p.thickness = 0;
            p.transparent = true;
            p.opacity = GLASS_OPACITY;
            p.depthWrite = false;
            // 玻璃的「高级感」来自反射而不是固有色：压暗本体色、恢复低粗糙度，
            // 并抬高环境反射权重，车窗上才会出现和车漆同源的高光
            p.color.setRGB(GLASS_TINT[0], GLASS_TINT[1], GLASS_TINT[2]);
            p.roughness = 0.03;
            p.metalness = 0;
            p.envMapIntensity = 3.2;
            p.needsUpdate = true;
          } else if (lightweightMaterials && p.isMeshPhysicalMaterial && p.sheen > 0) {
            // 绒布台座（仅 lightweightMaterials 兼容模式；hdr 模式保持原厂材质）：
            // 观感 = 深红漫反射底 + 红色 sheen 掠射辉光。
            // ⚠️ envMapIntensity 必须压在 0.02 量级：布面是水平的，环境里那几块
            // 高峰值灯板（有效亮度数百）对它的漫反射辐照度 E≈95，倍率给高一点
            // G/B 通道就直接爆白（实测 0.2 时整块布被洗成粉白）；车漆吃的是
            // 灯板的「镜面峰」所以不受影响 —— 两者由此解耦。
            // 直接光（平行灯）不随 envMapIntensity 缩放，是亮度下限，
            // 固有色乘一层暗红抵掉平行灯的洗白部分；sheen 保持满档出绒面辉光。
            p.envMapIntensity = 0.02;
            // 绒布几乎不该有相干镜面：介质 specular 的菲涅尔项（F→1 @ 掠射角）
            // 会把褶皱剪影全部打出白色高光，这是布面"粉白"的最后一层来源，
            // specularIntensity 只缩镜面项、不动漫反射与 sheen —— 正好外科手术式切除
            p.specularIntensity = 0.12;
            p.color.multiply(new THREE.Color(0.4, 0.28, 0.28));
            p.needsUpdate = true;
          }
          // 记下「基准不透明度」：淡入动画要按这个基准按比例恢复，
          // 否则玻璃这类靠 opacity 表达透明的材质会被一律拉回 1，变成一块不透明色板
          mat.userData.baseOpacity = mat.opacity;
        });
      }
    });

    // 归一化后的地面高度：用来把接触阴影铺在车轮下沿
    onFit?.({ floorY: (floorBox.min.y - sphere.center.y) * s, radius: fitRadius });

    g.getWorldPosition(pivotW.current);
    pivot.copy(pivotW.current);
    outer.current.rotation.set(initPitch, initYaw, 0);

    if (autoFrame && (camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const persp = camera as THREE.PerspectiveCamera;
      const fitR = sphere.radius * s;
      const d = (fitR * 1.2) / Math.sin(((persp.fov * Math.PI) / 180) / 2);
      persp.position.set(pivotW.current.x, pivotW.current.y, pivotW.current.z + d);
      persp.near = d / 10;
      persp.far = d * 10;
      persp.updateProjectionMatrix();
    }

    if (!fadeIn) onLoadedRef.current?.();
  }, [content, excludeKey, floorKey, fitRadius, lightweightMaterials, autoFrame, camera, fadeIn, initPitch, initYaw, onFit, pivot]);

  // 取景距离随 props 变化实时同步（断点切换取景时相机初始位置不会自动更新）
  useEffect(() => {
    const persp = camera as THREE.PerspectiveCamera;
    if (!persp.isPerspectiveCamera) return;
    if (Math.abs(persp.position.z - camZ) < 1e-4) return;
    persp.position.z = camZ;
    persp.updateProjectionMatrix();
    invalidate();
  }, [camera, camZ]);

  // 淡入单独一个 effect：只依赖模型与开关，避免父组件重渲染把淡入打断在半途
  useEffect(() => {
    if (!content) return;
    if (!fadeIn) return;
    const materials: { mat: THREE.Material; to: number }[] = [];
    content.traverse((o: THREE.Object3D) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.visible) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach((mat) => {
        // 半透明材质（如玻璃）的终值 = 基准透明度，不能一律淡到 1
        const to = typeof mat.userData.baseOpacity === 'number' ? mat.userData.baseOpacity : 1;
        mat.transparent = true;
        mat.opacity = 0;
        materials.push({ mat, to });
      });
    });
    let t = 0;
    const id = window.setInterval(() => {
      t += 0.05;
      const v = Math.min(t, 1);
      materials.forEach(({ mat, to }) => {
        mat.opacity = v * to;
      });
      invalidate();
      if (v === 1) {
        window.clearInterval(id);
        onLoadedRef.current?.();
      }
    }, 16);
    return () => window.clearInterval(id);
  }, [content, fadeIn]);

  useEffect(() => {
    if (!enableManualRotation || isTouch) return;
    const el = gl.domElement;
    let drag = false;
    let lx = 0;
    let ly = 0;

    const up = () => {
      drag = false;
    };

    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      drag = true;
      lx = e.clientX;
      ly = e.clientY;
      window.addEventListener('pointerup', up);
    };

    const move = (e: PointerEvent) => {
      if (!drag || !outer.current) return;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      outer.current.rotation.y += dx * ROTATE_SPEED;
      outer.current.rotation.x += dy * ROTATE_SPEED;
      vel.current = { x: dx * ROTATE_SPEED, y: dy * ROTATE_SPEED };
      invalidate();
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [gl, enableManualRotation]);

  useEffect(() => {
    if (!isTouch) return;
    const el = gl.domElement;
    const pts = new Map<number, { x: number; y: number }>();

    let mode: 'idle' | 'decide' | 'rotate' | 'pinch' = 'idle';
    let sx = 0;
    let sy = 0;
    let lx = 0;
    let ly = 0;
    let startDist = 0;
    let startZ = 0;

    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) {
        mode = 'decide';
        sx = lx = e.clientX;
        sy = ly = e.clientY;
      } else if (pts.size === 2 && enableManualZoom) {
        mode = 'pinch';
        const [p1, p2] = [...pts.values()];
        startDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        startZ = camera.position.z;
        e.preventDefault();
      }
      invalidate();
    };

    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      p.x = e.clientX;
      p.y = e.clientY;

      if (mode === 'decide') {
        const dx = e.clientX - sx;
        const dy = e.clientY - sy;
        if (Math.abs(dx) > DECIDE || Math.abs(dy) > DECIDE) {
          if (enableManualRotation && Math.abs(dx) > Math.abs(dy)) {
            mode = 'rotate';
            el.setPointerCapture(e.pointerId);
          } else {
            mode = 'idle';
            pts.clear();
          }
        }
      }

      if (mode === 'rotate') {
        if (e.cancelable) e.preventDefault();
        const dx = e.clientX - lx;
        const dy = e.clientY - ly;
        lx = e.clientX;
        ly = e.clientY;
        if (outer.current) {
          outer.current.rotation.y += dx * ROTATE_SPEED;
          outer.current.rotation.x += dy * ROTATE_SPEED;
        }
        vel.current = { x: dx * ROTATE_SPEED, y: dy * ROTATE_SPEED };
        invalidate();
      } else if (mode === 'pinch' && pts.size === 2) {
        if (e.cancelable) e.preventDefault();
        const [p1, p2] = [...pts.values()];
        const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const ratio = startDist / (d || 1);
        camera.position.z = THREE.MathUtils.clamp(startZ * ratio, minZoom, maxZoom);
        invalidate();
      }
    };

    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      if (mode === 'rotate' && pts.size === 0) mode = 'idle';
      if (mode === 'pinch' && pts.size < 2) mode = 'idle';
    };

    el.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('pointercancel', up, { passive: true });
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [gl, enableManualRotation, enableManualZoom, minZoom, maxZoom, camera]);

  useEffect(() => {
    if (isTouch) return;
    const mm = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      if (enableMouseParallax) tPar.current = { x: -nx * PARALLAX_MAG, y: -ny * PARALLAX_MAG };
      if (enableHoverRotation) tHov.current = { x: ny * HOVER_MAG, y: nx * HOVER_MAG };
      invalidate();
    };
    window.addEventListener('mousemove', mm);
    return () => window.removeEventListener('mousemove', mm);
  }, [enableMouseParallax, enableHoverRotation]);

  useFrame((_, dt) => {
    if (!outer.current) return;
    let need = false;
    cPar.current.x += (tPar.current.x - cPar.current.x) * PARALLAX_EASE;
    cPar.current.y += (tPar.current.y - cPar.current.y) * PARALLAX_EASE;
    const phx = cHov.current.x;
    const phy = cHov.current.y;
    cHov.current.x += (tHov.current.x - cHov.current.x) * HOVER_EASE;
    cHov.current.y += (tHov.current.y - cHov.current.y) * HOVER_EASE;

    const ndc = pivotW.current.clone().project(camera);
    ndc.x += xOff + cPar.current.x;
    ndc.y += yOff + cPar.current.y;
    outer.current.position.copy(ndc.unproject(camera));

    outer.current.rotation.x += cHov.current.x - phx;
    outer.current.rotation.y += cHov.current.y - phy;

    if (autoRotate) {
      outer.current.rotation.y += autoRotateSpeed * dt;
      need = true;
    }

    outer.current.rotation.y += vel.current.x;
    outer.current.rotation.x += vel.current.y;
    vel.current.x *= INERTIA;
    vel.current.y *= INERTIA;
    if (Math.abs(vel.current.x) > 1e-4 || Math.abs(vel.current.y) > 1e-4) need = true;

    if (
      Math.abs(cPar.current.x - tPar.current.x) > 1e-4 ||
      Math.abs(cPar.current.y - tPar.current.y) > 1e-4 ||
      Math.abs(cHov.current.x - tHov.current.x) > 1e-4 ||
      Math.abs(cHov.current.y - tHov.current.y) > 1e-4
    ) {
      need = true;
    }

    if (need) invalidate();
  });

  if (!content) return null;
  return (
    <group ref={outer}>
      <group ref={inner}>
        <primitive object={content} />
      </group>
    </group>
  );
}

export function ModelViewer({
  url,
  width = '100%',
  height = '100%',
  className = '',
  style,
  modelXOffset = 0,
  modelYOffset = 0,
  defaultRotationX = -50,
  defaultRotationY = 20,
  defaultZoom = 0.5,
  minZoomDistance = 0.5,
  maxZoomDistance = 10,
  enableMouseParallax = true,
  enableManualRotation = true,
  enableHoverRotation = true,
  enableManualZoom = true,
  ambientIntensity = 0.3,
  keyLightIntensity = 1,
  fillLightIntensity = 0.5,
  rimLightIntensity = 0.8,
  environment = 'hdr',
  environmentFiles,
  environmentIntensity = 1,
  autoFrame = false,
  excludeMeshes = [],
  fitRadius = 0.5,
  lightweightMaterials = false,
  floorMeshes = [],
  onFit,
  placeholderSrc,
  showScreenshotButton = false,
  fadeIn = false,
  autoRotate = false,
  autoRotateSpeed = 0.35,
  onModelLoaded,
}: ModelViewerProps) {
  useEffect(() => {
    if (url) {
      try {
        useGLTF.preload(url);
      } catch {
        // ignore preload errors
      }
    }
  }, [url]);

  const [floorY, setFloorY] = useState(-0.5);
  const onFitRef = useRef(onFit);
  onFitRef.current = onFit;
  const handleFit = useCallback((info: { floorY: number; radius: number }) => {
    setFloorY(info.floorY);
    onFitRef.current?.(info);
  }, []);

  const pivot = useRef(new THREE.Vector3()).current;
  const contactRef = useRef<any>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);

  const initYaw = deg2rad(defaultRotationX);
  const initPitch = deg2rad(defaultRotationY);
  const camZ = Math.min(Math.max(defaultZoom, minZoomDistance), maxZoomDistance);

  const capture = () => {
    const g = rendererRef.current;
    const s = sceneRef.current;
    const c = cameraRef.current;
    if (!g || !s || !c) return;
    g.shadowMap.enabled = false;
    const tmp: { l: THREE.Light; cast: boolean }[] = [];
    s.traverse((o) => {
      if ((o as THREE.Light).isLight && 'castShadow' in o) {
        const l = o as THREE.Light;
        tmp.push({ l, cast: l.castShadow });
        l.castShadow = false;
      }
    });
    if (contactRef.current) contactRef.current.visible = false;
    g.render(s, c);
    const urlPNG = g.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.download = 'model.png';
    a.href = urlPNG;
    a.click();
    g.shadowMap.enabled = true;
    tmp.forEach(({ l, cast }) => {
      l.castShadow = cast;
    });
    if (contactRef.current) contactRef.current.visible = true;
    invalidate();
  };

  return (
    <div
      className={className}
      style={{
        width,
        height,
        touchAction: 'pan-y pinch-zoom',
        position: 'relative',
        ...style,
      }}
    >
      {showScreenshotButton && (
        <button
          type="button"
          onClick={capture}
          className="absolute right-4 top-4 z-10 rounded-xl border border-white/30 bg-black/40 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/20"
        >
          Take Screenshot
        </button>
      )}

      <Canvas
        shadows
        frameloop="demand"
        gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}
        onCreated={({ gl, scene, camera }) => {
          rendererRef.current = gl;
          sceneRef.current = scene;
          cameraRef.current = camera;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
        camera={{ fov: 45, position: [0, 0, camZ], near: 0.01, far: 100 }}
        style={{ touchAction: 'pan-y pinch-zoom' }}
      >
        {/* 环境贴图（IBL）：hdr = 自托管真实 HDR（原站同款观感）；procedural = 零资产兜底 */}
        {environment === 'hdr' && environmentFiles && (
          <Suspense fallback={null}>
            <Environment files={environmentFiles} background={false} />
          </Suspense>
        )}
        {environment === 'procedural' && <ProceduralEnv intensity={environmentIntensity} />}

        <ambientLight intensity={ambientIntensity} />
        <directionalLight position={[5, 5, 5]} intensity={keyLightIntensity} castShadow />
        <directionalLight position={[-5, 2, 5]} intensity={fillLightIntensity} />
        <directionalLight position={[0, 4, -5]} intensity={rimLightIntensity} />

        <ContactShadows
          ref={contactRef}
          position={[0, floorY + 0.002, 0]}
          opacity={0.72}
          // scale 必须盖住整个模型（车 + 红布台座约 3~4 单位）：
          // 太小会让阴影在边缘被硬裁掉，太大则把阴影纹素摊薄、糊成一片
          scale={fitRadius * 4}
          blur={2.5}
          // far = 阴影平面往上多远参与投影。给到略高于车身，整个车才会压出「实心+柔边」的落地阴影
          far={fitRadius * 2.1}
          resolution={512}
        />

        <Suspense fallback={<Loader placeholderSrc={placeholderSrc} />}>
          <ModelInner
            url={url}
            xOff={modelXOffset}
            yOff={modelYOffset}
            pivot={pivot}
            initYaw={initYaw}
            initPitch={initPitch}
            minZoom={minZoomDistance}
            maxZoom={maxZoomDistance}
            enableMouseParallax={enableMouseParallax}
            enableManualRotation={enableManualRotation}
            enableHoverRotation={enableHoverRotation}
            enableManualZoom={enableManualZoom}
            autoFrame={autoFrame}
            fadeIn={fadeIn}
            autoRotate={autoRotate}
            autoRotateSpeed={autoRotateSpeed}
            camZ={camZ}
            excludeMeshes={excludeMeshes}
            fitRadius={fitRadius}
            lightweightMaterials={lightweightMaterials}
            floorMeshes={floorMeshes}
            onFit={handleFit}
            onLoaded={onModelLoaded}
          />
        </Suspense>

        {!isTouch && (
          <DesktopControls
            pivot={pivot}
            min={minZoomDistance}
            max={maxZoomDistance}
            zoomEnabled={enableManualZoom}
          />
        )}
      </Canvas>
    </div>
  );
}

export default ModelViewer;
