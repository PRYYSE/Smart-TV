import {
	executeHomeLabDiscoveryPlan,
	serialiseHomeLabDiscoveryPlan
} from './homeLabDiscoveryClient';

const response = (body, status = 200) => ({
	status,
	text: async () => typeof body === 'string' ? body : JSON.stringify(body)
});

describe('Home Lab Discovery v2 proxy client', () => {
	test('serialises only known paths and allow-listed query parameters', () => {
		expect(serialiseHomeLabDiscoveryPlan({
			path: 'discover/movies',
			queryParameters: {
				page: 2,
				sortBy: 'popularity.desc',
				genre: '28,12',
				unknown: 'must-not-pass'
			}
		})).toBe('discover/movies?genre=28%2C12&page=2&sortBy=popularity.desc');
		expect(() => serialiseHomeLabDiscoveryPlan({path: '../settings', queryParameters: {}}))
			.toThrow('Unsupported Home Lab Discovery proxy path');
	});

	test('executes through the authenticated Moonbase Seerr proxy', async () => {
		const requestRunner = jest.fn(async () => response({page: 1, results: [{id: 42}]}));
		const result = await executeHomeLabDiscoveryPlan({
			serverUrl: 'http://192.168.50.12:8096/',
			accessToken: 'test-token',
			plan: {path: 'discover/tv', queryParameters: {page: 1, language: 'ja'}},
			requestRunner
		});

		expect(result.results[0].id).toBe(42);
		expect(requestRunner.mock.calls[0][0])
			.toBe('http://192.168.50.12:8096/Moonfin/Seerr/Api/discover/tv?language=ja&page=1');
		expect(requestRunner.mock.calls[0][1].headers.Authorization).toBe('MediaBrowser Token="test-token"');
	});

	test('unwraps Moonbase FileContents envelopes', async () => {
		const payload = JSON.stringify({page: 3, results: [{id: 7}]});
		const encoded = Buffer.from(payload, 'utf8').toString('base64');
		const result = await executeHomeLabDiscoveryPlan({
			serverUrl: 'http://server',
			accessToken: 'token',
			plan: {path: 'discover/trending', queryParameters: {page: 3}},
			requestRunner: async () => response({FileContents: encoded})
		});
		expect(result.page).toBe(3);
		expect(result.results[0].id).toBe(7);
	});

	test('surfaces HTTP and JSON failures instead of returning an empty lane', async () => {
		await expect(executeHomeLabDiscoveryPlan({
			serverUrl: 'http://server', accessToken: 'token',
			plan: {path: 'discover/trending', queryParameters: {page: 1}},
			requestRunner: async () => response('nope', 503)
		})).rejects.toThrow('HTTP 503');
		await expect(executeHomeLabDiscoveryPlan({
			serverUrl: 'http://server', accessToken: 'token',
			plan: {path: 'discover/trending', queryParameters: {page: 1}},
			requestRunner: async () => response('not-json', 200)
		})).rejects.toThrow('invalid JSON');
	});
});
