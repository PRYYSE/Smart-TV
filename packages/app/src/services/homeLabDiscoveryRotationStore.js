const ROTATION_KEY_PREFIX = 'moonfin.homelab.discovery.rotation.v2.';
const DEFAULT_MAX_ENTRIES = 512;

const safeSessionNumber = (value) => (
	Number.isInteger(value) && value >= 0 ? value : 0
);

const safeStorage = () => {
	try {
		return typeof window !== 'undefined' ? window.localStorage : null;
	} catch (_error) {
		return null;
	}
};

export class HomeLabDiscoveryRotationHistory {
	constructor({sessionNumber = 0, lastSeenSession = {}, maxEntries = DEFAULT_MAX_ENTRIES} = {}) {
		this.sessionNumber = safeSessionNumber(sessionNumber);
		this.maxEntries = Math.max(1, Number(maxEntries) || DEFAULT_MAX_ENTRIES);
		this.lastSeenSession = {};
		for (const [id, lastSeen] of Object.entries(lastSeenSession || {})) {
			if (id && Number.isInteger(lastSeen) && lastSeen >= 0) {
				this.lastSeenSession[id] = lastSeen;
			}
		}
		this._trim();
	}

	get sessionsSinceSeen() {
		const result = {};
		for (const [id, lastSeen] of Object.entries(this.lastSeenSession)) {
			result[id] = Math.max(0, this.sessionNumber - 1 - lastSeen);
		}
		return result;
	}

	commitSession(sectionIds) {
		const uniqueIds = new Set((sectionIds || []).filter(Boolean).map(String));
		for (const id of uniqueIds) this.lastSeenSession[id] = this.sessionNumber;
		this.sessionNumber += 1;
		this._trim();
	}

	clear() {
		this.sessionNumber = 0;
		this.lastSeenSession = {};
	}

	toJSON() {
		return {
			sessionNumber: this.sessionNumber,
			lastSeenSession: {...this.lastSeenSession}
		};
	}

	static fromJSON(value, options = {}) {
		if (!value || typeof value !== 'object' || Array.isArray(value)) {
			return new HomeLabDiscoveryRotationHistory(options);
		}
		return new HomeLabDiscoveryRotationHistory({
			...options,
			sessionNumber: value.sessionNumber,
			lastSeenSession: value.lastSeenSession
		});
	}

	_trim() {
		const entries = Object.entries(this.lastSeenSession);
		if (entries.length <= this.maxEntries) return;
		entries.sort((a, b) => b[1] - a[1]);
		const trimmed = {};
		for (const [id, lastSeen] of entries.slice(0, this.maxEntries)) trimmed[id] = lastSeen;
		this.lastSeenSession = trimmed;
	}
}

export const rotationScopeFromSessionSeed = (sessionSeed) => {
	const parts = String(sessionSeed || '').split('|');
	if (parts.length >= 4) return parts.slice(0, -2).join('|');
	return String(sessionSeed || 'default');
};

export class HomeLabDiscoveryRotationStore {
	constructor({storage = safeStorage()} = {}) {
		this.storage = storage;
	}

	_key(scope) {
		return `${ROTATION_KEY_PREFIX}${encodeURIComponent(String(scope || 'default'))}`;
	}

	_read(scope) {
		if (!this.storage) return {tabs: {}};
		const key = this._key(scope);
		try {
			const raw = this.storage.getItem(key);
			if (!raw) return {tabs: {}};
			const parsed = JSON.parse(raw);
			if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !parsed.tabs || typeof parsed.tabs !== 'object') {
				throw new Error('invalid rotation payload');
			}
			return parsed;
		} catch (_error) {
			try { this.storage.removeItem(key); } catch (_ignored) { void _ignored; }
			return {tabs: {}};
		}
	}

	loadTab(scope, tabId) {
		const payload = this._read(scope);
		return HomeLabDiscoveryRotationHistory.fromJSON(payload.tabs?.[tabId]);
	}

	saveTab(scope, tabId, history) {
		if (!this.storage || !tabId || !history) return false;
		const key = this._key(scope);
		const payload = this._read(scope);
		payload.tabs = payload.tabs && typeof payload.tabs === 'object' ? payload.tabs : {};
		payload.tabs[tabId] = history.toJSON();
		try {
			this.storage.setItem(key, JSON.stringify(payload));
			return true;
		} catch (_error) {
			return false;
		}
	}

	clear(scope, tabId) {
		if (!this.storage) return false;
		const key = this._key(scope);
		try {
			if (!tabId) {
				this.storage.removeItem(key);
				return true;
			}
			const payload = this._read(scope);
			if (payload.tabs && Object.prototype.hasOwnProperty.call(payload.tabs, tabId)) {
				delete payload.tabs[tabId];
				this.storage.setItem(key, JSON.stringify(payload));
			}
			return true;
		} catch (_error) {
			return false;
		}
	}
}
