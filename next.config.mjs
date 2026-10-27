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
  webpack: (config) => {
    // Browser and Web Worker bundles run on onnxruntime-web (WASM/WebGPU),
    // so stub out the Node-only packages transformers.js imports conditionally.
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    return config;
  },
};

export default nextConfig;
