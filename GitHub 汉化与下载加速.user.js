// ==UserScript==
// @name         GitHub 汉化与下载加速
// @name:zh-CN   GitHub 汉化与下载加速
// @namespace    https://github.com/local/github-zh-accel
// @version      1.0.0
// @description  最新 GitHub 界面完整汉化（修复搜索框消失的 bug）+ 在任意可下载位置一键跳转 github.akams.cn 加速下载并自动填入地址。
// @description:zh-CN  最新 GitHub 界面完整汉化（修复搜索框消失的 bug）+ 在任意可下载位置一键跳转 github.akams.cn 加速下载并自动填入地址。
// @author       WorkBuddy · SeniorDeveloper
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
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @grant        window.onurlchange
// @connect      fanyi.iflyrec.com
// @supportURL   https://github.com/maboloshi/github-chinese/issues
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

    // 全页扫描可加速的下载链接，返回本次新注入图标的数量
    function scan(root = document) {
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
})(window, document);
