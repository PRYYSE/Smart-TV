// Deterministic Discovery lane composer for the lightweight Smart-TV client.
// Keep this behaviour aligned with Moonfin-Core HomeLabDiscoveryComposer so the
// same server catalogue produces the same style of session across clients.

const PRIORITY_MULTIPLIERS = {
	anchor: 1000,
	high: 2,
	normal: 1,
	low: 0.5
};

const sectionPool = (section) => String(section?.pool || 'general');
const sectionPriority = (section) => String(section?.priority || 'normal');
const sectionWeight = (section) => {
	const value = Number(section?.weight ?? 1);
	return Number.isFinite(value) && value > 0 ? value : 1;
};
const cooldownSessions = (section) => {
	const value = Number(section?.cooldownSessions ?? 0);
	return Number.isInteger(value) && value >= 0 ? value : 0;
};

export const homeLabDiscoveryFnv1a32 = (input) => {
	let hash = 0x811c9dc5;
	const text = String(input || '');
	for (let i = 0; i < text.length; i += 1) {
		hash ^= text.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}
	return hash >>> 0;
};

export const homeLabDiscoveryRank = (section, {sessionSeed, refreshNonce = 0}) => {
	const hash = homeLabDiscoveryFnv1a32(`${sessionSeed}|${refreshNonce}|${section.id}`);
	const unit = (hash + 1) / 4294967297;
	const multiplier = PRIORITY_MULTIPLIERS[sectionPriority(section)] || 1;
	return -Math.log(unit) / (sectionWeight(section) * multiplier);
};

export const composeHomeLabDiscoveryTab = (tab, {
	sessionSeed,
	refreshNonce = 0,
	sessionsSinceSeen = {},
	isEligible
} = {}) => {
	const sections = Array.isArray(tab?.sections) ? tab.sections : [];
	if (!sections.length) return [];

	const requestedBudget = Number(tab.initialLaneBudget ?? 20);
	const budget = Math.max(1, Math.min(Number.isFinite(requestedBudget) ? Math.trunc(requestedBudget) : 20, sections.length));
	const eligible = sections.filter(section => typeof isEligible === 'function' ? isEligible(section) : true);
	if (!eligible.length) return [];

	const anchors = eligible.filter(section => sectionPriority(section) === 'anchor');
	const optional = eligible.filter(section => sectionPriority(section) !== 'anchor');
	const selected = [];
	const selectedIds = new Set();
	const poolCounts = {};
	const poolBudgets = tab.poolBudgets && typeof tab.poolBudgets === 'object' ? tab.poolBudgets : {};

	const add = (section) => {
		if (selected.length >= budget || selectedIds.has(section.id)) return;
		selectedIds.add(section.id);
		selected.push(section);
		const pool = sectionPool(section);
		poolCounts[pool] = (poolCounts[pool] || 0) + 1;
	};

	const poolHasRoom = (section) => {
		const pool = sectionPool(section);
		const rawLimit = poolBudgets[pool];
		if (rawLimit == null) return true;
		const limit = Number(rawLimit);
		return !Number.isFinite(limit) || (poolCounts[pool] || 0) < limit;
	};

	const coolingDown = (section) => {
		const cooldown = cooldownSessions(section);
		if (cooldown <= 0) return false;
		const age = sessionsSinceSeen?.[section.id];
		return age != null && Number(age) < cooldown;
	};

	const ranked = optional.slice().sort((a, b) => {
		const byScore = homeLabDiscoveryRank(a, {sessionSeed: String(sessionSeed || ''), refreshNonce}) -
			homeLabDiscoveryRank(b, {sessionSeed: String(sessionSeed || ''), refreshNonce});
		return byScore !== 0 ? byScore : String(a.id).localeCompare(String(b.id));
	});

	const leadAnchorCount = anchors.length > 6 ? 3 : anchors.length;
	const leadAnchors = anchors.slice(0, leadAnchorCount);
	const secondaryAnchors = anchors.slice(leadAnchorCount);
	leadAnchors.forEach(add);

	if (secondaryAnchors.length && optional.length) {
		const poolOrder = [];
		const seenPools = new Set();
		optional.forEach((section) => {
			const pool = sectionPool(section);
			if (!seenPools.has(pool)) {
				seenPools.add(pool);
				poolOrder.push(pool);
			}
		});

		const poolSeeds = [];
		poolOrder.forEach((pool) => {
			for (const section of ranked) {
				if (sectionPool(section) !== pool || coolingDown(section)) continue;
				poolSeeds.push(section);
				break;
			}
		});

		const frontWindow = Math.min(12, budget);
		let seedIndex = 0;
		let anchorIndex = 0;
		while (selected.length < frontWindow && (seedIndex < poolSeeds.length || anchorIndex < secondaryAnchors.length)) {
			if (seedIndex < poolSeeds.length) {
				const seed = poolSeeds[seedIndex++];
				if (!selectedIds.has(seed.id) && poolHasRoom(seed)) add(seed);
			}
			if (selected.length >= frontWindow) break;
			if (anchorIndex < secondaryAnchors.length) add(secondaryAnchors[anchorIndex++]);
		}
		for (; anchorIndex < secondaryAnchors.length; anchorIndex += 1) add(secondaryAnchors[anchorIndex]);
		for (; seedIndex < poolSeeds.length; seedIndex += 1) {
			const seed = poolSeeds[seedIndex];
			if (coolingDown(seed) || !poolHasRoom(seed)) continue;
			add(seed);
		}
	} else {
		secondaryAnchors.forEach(add);
	}

	for (const section of ranked) {
		if (selected.length >= budget) break;
		if (coolingDown(section) || !poolHasRoom(section)) continue;
		add(section);
	}

	const requestedMinimum = Number(tab.minimumLaneCount ?? 8);
	const minimumLaneCount = Math.max(1, Math.min(Number.isFinite(requestedMinimum) ? Math.trunc(requestedMinimum) : 8, budget));
	if (selected.length < minimumLaneCount) {
		for (const section of ranked) {
			if (selected.length >= budget || selected.length >= minimumLaneCount) break;
			if (!poolHasRoom(section)) continue;
			add(section);
		}
	}
	if (selected.length < minimumLaneCount) {
		for (const section of ranked) {
			if (selected.length >= budget || selected.length >= minimumLaneCount) break;
			add(section);
		}
	}

	return selected;
};
