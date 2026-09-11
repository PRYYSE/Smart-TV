const PAGE_SIZE = 15;
const SEED_LIMIT = 60;
const HIGH_RATING_SEED_LIMIT = 100;
const MAX_CACHED_ROWS = 24;
const UPSTREAM_FETCH_BUDGET = 4;
const PERSONAL_DETAIL_FIELDS = 'ProviderIds,Overview,Genres,CommunityRating,Tags,People,Studios,ProductionLocations,OriginalLanguage,RunTimeTicks,ProductionYear,UserData,SeriesId';

const BASE_POLICIES = Object.freeze({
	'recent-history': {source: 'history', slot: 1},
	'favourites': {source: 'favourites', slot: 2},
	'watchlist': {source: 'watchlist', slot: 3},
	'high-ratings': {source: 'high-ratings', slot: 4},
	'likes': {source: 'likes', slot: 5},
	'mixed-positive': {source: 'positive', slot: 6},
	'highly-rated-unseen': {source: 'positive', slot: 7, minRating: 7, unseenOnly: true},
	'novelty': {source: 'random', slot: 8},
	'movie-affinity': {source: 'history', slot: 9, forceMediaType: 'movie'},
	'series-affinity': {source: 'history', slot: 10, forceMediaType: 'tv'},
	'anime-affinity': {source: 'history', slot: 11, animeOnly: true},
	'short-runtime-affinity': {source: 'history', slot: 12, maxRuntimeMinutes: 60},
	'older-affinity': {source: 'history', slot: 13, maxYearOffset: 10},
	'recent-affinity': {source: 'history', slot: 14, minYearOffset: 5},
	'rewatch': {source: 'positive', slot: 15, direct: true, playedOnly: true},
	'recently-added': {source: 'recently-added', slot: 16, direct: true},
	'trending-anime': {source: 'trending', slot: 1, direct: true, animeOnly: true},
	'anime-popular-but-not-in-your-library': {source: 'popular-anime', slot: 2, direct: true, animeOnly: true, excludeLibrary: true}
});

const ALIASES = Object.freeze({
	'something-completely-different': ['novelty'],
	'comfort-rewatch-candidates': ['rewatch'],
	'anime-recent-history': ['recent-history', {animeOnly: true}],
	'anime-favourites': ['favourites', {animeOnly: true}],
	'anime-watchlist': ['watchlist', {animeOnly: true}],
	'anime-action-affinity': ['anime-affinity', {seedGenres: ['action']}],
	'anime-fantasy-affinity': ['anime-affinity', {seedGenres: ['fantasy']}],
	'anime-romance-drama-affinity': ['anime-affinity', {seedGenres: ['romance', 'drama']}],
	'anime-novelty': ['novelty', {animeOnly: true}],
	'anime-something-different': ['novelty', {animeOnly: true}],
	'anime-highly-rated-unseen': ['highly-rated-unseen', {animeOnly: true}],
	'anime-high-ratings': ['high-ratings', {animeOnly: true}],
	'anime-recent-affinity': ['recent-affinity', {animeOnly: true}],
	'anime-older-affinity': ['older-affinity', {animeOnly: true}],
	'anime-movie-affinity': ['movie-affinity', {animeOnly: true}],
	'anime-short-affinity': ['short-runtime-affinity', {animeOnly: true}]
});

// These are deliberately unsupported until their catalogue labels can be
// backed by real data. In particular, season-count/status/binge semantics must
// never fall through to an arbitrary recommendation seed just to keep a lane.
export const HOME_LAB_DISCOVERY_UNSUPPORTED_PERSONAL_STRATEGIES = Object.freeze([
	'recent-discovery-context',
	'limited-series',
	'one-season-wonders',
	'long-running-favourites',
	'weekend-binge',
	'anime-specials',
	'anime-one-season',
	'anime-long-running',
	'anime-bingeable',
	'anime-completed',
	'anime-continuing',
	'anime-short-runs'
]);

