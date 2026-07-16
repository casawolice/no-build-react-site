import React from "react";
import { Home } from "./pages/Home.tsx";

// No router by default -- react-router-dom is an optional dependency (see
// references/vendor-packages.md), only worth adding once the site actually
// has more than one page/view. When you do add it, pick one of two modes:
//
// BrowserRouter (history mode) -- clean URLs like /about, but the host must
// fall back every unmatched path to index.html or a hard reload/direct link
// to /about 404s (see ../_redirects and ../vercel.json, already set up for
// this). Use it when you control the host's rewrite rules.
//
//   import { BrowserRouter, Routes, Route } from "react-router-dom";
//
//   export function App() {
//     return (
//       <BrowserRouter>
//         <Routes>
//           <Route path="/" element={<Home />} />
//           {/* more <Route> entries as you add pages under src/pages/ */}
//         </Routes>
//       </BrowserRouter>
//     );
//   }
//
// HashRouter (hash mode) -- URLs look like /#/about instead. The fragment
// after # is never sent to the server, so there's nothing to 404 and nothing
// to configure -- it works unmodified on literally any static host (a plain
// nginx, GitHub Pages, S3 with no rewrite support, a zip file someone
// double-hosts). Reach for this when you don't control the host's rewrite
// rules, or don't want to bother. Same import, just swap the component:
//
//   import { HashRouter, Routes, Route } from "react-router-dom";
//
//   export function App() {
//     return (
//       <HashRouter>
//         <Routes>
//           <Route path="/" element={<Home />} />
//         </Routes>
//       </HashRouter>
//     );
//   }
export function App() {
  return <Home />;
}
