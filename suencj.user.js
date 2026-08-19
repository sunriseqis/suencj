// ==UserScript==
// @name         GitHub 增强套件
// @name:zh-CN   GitHub 增强套件
// @namespace    https://github.com/sunriseqis/suencj
// @version      2.0.0
// @description  汉化 + 下载加速 + 字体优化（云端字体·国内可用）+ 搜索引擎切换，统一设置面板。已移除原作者信息。
// @description:zh-CN  汉化 + 下载加速 + 字体优化（云端字体·国内可用）+ 搜索引擎切换，统一设置面板。已移除原作者信息。
// @author       GitHub 增强套件
// @icon         https://github.githubassets.com/pinned-octocat.svg
// @license      GPL-3.0
// @match        https://github.com/*
// @match        https://gist.github.com/*
// @match        https://skills.github.com/*
// @match        https://education.github.com/*
// @match        https://www.githubstatus.com/*
// @require      https://raw.githubusercontent.com/maboloshi/github-chinese/gh-pages/locals.js
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_openInTab
// @grant        GM_addStyle
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @grant        window.onurlchange
// @connect      fanyi.iflyrec.com
// @supportURL   https://github.com/sunriseqis/suencj/issues
// ==/UserScript==

/*
 * 本脚本合并两大功能，两个模块相互独立、各自 try/catch 隔离：
 *   模块 A —— GitHub 界面汉化（引擎基于 maboloshi/github-chinese 重写，修复搜索框 bug）
 *   模块 B —— 下载加速（在下载位置注入加速图标，跳转 https://github.akams.cn/?link=<下载地址>）
 */

/* ======================================================================
 * 模块 A：GitHub 界面汉化
 * ==================================================================== */
