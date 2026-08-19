# GitHub 汉化与下载加速（油猴插件）

> 文件：`GitHub 汉化与下载加速.user.js`
> 单文件、零依赖，合并两大功能：界面完整汉化 + 下载一键加速。

## 一、安装
1. 安装浏览器扩展 Tampermonkey（油猴）。
2. 打开 Tampermonkey → 添加新脚本 → 清空编辑框 → 粘贴 `GitHub 汉化与下载加速.user.js` 全文 → 保存。
3. 访问任意 `github.com` 页面即可生效（顶栏汉化/搜索框修复立即生效，下载图标在 Release / Code / Raw 等位置自动出现）。

## 二、功能 1 · 界面完整汉化（已修复搜索框 bug）
- **词库**：复用社区维护的 `maboloshi/github-chinese` 1.9MB 词库（通过 `@require` 实时拉取最新版），覆盖导航、仓库页、议题/PR、设置、个人主页等绝大多数界面文本，是目前最完整的中文词库。
- **搜索框消失的根因与修复**：
  - 旧样本词库的「忽略规则」只针对**旧版**搜索组件（`QueryBuilder`），而最新 GitHub 顶栏搜索是 React Web Component `<qbsearch-input>`。引擎翻译了它的文本/`placeholder` 属性，触发 React 重渲染冲突 → 搜索框直接消失。
  - 本插件**强制**把整个搜索相关子树（`qbsearch-input`、`query-builder`、`command-palette`、搜索输入框等）及代码编辑器（`CodeMirror`/`Monaco`）加入忽略名单，无论远程词库版本如何，都不再翻译搜索框，从根上解决。
  - 所有翻译步骤包了 `try/catch` 隔离，单个节点出错不会连锁破坏页面（含搜索框）。
- **兜底**：内置 `SUPPLEMENT_STATIC` 词库；若远程词库加载失败（如离线），自动降级到内置词库，仍可汉化最常见的导航/按钮。

## 三、功能 2 · 下载一键加速
- **触发位置**：在以下「可下载」链接后注入蓝色 🚀加速 图标：
  - Release 资源（`/releases/download/...`）
  - 源码归档 / Code → Download ZIP（`/archive/...`）
  - 单文件 Raw（`/raw/...`、`raw.githubusercontent.com`）
- **点击行为**：在新标签页打开 `https://github.akams.cn/?link=<编码后的下载地址>`。
  - 已验证该加速站读取 `?link=`（或 `?url=`）参数，会自动把地址填入输入框并触发加速下载，无需手动粘贴。
- **实现要点**：
  - 仅匹配真正的下载地址，**不会**给普通代码查看（`/blob/`、`/tree/`）、议题等页面误加图标。
  - `MutationObserver` + `urlchange`/turbo/pjax 监听，动态加载（Release 列表、Code 下拉、SPA 切页）均能自动注入。
  - 用 `dataset` 标记 + 加速站域名守卫做去重，多次扫描/动态刷新**不会重复注入**。

## 四、脚本菜单（点 Tampermonkey 图标 → 该脚本）
- 启用/禁用「正则翻译」：处理 `X stars` 之类的动态文本。
- 启用/禁用「描述翻译按钮」：在仓库简介后加「翻译」按钮（调用讯飞听见）。

## 五、已知限制
- 词库来自社区，极少数**最新**上线且尚未被收录的 UI 字符串可能仍为英文；社区更新词库后下次加载即生效，也可在脚本顶部 `SUPPLEMENT_STATIC` 自行补充。
- 仅 `@match` `github.com` / `gist.github.com` / `skills` / `education` / `githubstatus` 系列域名。
- 下载加速依赖第三方公益站 `github.akams.cn` 的可用性，与该站节点状态无关（本插件只负责跳转并填地址）。

## 六、自测情况
- `node --check` 语法校验通过。
- jsdom 模拟测试：搜索框 `placeholder`/内部文本**未被改写**、搜索组件仍存在于 DOM；导航与 Download ZIP 正常汉化；3 个可下载链接各注入 1 个加速图标、blob 等普通链接不注入、重复扫描保持 3 个（幂等）。
