# suencj · GitHub 增强套件（油猴脚本）

> 单文件、零依赖的 GitHub 增强油猴脚本：**界面完整汉化 + 下载一键加速 + 字体优化（云端字体·国内可用）+ 搜索引擎切换**，统一美化设置面板，一键开关、保存即生效。

## ✨ 功能一览

| 模块 | 功能 | 说明 |
| --- | --- | --- |
| **A · 界面汉化** | 最新 GitHub 界面完整中文 | 复用社区 `maboloshi/github-chinese` 词库；已修复顶栏搜索框消失 bug |
| **B · 下载加速** | 下载位置注入 🚀 加速图标 | 点击跳转 `github.akams.cn` 并自动填入下载地址 |
| **C · 字体优化** | 云端字体 · 国内可用 CDN | 全元素覆盖：霞鹜文楷（UI）+ JetBrains Mono（代码），可自定义 |
| **D · 搜索引擎切换** | 搜索结果页嵌入引擎切换条 | 参考「Google & baidu Switcher」：在百度/Bing/Google/DDG/搜狗搜索框旁一键切换 |

> 脚本 `@match` 为全站匹配，但各模块均带**场景守卫**：汉化与字体优化只在 GitHub 系列站点生效；搜索引擎切换只在搜索引擎结果页显示（普通网站与 GitHub 页不打扰）。

## 📦 安装

1. 安装浏览器扩展 **Tampermonkey**（油猴）。
2. 打开 Tampermonkey → **添加新脚本** → 清空编辑框 → 粘贴 `suencj.user.js` 全文 → 保存（Ctrl+S）。
3. 使用：GitHub 页享受汉化 / 加速 / 字体；在百度、Bing、Google、DuckDuckGo、搜狗搜索结果页，搜索框下方出现「切换：」引擎按钮条。页面**右下角 ⚙ 齿轮按钮**打开统一设置面板（或油猴菜单「GitHub 增强套件 · 打开设置」）。

> 也可直接以 `.user.js` 后缀 URL 安装：浏览器打开脚本的 GitHub 原始链接，油猴会弹出安装确认。

## 🛠 功能详情

### A · 界面汉化（搜索框已修复）
- 词库：社区维护的 1.9MB `maboloshi/github-chinese`（`@require` 实时拉取最新）。
- **搜索框 bug 根因**：旧词库忽略规则只针对旧版 `QueryBuilder`，而最新 GitHub 顶栏搜索是 React Web Component `<qbsearch-input>`，翻译其文本/属性会触发 React 重渲染冲突导致搜索框消失。
- **修复**：强制将搜索相关子树（`qbsearch-input` / `query-builder` / `command-palette` 等）与代码编辑器列入忽略名单，翻译全部 `try/catch` 隔离。
- 兜底：内置 `SUPPLEMENT_STATIC` 词库，远程词库加载失败时自动降级。

### B · 下载加速
- 触发位置：Release 资源、源码归档 / Code → Download ZIP、单文件 Raw。
- 行为：新标签打开 `https://github.akams.cn/?link=<编码地址>`，该站会自动填入并触发加速下载。
- 仅匹配真正可下载地址，`/blob/`、`/tree/` 等查看页不误加图标。
- 监听节点插入 + `href` 属性变化 + 流式加载兜底重试，动态内容不遗漏、不重复注入。

### C · 字体优化（云端字体 · 国内可用）
| 预设 | 效果 |
| --- | --- |
| 系统默认优化 | 不加载云端字体，仅抗锯齿 |
| 霞鹜文楷 | UI 中文（`fastly.jsdelivr.net` 国内镜像） |
| JetBrains Mono | 代码字体（`fonts.font.im` 国内 Google Fonts 镜像） |
| **霞鹜文楷 + JetBrains Mono（推荐，默认）** | 两者兼得 |
| 自定义 | 自填字体 CSS 地址 + 字体族名 |

- **应用方式（参考 F9y4ng 字体渲染）**：`html, body, body *` 全元素覆盖 + 代码区专用字体栈 + 图标字体排除（防字体图标渲染成方块），保证 GitHub 各组件的显式 font-family 也被覆盖，字体真正生效。
- 附带选项：字体平滑（抗锯齿）开关、字号缩放 0.8×–1.4×。切换即时生效。

### D · 搜索引擎切换（参考「Google & baidu Switcher」）
- **只在搜索引擎结果页显示**：识别百度 / Bing / Google / DuckDuckGo / 搜狗域名且有查询词（搜索框有值或 URL 带 `q`/`wd`/`query` 参数）时，在搜索表单锚点之后嵌入「切换：」引擎按钮条；找不到锚点（页面改版）时浮动在页面顶部兜底。普通网站与 GitHub 页不显示。
- 取词顺序（同参考插件）：当前页搜索框输入值优先 → URL 搜索参数兜底（`wd`（百度）/ `q` / `query`（搜狗）等）。
- 点击目标引擎：后台新标签打开对应搜索（当前引擎按钮带 ✓ 高亮标记）。
- 设置面板可开关、可勾选显示哪些引擎。

## ⚙️ 设置面板

- 右下角 ⚙ 齿轮（或油猴菜单）打开；四个功能卡片各带**开关**与**选项**。
- 「保存并应用」即时生效；「恢复默认」一键还原；设置经 `GM_setValue` 持久化。

## 📁 目录结构

```
suencj/
├── suencj.user.js        # 主脚本（汉化+加速+字体+搜索，四模块合一）
├── README.md             # 本说明
├── .gitignore            # 忽略 .workbuddy/（本地记忆）与 参考/（样本素材）
└── 参考/                 # 开发用参考样本（不入库）
```

## 🧪 自测情况（v2.2.0）

- `node --check` 语法校验通过。
- jsdom 全量 18 项测试 PASS：
  - **字体**：GitHub 页注入 `html,body,body *` 全元素覆盖样式、UI/代码字体栈、图标字体排除规则，combo 预设 2 个国内 CDN link。
  - **搜索引擎切换**：Google / 百度结果页显示切换条并**嵌入搜索表单锚点之后**；当前引擎 ✓ 高亮；点击后台新标签打开正确 URL（`q` / `wd` 取词、URL 解码）；搜索框值优先于 URL 参数（同参考插件顺序）；普通网站、GitHub 仓库页、搜索引擎首页（无查询词）均**不显示**。
  - 既有回归：GitHub 汉化正常、设置面板正常。

## ⚠️ 已知限制

- 词库来自社区，极少数最新上线的 UI 字符串可能仍为英文（社区更新后自动生效，也可在脚本内 `SUPPLEMENT_STATIC` 补充）。
- 汉化 / 字体优化仅匹配 `github.com` / `gist.github.com` / `skills` / `education` / `githubstatus` 系列域名；搜索引擎切换仅识别百度 / Bing / Google / DuckDuckGo / 搜狗结果页（页面结构改版时按钮可能退化为顶部浮动）。
- 下载加速依赖第三方公益站 `github.akams.cn` 可用性（脚本只负责跳转并填地址）。
- 云端字体 CDN 为国内常用镜像，若所在网络屏蔽，可在面板「自定义」中替换地址。

## 📄 License

GPL-3.0
