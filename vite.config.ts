import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    // ローカルでもHTTPSが必要な場合は以下を活用（自己署名証明書の用意が必要）
    // https: true,
  }
});
