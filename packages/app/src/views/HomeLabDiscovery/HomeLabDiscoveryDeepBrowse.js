import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import $L from '@enact/i18n/$L';
import Spotlight from '@enact/spotlight';
import Spottable from '@enact/spotlight/Spottable';
import {VirtualGridList} from '@enact/sandstone/VirtualList';

import LoadingSpinner from '../../components/LoadingSpinner';
import {useAuth} from '../../context/AuthContext';
import {useSettings} from '../../context/SettingsContext';
import {loadHomeLabDiscoveryCatalogue} from '../../services/homeLabDiscoveryCatalogue';
import {HomeLabDiscoveryDeepController} from '../../services/homeLabDiscoveryDeepController';
import {loadHomeLabDiscoveryPage} from '../../services/homeLabDiscoveryLaneLoader';
import {findHomeLabDiscoverySection} from '../../services/homeLabDiscoveryRoute';
import seerrApi from '../../services/seerrApi';

import css from './HomeLabDiscovery.module.less';

const SpottableDiv = Spottable('div');
const SpottableButton = Spottable('button');
const deepFocusMemory = new Map();

const mediaTypeFor = (item, fallback) => {
	const value = item?.media_type || item?.mediaType || fallback;
	if (value === 'movie') return 'movie';
	if (value === 'tv' || value === 'show' || value === 'series') return 'tv';
	return item?.title ? 'movie' : 'tv';
};
const mediaIdFor = (item) => item?.id ?? item?.tmdbId;
const mediaTitleFor = (item) => item?.title || item?.name || $L('Untitled');
const mediaYearFor = (item) => {
	const date = item?.release_date || item?.releaseDate || item?.first_air_date || item?.firstAirDate;
	return typeof date === 'string' && date.length >= 4 ? date.slice(0, 4) : '';
};
const mediaBackdropFor = (item) => item?.backdrop_path || item?.backdropPath;
const mediaPosterFor = (item) => item?.poster_path || item?.posterPath;

