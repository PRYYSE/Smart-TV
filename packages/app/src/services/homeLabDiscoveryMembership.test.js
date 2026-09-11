import {
	includeHomeLabDiscoveryItem,
	isHomeLabDiscoveryNsfw
} from './homeLabDiscoveryMembership';

const item = (status, overrides = {}) => ({
	id: 1,
	title: 'Ordinary Film',
	mediaInfo: status == null ? null : {status},
	...overrides
});

describe('Home Lab Discovery membership', () => {
	test('matches request and availability status semantics', () => {
		expect(includeHomeLabDiscoveryItem(item(1), 'requestable')).toBe(true);
		expect(includeHomeLabDiscoveryItem(item(2), 'requestable')).toBe(false);
		expect(includeHomeLabDiscoveryItem(item(3), 'requested')).toBe(true);
		expect(includeHomeLabDiscoveryItem(item(4), 'available')).toBe(true);
		expect(includeHomeLabDiscoveryItem(item(5), 'notOwned')).toBe(false);
	});

	test('local ownership and watch state can refine membership without hiding unknown watch state', () => {
		expect(includeHomeLabDiscoveryItem(item(null), 'available', {isOwnedLocally: true})).toBe(true);
		expect(includeHomeLabDiscoveryItem(item(null), 'unwatched')).toBe(true);
		expect(includeHomeLabDiscoveryItem(item(null), 'unwatched', {isWatched: true})).toBe(false);
	});

	test('blacklisted and blocked NSFW items never enter a lane', () => {
		expect(includeHomeLabDiscoveryItem(item(6), 'all')).toBe(false);
		expect(isHomeLabDiscoveryNsfw(item(null, {adult: true}))).toBe(true);
		expect(includeHomeLabDiscoveryItem(item(null, {title: 'Erotic Nights'}), 'all')).toBe(false);
		expect(includeHomeLabDiscoveryItem(item(null, {title: 'Erotic Nights'}), 'all', {blockNsfw: false})).toBe(true);
	});
});
