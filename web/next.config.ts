import path from "node:path";
import { config } from "dotenv";
import type { NextConfig } from "next";

// Локально сайт берёт настройки (DATABASE_URL) из общего .env в корне репозитория.
// На хостинге переменные задаются в его настройках, и файла нет.
config({ path: path.resolve(__dirname, "../.env"), quiet: true });

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Корень проекта — эта папка (иначе Next.js может выбрать папку выше, если там есть package-lock.json).
  outputFileTracingRoot: __dirname,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Сайт нельзя встроить в чужую страницу (защита от кликджекинга).
          { key: "X-Frame-Options", value: "DENY" },
          // Строгий CSP со скриптами требует nonce для встроенных скриптов Next.js; пока ограничиваем
          // то, что не ломает сайт: встраивание, плагины и подмену базового адреса.
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
