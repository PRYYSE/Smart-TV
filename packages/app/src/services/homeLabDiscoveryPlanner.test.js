import {
	buildHomeLabDiscoveryPlan,
	normaliseHomeLabDiscoverySort,
	resolveHomeLabDiscoveryDateToken,
	sanitiseHomeLabDiscoveryFilters
} from './homeLabDiscoveryPlanner';

describe('Home Lab Discovery v2 planner', () => {
	test('mirrors safe discover planning and drops unknown filters', () => {
		const plan = buildHomeLabDiscoveryPlan({
			source: 'discoverMovies',
			mediaType: 'movie',
			sortBy: 'vote_average.desc',
			filters: {
				genre: '28',
				voteCountGte: '500',
				primaryReleaseDateGte: '$yearStart',
				unsafeArbitraryParam: 'must-not-pass'
			}
		}, 3, new Date(2026, 8, 7));

		expect(plan).toEqual({
			path: 'discover/movies',
			queryParameters: {
				page: 3,
				sortBy: 'vote_average.desc',
				genre: '28',
				voteCountGte: '500',
				primaryReleaseDateGte: '2026-01-01'
			}
		});
	});

	test('uses exact specialised paths without leaking generic sort or filters', () => {
		expect(buildHomeLabDiscoveryPlan({source: 'trending', mediaType: 'all'}, 2)).toEqual({
			path: 'discover/trending', queryParameters: {page: 2}
		});
		expect(buildHomeLabDiscoveryPlan({source: 'upcomingTv', mediaType: 'series'}, 4)).toEqual({
			path: 'discover/tv/upcoming', queryParameters: {page: 4}
		});
	});

	test('fails closed for unresolved semantic names and specialised unsupported sources', () => {
		expect(buildHomeLabDiscoveryPlan({
			source: 'discoverTv',
			mediaType: 'series',
			keywordNames: ['space opera']
		})).toBeNull();
		expect(buildHomeLabDiscoveryPlan({source: 'externalList', mediaType: 'movie'})).toBeNull();
		expect(buildHomeLabDiscoveryPlan({source: 'personalised', mediaType: 'movie'})).toBeNull();
	});

	test('normalises unsafe sort values and invalid pages', () => {
		expect(normaliseHomeLabDiscoverySort('drop table')).toBe('popularity.desc');
		const plan = buildHomeLabDiscoveryPlan({source: 'discoverTv', mediaType: 'series', sortBy: 'drop table'}, -2);
		expect(plan.queryParameters.page).toBe(1);
		expect(plan.queryParameters.sortBy).toBe('popularity.desc');
	});

	test('resolves date tokens with end-of-month clamping like the Flutter client', () => {
		const now = new Date(2026, 2, 31);
		expect(resolveHomeLabDiscoveryDateToken('$today', now)).toBe('2026-03-31');
		expect(resolveHomeLabDiscoveryDateToken('$monthsAgo:1', now)).toBe('2026-02-28');
		expect(resolveHomeLabDiscoveryDateToken('$yearsFromNow:2', now)).toBe('2028-03-31');
		expect(resolveHomeLabDiscoveryDateToken('$monthsAgo:999', now)).toBe('');
	});

	test('sanitises date values and empty fields', () => {
		expect(sanitiseHomeLabDiscoveryFilters({
			firstAirDateLte: '$today',
			language: ' ja ',
			genre: '',
			unknown: 'x'
		}, new Date(2026, 8, 7))).toEqual({
			firstAirDateLte: '2026-09-07',
			language: 'ja'
		});
	});
});
