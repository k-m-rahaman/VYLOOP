import nextConstants from "next/constants.js";

const { PHASE_DEVELOPMENT_SERVER } = nextConstants;
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

const config = {
  basePath,
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
};
export default function nextConfig(phase) {
  // With static exports, a custom distDir changes the export folder as well.
  return phase === PHASE_DEVELOPMENT_SERVER
    ? { ...config, distDir: ".next-personal" }
    : config;
}
