// Home Lab Discovery v2 query planner for the lightweight Smart-TV client.
// Keep this policy in semantic lock-step with Moonfin-Core's
// discovery_request_plan/filter/sort policies. Server-delivered values are
// allow-listed here before anything reaches Moonbase's authenticated Seerr proxy.

const ALLOWED_FILTERS = new Set([
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

const DATE_FILTERS = new Set([
	'primaryReleaseDateGte',
	'primaryReleaseDateLte',
	'firstAirDateGte',
	'firstAirDateLte'
]);

const ALLOWED_SORTS = new Set([
	'popularity.desc',
	'popularity.asc',
	'release_date.desc',
	'release_date.asc',
	'revenue.desc',
	'revenue.asc',
	'primary_release_date.desc',
	'primary_release_date.asc',
	'original_title.asc',
	'original_title.desc',
	'vote_average.desc',
	'vote_average.asc',
	'vote_count.desc',
	'vote_count.asc',
	'first_air_date.desc',
	'first_air_date.asc'
]);

const EXECUTABLE_SOURCES = new Set([
	'discoverMovies',
	'discoverTv',
	'trending',
	'upcomingMovies',
	'upcomingTv',
	'watchlist'
]);

const pad2 = (value) => String(value).padStart(2, '0');
const isoDate = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const daysInMonth = (year, monthOneBased) => new Date(year, monthOneBased, 0).getDate();

const safeDate = (year, monthOneBased, day) => {
	const boundedDay = Math.max(1, Math.min(day, daysInMonth(year, monthOneBased)));
	return new Date(year, monthOneBased - 1, boundedDay);
};

const shiftMonths = (date, delta) => {
	const zeroBased = (date.getFullYear() * 12 + date.getMonth()) + delta;
	const year = Math.floor(zeroBased / 12);
	const monthZeroBased = ((zeroBased % 12) + 12) % 12;
	return safeDate(year, monthZeroBased + 1, date.getDate());
};

export const resolveHomeLabDiscoveryDateToken = (value, now = new Date()) => {
	if (typeof value !== 'string' || value.charAt(0) !== '$') return value;

	const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	if (value === '$today') return isoDate(date);
	if (value === '$yearStart') return isoDate(new Date(date.getFullYear(), 0, 1));
	if (value === '$yearEnd') return isoDate(new Date(date.getFullYear(), 11, 31));

	const parts = value.slice(1).split(':');
	if (parts.length !== 2) return '';
	const amount = Number(parts[1]);
	if (!Number.isInteger(amount) || amount < 0 || amount > 120) return '';

	switch (parts[0]) {
		case 'monthsAgo': return isoDate(shiftMonths(date, -amount));
		case 'monthsFromNow': return isoDate(shiftMonths(date, amount));
		case 'yearsAgo': return isoDate(safeDate(date.getFullYear() - amount, date.getMonth() + 1, date.getDate()));
		case 'yearsFromNow': return isoDate(safeDate(date.getFullYear() + amount, date.getMonth() + 1, date.getDate()));
		default: return '';
	}
};

export const sanitiseHomeLabDiscoveryFilters = (filters, now = new Date()) => {
	if (!filters || typeof filters !== 'object' || Array.isArray(filters)) return {};
	const output = {};
	Object.keys(filters).forEach((key) => {
		if (!ALLOWED_FILTERS.has(key)) return;
		let value = String(filters[key] == null ? '' : filters[key]).trim();
		if (!value) return;
		if (DATE_FILTERS.has(key)) value = resolveHomeLabDiscoveryDateToken(value, now);
		if (value) output[key] = value;
	});
	return output;
};

export const normaliseHomeLabDiscoverySort = (value) => {
	const candidate = typeof value === 'string' ? value.trim() : '';
	return ALLOWED_SORTS.has(candidate) ? candidate : 'popularity.desc';
};

const hasUnresolvedSemanticNames = (query) => {
	const fields = ['keywordNames', 'excludeKeywordNames', 'providerNames'];
	return fields.some((field) => Array.isArray(query[field]) && query[field].length > 0);
};

export const buildHomeLabDiscoveryPlan = (sectionOrQuery, page = 1, now = new Date()) => {
	const query = sectionOrQuery && sectionOrQuery.query ? sectionOrQuery.query : sectionOrQuery;
	if (!query || typeof query !== 'object') return null;
	if (!EXECUTABLE_SOURCES.has(query.source)) return null;
	if (hasUnresolvedSemanticNames(query)) return null;

	const safePage = Number.isInteger(page) && page > 0 ? page : 1;
	const discover = (path) => ({
		path,
		queryParameters: Object.assign({
			page: safePage,
			sortBy: normaliseHomeLabDiscoverySort(query.sortBy)
		}, sanitiseHomeLabDiscoveryFilters(query.filters, now))
	});

	switch (query.source) {
		case 'discoverMovies': return discover('discover/movies');
		case 'discoverTv': return discover('discover/tv');
		case 'trending': return {path: 'discover/trending', queryParameters: {page: safePage}};
		case 'upcomingMovies': return {path: 'discover/movies/upcoming', queryParameters: {page: safePage}};
		case 'upcomingTv': return {path: 'discover/tv/upcoming', queryParameters: {page: safePage}};
		case 'watchlist': return {path: 'discover/watchlist', queryParameters: {page: safePage}};
		default: return null;
	}
};

export const isHomeLabDiscoveryQueryExecutable = (sectionOrQuery) =>
	buildHomeLabDiscoveryPlan(sectionOrQuery, 1, new Date(2026, 0, 1)) !== null;
