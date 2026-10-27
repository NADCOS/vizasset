/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  experimental: {
    // Load transformers.js and its Node-only native deps with require() on the server instead of
    // bundling them; webpack can't resolve the ONNX .wasm files referenced by the Node build.
    serverComponentsExternalPackages: ["@huggingface/transformers", "sharp", "onnxruntime-node"],
  },
  webpack: (config, { webpack }) => {
    // Browser and Web Worker bundles run on onnxruntime-web (WASM/WebGPU),
    // so stub out the Node-only packages transformers.js imports conditionally.
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    // transformers.js emits ort.webgpu.bundle.min.mjs as a static asset. Next's SWC minifier
    // re-minifies it as a classic script and fails on its import.meta, so flag the already-minified
    // file as minimized and the minifier skips it.
    config.plugins.push({
      apply(compiler) {
        compiler.hooks.thisCompilation.tap("SkipOrtMinify", (compilation) => {
          compilation.hooks.processAssets.tap(
            { name: "SkipOrtMinify", stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE },
            (assets) => {
              for (const name of Object.keys(assets)) {
                if (/ort\.webgpu\.bundle\.min\.[^/]*\.?mjs$/.test(name)) {
                  compilation.updateAsset(name, (source) => source, { minimized: true });
                }
              }
            },
          );
        });
      },
    });
    return config;
  },
};

export default nextConfig;
