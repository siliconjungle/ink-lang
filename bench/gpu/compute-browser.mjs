import { chromium } from "playwright-core";
import fs from "node:fs/promises";
const [base, fixturePath, output, chrome] = process.argv.slice(2);
const fixtures = JSON.parse(await fs.readFile(fixturePath, "utf8"));
const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: ["--enable-unsafe-webgpu"],
});
try {
  const page = await browser.newPage();
  await page.goto(base);
  const result = await page.evaluate(
    async ({ base, fixtures }) => {
      const { loadInk } = await import(new URL("ink-gpu.mjs", base));
      const engine = await loadInk(base);
      let comparisons = 0,
        gpu_calls = 0,
        invalid_rejected = 0;
      const receipts = [];
      function near(a, b, floating = false) {
        if (Array.isArray(b))
          return (
            Array.isArray(a) &&
            a.length === b.length &&
            a.every((x, i) => near(x, b[i], floating))
          );
        if (b && typeof b === "object")
          return (
            a &&
            Object.keys(a).length === Object.keys(b).length &&
            Object.keys(b).every((k) =>
              near(a[k], b[k], k === "F32Bits" ? false : floating),
            )
          );
        if (floating && typeof b === "number")
          return (
            typeof a === "number" &&
            Math.abs(a - b) <= Math.max(2e-5, Math.abs(b) * 2e-5)
          );
        return a === b;
      }
      for (const f of fixtures) {
        for (const backend of ["cpu", "javascript", "gpu"]) {
          const r = f.pipeline
            ? await engine.pipeline(f.pipeline, { backend })
            : await engine.call(f.call, f.args, { backend });
          if (
            !near(
              f.pipeline ? r.values : r.value,
              f.expected,
              Boolean(f.pipeline) ||
                [
                  "kick",
                  "drift",
                  "particles",
                  "matrix4",
                  "ordered_sum",
                ].includes(f.call),
            )
          )
            throw Error(`${f.call ?? "pipeline"} mismatch: ${r.reason}`);
          if (backend === "gpu" && f.eligible && r.backend !== "gpu")
            throw Error(`${f.call ?? "pipeline"} fallback: ${r.reason}`);
          comparisons++;
          gpu_calls += r.backend === "gpu";
          if (f.pipeline?.iterations === 120 && backend === "gpu") {
            const { values, ...meta } = r;
            receipts.push(meta);
          }
        }
      }
      const invalid = [
        () =>
          engine.call("kick", [[[1, 2]], 0.5, [0, 0, 0]], { backend: "gpu" }),
        () => engine.call("indexed", [[2147483648]], { backend: "gpu" }),
        () =>
          engine.call("particles", [
            [{ position: [0, 0, 0], velocity: [0, 0, 0], mass: 1, extra: 2 }],
            0.5,
          ]),
        () =>
          engine.pipeline({
            steps: [{ id: "x", call: "indexed", args: [{ step: "x" }] }],
          }),
        () =>
          engine.pipeline({
            steps: [{ id: "x", call: "indexed", args: [[1]] }],
            iterations: 0,
          }),
        () =>
          engine.pipeline({
            steps: [{ id: "x", call: "indexed", args: [[1]] }],
            outputs: ["x", "x"],
          }),
      ];
      for (const f of invalid) {
        try {
          await f();
        } catch {
          invalid_rejected++;
        }
      }
      if (invalid_rejected !== invalid.length)
        throw Error("invalid arguments accepted");
      const xs = [1, 2, 3];
      const before = JSON.stringify(xs);
      await engine.call("indexed", [xs], { backend: "gpu" });
      if (JSON.stringify(xs) !== before) throw Error("input mutated");
      const concurrent = await Promise.all(
        Array.from({ length: 8 }, (_, i) =>
          engine.call("locals", [i], { backend: "cpu" }),
        ),
      );
      if (concurrent.some((r, i) => r.value !== 1 - i * 2))
        throw Error("concurrent CPU call corruption");
      const auto = await engine.call("indexed", [[1, 2]], { backend: "auto" });
      if (!["cpu", "javascript"].includes(auto.backend)) throw Error("small array should select CPU");
      await engine.dispose();
      const disposed = await engine.call("indexed", [[1]], { backend: "gpu" });
      if (disposed.backend !== "cpu" || disposed.value[0] !== -2)
        throw Error("disposed device fallback failed");
      return {
        status: "passed",
        comparisons,
        gpu_calls,
        invalid_rejected,
        resident_particle_receipts: receipts,
        small_selection: auto,
        disposed_device_fallback: disposed,
        concurrent_calls: 8,
      };
    },
    { base, fixtures },
  );
  const unavailable = await browser.newPage();
  await unavailable.addInitScript(() =>
    Object.defineProperty(navigator, "gpu", { value: undefined }),
  );
  await unavailable.goto(base);
  const fallback = await unavailable.evaluate(async (base) => {
    const { loadInk } = await import(new URL("ink-gpu.mjs", base));
    return (await loadInk(base)).call("indexed", [[1, 2, 3]], {
      backend: "gpu",
    });
  }, base);
  if (
    fallback.backend !== "cpu" ||
    JSON.stringify(fallback.value) !== "[-2,9,-6]"
  )
    throw Error("no-WebGPU fallback");
  const broken = await browser.newPage();
  await broken.route("**/compute-*.wgsl", (route) =>
    route.fulfill({ status: 200, body: "invalid shader" }),
  );
  await broken.goto(base);
  const failure = await broken.evaluate(async (base) => {
    const { loadInk } = await import(new URL("ink-gpu.mjs", base));
    return (await loadInk(base)).call("indexed", [[1, 2, 3]], {
      backend: "gpu",
    });
  }, base);
  if (failure.backend !== "cpu" || !failure.reason.includes("fallback"))
    throw Error("shader failure fallback");
  const receipt = {
    ...result,
    browser: browser.version(),
    unavailable_gpu_fallback: fallback,
    shader_failure_fallback: failure,
  };
  await fs.writeFile(output, JSON.stringify(receipt, null, 2) + "\n");
  console.log(JSON.stringify(receipt));
} finally {
  await browser.close();
}
