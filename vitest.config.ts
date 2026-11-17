import { defineConfig } from 'vitest/config'

const config = defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})

export default config