(function (window, document) {
    'use strict';

    // 功能总开关：关闭时本模块不翻译（实时切换需刷新页面生效）
    if (GM_getValue('enable_localization', true) === false) return;

    const FeatureSet = {
        enable_RegExp: GM_getValue('enable_RegExp', true),
        enable_transDesc: GM_getValue('enable_transDesc', true),
    };

    const CONFIG = {
        LANG: 'zh-CN',
        PAGE_MAP: {
            'gist.github.com': 'gist',
            'www.githubstatus.com': 'status',
            'skills.github.com': 'skills',
            'education.github.com': 'education',
        },
        SPECIAL_SITES: ['gist', 'status', 'skills', 'education'],
        DESC_SELECTORS: {
            repository: '.f4.my-3',
            gist: ".gist-content [itemprop='about']",
        },
        OBSERVER_CONFIG: {
            childList: true,
            subtree: true,
            characterData: true,
            attributeFilter: ['value', 'placeholder', 'aria-label', 'data-confirm'],
        },
        transEngine: 'iflyrec',
        TRANS_ENGINES: {
            iflyrec: {
                name: '讯飞听见',
                url: 'https://fanyi.iflyrec.com/text-translate',
                url_api: 'https://fanyi.iflyrec.com/TJHZTranslationService/v2/textAutoTranslation',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': 'https://fanyi.iflyrec.com',
                },
                getRequestData: (text) => ({ from: 2, to: 1, type: 1, contents: [{ text }] }),
                responseIdentifier: 'biz[0]?.sectionResult[0]?.dst',
            },
        },
    };

    /* -------------------------------------------------------------
     * 【关键修复】搜索框保护选择器
     * 最新 GitHub 顶栏搜索是 React Web Component <qbsearch-input>，
     * 一旦其文本/placeholder/aria-label 被翻译改写，React 会重渲染冲突，
     * 导致搜索框直接消失。这里把整个搜索相关子树列入忽略名单，
     * 无论远程词库版本是否更新，都强制不翻译，从根本上解决搜索框 bug。
     * ----------------------------------------------------------- */
    const SEARCH_GUARD = [
        'qbsearch-input',
        'query-builder',
        '.QueryBuilder',
        '[id^="query-builder"]',
        '[data-target="qbsearch-input.inputButton"]',
        '[data-target="query-builder.input"]',
        '.AppHeader-search',
        '.header-search',
        '.search-input-container',
        '.search-input',
        'input[name="q"]',
        'input[aria-label*="Search" i]',
        'command-palette',
        '.command-palette-input-group',
        '[data-testid="command-palette"]',
    ];

    // 代码编辑器 / 富文本区域保护，避免破坏 CodeMirror/Monaco 并提升性能
    const CODE_GUARD = ['.cm-editor', '.cm-content', '.cm-line', '.react-code-text', '.blob-code-inner'];

    const EXTRA_GUARD = [...SEARCH_GUARD, ...CODE_GUARD];

    /* -------------------------------------------------------------
     * 内置兜底词库：当远程 locals.js 未加载成功时，仍能提供最常见汉化。
     * 已加载远程词库时，会被合并进 public.static（远程优先）。
     * ----------------------------------------------------------- */
    const SUPPLEMENT_STATIC = {
        'Pull requests': '拉取请求',
        'Pull request': '拉取请求',
        'Issues': '议题',
        'Marketplace': '应用市场',
        'Explore': '探索',
        'Notifications': '通知',
        'Overview': '概览',
        'Repositories': '仓库',
        'Projects': '项目',
        'Packages': '包',
        'Stars': '星标',
        'Sponsoring': '赞助中',
        'Discussions': '讨论',
        'Settings': '设置',
        'Code': '代码',
        'Actions': '操作',
        'Security': '安全',
        'Insights': '洞察',
        'Wiki': '维基',
        'Watch': '关注',
        'Unwatch': '取消关注',
        'Star': '星标',
        'Unstar': '取消星标',
        'Fork': '复刻',
        'Sign in': '登录',
        'Sign up': '注册',
        'Sign out': '退出登录',
        'New repository': '新建仓库',
        'Download ZIP': '下载 ZIP',
        'Clone': '克隆',
        'Releases': '发行版',
        'Release': '发行版',
        'Tags': '标签',
        'Branches': '分支',
        'Commits': '提交',
        'Contributors': '贡献者',
        'Add file': '添加文件',
        'Upload files': '上传文件',
        'Create new file': '新建文件',
        'Edit': '编辑',
        'Delete': '删除',
        'Save': '保存',
        'Cancel': '取消',
        'Merge': '合并',
        'Merge pull request': '合并拉取请求',
        'Close': '关闭',
        'Open': '打开',
        'Comment': '评论',
        'Reply': '回复',
        'Files changed': '变更的文件',
        'Conversation': '对话',
        'Checks': '检查',
        'Loading': '加载中',
        'Search or jump to...': '搜索或跳转…',
        'Search or jump to': '搜索或跳转',
    };

    let pageConfig = {};
    let started = false;

    // 判断远程词库是否可用
    function hasI18N() {
        return typeof I18N !== 'undefined' && I18N && I18N.conf && I18N[CONFIG.LANG];
    }

    function updatePageConfig(trigger) {
        try {
            const newType = detectPageType();
            if (newType && newType !== pageConfig.currentPageType) {
                pageConfig = buildPageConfig(newType);
            }
        } catch (e) {
            console.warn('[GH汉化] 更新页面配置出错:', e);
        }
    }

    function buildPageConfig(pageType = pageConfig.currentPageType) {
        const langDict = hasI18N() ? I18N[CONFIG.LANG] : { public: { static: {}, regexp: [] } };
        const conf = hasI18N() ? I18N.conf : {
            ignoreMutationSelectorPage: { '*': [] },
            ignoreSelectorPage: { '*': [] },
            characterDataPage: [],
        };

        const staticDict = {
            ...SUPPLEMENT_STATIC,
            ...(langDict.public?.static || {}),
            ...(langDict[pageType]?.static || {}),
        };

        const regexpRules = [
            ...(langDict[pageType]?.regexp || []),
            ...(langDict.public?.regexp || []),
        ];

        // 忽略突变选择器：始终合并搜索/代码保护选择器
        const ignoreMutationSelectors = [
            ...EXTRA_GUARD,
            ...((conf.ignoreMutationSelectorPage?.['*']) || []),
            ...((conf.ignoreMutationSelectorPage?.[pageType]) || []),
        ].join(', ');

        // 忽略元素选择器：始终合并搜索/代码保护选择器
        const ignoreSelectors = [
            ...EXTRA_GUARD,
            ...((conf.ignoreSelectorPage?.['*']) || []),
            ...((conf.ignoreSelectorPage?.[pageType]) || []),
        ].join(', ');

        return {
            currentPageType: pageType,
            staticDict,
            regexpRules,
            ignoreMutationSelectors,
            ignoreSelectors,
            characterData: (conf.characterDataPage || []).includes(pageType),
            tranSelectors: [
                ...(langDict.public?.selector || []),
                ...(langDict[pageType]?.selector || []),
            ],
        };
    }

    function watchUpdate() {
        let previousURL = window.location.href;

        const handleUrlChange = () => {
            const currentURL = window.location.href;
            if (currentURL !== previousURL) {
                previousURL = currentURL;
                updatePageConfig('DOM变化');
            }
        };

        const processMutations = (mutations) => {
            mutations.flatMap(({ target, addedNodes, type }) => {
                if (type === 'childList' && addedNodes.length > 0) return [...addedNodes];
                return (type === 'attributes' || (type === 'characterData' && pageConfig.characterData))
                    ? [target]
                    : [];
            })
            .filter((node) => {
                // 命中忽略选择器（含搜索框保护）的节点或其祖先，直接跳过
                if (!pageConfig.ignoreMutationSelectors) return true;
                const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
                return !(el && el.closest?.(pageConfig.ignoreMutationSelectors));
            })
            .forEach((node) => {
                try {
                    traverseNode(node);
                } catch (e) {
                    // 单个节点出错不影响整体，避免连锁导致搜索框等组件被误伤
                    console.warn('[GH汉化] 节点翻译出错:', e);
                }
            });
        };

        new MutationObserver((mutations) => {
            handleUrlChange();
            if (pageConfig.currentPageType) processMutations(mutations);
        }).observe(document.body, CONFIG.OBSERVER_CONFIG);
    }

    function traverseNode(rootNode) {
        const handleTextNode = (node) => {
            if (node.length > 500) return;
            transElement(node, 'data');
        };

        if (rootNode.nodeType === Node.TEXT_NODE) {
            handleTextNode(rootNode);
            return;
        }
        if (rootNode.nodeType !== Node.ELEMENT_NODE) return;

        // 根节点本身命中忽略选择器则整棵跳过（含搜索框保护）
        if (pageConfig.ignoreSelectors && rootNode.matches?.(pageConfig.ignoreSelectors)) return;

        const treeWalker = document.createTreeWalker(
            rootNode,
            NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
            (node) =>
                (node.nodeType === Node.ELEMENT_NODE && node.matches?.(pageConfig.ignoreSelectors))
                    ? NodeFilter.FILTER_REJECT
                    : NodeFilter.FILTER_ACCEPT,
        );

        const handleElement = (node) => {
            switch (node.tagName) {
                case 'RELATIVE-TIME':
                    if (node.shadowRoot) transTimeElement(node.shadowRoot);
                    return;

                case 'INPUT':
                case 'TEXTAREA':
                    if (['button', 'submit', 'reset'].includes(node.type)) {
                        transElement(node.dataset, 'confirm');
                        transElement(node, 'value');
                    } else {
                        transElement(node, 'placeholder');
                    }
                    break;

                case 'OPTGROUP':
                    transElement(node, 'label');
                    break;

                case 'BUTTON':
                    transElement(node, 'title');
                    transElement(node.dataset, 'confirm');
                    transElement(node.dataset, 'confirmText');
                    transElement(node.dataset, 'confirmCancelText');
                    transElement(node, 'cancelConfirmText');
                    transElement(node.dataset, 'disableWith');
                // 故意贯穿到 A/SPAN 处理 title

                case 'A':
                case 'SPAN':
                    transElement(node, 'title');
                    transElement(node.dataset, 'visibleText');
                // 故意贯穿到 default 处理 tooltip

                default:
                    if (/tooltipped/.test(node.className)) transElement(node, 'ariaLabel');
            }
        };

        const handlers = {
            [Node.ELEMENT_NODE]: handleElement,
            [Node.TEXT_NODE]: handleTextNode,
        };

        let currentNode;
        while ((currentNode = treeWalker.nextNode())) {
            try {
                handlers[currentNode.nodeType]?.(currentNode);
            } catch (e) {
                /* 忽略单节点错误 */
            }
        }
    }

    function detectPageType() {
        const url = new URL(window.location.href);
        const { PAGE_MAP, SPECIAL_SITES } = CONFIG;
        const { hostname, pathname } = url;

        const site = PAGE_MAP[hostname] || 'github';
        const isLogin = document.body.classList.contains('logged-in');
        const metaLocation = document.head.querySelector('meta[name="analytics-location"]')?.content || '';

        const isSession = document.body.classList.contains('session-authentication');
        const isHomepage = pathname === '/' && site === 'github';
        const isProfile = document.body.classList.contains('page-profile') || metaLocation === '/<user-name>';
        const isRepository = /\/<user-name>\/<repo-name>/.test(metaLocation);
        const isOrganization = /\/<org-login>/.test(metaLocation) || /^\/(?:orgs|organizations)/.test(pathname);

        if (!hasI18N()) return site; // 无远程词库时用站点名兜底

        const { rePagePathRepo, rePagePathOrg, rePagePath } = I18N.conf;

        let pageType;
        switch (true) {
            case isSession:
                pageType = 'session-authentication';
                break;
            case SPECIAL_SITES.includes(site):
                pageType = site;
                break;
            case isProfile: {
                const tabParam = new URLSearchParams(url.search).get('tab');
                pageType = pathname.includes('/stars') ? 'page-profile/stars'
                    : tabParam ? `page-profile/${tabParam}`
                    : 'page-profile';
                break;
            }
            case isHomepage:
                pageType = isLogin ? 'dashboard' : 'homepage';
                break;
            case isRepository: {
                const repoMatch = pathname.match(rePagePathRepo);
                pageType = repoMatch ? `repository/${repoMatch[1]}` : 'repository';
                break;
            }
            case isOrganization: {
                const orgMatch = pathname.match(rePagePathOrg);
                pageType = orgMatch ? `orgs/${orgMatch[1] || orgMatch.slice(-1)[0]}` : 'orgs';
                break;
            }
            default: {
                const pathMatch = pathname.match(rePagePath);
                pageType = pathMatch ? (pathMatch[1] || pathMatch.slice(-1)[0]) : false;
            }
        }

        if (pageType === false || !I18N[CONFIG.LANG]?.[pageType]) {
            // 词库缺失时退回 public（仍可翻译公共部分 + 内置兜底），而非彻底不翻译
            return 'public';
        }
        return pageType;
    }

    function transTitle() {
        if (!hasI18N() || !I18N[CONFIG.LANG].title) return;
        const text = document.title;
        let translatedText = I18N[CONFIG.LANG].title.static?.[text] || '';
        if (!translatedText) {
            const res = I18N[CONFIG.LANG].title.regexp || [];
            for (const [pattern, replacement] of res) {
                translatedText = text.replace(pattern, replacement);
                if (translatedText !== text) break;
            }
        }
        if (translatedText) document.title = translatedText;
    }

    function transTimeElement(el) {
        const text = el.childNodes.length > 0 ? el.lastChild.textContent : el.textContent;
        const translatedText = text.replace(/^on/, '');
        if (translatedText !== text) el.textContent = translatedText;
    }

    function transElement(el, field) {
        const text = el[field];
        if (!text) return false;
        const translatedText = transText(text);
        if (translatedText) el[field] = translatedText;
    }

    function transText(text) {
        const shouldSkip = (t) => /^[\s0-9]*$/.test(t) || /^[\u4e00-\u9fa5]+$/.test(t) || !/[a-zA-Z,.]/.test(t);
        if (shouldSkip(text)) return false;

        const trimmedText = text.trim();
        const cleanedText = trimmedText.replace(/\xa0|[\s]+/g, ' ');

        const translatedText = fetchTranslatedText(cleanedText);
        if (translatedText && translatedText !== cleanedText) {
            return text.replace(trimmedText, translatedText);
        }
        return false;
    }

    function fetchTranslatedText(text) {
        let translatedText = pageConfig.staticDict?.[text];
        if (typeof translatedText === 'string') return translatedText;

        if (FeatureSet.enable_RegExp && pageConfig.regexpRules) {
            for (const [pattern, replacement] of pageConfig.regexpRules) {
                translatedText = text.replace(pattern, replacement);
                if (translatedText !== text) return translatedText;
            }
        }
        return false;
    }

    function transBySelector() {
        pageConfig.tranSelectors?.forEach(([selector, translatedText]) => {
            const element = document.querySelector(selector);
            if (element) element.textContent = translatedText;
        });
    }

    /* ------------------ 描述翻译（可选功能，保留） ------------------ */
    function getNestedProperty(obj, path) {
        return path.split('.').reduce((acc, part) => {
            const match = part.match(/(\w+)(?:\[(\d+)\])?/);
            if (!match) return undefined;
            const key = match[1];
            const index = match[2];
            if (acc && acc[key] !== undefined) return index !== undefined ? acc[key][index] : acc[key];
            return undefined;
        }, obj);
    }

    function requestRemoteTranslation(text) {
        return new Promise((resolve) => {
            const { url_api, method, headers, getRequestData, responseIdentifier } = CONFIG.TRANS_ENGINES[CONFIG.transEngine];
            const requestData = getRequestData(text);
            GM_xmlhttpRequest({
                method,
                url: url_api,
                headers,
                data: method === 'POST' ? JSON.stringify(requestData) : null,
                onload: (res) => {
                    try {
                        const result = JSON.parse(res.responseText);
                        resolve(getNestedProperty(result, responseIdentifier) || '翻译失败');
                    } catch (err) {
                        resolve('翻译失败');
                    }
                },
                onerror: () => resolve('翻译失败'),
            });
        });
    }

    function transDesc(selector) {
        const element = document.querySelector(selector);
        if (!element || element.nextElementSibling?.id === 'translate-me') return;

        const button = document.createElement('div');
        button.id = 'translate-me';
        button.style.cssText = 'color: #1b95e0; font-size: small; cursor: pointer;';
        button.textContent = '翻译';
        element.after(button);

        button.addEventListener('click', async () => {
            if (button.disabled) return;
            button.disabled = true;
            try {
                const descText = element.textContent.trim();
                if (!descText) return;
                const translatedText = await requestRemoteTranslation(descText);
                const { name, url } = CONFIG.TRANS_ENGINES[CONFIG.transEngine];
                const resultContainer = document.createElement('div');
                resultContainer.innerHTML =
                    `<span style='font-size: small'>由 <a target='_blank' style='color:#1b95e0;' href=${url}>${name}</a> 翻译👇</span><br/>`;
                resultContainer.appendChild(document.createTextNode(translatedText));
                button.remove();
                element.after(resultContainer);
            } finally {
                button.disabled = false;
            }
        });
    }

    function registerMenuCommand() {
        const createMenuCommand = (config) => {
            const { label, key, callback } = config;
            let menuId;
            const getMenuLabel = (l, isEnabled) => `${isEnabled ? '禁用' : '启用'} ${l}`;
            const toggle = () => {
                const next = !FeatureSet[key];
                GM_setValue(key, next);
                FeatureSet[key] = next;
                GM_notification(`${label}已${next ? '启用' : '禁用'}`);
                if (callback) callback(next);
                GM_unregisterMenuCommand(menuId);
                menuId = GM_registerMenuCommand(getMenuLabel(label, next), toggle);
            };
            menuId = GM_registerMenuCommand(getMenuLabel(label, FeatureSet[key]), toggle);
        };

        createMenuCommand({
            label: '正则翻译',
            key: 'enable_RegExp',
            callback: (on) => { if (on) traverseNode(document.body); },
        });
        createMenuCommand({
            label: '描述翻译按钮',
            key: 'enable_transDesc',
            callback: (on) => {
                if (on && CONFIG.DESC_SELECTORS[pageConfig.currentPageType]) {
                    transDesc(CONFIG.DESC_SELECTORS[pageConfig.currentPageType]);
                } else {
                    document.getElementById('translate-me')?.remove();
                }
            },
        });
    }

    function start() {
        if (started) return;
        started = true;

        if (!hasI18N()) {
            console.warn('[GH汉化] 远程词库 locals.js 未加载，已启用内置兜底词库（覆盖较少）。');
        }

        document.documentElement.lang = CONFIG.LANG;
        new MutationObserver(() => {
            if (document.documentElement.lang === 'en') document.documentElement.lang = CONFIG.LANG;
        }).observe(document.documentElement, { attributeFilter: ['lang'] });

        document.addEventListener('turbo:load', () => {
            if (!pageConfig.currentPageType) return;
            transTitle();
            transBySelector();
            if (FeatureSet.enable_transDesc && CONFIG.DESC_SELECTORS[pageConfig.currentPageType]) {
                transDesc(CONFIG.DESC_SELECTORS[pageConfig.currentPageType]);
            }
        });

        try { registerMenuCommand(); } catch (e) { /* 菜单注册失败不影响翻译 */ }

        updatePageConfig('首次载入');
        if (pageConfig.currentPageType) {
            transTitle();
            traverseNode(document.body);
        }
        watchUpdate();
    }

    // document-start 时 body 可能尚未就绪，等 DOM 可用后再启动
    if (document.body) {
        // 已就绪（极少数情况）
        if (document.readyState === 'loading') {
            window.addEventListener('DOMContentLoaded', start, { once: true });
        } else {
            start();
        }
    } else {
        window.addEventListener('DOMContentLoaded', start, { once: true });
    }
})(window, document);


