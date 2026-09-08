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

// Discovery normally routes by TMDB id, but a provider-id reconciliation can also prove that
// the title already exists in Jellyfin. Keep that local identity attached to the selection so
// the detail screen can open the real Jellyfin item rather than a non-playable Seerr stub.
export const seerrSelectionMediaId = ({tmdbId, jellyfinMediaId} = {}) => {
	const localId = localMediaId(jellyfinMediaId);
	return localId ? {tmdbId, jellyfinMediaId: localId} : tmdbId;
};

// How a Seerr title reaches the detail screen. A structured Discovery selection with a known
// Jellyfin id opens the real library item; otherwise preserve the existing Seerr-only stub.
export const seerrDetailStub = ({mediaId, mediaType}) => {
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
		Id: `seerr-${mediaType}-${tmdbId}`,
		Type: resolvedType,
		_seerrMediaId: tmdbId,
		_seerrMediaType: mediaType
	};
};

export const isSeerrOnlyItem = (item) => item?._seerrMediaId != null;

export const seerrTargetFor = (item) => {
	if (isSeerrOnlyItem(item)) {
		return {mediaId: Number(item._seerrMediaId), mediaType: item._seerrMediaType === 'tv' ? 'tv' : 'movie'};
	}
	if (item?.Type !== 'Movie' && item?.Type !== 'Series') return IDLE;
	const tmdbId = Number(item.ProviderIds?.Tmdb);
	if (!Number.isFinite(tmdbId) || tmdbId <= 0) return IDLE;
	return {mediaId: tmdbId, mediaType: item.Type === 'Series' ? 'tv' : 'movie'};
};
