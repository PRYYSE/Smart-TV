import {useCallback, useEffect, useState} from 'react';

import css from './HomeLabDiscovery.module.less';

const fallbackTextFor = (title) => {
	const value = String(title || '').trim();
	return (value.slice(0, 1) || '?').toUpperCase();
};

const HomeLabDiscoveryPoster = ({imageUrl, title}) => {
	const [failed, setFailed] = useState(false);

	useEffect(() => setFailed(false), [imageUrl]);
	const handleError = useCallback(() => setFailed(true), []);

	if (!imageUrl || failed) {
		return <div className={css.noPoster}>{fallbackTextFor(title)}</div>;
	}

	return <img className={css.poster} src={imageUrl} alt={title || ''} loading="lazy" onError={handleError} />;
};

export default HomeLabDiscoveryPoster;