/* ======================================================================
 * 模块 B：下载加速（github.akams.cn）
 * 在 Release 资源 / 源码归档 / Code(ZIP) / Raw 文件 等可下载位置后，
 * 注入一个「🚀 加速」图标，点击在新标签打开：
 *     https://github.akams.cn/?link=<完整下载地址>
 * 该站会自动把地址填入输入框并触发加速下载。
 * ==================================================================== */
(function (window, document) {
    'use strict';

    const ACCEL_BASE = 'https://github.akams.cn/?link=';
    const MARK = 'ghAkamsAccel';        // dataset 去重标记（驼峰，确保可正确写入 data-*）
    const MARK_CLASS = 'gh-akams-accel'; // 注入图标的 CSS 类
    const HOST_GUARD = /github\.akams\.cn/i; // 加速站自身链接，绝不二次处理

    // 加速站可识别（会自动填入/触发）的下载地址特征
    const ACCELERABLE = [
        /\/releases\/download\//i,
        /\/archive\/(refs\/(tags|heads)\/)?[^/]+\.(zip|tar\.gz|tgz)/i,
        /\/archive\/[0-9a-f]{7,40}\.(zip|tar\.gz|tgz)/i,
        /\/raw\//i,
        /raw\.githubusercontent\.com/i,
        /codeload\.github\.com/i,
        /objects\.githubusercontent\.com/i,
    ];

    // 火箭图标
    const ROCKET_SVG =
        '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" style="vertical-align:text-bottom;fill:currentColor">' +
        '<path d="M9.5 1.5c2.6 0 4.5 1.9 4.5 4.5 0 .8-.2 1.6-.5 2.3l1 3.2-3.2-1c-.7.3-1.5.5-2.3.5-2.6 0-4.5-1.9-4.5-4.5S6.9 1.5 9.5 1.5Zm0 2.2A2.3 2.3 0 1 0 11.8 6 2.3 2.3 0 0 0 9.5 3.7ZM3 10.2 5.8 13l-1.9.6a1 1 0 0 1-1.3-1.3L3 10.2Z"/></svg>';

    function isAccelerable(href) {
        if (!href) return false;
        // 仅处理 github 生态且形似下载的地址
        if (!/^https?:\/\//i.test(href)) return false;
        return ACCELERABLE.some((re) => re.test(href));
    }

    // 创建一个加速小图标（<a>）
    function createAccelIcon(href) {
        const a = document.createElement('a');
        a.href = ACCEL_BASE + encodeURIComponent(href);
        a.target = '_blank';
        a.rel = 'noreferrer noopener nofollow';
        a.className = MARK_CLASS;
        a.dataset[MARK] = '1'; // 自身也标记，杜绝二次注入
        a.title = '通过 github.akams.cn 加速下载（点击自动填入地址）\n' + href;
        a.innerHTML = ROCKET_SVG + '<span style="margin-left:2px;">加速</span>';
        a.style.cssText = [
            'display:inline-flex',
            'align-items:center',
            'gap:1px',
            'margin-left:6px',
            'padding:1px 6px',
            'font-size:12px',
            'line-height:18px',
            'color:#ffffff',
            'background:#1f6feb',
            'border-radius:6px',
            'text-decoration:none',
            'white-space:nowrap',
            'vertical-align:middle',
            'cursor:pointer',
        ].join(';');
        a.addEventListener('mouseenter', () => { a.style.background = '#388bfd'; });
        a.addEventListener('mouseleave', () => { a.style.background = '#1f6feb'; });
        // 阻止事件冒泡，避免触发所在行/卡片的其它点击行为
        a.addEventListener('click', (e) => { e.stopPropagation(); });
        return a;
    }

    // 给单个下载链接注入加速图标。
    // 返回 true 表示本次「新注入」了图标（用于扫描重试判断）；其余情况返回 false。
    // 兼容 GitHub 先插节点后设 href 的模式：href 变化时会同步刷新已注入图标的跳转地址。
    function decorateLink(link) {
        if (!link) return false;
        const href = link.href; // 绝对地址
        const isAcc = isAccelerable(href);
        const hasIcon = link.dataset[MARK] === '1';

        if (HOST_GUARD.test(href)) return false;          // 跳过加速站自身链接
        if (!isAcc) return false;                          // 不是可下载地址

        if (hasIcon) {
            // 已注入，但 GitHub 偶发会复用同一节点、仅改写 href（React 复用），同步刷新图标地址
            if (link.dataset[MARK + 'Url'] !== href) {
                const sibling = link.nextElementSibling;
                if (sibling && sibling.classList && sibling.classList.contains(MARK_CLASS)) {
                    sibling.href = ACCEL_BASE + encodeURIComponent(href);
                    sibling.title = '通过 github.akams.cn 加速下载（点击自动填入地址）\n' + href;
                }
                link.dataset[MARK + 'Url'] = href;
            }
            return false;
        }

        link.dataset[MARK] = '1';
        link.dataset[MARK + 'Url'] = href;
        const icon = createAccelIcon(href);
        link.insertAdjacentElement
            ? link.insertAdjacentElement('afterend', icon)
            : link.after(icon);
        return true;
    }

    // 移除所有已注入的加速图标（关闭功能时调用）
    function removeAccelIcons() {
        document.querySelectorAll('a.' + MARK_CLASS).forEach((a) => a.remove());
    }

    // 全页扫描可加速的下载链接，返回本次新注入图标的数量
    function scan(root = document) {
        if (GM_getValue('enable_accel', true) === false) {
            removeAccelIcons();
            return 0;
        }
        let anchors;
        try {
            anchors = root.querySelectorAll('a[href]');
        } catch (e) {
            return 0;
        }
        let added = 0;
        anchors.forEach((a) => {
            try { if (decorateLink(a)) added++; } catch (e) { /* 单个失败忽略 */ }
        });
        return added;
    }

    // 处理 “Download ZIP” 下拉项：其 href 为 /archive/refs/heads/xxx.zip，已被 ACCELERABLE 覆盖
    // 处理 Raw 页面顶部工具栏的下载按钮（有时是 button 携带 data-url，退化为扫描 a[href]）

    let scheduled = false;
    let pendingRetries = 0;
    function scheduleScan() {
        if (scheduled) return;
        scheduled = true;
        setTimeout(() => {
            scheduled = false;
            let added = 0;
            try { added = scan(); } catch (e) { /* ignore */ }
            // 本轮有新图标注入，说明内容仍在陆续加载（GitHub 流式/replace 渲染），再追最多 3 轮
            if (added > 0 && pendingRetries < 3) {
                pendingRetries++;
                setTimeout(scheduleScan, 400);
            } else {
                pendingRetries = 0;
            }
        }, 250);
    }

    function init() {
        scan();

        // 监听 DOM 变化：
        //   - childList：Release 资源、Code 下拉、pjax/turbo 切页多为动态插入
        //   - attributes[href]：GitHub 偶发「先插入 <a> 后再用 JS 赋 href」，不监听会漏注入图标
        const mo = new MutationObserver((mutations) => {
            let hit = false;
            for (const m of mutations) {
                if (m.addedNodes && m.addedNodes.length) { hit = true; break; }
                if (m.type === 'attributes' && m.target && m.target.tagName === 'A') { hit = true; break; }
            }
            if (hit) scheduleScan();
        });
        mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });

        // SPA 路由变化（声明了 @grant window.onurlchange 时会触发）
        window.addEventListener('urlchange', scheduleScan);
        document.addEventListener('turbo:load', scheduleScan);
        document.addEventListener('turbo:render', scheduleScan);
        document.addEventListener('pjax:end', scheduleScan);
        window.addEventListener('popstate', scheduleScan);
        // 整页 load 兜底：极端懒加载场景再扫一次
        window.addEventListener('load', scheduleScan);
    }

    if (document.body) {
        if (document.readyState === 'loading') {
            window.addEventListener('DOMContentLoaded', init, { once: true });
        } else {
            init();
        }
    } else {
        window.addEventListener('DOMContentLoaded', init, { once: true });
    }

    // 暴露给统一设置面板：实时开启/关闭加速图标
    window.__ghAccel = {
        rescan: () => { if (GM_getValue('enable_accel', true)) scan(); },
        remove: removeAccelIcons,
    };
})(window, document);


