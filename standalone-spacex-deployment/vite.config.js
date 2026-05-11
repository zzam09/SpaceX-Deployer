import { defineConfig } from 'vite';
import path from 'path';
import { glob } from 'glob';

const port     = Number(process.env.PORT || 3000);
const basePath = process.env.BASE_PATH || '/';

// Collect all HTML entry points (root + pages/)
const input = {
    main: path.resolve(import.meta.dirname, 'index.html'),
    ...Object.fromEntries(
        glob
            .sync('pages/**/*.html', { cwd: import.meta.dirname })
            .map(file => [
                file.replace(/\.html$/, ''),
                path.resolve(import.meta.dirname, file),
            ])
    ),
};

export default defineConfig({
    base: basePath,
    root: path.resolve(import.meta.dirname),
    build: {
        outDir: path.resolve(import.meta.dirname, 'dist'),
        emptyOutDir: true,
        rollupOptions: { input },
    },
    server: {
        port,
        strictPort: true,
        host: '0.0.0.0',
        allowedHosts: true,
    },
    preview: {
        port,
        host: '0.0.0.0',
    },
});
