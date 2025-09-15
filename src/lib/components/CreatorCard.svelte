<script lang="ts">
	import type { Creator } from '../api.js';

	export let creator: Creator;
	let showDetails = false;

	function getScoreColor(score: number): string {
		// Convert 0-10 scale to 0-1 scale for color calculation
		const normalizedScore = score / 10;
		if (normalizedScore >= 0.8) return 'bg-green-500';
		if (normalizedScore >= 0.6) return 'bg-yellow-500';
		if (normalizedScore >= 0.4) return 'bg-orange-500';
		return 'bg-red-500';
	}

	function getScoreLabel(score: number): string {
		// Convert 0-10 scale to 0-1 scale for label calculation
		const normalizedScore = score / 10;
		if (normalizedScore >= 0.8) return 'Excellent';
		if (normalizedScore >= 0.6) return 'Good';
		if (normalizedScore >= 0.4) return 'Fair';
		return 'Poor';
	}

	// Calculate average score from the 4 available LLM scores
	function getOverallScore(creator: Creator): number {
		const scores = [
			creator.individual_vs_org_score,
			creator.generational_appeal_score,
			creator.professionalization_score,
			creator.relationship_status_score
		];
		return scores.reduce((sum, score) => sum + score, 0) / scores.length;
	}

	function toggleDetails() {
		showDetails = !showDetails;
	}
</script>