const runtimeApi = {
	getItems: (...args) => {
		const {api} = require('./jellyfinApi');
		return api.getItems(...args);
	},
	resolveItemsByProviderIds: (...args) => {
		const {resolveItemsByProviderIds} = require('./jellyfinApi');
		return resolveItemsByProviderIds(...args);
	}
};

const runtimeSeerr = {
	getWatchlist: (...args) => require('./seerrApi').getWatchlist(...args),
	getMovieRecommendations: (...args) => require('./seerrApi').getMovieRecommendations(...args),
	getTvRecommendations: (...args) => require('./seerrApi').getTvRecommendations(...args),
	getRecentlyAdded: (...args) => require('./seerrApi').getRecentlyAdded(...args),
	trending: (...args) => require('./seerrApi').trending(...args),
	discoverTv: (...args) => require('./seerrApi').discoverTv(...args)
};

const runtimeIdentity = () => {
	const {getServerUrl, getUserId} = require('./jellyfinApi');
	return `${getServerUrl() || 'server'}|${getUserId() || 'user'}`;
};

const normalisedList = (value) => (
	Array.isArray(value)
		? value.map((entry) => String((entry?.Name ?? entry) || '').trim().toLowerCase()).filter(Boolean)
		: []
);

const positiveTmdbId = (item) => {
	const providerIds = item?.ProviderIds || {};
	const raw = providerIds.Tmdb ?? providerIds.TMDB ?? providerIds.tmdb ?? item?.tmdbId ?? item?._seerrRaw?.mediaId;
	const id = Number(raw);
	return Number.isInteger(id) && id > 0 ? id : null;
};

const mediaTypeFor = (item) => {
	const type = item?.Type || item?.type || item?._seerrMediaType || item?.mediaType || item?.media_type;
	if (type === 'Movie' || type === 'movie') return 'movie';
	if (type === 'Series' || type === 'series' || type === 'tv' || type === 'show') return 'tv';
	return null;
};

const yearFor = (item) => {
	const direct = Number(item?.ProductionYear);
	if (Number.isInteger(direct) && direct > 1800) return direct;
	const date = item?.release_date || item?.releaseDate || item?.first_air_date || item?.firstAirDate;
	const parsed = typeof date === 'string' ? Number(date.slice(0, 4)) : NaN;
	return Number.isInteger(parsed) ? parsed : null;
};

const runtimeMinutesFor = (item) => {
	const ticks = Number(item?.RunTimeTicks);
	return Number.isFinite(ticks) && ticks > 0 ? ticks / 600000000 : null;
};

const sectionRequiresAnime = (section) => {
	const tags = normalisedList(section?.tags);
	const strategy = String(section?.query?.seedStrategy || '').trim().toLowerCase();
	return tags.includes('anime') || strategy.startsWith('anime-') || String(section?.id || '').toLowerCase().startsWith('anime');
};

const personalDisplayTitle = (section, policy) => (
	policy?.source === 'random' && policy?.animeOnly
		? 'Something Different in Anime'
		: (section?.title || 'For You')
);

export const isHomeLabDiscoveryAnimeItem = (item) => {
	const tags = normalisedList(item?.Tags || item?.tags);
	if (tags.includes('anime')) return true;
	const genres = normalisedList(item?.Genres || item?.genres);
	if (genres.includes('anime')) return true;
	const genreIds = item?.GenreIds || item?.genreIds || item?.genre_ids || [];
	const animation = Array.isArray(genreIds) && genreIds.some(value => Number(value) === 16);
	const language = String(item?.OriginalLanguage || item?.originalLanguage || item?.original_language || '').trim().toLowerCase();
	const locations = normalisedList(item?.ProductionLocations);
	if (animation && (language === 'ja' || language === 'jpn' || language === 'japanese')) return true;
	if (!genres.includes('animation')) return false;
	return language === 'ja' || language === 'jpn' || language === 'japanese' || locations.includes('japan');
};

