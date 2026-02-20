// Build: 2026-02-20 - Cache bust for env var fix
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: ['.manus.computer'],
  },
  // Ensure env vars are always available even if .env is missing or empty
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
      process.env.VITE_SUPABASE_URL || 'https://cpllxlkrwweqydbnunlw.supabase.co'
    ),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwbGx4bGtyd3dlcXlkYm51bmx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NDQ2NTMsImV4cCI6MjA4NzAyMDY1M30.wb31B7Y_MPoKtNff5hieL5s1p3QKQmxOxXsfNQm_7x0'
    ),
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    force: true,
    include: ["pdf-lib", "exceljs", "jspdf"],
    esbuildOptions: {
      target: "esnext",
    },
  },
  build: {
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks: {
          "pdf-libs": ["pdf-lib", "jspdf"],
          "excel-libs": ["exceljs", "xlsx"],
          "map-libs": ["mapbox-gl"],
          "vendor": ["react", "react-dom", "react-router-dom"],
          "ui": ["@radix-ui/react-dialog", "@radix-ui/react-select", "@radix-ui/react-tabs"],
        },
      },
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
}));
