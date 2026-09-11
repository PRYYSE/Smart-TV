import {
	HomeLabDiscoveryTabController,
	createHomeLabDiscoverySession,
	homeLabDiscoveryTabResultState,
	presentHomeLabDiscoveryLanes,
	retainHomeLabDiscoveryRefreshFallback
} from './homeLabDiscoveryTabController';
import {
	clearHomeLabDiscoveryDeepState,
	homeLabDiscoveryDeepStateKey,
	readHomeLabDiscoveryDeepState,
	rememberHomeLabDiscoveryDeepState
} from './homeLabDiscoveryDeepState';
import {HomeLabDiscoveryRotationHistory} from './homeLabDiscoveryRotationStore';

const section = (id, overrides = {}) => ({
	id,
	title: id,
	minItems: 1,
	previewLimit: 5,
	pool: 'general',
	priority: 'normal',
	weight: 1,
	dedupGroup: 'global',
	sessionDedup: true,
	query: {source: 'discoverMovies', mediaType: 'movie'},
	...overrides
});

const tab = (sections) => ({
	id: 'movies',
	title: 'Movies',
	sections,
	initialLaneBudget: sections.length,
	minimumLaneCount: 1,
	poolBudgets: {}
});

const lane = (sectionValue, ids) => ({
	section: sectionValue,
	items: ids.map(id => ({id, mediaType: 'movie'})),
	isUsable: ids.length >= Number(sectionValue.minItems ?? 1),
	shouldHide: ids.length < Number(sectionValue.minItems ?? 1),
	error: null
});

const tabResult = ({usable = [], failed = [], hidden = [], error = null} = {}) => ({
	selectedSections: [],
	lanes: [...usable, ...failed, ...hidden],
	usableLanes: usable,
	failedLanes: failed,
	hiddenLanes: hidden,
	error
});

