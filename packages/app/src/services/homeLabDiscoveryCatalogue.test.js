import {
	HOME_LAB_DISCOVERY_CAPABILITY,
	homeLabDiscoveryCatalogueCacheKey,
	homeLabDiscoveryCatalogueUrl,
	loadHomeLabDiscoveryCatalogue,
	validateHomeLabDiscoveryCatalogue
} from './homeLabDiscoveryCatalogue';

const makeCatalogue = (overrides = {}) => Object.assign({
	schemaVersion: 2,
	catalogueRevision: 'test-1',
	generatedAt: '2026-09-07T00:00:00Z',
	minimumDiscoveryCapability: 2,
	tabs: [{
		id: 'movies',
		title: 'Movies',
		initialLaneBudget: 12,
		minimumLaneCount: 4,
		sections: [{
			id: 'movies-popular',
			title: 'Popular Movies',
			query: {source: 'discoverMovies', mediaType: 'movie'},
			previewLimit: 20,
			minItems: 8
		}]
	}]
}, overrides);

const makeStorage = () => {
	const values = {};
	return {
		getItem: jest.fn((key) => Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null),
		setItem: jest.fn((key, value) => { values[key] = value; }),
		values
	};
};

const response = (body, status = 200) => ({
	ok: status >= 200 && status < 300,
	status,
	text: async () => typeof body === 'string' ? body : JSON.stringify(body)
});

describe('Home Lab Discovery v2 catalogue loader', () => {
	test('loads network first, authenticates, validates and stores a server-scoped LKG', async () => {
		const storage = makeStorage();
		const fetchImpl = jest.fn(async () => response(makeCatalogue()));
		const result = await loadHomeLabDiscoveryCatalogue({
			serverUrl: 'http://192.168.50.12:8096/',
			accessToken: 'token-for-test',
			fetchImpl,
			storage
		});

		expect(result.source).toBe('network');
		expect(result.catalogue.catalogueRevision).toBe('test-1');
		expect(fetchImpl.mock.calls[0][0]).toBe('http://192.168.50.12:8096/Moonfin/Web/homelab/discovery.catalogue.json');
		expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('MediaBrowser Token="token-for-test"');
		expect(storage.setItem).toHaveBeenCalledTimes(1);
		expect(storage.setItem.mock.calls[0][0]).toBe(homeLabDiscoveryCatalogueCacheKey('http://192.168.50.12:8096/'));
	});

	test('falls back to a previously validated LKG when network data is bad', async () => {
		const storage = makeStorage();
		const key = homeLabDiscoveryCatalogueCacheKey('http://server');
		storage.values[key] = JSON.stringify(makeCatalogue({catalogueRevision: 'known-good'}));
		const result = await loadHomeLabDiscoveryCatalogue({
			serverUrl: 'http://server',
			fetchImpl: async () => response({schemaVersion: 99, tabs: []}),
			storage
		});

		expect(result.source).toBe('cache');
		expect(result.catalogue.catalogueRevision).toBe('known-good');
		expect(result.networkError).toBeTruthy();
	});

	test('falls back when a future catalogue requires a newer Discovery capability', async () => {
		const storage = makeStorage();
		const key = homeLabDiscoveryCatalogueCacheKey('http://server');
		storage.values[key] = JSON.stringify(makeCatalogue({catalogueRevision: 'compatible-lkg'}));
		const result = await loadHomeLabDiscoveryCatalogue({
			serverUrl: 'http://server',
			fetchImpl: async () => response(makeCatalogue({
				catalogueRevision: 'future',
				minimumDiscoveryCapability: HOME_LAB_DISCOVERY_CAPABILITY + 1
			})),
			storage
		});
		expect(result.source).toBe('cache');
		expect(result.catalogue.catalogueRevision).toBe('compatible-lkg');
		expect(result.networkError.message).toContain('requires capability');
	});

	test('returns unavailable instead of accepting an invalid cache', async () => {
		const storage = makeStorage();
		storage.values[homeLabDiscoveryCatalogueCacheKey('http://server')] = '{"schemaVersion":99,"tabs":[]}';
		const result = await loadHomeLabDiscoveryCatalogue({
			serverUrl: 'http://server',
			fetchImpl: async () => { throw new Error('offline'); },
			storage
		});
		expect(result.source).toBe('unavailable');
		expect(result.catalogue).toBeNull();
		expect(result.networkError.message).toBe('offline');
		expect(result.cacheError).toBeTruthy();
	});

	test('rejects duplicate section IDs and invalid lane budgets', () => {
		const duplicate = makeCatalogue();
		duplicate.tabs.push({
			id: 'series', title: 'Series', sections: [{
				id: 'movies-popular', title: 'Duplicate', query: {source: 'discoverTv', mediaType: 'series'}
			}]
		});
		expect(() => validateHomeLabDiscoveryCatalogue(duplicate)).toThrow('Duplicate Discovery section id');
		expect(() => validateHomeLabDiscoveryCatalogue(makeCatalogue({tabs: [{
			id: 'bad', title: 'Bad', initialLaneBudget: 2, minimumLaneCount: 3, sections: []
		}]}))).toThrow('Invalid minimumLaneCount');
	});

	test('normalises catalogue URL without changing the server origin', () => {
		expect(homeLabDiscoveryCatalogueUrl('https://home.example/moonfin///'))
			.toBe('https://home.example/moonfin/Moonfin/Web/homelab/discovery.catalogue.json');
	});
});
