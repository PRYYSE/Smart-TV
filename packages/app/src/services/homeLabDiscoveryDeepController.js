const positiveInt = (value, fallback) => {
	const number = Number(value);
	return Number.isInteger(number) && number > 0 ? number : fallback;
};

const itemIdentity = (section, item) => {
	const id = item?.id ?? item?.tmdbId;
	if (id == null) return null;
	const mediaType = item?.mediaType || item?.media_type || section?.query?.mediaType || 'unknown';
	return `${mediaType}:${id}`;
};

const pageItems = (loaded) => {
	if (Array.isArray(loaded?.items)) return loaded.items;
	if (Array.isArray(loaded?.results)) return loaded.results;
	return [];
};

export class HomeLabDiscoveryDeepController {
	constructor({section, loadPage, maxEmptyPageReadAhead = 4, initialState = null}) {
		if (!section) throw new Error('Discovery deep browse requires a section');
		if (typeof loadPage !== 'function') throw new Error('Discovery deep browse requires a page loader');
		this.section = section;
		this.loadPage = loadPage;
		this.maxEmptyPageReadAhead = positiveInt(maxEmptyPageReadAhead, 4);
		this._generation = 0;
		this._items = [];
		this._seen = new Set();
		this._throughPage = 0;
		this._totalPages = 1;
		this._totalResults = 0;
		this._error = null;
		this._loading = false;
		this._inFlight = null;
		if (initialState) this._restoreData(initialState);
	}

	get state() {
		return {
			section: this.section,
			title: this.section.title,
			items: this._items.slice(),
			throughPage: this._throughPage,
			totalPages: this._totalPages,
			totalResults: this._totalResults,
			error: this._error,
			isLoading: this._loading,
			hasMore: this._throughPage === 0 || this._throughPage < this._totalPages
		};
	}

	snapshot() {
		return {
			sectionId: this.section?.id || null,
			items: this._items.slice(),
			throughPage: this._throughPage,
			totalPages: this._totalPages,
			totalResults: this._totalResults
		};
	}

	loadInitial() {
		this._resetData();
		return this._advance(false);
	}

	refresh() {
		this._resetData();
		return this._advance(true);
	}

	loadMore() {
		return this._advance(false);
	}

	retry() {
		return this._advance(false);
	}

	reset() {
		this._resetData();
	}

	async loadThroughIndex(index, {maxPageLoads = 25} = {}) {
		const parsedIndex = Number(index);
		const targetIndex = Number.isInteger(parsedIndex) && parsedIndex > 0 ? parsedIndex : 0;
		const pageLimit = positiveInt(maxPageLoads, 25);
		let state = this.state;
		let pageLoads = 0;

		while (state.items.length <= targetIndex && state.hasMore && !state.error && pageLoads < pageLimit) {
			const previousPage = state.throughPage;
			state = await this.loadMore();
			pageLoads += 1;
			if (state.error || state.throughPage <= previousPage) break;
		}
		return state;
	}

	_advance(forceRefresh) {
		const beforeState = this.state;
		if (this._loading && this._inFlight) return this._inFlight;
		if (this._throughPage > 0 && !beforeState.hasMore) return Promise.resolve(beforeState);

		const generation = this._generation;
		this._loading = true;
		this._error = null;
		const beforeCount = this._items.length;

		const work = (async () => {
			let scanned = 0;
			try {
				do {
					const requestedPage = this._throughPage + 1;
					const loaded = await this.loadPage(this.section, {
						page: requestedPage,
						forceRefresh: forceRefresh && requestedPage === 1
					});
					if (generation !== this._generation) return this.state;

					const loadedPage = positiveInt(loaded?.page, requestedPage);
					this._throughPage = Math.max(requestedPage, loadedPage);
					const reportedTotalPages = Math.max(0, Number(loaded?.totalPages ?? loaded?.total_pages ?? 0) || 0);
					this._totalPages = reportedTotalPages > 0 ? Math.max(this._throughPage, reportedTotalPages) : this._throughPage;
					this._totalResults = Math.max(0, Number(loaded?.totalResults ?? loaded?.total_results ?? this._totalResults) || 0);

					for (const item of pageItems(loaded)) {
						const identity = itemIdentity(this.section, item);
						if (!identity || this._seen.has(identity)) continue;
						this._seen.add(identity);
						this._items.push(item);
					}
					scanned += 1;
				} while (
					this._items.length === beforeCount &&
					this._throughPage < this._totalPages &&
					scanned < this.maxEmptyPageReadAhead
				);
			} catch (error) {
				if (generation === this._generation) this._error = error;
			} finally {
				if (generation === this._generation) this._loading = false;
			}
			return this.state;
		})();

		this._inFlight = work;
		work.finally(() => {
			if (this._inFlight === work) this._inFlight = null;
		});
		return work;
	}

	_restoreData(initialState) {
		const sourceItems = Array.isArray(initialState?.items) ? initialState.items : [];
		for (const item of sourceItems) {
			const identity = itemIdentity(this.section, item);
			if (!identity || this._seen.has(identity)) continue;
			this._seen.add(identity);
			this._items.push(item);
		}
		this._throughPage = Math.max(0, Number(initialState?.throughPage) || 0);
		const reportedTotalPages = Math.max(0, Number(initialState?.totalPages) || 0);
		this._totalPages = this._throughPage > 0
			? Math.max(this._throughPage, reportedTotalPages || this._throughPage)
			: Math.max(1, reportedTotalPages || 1);
		this._totalResults = Math.max(0, Number(initialState?.totalResults) || 0);
		this._error = null;
		this._loading = false;
	}

	_resetData() {
		this._generation += 1;
		this._items = [];
		this._seen.clear();
		this._throughPage = 0;
		this._totalPages = 1;
		this._totalResults = 0;
		this._error = null;
		this._loading = false;
		this._inFlight = null;
	}
}