const resolvePolicy = (strategy) => {
	const key = String(strategy || '').trim().toLowerCase();
	if (BASE_POLICIES[key]) return {...BASE_POLICIES[key], strategy: key};
	const alias = ALIASES[key];
	if (!alias) return null;
	const [base, overrides = {}] = alias;
	const basePolicy = BASE_POLICIES[base];
	if (!basePolicy) return null;
	return {...basePolicy, ...overrides, strategy: key};
};

export const homeLabDiscoveryPersonalPolicy = (section) => {
	const policy = resolvePolicy(section?.query?.seedStrategy);
	if (!policy) return null;
	return {
		...policy,
		mediaType: policy.forceMediaType || section?.query?.mediaType || null,
		animeOnly: policy.animeOnly === true || sectionRequiresAnime(section)
	};
};

export const homeLabDiscoveryPersonalSlot = (section) => homeLabDiscoveryPersonalPolicy(section)?.slot ?? null;

const uniqueByIdentity = (items) => {
	const output = [];
	const seen = new Set();
	for (const item of items || []) {
		const tmdb = positiveTmdbId(item);
		const mediaType = mediaTypeFor(item);
		const fallback = item?.Id || item?.id;
		const key = tmdb && mediaType ? `${mediaType}:tmdb:${tmdb}` : (fallback ? `${mediaType || 'unknown'}:id:${fallback}` : null);
		if (!key || seen.has(key)) continue;
		seen.add(key);
		output.push(item);
	}
	return output;
};

const candidateFromSeerr = (item) => {
	const id = Number(item?.id ?? item?.tmdbId);
	if (!Number.isInteger(id) || id <= 0) return null;
	const mediaType = mediaTypeFor(item) || (item?.title ? 'movie' : 'tv');
	if (mediaType !== 'movie' && mediaType !== 'tv') return null;
	const date = item?.release_date || item?.releaseDate || item?.first_air_date || item?.firstAirDate || null;
	return {
		Id: `seerr-${mediaType}-${id}`,
		Type: mediaType === 'movie' ? 'Movie' : 'Series',
		Name: item?.title || item?.name || `TMDB ${id}`,
		Overview: item?.overview || null,
		ProviderIds: {Tmdb: String(id)},
		ProductionYear: yearFor(item),
		CommunityRating: Number(item?.vote_average ?? item?.voteAverage ?? 0) || null,
		GenreIds: item?.genre_ids || item?.genreIds || [],
		OriginalLanguage: item?.original_language || item?.originalLanguage || null,
		Adult: item?.adult === true,
		mediaInfo: item?.mediaInfo || item?.media || null,
		_externalPosterPath: item?.poster_path || item?.posterPath || null,
		_externalBackdropPath: item?.backdrop_path || item?.backdropPath || null,
		_externalReleaseDate: date,
		_seerr: true,
		_seerrMediaType: mediaType
	};
};

const candidateFromMediaRecord = (item) => candidateFromSeerr({
	id: item?.tmdbId ?? item?.id,
	mediaType: item?.mediaType || item?.media_type || item?.type,
	title: item?.title,
	name: item?.name,
	overview: item?.overview,
	posterPath: item?.posterPath,
	backdropPath: item?.backdropPath,
	voteAverage: item?.voteAverage,
	mediaInfo: item?.mediaInfo || (item?.status != null ? {status: item.status} : null),
	releaseDate: item?.releaseDate,
	firstAirDate: item?.firstAirDate,
	genreIds: item?.genreIds,
	originalLanguage: item?.originalLanguage
});

