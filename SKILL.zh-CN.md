<!--
  这是 SKILL.md 的中文译本，仅供人类/中文语境下的 AI 阅读参考。
  真正被技能系统加载、用于触发判断的入口文件是英文版 SKILL.md（其 frontmatter
  中的 description 才是实际触发依据）。两份文档内容如有出入，以 SKILL.md 为准。
-->

---
name: no-build-react-site
description: 搭建一个完全不需要构建步骤、直接在浏览器里运行的静态 React 网站——不用 Vite、不用 webpack、不用 esbuild，压根不需要打包工具。.tsx/.ts 文件在浏览器里实时转译，React、ReactDOM、React Router、浏览器内编译器、Tailwind 等所有运行时依赖都下载到本地文件（而不是从 CDN 加载），做出来的网站可以完全离线运行，不受 esm.sh/unpkg/jsdelivr 是否可用或者是否被地区屏蔽的影响。同时配好了 Bun+Hono 本地开发服务器（带 SPA history 模式回退）和仅供编辑器使用、完全不影响生产运行时的 TypeScript 类型配置。只要用户想用 React 做静态网站、落地页、营销页或单页应用又不想引入打包工具；明确说了"不要构建步骤"/"不要打包工具"/"依赖本地化"/"no build step"/"no bundler"；想避免 CDN 依赖以便离线使用、内网环境或者 CDN 不稳定的托管环境；或者想在静态托管（Netlify/Vercel/GitHub Pages/S3/自建服务器）上用 React Router 的 history 模式路由——即使用户没提"skill"这个词、也没直接点名上述任何一个工具，都应该用这个技能。这个技能还包含一个可选的传统构建方案（Vite + 真实 npm 依赖，产出到 dist/），仅在用户明确要求时才使用——"用 Vite"/"传统构建"/"本地构建"/"打包一下"，或者用户已经确认零构建的浏览器内转译对这个项目来说太慢了；这个模式只会在用户点名要求时才会被选用，绝不会自动切换过去。也支持把一个*已经*用这个技能搭建好的无构建项目原地转换成 Vite 模式——"把这个项目转成 Vite"/"迁移到传统构建"——而不只是从零搭建 Vite 项目。
---

# 无构建 React 网站

一种搭建、交付真正 React 网站的方式——组件、hooks、客户端路由、TypeScript 一应
俱全，全程不需要打包工具介入。浏览器直接请求 `.tsx` 文件，自己完成转译。这不是
玩具方案：这套模式已经支撑过一个正式上线的多页面、14 语言、带 history 路由的网站。

## 为什么要这么做（动手之前先看这段）

避开打包工具最直觉的做法是"用 `<script type="importmap">` 直接从 CDN 加载
React"。这样能解决 80% 的问题，但会在三个具体地方翻车——生产可靠性（CDN 挂了或
被墙，你的网站跟着挂）、正确性（esm.sh 在某些情况下会悄悄给你返回错误的构建版
本——见下文坑 4）、编辑器体验（没有 CDN 意味着没有 `node_modules`，VS Code 找不到
`import React from "react"` 的类型声明）。这个技能里的每一块都是为了补上其中一个
缺口而存在的。不要因为"CDN 版本反正也能跑"就跳过依赖本地化那一步或者 tsconfig
那一步——它确实能跑，直到某天悄无声息地不能跑了，而且到那时候很难排查。

## 两套搭建模式——不确定用哪套就问用户

这个技能有两套独立的模板：

- **`assets/`** —— 本文档主要描述的零构建模板。这是默认选项，除非用户另有
  要求，否则就用这套。
- **`assets-vite/`** —— 传统的 Vite 构建（真实的 `npm`/`bun` 依赖，
  `vite build` 产出到 `dist/`）。只有当用户明确点名要求时才用——"用 Vite"、
  "传统构建"、"本地构建"、"不想让浏览器做转译了"——或者用户已经自己确认零构建
  的浏览器内转译对这个项目来说太慢了。**不要**凭自己的判断切到 Vite 模式（比如
  "这个项目看起来挺大的，我用 Vite 好了"）——先问用户，让他们自己决定。这个取
  舍是真实存在的：Vite 模式在开发和运行时都更快，但部署时需要 Node/Bun 和一个
  构建步骤，也放弃了这套技能的其他部分一直在追求的"不依赖 CDN"这个保证。

