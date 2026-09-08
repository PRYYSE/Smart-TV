import {buildHomeLabDiscoveryPlan, isHomeLabDiscoveryQueryExecutable} from './homeLabDiscoveryPlanner';
import {executeHomeLabDiscoveryPlan} from './homeLabDiscoveryClient';
import {includeHomeLabDiscoveryItem} from './homeLabDiscoveryMembership';
import {defaultHomeLabDiscoveryPersonalisation} from './homeLabDiscoveryPersonalisation';

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
		totalResults: Math.max(0, Number(source.totalResults ?? source.total_results ?? results.length) || 0),
		displayTitle: source.displayTitle || null
	};
};

export const isHomeLabDiscoverySectionExecutable = (
	section,
	{personalisation = defaultHomeLabDiscoveryPersonalisation} = {}
) => {
	if (section?.query?.source === 'personalised') {
		if (!personalisation || typeof personalisation.load !== 'function') return false;
		return typeof personalisation.supports === 'function' ? personalisation.supports(section) : true;
	}
	return isHomeLabDiscoveryQueryExecutable(section);
};

const applyMembershipAndDedup = (section, loaded, {blockNsfw}) => {
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

export const loadHomeLabDiscoveryPage = async ({
	section,
	page = 1,
	serverUrl,
	accessToken,
	blockNsfw = true,
	now = new Date(),
	executePlan = executeHomeLabDiscoveryPlan,
	personalisation = defaultHomeLabDiscoveryPersonalisation,
	forceRefresh = false
}) => {
	const safePage = positiveInt(page, 1);
	if (section?.query?.source === 'personalised') {
		if (!personalisation || typeof personalisation.load !== 'function' || (typeof personalisation.supports === 'function' && !personalisation.supports(section))) {
			throw new Error(`Discovery section ${section?.id || 'unknown'} has no supported personalisation source on webOS`);
		}
		const personalisedPayload = await personalisation.load(section, {
			page: safePage,
			forceRefresh: forceRefresh && safePage === 1
		});
		return applyMembershipAndDedup(
			section,
			normaliseHomeLabDiscoveryPage(personalisedPayload, safePage),
			{blockNsfw}
		);
	}

	const plan = buildHomeLabDiscoveryPlan(section, safePage, now);
	if (!plan) throw new Error(`Discovery section ${section?.id || 'unknown'} is not executable on webOS`);
	const raw = await executePlan({serverUrl, accessToken, plan});
	return applyMembershipAndDedup(
		section,
		normaliseHomeLabDiscoveryPage(raw, safePage),
		{blockNsfw}
	);
};

export const loadHomeLabDiscoveryLane = async ({
	section,
	serverUrl,
	accessToken,
	blockNsfw = true,
	maxPagesPerScan = 6,
	now = new Date(),
	executePlan = executeHomeLabDiscoveryPlan,
	personalisation = defaultHomeLabDiscoveryPersonalisation,
	forceRefresh = false
}) => {
	const previewLimit = positiveInt(section?.previewLimit, 20);
	const minItems = positiveInt(section?.minItems, 8);
	const scanLimit = positiveInt(maxPagesPerScan, 6);
	const items = [];
	const seen = new Set();
	let throughPage = 0;
	let totalPages = 0;
	let displayTitle = null;

	try {
		for (let page = 1; page <= scanLimit && items.length < previewLimit; page += 1) {
			const loaded = await loadHomeLabDiscoveryPage({
				section,
				page,
				serverUrl,
				accessToken,
				blockNsfw,
				now,
				executePlan,
				personalisation,
				forceRefresh: forceRefresh && page === 1
			});
			throughPage = loaded.page;
			totalPages = loaded.totalPages;
			displayTitle = loaded.displayTitle || displayTitle;
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
			displayTitle,
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
			displayTitle,
			items: [],
			throughPage,
			totalPages,
			isUsable: false,
			shouldHide: false,
			error
		};
	}
};