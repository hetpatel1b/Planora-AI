import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    const isCiOrTest = Boolean(process.env.CI || process.env.PLAYWRIGHT_TEST_BASE_URL);

    // In development, Turbopack and React Fast Refresh / source maps may use eval-like mechanisms.
    // In production, 'unsafe-eval' is strictly omitted to defend against string-to-code injection (DOM XSS).
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'";

    // Allow local development and CI isolated test containers (e.g. Supabase local instance at 127.0.0.1:54321)
    const localConnectEndpoints =
      isDev || isCiOrTest
        ? " http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*"
        : "";

    const localImgEndpoints =
      isDev || isCiOrTest ? " http://127.0.0.1:* http://localhost:*" : "";

    let customSupabaseOrigin = "";
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const parsedUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
        if (
          !parsedUrl.hostname.endsWith(".supabase.co") &&
          !parsedUrl.hostname.includes("127.0.0.1") &&
          !parsedUrl.hostname.includes("localhost")
        ) {
          customSupabaseOrigin = ` ${parsedUrl.origin}`;
        }
      } catch {
        // Ignore unparseable URLs
      }
    }

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline'",
              `img-src 'self' data: blob: https://*.supabase.co https://avatars.githubusercontent.com${localImgEndpoints}`,
              "font-src 'self' data:",
              `connect-src 'self' https://*.supabase.co wss://*.supabase.co${localConnectEndpoints}${customSupabaseOrigin}`,
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
