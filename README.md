# no-build-react-site

*[中文说明见下方 ↓](#中文说明)*

A [Claude Code](https://claude.com/claude-code) skill that scaffolds a real, production-shippable React site with **zero build step** — no Vite, no webpack, no esbuild, no bundler at all. `.tsx`/`.ts` files are transpiled on the fly in the browser, and every runtime dependency (React, ReactDOM, React Router, the in-browser compiler, Tailwind) is vendored as a local file instead of loaded from a CDN, so the finished site runs fully offline and isn't at the mercy of esm.sh/unpkg/jsdelivr uptime or regional blocking.

This isn't a toy pattern — it has shipped a production multi-page, 14-language, history-routed site.

## What it sets up

- **Browser-native ES modules + import maps** — `.tsx` files are fetched and transpiled in-browser (via [Sucrase](https://github.com/alangpierce/sucrase)), no build artifacts, no watch process.
- **Local dependency vendoring** — a `vendor-fetch.ts` script recursively mirrors any esm.sh package (and everything it transitively imports) to local files, rewriting every import specifier to a relative path. A required/optional registry (`references/vendor-packages.md`) tells you what every project needs (React core) versus what's situational (routing, state management, forms, icons, ...).
- **Bun + Hono dev server** — SPA history-mode fallback, automatic port retry if the default port is busy.
- **Two React Router modes** — `BrowserRouter` (clean URLs, needs a host rewrite rule — `_redirects`/`vercel.json` included) or `HashRouter` (`/#/route` URLs, zero host configuration needed, works on any static host unmodified).
- **Editor-only TypeScript tooling** — `tsconfig.json` + `package.json` devDependencies so VS Code resolves `import React from "react"` with real autocomplete, without any of it touching the production runtime or requiring `node_modules` at deploy time.

## Why not just use a CDN import map?

That gets you most of the way and then breaks in three specific spots: production reliability (the CDN goes down or is blocked, your site goes down with it), correctness (esm.sh can silently serve the wrong build under certain fetch clients — see `references/gotchas.md`), and editor experience (no CDN means no `node_modules`, so your editor can't resolve types). Vendoring dependencies locally closes all three gaps at once.

## Using this as a Claude Code skill

Drop (or symlink) this repo into a skills directory Claude Code looks at:

```bash
git clone git@github.com:casawolice/no-build-react-site.git ~/.agents/skills/no-build-react-site
ln -s ../../.agents/skills/no-build-react-site ~/.claude/skills/no-build-react-site   # global, all projects
# or, for a single project:
git clone git@github.com:casawolice/no-build-react-site.git /path/to/project/.claude/skills/no-build-react-site
```

Once installed, Claude Code triggers it automatically whenever you ask for a static site / landing page / SPA in React without a bundler, say "no build step" / "不要打包工具" / "无构建", need to avoid CDN dependencies for offline or air-gapped use, or want React Router on a static host. You don't need to name the skill explicitly.

## Repo layout

```
SKILL.md            skill definition Claude Code reads (English, canonical)
SKILL.zh-CN.md       Chinese translation for human/中文语境 reference
AGENTS.md            tool-agnostic entry point for non-Claude coding agents
assets/              working template copied into new projects as-is
  index.html           SPA shell: import map, Tailwind, loader script tags
  src/                 main.tsx, App.tsx, pages/, runtime/loader.js (the TSX compiler)
  scripts/vendor-fetch.ts   re-run this to vendor more packages later
  spa-server.ts        Bun+Hono dev server (SPA fallback + port auto-retry)
  package.json, tsconfig.json   editor-only type-checking, never shipped
  _redirects, vercel.json      SPA fallback rules for history-mode routing
  AGENTS.md             ships inside every scaffolded project — ground rules
                        and gotchas for whatever agent works on it later
references/          docs loaded as needed
  gotchas.md            six non-obvious failure modes and their fixes
  vendor-packages.md    required-vs-optional dependency registry with ready commands
  i18n-pattern.md        optional client-side i18n pattern (React context + JSON dicts)
evals/evals.json    test prompts used to evaluate this skill
```

## Documentation

Start with [`SKILL.md`](./SKILL.md) (or [`SKILL.zh-CN.md`](./SKILL.zh-CN.md) for the Chinese translation) — it walks through setting up a new project end to end. `references/` has the deeper material: what to vendor and when, the failure modes worth knowing about before you hit them, and the optional i18n pattern.

---

## 中文说明

*[English above ↑](#no-build-react-site)*

这是一个 [Claude Code](https://claude.com/claude-code) 技能,用来搭建**完全不需要构建步骤**的正式可上线 React 网站——不用 Vite、不用 webpack、不用 esbuild,压根不需要打包工具。`.tsx`/`.ts` 文件在浏览器里实时转译,React、ReactDOM、React Router、浏览器内编译器、Tailwind 等所有运行时依赖都下载为本地文件,而不是从 CDN 加载,做出来的网站可以完全离线运行,不受 esm.sh/unpkg/jsdelivr 是否可用或者是否被地区屏蔽的影响。

这不是玩具方案——这套模式已经支撑过一个正式上线的多页面、14 语言、带 history 路由的网站。

### 这套技能会帮你搭好什么

- **浏览器原生 ES 模块 + import map** —— `.tsx` 文件在浏览器里直接请求、实时转译(通过 [Sucrase](https://github.com/alangpierce/sucrase)),没有构建产物,不需要 watch 进程。
- **依赖本地化** —— `vendor-fetch.ts` 脚本会递归把任意 esm.sh 上的包(以及它引用的一切)下载到本地文件,并把每一处 import 路径都重写成本地相对路径。一份必需/可选依赖注册表(`references/vendor-packages.md`)告诉你每个项目都需要什么(React 核心)、什么是按需的(路由、状态管理、表单、图标……)。
- **Bun + Hono 开发服务器** —— 带 SPA history 模式回退,默认端口被占用时自动重试下一个端口。
- **两种 React Router 模式** —— `BrowserRouter`(URL 干净,需要托管环境配一条改写规则——`_redirects`/`vercel.json` 已经现成写好)或 `HashRouter`(URL 形如 `/#/route`,不需要任何托管环境配置,扔到任意静态托管上都能直接跑)。
- **仅供编辑器使用的 TypeScript 配置** —— `tsconfig.json` + `package.json` 的 devDependencies,让 VS Code 能正确解析 `import React from "react"` 并给出真正可用的自动补全,同时完全不影响生产运行时,部署时也不需要 `node_modules`。

### 为什么不直接用 CDN 的 import map 就好了？

那样能解决大部分问题,但会在三个具体地方翻车:生产可靠性(CDN 挂了或被墙,网站跟着挂)、正确性(esm.sh 在某些 fetch 客户端下会悄悄返回错误的构建版本——见 `references/gotchas.md`)、编辑器体验(没有 CDN 意味着没有 `node_modules`,编辑器解析不出类型)。把依赖本地化能一次性补上这三个缺口。

### 作为 Claude Code 技能使用

把这个仓库拷贝(或软链接)到 Claude Code 会读取的技能目录下:

```bash
git clone git@github.com:casawolice/no-build-react-site.git ~/.agents/skills/no-build-react-site
ln -s ../../.agents/skills/no-build-react-site ~/.claude/skills/no-build-react-site   # 全局，所有项目可用
# 或者只想在单个项目里用：
git clone git@github.com:casawolice/no-build-react-site.git /path/to/project/.claude/skills/no-build-react-site
```

装好之后,只要你要做一个不带打包工具的 React 静态网站/落地页/单页应用,说了"不要构建步骤"/"不要打包工具"/"无构建",需要离线或内网环境下避免 CDN 依赖,或者想在静态托管上用 React Router,Claude Code 就会自动触发这个技能——不需要专门点名它。

### 仓库目录结构

```
SKILL.md            Claude Code 读取的技能定义文件（英文，作为触发判断的准绳）
SKILL.zh-CN.md       中文译本，供人类/中文语境阅读参考
AGENTS.md            给非 Claude 编码 agent 的通用入口文档
assets/              新项目会原样拷贝这份可用模板
  index.html           SPA 外壳：import map、Tailwind、loader 脚本标签
  src/                 main.tsx、App.tsx、pages/、runtime/loader.js（浏览器内 TSX 编译器）
  scripts/vendor-fetch.ts   以后要本地化更多依赖时重跑这个脚本
  spa-server.ts        Bun+Hono 开发服务器（SPA 回退 + 端口自动重试）
  package.json, tsconfig.json   仅编辑器类型检查用，从不参与实际交付
  _redirects, vercel.json      history 模式路由所需的 SPA 回退规则
  AGENTS.md             会跟着一起拷进每个新项目——给以后在这个项目上工作
                        的任何 agent 看的约定和坑点说明
references/          按需加载的文档
  gotchas.md            六个不太容易想到的失败模式及对应修法
  vendor-packages.md    必需/可选依赖注册表，附现成命令
  i18n-pattern.md        可选的客户端多语言方案（React context + JSON 词典）
evals/evals.json    用于评测这个技能的测试用例
```

### 文档入口

先看 [`SKILL.md`](./SKILL.md)（或中文版 [`SKILL.zh-CN.md`](./SKILL.zh-CN.md)）——里面完整走了一遍从零搭建新项目的流程。`references/` 目录下是更深入的材料：什么时候该本地化什么依赖、踩坑之前先看的失败模式清单，以及可选的 i18n 方案。
