import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/scouts/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
});
