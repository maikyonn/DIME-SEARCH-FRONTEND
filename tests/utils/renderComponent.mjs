import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compile } from 'svelte/compiler';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function renderComponent(relativePath, props = {}) {
  const filePath = path.resolve(__dirname, '..', '..', relativePath);
  const source = await readFile(filePath, 'utf8');

  const { js } = compile(source, {
    generate: 'ssr',
    filename: filePath,
  });

  const baseTmp = path.resolve(__dirname, '..', '.tmp');
  await mkdir(baseTmp, { recursive: true });
  const tmpDir = await mkdtemp(path.join(baseTmp, 'svelte-'));
  const tmpFile = path.join(tmpDir, `${path.basename(relativePath)}.mjs`);
  await writeFile(tmpFile, js.code, 'utf8');

  const moduleUrl = pathToFileURL(tmpFile).href;
  const { default: Component } = await import(moduleUrl);
  await rm(tmpDir, { recursive: true, force: true });
  await rm(baseTmp, { recursive: true, force: true });
  if (typeof Component !== 'function') {
    throw new Error(`Failed to compile ${relativePath}`);
  }

  const $$payload = { out: [], css: new Set(), head: '' };
  Component($$payload, props);

  return {
    html: $$payload.out.join(''),
    head: $$payload.head,
    css: Array.from($$payload.css).join('\n'),
  };
}
