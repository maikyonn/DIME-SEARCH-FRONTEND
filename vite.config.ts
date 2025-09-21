import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const projectRootDir = dirname(fileURLToPath(new URL('./', import.meta.url)));

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		fs: {
			// Allow the dev server to serve generated SvelteKit files regardless of
			// whether the repo is mounted via a different absolute path (e.g. NFS).
			allow: [projectRootDir, resolve(projectRootDir, '..'), '/lambda/nfs/dime']
		}
	}
});
