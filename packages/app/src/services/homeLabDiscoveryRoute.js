const PREFIX = '__homelab_discovery_v2__:';

export const homeLabDiscoveryDeepTarget = (sectionId) => {
	const id = String(sectionId || '').trim();
	if (!id) throw new Error('Discovery section id is required');
	return `${PREFIX}${encodeURIComponent(id)}`;
};

export const parseHomeLabDiscoveryDeepTarget = (value) => {
	const raw = String(value == null ? '' : value);
	if (!raw.startsWith(PREFIX)) return null;
	const encoded = raw.slice(PREFIX.length);
	if (!encoded) return null;
	try {
		const decoded = decodeURIComponent(encoded).trim();
		return decoded || null;
	} catch (_) {
		return null;
	}
};

export const findHomeLabDiscoverySection = (catalogue, sectionId) => {
	const target = String(sectionId || '');
	if (!target) return null;
	for (const tab of catalogue?.tabs || []) {
		for (const section of tab.sections || []) {
			if (String(section.id) === target) return section;
		}
	}
	return null;
};
