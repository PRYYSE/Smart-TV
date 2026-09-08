import {
	clearHomeLabDiscoveryDeepState,
	homeLabDiscoveryDeepStateKey,
	invalidateHomeLabDiscoveryDeepState,
	readHomeLabDiscoveryDeepState,
	rememberHomeLabDiscoveryDeepState
} from './homeLabDiscoveryDeepState';

const section = (id = 'movies') => ({
	id,
	query: {source: 'discoverMovies', mediaType: 'movie'},
	availabilityMode: 'all',
	minItems: 8,
	previewLimit: 20
});

describe('Home Lab Discovery retained deep state', () => {
	beforeEach(() => clearHomeLabDiscoveryDeepState());

	test('scopes retained pages by server, user and section revision', () => {
		const first = homeLabDiscoveryDeepStateKey({serverUrl: 'http://a', userId: 'u1', section: section()});
		const otherUser = homeLabDiscoveryDeepStateKey({serverUrl: 'http://a', userId: 'u2', section: section()});
		const changed = homeLabDiscoveryDeepStateKey({
			serverUrl: 'http://a',
			userId: 'u1',
			section: {...section(), availabilityMode: 'available'}
		});
		expect(first).not.toBe(otherUser);
		expect(first).not.toBe(changed);
	});

	test('scope invalidation clears refresh-stale snapshots without touching another user', () => {
		const first = homeLabDiscoveryDeepStateKey({serverUrl: 'http://server', userId: 'u1', section: section('a')});
		const second = homeLabDiscoveryDeepStateKey({serverUrl: 'http://server', userId: 'u1', section: section('b')});
		const other = homeLabDiscoveryDeepStateKey({serverUrl: 'http://server', userId: 'u2', section: section('a')});
		rememberHomeLabDiscoveryDeepState(first, {throughPage: 2});
		rememberHomeLabDiscoveryDeepState(second, {throughPage: 3});
		rememberHomeLabDiscoveryDeepState(other, {throughPage: 4});

		invalidateHomeLabDiscoveryDeepState({serverUrl: 'http://server', userId: 'u1'});
		expect(readHomeLabDiscoveryDeepState(first)).toBeNull();
		expect(readHomeLabDiscoveryDeepState(second)).toBeNull();
		expect(readHomeLabDiscoveryDeepState(other)).toEqual({throughPage: 4});
	});

	test('bounded cache evicts the least recently used snapshot', () => {
		const a = homeLabDiscoveryDeepStateKey({serverUrl: 's', userId: 'u', section: section('a')});
		const b = homeLabDiscoveryDeepStateKey({serverUrl: 's', userId: 'u', section: section('b')});
		const c = homeLabDiscoveryDeepStateKey({serverUrl: 's', userId: 'u', section: section('c')});
		rememberHomeLabDiscoveryDeepState(a, {id: 'a'}, {maxEntries: 2});
		rememberHomeLabDiscoveryDeepState(b, {id: 'b'}, {maxEntries: 2});
		expect(readHomeLabDiscoveryDeepState(a)).toEqual({id: 'a'});
		rememberHomeLabDiscoveryDeepState(c, {id: 'c'}, {maxEntries: 2});
		expect(readHomeLabDiscoveryDeepState(a)).toEqual({id: 'a'});
		expect(readHomeLabDiscoveryDeepState(b)).toBeNull();
		expect(readHomeLabDiscoveryDeepState(c)).toEqual({id: 'c'});
	});
});
