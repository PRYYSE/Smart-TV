import {loadSinceYouWatchedRows} from './homeRecommendations';
import {
	HOME_ROW_ITEM_FIELDS,
	api as defaultJellyfinApi,
	getServerUrl,
	getUserId
} from './jellyfinApi';

const PAGE_SIZE = 15;
const PERSONAL_DETAIL_FIELDS = `${HOME_ROW_ITEM_FIELDS},Tags,People,Studios,ProductionLocations,OriginalLanguage`;
const DIRECT_SLOTS = Object.freeze({
	'recent-history': 1,
	'favourites': 2,
	'watchlist': 3,
	'high-ratings': 4,
	'likes': 5,
	'mixed-positive': 6,
	'highly-rated-unseen': 7,
	'novelty': 8,
	'movie-affinity': 9,
	'series-affinity': 10,
	'anime-affinity': 11,
	'short-runtime-affinity': 12,
	'older-affinity': 13,
	'recent-affinity': 14,
	'rewatch': 15,
	'recent-discovery-context': 16
});

const normalisedList = (value) => (
	Array.isArray(value)
		? value.map((entry) => String((entry?.Name ?? entry) || '').trim().toLowerCase()).filter(Boolean)
		: []
);

const positiveTmdbId = (item) => {
	const providerIds = item?.ProviderIds || {};
	const raw = providerIds.Tmdb ?? providerIds.TMDB ?? providerIds.tmdb;
	const id = Number(raw);
	return Number.isInteger(id) && id > 0 ? id : null;
};

const mediaTypeFor = (item) => {
	if (item?.Type === 'Movie') return 'movie';
	if (item?.Type === 'Series') return 'tv';
	return null;
};

export const homeLabDiscoveryPersonalSlot = (section) => {
	const strategy = String(section?.query?.seedStrategy || '').trim().toLowerCase();
	if (DIRECT_SLOTS[strategy]) return DIRECT_SLOTS[strategy];
	const input = `${section?.id || ''}|${strategy}`;
	let hash = 0;
	for (let index = 0; index < input.length; index += 1) {
		hash = ((hash * 31) + input.charCodeAt(index)) & 0x7fffffff;
	}
	return (hash % 16) + 1;
};

export const isHomeLabDiscoveryAnimeItem = (item) => {
	const tags = normalisedList(item?.Tags);
	if (tags.includes('anime')) return true;
	const genres = normalisedList(item?.Genres);
	if (genres.includes('anime')) return true;
	if (!genres.includes('animation')) return false;
	const language = String(item?.OriginalLanguage || '').trim().toLowerCase();
	const locations = normalisedList(item?.ProductionLocations);
	return language === 'ja' || language === 'jpn' || language === 'japanese' || locations.includes('japan');
};

const sectionRequiresAnime = (section) => {
	const tags = normalisedList(section?.tags);
	const strategy = String(section?.query?.seedStrategy || '').trim().toLowerCase();
	return tags.includes('anime') || strategy.startsWith('anime') || String(section?.id || '').toLowerCase().startsWith('anime');
};

const matchesSection = (section, item) => {
	const mediaType = mediaTypeFor(item);
	if (!mediaType) return false;
	const requestedType = section?.query?.mediaType;
	if (requestedType && mediaType !== requestedType) return false;
	if (sectionRequiresAnime(section) && !isHomeLabDiscoveryAnimeItem(item)) return false;
	return true;
};

const toDiscoveryItem = (item) => {
	const tmdbId = positiveTmdbId(item);
	const mediaType = mediaTypeFor(item);
	if (!tmdbId || !mediaType) return null;
	const rating = Number(item?.CommunityRating);
	return {
		id: tmdbId,
		mediaType,
		title: mediaType === 'movie' ? (item?.Name || null) : null,
		name: mediaType === 'tv' ? (item?.Name || null) : null,
		originalTitle: item?.OriginalTitle || null,
		overview: item?.Overview || null,
		posterPath: null,
		backdropPath: null,
		voteAverage: Number.isFinite(rating) ? rating : null,
		isAdult: false,
		mediaInfo: {
			status: 5,
			jellyfinMediaId: item?.Id || null
		}
	};
};

