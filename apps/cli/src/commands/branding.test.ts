import { describe, expect, test } from "bun:test";

import { applyVivariumTerminalTheme, renderVivariumGlobe } from "./branding.js";

describe("Vivarium terminal branding", () => {
  test("keeps redirected output plain by default", () => {
    const output = `${renderVivariumGlobe()}\n\nVivarium Agent\n--------------\n`;

    expect(applyVivariumTerminalTheme(output, { env: {}, isTty: false })).toBe(output);
  });

  test("colors interactive output with a branded terminal theme", () => {
    const output = `${renderVivariumGlobe()}\n\nVivarium Agent\n--------------\nReadiness: ready\n`;
    const themed = applyVivariumTerminalTheme(output, { env: {}, isTty: true });

    expect(themed).toContain("\u001b[");
    expect(themed).toContain("\u001b[1;36mVivarium Agent\u001b[0m");
    expect(themed).toContain("\u001b[32mReadiness: ready\u001b[0m");
  });

  test("colors setup stage labels and commands", () => {
    const output = [
      renderVivariumGlobe(),
      "",
      "Vivarium Setup",
      "--------------",
      "Next commands:",
      "  [1] Prove the local loop",
      '      vivarium run --goal "validate local setup"',
      "",
    ].join("\n");
    const themed = applyVivariumTerminalTheme(output, { env: { VIVARIUM_COLOR: "always" } });

    expect(themed).toContain("\u001b[33m  [1] Prove the local loop\u001b[0m");
    expect(themed).toContain(
      '\u001b[36m      vivarium run --goal "validate local setup"\u001b[0m',
    );
  });

  test("honors NO_COLOR and FORCE_COLOR overrides", () => {
    const output = `${renderVivariumGlobe()}\n\nVivarium Doctor\n---------------\n`;

    expect(applyVivariumTerminalTheme(output, { env: { NO_COLOR: "1" }, isTty: true })).toBe(
      output,
    );
    expect(
      applyVivariumTerminalTheme(output, {
        env: { NO_COLOR: "1", FORCE_COLOR: "1" },
        isTty: false,
      }),
    ).toContain("\u001b[");
  });

  test("honors explicit Vivarium color overrides", () => {
    const output = `${renderVivariumGlobe()}\n\nVivarium Setup\n--------------\n`;

    expect(
      applyVivariumTerminalTheme(output, { env: { VIVARIUM_COLOR: "never" }, isTty: true }),
    ).toBe(output);
    expect(
      applyVivariumTerminalTheme(output, { env: { VIVARIUM_COLOR: "always" }, isTty: false }),
    ).toContain("\u001b[1;36mVivarium Setup\u001b[0m");
  });
});
