import { chromium } from "playwright-core";
import fs from "node:fs/promises";
const [base, output, chrome] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: ["--enable-unsafe-webgpu"],
});
try {
  const page = await browser.newPage();
  await page.goto(base);
  const result = await page.evaluate(async (base) => {
    const { loadInk } = await import(new URL("ink-gpu.mjs", base));
    const ink = await loadInk(base);
    const small = [];
    for (let i = 0; i < 33; i++)
      small.push(await ink.call("indexed", [[1, 2, 3]], { backend: "auto" }));
    if (
      small[0].profile.uses !== 1 ||
      small[31].profile.uses !== 32 ||
      small[32].profile.uses !== 1
    )
      throw Error("recheck cadence");
    const n = 65536,
      dt = 1 / 64,
      iterations = 120;
    const positions = Array.from({ length: n }, (_, i) => [
      i % 17,
      i % 13,
      i % 7,
    ]);
    const velocities = Array.from({ length: n }, (_, i) => [
      (i % 5) / 8,
      2,
      (i % 3) / 16,
    ]);
    const plan = {
      inputs: { positions, velocities },
      steps: [
        {
          id: "velocity",
          call: "kick",
          args: [{ input: "velocities" }, dt, [0, -9.75, 0]],
        },
        {
          id: "position",
          call: "drift",
          args: [{ input: "positions" }, { step: "velocity" }, dt],
        },
      ],
      iterations,
      feedback: { positions: "position", velocities: "velocity" },
      outputs: ["position", "velocity"],
    };
    const r = await ink.pipeline(plan, { backend: "auto" });
    for (let i = 0; i < n; i++) {
      const expectedP = [
        (i % 17) + iterations * dt * ((i % 5) / 8),
        (i % 13) +
          iterations * dt * 2 -
          (9.75 * dt * dt * iterations * (iterations + 1)) / 2,
        (i % 7) + iterations * dt * ((i % 3) / 16),
      ];
      const expectedV = [(i % 5) / 8, 2 - 9.75 * iterations * dt, (i % 3) / 16];
      for (let k = 0; k < 3; k++) {
        if (
          Math.abs(r.values.position[i][k] - expectedP[k]) > 2e-5 ||
          Math.abs(r.values.velocity[i][k] - expectedV[k]) > 2e-5
        )
          throw Error("particle oracle mismatch");
      }
    }
    if (
      (r.backend === "gpu") !==
      r.profile.gpu_ms + r.profile.setup_ms / 32 < r.profile.cpu_ms * 0.9
    )
      throw Error("profitability selection mismatch");
    const original = [1];
    const pending = ink.call("indexed", [original], { backend: "cpu" });
    original[0] = 99;
    const snapshot = await pending;
    if (snapshot.value[0] !== -2)
      throw Error("input not snapshotted at submission");
    const { values, ...large } = r;
    await ink.close();
    return {
      status: "passed",
      particles: n,
      iterations,
      small_and_recheck: [small[0], small[31], small[32]],
      large_pipeline: large,
      input_snapshot: snapshot,
    };
  }, base);
  await fs.writeFile(
    output,
    JSON.stringify({ ...result, browser: browser.version() }, null, 2) + "\n",
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
