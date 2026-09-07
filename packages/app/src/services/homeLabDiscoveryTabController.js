import {composeHomeLabDiscoveryTab} from './homeLabDiscoveryComposer';
import {isHomeLabDiscoveryQueryExecutable} from './homeLabDiscoveryPlanner';

const identityFor = (section, item) => {
	const mediaType = item?.mediaType || item?.media_type || section?.query?.mediaType || 'unknown';
	const id = item?.id ?? item?.tmdbId;
	return id == null ? null : `${mediaType}:${id}`;
};

export const createHomeLabDiscoverySession = () => {
	const seen = new Map();
	return {
		filterFresh({group, sharedGroup, items, identity, minimumRetained = 0}) {
			const groupKey = String(group || 'global');
			const sharedKey = String(sharedGroup || 'shared');
			const groupSeen = seen.get(groupKey) || new Set();
			const sharedSeen = seen.get(sharedKey) || new Set();
			const fresh = [];
			const deferred = [];
			for (const item of items || []) {
				const key = identity(item);
				if (!key) continue;
				if (groupSeen.has(key) || sharedSeen.has(key)) deferred.push(item);
				else fresh.push(item);
			}
			const target = Math.min(Math.max(0, Number(minimumRetained) || 0), (items || []).length);
			for (const item of deferred) {
				if (fresh.length >= target) break;
				fresh.push(item);
			}
			fresh.forEach((item) => {
				const key = identity(item);
				if (key) {
					groupSeen.add(key);
					sharedSeen.add(key);
				}
			});
			seen.set(groupKey, groupSeen);
			seen.set(sharedKey, sharedSeen);
			return fresh;
		},
		reset() {
			seen.clear();
		}
	};
};

export const presentHomeLabDiscoveryLanes = (
	selectedSections,
	resultsBySectionId,
	{session, sharedDedupGroup} = {}
) => {
	const presented = [];
	for (const section of selectedSections || []) {
		const result = resultsBySectionId.get(section.id);
		if (!result) continue;
		if (result.error || !Array.isArray(result.items) || !result.items.length) {
			presented.push(result);
			continue;
		}
		let items = result.items;
		if (section.sessionDedup !== false && session) {
			items = session.filterFresh({
				group: section.dedupGroup || 'global',
				sharedGroup: sharedDedupGroup,
				items,
				identity: item => identityFor(section, item),
				minimumRetained: Number(section.minItems ?? 8)
			});
		}
		presented.push({...result, items, isUsable: items.length >= Number(section.minItems ?? 8), shouldHide: !result.error && items.length < Number(section.minItems ?? 8)});
	}
	return presented;
};

const mapBounded = async (items, limit, mapper) => {
	const source = Array.from(items || []);
	if (!source.length) return;
	let nextIndex = 0;
	const worker = async () => {
		while (nextIndex < source.length) {
			const index = nextIndex++;
			await mapper(source[index], index);
		}
	};
	await Promise.all(Array.from({length: Math.min(Math.max(1, limit), source.length)}, worker));
};

export class HomeLabDiscoveryTabController {
	constructor({
		tab,
		loadLane,
		sessionSeed,
		maxConcurrentLoads = 6,
		sessionsSinceSeen = {},
		isEligible = isHomeLabDiscoveryQueryExecutable,
		session = createHomeLabDiscoverySession(),
		sharedDedupGroup
	}) {
		this.tab = tab;
		this.loadLane = loadLane;
		this.sessionSeed = String(sessionSeed || '');
		this.maxConcurrentLoads = Math.max(1, Number(maxConcurrentLoads) || 1);
		this.sessionsSinceSeen = sessionsSinceSeen || {};
		this.isEligible = isEligible;
		this.session = session;
		this.sharedDedupGroup = sharedDedupGroup || `tab:${tab?.id || 'unknown'}`;
		this.refreshNonce = 0;
	}

	async load({rotate = false} = {}) {
		if (rotate) this.refreshNonce += 1;
		const selectedSections = composeHomeLabDiscoveryTab(this.tab, {
			sessionSeed: this.sessionSeed,
			refreshNonce: this.refreshNonce,
			sessionsSinceSeen: this.sessionsSinceSeen,
			isEligible: this.isEligible
		});
		const resultsBySectionId = new Map();
		await mapBounded(selectedSections, this.maxConcurrentLoads, async (section) => {
			try {
				resultsBySectionId.set(section.id, await this.loadLane(section));
			} catch (error) {
				resultsBySectionId.set(section.id, {
					section,
					items: [],
					isUsable: false,
					shouldHide: false,
					error
				});
			}
		});
		const lanes = presentHomeLabDiscoveryLanes(selectedSections, resultsBySectionId, {
			session: this.session,
			sharedDedupGroup: this.sharedDedupGroup
		});
		return {
			selectedSections,
			lanes,
			usableLanes: lanes.filter(lane => lane.isUsable),
			failedLanes: lanes.filter(lane => !!lane.error),
			hiddenLanes: lanes.filter(lane => lane.shouldHide)
		};
	}

	refresh() {
		return this.load({rotate: true});
	}

	resetSession() {
		this.refreshNonce = 0;
		this.session.reset();
	}
}