**两套模板共用同一份 `src/`，这是刻意设计。** `assets-vite/` 没有自己的
`src/`——Vite 模式的 `src/` 就是 `assets/src/`，原样拷贝过去。这之所以可行，
是因为 `assets/src/` 的两条约定（本地相对引用写全文件扩展名、每个用到 JSX
的文件都写 `import React from "react"`）虽然 Vite 并不强制要求，但完全能容
忍——按无构建模式更严格的要求去写 `src/`，就顺带让它在两种模式下都能直接用。
不要因为项目现在处于 Vite 模式就放松这两条约定——那样会悄悄破坏它转回无构建
模式的可能性（见 `assets-vite/AGENTS.md`）。这也是为什么把已有项目在两种模式
之间转换很便宜——见下文"迁移已有的无构建项目到 Vite 模式"。

除此之外的一切——`index.html`、依赖怎么解析、构建步骤本身——才是两套模板真
正不同的地方，各自放在自己的根目录文件里。搭 Vite 项目的具体步骤见下文"搭建
新项目——Vite 模式"；项目搭好之后的约定见 `assets-vite/AGENTS.md`。

## 架构一览

这是默认（零构建）模式下的目录结构，来自 `assets/`。Vite 模式有自己的一套更
简单的结构——见下文"搭建新项目——Vite 模式"。

```
index.html          SPA 外壳：Tailwind 的 script 标签、<script type="importmap">、
                     #root 容器，先加载运行时 loader 再加载 main.tsx
src/
  main.tsx           入口 —— createRoot(...).render(<App />)
  App.tsx            直接渲染 <Home />；网站超过一个页面时在这里加
                     <BrowserRouter> 或 <HashRouter>（见下文）
  pages/*.tsx         每个页面/路由一个组件
  components/*.tsx    共享 UI 组件
  hooks/*.ts
runtime/loader.js   浏览器内 TSX 编译器（原样复制，不要改；特意放在 src/
                     外面，这样 Vite 模式下的 src/ 才能完全一致）
vendor/              下载到本地的 react、react-dom、sucrase、tailwind
                     （必需的基础依赖），加上项目实际需要的其他可选依赖——
                     见下文"依赖本地化"
scripts/
  vendor-fetch.ts     以后要追加更多本地化依赖时重跑这个脚本
spa-server.ts        Bun+Hono 开发服务器（SPA 回退 + 端口自动重试）
package.json         只有 devDependencies，纯供编辑器类型检查用 —— bun run test
tsconfig.json         纯编辑器类型检查用，noEmit: true
_redirects           Netlify 风格的 SPA 回退规则
vercel.json          Vercel 风格的 SPA 回退规则
AGENTS.md            通用（不限于 Claude Code）的项目约定说明，供以后任何
                     在这个项目上工作的编码 agent 阅读
```

这个技能目录下的 `assets/` 就是上面这套结构的一份可用副本——搭新项目时，把整个
`assets/` 目录拷贝到项目根目录直接用，不用重新手打一遍。这些文件都经过端到端测
试（搭建、起服务、在真实浏览器里点击验证、从零重装验证过）——不是草稿。

## 搭建新项目——零构建模式

1. **拷贝模板。**
   ```bash
   cp -r <this-skill-dir>/assets/. /path/to/new-project/
   ```
2. **定制 `index.html`** —— 标题、meta 描述、内联 `tailwind.config` 里的主题色。
   `<script type="importmap">` 和底部那两个 loader `<script>` 标签不要动。
