import { test } from "node:test";
import assert from "node:assert/strict";
import { assembleSite, unknownImports, viteProject } from "./assemble.ts";

const page = (ts: string) => `<!doctype html><html lang="ko"><head><title>해봇 베이커리</title><style>body{color:red}</style></head><body><h1>안녕</h1><script type="text/typescript">${ts}</script></body></html>`;

test("compiles the TypeScript module and adds the import map", () => {
  const ts = `import gsap from "gsap";\nimport { mountScene } from "@site/kit";\ninterface Item { name: string }\nconst items: Item[] = [{ name: "빵" }];\nmountScene(document.querySelector<HTMLElement>(".hero"), { type: "orb", colors: ["#ff0000"] });\ngsap.to(".x", { y: 0 });\nconsole.log(items.length as number);`;
  const site = assembleSite(page(ts));
  assert.deepEqual(site.problems, []);
  assert.match(site.html, /<script type="importmap">/);
  assert.match(site.html, /"@site\/kit":"data:text\/javascript;base64,/);
  assert.match(site.html, /<script type="module">/);
  assert.doesNotMatch(site.html, /text\/typescript/);
  assert.doesNotMatch(site.html, /interface Item/);
  assert.match(site.html, /__guardGsap\(__gsap\)/);
  assert.ok(site.html.indexOf("importmap") < site.html.indexOf('type="module"'));
});

test("reports a module that does not compile and leaves the page without it", () => {
  const site = assembleSite(page("const x: = ;"));
  assert.ok(site.problems.some((p) => p.startsWith("script does not compile")));
  assert.doesNotMatch(site.html, /<script type="module">/);
});

test("flags imports outside the import map", () => {
  assert.deepEqual(unknownImports(`import a from "three"; import b from "three/addons/controls/OrbitControls.js"; import c from "react"; import("lodash");`), ["react", "lodash"]);
});

test("exports a Vite project with the same site", () => {
  const ts = `import { tilt } from "@site/kit";\ntilt(".card");`;
  const site = assembleSite(page(ts));
  const files = viteProject(site.html, site.mainTs, "해봇 베이커리");
  assert.ok(files["src/kit.ts"].includes("export function mountScene"));
  assert.match(files["src/main.ts"], /from "\.\/kit"/);
  assert.doesNotMatch(files["src/main.ts"], /@site\/kit/);
  assert.match(files["index.html"], /<script type="module" src="\/src\/main.ts"><\/script>/);
  assert.match(files["index.html"], /href="\/src\/style.css"/);
  assert.doesNotMatch(files["index.html"], /importmap|<style/);
  assert.equal(files["src/style.css"].trim(), "body{color:red}");
  const pkg = JSON.parse(files["package.json"]);
  assert.equal(pkg.name, "my-site");
  assert.ok(pkg.dependencies.three && pkg.dependencies.gsap && pkg.dependencies.lenis);
});
