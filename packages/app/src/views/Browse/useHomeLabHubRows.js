import {useEffect, useState} from 'react';
import $L from '@enact/i18n/$L';

import {HOME_ROW_ITEM_FIELDS} from '../../services/jellyfinApi';
import seerrApi from '../../services/seerrApi';
import {fetchSeerrHomeRow, normalizeMediaItem} from '../../utils/seerrHomeRows';

const HUBS = ['movies', 'tv', 'anime'];
const ROW_LIMIT = 20;
const LIBRARY_LIMIT = 120;

const asItems = (value) => Array.isArray(value) ? value : (value?.Items || []);
const lowerName = (library) => String(library?.Name || '').trim().toLowerCase();
const collectionType = (library) => String(library?.CollectionType || '').toLowerCase();

const selectLibraries = (libraries, hub) => {
	if (hub === 'movies') {
		const exact = libraries.filter((library) => lowerName(library) === 'movies');
		if (exact.length) return exact;
		return libraries.filter((library) => collectionType(library) === 'movies' && lowerName(library).indexOf('anime') === -1);
	}

	if (hub === 'tv') {
		const exact = libraries.filter((library) => lowerName(library) === 'tv');
		if (exact.length) return exact;
		return libraries.filter((library) => collectionType(library) === 'tvshows' && lowerName(library).indexOf('anime') === -1);
	}

	if (hub === 'anime') {
		const exactNames = ['anime', 'anime movies'];
		return libraries.filter((library) => exactNames.indexOf(lowerName(library)) !== -1);
	}

	return [];
};

const isJapanese = (item) => {
	const language = item?.original_language || item?.originalLanguage || '';
	const countries = item?.origin_country || item?.originCountry || [];
	return language === 'ja' || (Array.isArray(countries) && countries.indexOf('JP') !== -1);
};

const isAnimation = (item) => {
	const genres = item?.genre_ids || item?.genreIds || [];
	return Array.isArray(genres) && (genres.indexOf(16) !== -1 || genres.indexOf('16') !== -1);
};

const uniqueMedia = (items) => {
	const seen = {};
	return items.filter((item) => {
		if (!item?.id) return false;
		const key = `${item.media_type || (item.title ? 'movie' : 'tv')}-${item.id}`;
		if (seen[key]) return false;
		seen[key] = true;
		return true;
	});
};

const makeSeerrRow = (id, title, items, type = 'portrait', extra = {}) => ({
	id,
	title,
	items,
	type,
	isSeerrRow: true,
	...extra
});

const fetchAnimeDiscoveryRows = async () => {
	try {
		const [tv1, tv2, movie1, movie2, upcomingTv, upcomingMovies] = await Promise.all([
			seerrApi.discoverByGenre('tv', 16, 1),
			seerrApi.discoverByGenre('tv', 16, 2),
			seerrApi.discoverByGenre('movie', 16, 1),
			seerrApi.discoverByGenre('movie', 16, 2),
			seerrApi.upcomingTv(1),
			seerrApi.upcomingMovies(1)
		]);

		const popularSeries = uniqueMedia([
			...(tv1?.results || []),
			...(tv2?.results || [])
		]).filter(isJapanese).slice(0, ROW_LIMIT).map(normalizeMediaItem);

		const animeMovies = uniqueMedia([
			...(movie1?.results || []),
			...(movie2?.results || [])
		]).filter(isJapanese).slice(0, ROW_LIMIT).map(normalizeMediaItem);

		const upcomingAnime = uniqueMedia([
			...(upcomingTv?.results || []),
			...(upcomingMovies?.results || [])
		]).filter((item) => isJapanese(item) && isAnimation(item)).slice(0, ROW_LIMIT).map(normalizeMediaItem);

		return [
			popularSeries.length ? makeSeerrRow('homelab-anime-popular', $L('Popular Anime'), popularSeries) : null,
			animeMovies.length ? makeSeerrRow('homelab-anime-movies-discovery', $L('Anime Movies'), animeMovies) : null,
			upcomingAnime.length ? makeSeerrRow('homelab-anime-upcoming', $L('Upcoming Anime'), upcomingAnime) : null
		].filter(Boolean);
	} catch (error) {
		console.warn('[HomeLabHub] Anime discovery failed:', error?.message || error);
		return [];
	}
};

const fetchStandardDiscoveryRows = async (hub) => {
	const configIds = hub === 'movies'
		? ['popularMovies', 'upcomingMovies', 'genreMovies', 'studios']
		: ['popularTv', 'upcomingTv', 'genreTv', 'networks'];

	const rows = await Promise.all(configIds.map(async (configId) => {
		const items = await fetchSeerrHomeRow(configId);
		if (!items.length) return null;

		const config = {
			popularMovies: {title: $L('Popular Movies'), type: 'portrait'},
			upcomingMovies: {title: $L('Upcoming Movies'), type: 'portrait'},
			genreMovies: {title: $L('Browse Movies by Genre'), type: 'landscape', isTileRow: true},
			studios: {title: $L('Browse by Studio'), type: 'logo', isTileRow: true},
			popularTv: {title: $L('Popular TV Shows'), type: 'portrait'},
			upcomingTv: {title: $L('Upcoming TV Shows'), type: 'portrait'},
			genreTv: {title: $L('Browse TV by Genre'), type: 'landscape', isTileRow: true},
			networks: {title: $L('Browse by Network'), type: 'logo', isTileRow: true}
		}[configId];

		return makeSeerrRow(`homelab-${hub}-${configId}`, config.title, items, config.type, {isTileRow: config.isTileRow === true});
	}));

	return rows.filter(Boolean);
};

