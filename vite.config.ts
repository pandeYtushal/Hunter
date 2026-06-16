import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type UserConfig } from "vite";

type VitestConfig = UserConfig & {
  test: {
    environment: "node";
    globals: boolean;
    setupFiles: string[];
    coverage: {
      provider: "v8";
      reporter: string[];
      thresholds: {
        statements: number;
        branches: number;
        functions: number;
        lines: number;
      };
    };
  };
};

const getConfig = ({ mode }: { mode: string }) => {
  const isContentBuild = mode === "content";

  const baseConfig = {
    plugins: [react()],
    test: {
      environment: "node",
      globals: true,
      setupFiles: ["src/test/setup.ts"],
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html"],
        thresholds: {
          statements: 80,
          branches: 70,
          functions: 80,
          lines: 80
        }
      }
    },
    publicDir: "public"
  } satisfies VitestConfig;

  if (isContentBuild) {
    return {
      ...baseConfig,
      build: {
        outDir: "dist",
        emptyOutDir: false,
        sourcemap: true,
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          input: {
            content: resolve(__dirname, "src/content/contentScript.ts")
          } as Record<string, string>,
          output: {
            format: "iife" as const,
            entryFileNames: "assets/[name].js",
            extend: true
          }
        }
      }
    };
  }

  return {
    ...baseConfig,
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, "popup.html"),
          sidebar: resolve(__dirname, "sidebar.html"),
          background: resolve(__dirname, "src/background/background.ts")
        } as Record<string, string>,
        output: {
          entryFileNames: "assets/[name].js",
          chunkFileNames: "assets/[name].js",
          assetFileNames: "assets/[name][extname]"
        }
      }
    }
  };
};

export default defineConfig(({ mode }) => getConfig({ mode }));
