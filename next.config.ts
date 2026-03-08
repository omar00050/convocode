import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["canvas", "sharp", "jimp", "skia-canvas"],
  outputFileTracingIncludes: {
    "/api/execute": [
      "./node_modules/canvas/**/*",
      "./node_modules/skia-canvas/**/*",
      "./node_modules/sharp/**/*",
      "./node_modules/jimp/**/*",
      "./node_modules/qrcode/**/*",
    ],
  },

};

export default nextConfig;
