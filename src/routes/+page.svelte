<script lang="ts">
	import { onMount } from 'svelte';
	import {
		searchApi,
		API_BASE_URL,
		type Creator,
		type SearchRequest,
		type SimilarSearchRequest,
		type CategorySearchRequest,
		type EvaluationRequest
	} from '$lib/api.js';
	import CreatorCard from '$lib/components/CreatorCard.svelte';
	import SearchModeSelector from '$lib/components/SearchModeSelector.svelte';
import Papa from 'papaparse';

	const PAGE_SIZE = 20;

	type Tab = 'search' | 'similar' | 'category' | 'profile';
	type StreamEvent = { stage: string; data: any };
	type FitProgressState = { completed: number; total: number; account?: string | null };

	let activeTab: Tab = 'search';
	let method: 'semantic' | 'lexical' | 'hybrid' = 'hybrid';
let lexicalScope: 'bio' | 'bio_posts' = 'bio';

	let query = '';
	let similarAccount = '';
	let categoryName = '';
	let profileUsername = '';

	let limit = 50;
	let minFollowers: number | null = null;
	let maxFollowers: number | null = null;
	let minEngagement: number | null = null;
	let maxEngagement: number | null = null;
	let locationFilter = '';
	let categoryFilter = '';
	let isVerified: 'any' | 'yes' | 'no' = 'any';
	let isBusinessAccount: 'any' | 'yes' | 'no' = 'any';

	let loading = false;
	let error = '';
	let results: Creator[] = [];
	let searchCount = 0;
	let lastQuery = '';

	let pageSize = PAGE_SIZE;
	let currentPage = 1;
	$: totalPages = Math.max(1, Math.ceil(results.length / pageSize));
	$: currentPage = Math.min(Math.max(currentPage, 1), totalPages);
	$: pageStart = results.length ? (currentPage - 1) * pageSize + 1 : 0;
	$: pageEnd = results.length ? Math.min(currentPage * pageSize, results.length) : 0;
	$: paginatedResults = results.slice((currentPage - 1) * pageSize, currentPage * pageSize);

	let evaluationLoading = false;
	let evaluationError = '';
	let runBrightData = false;
	let runLLM = false;
	let businessBrief = '';
	let evaluationStatus = '';
	let brightdataStatus = '';
	let fitProgress: FitProgressState = { completed: 0, total: 0 };

	let apiHealthy = false;

	$: if (method !== 'lexical') {
		lexicalScope = 'bio';
	}

	$: if (!runBrightData && !runLLM) {
		brightdataStatus = '';
		evaluationStatus = '';
		fitProgress = { completed: 0, total: 0, account: null };
	}

	onMount(async () => {
		try {
			const health = await searchApi.healthCheck();
			apiHealthy = Boolean(health?.database_available);
		} catch (err) {
			console.error('Health check failed', err);
		}
	});

	function parseNumber(value: number | null): number | undefined {
		if (value === null || Number.isNaN(value)) return undefined;
		return Number(value);
	}

	function parseRate(value: number | null): number | undefined {
		if (value === null || Number.isNaN(value)) return undefined;
		return Number(value) / 100;
	}

	function normaliseKey(value: string | number | null | undefined): string | null {
		if (value === null || value === undefined) return null;
		const text = String(value).trim().toLowerCase();
		return text || null;
	}

	function resultKey(item: Creator): string | null {
		return (
			normaliseKey(item.lance_db_id) ??
			normaliseKey(item.account) ??
			normaliseKey(item.username) ??
			normaliseKey(item.profile_url) ??
			(item.id !== undefined ? normaliseKey(item.id) : null)
		);
	}

	function mergeEvaluationResults(updates: Creator[]): void {
		if (!updates?.length || !results.length) {
			return;
		}

		const lookup = new Map<string, Creator>();
		for (const update of updates) {
			const key = resultKey(update);
			if (key) {
				lookup.set(key, update);
			}
		}

		if (!lookup.size) {
			return;
		}

		results = results.map((existing) => {
			const key = resultKey(existing);
			if (!key) {
				return existing;
			}
			const patch = lookup.get(key);
			if (!patch) {
				return existing;
			}
			return {
				...existing,
				...patch,
				posts: patch.posts && patch.posts.length ? patch.posts : existing.posts,
				profile_fts_source: patch.profile_fts_source ?? existing.profile_fts_source,
				posts_fts_source: patch.posts_fts_source ?? existing.posts_fts_source
			};
		});
	}

	function consumeSSEBuffer(buffer: string, onEvent: (event: StreamEvent) => void): string {
		const blocks = buffer.split('\n\n');
		buffer = blocks.pop() ?? '';

		for (const block of blocks) {
			const lines = block.split('\n');
			const dataLines: string[] = [];
			for (const line of lines) {
				if (line.startsWith('data:')) {
					dataLines.push(line.slice(5).trimStart());
				}
			}
			if (!dataLines.length) {
				continue;
			}
			const payloadRaw = dataLines.join('\n');
			if (!payloadRaw) {
				continue;
			}
			try {
				const parsed = JSON.parse(payloadRaw) as StreamEvent;
				if (parsed && parsed.stage) {
					onEvent(parsed);
				}
			} catch (err) {
				console.error('Failed to parse evaluation stream payload', err, payloadRaw);
			}
		}

		return buffer;
	}

	function handleEvaluationEvent(event: StreamEvent): 'continue' | 'completed' | 'error' {
		const { stage, data } = event;

		switch (stage) {
			case 'evaluation_started': {
				const total = Number(data?.count) || fitProgress.total || 0;
				evaluationStatus = `Evaluating ${total} profile${total === 1 ? '' : 's'}…`;
				brightdataStatus = data?.run_brightdata ? 'Waiting for BrightData…' : 'BrightData skipped';
				fitProgress = { completed: 0, total, account: null };
				return 'continue';
			}
			case 'brightdata_started': {
				const count = Number(data?.count) || 0;
				brightdataStatus = `Refreshing ${count} profile${count === 1 ? '' : 's'} via BrightData…`;
				evaluationStatus = 'Running BrightData refresh…';
				return 'continue';
			}
			case 'brightdata_completed': {
				if (data?.error) {
					brightdataStatus = `BrightData error: ${data.error}`;
				} else {
					const count = Number(data?.count) || 0;
					brightdataStatus = count
						? `BrightData refreshed ${count} profile${count === 1 ? '' : 's'}`
						: 'BrightData completed';
				}
				return 'continue';
			}
			case 'fit_progress': {
				const completed = Number(data?.completed) || 0;
				const total = Number(data?.total) || fitProgress.total || 0;
				const account = typeof data?.account === 'string' ? data.account : null;
				fitProgress = { completed, total, account };
				evaluationStatus = `Scoring profiles (${completed}/${total})…`;
				return 'continue';
			}
			case 'fit_completed': {
				const total = Number(data?.total) || fitProgress.total || 0;
				fitProgress = { completed: total, total, account: null };
				evaluationStatus = 'LLM scoring complete.';
				return 'continue';
			}
			case 'completed': {
				if (Array.isArray(data?.results)) {
					mergeEvaluationResults(data.results as Creator[]);
				}
				const profileFitCount = Array.isArray(data?.profile_fit) ? data.profile_fit.length : fitProgress.total;
				fitProgress = { completed: profileFitCount, total: fitProgress.total || profileFitCount, account: null };
				if (brightdataStatus === '' && Array.isArray(data?.brightdata_results)) {
					const count = data.brightdata_results.length;
					brightdataStatus = count ? `BrightData refreshed ${count} profile${count === 1 ? '' : 's'}` : 'BrightData skipped';
				}
				evaluationStatus = 'Evaluation complete.';
				return 'completed';
			}
			case 'error': {
				const message = typeof data?.message === 'string' ? data.message : 'Evaluation failed.';
				evaluationError = message;
				evaluationStatus = 'Evaluation failed.';
				return 'error';
			}
			default:
				return 'continue';
		}
	}

	async function runStreamingEvaluation(profiles: Creator[]): Promise<void> {
		const payload: EvaluationRequest = {
			profiles,
			run_brightdata: runBrightData,
			run_llm: runLLM,
			business_fit_query: runLLM ? businessBrief.trim() || undefined : undefined,
			max_profiles: profiles.length || undefined,
			max_posts: 6
		};

		const response = await fetch(`${API_BASE_URL}/search/evaluate/stream`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(payload)
		});

		if (!response.ok || !response.body) {
			let detail = '';
			try {
				detail = await response.text();
			} catch (err) {
				detail = '';
			}
			throw new Error(detail || `Evaluation request failed (${response.status})`);
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder('utf-8');
		let buffer = '';
		let completed = false;
		let failure: Error | null = null;

		const processEvent = (event: StreamEvent) => {
			const outcome = handleEvaluationEvent(event);
			if (outcome === 'completed') {
				completed = true;
			} else if (outcome === 'error') {
				failure = new Error(evaluationError || 'Evaluation failed.');
			}
		};

		while (!completed && !failure) {
			const { value, done } = await reader.read();
			if (done) {
				break;
			}
			if (value) {
				buffer += decoder.decode(value, { stream: true });
				buffer = consumeSSEBuffer(buffer, processEvent);
			}
		}

		if (!completed && !failure) {
			buffer += decoder.decode(new Uint8Array(), { stream: false });
			buffer = consumeSSEBuffer(buffer, processEvent);
		}

		if (completed || failure) {
			try {
				await reader.cancel();
			} catch (err) {
				// Ignore cancellation errors – stream already done or closed
			}
		}

		if (failure) {
			throw failure;
		}

		if (!completed) {
			throw new Error('Evaluation stream ended unexpectedly. Please retry.');
		}
	}


	function exportResultsToCSV() {
		if (!results.length) {
			return;
		}
		try {
			const csvRows = results.map((creator) => ({
				profile_url: creator.profile_url || '',
				fit_score: creator.fit_score ?? '',
				fit_rationale: creator.fit_rationale ?? '',
				profile_name: creator.profile_name,
				account: creator.account,
				platform: creator.platform || '',
				followers: creator.followers,
				followers_formatted: creator.followers_formatted,
				avg_engagement: creator.avg_engagement,
				biography: creator.biography || '',
				bm25_fts_score: creator.bm25_fts_score ?? '',
				cos_sim_profile: creator.cos_sim_profile ?? '',
				cos_sim_posts: creator.cos_sim_posts ?? '',
				combined_score: creator.combined_score ?? '',
				score_mode: creator.score_mode || '',
				vector_similarity_score: creator.vector_similarity_score ?? '',
				keyword_similarity: creator.keyword_similarity ?? '',
				profile_similarity: creator.profile_similarity ?? '',
				content_similarity: creator.content_similarity ?? '',
				profile_fts_source: creator.profile_fts_source ?? '',
				posts_fts_source: creator.posts_fts_source ?? '',
				business_category: creator.business_category_name ?? '',
				business_address: creator.business_address ?? '',
				business_email: creator.business_email ?? '',
				is_verified: creator.is_verified ?? '',
				id: creator.id,
				lance_db_id: creator.lance_db_id ?? '',
				posts_preview: creator.posts ? JSON.stringify(creator.posts) : ''
			}));
			const csv = Papa.unparse(csvRows, { header: true });
			const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `dime-search-results-${Date.now()}.csv`;
			link.click();
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error('CSV export failed', err);
		}
	}

	function resetPagination(list: Creator[], queryLabel: string, modeLabel: string) {
		results = list;
		searchCount = list.length;
		lastQuery = queryLabel;
		currentPage = 1;
		error = '';
		loading = false;
		evaluationError = '';
		if (modeLabel) {
			console.info(`Search completed (${modeLabel}) | results=${list.length}`);
		}
	}

	async function handleSearch() {
		error = '';
		if (activeTab === 'search' && !query.trim()) {
			error = 'Please enter a search query.';
			return;
		}
		if (activeTab === 'similar' && !similarAccount.trim()) {
			error = 'Please enter a username to find similar creators.';
			return;
		}
		if (activeTab === 'category' && !categoryName.trim()) {
			error = 'Please enter a category to search.';
			return;
		}
		if (activeTab === 'profile' && !profileUsername.trim()) {
			error = 'Please enter a username.';
			return;
		}

		loading = true;
		results = [];
		searchCount = 0;
		lastQuery = '';

		try {
			if (activeTab === 'search') {
				const verifiedValue = isVerified === 'any' ? undefined : isVerified === 'yes';
				const businessValue = isBusinessAccount === 'any' ? undefined : isBusinessAccount === 'yes';
				const request: SearchRequest = {
					query: query.trim(),
					method,
					limit,
					min_followers: parseNumber(minFollowers),
					max_followers: parseNumber(maxFollowers),
					min_engagement: parseRate(minEngagement),
					max_engagement: parseRate(maxEngagement),
					location: locationFilter.trim() || undefined,
					category: categoryFilter.trim() || undefined,
					is_verified: verifiedValue,
					is_business_account: businessValue,
					lexical_scope: method === 'lexical' ? lexicalScope : undefined
				};
				const response = await searchApi.search(request);
				resetPagination(response.results, response.query, response.method);
			} else if (activeTab === 'similar') {
				const request: SimilarSearchRequest = {
					account: similarAccount.trim(),
					limit,
					min_followers: parseNumber(minFollowers),
					max_followers: parseNumber(maxFollowers),
					min_engagement: parseRate(minEngagement),
					max_engagement: parseRate(maxEngagement),
					location: locationFilter.trim() || undefined,
					category: categoryFilter.trim() || undefined
				};
				const response = await searchApi.searchSimilar(request);
				resetPagination(response.results, request.account, 'similar');
			} else if (activeTab === 'category') {
				const request: CategorySearchRequest = {
					category: categoryName.trim(),
					limit,
					location: locationFilter.trim() || undefined,
					min_followers: parseNumber(minFollowers),
					max_followers: parseNumber(maxFollowers),
					min_engagement: parseRate(minEngagement),
					max_engagement: parseRate(maxEngagement)
				};
				const response = await searchApi.searchByCategory(request);
				resetPagination(response.results, request.category, 'category');
			} else if (activeTab === 'profile') {
				const creator = await searchApi.getCreatorByUsername(profileUsername);
				resetPagination([creator], creator.account || creator.profile_name, 'profile');
			}
		} catch (err) {
			loading = false;
			if (err instanceof Error) {
				error = err.message;
			} else {
				error = 'Search failed. Please try again.';
			}
		}
	}

	function formatNumber(num: number): string {
		return new Intl.NumberFormat().format(num);
	}

	function booleanLabel(value: 'any' | 'yes' | 'no'): string {
		if (value === 'any') return 'Any';
		return value === 'yes' ? 'Yes' : 'No';
	}

	async function evaluateTopResults() {
		evaluationError = '';
		if (!results.length) {
			evaluationError = 'Run a search before requesting an evaluation.';
			return;
		}
		if (runLLM && !businessBrief.trim()) {
			evaluationError = 'Provide a business brief to run the LLM evaluation.';
			return;
		}

		const profilesToEvaluate = results.slice();
		evaluationStatus = '';
		brightdataStatus = '';
		fitProgress = { completed: 0, total: profilesToEvaluate.length, account: null };

		if (runLLM || runBrightData) {
			evaluationLoading = true;
			try {
				await runStreamingEvaluation(profilesToEvaluate);
			} catch (err) {
				if (err instanceof Error) {
					evaluationError = err.message;
				} else {
					evaluationError = 'Evaluation failed. Please retry in a moment.';
				}
			} finally {
				evaluationLoading = false;
			}
			return;
		}

		evaluationLoading = true;
		try {
			const request: EvaluationRequest = {
				profiles: profilesToEvaluate,
				run_brightdata: runBrightData,
				run_llm: runLLM,
				business_fit_query: businessBrief.trim() || undefined,
				max_profiles: profilesToEvaluate.length || undefined
			};
			const response = await searchApi.evaluateProfiles(request);
			mergeEvaluationResults(response.results);
			evaluationStatus = 'Evaluation complete.';
		} catch (err) {
			if (err instanceof Error) {
				evaluationError = err.message;
			} else {
				evaluationError = 'Evaluation failed. Please retry in a moment.';
			}
		} finally {
			evaluationLoading = false;
		}
	}

	function clearFilters() {
		minFollowers = null;
		maxFollowers = null;
		minEngagement = null;
		maxEngagement = null;
		locationFilter = '';
		categoryFilter = '';
		isVerified = 'any';
		isBusinessAccount = 'any';
	}