/* ======================================================================
 * 模块 C：字体优化（云端字体 · 国内可用）
 * 参考「字体渲染（自用脚本）」思路，聚焦 GitHub：加载云端 webfont 并应用字体栈。
 * 默认 CDN（均可在设置面板切换/自定义）：
 *   - UI 中文：霞鹜文楷 LXGW WenKai Screen（fastly.jsdelivr.net 国内镜像）
 *   - 代码：JetBrains Mono（fonts.font.im 国内 Google Fonts 镜像）
 * ==================================================================== */
(function (window, document) {
    'use strict';

    const FONT_PRESETS = {
        system:    { label: '系统默认优化（不加载云端字体）', ui: null, code: null },
        lxgw:      { label: '霞鹜文楷（UI 中文）', ui: 'https://fastly.jsdelivr.net/npm/lxgw-wenkai-screen-webfont/style.css', code: null },
        jetbrains: { label: 'JetBrains Mono（代码）', ui: null, code: 'https://fonts.font.im/css2?family=JetBrains+Mono:wght@400;500;700&display=swap' },
        combo:     { label: '霞鹜文楷 + JetBrains Mono（推荐）', ui: 'https://fastly.jsdelivr.net/npm/lxgw-wenkai-screen-webfont/style.css', code: 'https://fonts.font.im/css2?family=JetBrains+Mono:wght@400;500;700&display=swap' },
        custom:    { label: '自定义', ui: null, code: null },
    };

    function applyFont() {
        // 清理旧注入
        document.querySelectorAll('link[data-gh-font]').forEach((l) => l.remove());
        document.querySelectorAll('style[data-gh-font]').forEach((s) => s.remove());

        if (GM_getValue('enable_font', true) === false) return;

        const presetKey = GM_getValue('font_preset', 'combo');
        const preset = FONT_PRESETS[presetKey] || FONT_PRESETS.combo;

        // 自定义预设：URL 与字体族名均实时读取（保存后立即生效，不依赖启动时的缓存）
        let uiUrl = preset.ui, codeUrl = preset.code;
        let uiFamily = preset.ui ? '"LXGW WenKai Screen", ' : '';
        let codeFamily = preset.code ? '"JetBrains Mono", ' : '';
        if (presetKey === 'custom') {
            uiUrl = GM_getValue('font_ui_url', '') || null;
            codeUrl = GM_getValue('font_code_url', '') || null;
            const uf = (GM_getValue('font_ui_family', '') || '').trim();
            const cf = (GM_getValue('font_code_family', '') || '').trim();
            if (uf) uiFamily = '"' + uf + '", ';
            if (cf) codeFamily = '"' + cf + '", ';
        }

        // 注入云端字体 CSS
        [uiUrl, codeUrl].forEach((url) => {
            if (!url) return;
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            link.dataset.ghFont = '1';
            (document.head || document.documentElement).appendChild(link);
        });

        const smoothing = GM_getValue('font_smoothing', true)
            ? '-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;'
            : '';
        const scale = parseFloat(GM_getValue('font_scale', '1')) || 1;

        const css =
            ':root{' + smoothing + '}' +
            'body,.markdown-body,#readme,.comment-body,.Box-body,.react-code-text,.blob-code-inner,' +
            '.cm-line,.js-comment-body,.timeline-comment-body{' +
            'font-family:' + uiFamily + '"PingFang SC","Microsoft YaHei",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif !important;' +
            '}' +
            'pre,code,.blob-code-inner,.cm-line,.react-code-text,.highlight,textarea.input-monospace,' +
            '.input-monospace,.pl-c,.pl-v,.pl-s,.pl-k{' +
            'font-family:' + codeFamily + '"JetBrains Mono","Fira Code","Cascadia Code",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace !important;' +
            '}' +
            (scale !== 1 ? 'body{font-size:' + scale + 'em;}' : '');

        const style = document.createElement('style');
        style.dataset.ghFont = '1';
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
    }

    function initFont() {
        if (document.head) applyFont();
        else document.addEventListener('DOMContentLoaded', applyFont, { once: true });
        window.addEventListener('load', () => setTimeout(applyFont, 500));
    }

    initFont();
    window.__ghFont = { apply: applyFont };
})(window, document);


