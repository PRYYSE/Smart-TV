import {
	HOME_LAB_DISCOVERY_UNSUPPORTED_PERSONAL_STRATEGIES,
	HomeLabDiscoveryPersonalisation,
	homeLabDiscoveryPersonalPolicy,
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
	ProductionYear: 2022,
	UserData: {Played: true},
	...overrides
});

const seerrMovie = (id, overrides = {}) => ({
	id,
	mediaType: 'movie',
	title: `External ${id}`,
	overview: `Overview ${id}`,
	posterPath: `/poster-${id}.jpg`,
	backdropPath: `/backdrop-${id}.jpg`,
	voteAverage: 8.1,
	...overrides
});

const baseApi = (seed = movie('seed', 50, {Name: 'Heat'})) => ({
	getItems: jest.fn(async (params) => ({Items: params?.Ids ? [] : [seed]})),
	resolveItemsByProviderIds: jest.fn(async items => items)
});

const baseSeerr = (results = [seerrMovie(101), seerrMovie(102)]) => ({
	getMovieRecommendations: jest.fn(async () => ({results})),
	getTvRecommendations: jest.fn(async () => ({results: []})),
	getWatchlist: jest.fn(async () => ({results: []})),
	getRecentlyAdded: jest.fn(async () => ({results: []})),
	trending: jest.fn(async () => ({results: []})),
	discoverTv: jest.fn(async () => ({results: []}))
});

