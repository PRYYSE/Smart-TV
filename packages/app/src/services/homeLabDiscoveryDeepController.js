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
	constructor({section, loadPage, maxEmptyPageReadAhead = 4}) {
		if (!section) throw new Error('Discovery deep browse requires a section');
		if (typeof loadPage !== 'function') throw new Error('Discovery deep browse requires a page loader');
		this.section = section;
		this.loadPage = loadPage;
		this.maxEmptyPageReadAhead = positiveInt(maxEmptyPageReadAhead, 4);
		this._items = [];
		this._seen = new Set();
		this._throughPage = 0;
		this._totalPages = 1;
		this._totalResults = 0;
		this._error = null;
		this._loading = false;
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

	async _advance(forceRefresh) {
		const beforeState = this.state;
		if (this._loading || (this._throughPage > 0 && !beforeState.hasMore)) return beforeState;

		this._loading = true;
		this._error = null;
		const beforeCount = this._items.length;
		let scanned = 0;

		try {
			do {
				const requestedPage = this._throughPage + 1;
				const loaded = await this.loadPage(this.section, {
					page: requestedPage,
					forceRefresh: forceRefresh && requestedPage === 1
				});
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
			this._error = error;
		} finally {
			this._loading = false;
		}

		return this.state;
	}

	_resetData() {
		this._items = [];
		this._seen.clear();
		this._throughPage = 0;
		this._totalPages = 1;
		this._totalResults = 0;
		this._error = null;
		this._loading = false;
	}
}