const toDiscoveryItem = (item) => {
	const tmdbId = positiveTmdbId(item);
	const mediaType = mediaTypeFor(item);
	if (!tmdbId || !mediaType) return null;
	const rating = Number(item?.CommunityRating);
	const rawStatus = Number(item?.mediaInfo?.status ?? item?.MediaInfo?.Status ?? 0);
	const isResolvedLocal = item?._resolvedFromExternal === true || (item?._seerr !== true && !String(item?.Id || '').startsWith('seerr-'));
	const status = rawStatus > 0 ? rawStatus : (isResolvedLocal ? 5 : null);
	const date = item?._externalReleaseDate || (yearFor(item) ? `${yearFor(item)}-01-01` : null);
	return {
		id: tmdbId,
		mediaType,
		title: mediaType === 'movie' ? (item?.Name || null) : null,
		name: mediaType === 'tv' ? (item?.Name || null) : null,
		originalTitle: item?.OriginalTitle || null,
		overview: item?.Overview || null,
		posterPath: item?._externalPosterPath || null,
		backdropPath: item?._externalBackdropPath || null,
		releaseDate: mediaType === 'movie' ? date : null,
		firstAirDate: mediaType === 'tv' ? date : null,
		voteAverage: Number.isFinite(rating) && rating > 0 ? rating : null,
		isAdult: item?.Adult === true,
		mediaInfo: status == null ? null : {
			status,
			jellyfinMediaId: isResolvedLocal ? (item?.Id || null) : null
		}
	};
};

const matchesMediaType = (item, wanted) => {
	const normalized = String(wanted || '').trim().toLowerCase();
	return !normalized || normalized === 'all' || normalized === 'any' || mediaTypeFor(item) === normalized;
};

const matchesPolicy = (item, policy, now = new Date()) => {
	if (!matchesMediaType(item, policy.mediaType)) return false;
	if (policy.animeOnly && !isHomeLabDiscoveryAnimeItem(item)) return false;
	if (Array.isArray(policy.seedGenres) && policy.seedGenres.length) {
		const genres = normalisedList(item?.Genres || item?.genres);
		if (!policy.seedGenres.some(genre => genres.some(value => value.includes(genre)))) return false;
	}
	const runtime = runtimeMinutesFor(item);
	if (policy.maxRuntimeMinutes && runtime != null && runtime > policy.maxRuntimeMinutes) return false;
	const year = yearFor(item);
	const currentYear = now.getFullYear();
	if (policy.maxYearOffset && year != null && year > currentYear - policy.maxYearOffset) return false;
	if (policy.minYearOffset && year != null && year < currentYear - policy.minYearOffset) return false;
	return true;
};

const matchesResultPolicy = (item, policy) => {
	if (!matchesMediaType(item, policy.mediaType)) return false;
	if (policy.animeOnly && !isHomeLabDiscoveryAnimeItem(item)) return false;
	if (policy.unseenOnly && item?.UserData?.Played === true) return false;
	if (policy.playedOnly && item?.UserData?.Played !== true) return false;
	if (policy.excludeLibrary && (item?._resolvedFromExternal === true || item?._seerr !== true)) return false;
	if (policy.minRating) {
		const rating = Number(item?.CommunityRating);
		if (!Number.isFinite(rating) || rating < policy.minRating) return false;
	}
	return true;
};

const itemTypesFor = (policy, history = false) => {
	if (policy.mediaType === 'movie') return 'Movie';
	if (policy.mediaType === 'tv') return history ? 'Episode' : 'Series';
	return history ? 'Movie,Episode' : 'Movie,Series';
};

const reportedTotalPages = (payload) => {
	const value = Number(payload?.totalPages ?? payload?.total_pages);
	return Number.isInteger(value) && value > 0 ? value : null;
};

const rowResultCount = (row) => row.pages.reduce((total, page) => total + page.length, 0) + row.pending.length;

