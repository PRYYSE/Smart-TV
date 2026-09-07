import {buildHomeLabDiscoveryPlan} from './homeLabDiscoveryPlanner';
import {executeHomeLabDiscoveryPlan} from './homeLabDiscoveryClient';
import {includeHomeLabDiscoveryItem} from './homeLabDiscoveryMembership';

const positiveInt = (value, fallback) => {
	const number = Number(value);
	return Number.isInteger(number) && number > 0 ? number : fallback;
};

const itemKey = (item, fallbackMediaType) => {
	const id = item?.id ?? item?.tmdbId;
	if (id == null) return null;
	const mediaType = item?.mediaType || item?.media_type || fallbackMediaType || 'unknown';
	return `${mediaType}:${id}`;
};

export const normaliseHomeLabDiscoveryPage = (payload, fallbackPage = 1) => {
	const source = payload && typeof payload === 'object' ? payload : {};
	const results = Array.isArray(source.results) ? source.results : [];
	return {
		results,
		page: positiveInt(source.page, fallbackPage),
		totalPages: Math.max(0, Number(source.totalPages ?? source.total_pages ?? 0) || 0),
		totalResults: Math.max(0, Number(source.totalResults ?? source.total_results ?? results.length) || 0)
	};
};

export const loadHomeLabDiscoveryPage = async ({
	section,
	page = 1,
	serverUrl,
	accessToken,
	blockNsfw = true,
	now = new Date(),
	executePlan = executeHomeLabDiscoveryPlan
}) => {
	const safePage = positiveInt(page, 1);
	const plan = buildHomeLabDiscoveryPlan(section, safePage, now);
	if (!plan) throw new Error(`Discovery section ${section?.id || 'unknown'} is not executable on webOS`);
	const raw = await executePlan({serverUrl, accessToken, plan});
	const loaded = normaliseHomeLabDiscoveryPage(raw, safePage);
	const seen = new Set();
	const results = [];
	for (const item of loaded.results) {
		if (!includeHomeLabDiscoveryItem(item, section?.availabilityMode || 'all', {blockNsfw})) continue;
		const key = itemKey(item, section?.query?.mediaType);
		if (!key || seen.has(key)) continue;
		seen.add(key);
		results.push(item);
	}
	return {...loaded, results};
};

export const loadHomeLabDiscoveryLane = async ({
	section,
	serverUrl,
	accessToken,
	blockNsfw = true,
	maxPagesPerScan = 6,
	now = new Date(),
	executePlan = executeHomeLabDiscoveryPlan
}) => {
	const previewLimit = positiveInt(section?.previewLimit, 20);
	const minItems = positiveInt(section?.minItems, 8);
	const scanLimit = positiveInt(maxPagesPerScan, 6);
	const items = [];
	const seen = new Set();
	let throughPage = 0;
	let totalPages = 0;

	try {
		for (let page = 1; page <= scanLimit && items.length < previewLimit; page += 1) {
			const loaded = await loadHomeLabDiscoveryPage({
				section,
				page,
				serverUrl,
				accessToken,
				blockNsfw,
				now,
				executePlan
			});
			throughPage = loaded.page;
			totalPages = loaded.totalPages;
			for (const item of loaded.results) {
				const key = itemKey(item, section?.query?.mediaType);
				if (!key || seen.has(key)) continue;
				seen.add(key);
				items.push(item);
				if (items.length >= previewLimit) break;
			}
			if (loaded.totalPages > 0 && loaded.page >= loaded.totalPages) break;
			if (!loaded.results.length && loaded.totalPages <= loaded.page) break;
		}
		return {
			section,
			items,
			throughPage,
			totalPages,
			isUsable: items.length >= minItems,
			shouldHide: items.length < minItems,
			error: null
		};
	} catch (error) {
		return {
			section,
			items: [],
			throughPage,
			totalPages,
			isUsable: false,
			shouldHide: false,
			error
		};
	}
};
