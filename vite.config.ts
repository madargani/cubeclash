import { defineConfig, loadEnv } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const env = loadEnv('', process.cwd(), '')
console.log('ALLOWED_HOSTS =', JSON.stringify(env.ALLOWED_HOSTS))
const config = defineConfig({
  server: {
    port: env.PORT ? Number(env.PORT) : 10000,
    allowedHosts: env.ALLOWED_HOSTS
        ? env.ALLOWED_HOSTS.split(',').map((host) => host.trim()).filter(Boolean)
        : []
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    nitro({
      serverDir: 'src/server/nitro',
      features: { websocket: true },
      plugins: ['./src/server/nitro/plugins/battle.ts'],
    }),
  ],
})

export default config
