<script lang="ts">
	import { onMount } from 'svelte';
	import { searchApi, type Creator, type SearchRequest, type SimilarSearchRequest, type CategorySearchRequest, ApiError } from '$lib/api.js';
	import CreatorCard from '$lib/components/CreatorCard.svelte';
	import Papa from 'papaparse';

	// Search state
	let activeTab: 'search' | 'similar' | 'category' = 'search';
	let loading = false;
	let error = '';
	let results: Creator[] = [];
	let searchCount = 0;
	let lastQuery = '';

	// Search form data
	let query = '';
	let similarAccount = '';
	let categoryName = '';
	let location = '';
	let method: 'vector' | 'text' | 'hybrid' = 'hybrid';
	let limit = 20;
	let minFollowers = 1000;
	let maxFollowers = 100000;
	let minEngagement = 0.0;
	
	// Language Filter
	let englishOnly: boolean | null = null;
	
	// LLM Score Filters
	let minIndividualScore = 0;
	let maxIndividualScore = 10;
	let minGenerationalScore = 0;
	let maxGenerationalScore = 10;
	let minProfessionalScore = 0;
	let maxProfessionalScore = 10;
	let minRelationshipScore = 0;
	let maxRelationshipScore = 10;
	
	// Vector search weights (default to even 1/3 distribution)
	let keywordWeight = 0.33;
	let profileWeight = 0.33;
	let contentWeight = 0.34; // Slightly higher to ensure sum = 1.0
	
	// Vector similarity search options
	let useVectorSimilarity = true;
	let similarityThreshold = 0.1;
	let similarKeywordWeight = 0.4;
	let similarProfileWeight = 0.4; 
	let similarContentWeight = 0.2;
	
	// Function to normalize weights so they sum to 1.0
	function normalizeWeights() {
		const total = keywordWeight + profileWeight + contentWeight;
		if (total > 0) {
			keywordWeight = keywordWeight / total;
			profileWeight = profileWeight / total;
			contentWeight = contentWeight / total;
		}
	}
	
	// Function to normalize similarity weights
	function normalizeSimilarityWeights() {
		const total = similarKeywordWeight + similarProfileWeight + similarContentWeight;
		if (total > 0) {
			similarKeywordWeight = similarKeywordWeight / total;
			similarProfileWeight = similarProfileWeight / total;
			similarContentWeight = similarContentWeight / total;
		}
	}

	// Advanced filters toggle
	let showAdvancedFilters = false;

	// API health check
	let apiHealthy = false;

	onMount(async () => {
		try {
			const health = await searchApi.healthCheck();
			apiHealthy = health.database_available;
		} catch (err) {
			console.error('Health check failed:', err);
		}
	});

	async function handleSearch() {
		if (activeTab === 'search' && !query.trim()) {
			error = 'Please enter a search query';
			return;
		}
		if (activeTab === 'similar' && !similarAccount.trim()) {
			error = 'Please enter an account username';
			return;
		}
		if (activeTab === 'category' && !categoryName.trim()) {
			error = 'Please enter a category';
			return;
		}

		loading = true;
		error = '';
		results = [];

		try {
			let response;

			if (activeTab === 'search') {
				// Normalize weights before sending
				normalizeWeights();
				
				const request: SearchRequest = {
					query: query.trim(),
					method,
					limit,
					min_followers: minFollowers,
					max_followers: maxFollowers,
					min_engagement: minEngagement,
					location: location.trim() || undefined,
					custom_weights: {
						keyword: keywordWeight,
						profile: profileWeight,
						content: contentWeight
					},
					// Language Filter
					english_only: englishOnly !== null ? englishOnly : undefined,
					// LLM Score Filters
					min_individual_vs_org_score: minIndividualScore > 0 ? minIndividualScore : undefined,
					max_individual_vs_org_score: maxIndividualScore < 10 ? maxIndividualScore : undefined,
					min_generational_appeal_score: minGenerationalScore > 0 ? minGenerationalScore : undefined,
					max_generational_appeal_score: maxGenerationalScore < 10 ? maxGenerationalScore : undefined,
					min_professionalization_score: minProfessionalScore > 0 ? minProfessionalScore : undefined,
					max_professionalization_score: maxProfessionalScore < 10 ? maxProfessionalScore : undefined,
					min_relationship_status_score: minRelationshipScore > 0 ? minRelationshipScore : undefined,
					max_relationship_status_score: maxRelationshipScore < 10 ? maxRelationshipScore : undefined
				};
				response = await searchApi.search(request);
				lastQuery = query.trim();
			} else if (activeTab === 'similar') {
				// Normalize similarity weights before sending
				normalizeSimilarityWeights();
				
				const request: SimilarSearchRequest = {
					account: similarAccount.trim().replace('@', ''),
					limit,
					min_followers: minFollowers,
					similarity_threshold: similarityThreshold,
					use_vector_similarity: useVectorSimilarity,
					custom_weights: useVectorSimilarity ? {
						keyword: similarKeywordWeight,
						profile: similarProfileWeight,
						content: similarContentWeight
					} : undefined
				};
				response = await searchApi.searchSimilar(request);
				lastQuery = `Similar to @${similarAccount.trim()} ${useVectorSimilarity ? '(Vector)' : '(Legacy)'}`;
			} else {
				const request: CategorySearchRequest = {
					category: categoryName.trim(),
					location: location.trim() || undefined,
					limit,
					min_followers: minFollowers
				};
				response = await searchApi.searchByCategory(request);
				lastQuery = `Category: ${categoryName.trim()}`;
			}

			results = response.results;
			searchCount = response.count;
		} catch (err) {
			if (err instanceof ApiError) {
				error = err.message;
			} else {
				error = 'Search failed. Please try again.';
			}
			console.error('Search error:', err);
		} finally {
			loading = false;
		}
	}

	function formatNumber(num: number): string {
		return new Intl.NumberFormat().format(num);
	}

	// Debounced search for query input
	let searchTimeout: ReturnType<typeof setTimeout>;
	function debounceSearch() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			if (query.trim()) {
				handleSearch();
			}
		}, 800);
	}

	$: if (query && activeTab === 'search') {
		debounceSearch();
	}

	// Export functionality using Papa Parse
	function exportToCSV() {
		if (!results || results.length === 0) return;

		try {
			// Debug: Log the first result to see what fields are available
			console.log('First result for debugging:', results[0]);
			console.log('Available keys:', Object.keys(results[0]));
			console.log('profile_url value:', results[0].profile_url);
			console.log('email_address value:', results[0].email_address);
			console.log('business_email value:', results[0].business_email);

			// Transform the data to include only the requested columns
			const csvData = results.map(creator => ({
				account: creator.account || '',
				profile_url: creator.profile_url || `https://instagram.com/${creator.account}`,
				followers: creator.followers || 0,
				avg_engagement: creator.avg_engagement || 0,
				biography: creator.biography || '',
				combined_score: creator.combined_score || 0,
				vector_similarity_score: creator.vector_similarity_score || 0,
				keyword_similarity: creator.keyword_similarity || 0,
				profile_similarity: creator.profile_similarity || 0,
				content_similarity: creator.content_similarity || 0,
				similarity_explanation: creator.similarity_explanation || ''
			}));

			// Generate CSV using Papa Parse
			const csv = Papa.unparse(csvData, {
				header: true,
				quotes: false, // Let Papa Parse decide when to quote
				delimiter: ',',
				newline: '\r\n' // Better Windows compatibility
			});

			// Create timestamp for filename
			const timestamp = new Date().toISOString().split('T')[0];
			const filename = `search-results-${timestamp}.csv`;

			// Add BOM for better Excel compatibility
			const BOM = '\uFEFF';
			const csvWithBOM = BOM + csv;

			// Create blob
			const blob = new Blob([csvWithBOM], { 
				type: 'text/csv;charset=utf-8;' 
			});

			// Create download link and trigger download
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			
			link.href = url;
			link.download = filename;
			link.target = '_blank'; // Open in new tab as fallback
			link.rel = 'noopener noreferrer';
			
			// Add to DOM temporarily
			document.body.appendChild(link);
			
			// Trigger download
			link.click();
			
			// Clean up immediately
			document.body.removeChild(link);
			
			// Clean up the URL after a short delay
			setTimeout(() => {
				URL.revokeObjectURL(url);
			}, 1000);

			console.log(`CSV export initiated: ${filename}`);
			
		} catch (error) {
			console.error('Error exporting CSV:', error);
			alert('Failed to export CSV. Please try again.');
		}
	}
