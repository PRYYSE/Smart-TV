import {analyseHomeLabDiscoveryQuality} from './homeLabDiscoveryQuality';

const lane = (id, previewLimit, items) => ({
	section: {id, previewLimit, query: {mediaType: 'movie'}},
	items
});

describe('Home Lab Discovery quality diagnostics', () => {
	test('quantifies cross-lane duplication, sparse rows, artwork and owned identity without title data', () => {
		const result = {
			usableLanes: [
				lane('one', 3, [
					{id: 1, mediaType: 'movie', posterPath: '/1.jpg', backdropPath: '/1-bg.jpg', mediaInfo: {jellyfinMediaId: 'jf-1'}},
					{id: 2, mediaType: 'movie', posterPath: '/2.jpg'}
				]),
				lane('two', 2, [
					{id: 2, mediaType: 'movie', posterPath: '/2.jpg', backdropPath: '/2-bg.jpg'},
					{id: 3, mediaType: 'tv'},
					{id: 'not-an-id', mediaType: 'movie'}
				])
			],
			hiddenLanes: [{section: {id: 'hidden'}}],
			failedLanes: [{section: {id: 'failed'}, error: new Error('offline')}],
			refreshFailure: true
		};

		const quality = analyseHomeLabDiscoveryQuality(result);
		expect(quality).toMatchObject({
			laneCount: 2,
			totalCards: 5,
			uniqueCards: 3,
			repeatedCards: 1,
			duplicateDistinctItems: 1,
			duplicateRatio: 0.2,
			missingIdentityCards: 1,
			missingPosterCards: 2,
			missingPosterRatio: 0.4,
			missingBackdropCards: 3,
			ownedCards: 1,
			ownedRatio: 0.2,
			underfilledLaneCount: 1,
			hiddenLaneCount: 1,
			failedLaneCount: 1,
			refreshFailure: true
		});
		expect(quality.laneSummaries.map(item => item.sectionId)).toEqual(['one', 'two']);
		expect(JSON.stringify(quality)).not.toContain('jf-1');
	});

	test('returns a stable zero snapshot when no rows are available', () => {
		expect(analyseHomeLabDiscoveryQuality(null)).toEqual({
			laneCount: 0,
			totalCards: 0,
			uniqueCards: 0,
			repeatedCards: 0,
			duplicateDistinctItems: 0,
			duplicateRatio: 0,
			missingIdentityCards: 0,
			missingPosterCards: 0,
			missingPosterRatio: 0,
			missingBackdropCards: 0,
			ownedCards: 0,
			ownedRatio: 0,
			underfilledLaneCount: 0,
			hiddenLaneCount: 0,
			failedLaneCount: 0,
			refreshFailure: false,
			laneSummaries: []
		});
	});
});
