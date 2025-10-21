<script>
  export let method = 'hybrid';

  const methodOptions = [
    { value: 'hybrid', label: 'Hybrid', description: 'Blend lexical + vector matches (recommended)' },
    { value: 'semantic', label: 'Semantic', description: 'Embedding-only search across profile & posts facets' },
    { value: 'lexical', label: 'Lexical', description: 'Full-text search of bios' }
  ];
</script>

<div class="space-y-2">
  <p class="text-xs font-medium text-gray-700">Search Mode</p>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
    {#each methodOptions as option (option.value)}
      <button
        type="button"
        on:click={() => (method = option.value)}
        class={`w-full text-left px-3 py-2 rounded border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
          method === option.value
            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        <span class="text-sm font-semibold block">{option.label}</span>
        <span class="text-[11px] block opacity-80">{option.description}</span>
      </button>
    {/each}
  </div>
</div>
