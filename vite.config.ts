import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { visualizer } from 'rollup-plugin-visualizer'
import svgLoader from 'vite-svg-loader'
import dts from 'vite-plugin-dts'
import path from 'node:path'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    svgLoader(),
    vueJsx(),
    dts({
      tsconfigPath: './tsconfig.app.json',
      entryRoot: 'src',
      insertTypesEntry: true,
      include: ['src'],
      outDir: 'dist',
    }),
    viteStaticCopy({
      targets: [
        {
          // Đường dẫn gốc chứa fonts (ví dụ: src/assets/fonts)
          src: 'src/assets/fonts',
          // Đường dẫn đích trong thư mục dist (kết quả sẽ là dist/assets/fonts)
          dest: 'assets'
        }
      ]
    }),
    visualizer({ filename: './dist/stats.html' }), // Visualize bundle contents
  ],
  server: {
    port: 4000,
  },
  preview: {
    port: 4001,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {},
  build: {
    lib: {
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        'vite/reloadPlugin': path.resolve(__dirname, 'src/vite/reloadPlugin.ts'),
      },
      name: 'GPlayAppSDK',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => (format === 'es' ? `${entryName}.mjs` : `${entryName}.cjs`),
    },
    minify: 'terser', // 'esbuild' is also an option
    terserOptions: {
      compress: {
        toplevel: true,
        // drop_console: true,
        drop_debugger: true,
        arrows: true, // Convert short functions to arrow functions
        booleans: true, // Optimize boolean expressions
        comparisons: true, // Optimize comparisons
        conditionals: true, // Optimize conditional statements
        dead_code: true, // Remove unreachable code
        evaluate: true, // Evaluate constant expressions
        hoist_funs: true, // Hoist function declarations
        hoist_props: true, // Hoist properties from constant objects
        hoist_vars: true, // Hoist var declarations
        if_return: true, // Optimize if-return and if-else-return
        inline: true, // Inline short functions
        join_vars: true, // Join consecutive var statements
        loops: true, // Optimize loops
        properties: true, // Optimize property access
        reduce_funcs: true, // Inline single-use functions
        reduce_vars: true, // Reduce the number of variables
        sequences: true, // Join consecutive simple statements
        switches: true, // Optimize switch statements
        typeofs: true, // Optimize typeof expressions
        unused: true, // Remove unused variables and functions
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      external: ['vue', 'vue-router'],
    },
    cssCodeSplit: false,
  },
})
