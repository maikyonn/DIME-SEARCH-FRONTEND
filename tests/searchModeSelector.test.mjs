import { test } from 'node:test';
import assert from 'node:assert/strict';

import { renderComponent } from './utils/renderComponent.mjs';

const COMPONENT_PATH = 'src/lib/components/SearchModeSelector.svelte';

test('SearchModeSelector renders available modes', async () => {
  const { html } = await renderComponent(COMPONENT_PATH, {
    method: 'hybrid'
  });

  assert.match(html, /Hybrid/);
  assert.match(html, /Semantic/);
  assert.match(html, /Lexical/);
});

