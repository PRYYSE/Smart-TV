import {homeLabDiscoveryVisualPolicy} from './homeLabDiscoveryVisualPolicy';

describe('Home Lab Discovery visual policy', () => {
	test('low tier removes expensive blur and delays backdrop churn', () => {
		expect(homeLabDiscoveryVisualPolicy({
			performanceMode: 'auto',
			detectedTier: 'low',
			viewportHeight: 1080,
			configuredBlur: 12
		})).toMatchObject({
			tier: 'low',
			constrainedMotion: true,
			backdropSize: 'w780',
			backdropBlur: 0,
			backdropDebounceMs: 240,
			scrollBehavior: 'auto',
			gridItemSize: {minWidth: 190, minHeight: 350}
		});
	});

	test('manual performance mode overrides the detected tier', () => {
		const policy = homeLabDiscoveryVisualPolicy({
			performanceMode: 'mid',
			detectedTier: 'low',
			configuredBlur: 10
		});
		expect(policy.tier).toBe('mid');
		expect(policy.backdropBlur).toBe(4);
		expect(policy.backdropSize).toBe('w1280');
		expect(policy.scrollBehavior).toBe('smooth');
	});

	test('high tier preserves the configured backdrop quality', () => {
		const policy = homeLabDiscoveryVisualPolicy({performanceMode: 'high', configuredBlur: 9});
		expect(policy.backdropBlur).toBe(9);
		expect(policy.backdropSize).toBe('w1280');
		expect(policy.backdropDebounceMs).toBe(130);
	});

	test('compact viewports use a smaller virtual-grid footprint and backdrop', () => {
		const policy = homeLabDiscoveryVisualPolicy({
			performanceMode: 'high',
			viewportHeight: 720,
			configuredBlur: 5
		});
		expect(policy.compactViewport).toBe(true);
		expect(policy.gridItemSize).toEqual({minWidth: 160, minHeight: 300});
		expect(policy.backdropSize).toBe('w780');
	});
});
