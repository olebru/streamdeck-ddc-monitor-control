import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";

const sdPlugin = "com.olebru.ddc-monitor-control.sdPlugin";

export default {
	input: "build/plugin.js",
	output: {
		file: `${sdPlugin}/bin/plugin.js`
	},
	plugins: [
		nodeResolve({
			browser: false,
			exportConditions: ["node"],
			preferBuiltins: true
		}),
		commonjs(),
		terser(),
		{
			name: "emit-module-package-file",
			generateBundle() {
				this.emitFile({ fileName: "package.json", source: `{ "type": "module" }`, type: "asset" });
			}
		}
	]
};
