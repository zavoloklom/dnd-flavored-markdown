import { defineConfig } from 'vite'

export default defineConfig({
    server: { port: 5173 },
    define: {
        global: 'globalThis',
    },
    optimizeDeps: {
        include: ['gray-matter'],
    },
    resolve: {
        alias: {
            buffer: 'buffer',
        },
    },
    plugins: [],
})
