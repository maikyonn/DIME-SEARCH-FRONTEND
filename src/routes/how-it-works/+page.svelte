<script lang="ts">
	// Technical documentation for the DIME Search System
</script>

<svelte:head>
	<title>How DIME Search Works - Technical Documentation</title>
	<meta name="description" content="Complete technical guide to DIME's AI-powered creator search system" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-4xl mx-auto py-8 px-4">
		<!-- Header -->
		<div class="mb-8">
			<nav class="mb-4">
				<a href="/" class="text-blue-600 hover:text-blue-500 text-sm font-medium">
					← Back to Search
				</a>
			</nav>
			<h1 class="text-3xl font-bold text-gray-900 mb-2">How DIME Search Works</h1>
			<p class="text-gray-600">Complete technical guide to our AI-powered creator discovery system</p>
		</div>

		<div class="bg-white rounded-lg shadow-sm p-8 space-y-8">
			<!-- Overview -->
			<section>
				<h2 class="text-2xl font-bold text-gray-900 mb-4">🔍 System Overview</h2>
				<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
					<p class="text-blue-800">
						DIME uses a sophisticated <strong>multi-vector AI search system</strong> that analyzes creators across three dimensions: 
						<strong>Keywords</strong>, <strong>Profile Information</strong>, and <strong>Content Analysis</strong>. 
						By combining these vectors with weighted scoring, we deliver highly relevant creator matches for any campaign or business need.
					</p>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div class="bg-red-50 border border-red-200 rounded-lg p-4">
						<h3 class="font-semibold text-red-800 mb-2">🏷️ Keyword Vector</h3>
						<p class="text-sm text-red-700">Analyzes hashtags, niche terms, and topical keywords from creator profiles</p>
					</div>
					<div class="bg-green-50 border border-green-200 rounded-lg p-4">
						<h3 class="font-semibold text-green-800 mb-2">👤 Profile Vector</h3>
						<p class="text-sm text-green-700">Processes biography, account info, and professional categorization</p>
					</div>
					<div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
						<h3 class="font-semibold text-purple-800 mb-2">📱 Content Vector</h3>
						<p class="text-sm text-purple-700">Analyzes post content, themes, and engagement patterns</p>
					</div>
				</div>
			</section>

			<!-- The Search Process -->
			<section>
				<h2 class="text-2xl font-bold text-gray-900 mb-4">⚙️ The Search Process (Step by Step)</h2>
				
				<div class="space-y-6">
					<!-- Step 1 -->
					<div class="border-l-4 border-blue-500 pl-4">
						<div class="flex items-center mb-2">
							<span class="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">1</span>
							<h3 class="text-lg font-semibold text-gray-900">Query Processing & Enhancement</h3>
						</div>
						<div class="bg-gray-50 rounded p-4 text-sm">
							<strong>Input:</strong> Your search query (e.g., "fitness influencer workout content")<br>
							<strong>Processing:</strong>
							<ul class="list-disc ml-6 mt-2 space-y-1">
								<li>Query parsing and keyword extraction</li>
								<li>Enhancement with category keywords if specified</li>
								<li>Addition of relevance keywords from advanced filters</li>
							</ul>
							<strong>Output:</strong> Enhanced query string with contextual keywords
						</div>
					</div>

					<!-- Step 2 -->
					<div class="border-l-4 border-green-500 pl-4">
						<div class="flex items-center mb-2">
							<span class="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">2</span>
							<h3 class="text-lg font-semibold text-gray-900">AI Model Encoding</h3>
						</div>
						<div class="bg-gray-50 rounded p-4 text-sm">
							<strong>Model:</strong> sentence-transformers/all-mpnet-base-v2 (384-dimensional vectors)<br>
							<strong>Process:</strong> Your query is converted into a numerical vector that captures semantic meaning<br>
							<strong>Result:</strong> Query vector [0.123, -0.456, 0.789, ...] (384 numbers representing meaning)
						</div>
					</div>

					<!-- Step 3 -->
					<div class="border-l-4 border-purple-500 pl-4">
						<div class="flex items-center mb-2">
							<span class="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">3</span>
							<h3 class="text-lg font-semibold text-gray-900">Multi-Vector Database Search</h3>
						</div>
						<div class="bg-gray-50 rounded p-4 text-sm">
							<strong>Database:</strong> LanceDB with 97,885+ creator profiles<br>
							<strong>Three Simultaneous Searches:</strong>
							<ul class="list-disc ml-6 mt-2 space-y-1">
								<li><strong>Keyword Vector:</strong> Matches against creator hashtags and niche terms</li>
								<li><strong>Profile Vector:</strong> Matches against biography and profile information</li>
								<li><strong>Content Vector:</strong> Matches against post themes and content analysis</li>
							</ul>
							<strong>Each search returns:</strong> Top results with distance scores (lower = more similar)
						</div>
					</div>

					<!-- Step 4 -->
					<div class="border-l-4 border-yellow-500 pl-4">
						<div class="flex items-center mb-2">
							<span class="bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">4</span>
							<h3 class="text-lg font-semibold text-gray-900">Weighted Score Combination</h3>
						</div>
						<div class="bg-gray-50 rounded p-4 text-sm">
							<strong>Score Conversion:</strong> Distance → Similarity using formula: <code>1 / (1 + distance)</code><br>
							<strong>Default Weights:</strong>
							<ul class="list-disc ml-6 mt-2 space-y-1">
								<li><strong>Hybrid:</strong> Balanced weights (keyword: 0.33, profile: 0.33, content: 0.34)</li>
								<li><strong>Vector:</strong> Custom weights from your sliders (fully customizable)</li>
							</ul>
							<strong>Formula:</strong> <code>combined_score = (keyword_weight × keyword_score) + (profile_weight × profile_score) + (content_weight × content_score)</code>
						</div>
					</div>

					<!-- Step 5 -->
					<div class="border-l-4 border-red-500 pl-4">
						<div class="flex items-center mb-2">
							<span class="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">5</span>
							<h3 class="text-lg font-semibold text-gray-900">Advanced Filtering</h3>
						</div>
						<div class="bg-gray-50 rounded p-4 text-sm">
							<strong>Applied After Scoring:</strong>
							<ul class="list-disc ml-6 mt-2 space-y-1">
								<li><strong>Follower Range:</strong> 1,000 - 100,000 (default: 1K - 100K)</li>
								<li><strong>Engagement Rate:</strong> Minimum 0.0% (customizable)</li>
								<li><strong>Location:</strong> Geographic filtering if specified</li>
							</ul>
							<strong>Why After:</strong> Ensures we find the best semantic matches first, then apply constraints
						</div>
					</div>

					<!-- Step 6 -->
					<div class="border-l-4 border-indigo-500 pl-4">
						<div class="flex items-center mb-2">
							<span class="bg-indigo-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">6</span>
							<h3 class="text-lg font-semibold text-gray-900">Results Ranking & Delivery</h3>
						</div>
						<div class="bg-gray-50 rounded p-4 text-sm">
							<strong>Final Steps:</strong>
							<ul class="list-disc ml-6 mt-2 space-y-1">
								<li>Sort by combined_score (highest first)</li>
								<li>Limit to requested number of results (10-500)</li>
								<li>Clean up data (remove vector arrays for performance)</li>
								<li>Return with individual scores for transparency</li>
							</ul>
							<strong>You See:</strong> Ranked creators with keyword_score, profile_score, content_score, and combined_score
						</div>
					</div>
				</div>
			</section>


			<!-- Search Methods -->
			<section>
				<h2 class="text-2xl font-bold text-gray-900 mb-4">🔧 Search Methods Explained</h2>
				
				<div class="space-y-4">
					<div class="border border-blue-200 rounded-lg p-4">
						<div class="flex items-center mb-2">
							<span class="bg-blue-500 text-white px-2 py-1 rounded text-sm font-medium mr-3">HYBRID</span>
							<h3 class="text-lg font-semibold text-gray-900">Hybrid Search (Default)</h3>
						</div>
						<p class="text-gray-600 mb-2">Combines AI vector search with balanced weight distribution</p>
						<ul class="list-disc ml-6 text-sm text-gray-600 space-y-1">
							<li>Uses balanced weights across all three vectors (33% each)</li>
							<li>Best for most use cases and natural language queries</li>
							<li>Balances semantic understanding with keyword matching</li>
							<li>Allows custom weight override via sliders</li>
						</ul>
					</div>

					<div class="border border-green-200 rounded-lg p-4">
						<div class="flex items-center mb-2">
							<span class="bg-green-500 text-white px-2 py-1 rounded text-sm font-medium mr-3">VECTOR</span>
							<h3 class="text-lg font-semibold text-gray-900">Pure Vector Search</h3>
						</div>
						<p class="text-gray-600 mb-2">Uses only semantic vector matching with manual weight control</p>
						<ul class="list-disc ml-6 text-sm text-gray-600 space-y-1">
							<li>Full control via weight sliders (keyword/profile/content)</li>
							<li>Manual weight adjustment for fine-tuning</li>
							<li>Best for precise control and experimentation</li>
							<li>Requires understanding of what each vector type captures</li>
						</ul>
					</div>

					<div class="border border-gray-200 rounded-lg p-4">
						<div class="flex items-center mb-2">
							<span class="bg-gray-500 text-white px-2 py-1 rounded text-sm font-medium mr-3">TEXT</span>
							<h3 class="text-lg font-semibold text-gray-900">Text Search</h3>
						</div>
						<p class="text-gray-600 mb-2">Traditional keyword-based text matching (legacy)</p>
						<ul class="list-disc ml-6 text-sm text-gray-600 space-y-1">
							<li>Simple keyword matching without AI understanding</li>
							<li>Faster but less intelligent than vector methods</li>
							<li>Limited to exact word matches</li>
							<li>Rarely recommended for modern use cases</li>
						</ul>
					</div>
				</div>
			</section>

			<!-- Scoring System -->
			<section>
				<h2 class="text-2xl font-bold text-gray-900 mb-4">📊 Understanding the Scores</h2>
				
				<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
					<h3 class="font-semibold text-yellow-800 mb-2">Score Interpretation Guide</h3>
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<p><strong>0.800 - 1.000:</strong> <span class="text-green-600">Excellent Match</span></p>
							<p><strong>0.600 - 0.799:</strong> <span class="text-blue-600">Good Match</span></p>
							<p><strong>0.400 - 0.599:</strong> <span class="text-yellow-600">Moderate Match</span></p>
						</div>
						<div>
							<p><strong>0.200 - 0.399:</strong> <span class="text-orange-600">Weak Match</span></p>
							<p><strong>0.000 - 0.199:</strong> <span class="text-red-600">Poor Match</span></p>
							<p><strong>0.000:</strong> <span class="text-gray-600">Not found in this vector</span></p>
						</div>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<h4 class="font-semibold text-gray-900 mb-2">Vector Scores (Individual)</h4>
						<ul class="space-y-2 text-sm text-gray-600">
							<li><strong>Keyword Score:</strong> How well creator's hashtags/keywords match your query</li>
							<li><strong>Profile Score:</strong> How well creator's bio/profile matches your query</li>
							<li><strong>Content Score:</strong> How well creator's post content matches your query</li>
						</ul>
					</div>
					<div>
						<h4 class="font-semibold text-gray-900 mb-2">LLM Scores (0-10 Scale)</h4>
						<ul class="space-y-2 text-sm text-gray-600">
							<li><strong>Individual vs Org:</strong> Personal creator (0-4) vs Brand account (6-10)</li>
							<li><strong>Generational Appeal:</strong> Gen Z appeal rating</li>
							<li><strong>Professionalization:</strong> Content quality and consistency</li>
							<li><strong>Relationship Status:</strong> Personal relationship visibility</li>
						</ul>
					</div>
				</div>
			</section>

			<!-- Database & Performance -->
			<section>
				<h2 class="text-2xl font-bold text-gray-900 mb-4">💾 Database & Performance</h2>
				
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
						<div class="text-2xl font-bold text-blue-600">97,885+</div>
						<div class="text-sm text-blue-700">Creator Profiles</div>
					</div>
					<div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
						<div class="text-2xl font-bold text-green-600">384D</div>
						<div class="text-sm text-green-700">Vector Dimensions</div>
					</div>
					<div class="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
						<div class="text-2xl font-bold text-purple-600">&lt;200ms</div>
						<div class="text-sm text-purple-700">Average Search Time</div>
					</div>
				</div>

				<div class="mt-4 bg-gray-50 rounded-lg p-4">
					<h4 class="font-semibold text-gray-900 mb-2">Technical Specifications</h4>
					<ul class="text-sm text-gray-600 space-y-1">
						<li><strong>Vector Database:</strong> LanceDB (high-performance vector storage)</li>
						<li><strong>AI Model:</strong> sentence-transformers/all-mpnet-base-v2 (384-dimensional embeddings)</li>
						<li><strong>Search Algorithm:</strong> Approximate nearest neighbor with distance-based similarity</li>
						<li><strong>API Framework:</strong> FastAPI with async processing</li>
						<li><strong>Frontend:</strong> SvelteKit with TypeScript and TailwindCSS</li>
					</ul>
				</div>
			</section>

			<!-- Tips & Best Practices -->
			<section>
				<h2 class="text-2xl font-bold text-gray-900 mb-4">💡 Search Tips & Best Practices</h2>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<h4 class="font-semibold text-green-800 mb-3">✅ Do This</h4>
						<ul class="space-y-2 text-sm text-gray-600">
							<li>• Use descriptive, natural language queries</li>
							<li>• Include context (e.g., "fitness influencer workout content")</li>
							<li>• Try sample query buttons for inspiration</li>
							<li>• Experiment with weight sliders for fine-tuning</li>
							<li>• Use hybrid mode for best automatic optimization</li>
							<li>• Set realistic follower ranges for your needs</li>
						</ul>
					</div>
					<div>
						<h4 class="font-semibold text-red-800 mb-3">❌ Avoid This</h4>
						<ul class="space-y-2 text-sm text-gray-600">
							<li>• Single word queries ("fitness" → "fitness influencer")</li>
							<li>• Too many keywords (dilutes semantic meaning)</li>
							<li>• Extremely narrow follower ranges (may find no results)</li>
							<li>• Ignoring individual vector scores (they explain why someone matched)</li>
							<li>• Using text search unless specifically needed</li>
						</ul>
					</div>
				</div>
			</section>

			<!-- Advanced Features -->
			<section>
				<h2 class="text-2xl font-bold text-gray-900 mb-4">🚀 Advanced Features</h2>
				
				<div class="space-y-4">
					<div class="border border-indigo-200 rounded-lg p-4">
						<h4 class="font-semibold text-indigo-800 mb-2">Similar Creator Search</h4>
						<p class="text-sm text-gray-600 mb-2">Find creators similar to a reference account</p>
						<ul class="text-sm text-gray-600 space-y-1">
							<li>• Enter any username (e.g., "physiqueless")</li>
							<li>• System analyzes their profile characteristics</li>
							<li>• Returns creators with similar audience and content style</li>
						</ul>
					</div>

					<div class="border border-purple-200 rounded-lg p-4">
						<h4 class="font-semibold text-purple-800 mb-2">Category-Based Search</h4>
						<p class="text-sm text-gray-600 mb-2">Discover creators within specific business categories</p>
						<ul class="text-sm text-gray-600 space-y-1">
							<li>• Browse by category (fitness, beauty, fashion, etc.)</li>
							<li>• Optional location filtering</li>
							<li>• Optimized for business category matching</li>
						</ul>
					</div>

					<div class="border border-green-200 rounded-lg p-4">
						<h4 class="font-semibold text-green-800 mb-2">Custom Weight Control</h4>
						<p class="text-sm text-gray-600 mb-2">Fine-tune search emphasis in real-time</p>
						<ul class="text-sm text-gray-600 space-y-1">
							<li>• Keyword Weight: Emphasize hashtags and niche terms</li>
							<li>• Profile Weight: Focus on biography and account info</li>
							<li>• Content Weight: Prioritize post content and themes</li>
						</ul>
					</div>
				</div>
			</section>

			<!-- Footer -->
			<section class="border-t pt-6">
				<div class="text-center">
					<a href="/" class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
						Start Searching →
					</a>
				</div>
			</section>
		</div>
	</div>
</div>