export class HomeLabDiscoveryPersonalisation {
	constructor({
		api = runtimeApi,
		seerr = runtimeSeerr,
		identity = runtimeIdentity,
		pageSize = PAGE_SIZE,
		now = () => new Date(),
		maxCachedRows = MAX_CACHED_ROWS,
		upstreamFetchBudget = UPSTREAM_FETCH_BUDGET
	} = {}) {
		this.api = api;
		this.seerr = seerr;
		this.identity = identity;
		this.pageSize = Math.max(1, Number(pageSize) || PAGE_SIZE);
		this.now = now;
		this.maxCachedRows = Math.max(1, Number(maxCachedRows) || MAX_CACHED_ROWS);
		this.upstreamFetchBudget = Math.max(1, Number(upstreamFetchBudget) || UPSTREAM_FETCH_BUDGET);
		this.cache = new Map();
	}

	supports(section) {
		return Boolean(homeLabDiscoveryPersonalPolicy(section));
	}

	async load(section, {page = 1, forceRefresh = false} = {}) {
		const policy = homeLabDiscoveryPersonalPolicy(section);
		if (!policy) throw new Error(`Unsupported personalised Discovery strategy: ${section?.query?.seedStrategy || 'unknown'}`);
		const safePage = Math.max(1, Number(page) || 1);
		const cacheKey = `${this.identity()}|${section?.id || 'section'}|${policy.strategy}|${policy.mediaType || 'any'}`;
		if (forceRefresh) this.cache.delete(cacheKey);

		let rowPromise = this.cache.get(cacheKey);
		if (rowPromise) {
			this.cache.delete(cacheKey);
			this.cache.set(cacheKey, rowPromise);
		} else {
			rowPromise = this._createRow(section, policy);
			this.cache.set(cacheKey, rowPromise);
			this._trimCache();
		}

		let row;
		try {
			row = await rowPromise;
		} catch (error) {
			if (this.cache.get(cacheKey) === rowPromise) this.cache.delete(cacheKey);
			throw error;
		}

		await this._withRowLock(row, () => this._ensurePage(row, section, policy, safePage));
		const results = row.pages[safePage - 1] || [];
		const sourceFinished = row.exhausted && row.pending.length === 0;
		const knownResultCount = rowResultCount(row);
		const totalPages = sourceFinished
			? row.pages.length
			: Math.max(safePage + 1, row.pages.length + 1);

		return {
			page: safePage,
			totalPages,
			totalResults: sourceFinished ? knownResultCount : 0,
			displayTitle: row.displayTitle,
			results
		};
	}

	clear() {
		this.cache.clear();
	}

	_trimCache() {
		while (this.cache.size > this.maxCachedRows) {
			const oldest = this.cache.keys().next().value;
			if (oldest == null) break;
			this.cache.delete(oldest);
		}
	}

	_withRowLock(row, action) {
		const previous = row.lock || Promise.resolve();
		const next = previous.then(action, action);
		row.lock = next.catch(() => {});
		return next;
	}

	_baseRow(section, policy, kind) {
		return {
			kind,
			sectionId: section?.id || 'section',
			policy,
			displayTitle: personalDisplayTitle(section, policy),
			pages: [],
			pending: [],
			seen: new Set(),
			exhausted: false,
			lock: Promise.resolve()
		};
	}

	async _createRow(section, policy) {
		if (policy.direct) return this._createDirectRow(section, policy);
		const row = this._baseRow(section, policy, 'recommendations');
		const seeds = await this._loadSeeds(policy);
		if (!seeds.length) {
			row.exhausted = true;
			return row;
		}
		const start = (Math.max(1, Number(policy.slot) || 1) - 1) % seeds.length;
		const ordered = seeds.map((_, index) => seeds[(start + index) % seeds.length]);
		row.seedStates = ordered.map(seed => ({seed, nextPage: 1, totalPages: null, exhausted: false}));
		row.seedCursor = 0;
		row.chosenSeed = null;
		return row;
	}

