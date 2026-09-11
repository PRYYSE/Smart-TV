const DEFAULT_MAX_ENTRIES = 12;
const retained = new Map();

const scopeKey = ({serverUrl, userId}) => `${String(serverUrl || '')}|${String(userId || 'user')}`;

const sectionRevision = (section) => JSON.stringify({
	id: section?.id || '',
	query: section?.query || null,
	availabilityMode: section?.availabilityMode || 'all',
	minItems: section?.minItems || null,
	previewLimit: section?.previewLimit || null
});

export const homeLabDiscoveryDeepStateKey = ({serverUrl, userId, section}) => {
	if (!section?.id) return null;
	return `${scopeKey({serverUrl, userId})}|${section.id}|${sectionRevision(section)}`;
};

export const readHomeLabDiscoveryDeepState = (key) => {
	if (!key || !retained.has(key)) return null;
	const value = retained.get(key);
	// Touch the key so bounded eviction behaves as a tiny LRU rather than FIFO.
	retained.delete(key);
	retained.set(key, value);
	return value;
};

export const rememberHomeLabDiscoveryDeepState = (key, snapshot, {maxEntries = DEFAULT_MAX_ENTRIES} = {}) => {
	if (!key || !snapshot) return;
	const limit = Math.max(1, Number(maxEntries) || DEFAULT_MAX_ENTRIES);
	retained.delete(key);
	retained.set(key, snapshot);
	while (retained.size > limit) {
		const oldest = retained.keys().next().value;
		if (oldest == null) break;
		retained.delete(oldest);
	}
};

export const invalidateHomeLabDiscoveryDeepStateScope = (scope) => {
	const normalized = String(scope || '').trim();
	if (!normalized) return;
	const prefix = `${normalized}|`;
	for (const key of Array.from(retained.keys())) {
		if (key.startsWith(prefix)) retained.delete(key);
	}
};

export const invalidateHomeLabDiscoveryDeepState = ({serverUrl, userId}) =>
	invalidateHomeLabDiscoveryDeepStateScope(scopeKey({serverUrl, userId}));

export const clearHomeLabDiscoveryDeepState = () => retained.clear();
