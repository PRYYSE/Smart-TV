const SUPPORTED_SCHEMA_VERSIONS = new Set([1, 2]);
const CATALOGUE_PATH = '/Moonfin/Web/homelab/discovery.catalogue.json';
const CACHE_PREFIX = 'moonfin.homelab.discovery.catalogue.v2.';

const QUERY_SOURCES = new Set([
	'discoverMovies',
	'discoverTv',
	'trending',
	'upcomingMovies',
	'upcomingTv',
	'watchlist',
	'personalised',
	'externalList'
]);

const PRESENTATIONS = new Set(['carousel', 'grid']);
const PRIORITIES = new Set(['anchor', 'high', 'normal', 'low']);
const AVAILABILITY_MODES = new Set(['all', 'requestable', 'available', 'requested', 'notOwned', 'unwatched']);

const isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
const nonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;

const normaliseBaseUrl = (baseUrl) => String(baseUrl || '').replace(/\/+$/, '');

export const homeLabDiscoveryCatalogueUrl = (baseUrl) => {
	const normalized = normaliseBaseUrl(baseUrl);
	return normalized ? `${normalized}${CATALOGUE_PATH}` : null;
};

export const homeLabDiscoveryCatalogueCacheKey = (baseUrl) =>
	`${CACHE_PREFIX}${encodeURIComponent(normaliseBaseUrl(baseUrl))}`;

const validateQuery = (query, sectionId) => {
	if (!isObject(query)) throw new Error(`Discovery section ${sectionId} query must be an object`);
	if (!QUERY_SOURCES.has(query.source)) throw new Error(`Discovery section ${sectionId} has unsupported source`);
	if (!nonEmptyString(query.mediaType)) throw new Error(`Discovery section ${sectionId} mediaType is required`);
	if (query.filters != null && !isObject(query.filters)) throw new Error(`Discovery section ${sectionId} filters must be an object`);
	['keywordNames', 'excludeKeywordNames', 'providerNames'].forEach((field) => {
		if (query[field] != null && !Array.isArray(query[field])) {
			throw new Error(`Discovery section ${sectionId} ${field} must be an array`);
		}
	});
};

const validateSection = (section, sectionIds) => {
	if (!isObject(section)) throw new Error('Discovery section must be an object');
	if (!nonEmptyString(section.id) || !nonEmptyString(section.title)) throw new Error('Discovery section id/title are required');
	if (sectionIds.has(section.id)) throw new Error(`Duplicate Discovery section id: ${section.id}`);
	sectionIds.add(section.id);
	validateQuery(section.query, section.id);

	const previewLimit = section.previewLimit == null ? 20 : Number(section.previewLimit);
	const minItems = section.minItems == null ? 8 : Number(section.minItems);
	if (!isPositiveInteger(previewLimit) || previewLimit > 100) throw new Error(`Invalid previewLimit for ${section.id}`);
	if (!isPositiveInteger(minItems) || minItems > previewLimit) throw new Error(`Invalid minItems for ${section.id}`);
	if (section.presentation != null && !PRESENTATIONS.has(section.presentation)) throw new Error(`Invalid presentation for ${section.id}`);
	if (section.priority != null && !PRIORITIES.has(section.priority)) throw new Error(`Invalid priority for ${section.id}`);
	if (section.availabilityMode != null && !AVAILABILITY_MODES.has(section.availabilityMode)) throw new Error(`Invalid availabilityMode for ${section.id}`);
	if (section.pool != null && !nonEmptyString(section.pool)) throw new Error(`Invalid pool for ${section.id}`);
	if (section.weight != null && (!Number.isFinite(Number(section.weight)) || Number(section.weight) <= 0)) throw new Error(`Invalid weight for ${section.id}`);
	if (section.cooldownSessions != null && (!Number.isInteger(Number(section.cooldownSessions)) || Number(section.cooldownSessions) < 0)) throw new Error(`Invalid cooldownSessions for ${section.id}`);
};

