// Which Seerr title a library item stands for.
//
// Only movies and series have a counterpart. An episode or a season resolves through its series
// page instead, where the per-season markers say what is actually available.
//
// The id has to come out as a number. Jellyfin keeps provider ids as strings, while Seerr puts
// this straight into a request body and turns away anything that isn't a number.

export const IDLE = {mediaId: null, mediaType: null};

const localMediaId = (value) => {
	const id = String(value == null ? '' : value).trim();
	return id || null;
};

// Discovery normally routes by TMDB id, but provider-id reconciliation can also prove that
// the title already exists in Jellyfin. Keep that local identity attached to the selection so
// the detail screen can open the real Jellyfin item rather than a non-playable Seerr stub.
export const seerrSelectionMediaId = ({tmdbId, jellyfinMediaId} = {}) => {
	const localId = localMediaId(jellyfinMediaId);
	return localId ? {tmdbId, jellyfinMediaId: localId} : tmdbId;
};

// How a Seerr title reaches the detail screen. A structured Discovery selection with a known
// Jellyfin id opens the real library item. Otherwise preserve the current Seerr-only identity,
// including the upstream IMDb/title fallback for external rows that do not have a TMDB id yet.
export const seerrDetailStub = ({mediaId, mediaType, imdbId, title}) => {
	const structured = mediaId && typeof mediaId === 'object' ? mediaId : null;
	const jellyfinMediaId = localMediaId(structured?.jellyfinMediaId);
	const resolvedType = mediaType === 'tv' ? 'Series' : 'Movie';
	if (jellyfinMediaId) {
		return {
			Id: jellyfinMediaId,
			Type: resolvedType
		};
	}

	const tmdbId = structured ? structured.tmdbId : mediaId;
	return {
		Id: `seerr-${mediaType}-${tmdbId ?? imdbId}`,
		Type: resolvedType,
		_seerrMediaId: tmdbId ?? null,
		_seerrMediaType: mediaType,
		_seerrImdbId: imdbId || null,
		_seerrTitle: title || null
	};
};

export const isSeerrOnlyItem = (item) => item?._seerrMediaId != null || item?._seerrImdbId != null;

// The search hit of the kind that was asked for. Seerr ranks a search by popularity across
// every kind of media, so the first hit for a film can easily be a series of the same name.
export const bestSearchMatch = (results, mediaType) => {
	if (!Array.isArray(results) || results.length === 0) return null;
	for (const result of results) {
		if (result.mediaType === mediaType) return result;
	}
	return results[0];
};

// Seerr hands back the media server's own id for a title it knows is already in
// the library. Opening that instead of the stand-in is what gives the screen its
// playback, ratings and everything else a synthetic item has none of.
export const libraryIdOf = (media) => media?.jellyfinMediaId || media?.jellyfinMediaId4k || null;

export const seerrTargetFor = (item) => {
	if (isSeerrOnlyItem(item)) {
		return {
			mediaId: item._seerrMediaId != null ? Number(item._seerrMediaId) : null,
			mediaType: item._seerrMediaType === 'tv' ? 'tv' : 'movie',
			imdbId: item._seerrImdbId || null,
			title: item._seerrTitle || null
		};
	}
	if (item?.Type !== 'Movie' && item?.Type !== 'Series') return IDLE;
	const tmdbId = Number(item.ProviderIds?.Tmdb);
	if (!Number.isFinite(tmdbId) || tmdbId <= 0) return IDLE;
	return {mediaId: tmdbId, mediaType: item.Type === 'Series' ? 'tv' : 'movie'};
};