3. **把依赖本地化**（见下文）——这一步是网站能离线跑的关键，哪怕只是搭个快速
   原型也不要跳过：
   ```bash
   cd /path/to/new-project
   bun install                                # 只是给编辑器用的类型
   bun run vendor -- --preset core --tailwind  # 必需基础依赖，下载到 vendor/
   ```
   然后看项目实际需要什么（要不要路由？要不要状态管理？要不要表单库？），
   再按需追加本地化——见下文"依赖本地化"，不要图省事把什么都下载下来。
4. **跑起来**：`bun run test` 启动开发服务器（默认 8000 端口，被占用会自动重
   试下一个），带的是跟生产环境一样的 SPA 回退逻辑。打开打印出来的地址，确认
   起始页面渲染出来了，而且 `useState` 计数器点击能生效——这能证明整条链路
   （fetch → 转译 → Blob URL → React 渲染）真的在工作，而不是只是在serve 静态
   HTML。
5. **搭建页面内容**：在 `src/pages/` 下加文件。如果项目需要不止一个页面，把
   `react-router-dom` 本地化（见下文），然后在 `src/App.tsx` 里接上路由——那
   个文件里已经有两段注释掉的示例，分别对应下一步要选的两种模式。所有本地相
   对引用都要把文件扩展名写全——`import { Header } from
   "./components/Header.tsx"`，不能写成 `"./components/Header"`——因为这里没
   有打包工具帮你去试探正确的扩展名。这是唯一需要适应的新习惯，其他部分跟平
   时写 React 没什么两样。（这也是为什么以后如果这个项目要转成 Vite 模式，
   `src/` 能原样搬过去不用改——见前文"两套搭建模式"。）
6. **选一种路由模式，再对应着部署：**
   - **`BrowserRouter`（history 模式）**——URL 干净（比如 `/about`），但托管
     环境必须把所有未匹配路径都改写到 `index.html`，否则硬刷新或直接访问
     `/about` 会 404。`_redirects`（Netlify）和 `vercel.json`（Vercel）已经
     现成写好了；其他环境（nginx、S3+CloudFront、自己写的 Node/Bun 服务）可
     以把 `spa-server.ts` 当参考实现给他们——总共大概 40 行，回退逻辑不管由
     谁来 serve 都是一样的。适合能自己配置托管环境改写规则的场景。
   - **`HashRouter`（hash 模式）**——URL 变成 `/#/about` 这样。`#` 后面的部
     分根本不会发到服务器，所以既不会 404，也不需要配任何改写规则——不管扔
     到哪个静态托管上都能直接跑。适合用户没法配置托管环境（裸 S3 桶、没做
     404 重定向 trick 的 GitHub Pages、内网文件共享之类）、或者单纯不想折
     腾配置的场景。唯一的代价是 URL 里带个 `#`——这个取舍要提前跟用户说清
     楚，让他们自己选，别等部署完了才发现。

## 依赖本地化

`scripts/vendor-fetch.ts`（通过 `bun run vendor` 执行）会递归下载一个 esm.sh
模块*及它引用的一切*到 `vendor/` 目录，并把每一处 import 路径都重写成本地相对
路径。这不是一句 `curl` 能搞定的事——esm.sh 把每个包都包装成一个指向某个具体版
本、往往嵌套很深的真实文件的重定向，而那个真实文件自己可能还会 import 更深一层
的文件（react-dom 会 import scheduler，react-router-dom 会 import react-router
和 @remix-run/router，sucrase 会 import 好几个 sourcemap 相关的小工具）。这个脚
本会把整棵依赖树都走一遍。

**必需 vs 可选** —— `--preset core` 下载的是每个项目都需要的四个包（react、
react-dom、react-dom/client、sucrase）；除此之外默认什么都不装。要分析这个具体
项目实际需要什么，只本地化那些真正需要的东西：`references/vendor-packages.md`
里给了常见场景（路由、状态管理、表单、图标、数据请求……）现成可复制的命令，每
条都标注了"什么时候真的值得加上"——不要给一个单页网站配路由库，也不要在项目还
没真正遇到状态管理的问题之前就先装上状态管理库。

```bash
bun run vendor -- --preset core --tailwind
bun run vendor -- "https://esm.sh/zustand@4.5.5?external=react&target=es2022=zustand.js"  # 需要的话再加一个
```

