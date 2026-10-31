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
};

export default nextConfig;