	async _createDirectRow(section, policy) {
		const paged = policy.source === 'trending' || policy.source === 'popular-anime';
		const row = this._baseRow(section, policy, paged ? 'direct-paged' : 'direct-static');
		if (paged) {
			row.upstreamPage = 1;
			row.upstreamTotalPages = null;
			return row;
		}

		let candidates = [];
		if (policy.source === 'recently-added' && typeof this.seerr?.getRecentlyAdded === 'function') {
			const payload = await this.seerr.getRecentlyAdded(80);
			const source = Array.isArray(payload) ? payload : (payload?.results || []);
			candidates = source.map(candidateFromMediaRecord).filter(Boolean);
		} else {
			candidates = await this._loadSeeds(policy);
		}
		await this._appendCandidates(row, candidates, section, policy);
		row.exhausted = true;
		return row;
	}

	async _ensurePage(row, section, policy, page) {
		while (row.pages.length < page && (row.pending.length > 0 || !row.exhausted)) {
			await this._fillLogicalPage(row, section, policy);
		}
		while (row.pages.length < page) row.pages.push([]);
	}

	async _fillLogicalPage(row, section, policy) {
		const output = [];
		let requests = 0;
		try {
			while (output.length < this.pageSize) {
				while (row.pending.length && output.length < this.pageSize) output.push(row.pending.shift());
				if (output.length >= this.pageSize || row.exhausted) break;
				if (requests >= this.upstreamFetchBudget) break;
				if (row.kind === 'recommendations') await this._fetchNextRecommendationBatch(row, section, policy);
				else if (row.kind === 'direct-paged') await this._fetchNextDirectBatch(row, section, policy);
				else row.exhausted = true;
				requests += 1;
			}
		} catch (error) {
			row.pending = output.concat(row.pending);
			throw error;
		}
		row.pages.push(output);
	}

	_nextSeedState(row) {
		const states = row.seedStates || [];
		if (!states.length) return null;
		for (let offset = 0; offset < states.length; offset += 1) {
			const index = (row.seedCursor + offset) % states.length;
			const state = states[index];
			if (!state.exhausted) return {state, index};
		}
		return null;
	}

	async _fetchNextRecommendationBatch(row, section, policy) {
		let next = this._nextSeedState(row);
		while (next) {
			const {state, index} = next;
			const seed = state.seed;
			const tmdbId = positiveTmdbId(seed);
			const mediaType = mediaTypeFor(seed);
			if (!tmdbId || !mediaType) {
				state.exhausted = true;
				next = this._nextSeedState(row);
				continue;
			}

			const requestedPage = state.nextPage;
			let payload;
			if (mediaType === 'movie' && typeof this.seerr?.getMovieRecommendations === 'function') {
				payload = await this.seerr.getMovieRecommendations(tmdbId, requestedPage);
			} else if (mediaType === 'tv' && typeof this.seerr?.getTvRecommendations === 'function') {
				payload = await this.seerr.getTvRecommendations(tmdbId, requestedPage);
			} else {
				state.exhausted = true;
				next = this._nextSeedState(row);
				continue;
			}

			const candidates = (payload?.results || []).map(candidateFromSeerr).filter(Boolean);
			const beforeCount = row.pending.length;
			await this._appendCandidates(row, candidates, section, policy);
			if (!row.chosenSeed && row.pending.length > beforeCount) {
				row.chosenSeed = seed;
				row.displayTitle = this._displayTitle(section, policy, seed);
			}

			const totalPages = reportedTotalPages(payload);
			state.totalPages = totalPages;
			state.exhausted = candidates.length === 0 || totalPages == null || requestedPage >= totalPages;
			if (!state.exhausted) state.nextPage = requestedPage + 1;
			row.seedCursor = (index + 1) % (row.seedStates?.length || 1);
			row.exhausted = row.seedStates.every(candidate => candidate.exhausted);
			return;
		}
		row.exhausted = true;
	}

