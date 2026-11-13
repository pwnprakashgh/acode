
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../../src/lib/acode.js", import.meta.url),
  "utf8",
);

const start = source.indexOf(
  "\t[onPluginLoadCallback](pluginId) {",
);
const end = source.indexOf(
  "\n\tget exitAppMessage()",
  start,
);

function createHarness() {
  const onPluginLoadCallback = Symbol("loaded");
  const onPluginsLoadCompleteCallback = Symbol("complete");
  const LOADED_PLUGINS = new Set();

  const Harness = vm.runInNewContext(
    `(class {
      #pluginWatchers = {};
      ${source.slice(start, end)}
    })`,
    {
      onPluginLoadCallback,
      onPluginsLoadCompleteCallback,
      LOADED_PLUGINS,
    },
  );

  return {
    instance: new Harness(),
    onPluginLoadCallback,
    onPluginsLoadCompleteCallback,
    LOADED_PLUGINS,
  };
}

describe("waitForPlugin result", () => {
  it("resolves true after a plugin loads", async () => {
    const { instance, onPluginLoadCallback } = createHarness();
    const pending = instance.waitForPlugin("example");

    instance[onPluginLoadCallback]("example");

    await expect(pending).resolves.toBe(true);
  });

  it("resolves true for an already loaded plugin", async () => {
    const { instance, LOADED_PLUGINS } = createHarness();
    LOADED_PLUGINS.add("example");

    await expect(instance.waitForPlugin("example"))
      .resolves.toBe(true);
  });

  it("rejects when a plugin fails to load", async () => {
    const { instance, onPluginsLoadCompleteCallback } =
      createHarness();
    const pending = instance.waitForPlugin("missing");

    instance[onPluginsLoadCompleteCallback]();

    await expect(pending).rejects.toThrow("failed to load");
  });
});
