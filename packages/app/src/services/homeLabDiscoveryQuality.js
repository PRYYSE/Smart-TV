const positiveInt = (value, fallback = 0) => {
	const number = Number(value);
	return Number.isInteger(number) && number > 0 ? number : fallback;
};

const mediaTypeFor = (item, fallback) => {
	const value = item?.mediaType || item?.media_type || fallback;
	if (value === 'movie') return 'movie';
	if (value === 'tv' || value === 'show' || value === 'series') return 'tv';
	return item?.title ? 'movie' : 'tv';
};

const identityFor = (item, fallbackMediaType) => {
	const raw = item?.id ?? item?.tmdbId;
	const id = Number(raw);
	if (!Number.isFinite(id) || id <= 0) return null;
	return `${mediaTypeFor(item, fallbackMediaType)}:${id}`;
};

const hasPoster = (item) => Boolean(item?.poster_path || item?.posterPath);
const hasBackdrop = (item) => Boolean(item?.backdrop_path || item?.backdropPath);
const isOwned = (item) => Boolean(String(item?.mediaInfo?.jellyfinMediaId || '').trim());

const ratio = (part, whole) => whole > 0 ? Number((part / whole).toFixed(3)) : 0;

export const analyseHomeLabDiscoveryQuality = (result) => {
	const lanes = Array.isArray(result?.usableLanes) ? result.usableLanes : [];
	const occurrences = new Map();
	const laneSummaries = [];
	let totalCards = 0;
	let missingIdentityCards = 0;
	let missingPosterCards = 0;
	let missingBackdropCards = 0;
	let ownedCards = 0;
	let repeatedCards = 0;
	let underfilledLaneCount = 0;

	for (const lane of lanes) {
		const section = lane?.section || {};
		const items = Array.isArray(lane?.items) ? lane.items : [];
		const previewLimit = positiveInt(section.previewLimit, items.length);
		let laneMissingPoster = 0;
		let laneRepeatedCards = 0;
		let laneMissingIdentity = 0;

		if (previewLimit > 0 && items.length < previewLimit) underfilledLaneCount += 1;

		for (const item of items) {
			totalCards += 1;
			const identity = identityFor(item, section?.query?.mediaType);
			if (!identity) {
				missingIdentityCards += 1;
				laneMissingIdentity += 1;
			} else {
				const previous = occurrences.get(identity) || 0;
				if (previous > 0) {
					repeatedCards += 1;
					laneRepeatedCards += 1;
				}
				occurrences.set(identity, previous + 1);
			}
			if (!hasPoster(item)) {
				missingPosterCards += 1;
				laneMissingPoster += 1;
			}
			if (!hasBackdrop(item)) missingBackdropCards += 1;
			if (isOwned(item)) ownedCards += 1;
		}

		laneSummaries.push({
			sectionId: section.id || 'unknown',
			itemCount: items.length,
			previewLimit,
			underfilled: previewLimit > 0 && items.length < previewLimit,
			missingPosterCards: laneMissingPoster,
			missingIdentityCards: laneMissingIdentity,
			repeatedFromEarlierLanes: laneRepeatedCards
		});
	}

	let duplicateDistinctItems = 0;
	for (const count of occurrences.values()) {
		if (count > 1) duplicateDistinctItems += 1;
	}

	return {
		laneCount: lanes.length,
		totalCards,
		uniqueCards: occurrences.size,
		repeatedCards,
		duplicateDistinctItems,
		duplicateRatio: ratio(repeatedCards, totalCards),
		missingIdentityCards,
		missingPosterCards,
		missingPosterRatio: ratio(missingPosterCards, totalCards),
		missingBackdropCards,
		ownedCards,
		ownedRatio: ratio(ownedCards, totalCards),
		underfilledLaneCount,
		hiddenLaneCount: Array.isArray(result?.hiddenLanes) ? result.hiddenLanes.length : 0,
		failedLaneCount: Array.isArray(result?.failedLanes) ? result.failedLanes.length : 0,
		refreshFailure: Boolean(result?.refreshFailure),
		laneSummaries
	};
};
