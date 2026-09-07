import {fetchWithTimeout} from '../utils/fetchTimeout';
import {mediaServerQueue} from '../utils/requestQueue';

const ALLOWED_PATHS = new Set([
	'discover/movies',
	'discover/tv',
	'discover/trending',
	'discover/movies/upcoming',
	'discover/tv/upcoming',
	'discover/watchlist'
]);

const ALLOWED_QUERY_KEYS = new Set([
	'page',
	'sortBy',
	'primaryReleaseDateGte',
	'primaryReleaseDateLte',
	'firstAirDateGte',
	'firstAirDateLte',
	'studio',
	'genre',
	'keywords',
	'excludeKeywords',
	'language',
	'withRuntimeGte',
	'withRuntimeLte',
	'voteAverageGte',
	'voteAverageLte',
	'voteCountGte',
	'voteCountLte',
	'network',
	'watchProviders',
	'watchRegion',
	'status',
	'certification',
	'certificationGte',
	'certificationLte',
	'certificationCountry'
]);

const normaliseBaseUrl = (value) => String(value || '').replace(/\/+$/, '');

export const serialiseHomeLabDiscoveryPlan = (plan) => {
	if (!plan || !ALLOWED_PATHS.has(plan.path)) throw new Error('Unsupported Home Lab Discovery proxy path');
	const query = plan.queryParameters || {};
	const parts = [];
	Object.keys(query).sort().forEach((key) => {
		if (!ALLOWED_QUERY_KEYS.has(key)) return;
		const value = query[key];
		if (value == null || String(value).trim() === '') return;
		parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
	});
	return `${plan.path}${parts.length ? `?${parts.join('&')}` : ''}`;
};

const unwrapMoonbaseEnvelope = (payload) => {
	if (!payload || typeof payload !== 'object' || typeof payload.FileContents !== 'string') return payload;
	try {
		const decoded = decodeURIComponent(escape(atob(payload.FileContents)));
		return decoded ? JSON.parse(decoded) : null;
	} catch (_) {
		throw new Error('Invalid Moonbase Discovery proxy response envelope');
	}
};

export const executeHomeLabDiscoveryPlan = async ({
	serverUrl,
	accessToken,
	plan,
	timeout = 30000,
	requestRunner
}) => {
	const baseUrl = normaliseBaseUrl(serverUrl);
	if (!baseUrl || !accessToken) throw new Error('Active Moonfin server URL and token are required');
	const relative = serialiseHomeLabDiscoveryPlan(plan);
	const url = `${baseUrl}/Moonfin/Seerr/Api/${relative}`;
	const runner = requestRunner || ((requestUrl, options, requestTimeout) =>
		mediaServerQueue.run(() => fetchWithTimeout(requestUrl, options, requestTimeout)));

	const response = await runner(url, {
		method: 'GET',
		headers: {
			'Accept': 'application/json',
			'Authorization': `MediaBrowser Token="${accessToken}"`
		}
	}, timeout);

	if (!response) throw new Error('Discovery proxy returned no response');
	const body = await response.text();
	if (response.status < 200 || response.status > 299) {
		const error = new Error(`Discovery proxy returned HTTP ${response.status}`);
		error.status = response.status;
		throw error;
	}
	if (!body) return null;

	let parsed;
	try {
		parsed = JSON.parse(body);
	} catch (_) {
		throw new Error('Discovery proxy returned invalid JSON');
	}
	return unwrapMoonbaseEnvelope(parsed);
};