<div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
	<!-- Profile Header -->
	<div class="flex items-start space-x-4 mb-4">
		<img
			src={creator.profile_image_link}
			alt={creator.profile_name}
			class="w-16 h-16 rounded-full object-cover"
			loading="lazy"
		/>
		<div class="flex-1 min-w-0">
			<div class="flex items-center space-x-2">
				<h3 class="text-lg font-semibold text-gray-900 truncate">
					{creator.profile_name}
				</h3>
				<a 
					href="https://instagram.com/{creator.account}" 
					target="_blank" 
					rel="noopener noreferrer"
					class="text-pink-500 hover:text-pink-600 transition-colors"
					title="View Instagram Profile"
				>
					<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
						<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
					</svg>
				</a>
			</div>
			<p class="text-sm text-gray-600">@{creator.account}</p>
			<div class="flex items-center space-x-4 mt-2">
				<span class="text-sm font-medium text-blue-600">
					{creator.followers_formatted} followers
				</span>
				<span class="text-sm text-gray-500">
					{creator.avg_engagement.toFixed(1)}% engagement
				</span>
			</div>
		</div>
	</div>

	<!-- Biography -->
	<div class="mb-4">
		<p class="text-sm text-gray-700 line-clamp-3">
			{creator.biography}
		</p>
	</div>

	<!-- Post Images -->
	{#if creator.posts && creator.posts.length > 0}
		<div class="mb-4">
			<h4 class="text-sm font-medium text-gray-700 mb-2">Recent Posts</h4>
			<div class="grid grid-cols-4 gap-2">
				{#each creator.posts.slice(0, 4) as post}
					{#if post.image_url}
						<div class="aspect-square rounded-md overflow-hidden bg-gray-100">
							<img
								src={post.image_url}
								alt="Post by {creator.account}"
								class="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
								loading="lazy"
							/>
						</div>
					{:else}
						<div class="aspect-square rounded-md bg-gray-100 flex items-center justify-center">
							<svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
							</svg>
						</div>
					{/if}
				{/each}
				
				<!-- Fill empty slots if less than 4 posts -->
				{#each Array(Math.max(0, 4 - creator.posts.length)) as _}
					<div class="aspect-square rounded-md bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center">
						<svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<div class="mb-4">
			<h4 class="text-sm font-medium text-gray-700 mb-2">Recent Posts</h4>
			<div class="grid grid-cols-4 gap-2">
				{#each Array(4) as _}
					<div class="aspect-square rounded-md bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center">
						<svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
						</svg>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Category and Type -->
	<div class="flex items-center justify-between mb-4">
		{#if creator.business_category_name && creator.business_category_name !== 'None'}
			<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
				{creator.business_category_name}
			</span>
		{:else}
			<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
				Uncategorized
			</span>
		{/if}
		<span class="text-xs text-gray-500">
			{creator.is_personal_creator ? 'Personal' : 'Business'}
		</span>
	</div>

	<!-- Scores -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<span class="text-sm font-medium text-gray-700">Overall Score</span>
			<div class="flex items-center space-x-2">
				<div class="w-20 bg-gray-200 rounded-full h-2">
					<div 
						class="h-2 rounded-full {getScoreColor(getOverallScore(creator))}" 
						style="width: {getOverallScore(creator) * 10}%"
					></div>
				</div>
				<span class="text-sm text-gray-600">{getOverallScore(creator).toFixed(1)}/10</span>
			</div>
		</div>

		<!-- Quick Scores -->
		<div class="grid grid-cols-2 gap-2 text-xs">
			<div class="flex justify-between">
				<span class="text-gray-600">Individual vs Org:</span>
				<span class="font-medium">{creator.individual_vs_org_score}/10</span>
			</div>
			<div class="flex justify-between">
				<span class="text-gray-600">Generational Appeal:</span>
				<span class="font-medium">{creator.generational_appeal_score}/10</span>
			</div>
			<div class="flex justify-between">
				<span class="text-gray-600">Professionalization:</span>
				<span class="font-medium">{creator.professionalization_score}/10</span>
			</div>
			<div class="flex justify-between">
				<span class="text-gray-600">Relationship Status:</span>
				<span class="font-medium">{creator.relationship_status_score}/10</span>
			</div>
		</div>

		<!-- More Details Toggle -->
		<div class="pt-2 border-t border-gray-100">
			<button 
				onclick={toggleDetails}
				class="flex items-center justify-between w-full text-sm text-blue-600 hover:text-blue-700 transition-colors"
			>
				<span class="font-medium">More Details</span>
				<svg 
					class="w-4 h-4 transform transition-transform {showDetails ? 'rotate-180' : ''}" 
					fill="none" 
					stroke="currentColor" 
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
		</div>

		<!-- Detailed Information -->
		{#if showDetails}
			<div class="mt-3 p-3 bg-gray-50 rounded-lg space-y-3 text-xs">
				<!-- Creator Information -->
				<div>
					<h5 class="font-semibold text-gray-800 mb-2">Creator Information</h5>
					<div class="grid grid-cols-2 gap-2">
						<div class="flex justify-between">
							<span class="text-gray-600">Creator ID:</span>
							<span class="font-mono">{creator.id}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">Type:</span>
							<span class="font-medium">{creator.is_personal_creator ? 'Personal' : 'Business'}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">Exact Followers:</span>
							<span class="font-mono">{creator.followers.toLocaleString()}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">Engagement Rate:</span>
							<span class="font-mono">{creator.avg_engagement.toFixed(2)}%</span>
						</div>
					</div>
				</div>

				<!-- All LLM Scores -->
				<div>
					<h5 class="font-semibold text-gray-800 mb-2">LLM Scores & Analytics</h5>
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-gray-600">Overall Score:</span>
							<div class="flex items-center space-x-2">
								<div class="w-16 bg-gray-200 rounded-full h-1.5">
									<div class="h-1.5 rounded-full {getScoreColor(getOverallScore(creator))}" style="width: {getOverallScore(creator) * 10}%"></div>
								</div>
								<span class="font-mono w-10 text-right">{getOverallScore(creator).toFixed(1)}/10</span>
							</div>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-gray-600">Individual vs Org Score:</span>
							<div class="flex items-center space-x-2">
								<div class="w-16 bg-gray-200 rounded-full h-1.5">
									<div class="h-1.5 rounded-full {getScoreColor(creator.individual_vs_org_score)}" style="width: {creator.individual_vs_org_score * 10}%"></div>
								</div>
								<span class="font-mono w-10 text-right">{creator.individual_vs_org_score}/10</span>
							</div>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-gray-600">Generational Appeal Score:</span>
							<div class="flex items-center space-x-2">
								<div class="w-16 bg-gray-200 rounded-full h-1.5">
									<div class="h-1.5 rounded-full {getScoreColor(creator.generational_appeal_score)}" style="width: {creator.generational_appeal_score * 10}%"></div>
								</div>
								<span class="font-mono w-10 text-right">{creator.generational_appeal_score}/10</span>
							</div>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-gray-600">Professionalization Score:</span>
							<div class="flex items-center space-x-2">
								<div class="w-16 bg-gray-200 rounded-full h-1.5">
									<div class="h-1.5 rounded-full {getScoreColor(creator.professionalization_score)}" style="width: {creator.professionalization_score * 10}%"></div>
								</div>
								<span class="font-mono w-10 text-right">{creator.professionalization_score}/10</span>
							</div>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-gray-600">Relationship Status Score:</span>
							<div class="flex items-center space-x-2">
								<div class="w-16 bg-gray-200 rounded-full h-1.5">
									<div class="h-1.5 rounded-full {getScoreColor(creator.relationship_status_score)}" style="width: {creator.relationship_status_score * 10}%"></div>
								</div>
								<span class="font-mono w-10 text-right">{creator.relationship_status_score}/10</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Vector Search Scores -->
				<div>
					<h5 class="font-semibold text-gray-800 mb-2">Text-Based Search Scores</h5>
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-gray-600">Combined Score:</span>
							<div class="flex items-center space-x-2">
								<div class="w-16 bg-gray-200 rounded-full h-1.5">
									<div class="h-1.5 rounded-full bg-blue-500" style="width: {creator.combined_score * 100}%"></div>
								</div>
								<span class="font-mono w-12 text-right">{creator.combined_score.toFixed(3)}</span>
							</div>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-gray-600">Keyword Score:</span>
							<div class="flex items-center space-x-2">
								<div class="w-16 bg-gray-200 rounded-full h-1.5">
									<div class="h-1.5 rounded-full bg-green-500" style="width: {creator.keyword_score * 100}%"></div>
								</div>
								<span class="font-mono w-12 text-right">{creator.keyword_score.toFixed(3)}</span>
							</div>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-gray-600">Profile Score:</span>
							<div class="flex items-center space-x-2">
								<div class="w-16 bg-gray-200 rounded-full h-1.5">
									<div class="h-1.5 rounded-full bg-purple-500" style="width: {creator.profile_score * 100}%"></div>
								</div>
								<span class="font-mono w-12 text-right">{creator.profile_score.toFixed(3)}</span>
							</div>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-gray-600">Content Score:</span>
							<div class="flex items-center space-x-2">
								<div class="w-16 bg-gray-200 rounded-full h-1.5">
									<div class="h-1.5 rounded-full bg-orange-500" style="width: {creator.content_score * 100}%"></div>
								</div>
								<span class="font-mono w-12 text-right">{creator.content_score.toFixed(3)}</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Vector Similarity Scores (New) -->
				{#if creator.vector_similarity_score > 0 || creator.keyword_similarity > 0 || creator.profile_similarity > 0 || creator.content_similarity > 0}
				<div>
					<h5 class="font-semibold text-gray-800 mb-2">Vector Similarity Scores</h5>
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-gray-600">Overall Similarity:</span>
							<div class="flex items-center space-x-2">
								<div class="w-16 bg-gray-200 rounded-full h-1.5">
									<div class="h-1.5 rounded-full bg-indigo-500" style="width: {creator.vector_similarity_score * 100}%"></div>
								</div>
								<span class="font-mono w-12 text-right">{creator.vector_similarity_score.toFixed(3)}</span>
							</div>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-gray-600">Keyword Similarity:</span>
							<div class="flex items-center space-x-2">
								<div class="w-16 bg-gray-200 rounded-full h-1.5">
									<div class="h-1.5 rounded-full bg-emerald-500" style="width: {creator.keyword_similarity * 100}%"></div>
								</div>
								<span class="font-mono w-12 text-right">{creator.keyword_similarity.toFixed(3)}</span>
							</div>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-gray-600">Profile Similarity:</span>
							<div class="flex items-center space-x-2">
								<div class="w-16 bg-gray-200 rounded-full h-1.5">
									<div class="h-1.5 rounded-full bg-violet-500" style="width: {creator.profile_similarity * 100}%"></div>
								</div>
								<span class="font-mono w-12 text-right">{creator.profile_similarity.toFixed(3)}</span>
							</div>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-gray-600">Content Similarity:</span>
							<div class="flex items-center space-x-2">
								<div class="w-16 bg-gray-200 rounded-full h-1.5">
									<div class="h-1.5 rounded-full bg-amber-500" style="width: {creator.content_similarity * 100}%"></div>
								</div>
								<span class="font-mono w-12 text-right">{creator.content_similarity.toFixed(3)}</span>
							</div>
						</div>
						
						{#if creator.similarity_explanation}
						<div class="mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
							<h6 class="text-xs font-semibold text-blue-800 mb-1">Why Similar?</h6>
							<p class="text-xs text-blue-700">{creator.similarity_explanation}</p>
						</div>
						{/if}
					</div>
				</div>
				{/if}

				<!-- Additional Details -->
				{#if creator.business_address && creator.business_address !== 'None'}
					<div>
						<h5 class="font-semibold text-gray-800 mb-1">Location</h5>
						<p class="text-gray-600">{creator.business_address}</p>
					</div>
				{/if}

				{#if creator.posts && creator.posts.length > 0}
					<div>
						<h5 class="font-semibold text-gray-800 mb-1">Post Data</h5>
						<p class="text-gray-600">{creator.posts.length} posts analyzed</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Action Button -->
	<div class="mt-4 pt-4 border-t border-gray-200">
		<button class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors">
			View Profile
		</button>
	</div>
</div>

<style>
	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>