	async _fetchNextDirectBatch(row, section, policy) {
		const requestedPage = row.upstreamPage;
		let payload;
		if (policy.source === 'trending' && typeof this.seerr?.trending === 'function') {
			payload = await this.seerr.trending(requestedPage);
		} else if (policy.source === 'popular-anime' && typeof this.seerr?.discoverTv === 'function') {
			payload = await this.seerr.discoverTv(requestedPage);
		} else {
			row.exhausted = true;
			return;
		}

		const candidates = (payload?.results || []).map(candidateFromSeerr).filter(Boolean);
		await this._appendCandidates(row, candidates, section, policy);
		const totalPages = reportedTotalPages(payload);
		row.upstreamTotalPages = totalPages;
		row.exhausted = candidates.length === 0 || totalPages == null || requestedPage >= totalPages;
		if (!row.exhausted) row.upstreamPage = requestedPage + 1;
	}

	async _appendCandidates(row, candidates, section, policy) {
		const hydrated = await this._hydrateItems(candidates);
		const resolved = await this._resolveOwned(hydrated);
		const converted = this._convert(uniqueByIdentity(resolved), section, policy);
		for (const item of converted) {
			const key = `${item.mediaType}:${item.id}`;
			if (row.seen.has(key)) continue;
			row.seen.add(key);
			row.pending.push(item);
		}
	}

	async _loadSeeds(policy) {
		let seeds;
		if (policy.source === 'positive') {
			const [likes, favourites, highRatings] = await Promise.all([
				this._loadJellyfinSeeds('likes', policy),
				this._loadJellyfinSeeds('favourites', policy),
				this._loadHighRatingSeeds(policy)
			]);
			seeds = uniqueByIdentity([...likes, ...favourites, ...highRatings]);
		} else if (policy.source === 'high-ratings') {
			seeds = await this._loadHighRatingSeeds(policy);
		} else if (policy.source === 'watchlist') {
			seeds = await this._loadWatchlistSeeds();
		} else {
			seeds = await this._loadJellyfinSeeds(policy.source, policy);
		}
		const now = this.now();
		return uniqueByIdentity(seeds).filter(item => matchesPolicy(item, policy, now));
	}

	async _loadHighRatingSeeds(policy) {
		if (typeof this.api?.getItems !== 'function') return [];
		try {
			const response = await this.api.getItems({
				Recursive: true,
				IncludeItemTypes: itemTypesFor(policy),
				Limit: HIGH_RATING_SEED_LIMIT,
				Fields: PERSONAL_DETAIL_FIELDS,
				SortBy: 'DatePlayed',
				SortOrder: 'Descending',
				Filters: 'IsPlayed'
			});
			return (response?.Items || []).filter((item) => {
				const rating = Number(item?.UserData?.Rating);
				return Number.isFinite(rating) && rating >= 8;
			});
		} catch (_error) {
			return [];
		}
	}

	async _loadJellyfinSeeds(source, policy) {
		if (typeof this.api?.getItems !== 'function') return [];
		const history = source === 'history';
		const params = {
			Recursive: true,
			IncludeItemTypes: itemTypesFor(policy, history),
			Limit: SEED_LIMIT,
			Fields: PERSONAL_DETAIL_FIELDS
		};
		if (source === 'history') {
			params.SortBy = 'DatePlayed';
			params.SortOrder = 'Descending';
			params.Filters = 'IsPlayed';
		} else if (source === 'favourites') {
			params.SortBy = 'DatePlayed';
			params.SortOrder = 'Descending';
			params.Filters = 'IsFavorite';
		} else if (source === 'likes') {
			params.SortBy = 'DatePlayed';
			params.SortOrder = 'Descending';
			params.Filters = 'Likes';
		} else if (source === 'random') {
			params.SortBy = 'Random';
		} else {
			return [];
		}
		try {
			const response = await this.api.getItems(params);
			const items = response?.Items || [];
			return history ? await this._resolveHistoryEpisodes(items) : items;
		} catch (_error) {
			return [];
		}
	}