</script>

<svelte:head>
	<title>DIME Creator Search</title>
	<meta name="description" content="Search and discover GenZ creators and influencers" />
</svelte:head>

<div class="min-h-screen bg-gray-50 flex">
	<!-- Left Sidebar - Search Interface -->
	<div class="w-80 bg-white shadow-lg overflow-y-auto flex-shrink-0">
		<div class="p-6">
			<!-- Header -->
			<div class="mb-6">
				<div class="flex items-center justify-between mb-2">
					<h1 class="text-2xl font-bold text-gray-900">DIME Creator Search</h1>
					<a 
						href="/how-it-works" 
						class="text-xs text-blue-600 hover:text-blue-500 font-medium flex items-center"
					>
						<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						How it Works
					</a>
				</div>
				<p class="text-sm text-gray-600">Discover the perfect GenZ creators</p>
				
				{#if !apiHealthy}
					<div class="mt-3 p-3 bg-red-50 border border-red-200 rounded text-xs">
						<p class="text-red-700">⚠️ API connection issue</p>
					</div>
				{/if}
			</div>

			<!-- Search Interface -->
			<!-- Tabs -->
			<div class="border-b border-gray-200 mb-4">
				<nav class="-mb-px flex space-x-4">
					<button
						class="py-2 px-1 border-b-2 font-medium text-xs {activeTab === 'search' 
							? 'border-blue-500 text-blue-600' 
							: 'border-transparent text-gray-500 hover:text-gray-700'}"
						onclick={() => activeTab = 'search'}
					>
						Search
					</button>
					<button
						class="py-2 px-1 border-b-2 font-medium text-xs {activeTab === 'similar' 
							? 'border-blue-500 text-blue-600' 
							: 'border-transparent text-gray-500 hover:text-gray-700'}"
						onclick={() => activeTab = 'similar'}
					>
						Similar
					</button>
					<button
						class="py-2 px-1 border-b-2 font-medium text-xs {activeTab === 'category' 
							? 'border-blue-500 text-blue-600' 
							: 'border-transparent text-gray-500 hover:text-gray-700'}"
						onclick={() => activeTab = 'category'}
					>
						Category
					</button>
				</nav>
			</div>

			<!-- Search Forms -->
			{#if activeTab === 'search'}
				<div class="space-y-3">
					<div>
						<label class="block text-xs font-medium text-gray-700 mb-1">Search Query</label>
						<textarea
							bind:value={query}
							placeholder="e.g., 'fitness influencer' or 'tech content creator'"
							rows="3"
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
						></textarea>
						
						<!-- Sample Query Buttons -->
						<div class="mt-2">
							<p class="text-xs font-medium text-gray-600 mb-2">Sample Queries:</p>
							<div class="grid grid-cols-2 gap-1">
								<button
									onclick={() => query = 'fitness influencer workout content'}
									class="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs rounded border border-blue-200 transition-colors"
								>
									Fitness
								</button>
								<button
									onclick={() => query = 'beauty makeup skincare tutorials'}
									class="px-2 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs rounded border border-pink-200 transition-colors"
								>
									Beauty
								</button>
								<button
									onclick={() => query = 'tech content creator gadget reviews'}
									class="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs rounded border border-gray-200 transition-colors"
								>
									Tech
								</button>
								<button
									onclick={() => query = 'fashion style outfit trendy clothing'}
									class="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs rounded border border-purple-200 transition-colors"
								>
									Fashion
								</button>
								<button
									onclick={() => query = 'food cooking recipe chef foodie'}
									class="px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs rounded border border-orange-200 transition-colors"
								>
									Food
								</button>
								<button
									onclick={() => query = 'travel adventure explore destination'}
									class="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs rounded border border-green-200 transition-colors"
								>
									Travel
								</button>
							</div>
						</div>
					</div>
				</div>
			{:else if activeTab === 'similar'}
				<div class="space-y-3">
					<div>
						<label class="block text-xs font-medium text-gray-700 mb-1">Reference Account</label>
						<input
							type="text"
							bind:value={similarAccount}
							placeholder="e.g., physiquless"
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
					
					<!-- Vector Similarity Toggle -->
					<div class="p-3 bg-blue-50 rounded-lg border border-blue-200">
						<div class="flex items-center justify-between mb-2">
							<label class="text-xs font-medium text-blue-800">Enhanced Vector Similarity</label>
							<button
								onclick={() => useVectorSimilarity = !useVectorSimilarity}
								class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 {useVectorSimilarity ? 'bg-blue-600' : 'bg-gray-200'}"
								role="switch"
								aria-checked={useVectorSimilarity}
							>
								<span class="sr-only">Use vector similarity</span>
								<span
									aria-hidden="true"
									class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {useVectorSimilarity ? 'translate-x-4' : 'translate-x-0'}"
								></span>
							</button>
						</div>
						<p class="text-xs text-blue-600">
							{useVectorSimilarity 
								? '🎯 Using direct vector comparison for more accurate results'
								: '📝 Using text-based similarity search (legacy)'
							}
						</p>
					</div>
				</div>
			{:else}
				<div class="space-y-3">
					<div>
						<label class="block text-xs font-medium text-gray-700 mb-1">Category</label>
						<input
							type="text"
							bind:value={categoryName}
							placeholder="e.g., fitness, fashion, beauty"
							class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
				</div>
			{/if}

			<!-- Advanced Filters Toggle -->
			<div class="mt-4">
				<button
					onclick={() => showAdvancedFilters = !showAdvancedFilters}
					class="flex items-center text-xs font-medium text-blue-600 hover:text-blue-500"
				>
					<svg class="w-3 h-3 mr-1 transform {showAdvancedFilters ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
					Advanced Filters
				</button>
			</div>

			<!-- Advanced Filters -->
			{#if showAdvancedFilters}
				<div class="mt-3 p-3 bg-gray-50 rounded space-y-3">
					<div class="space-y-3">
						<div>
							<label class="block text-xs font-medium text-gray-700 mb-1">Min Followers</label>
							<input
								type="number"
								bind:value={minFollowers}
								min="0"
								class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
							/>
							<p class="text-xs text-gray-500 mt-1">{formatNumber(minFollowers)}</p>
						</div>
						<div>
							<label class="block text-xs font-medium text-gray-700 mb-1">Max Followers</label>
							<input
								type="number"
								bind:value={maxFollowers}
								min="0"
								class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
							/>
							<p class="text-xs text-gray-500 mt-1">{formatNumber(maxFollowers)}</p>
						</div>
						<div>
							<label class="block text-xs font-medium text-gray-700 mb-1">Min Engagement (%)</label>
							<input
								type="number"
								bind:value={minEngagement}
								min="0"
								step="0.1"
								class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>
					</div>

					<div class="space-y-3">
						<div>
							<label class="block text-xs font-medium text-gray-700 mb-1">Location</label>
							<input
								type="text"
								bind:value={location}
								placeholder="e.g., New York, California"
								class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>
						<div>
							<label class="block text-xs font-medium text-gray-700 mb-1">Results Limit</label>
							<select bind:value={limit} class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
								<option value={10}>10</option>
								<option value={20}>20</option>
								<option value={50}>50</option>
								<option value={100}>100</option>
								<option value={200}>200</option>
								<option value={500}>500</option>
								<option value={1000}>1000</option>
							</select>
						</div>
					</div>
					
					<!-- Language Filter -->
					<div class="space-y-3">
						<div class="border-t pt-3">
							<label class="block text-xs font-medium text-gray-700 mb-2">🌍 Language Filter</label>
							<div class="space-y-2">
								<div>
									<label class="block text-xs text-gray-600 mb-1">Profile Language</label>
									<select 
										bind:value={englishOnly}
										class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
									>
										<option value={null}>All Languages</option>
										<option value={true}>English Only</option>
										<option value={false}>Non-English Only</option>
									</select>
								</div>
							</div>
						</div>
					</div>

					<!-- LLM Score Filters -->
					<div class="space-y-3">
						<div class="border-t pt-3">
							<label class="block text-xs font-medium text-gray-700 mb-2">🧠 LLM Score Filters (0-10 scale)</label>
							<div class="space-y-2">
								<!-- Individual vs Organization Score -->
								<div>
									<label class="block text-xs text-gray-600 mb-1">Individual vs Organization Score</label>
									<div class="flex items-center space-x-2">
										<input
											type="number"
											bind:value={minIndividualScore}
											min="0"
											max="10"
											class="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
											placeholder="Min"
										/>
										<span class="text-xs text-gray-500">to</span>
										<input
											type="number"
											bind:value={maxIndividualScore}
											min="0"
											max="10"
											class="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
											placeholder="Max"
										/>
									</div>
									<p class="text-xs text-gray-500 mt-1">0=Organization, 10=Individual Creator</p>
								</div>
								
								<!-- Generational Appeal Score -->
								<div>
									<label class="block text-xs text-gray-600 mb-1">Generational Appeal Score</label>
									<div class="flex items-center space-x-2">
										<input
											type="number"
											bind:value={minGenerationalScore}
											min="0"
											max="10"
											class="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
											placeholder="Min"
										/>
										<span class="text-xs text-gray-500">to</span>
										<input
											type="number"
											bind:value={maxGenerationalScore}
											min="0"
											max="10"
											class="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
											placeholder="Max"
										/>
									</div>
									<p class="text-xs text-gray-500 mt-1">0=Low Gen Z Appeal, 10=High Gen Z Appeal</p>
								</div>
								
								<!-- Professionalization Score -->
								<div>
									<label class="block text-xs text-gray-600 mb-1">Professionalization Score</label>
									<div class="flex items-center space-x-2">
										<input
											type="number"
											bind:value={minProfessionalScore}
											min="0"
											max="10"
											class="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
											placeholder="Min"
										/>
										<span class="text-xs text-gray-500">to</span>
										<input
											type="number"
											bind:value={maxProfessionalScore}
											min="0"
											max="10"
											class="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
											placeholder="Max"
										/>
									</div>
									<p class="text-xs text-gray-500 mt-1">0=Casual, 10=Highly Professional</p>
								</div>
								
								<!-- Relationship Status Score -->
								<div>
									<label class="block text-xs text-gray-600 mb-1">Relationship Status Score</label>
									<div class="flex items-center space-x-2">
										<input
											type="number"
											bind:value={minRelationshipScore}
											min="0"
											max="10"
											class="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
											placeholder="Min"
										/>
										<span class="text-xs text-gray-500">to</span>
										<input
											type="number"
											bind:value={maxRelationshipScore}
											min="0"
											max="10"
											class="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
											placeholder="Max"
										/>
									</div>
									<p class="text-xs text-gray-500 mt-1">0=Single, 10=Relationship-Focused</p>
								</div>
								
								<!-- Quick Filter Presets -->
								<div class="border-t pt-2">
									<label class="block text-xs font-medium text-gray-700 mb-2">Quick Presets</label>
									<div class="grid grid-cols-2 gap-1">
										<button
											onclick={() => {
												minIndividualScore = 7; maxIndividualScore = 10;
												minGenerationalScore = 7; maxGenerationalScore = 10;
											}}
											class="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs rounded border border-purple-200 transition-colors"
										>
											Gen Z Individuals
										</button>
										<button
											onclick={() => {
												minProfessionalScore = 7; maxProfessionalScore = 10;
												minIndividualScore = 0; maxIndividualScore = 3;
											}}
											class="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs rounded border border-blue-200 transition-colors"
										>
											Professional Orgs
										</button>
										<button
											onclick={() => {
												minRelationshipScore = 7; maxRelationshipScore = 10;
												minGenerationalScore = 5; maxGenerationalScore = 10;
											}}
											class="px-2 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs rounded border border-pink-200 transition-colors"
										>
											Couples/Family
										</button>
										<button
											onclick={() => {
												englishOnly = null;
												minIndividualScore = 0; maxIndividualScore = 10;
												minGenerationalScore = 0; maxGenerationalScore = 10;
												minProfessionalScore = 0; maxProfessionalScore = 10;
												minRelationshipScore = 0; maxRelationshipScore = 10;
											}}
											class="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs rounded border border-gray-200 transition-colors"
										>
											Reset All
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>

					{#if activeTab === 'search'}
						<div class="space-y-3">
							<div>
								<label class="block text-xs font-medium text-gray-700 mb-1">Search Method</label>
								<select bind:value={method} class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
									<option value="hybrid">Hybrid (Default)</option>
									<option value="vector">Vector</option>
									<option value="text">Text</option>
								</select>
							</div>
							
							<!-- Vector Search Weights -->
							{#if method === 'vector' || method === 'hybrid'}
								<div class="border-t pt-3">
									<label class="block text-xs font-medium text-gray-700 mb-2">Vector Search Weights</label>
									<div class="space-y-2">
										<div>
											<div class="flex justify-between items-center">
												<label class="text-xs text-gray-600">Keyword Weight</label>
												<span class="text-xs text-gray-500">{keywordWeight.toFixed(2)}</span>
											</div>
											<input
												type="range"
												bind:value={keywordWeight}
												min="0"
												max="1"
												step="0.01"
												class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
											/>
										</div>
										<div>
											<div class="flex justify-between items-center">
												<label class="text-xs text-gray-600">Profile Weight</label>
												<span class="text-xs text-gray-500">{profileWeight.toFixed(2)}</span>
											</div>
											<input
												type="range"
												bind:value={profileWeight}
												min="0"
												max="1"
												step="0.01"
												class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
											/>
										</div>
										<div>
											<div class="flex justify-between items-center">
												<label class="text-xs text-gray-600">Content Weight</label>
												<span class="text-xs text-gray-500">{contentWeight.toFixed(2)}</span>
											</div>
											<input
												type="range"
												bind:value={contentWeight}
												min="0"
												max="1"
												step="0.01"
												class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
											/>
										</div>
										<div class="flex justify-between items-center text-xs">
											<button
												onclick={() => { keywordWeight = 0.33; profileWeight = 0.33; contentWeight = 0.34; }}
												class="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
											>
												Reset to 1/3 Each
											</button>
											<span class="text-gray-500">
												Total: {(keywordWeight + profileWeight + contentWeight).toFixed(2)}
											</span>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{:else if activeTab === 'similar' && useVectorSimilarity}
						<!-- Vector Similarity Advanced Options -->
						<div class="space-y-3">
							<div>
								<label class="block text-xs font-medium text-gray-700 mb-1">Similarity Threshold</label>
								<input
									type="number"
									bind:value={similarityThreshold}
									min="0"
									max="1"
									step="0.01"
									class="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
								/>
								<p class="text-xs text-gray-500 mt-1">Minimum similarity: {similarityThreshold} (0.1 = 10%)</p>
							</div>
							
							<!-- Vector Similarity Weights -->
							<div class="border-t pt-3">
								<label class="block text-xs font-medium text-gray-700 mb-2">Vector Similarity Weights</label>
								<div class="space-y-2">
									<div>
										<div class="flex justify-between items-center">
											<label class="text-xs text-gray-600">Keyword Similarity</label>
											<span class="text-xs text-gray-500">{similarKeywordWeight.toFixed(2)}</span>
										</div>
										<input
											type="range"
											bind:value={similarKeywordWeight}
											min="0"
											max="1"
											step="0.01"
											class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
										/>
									</div>
									<div>
										<div class="flex justify-between items-center">
											<label class="text-xs text-gray-600">Profile Similarity</label>
											<span class="text-xs text-gray-500">{similarProfileWeight.toFixed(2)}</span>
										</div>
										<input
											type="range"
											bind:value={similarProfileWeight}
											min="0"
											max="1"
											step="0.01"
											class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
										/>
									</div>
									<div>
										<div class="flex justify-between items-center">
											<label class="text-xs text-gray-600">Content Similarity</label>
											<span class="text-xs text-gray-500">{similarContentWeight.toFixed(2)}</span>
										</div>
										<input
											type="range"
											bind:value={similarContentWeight}
											min="0"
											max="1"
											step="0.01"
											class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
										/>
									</div>
									<div class="flex justify-between items-center text-xs">
										<button
											onclick={() => { similarKeywordWeight = 0.4; similarProfileWeight = 0.4; similarContentWeight = 0.2; }}
											class="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
										>
											Reset Defaults
										</button>
										<span class="text-gray-500">
											Total: {(similarKeywordWeight + similarProfileWeight + similarContentWeight).toFixed(2)}
										</span>
									</div>
								</div>
							</div>
							
							<!-- Preset Weight Configurations -->
							<div class="border-t pt-3">
								<label class="block text-xs font-medium text-gray-700 mb-2">Quick Presets</label>
								<div class="grid grid-cols-2 gap-1">
									<button
										onclick={() => { similarKeywordWeight = 0.7; similarProfileWeight = 0.2; similarContentWeight = 0.1; }}
										class="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs rounded border border-green-200 transition-colors"
									>
										Keyword Focus
									</button>
									<button
										onclick={() => { similarKeywordWeight = 0.2; similarProfileWeight = 0.7; similarContentWeight = 0.1; }}
										class="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs rounded border border-purple-200 transition-colors"
									>
										Profile Focus
									</button>
									<button
										onclick={() => { similarKeywordWeight = 0.2; similarProfileWeight = 0.2; similarContentWeight = 0.6; }}
										class="px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs rounded border border-orange-200 transition-colors"
									>
										Content Focus
									</button>
									<button
										onclick={() => { similarKeywordWeight = 0.33; similarProfileWeight = 0.33; similarContentWeight = 0.34; }}
										class="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs rounded border border-blue-200 transition-colors"
									>
										Balanced
									</button>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Search Button -->
			<div class="mt-4">
				<button
					onclick={handleSearch}
					disabled={loading || !apiHealthy}
					class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded text-sm transition-colors"
				>
					{loading ? 'Searching...' : 'Search'}
				</button>
			</div>
		</div>
	</div>

	<!-- Right Side - Results (80% width) -->
	<div class="flex-1 p-2 overflow-y-auto">
		<!-- Error Display -->
		{#if error}
			<div class="bg-red-50 border border-red-200 rounded p-3 mb-3">
				<div class="flex">
					<svg class="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
					</svg>
					<div class="ml-2">
						<p class="text-xs font-medium text-red-800">{error}</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Loading State -->
		{#if loading}
			<div class="flex justify-center items-center h-32">
				<div class="inline-flex items-center text-sm font-medium text-blue-600">
					<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					Searching for creators...
				</div>
			</div>
		{:else if results.length > 0}
			<!-- Results Header -->
			<div class="flex items-center justify-between mb-3 px-1">
				<h2 class="text-lg font-bold text-gray-900">
					{searchCount} creator{searchCount !== 1 ? 's' : ''}
				</h2>
				<div class="flex items-center space-x-3">
					<button
						onclick={exportToCSV}
						class="inline-flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
						title="Export search results to CSV"
					>
						<svg class="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
						Export CSV
					</button>
					<div class="text-xs text-gray-500 truncate max-w-xs">
						"{lastQuery}"
					</div>
				</div>
			</div>
			
			<!-- Results Grid -->
			<div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
				{#each results as creator (creator.id)}
					<CreatorCard {creator} />
				{/each}
			</div>
		{:else if !loading && searchCount === 0 && lastQuery}
			<!-- No Results -->
			<div class="flex flex-col items-center justify-center h-64">
				<svg class="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<h3 class="text-base font-medium text-gray-900 mb-1">No creators found</h3>
				<p class="text-sm text-gray-600">Try adjusting your search terms or filters</p>
			</div>
		{:else}
			<!-- Welcome State -->
			<div class="flex items-center justify-center h-64">
				<div class="text-center">
					<h3 class="text-lg font-medium text-gray-900 mb-2">Welcome to DIME Creator Search</h3>
					<p class="text-sm text-gray-600">Use the search panel to discover GenZ creators and influencers</p>
				</div>
			</div>
		{/if}
	</div>
</div>