describe('Home Lab Discovery tab controller', () => {
	beforeEach(() => clearHomeLabDiscoveryDeepState());

	test('presentation is independent of reverse asynchronous completion order', async () => {
		const sections = [section('a'), section('b'), section('c')];
		const resolvers = {};
		const controller = new HomeLabDiscoveryTabController({
			tab: tab(sections),
			sessionSeed: 'stable',
			isEligible: () => true,
			loadLane: current => new Promise(resolve => { resolvers[current.id] = () => resolve(lane(current, [current.id.charCodeAt(0)])); })
		});
		const pending = controller.load();
		await Promise.resolve();
		const selected = Object.keys(resolvers);
		[...selected].reverse().forEach(id => resolvers[id]());
		const result = await pending;
		expect(result.lanes.map(entry => entry.section.id)).toEqual(result.selectedSections.map(entry => entry.id));
	});

	test('one lane failure is isolated and does not reorder usable rows', async () => {
		const sections = [section('one'), section('bad'), section('two')];
		const controller = new HomeLabDiscoveryTabController({
			tab: tab(sections),
			sessionSeed: 'failure',
			isEligible: () => true,
			loadLane: async current => {
				if (current.id === 'bad') throw new Error('boom');
				return lane(current, [current.id === 'one' ? 1 : 2]);
			}
		});
		const result = await controller.load();
		expect(result.failedLanes).toHaveLength(1);
		expect(result.failedLanes[0].section.id).toBe('bad');
		expect(result.usableLanes.map(entry => entry.section.id))
			.toEqual(result.selectedSections.filter(entry => entry.id !== 'bad').map(entry => entry.id));
	});

	test('classifies all-lane failures as failures rather than empty content', () => {
		const failed = {section: section('bad'), items: [], error: new Error('offline')};
		expect(homeLabDiscoveryTabResultState(null)).toBe('idle');
		expect(homeLabDiscoveryTabResultState(tabResult())).toBe('empty');
		expect(homeLabDiscoveryTabResultState(tabResult({failed: [failed]}))).toBe('failure');
		expect(homeLabDiscoveryTabResultState(tabResult({error: new Error('top-level')}))).toBe('failure');
		expect(homeLabDiscoveryTabResultState(tabResult({usable: [lane(section('ok'), [1])]}))).toBe('ready');
		expect(homeLabDiscoveryTabResultState(tabResult({usable: [lane(section('ok'), [1])], failed: [failed]}))).toBe('partial');
	});

	test('failed refresh keeps the last usable rows while exposing the refresh failure', () => {
		const previousLane = lane(section('previous'), [1, 2]);
		const previous = tabResult({usable: [previousLane]});
		const failure = new Error('refresh offline');
		const next = tabResult({failed: [{section: section('bad'), items: [], error: failure}]});
		const retained = retainHomeLabDiscoveryRefreshFallback(previous, next);
		expect(retained.usableLanes).toEqual([previousLane]);
		expect(retained.refreshFailure).toBe(failure);
		expect(homeLabDiscoveryTabResultState(retained)).toBe('ready');
	});

	test('successful or genuinely empty refresh replaces stale rows', () => {
		const previous = tabResult({usable: [lane(section('previous'), [1])]});
		const replacement = tabResult({usable: [lane(section('new'), [2])]});
		const empty = tabResult();
		expect(retainHomeLabDiscoveryRefreshFallback(previous, replacement)).toBe(replacement);
		expect(retainHomeLabDiscoveryRefreshFallback(previous, empty)).toBe(empty);
		expect(retainHomeLabDiscoveryRefreshFallback(null, tabResult({error: new Error('offline')})).error).toBeTruthy();
	});

	test('shared novelty is applied in selected catalogue order with minimum backfill', () => {
		const a = section('a', {minItems: 2});
		const b = section('b', {minItems: 2});
		const results = new Map([
			['a', lane(a, [1, 2, 3])],
			['b', lane(b, [2, 3, 4])]
		]);
		const presented = presentHomeLabDiscoveryLanes([a, b], results, {
			session: createHomeLabDiscoverySession(),
			sharedDedupGroup: 'tab:test'
		});
		expect(presented[0].items.map(item => item.id)).toEqual([1, 2, 3]);
		expect(presented[1].items.map(item => item.id)).toEqual([4, 2]);
	});

	test('refresh advances rotation, refreshes source, clears stale deep state, and reset persists history', async () => {
		const sections = Array.from({length: 12}, (_, index) => section(`s-${index}`));
		const history = new HomeLabDiscoveryRotationHistory();
		const rotationStore = {loadTab: jest.fn(() => history), saveTab: jest.fn(() => true)};
		const loadLane = jest.fn(async current => lane(current, [Number(current.id.slice(2)) + 1]));
		const controller = new HomeLabDiscoveryTabController({
			tab: {...tab(sections), initialLaneBudget: 5, minimumLaneCount: 3},
			sessionSeed: 'http://server|user-1|catalogue|movies',
			isEligible: () => true,
			loadLane,
			rotationStore
		});
		const deepKey = homeLabDiscoveryDeepStateKey({
			serverUrl: 'http://server',
			userId: 'user-1',
			section: section('deep')
		});
		rememberHomeLabDiscoveryDeepState(deepKey, {throughPage: 3});

		const first = await controller.load();
		const refreshed = await controller.refresh();
		expect(controller.refreshNonce).toBe(1);
		expect(refreshed.selectedSections.map(item => item.id)).not.toEqual(first.selectedSections.map(item => item.id));
		expect(loadLane.mock.calls.some(call => call[1]?.forceRefresh === true)).toBe(true);
		expect(readHomeLabDiscoveryDeepState(deepKey)).toBeNull();
		expect(history.sessionNumber).toBe(2);
		expect(rotationStore.saveTab).toHaveBeenCalled();
		controller.resetSession();
		expect(controller.refreshNonce).toBe(0);
		expect(history.toJSON()).toEqual({sessionNumber: 0, lastSeenSession: {}});
		expect(rotationStore.saveTab).toHaveBeenLastCalledWith('http://server|user-1', 'movies', history);
	});

	test('personalised rows are eligible alongside Seerr rows before I/O starts', async () => {
		const supported = section('supported');
		const personal = section('personal', {query: {source: 'personalised', mediaType: 'movie', seedStrategy: 'recent-history'}});
		const loadLane = jest.fn(async current => lane(current, [current.id === 'supported' ? 1 : 2]));
		const controller = new HomeLabDiscoveryTabController({
			tab: tab([supported, personal]),
			sessionSeed: 'eligibility',
			loadLane
		});
		const result = await controller.load();
		expect(result.selectedSections.map(item => item.id)).toEqual(['supported', 'personal']);
		expect(loadLane).toHaveBeenCalledTimes(2);
	});
});
