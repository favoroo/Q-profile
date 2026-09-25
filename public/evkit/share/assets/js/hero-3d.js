/* ============================================================================
   EVKit2 项目开发分享 — 首页 3D 交互展台 (Three.js)
   ----------------------------------------------------------------------------
   特性：
     1. 程序化三维建模还原 EVDiag Box2（正面面板、碳纤维背板、接口、插孔）
     2. 适配全站暖白纸感视觉（透明背景 + 柔和投射阴影）
     3. 视口可见性监听（离开视口自动暂停渲染，节约 GPU/CPU）
     4. 阻尼旋转、视角复位按钮与双击复位
   ========================================================================= */

import * as THREE from 'three';
import { OrbitControls } from '../vendor/three/OrbitControls.js';
import { RoundedBoxGeometry } from '../vendor/three/RoundedBoxGeometry.js';
import { RoomEnvironment } from '../vendor/three/RoomEnvironment.js';

(function initHero3D() {
  const container = document.getElementById('hero3d');
  if (!container) return;

  try {
    const w = container.clientWidth || 460;
    const h = container.clientHeight || 460;

  /* ── 1. 渲染器 / 场景 / 相机 / 控制器 ───────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // 性能：模型全程静止（只有相机在动），阴影内容恒定 —— 关闭逐帧阴影更新，
  // 场景组装完后烘焙一次即可，省掉每帧整个深度 pass（约 60 个 mesh）。
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const BASE_FOV = 32;
  const camera = new THREE.PerspectiveCamera(BASE_FOV, w / h, 8, 2000);
  const DEFAULT_CAM = { x: 155, y: -20, z: 246 };
  const DEFAULT_TARGET = { x: 0, y: 5, z: 0 };
  camera.position.set(DEFAULT_CAM.x, DEFAULT_CAM.y, DEFAULT_CAM.z);

  function updateCameraAspect(width, height) {
    if (width <= 0 || height <= 0) return;
    const aspect = width / height;
    camera.aspect = aspect;
    if (aspect < 1.0) {
      const halfV = Math.tan((BASE_FOV * Math.PI) / 360);
      camera.fov = (2 * Math.atan(halfV / aspect) * 180) / Math.PI;
    } else {
      camera.fov = BASE_FOV;
    }
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  updateCameraAspect(w, h);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.enableZoom = false; // ★ 默认禁用滚轮缩放：放行滚轮给页面正常滚动，避免误触卡顿
  controls.minDistance = 100;
  controls.maxDistance = 460;
  controls.target.set(DEFAULT_TARGET.x, DEFAULT_TARGET.y, DEFAULT_TARGET.z);
  controls.autoRotate = false; // 由下方定制的多维复合运镜算法接管

  /* ── 交互感知、主动拖拽与限时缩放控制 ─────────────────────────────── */
  const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let isInteracting = false;
  let autoOscillate = !prefersReduce;   // 减少动态偏好下不做自动巡航，仅保留手动拖拽
  let idleTimer = null;
  let zoomTimer = null;
  const ZOOM_ACTIVE_WINDOW = 3500;     // 主动拖拽后允许缩放的交互窗口期（3.5 秒）

  // 主动交互时临时激活滚轮缩放，闲置后自动关闭并恢复页面原生滚动
  function keepZoomActive() {
    controls.enableZoom = true;
    if (zoomTimer) clearTimeout(zoomTimer);
    zoomTimer = setTimeout(() => {
      controls.enableZoom = false;
    }, ZOOM_ACTIVE_WINDOW);
  }

  function disableZoomNow() {
    controls.enableZoom = false;
    if (zoomTimer) {
      clearTimeout(zoomTimer);
      zoomTimer = null;
    }
  }

  // 鼠标掠过微视差（增强空间悬浮感，不按住拖拽时也具灵动响应）
  let mouseParallaxX = 0;
  let mouseParallaxY = 0;
  let targetParallaxX = 0;
  let targetParallaxY = 0;

  let cachedRect = null;
  function updateCachedRect() {
    if (container) cachedRect = container.getBoundingClientRect();
  }

  if (!prefersReduce) {
    container.addEventListener('pointerenter', updateCachedRect, { passive: true });
    container.addEventListener('pointermove', (e) => {
      if (isInteracting) return;
      if (!cachedRect) updateCachedRect();
      const rect = cachedRect;
      if (!rect || !rect.width || !rect.height) return;
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;   // -1 ~ 1
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;  // -1 ~ 1
      targetParallaxX = Math.max(-1, Math.min(1, nx)) * 0.08;     // 约 ±4.5°
      targetParallaxY = Math.max(-1, Math.min(1, ny)) * 0.05;     // 约 ±2.8°
    }, { passive: true });

    container.addEventListener('pointerleave', () => {
      targetParallaxX = 0;
      targetParallaxY = 0;
      cachedRect = null;
    }, { passive: true });
  }

  function onInteractionStart() {
    isInteracting = true;
    autoOscillate = false;
    targetParallaxX = 0;
    targetParallaxY = 0;
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  }

  function scheduleResumeOscillate() {
    isInteracting = false;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      disableZoomNow();
      // 从用户当前交互停止的具体视角无缝平滑滑入巡航轨道
      _offset.subVectors(camera.position, controls.target);
      curSpherical.setFromVector3(_offset);
      autoOscillate = !prefersReduce;
    }, 2000); // 2 秒不操作后继续电影级多维巡航
  }

  // 仅当用户主动开始拖拽旋转模型时，才判定为聚焦操作，开启滚轮缩放窗口
  controls.addEventListener('start', () => {
    onInteractionStart();
    keepZoomActive();
  });
  controls.addEventListener('end', scheduleResumeOscillate);

  renderer.domElement.addEventListener('pointerdown', onInteractionStart, { passive: true });
  window.addEventListener('pointerup', () => {
    if (isInteracting) scheduleResumeOscillate();
  }, { passive: true });

  // 滚轮事件：只有在主动拖拽激活的 3.5 秒窗口内才响应并刷新窗口；默认状态完全放行给网页滚动
  renderer.domElement.addEventListener('wheel', () => {
    if (controls.enableZoom) {
      onInteractionStart();
      keepZoomActive();
      scheduleResumeOscillate();
    }
  }, { passive: true });

  /* ── 2. 灯光 ──────────────────────────────────────────────────────────── */
  scene.add(new THREE.HemisphereLight(0xffffff, 0x484b50, 0.95));

  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(45, 130, 80);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -110;
  key.shadow.camera.bottom = -110;
  key.shadow.camera.right = 110;
  key.shadow.camera.top = 110;
  key.shadow.camera.near = 10;
  key.shadow.camera.far = 400;
  key.shadow.bias = -0.0003;
  key.shadow.radius = 3.5;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.55);
  fill.position.set(-90, 30, -60);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 0.95);
  rim.position.set(0, 60, -120);
  scene.add(rim);

  const under = new THREE.DirectionalLight(0xfff2e0, 0.45);
  under.position.set(20, -90, 50);
  scene.add(under);

  // 暖白背景投射地面阴影：紧贴机身底部(-54.5)，自然聚拢，柔和羽化
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(360, 360),
    new THREE.ShadowMaterial({ opacity: 0.15 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -54.5;
  ground.receiveShadow = true;
  scene.add(ground);

  /* ── 3. 材质定义（磨砂工程塑料 + 亚光吸光橡胶 + 阳极金属） ─────── */
  const MAT = {
    shell:    new THREE.MeshStandardMaterial({ color: 0x2e3034, roughness: 0.65, metalness: 0.12 }),
    bumper:   new THREE.MeshStandardMaterial({ color: 0x1e2023, roughness: 0.75, metalness: 0.08 }),
    recess:   new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.8,  metalness: 0.05 }),
    dark:     new THREE.MeshStandardMaterial({ color: 0x101113, roughness: 0.6,  metalness: 0.18 }),
    red:      new THREE.MeshStandardMaterial({ color: 0xcc1a20, roughness: 0.38, metalness: 0.25 }),
    black:    new THREE.MeshStandardMaterial({ color: 0x18191b, roughness: 0.4,  metalness: 0.3 }),
    pin:      new THREE.MeshStandardMaterial({ color: 0xa6aab0, roughness: 0.25, metalness: 0.9 }),
    light:    new THREE.MeshStandardMaterial({ color: 0x222428, roughness: 0.5,  metalness: 0.1 }),
    button:   new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.45, metalness: 0.2 }),
    ringDark: new THREE.MeshStandardMaterial({ color: 0x232327, roughness: 0.55, metalness: 0.1 }),
    usbBase:  new THREE.MeshStandardMaterial({ color: 0x383a3e, roughness: 0.5,  metalness: 0.15 }),
    hole:     new THREE.MeshBasicMaterial({ color: 0x070709 }),
    ring:     new THREE.MeshBasicMaterial({ color: 0x32353a }),
  };

  /* ── 4. Canvas 贴图生成 ────────────────────────────────────────────────── */
  function makeCanvas(width, height) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return [c, c.getContext('2d')];
  }

  function toTexture(canvas) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }

  function roundRectPath(ctx, x, y, rw, rh, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + rw, y, x + rw, y + rh, r);
    ctx.arcTo(x + rw, y + rh, x, y + rh, r);
    ctx.arcTo(x, y + rh, x, y, r);
    ctx.arcTo(x, y, x + rw, y, r);
    ctx.closePath();
  }

  // 正面面板（高度还原真机四叶草导光孔、实机字体排版与图标）
  function drawFrontPanel() {
    const [c, ctx] = makeCanvas(1024, 1024);
    // 细腻磨砂亚光质感底色
    const g = ctx.createLinearGradient(0, 0, 0, 1024);
    g.addColorStop(0, '#212326');
    g.addColorStop(1, '#17181b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 1024);

    // 细微的磨砂粒子噪点
    ctx.fillStyle = 'rgba(255,255,255,0.015)';
    for (let i = 0; i < 2800; i++) {
      ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 1.5, 1.5);
    }

    // 红色精细内嵌倒角边框（真机比例与圆角）
    ctx.strokeStyle = '#ed1c24';
    ctx.lineWidth = 7.5;
    roundRectPath(ctx, 46, 46, 932, 932, 38);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // AUTEL（实机为极富张力的红色特粗倾斜字）
    ctx.save();
    ctx.translate(512, 290);
    ctx.transform(1, 0, -0.11, 1, 0, 0);
    ctx.fillStyle = '#ed1c24';
    ctx.font = '900 120px "Segoe UI", Arial, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('AUTEL', 0, 0);
    ctx.restore();

    // EVDiag Box2
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 90px "Segoe UI", Arial, sans-serif';
    ctx.fillText('EVDiag Box2', 512, 415);

    // 红色细分割线（真机长度与文字匹配）
    ctx.strokeStyle = '#ed1c24';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(345, 488);
    ctx.lineTo(679, 488);
    ctx.stroke();

    // 4 行状态指示（四叶草LED + 图标 + 文字标签）
    const rows = [
      { label: 'HV', icon: drawIconHV },
      { label: 'BAT+', icon: drawIconBattery },
      { label: 'Connection', icon: drawIconLink },
      { label: 'Power/Battery', icon: drawIconPower },
    ];

    rows.forEach((row, i) => {
      const cy = 605 + i * 102;

      // 标志性四叶草 LED 导光窗
      drawCloverLED(ctx, 395, cy);

      // 矢量功能图标
      row.icon(ctx, 448, cy);

      // 英文功能标识
      ctx.fillStyle = '#eceef2';
      ctx.font = '600 44px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(row.label, 502, cy + 1);
      ctx.textAlign = 'center';
    });

    return toTexture(c);
  }

  // 真机标志性：四叶草/四瓣凹花 LED 金属导光孔
  function drawCloverLED(ctx, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);

    // 外圈深色凹坑
    const gradOut = ctx.createRadialGradient(0, -2, 2, 0, 0, 20);
    gradOut.addColorStop(0, '#3a3d42');
    gradOut.addColorStop(0.7, '#1b1c20');
    gradOut.addColorStop(1, '#0f1013');
    ctx.fillStyle = gradOut;
    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#52565c';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, Math.PI * 2);
    ctx.stroke();

    // 内部四叶草发光金属柱
    const petalR = 5.2;
    const dist = 6.4;
    ctx.fillStyle = '#dde2e8';

    for (let a = 0; a < 4; a++) {
      const rad = (a * Math.PI) / 2;
      const px = Math.cos(rad) * dist;
      const py = Math.sin(rad) * dist;
      ctx.beginPath();
      ctx.arc(px, py, petalR, 0, Math.PI * 2);
      ctx.fill();
    }
    // 中心导光圆
    ctx.beginPath();
    ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
    ctx.fill();

    // 核心微小深色定位孔
    ctx.fillStyle = '#1c1d21';
    ctx.beginPath();
    ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 图标1：HV 黄色警示实心三角 + 内部感叹号
  function drawIconHV(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#ffd100';
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(21, 14);
    ctx.lineTo(-21, 14);
    ctx.closePath();
    ctx.fill();

    // 内部黑色叹号
    ctx.fillStyle = '#111315';
    roundRectPath(ctx, -2.5, -9, 5, 12, 1.5);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 8.5, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 图标2：BAT+ 汽车蓄电池（带极柱及内部字样）
  function drawIconBattery(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    // 电池箱体
    ctx.strokeStyle = '#eceef2';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.strokeRect(-21, -11, 42, 23);

    // 顶部正负极接线柱
    ctx.fillStyle = '#eceef2';
    ctx.fillRect(-16, -16, 7, 5);
    ctx.fillRect(9, -16, 7, 5);

    // 内部 BAT+ 字样
    ctx.font = '800 13px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BAT+', 0, 1);
    ctx.restore();
  }

  // 图标3：Connection 双环扣连
  function drawIconLink(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#eceef2';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';

    // 左圆角环
    ctx.beginPath();
    ctx.arc(-8, 0, 10, Math.PI * 0.45, Math.PI * 1.55);
    ctx.lineTo(2, -10);
    ctx.stroke();

    // 右圆角环
    ctx.beginPath();
    ctx.arc(8, 0, 10, -Math.PI * 0.55, Math.PI * 0.45);
    ctx.lineTo(-2, 10);
    ctx.stroke();

    // 连接斜杠
    ctx.beginPath();
    ctx.moveTo(-6, -6);
    ctx.lineTo(6, 6);
    ctx.stroke();
    ctx.restore();
  }

  // 图标4：Power/Battery 待机电源
  function drawIconPower(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#eceef2';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.arc(0, 2.5, 14, -Math.PI * 0.35, Math.PI * 1.35);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.lineTo(0, 0);
    ctx.stroke();
    ctx.restore();
  }

  // 背面碳纤维纹理 + 贴纸
  function drawBackPanel() {
    const [c, ctx] = makeCanvas(1024, 1024);
    ctx.fillStyle = '#0f1012';
    ctx.fillRect(0, 0, 1024, 1024);
    const cell = 26;
    for (let j = 0; j < 1024 / cell; j++) {
      for (let i = 0; i < 1024 / cell; i++) {
        const cx = i * cell;
        const cy = j * cell;
        const horiz = (i + j) % 2 === 0;
        const grd = horiz
          ? ctx.createLinearGradient(cx, cy, cx + cell, cy)
          : ctx.createLinearGradient(cx, cy, cx, cy + cell);
        grd.addColorStop(0, '#0c0d0f');
        grd.addColorStop(0.5, '#282b30');
        grd.addColorStop(1, '#0c0d0f');
        ctx.fillStyle = grd;
        ctx.fillRect(cx + 0.6, cy + 0.6, cell - 1.2, cell - 1.2);
      }
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.translate(512, 300);
    ctx.transform(1, 0, -0.14, 1, 0, 0);
    ctx.font = '900 128px Arial, sans-serif';
    ctx.fillStyle = '#33363b';
    ctx.fillText('AUTEL', 0, 4);
    ctx.fillStyle = '#08090a';
    ctx.fillText('AUTEL', 0, 0);
    ctx.restore();

    const sx = 222, sy = 520, sw = 580, sh = 360;
    ctx.fillStyle = '#0c0d0e';
    roundRectPath(ctx, sx, sy, sw, sh, 18);
    ctx.fill();
    ctx.strokeStyle = '#2c2e31';
    ctx.lineWidth = 3;
    roundRectPath(ctx, sx, sy, sw, sh, 18);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ed1c24';
    ctx.font = '900 42px Arial';
    ctx.fillText('AUTEL', sx + 36, sy + 62);
    ctx.fillStyle = '#e8eaec';
    ctx.font = '600 34px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('EVDiag Box2', sx + sw - 36, sy + 62);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#9aa0a6';
    ctx.font = '400 23px Arial';
    const lines = [
      'Model: EVDiag Box2        Input: 12V ⎓ 2A',
      'CAT II 1000V / CAT III 600V',
      'S/N: EVB2-2024-0001',
      'Autel Intelligent Technology Corp., Ltd.',
    ];
    lines.forEach((t, i) => ctx.fillText(t, sx + 36, sy + 128 + i * 42));
    ctx.fillStyle = '#c9ccd0';
    ctx.font = '700 30px Arial';
    ctx.fillText('CE', sx + 36, sy + sh - 46);

    ctx.fillStyle = '#dfe1e3';
    ctx.fillRect(sx + sw - 150, sy + sh - 140, 110, 110);
    ctx.fillStyle = '#111';
    for (let a = 0; a < 7; a++) {
      for (let b = 0; b < 7; b++) {
        if ((a * 3 + b * 5) % 3 === 0) {
          ctx.fillRect(sx + sw - 140 + a * 13, sy + sh - 130 + b * 13, 9, 9);
        }
      }
    }
    return toTexture(c);
  }

  // 侧边真机质感：细密菱形微凸网纹 + 4 处内凹手指导向槽
  function drawGripTexture() {
    const [c, ctx] = makeCanvas(256, 512);
    ctx.fillStyle = '#18191c';
    ctx.fillRect(0, 0, 256, 512);

    // 细密菱形网纹（与真机一致的高密度质感）
    const step = 10;
    ctx.strokeStyle = '#2b2e34';
    ctx.lineWidth = 1.4;
    for (let d = -512; d < 512; d += step) {
      ctx.beginPath();
      ctx.moveTo(d, 0);
      ctx.lineTo(d + 512, 512);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(d + 512, 0);
      ctx.lineTo(d, 512);
      ctx.stroke();
    }

    ctx.strokeStyle = '#0e0f11';
    ctx.lineWidth = 0.8;
    for (let d = -512; d < 512; d += step) {
      ctx.beginPath();
      ctx.moveTo(d + 1.5, 0);
      ctx.lineTo(d + 513.5, 512);
      ctx.stroke();
    }

    // 4 处真机横向内凹手指握持槽（阴影底 + 高光顶，呈现立体内凹感）
    const grooveYs = [61, 191, 321, 451];
    grooveYs.forEach((gy) => {
      // 凹陷深色
      ctx.fillStyle = '#0c0d0f';
      roundRectPath(ctx, 16, gy - 8, 224, 16, 7);
      ctx.fill();

      // 下边缘反光
      ctx.strokeStyle = '#383b42';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(22, gy + 8);
      ctx.lineTo(234, gy + 8);
      ctx.stroke();
    });

    return toTexture(c);
  }

  // 顶边接口丝印
  function drawTopStrip() {
    const [c, ctx] = makeCanvas(512, 128);
    ctx.fillStyle = '#0e0e10';
    ctx.fillRect(0, 0, 512, 128);

    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    roundRectPath(ctx, 7, 5, 498, 118, 11);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    roundRectPath(ctx, 8, 10, 496, 112, 10);
    ctx.stroke();

    ctx.strokeStyle = '#d8d8d8';
    ctx.fillStyle = '#d8d8d8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineCap = 'round';
    const X = (f) => f * 512;

    let cx = X(0.12), cy = 28;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 11, Math.PI * 0.62, Math.PI * 2.38);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 12);
    ctx.lineTo(cx, cy + 1);
    ctx.stroke();

    ctx.font = '700 26px Arial';
    ctx.fillText('DC IN 12V', X(0.38), 22);
    cx = X(0.38);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 22, 40);
    ctx.lineTo(cx + 22, 40);
    ctx.stroke();
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(cx - 22, 47);
    ctx.lineTo(cx + 22, 47);
    ctx.stroke();
    ctx.setLineDash([]);

    cx = X(0.8);
    cy = 22;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 10);
    ctx.lineTo(cx, cy - 5);
    ctx.lineTo(cx - 4.5, cy + 1);
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx + 4.5, cy + 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - 6.5, cy + 12.5, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 6.5, cy + 12.5, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + 13.5, 2.8, 0, Math.PI * 2);
    ctx.fill();
    return toTexture(c);
  }

  // 底边接口丝印（精准对应真机白色标识与警示框）
  function drawBottomStrip() {
    const [c, ctx] = makeCanvas(512, 128);
    ctx.fillStyle = '#121316';
    ctx.fillRect(0, 0, 512, 128);
    const X = (f) => f * 512;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // BMS 白色标识
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 20px "Segoe UI", Arial, sans-serif';
    ctx.fillText('BMS', X(0.185), 22);

    // 香蕉插口端口标示
    ctx.font = '700 13px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#dce0e5';
    ctx.fillText('SENSE-', X(0.43), 20);
    ctx.fillText('SOURCE-', X(0.545), 20);

    ctx.fillStyle = '#f04b50';
    ctx.fillText('SENSE+', X(0.66), 20);
    ctx.fillText('SOURCE+', X(0.775), 20);

    // 底部白/灰框线
    ctx.strokeStyle = '#6e7278';
    ctx.lineWidth = 1.8;
    bracket(ctx, X(0.40), X(0.575), 98);
    bracket(ctx, X(0.63), X(0.805), 98);

    // 1000V DC 警示标注
    ctx.fillStyle = '#cda235';
    ctx.font = '600 12.5px "Segoe UI", Arial, sans-serif';
    ctx.fillText('⚠ 1000V ⎓', X(0.4875), 114);

    ctx.fillStyle = '#e64e54';
    ctx.fillText('⚠ 1000V ⎓', X(0.7175), 114);
    return toTexture(c);
  }

  function bracket(ctx, x1, x2, y) {
    ctx.beginPath();
    ctx.moveTo(x1, y - 7);
    ctx.lineTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.lineTo(x2, y - 7);
    ctx.stroke();
  }

  // BMS 多针插孔端面
  function drawBMSFace() {
    const [c, ctx] = makeCanvas(256, 96);
    ctx.fillStyle = '#c2c6c9';
    ctx.fillRect(0, 0, 256, 96);
    ctx.strokeStyle = '#8d9195';
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, 244, 84);
    ctx.fillStyle = '#a7abae';
    ctx.fillRect(10, 44, 236, 8);
    ctx.fillStyle = '#17181a';
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(26 + i * 27, 16, 14, 20);
      ctx.fillRect(26 + i * 27, 60, 14, 20);
    }
    return toTexture(c);
  }

  /* ── 5. 模型组装 ──────────────────────────────────────────────────────── */
  const device = new THREE.Group();
  scene.add(device);

  function add(geo, mat, x = 0, y = 0, z = 0, parent = device) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  // ── 5.1 主体外壳（一体化机身轮廓：微拱上下檐 + 四角45°外扩倒圆角 + 侧边4道人体工学指槽） ──
  const shellShape = new THREE.Shape();
  const topY = 49.6;
  const botY = -49.6;

  // 从顶部正中开始，逆时针闭合平滑对称外轮廓
  shellShape.moveTo(0, topY);
  // 顶边微拱延伸
  shellShape.quadraticCurveTo(22, topY, 37.0, 49.0);
  // 顶边分型切口（微阶梯缺口）
  shellShape.lineTo(38.2, 48.0);
  // 四角 45° 饱满圆滑外轮廓（真机外角缓冲体天然连贯轮廓）
  shellShape.quadraticCurveTo(50.0, 50.0, 50.0, 38.2);
  // 侧边分型切口（微阶梯缺口）
  shellShape.lineTo(48.0, 37.0);
  shellShape.lineTo(47.6, 33.5);

  // 右侧 4 处指槽凹弧（y = 22.5, 7.5, -7.5, -22.5）
  const scallops = [22.5, 7.5, -7.5, -22.5];
  scallops.forEach((sy) => {
    shellShape.lineTo(47.6, sy + 4.2);
    shellShape.quadraticCurveTo(45.2, sy, 47.6, sy - 4.2);
  });
  shellShape.lineTo(47.6, -33.5);

  // 右下角 45° 饱满外轮廓
  shellShape.lineTo(48.0, -37.0);
  shellShape.lineTo(50.0, -38.2);
  shellShape.quadraticCurveTo(50.0, -50.0, 38.2, -48.0);
  shellShape.lineTo(37.0, -49.0);
  shellShape.quadraticCurveTo(22, botY, 0, botY);

  // 左下角 45° 饱满外轮廓
  shellShape.quadraticCurveTo(-22, botY, -37.0, -49.0);
  shellShape.lineTo(-38.2, -48.0);
  shellShape.quadraticCurveTo(-50.0, -50.0, -50.0, -38.2);
  shellShape.lineTo(-48.0, -37.0);
  shellShape.lineTo(-47.6, -33.5);

  // 左侧 4 处指槽凹弧（自下而上）
  [-22.5, -7.5, 7.5, 22.5].forEach((sy) => {
    shellShape.lineTo(-47.6, sy - 4.2);
    shellShape.quadraticCurveTo(-45.2, sy, -47.6, sy + 4.2);
  });
  shellShape.lineTo(-47.6, 33.5);

  // 左上角 45° 饱满外轮廓
  shellShape.lineTo(-48.0, 37.0);
  shellShape.lineTo(-50.0, 38.2);
  shellShape.quadraticCurveTo(-50.0, 50.0, -38.2, 48.0);
  shellShape.lineTo(-37.0, 49.0);
  shellShape.quadraticCurveTo(-22, topY, 0, topY);

  const shellGeo = new THREE.ExtrudeGeometry(shellShape, {
    depth: 20.4,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 1.8,
    bevelThickness: 1.8,
  });
  shellGeo.center();
  shellGeo.computeVertexNormals();
  add(shellGeo, MAT.shell);

  // ── 5.2 四角背面紧固沉孔与定位孔环 ──
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sy]) => {
    // 背面紧固沉孔与定位孔环
    const ring = add(new THREE.RingGeometry(3.0, 4.4, 24), MAT.ring, 44.5 * sx, 44.5 * sy, -12.15);
    ring.rotation.y = Math.PI;
    ring.castShadow = false;
    const hole = add(new THREE.CircleGeometry(3.0, 24), MAT.hole, 44.5 * sx, 44.5 * sy, -12.16);
    hole.rotation.y = Math.PI;
    hole.castShadow = false;
  });

  // ── 5.3 正面内框周圈环形倒角棱线（还原特写中红框外侧的 45° 倒角沉孔斜肩） ──
  const frameOuter = new THREE.Shape();
  const frameInner = new THREE.Path();
  const ow = 39.5, oh = 39.5, oc = 7.0;
  frameOuter.moveTo(-ow + oc, -oh);
  frameOuter.lineTo(ow - oc, -oh);
  frameOuter.lineTo(ow, -oh + oc);
  frameOuter.lineTo(ow, oh - oc);
  frameOuter.lineTo(ow - oc, oh);
  frameOuter.lineTo(-ow + oc, oh);
  frameOuter.lineTo(-ow, oh - oc);
  frameOuter.lineTo(-ow, -oh + oc);
  frameOuter.closePath();

  const iw = 37.0, ih = 37.0, ic = 5.0;
  frameInner.moveTo(-iw + ic, -ih);
  frameInner.lineTo(iw - ic, -ih);
  frameInner.lineTo(iw, -ih + ic);
  frameInner.lineTo(iw, ih - ic);
  frameInner.lineTo(iw - ic, ih);
  frameInner.lineTo(-iw + ic, ih);
  frameInner.lineTo(-iw, ih - ic);
  frameInner.lineTo(-iw, -ih + ic);
  frameInner.closePath();
  frameOuter.holes.push(frameInner);

  const innerFrameGeo = new THREE.ExtrudeGeometry(frameOuter, {
    depth: 0.6,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.4,
    bevelThickness: 0.4,
  });
  innerFrameGeo.center();
  add(innerFrameGeo, MAT.bumper, 0, 0, 12.05);

  // 正面印刷面板（Autel EVDiag Box2、红色细框、LED 状态灯全面清晰显现）
  const frontArtMat = new THREE.MeshStandardMaterial({
    map: drawFrontPanel(),
    roughness: 0.45,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const frontArt = new THREE.Mesh(new THREE.PlaneGeometry(74, 74), frontArtMat);
  frontArt.position.z = 12.08;
  device.add(frontArt);

  // 背面碳纤维面板与产品标识
  const backArtMat = new THREE.MeshStandardMaterial({
    map: drawBackPanel(),
    roughness: 0.5,
    metalness: 0.15,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const backArt = new THREE.Mesh(new THREE.PlaneGeometry(74, 74), backArtMat);
  backArt.position.z = -12.08;
  backArt.rotation.y = Math.PI;
  device.add(backArt);

  // ── 5.4 左右人体工学侧边握把与 4 处横向握持槽 ──
  const gripTex = drawGripTexture();
  [-1, 1].forEach((s) => {
    add(new RoundedBoxGeometry(2.5, 59, 21, 2, 1.2), MAT.bumper, 47.6 * s, 0, 0);
    const gp = new THREE.Mesh(
      new THREE.PlaneGeometry(21.0, 59),
      new THREE.MeshStandardMaterial({ map: gripTex, roughness: 0.5, metalness: 0.05 })
    );
    gp.rotation.y = (s * Math.PI) / 2;
    gp.position.x = 48.2 * s;
    gp.receiveShadow = true;
    device.add(gp);

    // 4 道真实人体工学横向内凹握槽筋（精确对齐 y = 22.5, 7.5, -7.5, -22.5 处指槽）
    [-22.5, -7.5, 7.5, 22.5].forEach((gy) => {
      add(new RoundedBoxGeometry(3.0, 3.2, 19.5, 2, 1.0), MAT.dark, 47.8 * s, gy, 0);
    });
  });

  // 顶边接口区（基准 Z 从 -5.5 前移至 -1.5，避免偏后悬空）
  add(new RoundedBoxGeometry(54, 1.4, 14, 2, 0.8), MAT.dark, 0, 49.9, -1.5);
  add(new RoundedBoxGeometry(64, 2.6, 3, 2, 1), MAT.bumper, 0, 50.3, -10.0);
  add(new RoundedBoxGeometry(64, 2.6, 3, 2, 1), MAT.bumper, 0, 50.3, 7.0);
  add(new RoundedBoxGeometry(5, 2.6, 14, 2, 1), MAT.bumper, -29.5, 50.3, -1.5);
  add(new RoundedBoxGeometry(5, 2.6, 14, 2, 1), MAT.bumper, 29.5, 50.3, -1.5);

  const topStripMat = new THREE.MeshStandardMaterial({
    map: drawTopStrip(),
    roughness: 0.6,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const topStrip = new THREE.Mesh(new THREE.PlaneGeometry(54, 14), topStripMat);
  topStrip.rotation.x = -Math.PI / 2;
  topStrip.position.set(0, 50.95, -1.5);
  topStrip.castShadow = false;
  topStrip.receiveShadow = false;
  device.add(topStrip);

  const TXt = (f) => -27 + f * 54;
  add(new THREE.CylinderGeometry(3.0, 3.0, 1.6, 24), MAT.button, TXt(0.12), 51.3, -1.5);
  add(new THREE.BoxGeometry(6, 1.4, 5.5), MAT.black, TXt(0.38), 51.25, -0.9);
  add(new THREE.CylinderGeometry(1.9, 1.9, 1.8, 20), MAT.hole, TXt(0.38), 51.3, -0.9);
  add(new THREE.CylinderGeometry(0.55, 0.55, 2.2, 12), MAT.pin, TXt(0.38), 51.35, -0.9);
  add(new THREE.CylinderGeometry(3.4, 3.4, 0.7, 26), MAT.ringDark, TXt(0.53), 51.05, -1.5);
  add(new THREE.CylinderGeometry(2.6, 2.6, 1.1, 26), MAT.hole, TXt(0.53), 51.2, -1.5);

  add(new THREE.BoxGeometry(8.5, 1.0, 6.0), MAT.usbBase, TXt(0.8), 51.2, -1.5);
  const usbShape = new THREE.Shape();
  usbShape.moveTo(-2.9, -2.3);
  usbShape.lineTo(2.9, -2.3);
  usbShape.lineTo(2.9, 0.8);
  usbShape.lineTo(1.6, 2.3);
  usbShape.lineTo(-1.6, 2.3);
  usbShape.lineTo(-2.9, 0.8);
  usbShape.closePath();
  const usbCore = new THREE.Mesh(
    new THREE.ExtrudeGeometry(usbShape, { depth: 0.8, bevelEnabled: false }),
    MAT.dark
  );
  usbCore.rotation.x = -Math.PI / 2;
  usbCore.position.set(TXt(0.8), 51.0, -1.5);
  usbCore.castShadow = true;
  device.add(usbCore);

  // 底边接口区（同步微调基准 Z 至 -1.5，保持机身上下对称端正）
  add(new RoundedBoxGeometry(54, 1.4, 14, 2, 0.8), MAT.dark, 0, -49.9, -1.5);
  add(new RoundedBoxGeometry(64, 2.6, 3, 2, 1), MAT.bumper, 0, -50.3, -10.0);
  add(new RoundedBoxGeometry(64, 2.6, 3, 2, 1), MAT.bumper, 0, -50.3, 7.0);
  add(new RoundedBoxGeometry(5, 2.6, 14, 2, 1), MAT.bumper, -29.5, -50.3, -1.5);
  add(new RoundedBoxGeometry(5, 2.6, 14, 2, 1), MAT.bumper, 29.5, -50.3, -1.5);

  const bottomStripMat = new THREE.MeshStandardMaterial({
    map: drawBottomStrip(),
    roughness: 0.6,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const bottomStrip = new THREE.Mesh(new THREE.PlaneGeometry(54, 14), bottomStripMat);
  bottomStrip.rotation.x = Math.PI / 2;
  bottomStrip.position.set(0, -50.95, -1.5);
  bottomStrip.castShadow = false;
  bottomStrip.receiveShadow = false;
  device.add(bottomStrip);

  add(new RoundedBoxGeometry(13, 1.2, 6.5, 2, 0.5), MAT.light, TXt(0.185), -51.2, -1.5);
  const bmsFace = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 4.5),
    new THREE.MeshStandardMaterial({ map: drawBMSFace(), roughness: 0.55 })
  );
  bmsFace.rotation.x = Math.PI / 2;
  bmsFace.position.set(TXt(0.185), -51.81, -1.5);
  device.add(bmsFace);

  const ringBlack = new THREE.MeshBasicMaterial({ color: 0x46494e });
  const ringRed   = new THREE.MeshBasicMaterial({ color: 0x8e1218 });
  [
    [0.43, MAT.black, ringBlack],
    [0.545, MAT.black, ringBlack],
    [0.66, MAT.red, ringRed],
    [0.775, MAT.red, ringRed],
  ].forEach(([f, m, rm]) => {
    const x = TXt(f);
    add(new THREE.CylinderGeometry(3.2, 3.2, 2.2, 24), m, x, -51.3, -2.0);
    const ring = add(new THREE.RingGeometry(1.7, 2.5, 20), rm, x, -52.42, -2.0);
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = false;
    add(new THREE.CylinderGeometry(1.6, 1.6, 2.4, 16), MAT.hole, x, -51.35, -2.0);
  });
  add(new RoundedBoxGeometry(2.5, 1.4, 4.5, 2, 0.6), MAT.dark, TXt(0.94), -51.3, -1.5);

  /* ── 6. 视角复位交互与往复摆动状态 ─────────────────────────────────── */
  const defaultOffset = new THREE.Vector3().subVectors(
    new THREE.Vector3(DEFAULT_CAM.x, DEFAULT_CAM.y, DEFAULT_CAM.z),
    new THREE.Vector3(DEFAULT_TARGET.x, DEFAULT_TARGET.y, DEFAULT_TARGET.z)
  );
  const baseSpherical = new THREE.Spherical().setFromVector3(defaultOffset);
  const curSpherical = new THREE.Spherical();
  const clock = new THREE.Clock();

  function resetCamera() {
    disableZoomNow();
    controls.target.set(DEFAULT_TARGET.x, DEFAULT_TARGET.y, DEFAULT_TARGET.z);
    camera.position.set(DEFAULT_CAM.x, DEFAULT_CAM.y, DEFAULT_CAM.z);
    controls.update();
    targetParallaxX = 0;
    targetParallaxY = 0;
    mouseParallaxX = 0;
    mouseParallaxY = 0;
    scheduleResumeOscillate();
  }

  // 双击 3D 画布区域一键平滑复位
  renderer.domElement.addEventListener('dblclick', resetCamera);

  // 场景组装完毕：下一帧烘焙一次阴影（autoUpdate 已关），此后每帧直接复用
  renderer.shadowMap.needsUpdate = true;

  /* ── 7. 渲染循环与电影级多维运镜 ─────────────────────────────────────── */
  let isVisible = true;
  let animId = null;
  const _offset = new THREE.Vector3();   // 预分配复用，避免每帧 new 产生 GC 抖动

  function loop() {
    if (!isVisible) return;

    // 动态帧时间差：摆脱锁帧限制，在 60Hz/120Hz/144Hz 等各类高刷屏幕下保持同等极致顺滑
    const delta = Math.min(clock.getDelta(), 0.08);

    // 鼠标微视差平滑跟随
    if (!prefersReduce) {
      const pLerp = 1.0 - Math.exp(-5.0 * delta);
      mouseParallaxX += (targetParallaxX - mouseParallaxX) * pLerp;
      mouseParallaxY += (targetParallaxY - mouseParallaxY) * pLerp;
    }

    if (autoOscillate && !isInteracting) {
      const t = clock.getElapsedTime();

      // 1. 水平航向角 (Theta)：双频谐波复合波形
      // 主波周期约 28s (0.224 rad/s)，副波周期约 14s (0.448 rad/s)
      // 覆盖正面、立体 3/4 黄金角与侧方外壳轮廓，转到正面微慢留驻，转到侧面流畅自然
      const thetaBase = 0.16;
      const waveTheta1 = 0.65 * Math.sin(t * 0.224);
      const waveTheta2 = 0.14 * Math.sin(t * 0.448 + 0.4);
      let targetTheta = thetaBase + waveTheta1 + waveTheta2;

      // 2. 垂直俯仰角 (Phi)：错频立体呼吸（周期约 21s，与水平周期错开形成 Lissajous 空间轨迹）
      // 在 1.38 rad (约 79° 俯视看顶部插孔与倒角) 到 1.65 rad (约 94.5° 微仰视显工业厚重感) 之间起伏
      const phiBase = 1.51;
      const wavePhi = 0.13 * Math.sin(t * 0.299 + 1.2);
      let targetPhi = phiBase + wavePhi;

      // 3. 景深推拉 (Radius)：呼吸式进退
      // 周期约 25s (0.251 rad/s)，距离在 276 ~ 308 之间随韵律呼吸，特写与全貌兼备
      const radiusBase = 292;
      const waveRadius = 16 * Math.sin(t * 0.251 + 2.5);
      let targetRadius = radiusBase + waveRadius;

      // 4. 镜头视线焦点微动 (Target Center Floating)
      // 消除轴心定死的机械感，给设备赋予仿佛悬浮于展台空气中的悬浮生命力
      const curTargetX = DEFAULT_TARGET.x + 1.5 * Math.sin(t * 0.224);
      const curTargetY = DEFAULT_TARGET.y + 2.2 * Math.cos(t * 0.299);
      const curTargetZ = DEFAULT_TARGET.z;

      // 5. 叠加柔和的鼠标视差微动
      targetTheta += mouseParallaxX;
      targetPhi += mouseParallaxY;

      _offset.subVectors(camera.position, controls.target);
      curSpherical.setFromVector3(_offset);

      let diffTheta = targetTheta - curSpherical.theta;
      while (diffTheta > Math.PI) diffTheta -= 2 * Math.PI;
      while (diffTheta < -Math.PI) diffTheta += 2 * Math.PI;

      // 基于真实时间的指数阻尼逼近（Critically Damped），杜绝任何生硬跳变
      const smoothAlpha = 1.0 - Math.exp(-2.4 * delta);
      curSpherical.theta += diffTheta * smoothAlpha;
      curSpherical.phi += (targetPhi - curSpherical.phi) * smoothAlpha;
      curSpherical.radius += (targetRadius - curSpherical.radius) * smoothAlpha;
      curSpherical.makeSafe();

      controls.target.x += (curTargetX - controls.target.x) * smoothAlpha;
      controls.target.y += (curTargetY - controls.target.y) * smoothAlpha;
      controls.target.z += (curTargetZ - controls.target.z) * smoothAlpha;

      camera.position.setFromSpherical(curSpherical).add(controls.target);
      camera.lookAt(controls.target);
    }

    controls.update();
    renderer.render(scene, camera);
    animId = requestAnimationFrame(loop);
  }

  // 唤醒渲染循环：彻底消除首帧时间差与高速回顶时的掉帧抢占
  function resumeLoop() {
    if (!isVisible || animId) return;

    // 若当前正在由回到顶部触发的极速平滑滚动中，暂缓唤醒，等滑行落顶后再平滑接入
    if (window.__isSmoothScrollingToTop && (window.pageYOffset || document.documentElement.scrollTop) > 10) {
      function onSettle() {
        window.removeEventListener('scrollsettled', onSettle);
        resumeLoop();
      }
      window.addEventListener('scrollsettled', onSettle);
      return;
    }

    // 关键：消费并清空休眠期间累积的时间差，杜绝首帧 delta 冲击和视角跳变
    clock.getDelta();
    animId = requestAnimationFrame(loop);
  }

  // 视口观察器：离开可视区域时停止动画
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          resumeLoop();
        } else if (animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
      });
    }, { threshold: 0.05 });
    observer.observe(container);
  } else {
    resumeLoop();
  }

  // 容器大小变化监听
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        updateCameraAspect(width, height);
      }
    });
    ro.observe(container);
  } else {
    window.addEventListener('resize', () => {
      updateCameraAspect(container.clientWidth, container.clientHeight);
    });
  }
  } catch (err) {
    console.error('[Hero3D 初始化失败]', err);
  }
})();
