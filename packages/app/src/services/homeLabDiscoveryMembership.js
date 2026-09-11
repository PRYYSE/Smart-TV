const NSFW_PATTERNS = [
	/\bsex\b/i,
	/sexual/i,
	/\bporn\b/i,
	/erotic/i,
	/\bnude\b/i,
	/nudity/i,
	/\bxxx\b/i,
	/adult film/i,
	/prostitute/i,
	/stripper/i,
	/\bescort\b/i,
	/seduction/i,
	/\baffair\b/i,
	/threesome/i,
	/\borgy\b/i,
	/kinky/i,
	/fetish/i,
	/\bbdsm\b/i,
	/dominatrix/i
];

const statusOf = (item) => Number(item?.mediaInfo?.status);
const displayTitle = (item) => item?.title || item?.name || item?.originalTitle || item?.originalName || '';

export const isHomeLabDiscoveryNsfw = (item) => {
	if (item?.adult === true) return true;
	const text = `${displayTitle(item)} ${item?.overview || ''}`;
	return NSFW_PATTERNS.some(pattern => pattern.test(text));
};

export const includeHomeLabDiscoveryItem = (item, mode = 'all', {
	blockNsfw = true,
	isOwnedLocally,
	isWatched
} = {}) => {
	const status = statusOf(item);
	if (status === 6 || item?.isBlacklisted === true) return false;
	if (blockNsfw && isHomeLabDiscoveryNsfw(item)) return false;

	const requested = status === 2 || status === 3;
	const available = status === 4 || status === 5 || isOwnedLocally === true;

	switch (mode || 'all') {
		case 'requestable': return !available && !requested;
		case 'available': return available;
		case 'requested': return requested;
		case 'notOwned': return !available;
		case 'unwatched': return isWatched !== true;
		case 'all':
		default: return true;
	}
};
