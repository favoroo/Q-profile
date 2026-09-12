import { useCallback, useMemo, useState } from 'react';
import { ModelViewer } from './ModelViewer';
import { withBase } from '../../lib/asset';
import { useMediaQuery, useViewportWidth } from '../../lib/useMediaQuery';

interface CarSceneBackgroundProps {
  showSlogan?: boolean;
}

/**
 * ToyCar.glb（Khronos 官方样例，也就是 React Bits ModelViewer 用的那个模型）里一共三个网格：
 *
 *  - `ToyCar`  绿色玩具赛车（自带 clearcoat 清漆车漆）
 *  - `Fabric`  车底下的红色绒布台座（自带 sheen 绒面光泽），比车身大 3~4 倍
 *  - `Glass`   车窗（原本用 transmission 折射，已降级为 alpha 玻璃）
 *
 * 红布是整套观感的灵魂（参考 React Bits 官方示例），所以**不能剔除**；但它的尺寸远大于车身，
 * 直接进包围盒会把车缩得极小、布铺满整屏。这里的做法是：整体（车 + 布）一起取景，
 * 再把取景参数与偏移调到「车在右下、布在下方铺开」的位置。
 */
const CAR_MESHES = ['toycar'];

/** 取景基准：1280px 宽时相机距离 0.8，屏越窄拉得越远，避免车被画面两侧裁掉 */
const BASE_WIDTH = 1280;
const BASE_ZOOM = 1.0;

export function CarSceneBackground({ showSlogan = true }: CarSceneBackgroundProps) {
  const [modelLoaded, setModelLoaded] = useState(false);
  const handleLoaded = useCallback(() => setModelLoaded(true), []);

  const viewportWidth = useViewportWidth();
  const isNarrow = useMediaQuery('(max-width: 1023px)');
  // 车模在屏幕上的占比随可视宽度变化，按屏宽反向补偿相机距离。
  // 上限不能给太大：手机屏窄，若按 1280/390 全额补偿（≈3.3）相机会拉得极远，
  // 车缩成指甲盖大小、光影细节全丢。收到 1.9 后手机上仍能看清车身与红绒布台。
  const zoom = Math.min(
    Math.max(BASE_ZOOM * (BASE_WIDTH / viewportWidth), BASE_ZOOM * 0.6),
    BASE_ZOOM * 1.9,
  );
  // 窄屏（手机 / 竖屏平板）下联系卡片几乎占满宽度，车只能退到卡片下方靠右陈列，
  // 靠太近会被卡片压住、太靠下又会被画布底边裁掉
  const xOffset = isNarrow ? 0.16 : 0.58;
  const yOffset = isNarrow ? -0.78 : -0.28;

  // 优先加载本地 public/models/ToyCar.glb
  const modelUrl = useMemo(() => {
    return withBase('/models/ToyCar.glb');
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden">
      {/* 3D ModelViewer 容器 - pointer-events-auto 允许 3D 旋转与视差交互 */}
      <div className="pointer-events-auto absolute inset-0 flex items-center justify-center">
        <ModelViewer
          url={modelUrl}
          width="100%"
          height="100%"
          modelXOffset={xOffset}
          modelYOffset={yOffset}
          defaultRotationX={-45}
          defaultRotationY={18}
          defaultZoom={zoom}
          minZoomDistance={0.6}
          maxZoomDistance={3}
          enableMouseParallax={true}
          enableHoverRotation={true}
          enableManualRotation={true}
          enableManualZoom={false}
          floorMeshes={CAR_MESHES}
          // hdr = 自托管真实摄影 HDR（public/hdr/forest_slope_1k.hdr，React Bits 同款文件），
          // 与 React Bits 官方示例的 Environment preset="forest" 同源同观感；
          // 材质保持原厂状态（不降级 transmission 玻璃、不动布料参数）—— 原示例也不碰材质。
          // 若个别机器复现早年「HDR 环境打挂 WebGL」的问题，改 environment="procedural" 一行即可回退。
          environment="hdr"
          environmentFiles={withBase('/hdr/forest_slope_1k.hdr')}
          lightweightMaterials={false}
          // 原站默认环境强度；灯光也用 React Bits 原版默认（ambient 0.3 / key 1 / fill 0.5 / rim 0.8）
          environmentIntensity={1}
          showScreenshotButton={false}
          autoRotate={false}
          fadeIn={true}
          onModelLoaded={handleLoaded}
        />
      </div>

      {/* 还原 React Bits 样式的发光动感标语 "Fast as lightning" */}
      {showSlogan && (
        <div
          className={`pointer-events-none absolute top-10 left-6 sm:top-14 sm:left-12 lg:left-20 xl:left-32 transition-all duration-1000 ease-out ${
            modelLoaded ? 'opacity-85 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="relative inline-block">
            <span
              className="font-sans text-[clamp(24px,4.2vw,48px)] font-black tracking-tighter text-white/90 uppercase italic select-none"
              style={{
                textShadow:
                  '0 0 20px rgba(255,255,255,0.6), 0 0 40px rgba(0,113,227,0.45), 0 0 80px rgba(0,113,227,0.25)',
                letterSpacing: '-0.02em',
              }}
            >
              Fast as lightning
            </span>
          </div>
        </div>
      )}

      {/* 柔和暗角与顶部过渡渐变，保证与黑色背景无缝过渡。
          暗角不能压太狠：车身恰好落在画布右缘，压到 /80 会把车漆镜面高光一起吃掉 */}
      <div className="pointer-events-none absolute inset-0 bg-radial-[circle_at_50%_40%] from-transparent via-black/25 to-black/70" />
      <div className="pointer-events-none absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black via-black/70 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-black via-black/70 to-transparent" />
    </div>
  );
}

export default CarSceneBackground;