	async _resolveHistoryEpisodes(items) {
		const source = Array.isArray(items) ? items : [];
		const seriesIds = [];
		for (const item of source) {
			if (item?.Type === 'Episode' && item?.SeriesId && !seriesIds.includes(String(item.SeriesId))) seriesIds.push(String(item.SeriesId));
		}
		if (!seriesIds.length || typeof this.api?.getItems !== 'function') return source.filter(item => item?.Type !== 'Episode');
		let series = [];
		try {
			const response = await this.api.getItems({Ids: seriesIds.join(','), Fields: PERSONAL_DETAIL_FIELDS, Limit: seriesIds.length});
			series = response?.Items || [];
		} catch (_error) {
			series = [];
		}
		const byId = new Map(series.filter(item => item?.Id).map(item => [String(item.Id), item]));
		const output = [];
		const seenSeries = new Set();
		for (const item of source) {
			if (item?.Type !== 'Episode') {
				output.push(item);
				continue;
			}
			const seriesId = String(item?.SeriesId || '');
			if (!seriesId || seenSeries.has(seriesId)) continue;
			const resolved = byId.get(seriesId);
			if (resolved) {
				seenSeries.add(seriesId);
				output.push(resolved);
			}
		}
		return output;
	}

	async _loadWatchlistSeeds() {
		if (typeof this.seerr?.getWatchlist !== 'function') return [];
		try {
			const payload = await this.seerr.getWatchlist(1);
			return (payload?.results || []).map(candidateFromSeerr).filter(Boolean);
		} catch (_error) {
			return [];
		}
	}

	async _hydrateItems(items) {
		const source = Array.isArray(items) ? items : [];
		const ids = source.filter(item => item?.Id && !positiveTmdbId(item)).map(item => String(item.Id));
		if (!ids.length || typeof this.api?.getItems !== 'function') return source;
		try {
			const response = await this.api.getItems({Ids: ids.join(','), Fields: PERSONAL_DETAIL_FIELDS, Limit: ids.length});
			const detailed = new Map();
			for (const item of response?.Items || []) if (item?.Id) detailed.set(String(item.Id), item);
			return source.map(item => {
				const detail = item?.Id ? detailed.get(String(item.Id)) : null;
				return detail ? {...item, ...detail} : item;
			});
		} catch (_error) {
			return source;
		}
	}

	async _resolveOwned(items) {
		if (typeof this.api?.resolveItemsByProviderIds !== 'function') return items;
		try {
			return await this.api.resolveItemsByProviderIds(items);
		} catch (_error) {
			return items;
		}
	}

	_convert(items, section, policy) {
		const results = [];
		const seen = new Set();
		for (const candidate of items || []) {
			if (!matchesResultPolicy(candidate, policy)) continue;
			const item = toDiscoveryItem(candidate);
			if (!item) continue;
			const key = `${item.mediaType}:${item.id}`;
			if (seen.has(key)) continue;
			seen.add(key);
			results.push(item);
		}
		return results;
	}

	_displayTitle(section, policy, seed) {
		const name = String(seed?.Name || '').trim();
		if (!name) return personalDisplayTitle(section, policy);
		if (policy.source === 'favourites') return `More Like Favourite ${name}`;
		if (policy.source === 'watchlist') return 'Recommended from Your Watchlist';
		if (policy.source === 'likes') return `Because You Liked ${name}`;
		if (policy.source === 'high-ratings') return `Because You Rated ${name} Highly`;
		if (policy.source === 'positive') return section?.title || 'Recommended For You';
		if (policy.source === 'random') return personalDisplayTitle(section, policy);
		return `Because You Watched ${name}`;
	}
}

export const defaultHomeLabDiscoveryPersonalisation = new HomeLabDiscoveryPersonalisation();