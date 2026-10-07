import { readFileSync } from "node:fs";
import path from "node:path";
import * as nodeModule from "node:module";

// Turns the generator's page (HTML + CSS + one TypeScript module) into a
// page that runs anywhere as a single file, and into a Vite + TypeScript
// project for the download.
//
// The page's module imports only these packages; the versions are pinned
// here (the preview loads them from jsDelivr through an import map, the
// project download lists them in package.json).

export const SITE_PACKAGES = {
  three: "0.186.0",
  gsap: "3.13.0",
  lenis: "1.3.4",
} as const;

const CDN = "https://cdn.jsdelivr.net/npm";

/** Bare imports the page may use, and where the preview loads each from. */
const IMPORTS: Record<string, string> = {
  three: `${CDN}/three@${SITE_PACKAGES.three}/build/three.module.js`,
  "three/addons/": `${CDN}/three@${SITE_PACKAGES.three}/examples/jsm/`,
  gsap: `${CDN}/gsap@${SITE_PACKAGES.gsap}/index.js`,
  "gsap/ScrollTrigger": `${CDN}/gsap@${SITE_PACKAGES.gsap}/ScrollTrigger.js`,
  "gsap/SplitText": `${CDN}/gsap@${SITE_PACKAGES.gsap}/SplitText.js`,
  "gsap/Flip": `${CDN}/gsap@${SITE_PACKAGES.gsap}/Flip.js`,
  "gsap/Observer": `${CDN}/gsap@${SITE_PACKAGES.gsap}/Observer.js`,
  lenis: `${CDN}/lenis@${SITE_PACKAGES.lenis}/dist/lenis.mjs`,
};
export const KIT_SPECIFIER = "@site/kit";

let kitTs: string | null = null;
let kitJs: string | null = null;

/** The kit's TypeScript source (lib/site-kit/kit.ts). */
export function kitSource(): string {
  kitTs ??= readFileSync(path.join(process.cwd(), "lib/site-kit/kit.ts"), "utf8");
  return kitTs;
}

type Strip = (code: string, opts?: { mode?: "strip" | "transform" }) => string;

/** TypeScript → JavaScript (types removed; throws on a syntax error). */
export function toJs(ts: string): string {
  const strip = (nodeModule as unknown as { stripTypeScriptTypes?: Strip }).stripTypeScriptTypes;
  if (!strip) throw new Error("TypeScript stripping is not available in this Node version");
  // Node prints an "experimental" warning once per process; harmless.
  return strip(ts, { mode: "transform" });
}

function kitModule(): string {
  kitJs ??= toJs(kitSource());
  return kitJs;
}

