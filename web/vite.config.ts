import react from "@vitejs/plugin-react";
import fs from "node:fs";
import { defineConfig, loadEnv } from "vite";

// Local dev runs on https://localhost:<port> and reaches Blocks through the
// dev-server proxy below (VITE_BLOCKS_DEV_PROXY=true): the browser only ever
// talks to localhost, so IAM's Secure session cookie is first-party there and
// the real project domain keeps pointing at the deployed app -- no hosts-file
// entry. `npm run cert` makes the HTTPS cert (its SAN covers localhost).
//
// Without the proxy, the original setup still works: set VITE_BLOCKS_DEV_HOST
// to the project's real domain and map it to 127.0.0.1 in the hosts file.
export const DEV_PROXY_PREFIX = "/blocks-api";

export default defineConfig(({ mode }) => {
  // Vite does not inject .env values into process.env for its own config
  // file -- loadEnv reads .env/.env.local explicitly (third arg "" loads
  // every key, not just VITE_-prefixed ones, though ours already are).
  const env = loadEnv(mode, process.cwd(), "");
  const domain = env.VITE_BLOCKS_DEV_HOST || undefined;
  const port = Number(env.VITE_BLOCKS_DEV_PORT || 5173);
  const useProxy = env.VITE_BLOCKS_DEV_PROXY === "true";
  const https = fs.existsSync(".cert/dev-key.pem") && fs.existsSync(".cert/dev-cert.pem")
    ? { key: fs.readFileSync(".cert/dev-key.pem"), cert: fs.readFileSync(".cert/dev-cert.pem") }
    : undefined;

  return {
    plugins: [react()],
    server: {
      // Vite blocks unrecognized Host headers by default (DNS-rebinding
      // protection) -- without this, a custom domain 404s with "Blocked
      // request. This host is not allowed" even once hosts + cert are set.
      allowedHosts: domain && domain !== "localhost" ? [domain] : undefined,
      host: domain || "0.0.0.0",
      https,
      port,
      // Keep the port fixed: it's part of the registered OIDC redirect_uri.
      strictPort: true,
      proxy: useProxy
        ? {
            [DEV_PROXY_PREFIX]: {
              target: env.VITE_BLOCKS_API_URL,
              changeOrigin: true,
              secure: true,
              rewrite: (path) => path.slice(DEV_PROXY_PREFIX.length) || "/",
              // IAM scopes its session cookie to the project's cookie domain;
              // dropping the Domain attribute makes it a localhost cookie.
              cookieDomainRewrite: { "*": "" },
              configure: (proxy) => {
                // Present the request as coming from the app's real origin, in
                // case the API checks Origin/Referer against known app domains.
                proxy.on("proxyReq", (proxyReq) => {
                  if (env.VITE_BLOCKS_APP_DOMAIN) {
                    proxyReq.setHeader("origin", env.VITE_BLOCKS_APP_DOMAIN);
                    proxyReq.setHeader("referer", `${env.VITE_BLOCKS_APP_DOMAIN}/`);
                  }
                });
              }
            }
          }
        : undefined
    }
  };
});
