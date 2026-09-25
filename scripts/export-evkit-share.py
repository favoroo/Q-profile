#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 EVKit2 项目开发分享（Flask + Jinja 源码）静态导出成自包含页面。

产物落在 public/evkit/share/，由个人主页的「分享文档」按钮在 iframe 弹窗里打开。

用法
    npm run export:evkit-share
    python3 scripts/export-evkit-share.py [--dry-run]

需要 Python ≥3.10 与 Flask / Pillow（见 web/requirements.txt）。默认 `python3`
往往是 3.9，导入 app.py 会因 `Path | None` 语法报错；用 EVKIT_PYTHON 指定解释器。

为什么产物必须提交进 git
    站点部署在 GitHub Pages，CI 只跑 `npm ci && npm run build`，没有 Python，也拿不到
    未跟踪的 EV项目分享部署/ 素材目录。所以本脚本是**本地开发工具**，
    绝不允许被串进 npm run build。

日常改文档的循环
    照常在内网 App 里编辑（Ctrl+E 或直接改 content.json）→ 跑一次本脚本
    → git add public/evkit/share && git commit

⚠ 新增/改名工具卡时必须同步下面的 TOOL_DEMO / TOOL_NO_DEMO，否则导出会被
  末尾的内网地址断言拦下（这是有意的：静默发布一个 10.230.x.x 比导出失败严重得多）。
