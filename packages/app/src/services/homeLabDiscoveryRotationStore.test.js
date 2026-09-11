import {
	HomeLabDiscoveryRotationHistory,
	HomeLabDiscoveryRotationStore,
	rotationScopeFromSessionSeed
} from './homeLabDiscoveryRotationStore';

const fakeStorage = () => {
	const values = new Map();
	return {
		getItem: key => values.has(key) ? values.get(key) : null,
		setItem: (key, value) => values.set(key, String(value)),
		removeItem: key => values.delete(key),
		values
	};
};

describe('Home Lab Discovery rotation persistence', () => {
	test('history ages surfaced rows by completed sessions', () => {
		const history = new HomeLabDiscoveryRotationHistory();
		history.commitSession(['a', 'b']);
		expect(history.sessionsSinceSeen).toEqual({a: 0, b: 0});
		history.commitSession(['c']);
		expect(history.sessionsSinceSeen).toEqual({a: 1, b: 1, c: 0});
	});

	test('store persists each tab under one server-user scope', () => {
		const storage = fakeStorage();
		const store = new HomeLabDiscoveryRotationStore({storage});
		const movies = new HomeLabDiscoveryRotationHistory();
		movies.commitSession(['movie-a']);
		const series = new HomeLabDiscoveryRotationHistory();
		series.commitSession(['series-a']);
		store.saveTab('http://server|user-1', 'movies', movies);
		store.saveTab('http://server|user-1', 'series', series);

		expect(store.loadTab('http://server|user-1', 'movies').toJSON()).toEqual(movies.toJSON());
		expect(store.loadTab('http://server|user-1', 'series').toJSON()).toEqual(series.toJSON());
		expect(store.loadTab('http://server|user-2', 'movies').sessionNumber).toBe(0);
	});

	test('corrupt payload fails closed and is removed', () => {
		const storage = fakeStorage();
		const store = new HomeLabDiscoveryRotationStore({storage});
		const key = store._key('scope');
		storage.setItem(key, '{bad json');
		expect(store.loadTab('scope', 'movies').sessionNumber).toBe(0);
		expect(storage.getItem(key)).toBeNull();
	});

	test('cleared history persists and session seed strips catalogue and tab suffixes', () => {
		const storage = fakeStorage();
		const store = new HomeLabDiscoveryRotationStore({storage});
		const scope = rotationScopeFromSessionSeed('http://server|user-1|2026-09-08T00:00:00Z|movies');
		expect(scope).toBe('http://server|user-1');
		const history = new HomeLabDiscoveryRotationHistory();
		history.commitSession(['a']);
		store.saveTab(scope, 'movies', history);
		history.clear();
		store.saveTab(scope, 'movies', history);
		expect(store.loadTab(scope, 'movies').toJSON()).toEqual({sessionNumber: 0, lastSeenSession: {}});
	});
});
