// API types and service for DIME Search API
export interface Creator {
	id: number;
	account: string;
	profile_name: string;
	followers: number;
	followers_formatted: string;
	avg_engagement: number;
	business_category_name: string | null;
	business_address: string | null;
	biography: string;
	profile_image_link: string;
	profile_url: string; // Instagram profile URL
	business_email: string | null;
	email_address: string | null;
	posts: any[];
	is_personal_creator: boolean;
	// Original database LLM score columns
	individual_vs_org_score: number;
	generational_appeal_score: number;
	professionalization_score: number;
	relationship_status_score: number;
	// Language detection fields
	is_english?: boolean;
	detected_language?: string;
	language_confidence?: number;
	// Vector search similarity scores (text-based search)
	keyword_score: number;
	profile_score: number;
	content_score: number;
	combined_score: number;
	// Vector similarity scores (direct vector comparison)
	keyword_similarity: number;
	profile_similarity: number;
	content_similarity: number;
	vector_similarity_score: number;
	similarity_explanation: string;
}

export interface SearchRequest {
	query: string;
	method?: 'vector' | 'text' | 'hybrid';
	limit?: number;
	min_followers?: number;
	max_followers?: number;
	min_engagement?: number;
	category?: string;
	keywords?: string[];
	custom_weights?: {
		keyword: number;
		profile: number;
		content: number;
	};
	// LLM Score Filters
	min_individual_vs_org_score?: number;
	max_individual_vs_org_score?: number;
	min_generational_appeal_score?: number;
	max_generational_appeal_score?: number;
	min_professionalization_score?: number;
	max_professionalization_score?: number;
	min_relationship_status_score?: number;
	max_relationship_status_score?: number;
}

export interface SimilarSearchRequest {
	account: string;
	limit?: number;
	min_followers?: number;
	max_followers?: number;
	min_engagement?: number;
	max_engagement?: number;
	category?: string;
	similarity_threshold?: number;
	use_vector_similarity?: boolean;
	custom_weights?: {
		keyword: number;
		profile: number;
		content: number;
	};
}

export interface CategorySearchRequest {
	category: string;
	limit?: number;
	min_followers?: number;
	max_followers?: number;
	min_engagement?: number;
	max_engagement?: number;
}

export interface SearchResponse {
	success: boolean;
	results: Creator[];
	count: number;
	query: string;
	method: string;
	error?: string;
}

export interface UsernameSearchResponse {
	success: boolean;
	result: Creator;
}

export class ApiError extends Error {
	constructor(message: string, public statusCode?: number) {
		super(message);
		this.name = 'ApiError';
	}
}

const API_BASE_URL = 'http://localhost:8000/api/v1';

async function apiRequest<T>(endpoint: string, data: any): Promise<T> {
	try {
		const response = await fetch(`${API_BASE_URL}${endpoint}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		});

		if (!response.ok) {
			throw new ApiError(`API request failed: ${response.statusText}`, response.status);
		}

		const result = await response.json();
		
		if (!result.success) {
			throw new ApiError(result.error || 'Unknown API error');
		}

		return result;
	} catch (error) {
		if (error instanceof ApiError) {
			throw error;
		}
		throw new ApiError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

async function apiGet<T>(endpoint: string): Promise<T> {
	try {
		const response = await fetch(`${API_BASE_URL}${endpoint}`);
		if (!response.ok) {
			throw new ApiError(`API request failed: ${response.statusText}`, response.status);
		}

		const result = await response.json();
		if (!result.success) {
			throw new ApiError(result.error || 'Unknown API error');
		}

		return result;
	} catch (error) {
		if (error instanceof ApiError) {
			throw error;
		}
		throw new ApiError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

export const searchApi = {
	// Main search endpoint
	search: async (request: SearchRequest): Promise<SearchResponse> => {
		return apiRequest<SearchResponse>('/search/', request);
	},

	// Similar creators search
	searchSimilar: async (request: SimilarSearchRequest): Promise<SearchResponse> => {
		return apiRequest<SearchResponse>('/search/similar', request);
	},

	// Category search
	searchByCategory: async (request: CategorySearchRequest): Promise<SearchResponse> => {
		return apiRequest<SearchResponse>('/search/category', request);
	},

	// Username lookup
	getCreatorByUsername: async (username: string): Promise<Creator> => {
		const sanitized = username.trim().replace(/^@+/, '');
		if (!sanitized) {
			throw new ApiError('Username is required');
		}

		const encoded = encodeURIComponent(sanitized);
		const response = await apiGet<UsernameSearchResponse>(`/search/username/${encoded}`);
		return response.result;
	},

	// Health check
	healthCheck: async (): Promise<{ status: string; database_available: boolean }> => {
		const response = await fetch('http://localhost:8000/health');
		if (!response.ok) {
			throw new ApiError('Health check failed');
		}
		return response.json();
	}
};