/* ======================================================================
 * 模块 D：搜索引擎切换（GitHub 版）
 * 参考「Google & baidu Switcher」核心逻辑：取当前查询词 → 拼接到各引擎 URL → 新标签打开。
 * ==================================================================== */
(function (window, document) {
    'use strict';

    const ENGINES = {
        baidu:  { name: '百度',       color: '#2932e1', url: 'https://www.baidu.com/s?ie=utf-8&wd=' },
        bing:   { name: 'Bing',       color: '#008373', url: 'https://www.bing.com/search?q=' },
        google: { name: 'Google',     color: '#4285f4', url: 'https://www.google.com/search?q=' },
        ddg:    { name: 'DuckDuckGo', color: '#de5833', url: 'https://duckduckgo.com/?q=' },
        sogou:  { name: '搜狗',       color: '#ff6000', url: 'https://www.sogou.com/web?query=' },
    };
    const NON_REPO = ['settings', 'orgs', 'sponsors', 'topics', 'collections', 'about',
        'explore', 'notifications', 'new', 'login', 'join', 'marketplace', 'pricing', 'sessions'];

    function getQuery() {
        const q = new URL(window.location.href).searchParams.get('q');
        if (q) return q.trim();
        const m = window.location.pathname.match(/^\/([^/]+)\/([^/]+)(?:\/|$)/);
        if (m && m[2] && !NON_REPO.includes(m[1])) return m[1] + '/' + m[2];
        // qbsearch-input 是自定义元素标签名（非 id）；兼容新旧两种搜索组件
        const input = document.querySelector('qbsearch-input input, #query-builder input, #query-builder-input, input[name="q"]');
        return input ? input.value.trim() : '';
    }

    function buildWidget() {
        const old = document.getElementById('gh-search-switch');
        if (old) old.remove();
        if (GM_getValue('enable_searchswitch', true) === false) return;

        const enabled = (GM_getValue('search_engines', 'baidu,bing,google,ddg,sogou') || '')
            .split(',').map((s) => s.trim()).filter(Boolean);
        if (!enabled.length) return;

        const bar = document.createElement('div');
        bar.id = 'gh-search-switch';
        bar.style.cssText = [
            'position:fixed', 'top:60px', 'right:12px', 'z-index:9999',
            'display:flex', 'gap:6px', 'align-items:center',
            'background:#ffffff', 'border:1px solid #d0d7de', 'border-radius:10px',
            'padding:6px 8px', 'box-shadow:0 4px 14px rgba(0,0,0,.12)',
            'font-size:12px', 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        ].join(';');
        const label = document.createElement('span');
        label.textContent = '用：';
        label.style.cssText = 'color:#656d76;';
        bar.appendChild(label);

        enabled.forEach((key) => {
            const e = ENGINES[key];
            if (!e) return;
            const b = document.createElement('a');
            b.textContent = e.name;
            b.href = '#';
            b.style.cssText = 'color:#fff;background:' + e.color + ';padding:2px 8px;' +
                'border-radius:6px;text-decoration:none;font-weight:600;cursor:pointer;';
            b.addEventListener('click', (ev) => {
                ev.preventDefault();
                const q = getQuery();
                if (!q) { window.alert('未能获取当前搜索词（请先进入仓库或搜索页）'); return; }
                const target = e.url + encodeURIComponent(q);
                if (typeof GM_openInTab !== 'undefined') GM_openInTab(target, true);
                else window.open(target, '_blank');
            });
            bar.appendChild(b);
        });
        (document.body || document.documentElement).appendChild(bar);
    }

    function initSearch() {
        if (document.body) buildWidget();
        else document.addEventListener('DOMContentLoaded', buildWidget, { once: true });
        window.addEventListener('load', () => setTimeout(buildWidget, 600));
        window.addEventListener('urlchange', () => setTimeout(buildWidget, 300));
        document.addEventListener('turbo:load', () => setTimeout(buildWidget, 300));
        document.addEventListener('pjax:end', () => setTimeout(buildWidget, 300));
    }

    initSearch();
    window.__ghSearch = { build: buildWidget };
})(window, document);