const fetchLocalRows = async (api, hub, nextUpMaxDays) => {
	const librariesResult = await api.getLibraries();
	const libraries = asItems(librariesResult);
	const targets = selectLibraries(libraries, hub);
	if (!targets.length) return [];

	const targetData = await Promise.all(targets.map(async (library) => {
		const type = collectionType(library);
		const includeItemTypes = type === 'tvshows' ? 'Series' : 'Movie';
		const [allResult, latestResult] = await Promise.all([
			api.getItems({
				ParentId: library.Id,
				Recursive: true,
				IncludeItemTypes: includeItemTypes,
				SortBy: 'SortName',
				SortOrder: 'Ascending',
				Limit: LIBRARY_LIMIT,
				Fields: HOME_ROW_ITEM_FIELDS
			}).catch(() => ({Items: []})),
			api.getLatest(library.Id, ROW_LIMIT).catch(() => [])
		]);

		return {
			library,
			items: asItems(allResult),
			latest: asItems(latestResult),
			includeItemTypes
		};
	}));

	const seriesIds = {};
	const movieIds = {};
	targetData.forEach(({includeItemTypes, items}) => {
		items.forEach((item) => {
			if (includeItemTypes === 'Series') seriesIds[item.Id] = true;
			if (includeItemTypes === 'Movie') movieIds[item.Id] = true;
		});
	});

	const [resumeResult, nextUpResult] = await Promise.all([
		api.getResumeItems(80).catch(() => ({Items: []})),
		hub === 'movies'
			? Promise.resolve({Items: []})
			: api.getNextUp(80, null, nextUpMaxDays || 0).catch(() => ({Items: []}))
	]);

	const resumeItems = asItems(resumeResult).filter((item) => {
		if (item.Type === 'Movie') return movieIds[item.Id] === true;
		if (item.Type === 'Episode') return seriesIds[item.SeriesId] === true;
		return false;
	});
	const resumeIds = {};
	resumeItems.forEach((item) => { resumeIds[item.Id] = true; });

	const nextUpItems = asItems(nextUpResult).filter((item) => seriesIds[item.SeriesId] === true && !resumeIds[item.Id]);
	const rows = [];

	if (resumeItems.length) {
		rows.push({
			id: `homelab-${hub}-resume`,
			title: $L('Continue Watching'),
			items: resumeItems.slice(0, ROW_LIMIT),
			type: 'landscape'
		});
	}

	if (nextUpItems.length) {
		rows.push({
			id: `homelab-${hub}-nextup`,
			title: $L('Next Up'),
			items: nextUpItems.slice(0, ROW_LIMIT),
			type: 'landscape'
		});
	}

	return {rows, targetData};
};

const appendLocalLibraryRows = (rows, hub, targetData) => {
	targetData.forEach(({library, items, latest}) => {
		const name = String(library.Name || 'Library');
		if (latest.length) {
			rows.push({
				id: `homelab-${hub}-latest-${library.Id}`,
				title: $L('Recently Added in {libraryTitle}').replace('{libraryTitle}', name),
				items: latest.slice(0, ROW_LIMIT),
				type: 'portrait'
			});
		}
	});

	targetData.forEach(({library, items}) => {
		if (!items.length) return;
		rows.push({
			id: `homelab-${hub}-library-${library.Id}`,
			title: library.Name,
			items,
			type: 'portrait'
		});
	});
};

const useHomeLabHubRows = ({hub, api, seerrEnabled, seerrAuthenticated, nextUpMaxDays}) => {
	const [rows, setRows] = useState([]);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (HUBS.indexOf(hub) === -1 || !api) {
			setRows([]);
			setIsLoading(false);
			return undefined;
		}

		let cancelled = false;
		setIsLoading(true);

		(async () => {
			try {
				const local = await fetchLocalRows(api, hub, nextUpMaxDays);
				if (cancelled) return;

				const builtRows = Array.isArray(local) ? [] : [...local.rows];
				if (seerrEnabled && seerrAuthenticated) {
					const discoveryRows = hub === 'anime'
						? await fetchAnimeDiscoveryRows()
						: await fetchStandardDiscoveryRows(hub);
					if (cancelled) return;
					builtRows.push(...discoveryRows);
				}

				if (!Array.isArray(local)) {
					appendLocalLibraryRows(builtRows, hub, local.targetData);
				}
				if (!cancelled) setRows(builtRows);
			} catch (error) {
				console.warn(`[HomeLabHub] Failed to build ${hub} hub:`, error?.message || error);
				if (!cancelled) setRows([]);
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [hub, api, seerrEnabled, seerrAuthenticated, nextUpMaxDays]);

	return {rows, isLoading};
};

export default useHomeLabHubRows;