"""

from __future__ import annotations

import argparse
import copy
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import quote, unquote

# ══════════════════════════════════════════════════════════════════════
# 路径与常量
# ══════════════════════════════════════════════════════════════════════

REPO_ROOT = Path(__file__).resolve().parents[1]
SRC_WEB = REPO_ROOT / "EV项目分享部署" / "web"
OUT_DIR = REPO_ROOT / "public" / "evkit" / "share"

# 站点已有的站内静态演示（public/evkit/tools/），导出时把内网工具地址换过去。
TOOL_DEMO = {
    "标点工具优化": "point-tool.html",
    "高压端子标点工具": "terminal-tool.html",
    "位置图批量 AI 转换工具": "imageproc-tool.html",
}
# 没有站内对应演示的工具卡 → 去掉跳转，退化成不可点的说明文字。
TOOL_NO_DEMO = {"入库测量数据可视化审核工具"}
DEMO_DIR = REPO_ROOT / "public" / "evkit" / "tools"

# 导出时目录层级必须与 static/ 完全一致，这样 hero-3d.js 的 ../vendor/three/*.js
# 与 style.css 的 ../fonts/* 都不需要任何内容改写。
ASSET_FILES = (
    "css/style.css",
    "js/main.js",
    "js/hero-3d.js",
    "vendor/three/three.module.js",
    "vendor/three/OrbitControls.js",
    "vendor/three/RoundedBoxGeometry.js",
    "vendor/three/RoomEnvironment.js",
)

# 导出产物里绝不允许出现的字符串 → 人类可读的原因。
#
# URL 类断言一律带 (?<![\w./]) 前置边界：文档正文里作者写的工具开发提示词本身
# 就含有 `./static/images/` 这类**散文路径**，不加边界会误伤。
FORBIDDEN = {
    r"10\.230\.": "内网 IP 泄露",
    r"H21078": "本机个人路径泄露",
    r"(?<![\w./])/media/": "媒体地址未本地化（点开必 404）",
    r"(?<![\w./])/thumb/": "缩略图地址未本地化",
    r"(?<![\w./])/scan/": "扫码资源未本地化（QR 层应已剥离）",
    r"(?<![\w./])/static/": "静态资源地址未本地化",
    r"(?<![\w./])/api/": "残留后端接口调用",
    r"editor\.js": "残留编辑模式（静态站上保存必挂）",
    r"qrhud": "残留签到/问卷扫码层",
    r"editbar": "残留编辑工具条",
    r"laser-pointer": "残留演示模式激光笔",
    r"1054265139": "引用了磁盘上不存在的视频",
    r"图片工具演示演示": "引用了磁盘上不存在的视频",
    r'href=""': "空 href 会解析成当前文档本身",
}


def die(msg: str) -> None:
    raise SystemExit(f"\n\033[31m导出失败\033[0m：{msg}\n")


def _interpreter_ok(cand: str) -> bool:
    """这个解释器能不能真正把分享文档跑起来（版本 + 三个依赖）。"""
    if not cand or not Path(cand).is_file():
        return False
    # 依赖必须排在 sys.exit 前面 —— sys.exit 会立刻抛 SystemExit 终止进程，
    # 写在后面的 import 永远不会执行，探测就退化成只看了版本号。
    probe = "import sys; import flask, markupsafe, PIL; "
    probe += "sys.exit(0 if sys.version_info >= (3,10) else 1)"
    try:
        return subprocess.run(
            [cand, "-c", probe], capture_output=True, timeout=30
        ).returncode == 0
    except (OSError, subprocess.SubprocessError):
        return False


def maybe_reexec() -> None:
    """Python <3.10 时自动换到可用的解释器重跑，让 npm run export:evkit-share 开箱可用。

    本机默认的 python3 往往是 3.9，而 web/app.py 用了 `Path | None` 语法，
    3.9 在 import 期就会抛 TypeError。候选要逐个验依赖，否则很容易挑中一个
    版本够、却没装 Flask 的解释器，把一个环境问题误报成"缺依赖"。
    用 EVKIT_PYTHON 可显式指定。
    """
    if _interpreter_ok(sys.executable):
        return

    candidates = [os.environ.get("EVKIT_PYTHON", "")] + [
        shutil.which(f"python3.{minor}") or "" for minor in (14, 13, 12, 11, 10)
    ]
    tried: list[str] = []
    for cand in candidates:
        if not cand or cand in tried:
            continue
        tried.append(cand)
        if _interpreter_ok(cand):
            print(f"  当前解释器 {sys.version.split()[0]} 不可用，改用 {cand}", flush=True)
            os.execv(cand, [cand, str(Path(__file__).resolve()), *sys.argv[1:]])

    if sys.version_info >= (3, 10):
        return          # 版本没问题，缺的只是依赖 —— 交给导入处的报错说明
    die(
        f"没找到可用的 Python 解释器（需要 ≥3.10 且装有 Flask/MarkupSafe/Pillow）。"
        f"\n  试过的解释器：{', '.join(tried) or '无'}"
        f"\n  → 指定解释器：EVKIT_PYTHON=/path/to/python3.12 npm run export:evkit-share"
        f"\n  → 或装依赖：  <那个解释器> -m pip install -r '{SRC_WEB / 'requirements.txt'}'"
    )


def preflight() -> None:
    if sys.version_info < (3, 10):
        die(
            f"内部错误：仍以 {sys.version.split()[0]} 运行。"
            f"\n  → 用 EVKIT_PYTHON=<解释器路径> 指定 Python ≥3.10"
        )
    if not SRC_WEB.is_dir():
        die(f"找不到分享文档源码目录：{SRC_WEB}\n  这个目录未纳入 git，只存在于作者本机。")

    missing = [f for f in ASSET_FILES if not (SRC_WEB / "static" / f).is_file()]
    if missing:
        die("源目录缺少静态资源：\n  " + "\n  ".join(missing))


# ══════════════════════════════════════════════════════════════════════
# 内容补丁（只在内存里，不写回 content.json —— 内网版还要链真实 LAN 工具）
# ══════════════════════════════════════════════════════════════════════

def demo_href(fname: str) -> str:
    """站内演示页相对导出页的位置。算出来而不是硬编码，目录挪了也不会错。"""
    return os.path.relpath(str(DEMO_DIR / fname), str(OUT_DIR)).replace(os.sep, "/")


def patch_content(content) -> dict:
    site = copy.deepcopy(content.SITE)
    media = copy.deepcopy(content.MEDIA)
    chapters = copy.deepcopy(content.CHAPTERS)

    # 模板里是 `site.meta or (site.host ~ ':' ~ site.port)`，site.meta 有值所以本来
    # 就不渲染；清空只是防御，避免以后有人删了 meta 就把内网地址顶上去。
    site["host"] = ""
    site["port"] = ""

    # media.*.chrome 会被渲染成页面上**可见**的假地址栏文字（.fig__url），
    # 是这篇文档里最容易被忽略的一处内网泄露。只换掉 host:port 段，保留描述。
    for entry in media.values():
        if isinstance(entry, dict) and entry.get("chrome"):
            entry["chrome"] = re.sub(r"^\d+(?:\.\d+){3}:\d+／?", "内网工具／", entry["chrome"])

    seen_tools: set[str] = set()

    def walk(node):
        if isinstance(node, dict):
            if node.get("type") == "tool_card":
                title = node.get("title", "")
                seen_tools.add(title)
                url = node.get("url", "")
                if title in TOOL_NO_DEMO:
                    node["url"] = ""
                    node["url_label"] = ""
                elif url and re.match(r"https?://\d+\.\d+\.\d+\.\d+", url):
                    if title not in TOOL_DEMO:
                        die(
                            f"工具卡「{title}」链接指向内网地址 {url}，"
                            f"但 TOOL_DEMO 里没有它的站内对应演示。\n"
                            f"  → 在 scripts/export-evkit-share.py 里补映射，"
                            f"或把它加进 TOOL_NO_DEMO（去掉跳转）。"
                        )
                    node["url"] = demo_href(TOOL_DEMO[title])
                    node["url_label"] = "站内静态演示"
                # old_url 是 C:\Users\<用户名>\Desktop\... 这种本机路径，公网不该出现
                if node.get("old_url"):
                    node["old_url"] = ""
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)

    walk(chapters)

    unmapped = (set(TOOL_DEMO) | TOOL_NO_DEMO) - seen_tools
    if unmapped:
        die(f"重映射表里这些工具卡已在文档中消失：{sorted(unmapped)}\n  → 同步清理脚本常量。")

    patched = {"site": site, "ui": content.UI, "media": media, "chapters": chapters}
    content.validate(patched)          # 复用生产校验，结构改坏立刻 fail-fast
    return patched


# ══════════════════════════════════════════════════════════════════════
# URL 规划器：在源头接管，而不是渲染完再正则改写
# ══════════════════════════════════════════════════════════════════════

class Planner:
    """把 /media/<percent 编码的中文名> 与 /thumb/<size>/<…> 换成本地相对路径。

    以 media id 作为输出文件名（content.json 里的 id 本来就是 ASCII 且语义化），
    一次性避开：quote 编解码、macOS NFD 归一、中文与空格文件名的跨平台风险。
    """

    def __init__(self, media: dict, find_media_path):
        self.find = find_media_path
        self.slug: dict[str, str] = {}
        for mid, entry in media.items():
            fname = entry.get("file") if isinstance(entry, dict) else None
            if not fname:
                continue
            if fname in self.slug and self.slug[fname] != mid:
                die(f"媒体文件名冲突：{fname} 同时属于 {self.slug[fname]} 和 {mid}")
            self.slug[fname] = mid
        self.manifest: dict[str, tuple] = {}   # 输出相对路径 → ("media"|"thumb", 源, 尺寸)

    def _slug(self, filename: str) -> str:
        if filename not in self.slug:
            die(
                f"媒体 {filename!r} 不在 content.json 的 media 注册表里，"
                f"无法确定导出文件名。"
            )
        return self.slug[filename]

    def check(self, filename: str) -> Path:
        src = self.find(filename)
        if src is None:
            die(f"媒体文件在磁盘上不存在：{filename}\n  → 补文件或改掉 content.json 里的引用。")
        return src

    def media_url(self, filename: str) -> str:
        filename = unquote(filename)
        src = self.check(filename)
        out = f"media/{self._slug(filename)}{src.suffix.lower()}"
        self.manifest[out] = ("media", filename, 0)
        return out

    def _thumb(self, size: int, filename: str) -> str:
        self.check(filename)
        out = f"thumbs/{self._slug(filename)}_{size}.webp"
        self.manifest[out] = ("thumb", filename, size)
        return out

    def build_source(self, original):
        """包住 app._build_source：它的档位选择逻辑原样保留，只翻译它吐出的 URL。"""

        def wrapped(filename: str) -> dict:
            d = original(filename)

            def move(url: str) -> str:
                m = re.fullmatch(r"/thumb/(\d+)/(.+)", url)
                return self._thumb(int(m.group(1)), unquote(m.group(2))) if m else url

            if d.get("src"):
                d["src"] = move(d["src"])
            if d.get("srcset"):
                # quote(safe="") 会把逗号百分号编码掉，所以 ", " 切分是安全的
                parts = []
                for chunk in d["srcset"].split(", "):
                    url, _, desc = chunk.rpartition(" ")
                    parts.append(f"{move(url)} {desc}" if desc else move(url))
                d["srcset"] = ", ".join(parts)
            return d

        return wrapped


# ══════════════════════════════════════════════════════════════════════
# 物化
# ══════════════════════════════════════════════════════════════════════

# thumb 回落成原图时记下的引用改写，最后统一应用到 index.html
_REWRITE: dict[str, str] = {}


def write_assets(out: Path) -> None:
    for rel in ASSET_FILES:
        dst = out / "assets" / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(SRC_WEB / "static" / rel, dst)
    # 字体目录若哪天补上了就自动带上；现在不存在 → 走 CSS 里的系统回退栈。
    fonts = SRC_WEB / "static" / "fonts"
    if fonts.is_dir():
        for f in sorted(fonts.glob("*.woff2")):
            dst = out / "assets" / "fonts" / f.name
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(f, dst)


def write_media(out: Path, planner: Planner, app) -> None:
    client = app.test_client()
    # thumb 回落原图时会往清单里补 media 条目，所以用可增长的工作队列而不是
    # 一次性快照，否则那条原图永远不会有第二次机会被拷贝进去。
    pending = sorted(planner.manifest)
    done: set[str] = set()
    while pending:
        out_rel = pending.pop()
        if out_rel in done:
            continue
        done.add(out_rel)
        kind, filename, size = planner.manifest[out_rel]
        dst = out / out_rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        if kind == "media":
            shutil.copyfile(planner.check(filename), dst)
            continue
        # 缩略图走生产 thumb 视图：缓存命中、LANCZOS 生成、不放大回落原图、
        # 无 Pillow 降级这几条既有逻辑一行都不必重写。
        resp = client.get(f"/thumb/{size}/{quote(filename, safe='')}")
        if resp.status_code in (301, 302, 307, 308):
            # 视图判定该直出原图（原图比该档位还窄）→ 改写引用指向 media/
            target = planner.media_url(filename)
            _REWRITE[out_rel] = target
            pending.append(target)               # 新补的原图要拷
            continue
        if resp.status_code != 200:
            die(f"缩略图生成失败：{filename} @{size} → HTTP {resp.status_code}")
        dst.write_bytes(resp.data)


def apply_rewrites(html: str) -> str:
    """把回落成原图的缩略图引用换成 media/ 引用（srcset 里可能出现多次）。"""
    for src, dst in _REWRITE.items():
        html = re.sub(rf"(?<![\w./]){re.escape(src)}(?![\w.])", dst, html)
    return html


# ══════════════════════════════════════════════════════════════════════
# 自检
# ══════════════════════════════════════════════════════════════════════

def reset_out_dir() -> None:
    """把旧的导出目录**移动**到系统临时目录（而非删除），供结构大改后干净重建。

    用 move 而不是 rmtree：可逆，且不会在仓库里触发一次上百文件的批量删除。
    """
    if not OUT_DIR.exists():
        return
    stamp = f"{OUT_DIR.name}-{os.getpid()}"
    dest = Path(tempfile.gettempdir()) / stamp
    shutil.move(str(OUT_DIR), str(dest))
    print(f"  旧导出目录已移至 {dest}（确认无误后可自行删除）")


def prune(out_dir: Path, planner: Planner) -> None:
    """删掉不再被任何引用命中的残留文件（比如从 content.json 撤下的图）。"""
    keep = set(planner.manifest) - set(_REWRITE)
    keep |= {f"assets/{rel}" for rel in ASSET_FILES}
    keep.add("index.html")
    fonts = out_dir / "assets" / "fonts"
    if fonts.is_dir():
        keep |= {f"assets/fonts/{f.name}" for f in fonts.glob("*.woff2")}

    stale = [f for f in sorted(out_dir.rglob("*"))
             if f.is_file() and str(f.relative_to(out_dir)) not in keep]
    for f in stale:
        f.unlink()                               # 逐个删，数量本应极少
    for d in sorted((p for p in out_dir.rglob("*") if p.is_dir()), reverse=True):
        try:
            d.rmdir()                            # 只收空目录，非空必失败即跳过
        except OSError:
            pass
    if stale:
        print(f"  清理失效文件       {len(stale):>9,} 个")


def audit(html: str, planner: Planner, out_dir: Path) -> None:
    hits = {p: len(re.findall(p, html)) for p in FORBIDDEN if re.search(p, html)}
    if hits:
        lines = "\n".join(f"  {FORBIDDEN[p]:<28} ×{n:<4} {p}" for p, n in hits.items())
        die("产物里发现不该出现的内容：\n" + lines)

    if not out_dir.is_dir():
        return                                  # --dry-run：没有落盘可核对

    missing = [f for f in planner.manifest if f not in _REWRITE
               and not (out_dir / f).exists()]
    if missing:
        die(f"清单里这些文件没有落盘：{missing[:5]}")

    # 页内引用的本地文件必须真实存在，否则点开就是 404
    refs = set(re.findall(r'(?:src|href|data-full|data-src)="([^"#?]+)', html))
    for ref in sorted(refs):
        if ref.startswith(("../", "http", "mailto:", "data:", "#")):
            continue
        if not (out_dir / unquote(ref)).exists():
            die(f"引用了不存在的本地文件：{ref}")


# ══════════════════════════════════════════════════════════════════════
# 主流程
# ══════════════════════════════════════════════════════════════════════

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--dry-run", action="store_true",
                    help="只渲染并打印清单与体积统计，不写任何文件")
    ap.add_argument("--reset", action="store_true",
                    help="先把已有的导出目录挪到系统临时目录再重建，不直接删除")
    args = ap.parse_args()

    maybe_reexec()
    preflight()
    if args.reset:
        reset_out_dir()

    sys.path.insert(0, str(SRC_WEB))
    try:
        import content                       # noqa: E402  分享文档的数据加载器
        import app as F                      # noqa: E402  Flask 应用（import 期不起服务）
    except ImportError as exc:
        die(f"无法导入分享文档源码：{exc}\n  → pip install -r '{SRC_WEB / 'requirements.txt'}'")

    patched = patch_content(content)
    content.SITE = patched["site"]
    content.UI = patched["ui"]
    content.MEDIA = patched["media"]
    content.CHAPTERS = patched["chapters"]

    planner = Planner(patched["media"], F._find_media_path)
    # app.py 所有读点都是模块级运行时查找，换掉这两个全局即可覆盖 figure() 内部。
    # 但 @app.template_global() 装饰时把**函数对象**塞进了 jinja_env.globals，
    # 模板里直接调 media_url(...)（如视频块的 data-src）走的是那份旧引用，必须一起换。
    F.media_url = planner.media_url
    F._build_source = planner.build_source(F._build_source)
    F.app.jinja_env.globals["media_url"] = planner.media_url

    with F.app.test_request_context("/"):
        html = F.render_template(
            "index.html", site=content.SITE, ui=content.UI,
            chapters=content.CHAPTERS, static_export=True,
        )

    # static_url_path 在 Flask(__name__) 之后就改不动了，只能对渲染结果动手。
    # 命中的是样式表、importmap 里的 three 路径、main.js、hero-3d.js。
    # 正文散文里的 `./static/images/` 前面是点，不会被这条规则误伤。
    #
    # 必须补 `./` 前缀：importmap 的值不带 ./ 或 / 会被当成 bare specifier 直接忽略
    # （Chrome: `Ignored an import map value of "three"`），three 加载不到，
    # hero-3d.js 整个模块静默失败，3D 车盒 Hero 就没了。
    html, n_static = re.subn(r'(["\'(])/static/', r"\1./assets/", html)

    n_media = sum(1 for v in planner.manifest.values() if v[0] == "media")
    n_thumb = sum(1 for v in planner.manifest.values() if v[0] == "thumb")
    total_media = sum(planner.check(fn).stat().st_size
                      for kind, fn, _ in planner.manifest.values() if kind == "media")

    print(f"\n  渲染 index.html      {len(html.encode()):>9,} B"
          f"\n  media/  原图与视频   {n_media:>9,} 个   {total_media / 1e6:,.1f} MB"
          f"\n  thumbs/ 响应式缩略图 {n_thumb:>9,} 个"
          f"\n  assets/ 样式脚本模型 {len(ASSET_FILES):>9,} 个"
          f"\n  /static/ → assets/   {n_static:>9,} 处改写")

    if args.dry_run:
        audit(html, planner, OUT_DIR.parent / "__dry_run__")
        print("\n  --dry-run：未写入任何文件。\n")
        return 0

    # 就地覆盖写入：文件名由 media id 决定、天然稳定，重跑就是同一批文件原地刷新。
    # 不用"整目录 rename 替换"那套，是因为一次要删掉 163 个文件的批量删除既危险、
    # 又会被本地的 safe-delete 守卫拦下；真正需要清理的只是极少数失效文件。
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    write_assets(OUT_DIR)
    write_media(OUT_DIR, planner, F.app)          # 可能记下 thumb 回落原图的重写
    html = apply_rewrites(html)
    (OUT_DIR / "index.html").write_text(html, encoding="utf-8")
    audit(html, planner, OUT_DIR)
    prune(OUT_DIR, planner)

    size = sum(f.stat().st_size for f in OUT_DIR.rglob("*") if f.is_file())
    count = sum(1 for f in OUT_DIR.rglob("*") if f.is_file())
    print(f"\n  \033[32m✓\033[0m 已导出 {count} 个文件 / {size / 1e6:,.1f} MB "
          f"→ {OUT_DIR.relative_to(REPO_ROOT)}")
    print("    别忘了 git add public/evkit/share && git commit\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
