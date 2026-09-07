import {HomeLabDiscoveryDeepController} from './homeLabDiscoveryDeepController';

const section = {
	id: 'deep',
	title: 'Deep Picks',
	query: {source: 'discoverMovies', mediaType: 'movie'}
};

const result = (page, ids, totalPages = 3) => ({
	page,
	totalPages,
	totalResults: totalPages * 20,
	results: ids.map(id => ({id, mediaType: 'movie'}))
});

describe('Home Lab Discovery deep controller', () => {
	test('reads ahead through membership-filtered empty pages', async () => {
		const requested = [];
		const controller = new HomeLabDiscoveryDeepController({
			section,
			loadPage: async (_, {page}) => {
				requested.push(page);
				return page === 1 ? result(1, []) : result(2, [1, 2]);
			}
		});

		const state = await controller.loadInitial();
		expect(requested).toEqual([1, 2]);
		expect(state.throughPage).toBe(2);
		expect(state.items.map(item => item.id)).toEqual([1, 2]);
	});

	test('deduplicates exact media identities across pages without preview diversification', async () => {
		const controller = new HomeLabDiscoveryDeepController({
			section,
			maxEmptyPageReadAhead: 1,
			loadPage: async (_, {page}) => page === 1
				? result(1, [1, 2], 2)
				: result(2, [2, 3], 2)
		});

		await controller.loadInitial();
		const state = await controller.loadMore();
		expect(state.items.map(item => item.id)).toEqual([1, 2, 3]);
		expect(state.hasMore).toBe(false);
	});

	test('load-more failure preserves items and retry requests the same page', async () => {
		let secondPageAttempts = 0;
		const controller = new HomeLabDiscoveryDeepController({
			section,
			maxEmptyPageReadAhead: 1,
			loadPage: async (_, {page}) => {
				if (page === 1) return result(1, [1, 2], 2);
				secondPageAttempts += 1;
				if (secondPageAttempts === 1) throw new Error('temporary');
				return result(2, [3], 2);
			}
		});

		await controller.loadInitial();
		const failed = await controller.loadMore();
		expect(failed.error).toBeTruthy();
		expect(failed.throughPage).toBe(1);
		expect(failed.items.map(item => item.id)).toEqual([1, 2]);

		const recovered = await controller.retry();
		expect(secondPageAttempts).toBe(2);
		expect(recovered.error).toBeNull();
		expect(recovered.items.map(item => item.id)).toEqual([1, 2, 3]);
	});

	test('refresh clears accumulated pages and only forces page one', async () => {
		const calls = [];
		const controller = new HomeLabDiscoveryDeepController({
			section,
			maxEmptyPageReadAhead: 1,
			loadPage: async (_, {page, forceRefresh}) => {
				calls.push([page, forceRefresh]);
				return result(page, [forceRefresh ? 9 : page], 3);
			}
		});

		await controller.loadInitial();
		await controller.loadMore();
		const refreshed = await controller.refresh();
		expect(calls).toEqual([[1, false], [2, false], [1, true]]);
		expect(refreshed.items.map(item => item.id)).toEqual([9]);
		expect(refreshed.throughPage).toBe(1);
	});

	test('a source without total-pages metadata terminates after the successful page', async () => {
		const controller = new HomeLabDiscoveryDeepController({
			section,
			loadPage: async () => ({page: 1, results: [{id: 1, mediaType: 'movie'}]})
		});
		const state = await controller.loadInitial();
		expect(state.hasMore).toBe(false);
		expect(state.totalPages).toBe(1);
	});

	test('loads enough pages to restore a remembered deep item without over-fetching', async () => {
		const requested = [];
		const controller = new HomeLabDiscoveryDeepController({
			section,
			maxEmptyPageReadAhead: 1,
			loadPage: async (_, {page}) => {
				requested.push(page);
				return result(page, [page * 2 - 1, page * 2], 5);
			}
		});

		await controller.loadInitial();
		const restored = await controller.loadThroughIndex(4);

		expect(requested).toEqual([1, 2, 3]);
		expect(restored.items.map(item => item.id)).toEqual([1, 2, 3, 4, 5, 6]);
		expect(restored.throughPage).toBe(3);
	});

	test('remembered deep restoration respects the page-load safety cap', async () => {
		const requested = [];
		const controller = new HomeLabDiscoveryDeepController({
			section,
			maxEmptyPageReadAhead: 1,
			loadPage: async (_, {page}) => {
				requested.push(page);
				return result(page, [page], 100);
			}
		});

		await controller.loadInitial();
		const restored = await controller.loadThroughIndex(50, {maxPageLoads: 2});

		expect(requested).toEqual([1, 2, 3]);
		expect(restored.throughPage).toBe(3);
		expect(restored.hasMore).toBe(true);
	});
});
