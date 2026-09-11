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

export const homeLabDiscoveryLandingFocusTarget = ({memory, lanes, fallbackRow = 0, emptyTarget = null} = {}) => {
	const visible = Array.isArray(lanes) ? lanes : [];
	if (!visible.length) return emptyTarget;
	const rememberedRow = Number(memory?.rowIndex);
	const baseRow = Number.isInteger(rememberedRow) ? rememberedRow : Number(fallbackRow) || 0;
	const rowIndex = Math.max(0, Math.min(baseRow, visible.length - 1));
	const itemCount = Array.isArray(visible[rowIndex]?.items) ? visible[rowIndex].items.length : 0;

	if (memory?.target === 'see-all') return `homelab-discovery-row-${rowIndex}-see-all`;
	if (itemCount > 0) {
		const rememberedItem = Number(memory?.itemIndex);
		const itemIndex = Number.isInteger(rememberedItem)
			? Math.max(0, Math.min(rememberedItem, itemCount - 1))
			: 0;
		return `homelab-discovery-row-${rowIndex}-item-${itemIndex}`;
	}
	return `homelab-discovery-row-${rowIndex}`;
};