const sourceTypeFor = (section) => {
	if (section?.query?.mediaType === 'tv') return 'shows';
	if (section?.query?.mediaType === 'movie') return 'movies';
	return 'both';
};

const settingsFor = (section) => ({
	sinceYouWatchedSource: 'local',
	sinceYouWatchedSourceItem: 'recentlyWatched',
	sinceYouWatchedSourceType: sourceTypeFor(section),
	sinceYouWatchedIncludeWatched: String(section?.query?.seedStrategy || '').toLowerCase() === 'rewatch'
});

export class HomeLabDiscoveryPersonalisation {
	constructor({
		api = defaultJellyfinApi,
		rowsLoader = loadSinceYouWatchedRows,
		identity = () => `${getServerUrl() || 'server'}|${getUserId() || 'user'}`,
		pageSize = PAGE_SIZE
	} = {}) {
		this.api = api;
		this.rowsLoader = rowsLoader;
		this.identity = identity;
		this.pageSize = Math.max(1, Number(pageSize) || PAGE_SIZE);
		this.cache = new Map();
	}

	async load(section, {page = 1, forceRefresh = false} = {}) {
		const safePage = Math.max(1, Number(page) || 1);
		const strategy = String(section?.query?.seedStrategy || 'personalised');
		const cacheKey = `${this.identity()}|${section?.id || 'section'}|${strategy}|${section?.query?.mediaType || 'any'}`;
		if (forceRefresh) this.cache.delete(cacheKey);
		let cached = this.cache.get(cacheKey);
		if (!cached) {
			cached = this._loadRow(section);
			this.cache.set(cacheKey, cached);
		}
		let row;
		try {
			row = await cached;
		} catch (error) {
			this.cache.delete(cacheKey);
			throw error;
		}
		const totalResults = row.items.length;
		const totalPages = Math.max(1, Math.ceil(totalResults / this.pageSize));
		const start = (safePage - 1) * this.pageSize;
		return {
			page: safePage,
			totalPages,
			totalResults,
			displayTitle: row.displayTitle,
			results: safePage <= totalPages ? row.items.slice(start, start + this.pageSize) : []
		};
	}

	clear() {
		this.cache.clear();
	}

	async _loadRow(section) {
		const slot = homeLabDiscoveryPersonalSlot(section);
		const rows = await this.rowsLoader(this.api, settingsFor(section), [slot], false);
		const row = Array.isArray(rows) ? rows[0] : null;
		const hydrated = await this._hydrateItems(row?.items || []);
		const items = [];
		const seen = new Set();
		for (const candidate of hydrated) {
			if (!matchesSection(section, candidate)) continue;
			const item = toDiscoveryItem(candidate);
			if (!item) continue;
			const key = `${item.mediaType}:${item.id}`;
			if (seen.has(key)) continue;
			seen.add(key);
			items.push(item);
		}
		const seedName = String(row?.seedName || '').trim();
		return {
			displayTitle: seedName ? `Because You Watched ${seedName}` : (section?.title || 'For You'),
			items
		};
	}

	async _hydrateItems(items) {
		const source = Array.isArray(items) ? items : [];
		const ids = source
			.filter(item => item?.Id && !positiveTmdbId(item))
			.map(item => String(item.Id));
		if (!ids.length || typeof this.api?.getItems !== 'function') return source;
		try {
			const response = await this.api.getItems({
				Ids: ids.join(','),
				Fields: PERSONAL_DETAIL_FIELDS,
				Limit: ids.length
			});
			const detailed = new Map();
			for (const item of response?.Items || []) {
				if (item?.Id) detailed.set(String(item.Id), item);
			}
			return source.map(item => {
				const detail = item?.Id ? detailed.get(String(item.Id)) : null;
				return detail ? {...item, ...detail} : item;
			});
		} catch (_error) {
			return source;
		}
	}
}

export const defaultHomeLabDiscoveryPersonalisation = new HomeLabDiscoveryPersonalisation();
