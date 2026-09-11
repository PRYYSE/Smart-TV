import {loadHomeLabDiscoveryPage} from './homeLabDiscoveryLaneLoader';

const section = {
	id: 'identity-edge',
	title: 'Identity edge',
	availabilityMode: 'all',
	query: {source: 'discoverMovies', mediaType: 'movie'}
};

describe('Home Lab Discovery item identity filtering', () => {
	test('drops missing, malformed and non-positive TMDB identities before they can become dead cards', async () => {
		const loaded = await loadHomeLabDiscoveryPage({
			section,
			page: 1,
			serverUrl: 'http://server',
			accessToken: 'token',
			executePlan: async () => ({
				page: 1,
				totalPages: 1,
				results: [
					{id: null, mediaType: 'movie'},
					{id: '', mediaType: 'movie'},
					{id: -2, mediaType: 'movie'},
					{id: 'not-an-id', mediaType: 'movie'},
					{id: ' 42 ', mediaType: 'movie'}
				]
			})
		});

		expect(loaded.results.map(item => item.id)).toEqual([' 42 ']);
	});
});
