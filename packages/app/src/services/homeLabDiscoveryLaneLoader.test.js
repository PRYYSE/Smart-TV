import {
	isHomeLabDiscoverySectionExecutable,
	loadHomeLabDiscoveryLane,
	loadHomeLabDiscoveryPage,
	normaliseHomeLabDiscoveryPage
} from './homeLabDiscoveryLaneLoader';

const section = (overrides = {}) => ({
	id: 'lane',
	title: 'Lane',
	previewLimit: 3,
	minItems: 2,
	availabilityMode: 'all',
	query: {source: 'discoverMovies', mediaType: 'movie'},
	...overrides
});

const response = (page, results, totalPages = 2) => ({page, totalPages, totalResults: 20, results});

describe('Home Lab Discovery lane loader', () => {
	test('normalises Seerr camel and snake pagination fields', () => {
		expect(normaliseHomeLabDiscoveryPage({page: 2, total_pages: 4, total_results: 10, results: []}, 1))
			.toMatchObject({page: 2, totalPages: 4, totalResults: 10});
	});

	test('deep page stays independent and applies membership without preview truncation', async () => {
		const executePlan = jest.fn(async () => response(2, [
			{id: 1, mediaType: 'movie', title: 'Available', mediaInfo: {status: 5}},
			{id: 2, mediaType: 'movie', title: 'Requested', mediaInfo: {status: 3}},
			{id: 3, mediaType: 'movie', title: 'Available 2', mediaInfo: {status: 4}}
		], 7));
		const loaded = await loadHomeLabDiscoveryPage({
			section: section({availabilityMode: 'available'}),
			page: 2,
			serverUrl: 'http://server',
			accessToken: 'token',
			executePlan
		});
		expect(loaded.results.map(item => item.id)).toEqual([1, 3]);
		expect(loaded.totalPages).toBe(7);
		expect(executePlan.mock.calls[0][0].plan.queryParameters.page).toBe(2);
	});

	test('landing scan backfills across pages, deduplicates and stops at preview limit', async () => {
		const executePlan = jest.fn(async ({plan}) => {
			const page = Number(plan.queryParameters.page);
			if (page === 1) return response(1, [{id: 1, mediaType: 'movie'}, {id: 1, mediaType: 'movie'}]);
			return response(2, [{id: 2, mediaType: 'movie'}, {id: 3, mediaType: 'movie'}, {id: 4, mediaType: 'movie'}]);
		});
		const loaded = await loadHomeLabDiscoveryLane({
			section: section(),
			serverUrl: 'http://server',
			accessToken: 'token',
			executePlan
		});
		expect(loaded.items.map(item => item.id)).toEqual([1, 2, 3]);
		expect(loaded.throughPage).toBe(2);
		expect(loaded.isUsable).toBe(true);
		expect(executePlan).toHaveBeenCalledTimes(2);
	});

	test('sparse lanes hide cleanly while transport failures remain explicit errors', async () => {
		const sparse = await loadHomeLabDiscoveryLane({
			section: section({minItems: 3}),
			serverUrl: 'http://server',
			accessToken: 'token',
			executePlan: async () => response(1, [{id: 1, mediaType: 'movie'}], 1)
		});
		expect(sparse.shouldHide).toBe(true);
		expect(sparse.error).toBeNull();

		const failed = await loadHomeLabDiscoveryLane({
			section: section(),
			serverUrl: 'http://server',
			accessToken: 'token',
			executePlan: async () => { throw new Error('offline'); }
		});
		expect(failed.shouldHide).toBe(false);
		expect(failed.error.message).toBe('offline');
	});

	test('personalised lanes execute from Jellyfin source and still enforce availability membership', async () => {
		const personalSection = section({
			query: {source: 'personalised', mediaType: 'movie', seedStrategy: 'recent-history'},
			availabilityMode: 'available'
		});
		const personalisation = {
			load: jest.fn(async (_section, options) => ({
				page: options.page,
				totalPages: 1,
				totalResults: 2,
				displayTitle: 'Because You Watched Heat',
				results: [
					{id: 11, mediaType: 'movie', mediaInfo: {status: 5}},
					{id: 12, mediaType: 'movie', mediaInfo: {status: 3}}
				]
			}))
		};
		expect(isHomeLabDiscoverySectionExecutable(personalSection, {personalisation})).toBe(true);
		const loaded = await loadHomeLabDiscoveryLane({
			section: personalSection,
			serverUrl: 'http://server',
			accessToken: 'token',
			personalisation,
			forceRefresh: true,
			executePlan: jest.fn()
		});
		expect(loaded.items.map(item => item.id)).toEqual([11]);
		expect(loaded.displayTitle).toBe('Because You Watched Heat');
		expect(personalisation.load).toHaveBeenCalledWith(personalSection, {page: 1, forceRefresh: true});
	});

	test('personalised landing previews do not prefetch deeper recommendation pages', async () => {
		const personalSection = section({
			previewLimit: 20,
			minItems: 1,
			query: {source: 'personalised', mediaType: 'movie', seedStrategy: 'recent-history'}
		});
		const personalisation = {
			supports: jest.fn(() => true),
			load: jest.fn(async (_section, options) => ({
				page: options.page,
				totalPages: 5,
				totalResults: 0,
				results: [{id: options.page, mediaType: 'movie'}]
			}))
		};

		const loaded = await loadHomeLabDiscoveryLane({
			section: personalSection,
			serverUrl: 'http://server',
			accessToken: 'token',
			personalisation,
			maxPagesPerScan: 6
		});

		expect(loaded.items.map(item => item.id)).toEqual([1]);
		expect(loaded.throughPage).toBe(1);
		expect(loaded.totalPages).toBe(5);
		expect(personalisation.load).toHaveBeenCalledTimes(1);
		expect(personalisation.load).toHaveBeenCalledWith(personalSection, {page: 1, forceRefresh: false});
	});

	test('unsupported personalised semantics fail closed before loading a fake lane', async () => {
		const personalSection = section({
			id: 'weekend-binge',
			query: {source: 'personalised', mediaType: 'tv', seedStrategy: 'weekend-binge'}
		});
		const personalisation = {
			supports: jest.fn(() => false),
			load: jest.fn()
		};
		expect(isHomeLabDiscoverySectionExecutable(personalSection, {personalisation})).toBe(false);
		await expect(loadHomeLabDiscoveryPage({
			section: personalSection,
			serverUrl: 'http://server',
			accessToken: 'token',
			personalisation,
			executePlan: jest.fn()
		})).rejects.toThrow('no supported personalisation source');
		expect(personalisation.load).not.toHaveBeenCalled();
	});
});