对于 `references/vendor-packages.md` 里没覆盖到的包，同样的规则适用于 esm.sh
上的任何包：传 `ENTRY_URL=本地文件名.js`；如果这个包把 React 声明为 peer
dependency，要加上 `?external=react`（如果还需要 react-dom 就再加上
`,react-dom`），这样它就不会把自己那份 React 也打包进去——重复的 React 实例是
"Invalid hook call" 这类报错的经典成因，而且报错本身看起来跟真正的原因毫无关系。

本地化完成后，记得把裸模块名加进 `index.html` 的 import map，这样
`import X from "your-package"` 才能正常解析：
```html
"your-package": "./vendor/your-package.js"
```

排查任何"这本该没问题却报错了"的情况之前，先看一眼 `references/gotchas.md`——
里面记录了六个各自独立、不太容易想到的失败模式，每一个都是在实际生产环境里踩到
才发现的，不是预先设想出来的。

## 编辑器类型支持（不影响运行时）

`package.json` 的 `devDependencies` 和 `tsconfig.json` 存在的唯一目的就是让
VS Code（或任何支持 TS 的编辑器）能解析 `import React from "react"`、给出真正
可用的自动补全——浏览器永远不会读取这两个文件，`node_modules` 应该一直留在
`.gitignore` 里。几个关键配置项和背后的原因：
- `moduleResolution: "Bundler"` + `allowImportingTsExtensions: true` —— 匹配运
  行时"本地相对引用要写全 `.tsx` 后缀"的约定；没有这个配置 TS 会对带扩展名的
  引用报错。
- `jsx: "react"`（经典转换模式）—— 对应 `loader.js` 里 sucrase 的配置
  （`jsxRuntime: "classic"`），这也是为什么每个组件文件都要写
  `import React from "react"`，哪怕 JSX 里从没直接写过 `React` 这个名字。
- `noEmit: true` —— 这份配置只给语言服务器/`tsc --noEmit` 用，从来不会真的拿
  它去产出 JS。

如果加了一个需要专属 `@types/*` 包的依赖，把它加进 `devDependencies`，然后跑
`bun install`（如果用户没装 Bun 就用 `npm install`）——跟这里其他一切一样，"只
提供类型，从不参与实际交付"。

## 搭建新项目——Vite 模式

只有用户明确要求时才走这条路（见前文"两套搭建模式"）。这是真正的构建：
`vite build` 会把 `src/` 打包进 `dist/`，部署的是 `dist/`——不是项目根目录。
除了 `src/` 之外的一切都来自 `assets-vite/`；`src/` 来自 `assets/`——原因见
前文"两套搭建模式"。

```
index.html          Vite 的入口 HTML：<link rel="stylesheet" href="/tailwind.css">，
                     <script type="module" src="/src/main.tsx">
src/                 跟无构建模板的 src/ 完全一样——见下文
tailwind.css          Tailwind 入口（`@import "tailwindcss";`），直接从
                     index.html 链接，不从 src/ 里 import，这样 src/ 就不用
                     带任何构建模式专属的 CSS 引用
vite.config.ts       @vitejs/plugin-react + @tailwindcss/vite
tsconfig.json         真正参与类型检查的配置（jsx: "react-jsx"，
                     allowImportingTsExtensions: true 让共用的 src/ 里那些
                     带扩展名的引用照样能通过类型检查，noEmit: true——tsc 依
                     然只做类型检查，真正的转译由 Vite 通过 esbuild/swc 完成）
package.json         真实依赖——`npm install` 会装出一份能跑的 node_modules，
                     不像无构建模板里那份纯供编辑器用的
_redirects           Netlify 风格的 SPA 回退规则
vercel.json          Vercel 风格的 SPA 回退规则
AGENTS.md            这套模板专属的约定，包括为什么 src/ 要保留无构建模板的
                     约定，哪怕 Vite 本身并不要求
```

