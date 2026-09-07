import {
	findHomeLabDiscoverySection,
	homeLabDiscoveryDeepTarget,
	parseHomeLabDiscoveryDeepTarget
} from './homeLabDiscoveryRoute';

describe('Home Lab Discovery route adapter', () => {
	test('round-trips opaque section ids without colliding with numeric Seerr genres', () => {
		const target = homeLabDiscoveryDeepTarget('movies/award winners');
		expect(parseHomeLabDiscoveryDeepTarget(target)).toBe('movies/award winners');
		expect(parseHomeLabDiscoveryDeepTarget(28)).toBeNull();
		expect(parseHomeLabDiscoveryDeepTarget('genre:28')).toBeNull();
	});

	test('rejects malformed or empty custom targets', () => {
		expect(parseHomeLabDiscoveryDeepTarget('__homelab_discovery_v2__:')).toBeNull();
		expect(parseHomeLabDiscoveryDeepTarget('__homelab_discovery_v2__:%E0%A4%A')).toBeNull();
		expect(() => homeLabDiscoveryDeepTarget('')).toThrow('section id');
	});

	test('finds a section by id across catalogue tabs', () => {
		const wanted = {id: 'anime-hidden-gems', title: 'Hidden Gems'};
		const catalogue = {
			tabs: [
				{id: 'movies', sections: [{id: 'movies-popular'}]},
				{id: 'anime', sections: [wanted]}
			]
		};
		expect(findHomeLabDiscoverySection(catalogue, wanted.id)).toBe(wanted);
		expect(findHomeLabDiscoverySection(catalogue, 'missing')).toBeNull();
	});
});
