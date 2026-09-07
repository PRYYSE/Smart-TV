import {
	composeHomeLabDiscoveryTab,
	homeLabDiscoveryFnv1a32,
	homeLabDiscoveryRank
} from './homeLabDiscoveryComposer';
import {isHomeLabDiscoveryQueryExecutable} from './homeLabDiscoveryPlanner';

const section = (id, overrides = {}) => ({
	id,
	title: id,
	pool: 'general',
	priority: 'normal',
	weight: 1,
	cooldownSessions: 0,
	query: {source: 'discoverMovies', mediaType: 'movie'},
	...overrides
});

const tab = (sections, overrides = {}) => ({
	id: 'movies',
	title: 'Movies',
	sections,
	initialLaneBudget: 6,
	minimumLaneCount: 3,
	poolBudgets: {},
	...overrides
});

describe('Home Lab Discovery composer', () => {
	test('FNV-1a and rank are deterministic', () => {
		expect(homeLabDiscoveryFnv1a32('moonfin')).toBe(homeLabDiscoveryFnv1a32('moonfin'));
		expect(homeLabDiscoveryRank(section('a'), {sessionSeed: 'same'}))
			.toBe(homeLabDiscoveryRank(section('a'), {sessionSeed: 'same'}));
	});

	test('same seed produces stable lane order and refresh nonce can rotate it', () => {
		const sections = Array.from({length: 18}, (_, index) => section(`s-${index}`, {
			pool: `pool-${index % 4}`,
			weight: 1 + (index % 3) * 0.25
		}));
		const source = tab(sections, {initialLaneBudget: 8, minimumLaneCount: 6});
		const first = composeHomeLabDiscoveryTab(source, {sessionSeed: 'abc', refreshNonce: 0}).map(item => item.id);
		const second = composeHomeLabDiscoveryTab(source, {sessionSeed: 'abc', refreshNonce: 0}).map(item => item.id);
		const rotated = composeHomeLabDiscoveryTab(source, {sessionSeed: 'abc', refreshNonce: 1}).map(item => item.id);
		expect(second).toEqual(first);
		expect(rotated).not.toEqual(first);
	});

	test('anchors lead while pool budgets constrain optional lanes', () => {
		const source = tab([
			section('anchor-a', {priority: 'anchor', pool: 'anchor'}),
			section('anchor-b', {priority: 'anchor', pool: 'anchor'}),
			section('action-1', {pool: 'action'}),
			section('action-2', {pool: 'action'}),
			section('drama-1', {pool: 'drama'}),
			section('drama-2', {pool: 'drama'})
		], {initialLaneBudget: 5, minimumLaneCount: 4, poolBudgets: {action: 1, drama: 1}});
		const result = composeHomeLabDiscoveryTab(source, {sessionSeed: 'pool-test'});
		expect(result.slice(0, 2).map(item => item.id)).toEqual(['anchor-a', 'anchor-b']);
		expect(result.filter(item => item.pool === 'action')).toHaveLength(1);
		expect(result.filter(item => item.pool === 'drama')).toHaveLength(1);
	});

	test('cooldown suppresses recently surfaced optional lanes before backfill', () => {
		const source = tab([
			section('anchor', {priority: 'anchor'}),
			section('cooling', {cooldownSessions: 3}),
			section('fresh-a'),
			section('fresh-b'),
			section('fresh-c')
		], {initialLaneBudget: 4, minimumLaneCount: 3});
		const result = composeHomeLabDiscoveryTab(source, {
			sessionSeed: 'cooldown-test',
			sessionsSinceSeen: {cooling: 1}
		});
		expect(result.map(item => item.id)).not.toContain('cooling');
	});

	test('eligibility can use the fail-closed webOS query planner', () => {
		const source = tab([
			section('movie'),
			section('personal', {query: {source: 'personalised', mediaType: 'movie'}}),
			section('external', {query: {source: 'externalList', mediaType: 'movie'}}),
			section('tv', {query: {source: 'discoverTv', mediaType: 'tv'}})
		], {initialLaneBudget: 4, minimumLaneCount: 2});
		const result = composeHomeLabDiscoveryTab(source, {
			sessionSeed: 'eligibility',
			isEligible: isHomeLabDiscoveryQueryExecutable
		});
		expect(result.map(item => item.id).sort()).toEqual(['movie', 'tv']);
	});
});
