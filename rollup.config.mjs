import alias from "@rollup/plugin-alias";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { readFileSync } from "node:fs";
import path from "node:path";
import url from "node:url";

const isWatching = !!process.env.ROLLUP_WATCH;
const sdPlugin = "com.felixgeelhaar.govee-light-management.sdPlugin";

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
  input: "src/backend/plugin.ts",
  output: {
    file: `${sdPlugin}/bin/plugin.js`,
    sourcemap: isWatching,
    sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
      return url.pathToFileURL(
        path.resolve(path.dirname(sourcemapPath), relativeSourcePath),
      ).href;
    },
  },
  plugins: [
    {
      name: "watch-externals",
      buildStart: function () {
        this.addWatchFile(`${sdPlugin}/manifest.json`);
      },
    },
    alias({
      entries: [{ find: "@shared", replacement: path.resolve("src/shared") }],
    }),
    typescript({
      mapRoot: isWatching ? "./" : undefined,
    }),
    json(),
    nodeResolve({
      browser: false,
      exportConditions: ["node"],
      preferBuiltins: true,
    }),
    commonjs(),
    !isWatching && terser(),
    {
      name: "emit-module-package-file",
      generateBundle() {
        this.emitFile({
          fileName: "package.json",
          source: `{ "type": "module" }`,
          type: "asset",
        });
      },
    },
    {
      name: "emit-manifest-copy",
      generateBundle() {
        // The SDK resolves manifest.json via process.cwd().
        // When Stream Deck runs the plugin, CWD is bin/, so we
        // need a copy there for the packaged plugin to work.
        const manifestPath = path.resolve(`${sdPlugin}/manifest.json`);
        this.emitFile({
          type: "asset",
          fileName: "manifest.json",
          source: readFileSync(manifestPath, "utf-8"),
        });
      },
    },
  ],
};

export default config;
