import { defineConfig } from 'vite';

// SUPER CAPYBARA: POLICE DETECTIVE runs on port 5176 in development
// (5173 is SuperCapybara, 5174 is SuperCapybara 3, 5175 is SupaCapy 2).
export default defineConfig({
  server: { port: 5176, strictPort: true },
  preview: { port: 4176 },
});
