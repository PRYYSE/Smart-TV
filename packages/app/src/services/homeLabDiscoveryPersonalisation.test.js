import {
	HomeLabDiscoveryPersonalisation,
	homeLabDiscoveryPersonalSlot,
	isHomeLabDiscoveryAnimeItem
} from './homeLabDiscoveryPersonalisation';

const section = (overrides = {}) => ({
	id: 'for-you',
	title: 'For You',
	query: {source: 'personalised', mediaType: 'movie', seedStrategy: 'recent-history'},
	...overrides
});

const movie = (id, tmdb, overrides = {}) => ({
	Id: id,
	Type: 'Movie',
	Name: `Movie ${id}`,
	ProviderIds: tmdb == null ? {} : {Tmdb: String(tmdb)},
	CommunityRating: 8.2,
	...overrides
});

describe('Home Lab Discovery Jellyfin personalisation', () => {
	test('matches Flutter direct slots and hashes specialised strategies deterministically', () => {
		expect(homeLabDiscoveryPersonalSlot(section())).toBe(1);
		expect(homeLabDiscoveryPersonalSlot(section({query: {source: 'personalised', mediaType: 'movie', seedStrategy: 'rewatch'}}))).toBe(15);
		const specialised = section({id: 'special', query: {source: 'personalised', mediaType: 'movie', seedStrategy: 'weekend-binge'}});
		const first = homeLabDiscoveryPersonalSlot(specialised);
		expect(first).toBeGreaterThanOrEqual(1);
		expect(first).toBeLessThanOrEqual(16);
		expect(homeLabDiscoveryPersonalSlot(specialised)).toBe(first);
	});

	test('converts only matching Jellyfin items with valid TMDB identities', async () => {
		const rowsLoader = jest.fn(async () => [{
			seedName: 'Heat',
			items: [movie('jf-1', 101), movie('jf-missing', null), {...movie('jf-series', 202), Type: 'Series'}]
		}]);
		const personalisation = new HomeLabDiscoveryPersonalisation({
			api: {},
			rowsLoader,
			identity: () => 'server|user'
		});
		const loaded = await personalisation.load(section());
		expect(rowsLoader.mock.calls[0][2]).toEqual([1]);
		expect(rowsLoader.mock.calls[0][3]).toBe(false);
		expect(loaded.displayTitle).toBe('Because You Watched Heat');
		expect(loaded.results).toEqual([
			expect.objectContaining({id: 101, mediaType: 'movie', title: 'Movie jf-1', mediaInfo: {status: 5, jellyfinMediaId: 'jf-1'}})
		]);
	});

	test('hydrates recommender candidates before requiring a TMDB provider identity', async () => {
		const rowsLoader = jest.fn(async () => [{seedName: 'Seed', items: [movie('jf-raw', null)]}]);
		const api = {
			getItems: jest.fn(async () => ({Items: [movie('jf-raw', 303, {Overview: 'Hydrated'})]}))
		};
		const personalisation = new HomeLabDiscoveryPersonalisation({api, rowsLoader, identity: () => 'scope'});
		const loaded = await personalisation.load(section());
		expect(api.getItems).toHaveBeenCalledWith(expect.objectContaining({Ids: 'jf-raw'}));
		expect(loaded.results).toEqual([
			expect.objectContaining({id: 303, overview: 'Hydrated', mediaInfo: {status: 5, jellyfinMediaId: 'jf-raw'}})
		]);
	});

	test('anime filtering accepts explicit anime and Japanese animation but rejects generic animation', async () => {
		expect(isHomeLabDiscoveryAnimeItem(movie('a', 1, {Tags: ['Anime']}))).toBe(true);
		expect(isHomeLabDiscoveryAnimeItem(movie('b', 2, {Genres: ['Animation'], OriginalLanguage: 'ja'}))).toBe(true);
		expect(isHomeLabDiscoveryAnimeItem(movie('c', 3, {Genres: ['Animation'], OriginalLanguage: 'en'}))).toBe(false);

		const rowsLoader = jest.fn(async () => [{
			seedName: 'Seed',
			items: [
				movie('anime', 11, {Genres: ['Animation'], ProductionLocations: ['Japan']}),
				movie('cartoon', 12, {Genres: ['Animation'], ProductionLocations: ['United States']})
			]
		}]);
		const personalisation = new HomeLabDiscoveryPersonalisation({api: {}, rowsLoader, identity: () => 'scope'});
		const loaded = await personalisation.load(section({
			id: 'anime-picks',
			tags: ['anime'],
			query: {source: 'personalised', mediaType: 'movie', seedStrategy: 'anime-affinity'}
		}));
		expect(loaded.results.map(item => item.id)).toEqual([11]);
	});

	test('pages a cached recommendation row and force refresh replaces it', async () => {
		let generation = 0;
		const rowsLoader = jest.fn(async () => {
			generation += 1;
			return [{seedName: `Seed ${generation}`, items: [movie('a', 1), movie('b', 2), movie('c', 3)]}];
		});
		const personalisation = new HomeLabDiscoveryPersonalisation({
			api: {},
			rowsLoader,
			identity: () => 'scope',
			pageSize: 2
		});
		const first = await personalisation.load(section(), {page: 1});
		const second = await personalisation.load(section(), {page: 2});
		expect(first.results.map(item => item.id)).toEqual([1, 2]);
		expect(second.results.map(item => item.id)).toEqual([3]);
		expect(rowsLoader).toHaveBeenCalledTimes(1);
		const refreshed = await personalisation.load(section(), {page: 1, forceRefresh: true});
		expect(refreshed.displayTitle).toBe('Because You Watched Seed 2');
		expect(rowsLoader).toHaveBeenCalledTimes(2);
	});
});