1. **拷贝模板**——`src/` 从 `assets/` 拿，其他一切从 `assets-vite/` 拿：
   ```bash
   mkdir -p /path/to/new-project/src
   cp -r <this-skill-dir>/assets/src/.    /path/to/new-project/src/
   cp -r <this-skill-dir>/assets-vite/.   /path/to/new-project/
   ```
2. **定制 `index.html`** —— 标题、meta 描述。Tailwind 主题定制现在放在 CSS 里
   （Tailwind v4 的 CSS-first 配置，`tailwind.css` 里的 `@theme`），不再是
   script 标签里的配置对象。
3. **安装依赖：**
   ```bash
   cd /path/to/new-project
   npm install   # 或者：bun install —— 这是真实安装，不是仅供编辑器用的
   ```
4. **跑起来：** `npm run dev` 启动带 HMR 的 Vite 开发服务器。打开打印出来的
   地址，确认起始页面渲染出来了，而且 `useState` 计数器点击能生效。
5. **搭建页面内容：** 在 `src/pages/` 下加文件。继续遵守无构建模板的约定，
   哪怕 Vite 本身并不强制要求——本地相对引用要写全文件扩展名
   （`"./components/Header.tsx"`，不是 `"./Header"`），用到 JSX 的文件继续写
   `import React from "react"`。这是让 `src/` 能原样搬回无构建模式的关键，
   见 `assets-vite/AGENTS.md`。
6. **按正常方式加包：** `npm install <package>`——不需要本地化步骤，也不需要
   维护 import map。
7. **选一种路由模式，再对应着部署**——跟无构建模板一样的
   `BrowserRouter`/`HashRouter` 取舍（完整解释见无构建模板那节的第 6 步）；
   同样的 `_redirects`/`vercel.json` 文件在这里也负责 SPA 回退，跟用哪种打包
   工具无关。
8. **部署前：** `npm run build` 会先做类型检查（`tsc -b`）再产出 `dist/`——
   要部署的是这个目录，不是项目根目录。`npm run preview` 能在本地起服务预览
   这份构建产物，部署前先自查一遍。

## 迁移已有的无构建项目到 Vite 模式

如果一个项目已经用 `assets/` 搭建好了，现在要迁移到 Vite——同样只在用户要求
时才做。因为 `src/` 已经按共用约定写好了（见前文"两套搭建模式"），这个转换很
便宜：只需要换掉根目录的构建外壳，`src/` 原封不动，不涉及任何源码改写。
`references/migrate-to-vite.md` 有完整的分步说明（删掉无构建专属的文件、换上
`assets-vite/` 的文件、把项目原来本地化的依赖装成真实依赖、把 Tailwind 主题
定制手工翻译成 CSS）。验证方式跟从零搭建一样：在浏览器里打开，确认没有控制台
报错，重新跑一遍项目原有的交互验证，然后再确认一遍
`npm run build && npm run preview` 也没问题。

## 添加客户端多语言（可选）

如果项目需要支持多语言，看 `references/i18n-pattern.md`——里面有一套基于 React
context 的模式（运行时用 fetch 加载 JSON 词典、一个 `useI18n()` hook、一个语言
切换器），是真正搭建、上线过的方案——可以直接嵌入这套无构建架构，不需要额外本
地化任何新依赖；因为本质上只是 React context + fetch，在 Vite 模式下也能原样
使用。

## 出问题时怎么办

先看 `references/gotchas.md`——里面记录了具体的失败模式和对应修法：
import 路径正则的坑、esm.sh 绝对路径重写的坑、文件缺扩展名导致 MIME 类型错误的
坑、esm.sh 悄悄返回错误 JS 目标版本的坑、`react-dom` 明明代码里没直接 import 却
必须出现在 import map 里的坑，以及本地开发服务器 404 处理里一个 Hono 相关的
坑。这些都不是凭空设想出来的边界情况——每一条都曾经让参考实现真的挂过，修好之
后才被记录在这里。这六个坑都只针对无构建模板那套 esm.sh 本地化流程——Vite 模式
用的是常规的 `npm`/`vite` 工具链，不会碰到这些问题。
