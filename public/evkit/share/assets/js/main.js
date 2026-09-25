/* ============================================================================
   EVKit2 项目开发分享 — 交互
   ----------------------------------------------------------------------------
   单文件、零依赖、零外部请求。

   性能纪律（贯穿全文件）：
     · 绝不在 scroll / resize 回调里读写会触发重排的属性
     · 滚动只在**一个** requestAnimationFrame 里处理，且只读一次 scrollY
     · 需要布局数据的部分在 measure() 里集中读一次并缓存，resize 时防抖刷新
     · IntersectionObserver 触发后立即 unobserve（一次性，长页面不反复计算）
   ========================================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var supportsScrollTimeline =
    window.CSS && CSS.supports && CSS.supports('animation-timeline', 'scroll()');

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* ══════════════════════════════════════════════════════════════════════
     1. 滚动揭示
     元素先由 CSS 置为 opacity:0 / translateY(14px)，进入视口后加 .is-in。
     同一批进入视口时按序给 transition-delay，形成错落感。
     ══════════════════════════════════════════════════════════════════════ */
  function initReveal() {
    var items = $$('.reveal');
    if (!items.length) return;

    // 降级：不做位移，直接全部可见
    if (prefersReduce || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      var shown = entries.filter(function (e) { return e.isIntersecting; });
      shown.forEach(function (entry, i) {
        var el = entry.target;
        // 同批错落 70ms，最多叠到 6 档，避免长列表尾部的等待过久
        el.style.setProperty('--d', Math.min(i, 6) * 70 + 'ms');
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, {
      root: null,
      // 底部收进 10%：元素刚露头不触发，等它真正进入阅读区再出现
      rootMargin: '0px 0px -10% 0px',
      threshold: 0
    });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ══════════════════════════════════════════════════════════════════════
     2. 滚动联动：进度条 + 侧栏目录进度 + 顶栏描边 + 回到顶部
     全部合并进一个 rAF，布局数据来自 measure() 缓存。
     ══════════════════════════════════════════════════════════════════════ */
  var progressBar = $('.progress__bar');
  var navFill = $('.indexnav__fill');
  var topbar = $('#topbar');
  var totop = $('#totop');
  var showcase = $('#showcase');
  var sections = $$('.section');
  var activateSpy = null;

  var M = { tops: [], heights: [], docH: 0, winH: 0, max: 1, showcaseTop: 0 };

  function measure() {
    M.winH = window.innerHeight;
    M.docH = root.scrollHeight;
    M.max = Math.max(1, M.docH - M.winH);
    M.tops = sections.map(function (el) {
      return el.getBoundingClientRect().top + window.pageYOffset;
    });
    M.heights = sections.map(function (el) { return el.offsetHeight; });
    if (showcase) {
      M.showcaseTop = showcase.getBoundingClientRect().top + window.pageYOffset;
    }
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.pageYOffset;
      var p = clamp(y / M.max, 0, 1);

      // 进度条：支持滚动驱动动画的浏览器由 CSS 负责，这里只做兜底
      if (!supportsScrollTimeline && progressBar) {
        progressBar.style.setProperty('--p', p.toFixed(4));
      }

      // 侧栏进度：按"当前章节 + 章节内推进度"折算，比整页百分比更有信息量
      if (navFill && M.tops.length) {
        var fill = p;
        var anchor = y + M.winH * 0.45;
        if (anchor < M.tops[0]) {
          fill = 0;
          if (activateSpy) activateSpy(null);
        } else {
          for (var i = 0; i < M.tops.length; i++) {
            var top = M.tops[i];
            var h = M.heights[i] || 1;
            if (anchor < top + h || i === M.tops.length - 1) {
              var inner = clamp((anchor - top) / h, 0, 1);
              var spanCount = Math.max(1, M.tops.length - 1);
              fill = (i + inner) / spanCount;
              break;
            }
          }
        }
        navFill.style.setProperty('--navp', clamp(fill, 0, 1).toFixed(4));
      }

      // 判定是否进入底部全屏展台区域（视口底部接触展台上方 30% 时渐隐顶栏与侧栏）
      var atShowcase = false;
      if (M.showcaseTop > 0) {
        atShowcase = (y + M.winH * 0.6) >= M.showcaseTop;
      }
      root.classList.toggle('is-at-showcase', atShowcase);

      if (topbar) topbar.classList.toggle('is-stuck', y > 8);
      if (totop) {
        var isVis = y > M.winH * 0.9 && !atShowcase;
        totop.classList.toggle('is-vis', isVis);
        if (isVis) {
          totop.style.setProperty('--scroll-p', p.toFixed(4));
        }
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     3. 章节导航高亮（scroll-spy）
     用一条"视口 45% 处的横线"判定当前章节，不依赖 scroll 事件。
     ══════════════════════════════════════════════════════════════════════ */
  function initSpy() {
    if (!sections.length || !('IntersectionObserver' in window)) return;

    var links = {};
    $$('.indexnav__link').forEach(function (a) { links[a.getAttribute('data-spy')] = a; });
    var curLabel = $('#navselect-cur');
    var defaultLabel = curLabel ? curLabel.textContent.trim() : '';
    var current = null;

    function activate(id) {
      if (id === current) return;
      current = id;
      Object.keys(links).forEach(function (k) {
        links[k].setAttribute('aria-current', k === id ? 'true' : 'false');
      });
      if (curLabel) {
        if (!id) {
          curLabel.textContent = defaultLabel;
        } else {
          for (var i = 0; i < sections.length; i++) {
            if (sections[i].id === id) {
              var noEl = sections[i].querySelector('.sec-head__no span');
              var titleEl = sections[i].querySelector('.sec-head__title');
              if (noEl && titleEl) {
                curLabel.textContent = noEl.textContent.trim() + ' · ' + titleEl.textContent.trim();
              }
              break;
            }
          }
        }
      }
    }

    activateSpy = activate;

    var visible = new Set();

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) visible.add(e.target);
        else visible.delete(e.target);
      });

      // 触底时强制点亮最后一章：最后一屏较短时可能够不到 45% 判定线
      var atBottom = root.scrollHeight - window.innerHeight - 2 <= window.pageYOffset;
      if (atBottom) {
        activate(sections[sections.length - 1].id);
        return;
      }
      if (!visible.size) {
        // 利用 measure() 缓存的位置判定是否在第一章上方，杜绝 getBoundingClientRect 导致的重排
        if (M.tops.length && window.pageYOffset + window.innerHeight * 0.45 < M.tops[0]) {
          activate(null);
        }
        return;
      }

      // 同时命中时取文档位置最靠前的那个（按 sections 原生顺序首个匹配，零重排计算）
      var best = null;
      for (var s = 0; s < sections.length; s++) {
        if (visible.has(sections[s])) {
          best = sections[s];
          break;
        }
      }
      if (best) activate(best.id);
    }, {
      // 只留视口 45%~50% 之间那条窄带作为判定区
      rootMargin: '-45% 0px -50% 0px',
      threshold: 0
    });

    sections.forEach(function (s) { spy.observe(s); });

    // 初始化：若初始 URL 带有对应章节锚点则激活，否则处于顶部默认不激活任何章节
    var initialId = location.hash.replace('#', '');
    if (initialId && links[initialId]) {
      activate(initialId);
    } else {
      activate(null);
    }

    // 点击目录或顶栏后同步高亮（平滑滚动期间 spy 可能来不及更新）
    window.addEventListener('hashchange', function () {
      var id = location.hash.replace('#', '');
      if (id && links[id]) {
        activate(id);
      } else if (!id || id === 'top') {
        activate(null);
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     4. 窄屏章节下拉
     ══════════════════════════════════════════════════════════════════════ */
  function initNavSelect() {
    var box = $('#navselect');
    if (!box) return;
    var btn = $('.navselect__btn', box);

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = box.getAttribute('data-open') === 'true';
      box.setAttribute('data-open', open ? 'false' : 'true');
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
    });

    document.addEventListener('click', function () {
      if (box.getAttribute('data-open') === 'true') {
        box.setAttribute('data-open', 'false');
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    box.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        box.setAttribute('data-open', 'false');
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && box.getAttribute('data-open') === 'true') {
        box.setAttribute('data-open', 'false');
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     5. 图片灯箱
     只用**一个** <img> 元素：切图时替换 src，旧位图由浏览器回收，
     不必为「上一张 / 下一张」各留一个槽位吃内存（2176×1600 一张就 13.9MB）。
     ══════════════════════════════════════════════════════════════════════ */
  function initLightbox() {
    var dlg = $('#lightbox');
    if (!dlg || typeof dlg.showModal !== 'function') return;

    var stage = $('#lbStage');
    var img = $('#lbImg');
    var capEl = $('#lbCap');
    var countEl = $('#lbCount');
    var btnPrev = $('#lbPrev');
    var btnNext = $('#lbNext');
    var btnIn = $('#lbIn');
    var btnOut = $('#lbOut');
    var btnReset = $('#lbReset');
    var btnClose = $('#lbClose');

    // 按 data-group 归类，灯箱内左右切换只在同组内进行
    var groups = {};
    $$('[data-lightbox]').forEach(function (btn) {
      var g = btn.getAttribute('data-group') || 'all';
      (groups[g] = groups[g] || []).push(btn);
    });

    var seq = [];       // 当前组的按钮序列
    var idx = 0;
    var scale = 1, tx = 0, ty = 0;
    var MIN = 0.5, MAX = 4;
    var lastFocus = null;
    var lockedY = 0;
    var hintTimer = null;
    var wheelTimer = null;
    var curNw = 0, curNh = 0;

    function calcBaseSize(nw, nh) {
      var maxW = Math.min(window.innerWidth * 0.94, window.innerWidth - 48);
      var maxH = Math.min(window.innerHeight * 0.80, window.innerHeight - 136);
      if (!nw || !nh || maxW <= 0 || maxH <= 0) return { w: '', h: '' };

      var fitScale = Math.min(maxW / nw, maxH / nh);
      var scaleRatio;
      if (fitScale >= 1) {
        // 小图自适应适度放大：确保长边达到舒适视觉尺寸（约 600px），避免放大后显得太小
        var targetLong = Math.min(620, maxW, maxH);
        var curLong = Math.max(nw, nh);
        var upscale = Math.max(1, targetLong / curLong);
        scaleRatio = Math.min(fitScale, Math.min(upscale, 2.6));
      } else {
        // 大图：等比缩小以完整容纳进视口安全区域
        scaleRatio = fitScale;
      }
      return {
        w: Math.round(nw * scaleRatio) + 'px',
        h: Math.round(nh * scaleRatio) + 'px'
      };
    }

    function showHint() {
      dlg.setAttribute('data-touched', 'false');
      if (hintTimer) clearTimeout(hintTimer);
      hintTimer = setTimeout(function () {
        dlg.setAttribute('data-touched', 'true');
      }, 2500);
    }

    function apply() {
      img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
      dlg.classList.toggle('is-zoomed', scale > 1.001);
      btnOut.disabled = scale <= MIN + 0.001;
      btnIn.disabled = scale >= MAX - 0.001;
      btnReset.disabled = scale <= MIN + 0.001 && tx === 0 && ty === 0;
    }

    function resetZoom() { scale = 1; tx = 0; ty = 0; apply(); }

    function zoomAt(factor, cursorX, cursorY) {
      var next = clamp(scale * factor, MIN, MAX);
      if (Math.abs(next - scale) < 0.0001) return;
      // 让光标下的那个点在缩放前后停在原位
      tx = cursorX - next * (cursorX - tx) / scale;
      ty = cursorY - next * (cursorY - ty) / scale;
      scale = next;
      if (scale <= MIN + 0.001) { tx = 0; ty = 0; }
      apply();
    }

    /* 背景滚动锁 —— 必须用 html{overflow:hidden}，不能用 body{position:fixed}。
       body{position:fixed} 会把 body 移出文档流，文档高度随即塌陷到一屏，
       浏览器立刻把 scrollY 归零；关闭时再恢复静态定位，页面就永远跳回顶部了。
       在 html 上关掉 overflow 不改变任何布局，滚动位置原样保留。 */
    function lockScroll() {
      lockedY = window.pageYOffset;
      root.style.overflow = 'hidden';
    }

    function unlockScroll() {
      root.style.overflow = '';
      // 兜底：个别浏览器在锁定期间仍可能改动滚动位置
      if (Math.abs(window.pageYOffset - lockedY) > 1) {
        window.scrollTo(0, lockedY);
      }
    }

    function load(btn) {
      var full = btn.getAttribute('data-full');
      var cap = btn.getAttribute('data-cap') || btn.getAttribute('aria-label') || '';

      img.setAttribute('data-hide', 'true');   // CSS 映射为 opacity:0 —— 切图即交叉淡入
      resetZoom();
      capEl.textContent = cap;

      var pending = new Image();
      pending.decoding = 'async';
      pending.onload = function () {
        curNw = pending.naturalWidth;
        curNh = pending.naturalHeight;
        var size = calcBaseSize(curNw, curNh);
        img.style.width = size.w;
        img.style.height = size.h;
        img.src = full;
        img.alt = cap;
        // 等浏览器真正解码完成再显示，避免"先小后大"的尺寸跳变
        (img.decode ? img.decode().catch(function () {}) : Promise.resolve())
          .then(function () {
            img.removeAttribute('data-hide');
            // 始终默认 1.0 倍全图完整呈现，确保所有表格列与图表内容均完整可见
          });
      };
      pending.onerror = function () {
        img.removeAttribute('data-hide');
        capEl.textContent = '图片加载失败';
      };
      pending.src = full;

      var n = seq.indexOf(btn);
      idx = n < 0 ? 0 : n;
      countEl.textContent = (idx + 1) + ' / ' + seq.length;
      btnPrev.disabled = idx === 0;
      btnNext.disabled = idx === seq.length - 1;
      showHint();
    }

    function syncLaser(toDialog) {
      var laser = $('#laserPointer');
      if (!laser) return;
      if (toDialog) {
        if (dlg && laser.parentNode !== dlg) {
          dlg.appendChild(laser);
        }
      } else {
        if (laser.parentNode !== document.body) {
          document.body.appendChild(laser);
        }
      }
    }

    function open(btn) {
      seq = groups[btn.getAttribute('data-group') || 'all'] || [btn];
      lastFocus = btn;
      lockScroll();
      dlg.setAttribute('data-anim', 'in');     // 入场前状态
      load(btn);
      dlg.showModal();
      syncLaser(true);
      // 双 rAF：先让浏览器按"入场前"状态渲染一帧，再切到就绪态。
      // 若在同一帧内改状态，起始态与结束态会被合并，过渡根本不会播放。
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          dlg.setAttribute('data-anim', 'ready');
        });
      });
    }

    function close() {
      dlg.close();
    }

    function step(delta) {
      var n = idx + delta;
      if (n < 0 || n >= seq.length) return;
      load(seq[n]);
    }

    // 事件委托：整页只需要一个监听器
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-lightbox]');
      if (btn) { e.preventDefault(); open(btn); }
    });

    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', function () { step(-1); });
    btnNext.addEventListener('click', function () { step(1); });
    btnIn.addEventListener('click', function () { zoomAt(1.28, 0, 0); });
    btnOut.addEventListener('click', function () { zoomAt(1 / 1.28, 0, 0); });
    btnReset.addEventListener('click', function () { resetZoom(); });

    // 点空白处关闭（点在图上不关）
    stage.addEventListener('click', function (e) {
      if (e.target === stage) close();
    });

    // 关闭：解除滚动锁并还原焦点。滚动位置由 lockScroll 的机制本身保住，
    // 这里再补一次 scrollTo 兜底，确保任何浏览器下都不会跳回顶部。
    dlg.addEventListener('close', function () {
      syncLaser(false);
      unlockScroll();
      if (hintTimer) clearTimeout(hintTimer);
      if (wheelTimer) clearTimeout(wheelTimer);
      img.style.transition = '';
      dlg.removeAttribute('data-anim');   // 清空状态，下次打开重新走 in → ready
      img.removeAttribute('src');
      img.style.transform = '';
      img.style.width = '';
      img.style.height = '';
      curNw = 0;
      curNh = 0;
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    });

    // 窗口尺寸变化时，若灯箱打开则自适应重算尺寸
    window.addEventListener('resize', function () {
      if (dlg.open && curNw && curNh) {
        var size = calcBaseSize(curNw, curNh);
        img.style.width = size.w;
        img.style.height = size.h;
      }
    });

    /* 双击缩放：未放大时以双击点为中心放大至 1.8 倍，已放大时平滑重置 */
    stage.addEventListener('dblclick', function (e) {
      e.preventDefault();
      dlg.setAttribute('data-touched', 'true');
      if (scale > 1.05) {
        resetZoom();
      } else {
        var r = stage.getBoundingClientRect();
        var cx = e.clientX - (r.left + r.width / 2);
        var cy = e.clientY - (r.top + r.height / 2);
        zoomAt(1.8, cx, cy);
      }
    });

    /* 键盘 */
    dlg.addEventListener('keydown', function (e) {
      dlg.setAttribute('data-touched', 'true');
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomAt(1.28, 0, 0); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomAt(1 / 1.28, 0, 0); }
      else if (e.key === '0') { e.preventDefault(); resetZoom(); }
    });

    /* 滚轮缩放：以指针位置为锚点 */
    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = stage.getBoundingClientRect();
      var cx = e.clientX - (r.left + r.width / 2);
      var cy = e.clientY - (r.top + r.height / 2);
      img.style.transition = 'none';
      zoomAt(e.deltaY < 0 ? 1.16 : 1 / 1.16, cx, cy);
      dlg.setAttribute('data-touched', 'true');
      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(function () {
        img.style.transition = '';
      }, 150);
    }, { passive: false });

    /* 指针拖拽（鼠标 / 触控笔） */
    var dragging = false, sx = 0, sy = 0, otx = 0, oty = 0;

    stage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;      // 触摸交给下面的 touch 处理（要支持双指）
      dragging = true;
      sx = e.clientX; sy = e.clientY; otx = tx; oty = ty;
      dlg.classList.add('is-panning');
      stage.setPointerCapture && stage.setPointerCapture(e.pointerId);
    });

    stage.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      tx = otx + (e.clientX - sx);
      ty = oty + (e.clientY - sy);
      apply();
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      dlg.classList.remove('is-panning');
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    /* 触摸：单指平移、双指缩放、单指快速横滑切换 */
    var tStart = null, pinch = 0, pinchScale = 1, swipeFrom = null;
    var lastTap = 0;

    function dist(t) {
      var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
    function mid(t) {
      var r = stage.getBoundingClientRect();
      return {
        x: (t[0].clientX + t[1].clientX) / 2 - (r.left + r.width / 2),
        y: (t[0].clientY + t[1].clientY) / 2 - (r.top + r.height / 2)
      };
    }

    stage.addEventListener('touchstart', function (e) {
      dlg.setAttribute('data-touched', 'true');
      if (e.touches.length === 2) {
        pinch = dist(e.touches); pinchScale = scale;
        tStart = null;
        img.style.transition = 'none';   // 捏合期间禁用过渡，缩放才能逐帧跟手
      } else if (e.touches.length === 1) {
        if (scale > 1.001) img.style.transition = 'none';   // 放大态单指平移同理
        tStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, tx: tx, ty: ty };
        swipeFrom = { x: tStart.x, y: tStart.y, moved: false };
      }
    }, { passive: true });

    stage.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2 && pinch) {
        e.preventDefault();
        var d = dist(e.touches);
        var m = mid(e.touches);
        var target = clamp(pinchScale * (d / pinch), MIN, MAX);
        var factor = target / scale;
        zoomAt(factor, m.x, m.y);
      } else if (e.touches.length === 1 && tStart) {
        var dx = e.touches[0].clientX - tStart.x;
        var dy = e.touches[0].clientY - tStart.y;
        if (scale > 1.001) {
          e.preventDefault();
          tx = tStart.tx + dx;
          ty = tStart.ty + dy;
          apply();
        }
        if (swipeFrom && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) swipeFrom.moved = true;
      }
    }, { passive: false });

    stage.addEventListener('touchend', function (e) {
      if (e.touches.length === 0) {
        img.style.transition = '';   // 手指全部离开：先恢复过渡，双击缩放才能平滑播放
        // 双击放大/还原（移动端 double tap）
        if (swipeFrom && !swipeFrom.moved && e.changedTouches && e.changedTouches.length === 1) {
          var now = Date.now();
          if (now - lastTap < 320) {
            e.preventDefault();
            dlg.setAttribute('data-touched', 'true');
            if (scale > 1.05) {
              resetZoom();
            } else {
              var r = stage.getBoundingClientRect();
              var ct = e.changedTouches[0];
              var cx = ct.clientX - (r.left + r.width / 2);
              var cy = ct.clientY - (r.top + r.height / 2);
              zoomAt(1.8, cx, cy);
            }
            lastTap = 0;
            pinch = 0; tStart = null; swipeFrom = null;
            return;
          }
          lastTap = now;
        }

        // 未放大时的快速横滑 = 切换上下张
        if (swipeFrom && swipeFrom.moved && scale <= 1.001) {
          var dx = (e.changedTouches[0] ? e.changedTouches[0].clientX : 0) - swipeFrom.x;
          var dy = (e.changedTouches[0] ? e.changedTouches[0].clientY : 0) - swipeFrom.y;
          if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
            step(dx < 0 ? 1 : -1);
          }
        }
        pinch = 0; tStart = null; swipeFrom = null;
      } else if (e.touches.length === 1) {
        pinch = 0;
        tStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, tx: tx, ty: ty };
      }
    }, { passive: false });

    apply();
  }

  /* ══════════════════════════════════════════════════════════════════════
     6. 视频：点击前零字节，点击后才挂 src
     ══════════════════════════════════════════════════════════════════════ */
  function initVideos() {
    $$('.video').forEach(function (box) {
      var cover = $('.video__cover', box);
      var video = $('.video__el', box);
      if (!cover || !video) return;

      cover.addEventListener('click', function () {
        if (!video.getAttribute('src')) {
          video.setAttribute('src', box.getAttribute('data-src'));
          video.setAttribute('preload', 'auto');
        }
        box.classList.add('is-playing');
        var p = video.play();
        if (p && p.catch) p.catch(function () { /* 用户未交互或格式不支持时静默 */ });
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     7. 折叠代码块
     正文做轻量 Markdown 渲染（## 小节 / - 列表 / 1. 有序 / 空行分段）。
     原始 pre 原样保留（data-ep 编辑链路依赖它），正常模式只显示渲染视图，
     编辑模式（body[data-edit-mode="1"]）由 CSS 反转为显示原文、隐藏视图。
     全程 createElement/textContent 构建，不做 innerHTML 拼接，天然防注入。
     ══════════════════════════════════════════════════════════════════════ */
  function renderCodeView(box) {
    var pre = $('.code__clip pre', box);
    if (!pre) return;
    var view = document.createElement('div');
    view.className = 'code__view';

    var lines = pre.textContent.replace(/\r\n?/g, '\n').split('\n');
    var ul = null, ol = null, p = null;
    function drop() { ul = null; ol = null; p = null; }

    lines.forEach(function (raw) {
      var line = raw.replace(/\t/g, '  ');
      var t = line.trim();
      if (!t) { drop(); return; }

      var m;
      // ## 小节标题
      if ((m = t.match(/^#{1,4}\s+(.+)$/))) {
        drop();
        var h = document.createElement('h4');
        h.className = 'code__h';
        h.textContent = m[1];
        view.appendChild(h);
        return;
      }
      // 无序列表（缩进 ≥2 空格 → 挂到上一条目的子列表）
      if ((m = line.match(/^(\s*)[-•]\s+(.+)$/))) {
        ol = null; p = null;
        var top = ul;
        if (!top) {
          top = document.createElement('ul');
          top.className = 'code__ul';
          view.appendChild(top);
          ul = top;
        }
        var host = top;
        if (m[1].length >= 2) {
          var lastLi = top.lastElementChild;
          if (lastLi) {
            if (!lastLi._sub) {
              var sub = document.createElement('ul');
              sub.className = 'code__ul code__ul--sub';
              lastLi.appendChild(sub);
              lastLi._sub = sub;
            }
            host = lastLi._sub;
          }
        }
        var li = document.createElement('li');
        li.textContent = m[2];
        host.appendChild(li);
        return;
      }
      // 有序列表（连续条目共用一个 ol，计数器才能连续递增）
      if ((m = t.match(/^\d+[.、]\s+(.+)$/))) {
        ul = null; p = null;
        if (!ol) {
          ol = document.createElement('ol');
          ol.className = 'code__ol';
          view.appendChild(ol);
        }
        var oli = document.createElement('li');
        oli.textContent = m[1];
        ol.appendChild(oli);
        return;
      }
      // 普通段落（连续行以空格拼接）
      drop();
      if (!p) {
        p = document.createElement('p');
        view.appendChild(p);
      }
      p.appendChild(document.createTextNode((p.firstChild ? ' ' : '') + t));
    });

    var clip = $('.code__clip', box);
    if (clip) clip.appendChild(view);
  }

  function initCode() {
    $$('.code').forEach(function (box) {
      renderCodeView(box);

      var btn = $('.code__toggle', box);
      var verb = $('.code__verb', box);
      if (!btn) return;

      btn.addEventListener('click', function () {
        var open = box.getAttribute('data-open') === 'true';
        box.setAttribute('data-open', open ? 'false' : 'true');
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        // 按钮文案由模板注入（content.json 的 ui 节），带兜底
        if (verb) verb.textContent = open
          ? (btn.getAttribute('data-verb-open') || '展开全文')
          : (btn.getAttribute('data-verb-close') || '收起');
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     8. 复制内网工具地址
     ══════════════════════════════════════════════════════════════════════ */
  function initCopy() {
    $$('[data-copy-path]').forEach(function (btn) {
      var originalText = btn.innerHTML;
      var timer = null;
      btn.addEventListener('click', function () {
        var path = btn.getAttribute('data-copy-path');
        if (!path) return;
        var done = function () {
          btn.classList.add('is-copied');
          btn.innerHTML = '<span style="font-size:10px;">已复制</span>';
          clearTimeout(timer);
          timer = setTimeout(function () {
            btn.classList.remove('is-copied');
            btn.innerHTML = originalText;
          }, 1800);
        };
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(path).then(done).catch(function () { fallback(path, done); });
        } else {
          fallback(path, done);
        }
      });
    });

    $$('[data-copy]').forEach(function (btn) {
      var originalTitle = btn.getAttribute('title') || '';
      var timer = null;

      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy');
        var done = function () {
          // 反馈：切换为对勾图标 + 临时改 title（ui.copied_label）
          btn.classList.add('is-copied');
          btn.setAttribute('title', btn.getAttribute('data-copied') || '已复制');
          clearTimeout(timer);
          timer = setTimeout(function () {
            btn.classList.remove('is-copied');
            btn.setAttribute('title', originalTitle);
          }, 1600);
        };
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(done).catch(function () { fallback(text, done); });
        } else {
          fallback(text, done);
        }
      });
    });

    // 代码块标题栏的复制按钮：复制本块 pre 的全文
    $$('.code__copybtn').forEach(function (btn) {
      var originalTitle = btn.getAttribute('title') || '';
      var timer = null;

      btn.addEventListener('click', function () {
        var code = btn.closest('.code');
        var pre = code ? $('.code__clip pre', code) : null;
        if (!pre) return;
        var text = pre.textContent;
        var done = function () {
          btn.classList.add('is-copied');
          btn.setAttribute('title', btn.getAttribute('data-copied') || '已复制');
          clearTimeout(timer);
          timer = setTimeout(function () {
            btn.classList.remove('is-copied');
            btn.setAttribute('title', originalTitle);
          }, 1600);
        };
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(done).catch(function () { fallback(text, done); });
        } else {
          fallback(text, done);
        }
      });
    });

    function fallback(text, done) {
      // 局域网 http 下 clipboard API 不可用（非 secure context），退回临时输入框
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        done();
      } catch (e) { /* 静默降级为可手工选中的纯文本 */ }
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     9. 回到顶部
     ══════════════════════════════════════════════════════════════════════ */
  var scrollSettleTimer = null;
  function markSmoothScrollingToTop() {
    window.__isSmoothScrollingToTop = true;
    if (scrollSettleTimer) clearTimeout(scrollSettleTimer);

    function onScrollEndCheck() {
      if (scrollSettleTimer) clearTimeout(scrollSettleTimer);
      scrollSettleTimer = setTimeout(function () {
        window.__isSmoothScrollingToTop = false;
        window.removeEventListener('scroll', onScrollEndCheck);
        // 向全站（尤其是 3D 展台）广播平滑落顶事件，允许以零掉帧的姿态恢复渲染
        window.dispatchEvent(new CustomEvent('scrollsettled'));
      }, 100);
    }

    window.addEventListener('scroll', onScrollEndCheck, { passive: true });
    // 1.8s 最大超时保底，防止意外卡在标记态
    setTimeout(function () {
      if (window.__isSmoothScrollingToTop) {
        window.__isSmoothScrollingToTop = false;
        window.removeEventListener('scroll', onScrollEndCheck);
        window.dispatchEvent(new CustomEvent('scrollsettled'));
      }
    }, 1800);
  }

  function initTop() {
    if (totop) {
      totop.addEventListener('click', function () {
        markSmoothScrollingToTop();
        window.scrollTo({ top: 0, behavior: prefersReduce ? 'auto' : 'smooth' });
      });
    }
    // 点击顶栏 mark 回到顶部同样接入平滑滚动保护
    var topMark = $('.topbar__mark');
    if (topMark) {
      topMark.addEventListener('click', function () {
        markSmoothScrollingToTop();
      });
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     10. 签到 / 问卷二维码侧边浮窗（左右分立无遮挡）
     ══════════════════════════════════════════════════════════════════════ */
  function initQrModal() {
    var openBtn = $('#qrOpenBtn');
    var hud = $('#qrModal');
    if (!openBtn || !hud) return;

    var closeBtns = $$('.qrhud__close', hud);
    var timer = null;
    var isOpen = false;

    function open() {
      if (timer) clearTimeout(timer);
      isOpen = true;
      hud.classList.remove('is-leaving');
      hud.classList.add('is-active', 'is-entering');
      hud.setAttribute('aria-hidden', 'false');
      openBtn.classList.add('is-active');
      openBtn.setAttribute('aria-expanded', 'true');
      root.classList.add('is-qr-open');

      timer = setTimeout(function () {
        hud.classList.remove('is-entering');
        timer = null;
      }, 420);
    }

    function close() {
      if (!isOpen) return;
      if (timer) clearTimeout(timer);
      isOpen = false;
      hud.classList.remove('is-entering');
      hud.classList.add('is-leaving');
      openBtn.classList.remove('is-active');
      openBtn.setAttribute('aria-expanded', 'false');
      root.classList.remove('is-qr-open');

      timer = setTimeout(function () {
        hud.classList.remove('is-active', 'is-leaving');
        hud.setAttribute('aria-hidden', 'true');
        timer = null;
      }, 260);
    }

    function toggle() {
      if (isOpen) {
        close();
      } else {
        open();
      }
    }

    openBtn.addEventListener('click', toggle);

    closeBtns.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        close();
      });
    });

    // 窄屏下点击背景蒙层关闭
    hud.addEventListener('click', function (e) {
      if (e.target === hud) {
        close();
      }
    });

    // 快捷键：Esc 关闭，Ctrl+D (或 Cmd+D) 唤出/隐藏
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) {
        close();
        return;
      }

      var mod = e.ctrlKey || e.metaKey;
      if (mod && !e.altKey && !e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        var active = document.activeElement;
        var tag = active && active.tagName ? active.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea' || (active && active.isContentEditable)) {
          return;
        }
        e.preventDefault();
        toggle();
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     11. 工具卡演示视频弹窗
     点击工具卡右上角的圆形播放按钮（.tool__videobtn），弹窗内播放对应 mp4。
     首次点击才创建弹窗；关闭即 pause() 并清空 src，立刻停止后续下载。
     每次打开默认 2 倍速（换源后元数据加载完再设一次，防止浏览器重置）。
     ══════════════════════════════════════════════════════════════════════ */
  function initToolVideo() {
    var btns = $$('.tool__videobtn');
    if (!btns.length) return;

    var DEFAULT_RATE = 2;
    var modal = null, video = null;

    function ensureModal() {
      if (modal) return;
      modal = document.createElement('div');
      modal.className = 'toolvideomodal';
      modal.setAttribute('aria-hidden', 'true');

      var panel = document.createElement('div');
      panel.className = 'toolvideomodal__panel';

      var closeBtn = document.createElement('button');
      closeBtn.className = 'toolvideomodal__close';
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', '关闭视频');
      closeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
        '<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

      video = document.createElement('video');
      video.className = 'toolvideomodal__video';
      video.setAttribute('controls', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('preload', 'auto');

      panel.appendChild(closeBtn);
      panel.appendChild(video);
      modal.appendChild(panel);
      document.body.appendChild(modal);

      // 新源元数据就绪时兜底再设一次倍速（换 src 后部分浏览器会重置）
      video.addEventListener('loadedmetadata', function () {
        video.playbackRate = DEFAULT_RATE;
      });

      closeBtn.addEventListener('click', close);
      modal.addEventListener('click', function (e) {
        if (e.target === modal) close();   // 只点蒙层本体才关，点面板不关
      });
      window.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
      });
    }

    function open(src) {
      ensureModal();
      video.setAttribute('src', src);
      video.playbackRate = DEFAULT_RATE;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      var p = video.play();
      if (p && p.catch) p.catch(function () { /* 浏览器要求再点一次播放键时静默 */ });
    }

    function close() {
      if (!modal || !modal.classList.contains('is-open')) return;
      try { video.pause(); } catch (e) {}
      video.removeAttribute('src');
      try { video.load(); } catch (e) {}     // 触发浏览器释放资源、停止下载
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var src = btn.getAttribute('data-video-src');
        if (src) open(src);
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     12. 首屏事实读数条跑码动效（Number Ticker）
     模拟硬件仪表开机自检跳码，从 0 快速递增至目标数值。
     兼容前导零（如 07、01）以及编辑模式（保持 data-ep 不受破坏）。
     ══════════════════════════════════════════════════════════════════════ */
  function initReadoutTicker() {
    var readoutBox = $('.readout');
    var items = $$('.readout__v', readoutBox);
    if (!items.length) return;

    if (prefersReduce) return; // 用户偏好减少动态时直接保留静态值

    var DURATION = 1500; // 动画持续时间
    var START_DELAY = 450; // 页面加载后起跑缓冲

    function padZero(num, width) {
      var s = String(num);
      while (s.length < width) s = '0' + s;
      return s;
    }

    // easeOutQuad 缓动函数：尾部导数适中，避免高阶曲线在最后整数（如54）长时间停滞
    function easeOutQuad(t) {
      return t * (2 - t);
    }

    function runAnimation() {
      items.forEach(function (el, i) {
        var raw = (el.textContent || '').trim();
        var match = raw.match(/^(\D*)(\d+)(\D*)$/);
        if (!match) return; // 非纯数字或复杂格式不干扰

        var prefix = match[1];
        var numStr = match[2];
        var suffix = match[3];
        var targetVal = parseInt(numStr, 10);
        if (targetVal <= 1) return; // 数值为 0 或 1 时无需滚动跑码，直接静态展示
        var zeroWidth = numStr.startsWith('0') ? numStr.length : 0;
        var staggerDelay = START_DELAY + i * 160; // 450ms 起步缓冲 + 错开 160ms 依次滚动

        // 初始置为 0
        el.textContent = prefix + (zeroWidth ? padZero(0, zeroWidth) : '0') + suffix;

        var startTime = null;
        function step(ts) {
          if (!startTime) startTime = ts;
          var elapsed = ts - startTime - staggerDelay;
          if (elapsed < 0) {
            requestAnimationFrame(step);
            return;
          }

          var progress = Math.min(elapsed / DURATION, 1);
          var eased = easeOutQuad(progress);
          var current = Math.round(targetVal * eased);

          if (current < targetVal && progress < 1) {
            el.textContent = prefix + (zeroWidth ? padZero(current, zeroWidth) : current) + suffix;
            requestAnimationFrame(step);
          } else {
            // 一旦到达目标值，立即精准还原并平滑落定，杜绝尾部顿挫
            el.textContent = raw;
          }
        }

        requestAnimationFrame(step);
      });
    }

    // 当 readout 进入视口时触发，若首屏已在视口则直接执行
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            runAnimation();
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.1 });
      io.observe(readoutBox);
    } else {
      runAnimation();
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     13. 演示激光笔模式与局部特写放大镜头 (Presentation Spotlight & Zoom)
     快捷键：
       · X 键：切换演示激光笔模式
       · Z 键：以鼠标指针所在精确像素为中心 1.5× 局部特写推近，再按 Z 还原
       · Esc 键：若处于特写则退出特写，若未特写则退出演示模式
     ══════════════════════════════════════════════════════════════════════ */
  function initPresentation() {
    var laser = $('#laserPointer');
    var mainEl = $('#top');

    // 激光笔层是演示模式唯一的可见反馈。它不存在时（静态导出）整套 X/Z 快捷键
    // 一并停用，否则会留下"右键菜单被拦截却没有任何指示"的幽灵状态。
    if (!laser) return;

    var isPresentation = false;
    var isZoomed = false;
    var zoomResetTimer = null;

    var mouseX = window.innerWidth / 2;
    var mouseY = window.innerHeight / 2;
    var laserTicking = false;

    function isInputActive() {
      var active = document.activeElement;
      if (!active) return false;
      var tag = active.tagName ? active.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      if (active.isContentEditable) return true;
      if (document.body.getAttribute('data-edit-mode') === '1') return true;
      return false;
    }

    function isModalOpen() {
      var lb = $('#lightbox');
      if (lb && lb.hasAttribute('open')) return true;
      var qr = $('#qrModal');
      if (qr && qr.classList.contains('is-active')) return true;
      var vm = $('.toolvideomodal.is-open');
      if (vm) return true;
      return false;
    }

    function setLaserPos(x, y) {
      if (!laser) return;
      laser.style.setProperty('--lx', x + 'px');
      laser.style.setProperty('--ly', y + 'px');
    }

    function setZoom(active) {
      var willZoom = !!active;
      if (willZoom === isZoomed) return;
      isZoomed = willZoom;

      if (zoomResetTimer) {
        clearTimeout(zoomResetTimer);
        zoomResetTimer = null;
      }

      if (isZoomed) {
        if (mainEl) {
          var rect = mainEl.getBoundingClientRect();
          // 以鼠标在 main 容器内的真实像素坐标为原点，确保放大时鼠标所指位置纹丝不动
          var ox = (mouseX - rect.left).toFixed(1) + 'px';
          var oy = (mouseY - rect.top).toFixed(1) + 'px';
          mainEl.style.transformOrigin = ox + ' ' + oy;
        }
        // rAF 保证 transformOrigin 先由 DOM 布局采纳，再施加 scale 缓动动画
        requestAnimationFrame(function () {
          if (mainEl) mainEl.classList.add('is-zoomed');
          document.body.setAttribute('data-presentation-zoom', 'true');
        });
      } else {
        if (mainEl) mainEl.classList.remove('is-zoomed');
        document.body.setAttribute('data-presentation-zoom', 'false');
        // 缓动复原完成后再重置 transformOrigin，确保退回平滑无跳变
        zoomResetTimer = setTimeout(function () {
          if (!isZoomed && mainEl) {
            mainEl.style.transformOrigin = '';
          }
        }, 400);
      }
    }

    function setPresentation(active) {
      isPresentation = !!active;
      document.body.setAttribute('data-presentation', isPresentation ? 'true' : 'false');

      if (isPresentation) {
        setLaserPos(mouseX, mouseY);
      } else {
        if (isZoomed) setZoom(false);
      }
    }

    function handlePointerMove(e) {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!isPresentation && !isZoomed) return;

      if (!laserTicking) {
        laserTicking = true;
        requestAnimationFrame(function () {
          laserTicking = false;
          setLaserPos(mouseX, mouseY);
        });
      }
    }

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    var pulseTimer = null;

    // 演示模式下右键点击触发小黄点放大回弹脉冲
    window.addEventListener('contextmenu', function (e) {
      if (!isPresentation && !isZoomed) return;
      // 拦截浏览器原生上下文菜单弹出
      e.preventDefault();

      if (laser) {
        if (pulseTimer) clearTimeout(pulseTimer);
        // 强制重绘以支持连续快速点击
        laser.classList.remove('is-pulsing');
        void laser.offsetWidth;
        laser.classList.add('is-pulsing');
        pulseTimer = setTimeout(function () {
          if (laser) laser.classList.remove('is-pulsing');
        }, 380);
      }
    });

    window.addEventListener('keydown', function (e) {
      if (isInputActive()) return;

      // Esc 键：优先退出放大；若无放大则退出演示模式
      if (e.key === 'Escape') {
        if (isModalOpen()) return;
        if (isZoomed) {
          e.preventDefault();
          setZoom(false);
          return;
        }
        if (isPresentation) {
          e.preventDefault();
          setPresentation(false);
          return;
        }
      }

      if (e.ctrlKey || e.altKey || e.metaKey) return;

      var key = (e.key || '').toLowerCase();

      // X 键：切换演示激光笔模式（即使处于放大看图时也支持快捷切换）
      if (key === 'x') {
        e.preventDefault();
        setPresentation(!isPresentation);
        return;
      }

      // Z 键：切换局部特写放大
      if (key === 'z') {
        if (isModalOpen()) return;
        e.preventDefault();
        if (!isPresentation && !isZoomed) {
          setPresentation(true);
          setZoom(true);
        } else {
          setZoom(!isZoomed);
        }
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     12. 底部产品展示视频控制
     ══════════════════════════════════════════════════════════════════════ */
  function initShowcaseVideo() {
    var screen = $('#showcaseTheater');
    var video = $('#showcaseVideo');
    var muteBtn = $('#showcaseMuteBtn');
    if (!video) return;

    var manualPaused = false;

    function updatePlayState() {
      if (screen) {
        screen.classList.toggle('is-paused', video.paused);
      }
    }

    // 默认静音并尝试播放。preload="none"（静态导出）时不在此处拉起下载，
    // 交给下面的 IntersectionObserver 在滚入视口时再 play()。
    video.muted = true;
    if (video.preload !== 'none') {
      var playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(function () {
          // 部分浏览器策略阻止自动播放时降级等待用户交互
        });
      }
    }
    updatePlayState();

    function togglePlay() {
      if (video.paused) {
        manualPaused = false;
        video.play().catch(function () {});
      } else {
        manualPaused = true;
        video.pause();
      }
      updatePlayState();
    }

    // 点击视频屏幕区域切换暂停/播放（排除静音坞等浮层按钮）
    if (screen) {
      screen.addEventListener('click', function (e) {
        if (e.target.closest('.footer-showcase__dock')) return;
        togglePlay();
      });
    }

    video.addEventListener('play', updatePlayState);
    video.addEventListener('pause', updatePlayState);

    if (muteBtn) {
      muteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        video.muted = !video.muted;
        if (video.muted) {
          muteBtn.classList.remove('is-unmuted');
          muteBtn.setAttribute('aria-label', '开启声音');
        } else {
          muteBtn.classList.add('is-unmuted');
          muteBtn.setAttribute('aria-label', '静音');
        }
      });
    }

    // 视口离开时暂停，进入时（若非用户手动暂停）恢复播放
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (!manualPaused) {
              video.play().catch(function () {});
            }
          } else {
            if (!video.paused) {
              video.pause();
            }
          }
        });
      }, { rootMargin: '100px', threshold: 0.1 });
      io.observe(video);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     启动
     ══════════════════════════════════════════════════════════════════════ */
  function boot() {
    measure();
    initReveal();
    initSpy();
    initNavSelect();
    initLightbox();
    initVideos();
    initCode();
    initCopy();
    initTop();
    initQrModal();
    initToolVideo();
    initReadoutTicker();
    initPresentation();
    initShowcaseVideo();
    onScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // resize：防抖 180ms 后重新量一次，不打断滚动
  var rt = null;
  window.addEventListener('resize', function () {
    if (rt) clearTimeout(rt);
    rt = setTimeout(function () {
      measure();
      onScroll();
    }, 180);
  });

  window.addEventListener('scroll', onScroll, { passive: true });

  // 图片陆续加载完成后文档高度会变，重新量一次
  window.addEventListener('load', function () {
    measure();
    onScroll();
  });
})();