const HomeLabDiscoveryDeepBrowse = ({sectionId, onSelectItem, backHandlerRef}) => {
	const {serverUrl, accessToken, user} = useAuth();
	const {settings} = useSettings();
	const [section, setSection] = useState(null);
	const [sectionError, setSectionError] = useState(null);
	const [browseState, setBrowseState] = useState(null);
	const [focusedItem, setFocusedItem] = useState(null);
	const [backdropUrl, setBackdropUrl] = useState('');
	const [isLoading, setIsLoading] = useState(true);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [catalogueRetryNonce, setCatalogueRetryNonce] = useState(0);
	const itemsRef = useRef([]);
	const loadMoreRef = useRef(false);
	const focusScheduledRef = useRef(false);
	const backdropTimerRef = useRef(null);
	const gridScrollToRef = useRef(null);
	const focusMemoryKey = `${serverUrl || ''}|${user?.Id || 'user'}|${sectionId || ''}`;

	useEffect(() => {
		if (!backHandlerRef) return;
		const handler = () => false;
		backHandlerRef.current = handler;
		return () => {
			if (backHandlerRef.current === handler) backHandlerRef.current = null;
		};
	}, [backHandlerRef]);

	useEffect(() => {
		let stale = false;
		focusScheduledRef.current = false;
		gridScrollToRef.current = null;
		setSection(null);
		setSectionError(null);
		setBrowseState(null);
		setFocusedItem(null);
		setBackdropUrl('');
		itemsRef.current = [];
		setIsLoading(true);

		if (!serverUrl || !accessToken || !sectionId) {
			setSectionError(new Error('Discovery section is unavailable'));
			setIsLoading(false);
			return () => { stale = true; };
		}

		loadHomeLabDiscoveryCatalogue({serverUrl, accessToken}).then(result => {
			if (stale) return;
			const resolved = findHomeLabDiscoverySection(result.catalogue, sectionId);
			if (!resolved) {
				setSectionError(new Error('Discovery section is no longer available'));
				setIsLoading(false);
				return;
			}
			setSection(resolved);
		}).catch(error => {
			if (stale) return;
			setSectionError(error);
			setIsLoading(false);
		});

		return () => { stale = true; };
	}, [accessToken, catalogueRetryNonce, sectionId, serverUrl]);

	const controller = useMemo(() => {
		if (!section || !serverUrl || !accessToken) return null;
		return new HomeLabDiscoveryDeepController({
			section,
			loadPage: (current, {page}) => loadHomeLabDiscoveryPage({
				section: current,
				page,
				serverUrl,
				accessToken,
				blockNsfw: true
			})
		});
	}, [accessToken, section, serverUrl]);

	useEffect(() => {
		if (!controller) return;
		let stale = false;
		setIsLoading(true);
		controller.loadInitial().then(async initialState => {
			if (stale) return;
			const remembered = Number(deepFocusMemory.get(focusMemoryKey) ?? 0);
			let state = initialState;
			if (remembered > 0 && state.items.length <= remembered && state.hasMore && !state.error) {
				state = await controller.loadThroughIndex(remembered);
			}
			if (stale) return;
			itemsRef.current = state.items;
			setBrowseState(state);
			const focusIndex = Math.max(0, Math.min(remembered, state.items.length - 1));
			setFocusedItem(state.items[focusIndex] || state.items[0] || null);
			setIsLoading(false);
		}).catch(error => {
			if (stale) return;
			setSectionError(error);
			setIsLoading(false);
		});
		return () => { stale = true; };
	}, [controller, focusMemoryKey]);

	useEffect(() => {
		if (!browseState?.items?.length || focusScheduledRef.current) return;
		focusScheduledRef.current = true;
		const remembered = Number(deepFocusMemory.get(focusMemoryKey) ?? 0);
		const index = Math.max(0, Math.min(remembered, browseState.items.length - 1));
		const timer = setTimeout(() => {
			const scrollTo = gridScrollToRef.current;
			if (scrollTo) scrollTo({index, focus: true, animate: false});
			else Spotlight.focus(`homelab-deep-item-${index}`);
		}, 120);
		return () => clearTimeout(timer);
	}, [browseState?.items?.length, focusMemoryKey]);

	useEffect(() => () => {
		if (backdropTimerRef.current) clearTimeout(backdropTimerRef.current);
	}, []);

	const updateBackdrop = useCallback((item) => {
		setFocusedItem(item);
		if (backdropTimerRef.current) clearTimeout(backdropTimerRef.current);
		backdropTimerRef.current = setTimeout(() => {
			const path = mediaBackdropFor(item);
			setBackdropUrl(path ? seerrApi.getImageUrl(path, 'w1280') : '');
		}, 130);
	}, []);

	const loadMore = useCallback(async () => {
		if (!controller || loadMoreRef.current || !browseState?.hasMore) return;
		loadMoreRef.current = true;
		setIsLoadingMore(true);
		try {
			const state = await controller.loadMore();
			itemsRef.current = state.items;
			setBrowseState(state);
		} finally {
			loadMoreRef.current = false;
			setIsLoadingMore(false);
		}
	}, [browseState?.hasMore, controller]);

	const retry = useCallback(async () => {
		if (!controller || loadMoreRef.current) return;
		loadMoreRef.current = true;
		setIsLoadingMore(true);
		try {
			const state = browseState?.items?.length ? await controller.retry() : await controller.loadInitial();
			itemsRef.current = state.items;
			setBrowseState(state);
		} finally {
			loadMoreRef.current = false;
			setIsLoadingMore(false);
		}
	}, [browseState?.items?.length, controller]);

	const retryCatalogue = useCallback(() => setCatalogueRetryNonce(value => value + 1), []);
	const captureGridScrollTo = useCallback(scrollTo => { gridScrollToRef.current = scrollTo; }, []);

	const handleItemClick = useCallback((event) => {
		const index = Number(event.currentTarget?.dataset?.index);
		const item = itemsRef.current[index];
		if (!item) return;
		const mediaId = mediaIdFor(item);
		if (mediaId == null) return;
		onSelectItem?.({mediaId, mediaType: mediaTypeFor(item, section?.query?.mediaType)});
	}, [onSelectItem, section?.query?.mediaType]);

	const handleItemFocus = useCallback((event) => {
		const index = Number(event.currentTarget?.dataset?.index);
		const item = itemsRef.current[index];
		if (!item) return;
		deepFocusMemory.set(focusMemoryKey, index);
		updateBackdrop(item);
		if (index >= itemsRef.current.length - 8) loadMore();
	}, [focusMemoryKey, loadMore, updateBackdrop]);

	const renderItem = useCallback(({index, ...rest}) => {
		const item = itemsRef.current[index];
		if (!item) return null;
		const title = mediaTitleFor(item);
		const year = mediaYearFor(item);
		const mediaType = mediaTypeFor(item, section?.query?.mediaType);
		const posterPath = mediaPosterFor(item);
		const imageUrl = posterPath ? seerrApi.getImageUrl(posterPath, 'w342') : null;
		const status = Number(item?.mediaInfo?.status || 0);
		return (
			<SpottableDiv
				{...rest}
				className={css.deepCard}
				data-index={index}
				onClick={handleItemClick}
				onFocus={handleItemFocus}
				spotlightId={`homelab-deep-item-${index}`}
			>
				<div className={css.deepPosterContainer}>
					{imageUrl ? (
						<img className={css.poster} src={imageUrl} alt={title} loading="lazy" />
					) : (
						<div className={css.noPoster}>{title.slice(0, 1)}</div>
					)}
					<div className={`${css.mediaTypeBadge} ${mediaType === 'movie' ? css.movieBadge : css.seriesBadge}`}>
						{mediaType === 'movie' ? $L('MOVIE') : $L('SERIES')}
					</div>
					{[2, 3, 4, 5].includes(status) && (
						<div className={`${css.availabilityBadge} ${css[`availability${status}`]}`} />
					)}
				</div>
				<div className={css.deepCardTitle}>{title}</div>
				{year && <div className={css.deepCardMeta}>{year}</div>}
			</SpottableDiv>
		);
	}, [handleItemClick, handleItemFocus, section?.query?.mediaType]);

	const items = browseState?.items || [];
	const totalResults = Number(browseState?.totalResults || 0);

	if (sectionError && !section) {
		return (
			<div className={css.deepPage}>
				<div className={css.deepEmpty}>
					<div>{$L('This Discovery list is unavailable.')}</div>
					<SpottableButton className={css.retryButton} onClick={retryCatalogue}>{$L('Try Again')}</SpottableButton>
					<div className={css.deepErrorHint}>{$L('Press Back to return to Discovery.')}</div>
				</div>
			</div>
		);
	}

	return (
		<div className={css.deepPage}>
			{settings.showHomeBackdrop !== false && (
				<div className={css.backdrop}>
					{backdropUrl && (
						<div
							className={css.backdropImage}
							style={{
								backgroundImage: `url(${backdropUrl})`,
								filter: settings.backdropBlurHome > 0 ? `blur(${settings.backdropBlurHome}px)` : 'none'
							}}
						/>
					)}
					<div className={css.backdropOverlay} />
				</div>
			)}
			<div className={`${css.deepContent} ${settings.navbarPosition === 'left' ? css.sidebarOffset : ''}`}>
				<div className={css.deepHeader}>
					<div className={css.heroEyebrow}>{$L('Discovery')}</div>
					<h1 className={css.deepTitle}>{section?.title || $L('See All')}</h1>
					<div className={css.deepSubtitle}>
						{totalResults > 0 ? `${items.length} ${$L('loaded')} • ${totalResults} ${$L('total')}` : `${items.length} ${$L('loaded')}`}
					</div>
					{focusedItem && <div className={css.deepFocusedTitle}>{mediaTitleFor(focusedItem)}</div>}
				</div>
				<div className={css.deepGridContainer}>
					{isLoading && !items.length ? (
						<div className={css.loadingState}><LoadingSpinner /></div>
					) : !items.length ? (
						<div className={css.deepEmpty}>
							<div>{$L('No items found')}</div>
							{browseState?.error && <SpottableButton className={css.retryButton} onClick={retry}>{$L('Try Again')}</SpottableButton>}
						</div>
					) : (
						<>
							<VirtualGridList
								className={css.deepGrid}
								cbScrollTo={captureGridScrollTo}
								dataSize={items.length}
								itemRenderer={renderItem}
								itemSize={{minWidth: 190, minHeight: 350}}
								spacing={20}
								spotlightId="homelab-deep-grid"
							/>
							{isLoadingMore && !browseState?.error && (
								<div className={css.deepLoadingMore}>{$L('Loading more...')}</div>
							)}
							{browseState?.error && (
								<div className={css.deepRetryOverlay}>
									<span>{$L('More items could not be loaded.')}</span>
									<SpottableButton className={css.retryButton} onClick={retry}>{$L('Retry')}</SpottableButton>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export default HomeLabDiscoveryDeepBrowse;
