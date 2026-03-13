import { defineConfig } from 'vite'

export default defineConfig({
  base: './', // Isso diz ao Vite para não buscar arquivos na raiz do HD
  server:{host: true, port: 3400}
})