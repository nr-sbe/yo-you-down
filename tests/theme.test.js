import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const boot = readFileSync(new URL("../theme.js", import.meta.url), "utf8");
const tokens = (block) =>
  Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6})/gi)].map((x) => [x[1], x[2]]));
const dark = tokens(css.match(/:root\s*\{([^}]+)\}/)[1]);
const light = { ...dark, ...tokens(css.match(/:root\[data-theme="light"\]\s*\{([^}]+)\}/)[1]) };
function luminance(hex) {
  const c = hex
    .slice(1)
    .match(/../g)
    .map((x) => parseInt(x, 16) / 255)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
for (const [name, theme] of Object.entries({ dark, light })) {
  test(`${name}: all text and state colors meet WCAG AA contrast`, () => {
    const pairs = [
      ["ink", "paper"],
      ["ink", "card"],
      ["ink", "field"],
      ["muted", "paper"],
      ["muted", "card"],
      ["muted", "tint"],
      ["muted", "winner"],
      ["muted", "cell"],
      ["tint-ink", "tint"],
      ["tint-ink", "card"],
      ["tint-ink", "winner"],
      ["winner-ink", "winner"],
      ["on-selected", "selected"],
      ["on-accent", "accent"],
      ["on-accent", "accent-hover"],
      ["error-ink", "error-bg"],
      ["toast-ink", "toast-bg"],
      ["avatar-ink", "avatar"],
      ["accent", "paper"],
    ];
    for (const [foreground, background] of pairs)
      assert.ok(
        ratio(theme[foreground], theme[background]) >= 4.5,
        `${name}: ${foreground} on ${background} = ${ratio(theme[foreground], theme[background]).toFixed(2)} (requires 4.5)`,
      );
  });
  test(`${name}: input boundaries, selected states and focus indicators meet 3:1`, () => {
    for (const [a, b] of [
      ["control-border", "field"],
      ["cell-border", "cell"],
      ["selected", "cell"],
      ["focus", "card"],
      ["focus", "paper"],
    ])
      assert.ok(ratio(theme[a], theme[b]) >= 3, `${a} / ${b} has insufficient non-text contrast`);
  });
}
test("first visit is dark; saved preference is restored before rendering", () => {
  for (const [saved, expected] of [
    [null, "dark"],
    ["light", "light"],
    ["dark", "dark"],
    ["invalid", "dark"],
  ]) {
    const document = { documentElement: { dataset: {} }, querySelector: () => ({ content: "" }) };
    runInNewContext(boot, { document, localStorage: { getItem: () => saved } });
    assert.equal(document.documentElement.dataset.theme, expected);
  }
  const document = { documentElement: { dataset: {} }, querySelector: () => ({ content: "" }) };
  runInNewContext(boot, {
    document,
    localStorage: {
      getItem: () => {
        throw Error("Storage blocked");
      },
    },
  });
  assert.equal(document.documentElement.dataset.theme, "dark");
});