/* ======================================================================
 * 模块 E：统一美化设置面板
 * 浮动齿轮按钮 + 居中模态；四个功能卡片（汉化 / 下载加速 / 字体优化 / 搜索引擎切换），
 * 各带开关与选项；保存即生效。已移除各参考脚本原作者的署名与推广信息。
 * ==================================================================== */
(function (window, document) {
    'use strict';

    const DEFAULTS = {
        enable_localization: true,
        enable_accel: true,
        enable_font: true,
        font_preset: 'combo',
        font_smoothing: true,
        font_scale: '1',
        font_ui_url: '',
        font_code_url: '',
        font_ui_family: '',
        font_code_family: '',
        enable_searchswitch: true,
        search_engines: 'baidu,bing,google,ddg,sogou',
    };

    const STYLE = [
        '.gh-settings-overlay{position:fixed;inset:0;background:rgba(27,31,36,.5);z-index:100000;',
        'display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',
        '.gh-settings-modal{background:#fff;width:min(640px,92vw);max-height:86vh;overflow:auto;border-radius:14px;box-shadow:0 16px 48px rgba(0,0,0,.28);}',
        '.gh-settings-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #eaecef;}',
        '.gh-settings-header h2{margin:0;font-size:16px;color:#1f2328;}',
        '.gh-settings-close{border:none;background:#f3f4f6;width:28px;height:28px;border-radius:8px;cursor:pointer;font-size:16px;color:#57606a;}',
        '.gh-settings-body{padding:8px 20px 16px;}',
        '.gh-card{border:1px solid #eaecef;border-radius:10px;padding:14px 16px;margin:12px 0;}',
        '.gh-card h3{margin:0 0 4px;font-size:14px;color:#1f2328;display:flex;align-items:center;justify-content:space-between;}',
        '.gh-card>p{margin:4px 0 10px;font-size:12px;color:#656d76;line-height:1.5;}',
        '.gh-row{display:flex;align-items:center;gap:8px;margin:8px 0;font-size:13px;color:#1f2328;}',
        '.gh-row>label{flex:1;}',
        '.gh-switch{position:relative;width:40px;height:22px;flex:none;}',
        '.gh-switch input{opacity:0;width:0;height:0;}',
        '.gh-slider{position:absolute;cursor:pointer;inset:0;background:#d0d7de;border-radius:22px;transition:.2s;}',
        '.gh-slider:before{content:"";position:absolute;width:16px;height:16px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.2s;}',
        '.gh-switch input:checked+.gh-slider{background:#1f6feb;}',
        '.gh-switch input:checked+.gh-slider:before{transform:translateX(18px);}',
        '.gh-settings select,.gh-settings input[type=text]{padding:5px 8px;border:1px solid #d0d7de;border-radius:6px;font-size:13px;max-width:100%;}',
        '.gh-engines{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px;}',
        '.gh-engines label{display:flex;align-items:center;gap:4px;font-size:13px;}',
        '.gh-settings-footer{display:flex;gap:10px;justify-content:flex-end;padding:14px 20px;border-top:1px solid #eaecef;}',
        '.gh-btn{border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;}',
        '.gh-btn-primary{background:#1f6feb;color:#fff;}',
        '.gh-btn-ghost{background:#f3f4f6;color:#1f2328;}',
        '.gh-gear{position:fixed;right:14px;bottom:14px;z-index:99999;width:42px;height:42px;border-radius:50%;border:none;',
        'background:#1f6feb;color:#fff;font-size:20px;cursor:pointer;box-shadow:0 6px 18px rgba(31,111,235,.4);}',
    ].join('');

    function get(key) { return GM_getValue(key, DEFAULTS[key]); }
    function set(key, val) { GM_setValue(key, val); }

    function applyLive() {
        if (window.__ghFont) window.__ghFont.apply();
        if (window.__ghSearch) window.__ghSearch.build();
        const accel = get('enable_accel');
        if (window.__ghAccel) { accel ? window.__ghAccel.rescan() : window.__ghAccel.remove(); }
    }

    function buildModal() {
        const overlay = document.createElement('div');
        overlay.className = 'gh-settings-overlay';
        overlay.style.display = 'none';

        const modal = document.createElement('div');
        modal.className = 'gh-settings-modal';

        modal.innerHTML =
            '<div class="gh-settings-header"><h2>GitHub 增强套件 · 设置</h2>' +
            '<button class="gh-settings-close" title="关闭">×</button></div>' +
            '<div class="gh-settings-body">' +

            // 汉化
            '<div class="gh-card"><h3><span>界面汉化</span>' + toggle('enable_localization') + '</h3>' +
            '<p>最新 GitHub 界面完整汉化（已修复搜索框消失问题）。开关需刷新页面生效。</p></div>' +

            // 下载加速
            '<div class="gh-card"><h3><span>下载加速</span>' + toggle('enable_accel') + '</h3>' +
            '<p>在 Release 资源 / Code(ZIP) / Raw 等下载位置注入加速图标，跳转 github.akams.cn。</p></div>' +

            // 字体优化
            '<div class="gh-card"><h3><span>字体优化（云端字体·国内可用）</span>' + toggle('enable_font') + '</h3>' +
            '<p>从国内可用 CDN 加载云端字体并应用到 GitHub 界面与代码。切换预设即时生效。</p>' +
            '<div class="gh-row"><label>字体预设</label>' + presetSelect() + '</div>' +
            '<div class="gh-row"><label>字体平滑（抗锯齿）</label>' + toggle('font_smoothing') + '</div>' +
            '<div class="gh-row"><label>字号缩放（<span id="gh-scale-val">' + get('font_scale') + '</span>×）</label>' +
            '<input type="range" id="gh-scale" min="0.8" max="1.4" step="0.05" value="' + get('font_scale') + '"></div>' +
            '<div id="gh-custom-fonts" style="display:' + (get('font_preset') === 'custom' ? 'block' : 'none') + '">' +
            '<div class="gh-row"><label>UI 字体 CSS 地址</label><input type="text" id="gh-ui-url" placeholder="https://.../font.css" style="flex:1" value="' + escapeAttr(get('font_ui_url')) + '"></div>' +
            '<div class="gh-row"><label>UI 字体族名</label><input type="text" id="gh-ui-family" placeholder="LXGW WenKai Screen" style="flex:1" value="' + escapeAttr(get('font_ui_family')) + '"></div>' +
            '<div class="gh-row"><label>代码字体 CSS 地址</label><input type="text" id="gh-code-url" placeholder="https://.../font.css" style="flex:1" value="' + escapeAttr(get('font_code_url')) + '"></div>' +
            '<div class="gh-row"><label>代码字体族名</label><input type="text" id="gh-code-family" placeholder="JetBrains Mono" style="flex:1" value="' + escapeAttr(get('font_code_family')) + '"></div>' +
            '</div></div>' +

            // 搜索引擎切换
            '<div class="gh-card"><h3><span>搜索引擎切换</span>' + toggle('enable_searchswitch') + '</h3>' +
            '<p>在页面右上角提供按钮，将当前仓库 / 搜索词一键发往以下引擎（新标签打开）。</p>' +
            '<div class="gh-engines" id="gh-engines"></div></div>' +

            '</div>' +
            '<div class="gh-settings-footer">' +
            '<button class="gh-btn gh-btn-ghost" id="gh-reset">恢复默认</button>' +
            '<button class="gh-btn gh-btn-primary" id="gh-save">保存并应用</button>' +
            '</div>';

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // 绑定引擎复选框
        const enginesBox = modal.querySelector('#gh-engines');
        const enabled = (get('search_engines') || '').split(',').map((s) => s.trim()).filter(Boolean);
        ['baidu', 'bing', 'google', 'ddg', 'sogou'].forEach((key) => {
            const lbl = document.createElement('label');
            lbl.innerHTML = '<input type="checkbox" value="' + key + '"' + (enabled.includes(key) ? ' checked' : '') + '> ' + ENGINE_NAMES[key];
            enginesBox.appendChild(lbl);
        });

        // 预设切换显隐自定义框
        modal.querySelector('#gh-font-preset').addEventListener('change', (e) => {
            modal.querySelector('#gh-custom-fonts').style.display = e.target.value === 'custom' ? 'block' : 'none';
        });
        // 缩放数值显示
        modal.querySelector('#gh-scale').addEventListener('input', (e) => {
            modal.querySelector('#gh-scale-val').textContent = e.target.value;
        });

        // 关闭
        const close = () => { overlay.style.display = 'none'; };
        modal.querySelector('.gh-settings-close').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

        // 保存
        modal.querySelector('#gh-save').addEventListener('click', () => {
            modal.querySelectorAll('.gh-switch input').forEach((cb) => set(cb.dataset.key, cb.checked));
            set('font_preset', modal.querySelector('#gh-font-preset').value);
            set('font_scale', modal.querySelector('#gh-scale').value);
            set('font_ui_url', modal.querySelector('#gh-ui-url').value.trim());
            set('font_code_url', modal.querySelector('#gh-code-url').value.trim());
            set('font_ui_family', modal.querySelector('#gh-ui-family').value.trim());
            set('font_code_family', modal.querySelector('#gh-code-family').value.trim());
            const engines = Array.from(modal.querySelectorAll('#gh-engines input:checked')).map((c) => c.value);
            set('search_engines', engines.join(','));
            applyLive();
            close();
            GM_notification && GM_notification({ text: '设置已保存并应用', title: 'GitHub 增强套件' });
        });

        // 恢复默认
        modal.querySelector('#gh-reset').addEventListener('click', () => {
            Object.keys(DEFAULTS).forEach((k) => set(k, DEFAULTS[k]));
            applyLive();
            openSettings(); // 重渲染
        });

        return overlay;
    }

    const ENGINE_NAMES = { baidu: '百度', bing: 'Bing', google: 'Google', ddg: 'DuckDuckGo', sogou: '搜狗' };

    function toggle(key) {
        return '<span class="gh-switch"><input type="checkbox" data-key="' + key + '"' +
            (get(key) ? ' checked' : '') + '><span class="gh-slider"></span></span>';
    }
    function presetSelect() {
        const presets = [['system', '系统默认优化'], ['lxgw', '霞鹜文楷（UI 中文）'],
            ['jetbrains', 'JetBrains Mono（代码）'], ['combo', '霞鹜文楷 + JetBrains Mono（推荐）'], ['custom', '自定义']];
        const cur = get('font_preset');
        const opts = presets.map(([v, t]) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + t + '</option>').join('');
        return '<select id="gh-font-preset">' + opts + '</select>';
    }
    function escapeAttr(s) { return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

    let modalEl = null;
    function openSettings() {
        if (!modalEl || !modalEl.isConnected) modalEl = buildModal();
        modalEl.style.display = 'flex';
    }

    function initSettings() {
        if (typeof GM_addStyle !== 'undefined') GM_addStyle(STYLE);
        else {
            const s = document.createElement('style'); s.textContent = STYLE;
            (document.head || document.documentElement).appendChild(s);
        }
        const gear = document.createElement('button');
        gear.className = 'gh-gear';
        gear.textContent = '⚙';
        gear.title = 'GitHub 增强套件 · 设置';
        gear.addEventListener('click', openSettings);
        const mount = () => (document.body || document.documentElement).appendChild(gear);
        if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount, { once: true });

        try {
            GM_registerMenuCommand('GitHub 增强套件 · 打开设置', openSettings);
        } catch (e) { /* 菜单注册失败不影响 */ }
    }

    initSettings();
})(window, document);
