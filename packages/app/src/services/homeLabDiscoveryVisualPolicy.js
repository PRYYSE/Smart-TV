const PERF_TIERS = new Set(['low', 'mid', 'high']);

const finiteNumber = (value, fallback) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
};

export const homeLabDiscoveryVisualPolicy = ({
	performanceMode = 'auto',
	detectedTier = 'low',
	viewportHeight = 1080,
	configuredBlur = 0
} = {}) => {
	const requestedTier = PERF_TIERS.has(performanceMode) ? performanceMode : detectedTier;
	const tier = PERF_TIERS.has(requestedTier) ? requestedTier : 'low';
	const height = finiteNumber(viewportHeight, 1080);
	const compactViewport = height > 0 && height <= 800;
	const requestedBlur = Math.max(0, finiteNumber(configuredBlur, 0));
	const backdropBlur = tier === 'low'
		? 0
		: tier === 'mid'
			? Math.min(requestedBlur, 4)
			: requestedBlur;

	return {
		tier,
		compactViewport,
		constrainedMotion: tier === 'low',
		backdropSize: tier === 'low' || compactViewport ? 'w780' : 'w1280',
		backdropBlur,
		backdropDebounceMs: tier === 'low' ? 240 : tier === 'mid' ? 180 : 130,
		scrollBehavior: tier === 'low' ? 'auto' : 'smooth',
		gridItemSize: compactViewport
			? {minWidth: 160, minHeight: 300}
			: {minWidth: 190, minHeight: 350}
	};
};