</script>

<svelte:head>
	<title>DIME Creator Search</title>
	<meta name="description" content="Search and evaluate creators with DIME" />
</svelte:head>

<div class="min-h-screen bg-gray-50 flex">
	<aside class="w-80 bg-white shadow-lg overflow-y-auto flex-shrink-0">
		<div class="p-6 space-y-6">
			<header>
				<h1 class="text-2xl font-bold text-gray-900">DIME Creator Search</h1>
				<p class="text-sm text-gray-600">Discover the right creators across modes.</p>
				{#if !apiHealthy}
					<div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
						API health check did not respond. Searches may be limited.
					</div>
				{/if}
			</header>

			<nav class="border-b border-gray-200 pb-2 flex space-x-3 text-xs font-medium">
				<button
					type="button"
					class={`pb-2 ${activeTab === 'search' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'} `}
					on:click={() => (activeTab = 'search')}
				>
					Search
				</button>
				<button
					type="button"
					class={`pb-2 ${activeTab === 'similar' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'} `}
					on:click={() => (activeTab = 'similar')}
				>
					Similar
				</button>
				<button
					type="button"
					class={`pb-2 ${activeTab === 'category' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'} `}
					on:click={() => (activeTab = 'category')}
				>
					Category
				</button>
				<button
					type="button"
					class={`pb-2 ${activeTab === 'profile' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'} `}
					on:click={() => (activeTab = 'profile')}
				>
					Profile
				</button>
			</nav>

			{#if activeTab === 'search'}
				<div class="space-y-4">
					<label class="block text-xs font-semibold text-gray-700" for="search-query">Search Query</label>
					<textarea
						id="search-query"
						class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						rows="3"
						bind:value={query}
						placeholder="e.g. fitness influencer in San Francisco"
					></textarea>

					<SearchModeSelector bind:method />

				{#if method === 'lexical'}
					<div class="space-y-2">
						<span class="text-xs font-medium text-gray-700">Lexical Scope</span>
						<div class="flex gap-2">
							<button
								type="button"
								class={`px-2 py-1 text-xs rounded border ${lexicalScope === 'bio' ? 'bg-blue-600 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300'}`}
								on:click={() => lexicalScope = 'bio'}
							>Bio only</button>
							<button
								type="button"
								class={`px-2 py-1 text-xs rounded border ${lexicalScope === 'bio_posts' ? 'bg-blue-600 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300'}`}
								on:click={() => lexicalScope = 'bio_posts'}
							>Bio + Posts</button>
						</div>
					</div>
				{/if}
				</div>
			{:else if activeTab === 'similar'}
				<div class="space-y-3">
					<label class="block text-xs font-semibold text-gray-700" for="similar-username">Reference Username</label>
					<input
						id="similar-username"
						type="text"
						class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						bind:value={similarAccount}
						placeholder="@creator"
					/>
					<p class="text-[11px] text-gray-500">Find accounts similar to the reference profile.</p>
				</div>
			{:else if activeTab === 'category'}
				<div class="space-y-3">
					<label class="block text-xs font-semibold text-gray-700" for="category-input">Category</label>
					<input
						id="category-input"
						type="text"
						class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						bind:value={categoryName}
						placeholder="Beauty, Tech, Travel..."
					/>
					<p class="text-[11px] text-gray-500">We will expand with relevant keywords automatically.</p>
				</div>
			{:else}
				<div class="space-y-3">
					<label class="block text-xs font-semibold text-gray-700" for="profile-username">Username</label>
					<input
						id="profile-username"
						type="text"
						class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						bind:value={profileUsername}
						placeholder="@creator"
					/>
				</div>
			{/if}

			<section class="space-y-3">
				<header class="flex items-center justify-between">
					<h2 class="text-xs font-semibold text-gray-700 uppercase tracking-wide">Filters</h2>
					<button class="text-[11px] text-blue-600" type="button" on:click={clearFilters}>Clear</button>
				</header>

				<div class="space-y-2">
					<label class="text-[11px] font-medium text-gray-600" for="result-limit">Result Limit</label>
					<input
						id="result-limit"
						type="number"
						class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						bind:value={limit}
						min={1}
						max={500}
					/>
				</div>

				<div class="grid grid-cols-2 gap-3 text-sm">
					<div>
						<label class="text-[11px] text-gray-600" for="min-followers">Min Followers</label>
						<input id="min-followers" type="number" bind:value={minFollowers} min={0} class="w-full border border-gray-300 rounded px-2 py-1" />
					</div>
					<div>
						<label class="text-[11px] text-gray-600" for="max-followers">Max Followers</label>
						<input id="max-followers" type="number" bind:value={maxFollowers} min={0} class="w-full border border-gray-300 rounded px-2 py-1" />
					</div>
					<div>
						<label class="text-[11px] text-gray-600" for="min-engagement">Min Engagement %</label>
						<input id="min-engagement" type="number" step="0.1" bind:value={minEngagement} min={0} class="w-full border border-gray-300 rounded px-2 py-1" />
					</div>
					<div>
						<label class="text-[11px] text-gray-600" for="max-engagement">Max Engagement %</label>
						<input id="max-engagement" type="number" step="0.1" bind:value={maxEngagement} min={0} class="w-full border border-gray-300 rounded px-2 py-1" />
					</div>
				</div>

				<div class="space-y-2 text-sm">
					<label class="text-[11px] text-gray-600" for="location-filter">Location</label>
					<input id="location-filter" type="text" bind:value={locationFilter} class="w-full border border-gray-300 rounded px-2 py-1" placeholder="City, Country" />
				</div>

				<div class="space-y-2 text-sm">
					<label class="text-[11px] text-gray-600" for="category-filter">Category (Filter)</label>
					<input id="category-filter" type="text" bind:value={categoryFilter} class="w-full border border-gray-300 rounded px-2 py-1" placeholder="beauty, tech..." />
				</div>

				<div class="space-y-2 text-sm">
					<label class="text-[11px] text-gray-600" for="verified-filter">Verified</label>
					<select id="verified-filter" bind:value={isVerified} class="w-full border border-gray-300 rounded px-2 py-1">
						<option value="any">Any</option>
						<option value="yes">Yes</option>
						<option value="no">No</option>
					</select>
				</div>

				<div class="space-y-2 text-sm">
					<label class="text-[11px] text-gray-600" for="business-filter">Business Account</label>
					<select id="business-filter" bind:value={isBusinessAccount} class="w-full border border-gray-300 rounded px-2 py-1">
						<option value="any">Any</option>
						<option value="yes">Yes</option>
						<option value="no">No</option>
					</select>
				</div>
			</section>

			<button
				type="button"
				on:click={handleSearch}
				class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-medium"
			>
				{loading ? 'Searching...' : 'Run Search'}
			</button>
		</div>
	</aside>

	<main class="flex-1 flex flex-col">
		<section class="px-6 py-4 border-b border-gray-200 bg-white">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 class="text-lg font-semibold text-gray-900">Results</h2>
					<p class="text-sm text-gray-500">
						{#if loading}
							Searching...
						{:else if error}
							{error}
						{:else if results.length}
							{searchCount} profiles for “{lastQuery}” — {method.toUpperCase()} mode
						{:else}
							Run a search to see profiles.
						{/if}
					</p>
				</div>

				<div class="flex items-center gap-3">
					<button
						type="button"
						on:click={exportResultsToCSV}
						class={`px-3 py-2 rounded text-sm font-medium ${results.length ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
						disabled={!results.length}
					>
						Export CSV
					</button>
					<div class="flex items-center gap-3 text-xs text-gray-600">
					<div>
						<span class="font-semibold">Followers:</span>
						<span>{formatNumber(parseNumber(minFollowers) ?? 0)} - {maxFollowers ? formatNumber(maxFollowers) : '∞'}</span>
					</div>
					<div>
						<span class="font-semibold">Engagement:</span>
						<span>{minEngagement ?? 0}% - {maxEngagement ?? '∞'}%</span>
					</div>
					<div>
						<span class="font-semibold">Verified:</span> {booleanLabel(isVerified)}
					</div>
					</div>
				</div>
			</div>

			{#if results.length}
				<div class="mt-4 bg-blue-50 border border-blue-100 rounded p-4 text-sm text-blue-900 space-y-2">
					<p class="font-medium">Next step: refresh and score the top matches</p>
					<div class="flex flex-wrap gap-4 items-center text-xs">
						<label class="flex items-center gap-2">
							<input type="checkbox" bind:checked={runBrightData} />
							<span>Refresh via BrightData</span>
						</label>
						<label class="flex items-center gap-2">
							<input type="checkbox" bind:checked={runLLM} />
							<span>Run LLM scoring (needs brief)</span>
						</label>
					</div>

					<textarea
						rows="3"
						bind:value={businessBrief}
						placeholder="Business brief for the LLM (optional unless scoring enabled)"
						class="w-full border border-blue-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					></textarea>

					{#if runBrightData || runLLM}
						<div class="mt-3 bg-white border border-blue-200 rounded p-3 text-xs text-blue-900 space-y-2 shadow-sm">
							<div class="flex items-center justify-between">
								<span class="font-semibold uppercase tracking-wide text-[10px] text-blue-600">Status</span>
								<span>{evaluationStatus || (evaluationLoading ? 'Starting…' : 'Idle')}</span>
							</div>
							{#if runBrightData}
								<div class="flex items-center justify-between">
									<span>BrightData</span>
									<span>{brightdataStatus || (evaluationLoading ? 'Pending…' : 'Skipped')}</span>
								</div>
							{/if}
							{#if runLLM}
								<div class="space-y-1">
									<div class="flex items-center justify-between">
										<span>LLM scoring</span>
										<span>{fitProgress.completed}/{fitProgress.total}</span>
									</div>
									<div class="h-1.5 bg-blue-100 rounded-full overflow-hidden">
										<div
											class="h-1.5 bg-blue-500 transition-all duration-200"
											style={`width: ${fitProgress.total ? Math.min(100, Math.round((fitProgress.completed / fitProgress.total) * 100)) : 0}%`}
										></div>
									</div>
									{#if fitProgress.account}
										<p class="text-[10px] text-blue-700">Last scored: {fitProgress.account}</p>
									{/if}
								</div>
							{/if}
						</div>
					{/if}

					<div class="flex items-center justify-between">
						<p class="text-[11px] text-blue-700">
							Evaluating all {results.length} profile{results.length === 1 ? '' : 's'} from this search.
						</p>
						<button
							type="button"
							on:click={evaluateTopResults}
							class={`px-3 py-2 rounded text-sm font-medium ${evaluationLoading ? 'bg-blue-300 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
							disabled={evaluationLoading}
						>
							{evaluationLoading ? 'Evaluating…' : 'Evaluate Top Results'}
						</button>
					</div>
					{#if evaluationError}
						<p class="text-xs text-red-600">{evaluationError}</p>
					{/if}
				</div>
			{/if}
		</section>

		<section class="flex-1 overflow-y-auto px-6 py-6 space-y-4">
			{#if loading}
				<div class="text-sm text-gray-600">Fetching profiles…</div>
			{:else if error && !results.length}
				<div class="text-sm text-red-600">{error}</div>
			{:else if !results.length}
				<div class="text-sm text-gray-500">No results yet. Try a new search.</div>
		{:else}
			<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{#each paginatedResults as creator, index (creator.lance_db_id || creator.account || index)}
					<CreatorCard {creator} />
				{/each}
			</div>
		{/if}
	</section>

		{#if results.length > pageSize}
			<footer class="px-6 py-4 bg-white border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-sm">
				<div>
					Showing {pageStart}-{pageEnd} of {results.length}
				</div>
				<div class="flex items-center gap-2">
					<button
						type="button"
						on:click={() => (currentPage = Math.max(1, currentPage - 1))}
						class="px-3 py-1 border border-gray-300 rounded"
						disabled={currentPage === 1}
					>
						Prev
					</button>
					<span>Page {currentPage} / {totalPages}</span>
					<button
						type="button"
						on:click={() => (currentPage = Math.min(totalPages, currentPage + 1))}
						class="px-3 py-1 border border-gray-300 rounded"
						disabled={currentPage === totalPages}
					>
						Next
					</button>
				</div>
				<div class="flex items-center gap-2">
					<label class="text-xs text-gray-600" for="page-size">Per page</label>
					<select id="page-size" bind:value={pageSize} class="border border-gray-300 rounded px-2 py-1 text-sm">
						<option value={20}>20</option>
						<option value={50}>50</option>
						<option value={100}>100</option>
					</select>
				</div>
			</footer>
		{/if}
	</main>
</div>
