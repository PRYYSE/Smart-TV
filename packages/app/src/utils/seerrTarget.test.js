import {
	isSeerrOnlyItem,
	seerrDetailStub,
	seerrSelectionMediaId,
	seerrTargetFor
} from './seerrTarget';

const movie = (providerIds) => ({Type: 'Movie', ProviderIds: providerIds});

describe('seerrTargetFor', () => {
	it('hands back a number, since Seerr rejects a request whose mediaId is a string', () => {
		expect(seerrTargetFor(movie({Tmdb: '603'}))).toEqual({mediaId: 603, mediaType: 'movie'});
	});

	it('calls a series tv, which is what Seerr calls it', () => {
		expect(seerrTargetFor({Type: 'Series', ProviderIds: {Tmdb: '1399'}}))
			.toEqual({mediaId: 1399, mediaType: 'tv'});
	});

	it('stays idle for anything with no Seerr counterpart', () => {
		const idle = {mediaId: null, mediaType: null};
		expect(seerrTargetFor({Type: 'Episode', ProviderIds: {Tmdb: '603'}})).toEqual(idle);
		expect(seerrTargetFor({Type: 'Season', ProviderIds: {Tmdb: '603'}})).toEqual(idle);
		expect(seerrTargetFor(null)).toEqual(idle);
	});

	it('stays idle when the title carries no usable TMDB id', () => {
		const idle = {mediaId: null, mediaType: null};
		expect(seerrTargetFor(movie({Imdb: 'tt0133093'}))).toEqual(idle);
		expect(seerrTargetFor(movie({Tmdb: ''}))).toEqual(idle);
		expect(seerrTargetFor(movie({Tmdb: 'not-a-number'}))).toEqual(idle);
		expect(seerrTargetFor(movie(undefined))).toEqual(idle);
	});
});

describe('Discovery detail selection', () => {
	it('keeps a requestable-only title on the existing Seerr detail path', () => {
		const mediaId = seerrSelectionMediaId({tmdbId: 603});
		const stub = seerrDetailStub({mediaId, mediaType: 'movie'});
		expect(isSeerrOnlyItem(stub)).toBe(true);
		expect(seerrTargetFor(stub)).toEqual({mediaId: 603, mediaType: 'movie'});
	});

	it('opens an owned Discovery movie as the real Jellyfin item', () => {
		const mediaId = seerrSelectionMediaId({tmdbId: 603, jellyfinMediaId: 'jf-movie-1'});
		const pointer = seerrDetailStub({mediaId, mediaType: 'movie'});
		expect(pointer).toEqual({Id: 'jf-movie-1', Type: 'Movie'});
		expect(isSeerrOnlyItem(pointer)).toBe(false);
	});

	it('opens an owned Discovery series as the real Jellyfin item', () => {
		const mediaId = seerrSelectionMediaId({tmdbId: 1399, jellyfinMediaId: 'jf-series-1'});
		const pointer = seerrDetailStub({mediaId, mediaType: 'tv'});
		expect(pointer).toEqual({Id: 'jf-series-1', Type: 'Series'});
		expect(isSeerrOnlyItem(pointer)).toBe(false);
	});

	it('ignores blank local identities rather than creating a broken library pointer', () => {
		const mediaId = seerrSelectionMediaId({tmdbId: 603, jellyfinMediaId: '   '});
		expect(mediaId).toBe(603);
		expect(isSeerrOnlyItem(seerrDetailStub({mediaId, mediaType: 'movie'}))).toBe(true);
	});
});

describe('seerrDetailStub', () => {
	it('carries the Seerr identity that seerrTargetFor reads back out', () => {
		const stub = seerrDetailStub({mediaId: 603, mediaType: 'movie'});
		expect(isSeerrOnlyItem(stub)).toBe(true);
		expect(seerrTargetFor(stub)).toEqual({mediaId: 603, mediaType: 'movie'});
	});

	it('calls a series a Series, so the screen lays it out as one', () => {
		expect(seerrDetailStub({mediaId: 1399, mediaType: 'tv'}).Type).toBe('Series');
		expect(seerrDetailStub({mediaId: 603, mediaType: 'movie'}).Type).toBe('Movie');
	});

	it('leaves a library item alone', () => {
		expect(isSeerrOnlyItem({Type: 'Movie', ProviderIds: {Tmdb: '603'}})).toBe(false);
	});
});