describe('Home Lab Discovery Jellyfin personalisation', () => {
	test('supports explicit semantics and fails closed instead of hashing unknown strategies', () => {
		expect(homeLabDiscoveryPersonalSlot(section())).toBe(1);
		expect(homeLabDiscoveryPersonalSlot(section({query: {source: 'personalised', mediaType: 'movie', seedStrategy: 'rewatch'}}))).toBe(15);
		expect(homeLabDiscoveryPersonalSlot(section({query: {source: 'personalised', mediaType: 'movie', seedStrategy: 'weekend-binge'}}))).toBeNull();
		expect(homeLabDiscoveryPersonalPolicy(section({query: {source: 'personalised', mediaType: 'movie', seedStrategy: 'something-completely-different'}})))
			.toEqual(expect.objectContaining({source: 'random', strategy: 'something-completely-different'}));
		expect(HOME_LAB_DISCOVERY_UNSUPPORTED_PERSONAL_STRATEGIES).toContain('recent-discovery-context');
		expect(HOME_LAB_DISCOVERY_UNSUPPORTED_PERSONAL_STRATEGIES).toContain('anime-completed');
	});

	test('recent-history uses played Jellyfin history as a real Seerr recommendation seed', async () => {
		const api = baseApi();
		const seerr = baseSeerr();
		const personalisation = new HomeLabDiscoveryPersonalisation({api, seerr, identity: () => 'server|user'});
		const loaded = await personalisation.load(section());

		expect(api.getItems).toHaveBeenCalledWith(expect.objectContaining({
			Filters: 'IsPlayed',
			SortBy: 'DatePlayed',
			IncludeItemTypes: 'Movie'
		}));
		expect(seerr.getMovieRecommendations).toHaveBeenCalledWith(50, 1);
		expect(api.resolveItemsByProviderIds).toHaveBeenCalled();
		expect(loaded.displayTitle).toBe('Because You Watched Heat');
		expect(loaded.results).toEqual([
			expect.objectContaining({id: 101, mediaType: 'movie', title: 'External 101', posterPath: '/poster-101.jpg'}),
			expect.objectContaining({id: 102, mediaType: 'movie', title: 'External 102'})
		]);
	});

	test('favourites, likes and watchlist use their actual signal sources', async () => {
		const favouriteApi = baseApi(movie('fav', 60, {Name: 'Favourite'}));
		const favourite = new HomeLabDiscoveryPersonalisation({
			api: favouriteApi,
			seerr: baseSeerr([seerrMovie(201)]),
			identity: () => 'fav'
		});
		await favourite.load(section({query: {source: 'personalised', mediaType: 'movie', seedStrategy: 'favourites'}}));
		expect(favouriteApi.getItems).toHaveBeenCalledWith(expect.objectContaining({Filters: 'IsFavorite'}));

		const likesApi = baseApi(movie('liked', 61, {Name: 'Liked'}));
		const likes = new HomeLabDiscoveryPersonalisation({
			api: likesApi,
			seerr: baseSeerr([seerrMovie(202)]),
			identity: () => 'likes'
		});
		await likes.load(section({query: {source: 'personalised', mediaType: 'movie', seedStrategy: 'likes'}}));
		expect(likesApi.getItems).toHaveBeenCalledWith(expect.objectContaining({Filters: 'Likes'}));

		const watchlistApi = {getItems: jest.fn(), resolveItemsByProviderIds: jest.fn(async items => items)};
		const watchlistSeerr = baseSeerr([seerrMovie(203)]);
		watchlistSeerr.getWatchlist.mockResolvedValue({results: [seerrMovie(70, {title: 'Watchlisted'})]});
		const watchlist = new HomeLabDiscoveryPersonalisation({api: watchlistApi, seerr: watchlistSeerr, identity: () => 'watchlist'});
		const loaded = await watchlist.load(section({query: {source: 'personalised', mediaType: 'movie', seedStrategy: 'watchlist'}}));
		expect(watchlistSeerr.getWatchlist).toHaveBeenCalledWith(1);
		expect(watchlistSeerr.getMovieRecommendations).toHaveBeenCalledWith(70, 1);
		expect(loaded.displayTitle).toBe('Recommended from Your Watchlist');
	});

	test('owned recommendation results retain TMDB routing but expose the Jellyfin media identity', async () => {
		const api = baseApi();
		api.resolveItemsByProviderIds.mockImplementation(async items => items.map(item => ({
			...item,
			Id: 'jf-303',
			Type: 'Movie',
			Name: 'Owned title',
			ProviderIds: {Tmdb: '303'},
			_resolvedFromExternal: true,
			UserData: {Played: false}
		})));
		const personalisation = new HomeLabDiscoveryPersonalisation({
			api,
			seerr: baseSeerr([seerrMovie(303)]),
			identity: () => 'owned'
		});
		const loaded = await personalisation.load(section());
		expect(loaded.results).toEqual([
			expect.objectContaining({
				id: 303,
				mediaType: 'movie',
				title: 'Owned title',
				mediaInfo: {status: 5, jellyfinMediaId: 'jf-303'}
			})
		]);
	});

	test('anime aliases require real anime seeds and outputs', async () => {
		expect(isHomeLabDiscoveryAnimeItem(movie('a', 1, {Tags: ['Anime']}))).toBe(true);
		expect(isHomeLabDiscoveryAnimeItem(movie('b', 2, {Genres: ['Animation'], OriginalLanguage: 'ja'}))).toBe(true);
		expect(isHomeLabDiscoveryAnimeItem(movie('c', 3, {Genres: ['Animation'], OriginalLanguage: 'en'}))).toBe(false);
		expect(isHomeLabDiscoveryAnimeItem(seerrMovie(4, {genreIds: [16], originalLanguage: 'ja'}))).toBe(true);

		const animeSeed = movie('anime-seed', 80, {Name: 'Anime Seed', Tags: ['Anime']});
		const api = baseApi(animeSeed);
		const seerr = baseSeerr([
			seerrMovie(401, {genreIds: [16], originalLanguage: 'ja'}),
			seerrMovie(402, {genreIds: [16], originalLanguage: 'en'})
		]);
		const personalisation = new HomeLabDiscoveryPersonalisation({api, seerr, identity: () => 'anime'});
		const loaded = await personalisation.load(section({
			id: 'anime-picks',
			tags: ['anime'],
			query: {source: 'personalised', mediaType: 'movie', seedStrategy: 'anime-recent-history'}
		}));
		expect(loaded.results.map(item => item.id)).toEqual([401]);
	});

	test('pages a cached recommendation result and force refresh reloads it', async () => {
		const api = baseApi();
		let generation = 0;
		const seerr = baseSeerr();
		seerr.getMovieRecommendations.mockImplementation(async () => {
			generation += 1;
			return {results: [seerrMovie(generation * 10 + 1), seerrMovie(generation * 10 + 2), seerrMovie(generation * 10 + 3)]};
		});
		const personalisation = new HomeLabDiscoveryPersonalisation({
			api,
			seerr,
			identity: () => 'scope',
			pageSize: 2
		});
		const first = await personalisation.load(section(), {page: 1});
		const second = await personalisation.load(section(), {page: 2});
		expect(first.results.map(item => item.id)).toEqual([11, 12]);
		expect(second.results.map(item => item.id)).toEqual([13]);
		expect(seerr.getMovieRecommendations).toHaveBeenCalledTimes(1);
		const refreshed = await personalisation.load(section(), {page: 1, forceRefresh: true});
		expect(refreshed.results.map(item => item.id)).toEqual([21, 22]);
		expect(seerr.getMovieRecommendations).toHaveBeenCalledTimes(2);
	});
});