const SCRIPT_TS = /<script\b[^>]*type=["']?text\/typescript["']?[^>]*>([\s\S]*?)<\/script>/gi;

/**
 * Lines put in front of the page's module (and main.ts in the project):
 * GSAP made null-safe, and the entrance-animation safety net.
 */
export function prelude(ts: string, kit = KIT_SPECIFIER): string {
  const usesGsap = /from\s+["']gsap["']/.test(ts);
  return [
    `import { guardGsap as __guardGsap, failsafe as __failsafe } from "${kit}";`,
    usesGsap ? `import __gsap from "gsap";\n__guardGsap(__gsap);` : "",
    "__failsafe();",
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

export interface AssembledSite {
  html: string;
  /** The page's own TypeScript module (empty if it had none). */
  mainTs: string;
  problems: string[];
}

/** Bare imports in a module that are not in the import map. */
export function unknownImports(code: string): string[] {
  const specs = [...code.matchAll(/\bimport\s+(?:[^'"]*?\sfrom\s+)?["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1] ?? m[2]);
  return specs.filter((s) => !(s in IMPORTS) && s !== KIT_SPECIFIER && !s.startsWith("three/addons/"));
}

/**
 * Compile the page's <script type="text/typescript"> blocks into one ES
 * module and add the import map (CDN packages + the kit as a data: URL),
 * so the page is a single self-contained file. Problems are reported, not
 * thrown: a page whose script fails still renders without it.
 */
export function assembleSite(page: string): AssembledSite {
  const problems: string[] = [];
  const blocks = [...page.matchAll(SCRIPT_TS)].map((m) => m[1].trim()).filter(Boolean);
  const mainTs = blocks.join("\n\n");
  let html = page.replace(SCRIPT_TS, "");
  let js = "";
  if (mainTs) {
    try {
      js = toJs(`${prelude(mainTs)}\n${mainTs}`);
    } catch (err) {
      problems.push(`script does not compile: ${(err as Error).message.split("\n")[0]}`);
    }
    const unknown = unknownImports(mainTs);
    if (unknown.length) problems.push(`unknown imports: ${unknown.join(", ")}`);
  } else {
    problems.push("no TypeScript module");
  }
  let kit = "";
  try {
    kit = kitModule();
  } catch (err) {
    problems.push(`kit unavailable: ${(err as Error).message.split("\n")[0]}`);
    return { html, mainTs, problems };
  }
  const map = {
    imports: {
      ...IMPORTS,
      [KIT_SPECIFIER]: `data:text/javascript;base64,${Buffer.from(kit).toString("base64")}`,
    },
  };
  const head = `<script type="importmap">${JSON.stringify(map)}</script>`;
  html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${head}\n</head>`) : html.replace(/<body/i, `<head>${head}</head>\n<body`);
  if (js && problems.every((p) => !p.startsWith("script does not compile"))) {
    const tag = `<script type="module">\n${js.replace(/<\/script/gi, "<\\/script")}\n</script>`;
    html = /<\/body>/i.test(html) ? html.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${tag}\n</body>`) : `${html}\n${tag}`;
  }
  return { html, mainTs, problems };
}

/**
 * A Vite + TypeScript project with the same site: index.html (styles in
 * src/style.css), src/main.ts, src/kit.ts, package.json, tsconfig.json.
 */
export function viteProject(finalHtml: string, mainTs: string, title: string): Record<string, string> {
  let html = finalHtml
    .replace(/<script type="importmap">[\s\S]*?<\/script>\s*/i, "")
    .replace(/<script type="module">[\s\S]*?<\/script>\s*/i, "");
  const styles: string[] = [];
  html = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>\s*/gi, (_, css: string) => {
    styles.push(css.trim());
    return "";
  });
  html = html.replace(/<\/head>/i, `  <link rel="stylesheet" href="/src/style.css">\n</head>`);
  html = html.replace(/<\/body>(?![\s\S]*<\/body>)/i, `  <script type="module" src="/src/main.ts"></script>\n</body>`);
  const main = `${prelude(mainTs, "./kit")}\n${mainTs.trim()}`.replaceAll(`"${KIT_SPECIFIER}"`, '"./kit"').replaceAll(`'${KIT_SPECIFIER}'`, "'./kit'");
  const name =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const pkgName = /^[a-z][a-z0-9-]{2,}$/.test(name) ? name : "my-site";
  const pkg = {
    name: pkgName,
    private: true,
    version: "1.0.0",
    type: "module",
    scripts: { dev: "vite", build: "vite build", preview: "vite preview", typecheck: "tsc --noEmit" },
    dependencies: { three: `^${SITE_PACKAGES.three}`, gsap: `^${SITE_PACKAGES.gsap}`, lenis: `^${SITE_PACKAGES.lenis}` },
    devDependencies: { "@types/three": `^${SITE_PACKAGES.three}`, typescript: "^5.8.0", vite: "^7.0.0" },
  };
  const tsconfig = {
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "bundler",
      lib: ["ES2022", "DOM", "DOM.Iterable"],
      strict: false,
      skipLibCheck: true,
      noEmit: true,
      isolatedModules: true,
    },
    include: ["src"],
  };
  const readme = [
    `# ${title}`,
    "",
    "이 사이트의 Vite + TypeScript 프로젝트입니다.",
    "",
    "```bash",
    "npm install",
    "npm run dev      # 개발 서버 (http://localhost:5173)",
    "npm run build    # dist/ 폴더에 배포용 파일 생성",
    "npm run typecheck  # TypeScript 타입 검사",
    "```",
    "",
    "- `index.html` — 페이지 구조와 문구",
    "- `src/style.css` — 디자인(색·서체·레이아웃)",
    "- `src/main.ts` — 인터랙션(스크롤 애니메이션, 3D 장면, 폼 등)",
    "- `src/kit.ts` — Three.js 3D 장면과 도우미 함수",
    "",
    "dist/ 폴더는 Vercel, Netlify, GitHub Pages 등 어떤 정적 호스팅에도 올릴 수 있습니다.",
    "사진 주소는 생성 후 1년간 유효하니, 오래 쓰실 사이트라면 사진을 내려받아 `public/`에 넣고 주소를 바꿔 주세요.",
    "",
  ].join("\n");
  return {
    "index.html": html,
    "src/style.css": styles.join("\n\n") + "\n",
    "src/main.ts": `${main.trim()}\n`,
    "src/kit.ts": kitSource(),
    "package.json": `${JSON.stringify(pkg, null, 2)}\n`,
    "tsconfig.json": `${JSON.stringify(tsconfig, null, 2)}\n`,
    "README.md": readme,
    ".gitignore": "node_modules\ndist\n",
  };
}