export const validateHomeLabDiscoveryCatalogue = (catalogue) => {
	if (!isObject(catalogue)) throw new Error('Discovery catalogue root must be an object');
	if (!SUPPORTED_SCHEMA_VERSIONS.has(Number(catalogue.schemaVersion))) {
		throw new Error(`Unsupported Discovery schemaVersion: ${catalogue.schemaVersion}`);
	}
	if (!Array.isArray(catalogue.tabs) || catalogue.tabs.length === 0) throw new Error('Discovery catalogue must contain tabs');
	if (catalogue.generatedAt != null && Number.isNaN(Date.parse(catalogue.generatedAt))) throw new Error('Discovery generatedAt must be ISO-8601');
	if (catalogue.minimumDiscoveryCapability != null && !Number.isFinite(Number(catalogue.minimumDiscoveryCapability))) {
		throw new Error('Discovery minimumDiscoveryCapability must be numeric');
	}

	const tabIds = new Set();
	const sectionIds = new Set();
	catalogue.tabs.forEach((tab) => {
		if (!isObject(tab) || !nonEmptyString(tab.id) || !nonEmptyString(tab.title)) throw new Error('Discovery tab id/title are required');
		if (tabIds.has(tab.id)) throw new Error(`Duplicate Discovery tab id: ${tab.id}`);
		tabIds.add(tab.id);
		if (!Array.isArray(tab.sections)) throw new Error(`Discovery tab ${tab.id} sections must be an array`);

		const initialLaneBudget = tab.initialLaneBudget == null ? 20 : Number(tab.initialLaneBudget);
		const minimumLaneCount = tab.minimumLaneCount == null ? 8 : Number(tab.minimumLaneCount);
		if (!isPositiveInteger(initialLaneBudget) || initialLaneBudget > 100) throw new Error(`Invalid initialLaneBudget for ${tab.id}`);
		if (!isPositiveInteger(minimumLaneCount) || minimumLaneCount > initialLaneBudget) throw new Error(`Invalid minimumLaneCount for ${tab.id}`);
		if (tab.poolBudgets != null && !isObject(tab.poolBudgets)) throw new Error(`Invalid poolBudgets for ${tab.id}`);
		if (isObject(tab.poolBudgets)) {
			Object.keys(tab.poolBudgets).forEach((key) => {
				const value = Number(tab.poolBudgets[key]);
				if (!key || !Number.isInteger(value) || value < 0) throw new Error(`Invalid pool budget for ${tab.id}`);
			});
		}
		tab.sections.forEach((section) => validateSection(section, sectionIds));
	});
	return catalogue;
};

const safeStorageRead = (storage, key) => {
	try { return storage && typeof storage.getItem === 'function' ? storage.getItem(key) : null; } catch (_) { return null; }
};

const safeStorageWrite = (storage, key, value) => {
	try {
		if (storage && typeof storage.setItem === 'function') storage.setItem(key, value);
	} catch (_) {
		// Persistence is best-effort. A full/disabled localStorage must not break Discovery.
	}
};

const decodeCatalogue = (raw) => {
	const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
	return validateHomeLabDiscoveryCatalogue(parsed);
};

export const loadHomeLabDiscoveryCatalogue = async ({
	serverUrl,
	accessToken,
	fetchImpl,
	storage
}) => {
	const url = homeLabDiscoveryCatalogueUrl(serverUrl);
	if (!url) return {catalogue: null, source: 'unavailable', networkError: new Error('Server URL required')};
	const cacheKey = homeLabDiscoveryCatalogueCacheKey(serverUrl);
	const actualFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
	const actualStorage = storage === undefined && typeof localStorage !== 'undefined' ? localStorage : storage;
	let networkError = null;

	if (actualFetch) {
		try {
			const headers = {'Accept': 'application/json'};
			if (accessToken) headers.Authorization = `MediaBrowser Token="${accessToken}"`;
			const response = await actualFetch(url, {method: 'GET', headers});
			if (!response || !response.ok) throw new Error(`Discovery catalogue HTTP ${response ? response.status : 'unknown'}`);
			const raw = await response.text();
			const catalogue = decodeCatalogue(raw);
			safeStorageWrite(actualStorage, cacheKey, raw);
			return {catalogue, source: 'network', networkError: null, cacheError: null};
		} catch (error) {
			networkError = error;
		}
	} else {
		networkError = new Error('Fetch is unavailable');
	}

	let cacheError = null;
	try {
		const raw = safeStorageRead(actualStorage, cacheKey);
		if (raw && String(raw).trim()) {
			return {catalogue: decodeCatalogue(raw), source: 'cache', networkError, cacheError: null};
		}
	} catch (error) {
		cacheError = error;
	}

	return {catalogue: null, source: 'unavailable', networkError, cacheError};
};
