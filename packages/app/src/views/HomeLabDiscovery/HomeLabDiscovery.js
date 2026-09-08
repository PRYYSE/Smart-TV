import {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import $L from '@enact/i18n/$L';
import Spotlight from '@enact/spotlight';
import Spottable from '@enact/spotlight/Spottable';
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator';

import LoadingSpinner from '../../components/LoadingSpinner';
import {useAuth} from '../../context/AuthContext';
import {useSeerr} from '../../context/SeerrContext';
import {useSettings} from '../../context/SettingsContext';
import {loadHomeLabDiscoveryCatalogue} from '../../services/homeLabDiscoveryCatalogue';
import {loadHomeLabDiscoveryLane} from '../../services/homeLabDiscoveryLaneLoader';
import {homeLabDiscoveryDeepTarget, homeLabDiscoveryLandingFocusTarget} from '../../services/homeLabDiscoveryRoute';
import {HomeLabDiscoveryTabController} from '../../services/homeLabDiscoveryTabController';
import seerrApi from '../../services/seerrApi';
import {KEYS} from '../../utils/keys';
import LegacySeerrDiscover from '../SeerrDiscover/SeerrDiscover';

import css from './HomeLabDiscovery.module.less';

const SpottableDiv = Spottable('div');
const SpottableButton = Spottable('button');
const RowContainer = SpotlightContainerDecorator({
	enterTo: 'last-focused',
	restrict: 'self-first'
}, 'div');
const ToolbarContainer = SpotlightContainerDecorator({
	enterTo: 'last-focused',
	restrict: 'self-first'
}, 'div');

let retainedCatalogue = {serverKey: null, catalogue: null};
let retainedLanding = {key: null, activeTabId: null, tabResults: {}};
const lastFocusByTab = {};

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
const mediaRatingFor = (item) => Number(item?.vote_average ?? item?.voteAverage ?? 0);
const mediaBackdropFor = (item) => item?.backdrop_path || item?.backdropPath;
const mediaPosterFor = (item) => item?.poster_path || item?.posterPath;

const DiscoveryMediaCard = memo(function DiscoveryMediaCard({
	item,
	fallbackMediaType,
	onSelect,
	onFocus,
	spotlightId,
	rowIndex,
	itemIndex
}) {
	const mediaType = mediaTypeFor(item, fallbackMediaType);
	const title = mediaTitleFor(item);
	const year = mediaYearFor(item);
	const posterPath = mediaPosterFor(item);
	const posterUrl = posterPath ? seerrApi.getImageUrl(posterPath, 'w342') : null;
	const status = Number(item?.mediaInfo?.status || 0);

	const handleSelect = useCallback(() => {
		const mediaId = mediaIdFor(item);
		if (mediaId == null) return;
		onSelect?.({mediaId, mediaType});
	}, [item, mediaType, onSelect]);

	const handleFocus = useCallback(() => onFocus?.(item, rowIndex, itemIndex), [item, itemIndex, onFocus, rowIndex]);

	return (
		<SpottableDiv
			className={css.mediaCard}
			onClick={handleSelect}
			onFocus={handleFocus}
			spotlightId={spotlightId}
		>
			<div className={css.posterContainer}>
				{posterUrl ? (
					<img className={css.poster} src={posterUrl} alt={title} loading="lazy" />
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
			<div className={css.cardTitle}>{title}</div>
			{year && <div className={css.cardMeta}>{year}</div>}
		</SpottableDiv>
	);
});

const DiscoveryRow = memo(function DiscoveryRow({
	lane,
	rowIndex,
	onSelectItem,
	onFocusItem,
	onNavigateUp,
	onNavigateDown,
	onOpenDeep,
	onRowFocus
}) {
	const scrollerRef = useRef(null);
	const items = lane?.items || [];
	const section = lane?.section;

	const handleKeyDown = useCallback((event) => {
		if (event.keyCode === KEYS.UP) {
			event.preventDefault();
			event.stopPropagation();
			onNavigateUp?.(rowIndex);
		} else if (event.keyCode === KEYS.DOWN) {
			event.preventDefault();
			event.stopPropagation();
			onNavigateDown?.(rowIndex);
		} else if (event.keyCode === KEYS.LEFT) {
			const first = event.currentTarget.querySelector('.spottable');
			if (first && first.contains(document.activeElement)) {
				event.preventDefault();
				event.stopPropagation();
				Spotlight.focus('navbar');
			}
		}
	}, [onNavigateDown, onNavigateUp, rowIndex]);

	const handleContainerFocus = useCallback((event) => {
		const card = event.target.closest(`.${css.mediaCard}, .${css.seeAllCard}`);
		if (!card) onRowFocus?.(rowIndex);
		else if (card.classList.contains(css.seeAllCard)) onRowFocus?.(rowIndex, {target: 'see-all'});
		const scroller = scrollerRef.current;
		if (card && scroller) {
			const cardRect = card.getBoundingClientRect();
			const scrollerRect = scroller.getBoundingClientRect();
			if (cardRect.left < scrollerRect.left) scroller.scrollLeft -= scrollerRect.left - cardRect.left + 50;
			else if (cardRect.right > scrollerRect.right) scroller.scrollLeft += cardRect.right - scrollerRect.right + 50;
		}
		const row = event.target.closest(`.${css.contentRow}`);
		row?.scrollIntoView({behavior: 'smooth', block: 'center'});
	}, [onRowFocus, rowIndex]);

	const handleSeeAll = useCallback(() => onOpenDeep?.(section, rowIndex), [onOpenDeep, rowIndex, section]);
	const handleSeeAllFocus = useCallback(() => onRowFocus?.(rowIndex, {target: 'see-all'}), [onRowFocus, rowIndex]);

	if (!section || !items.length) return null;

	return (
		<div className={css.contentRow} data-row-index={rowIndex}>
			<h2 className={css.rowTitle}>{lane.displayTitle || section.title}</h2>
			<div className={css.rowScroller} ref={scrollerRef}>
				<RowContainer
					className={css.rowItems}
					spotlightId={`homelab-discovery-row-${rowIndex}`}
					onKeyDown={handleKeyDown}
					onFocus={handleContainerFocus}
				>
					{items.map((item, index) => (
						<DiscoveryMediaCard
							key={`${mediaTypeFor(item, section.query?.mediaType)}:${mediaIdFor(item)}`}
							item={item}
							fallbackMediaType={section.query?.mediaType}
							onSelect={onSelectItem}
							onFocus={onFocusItem}
							rowIndex={rowIndex}
							itemIndex={index}
							spotlightId={`homelab-discovery-row-${rowIndex}-item-${index}`}
						/>
					))}
					<SpottableButton
						className={css.seeAllCard}
						onClick={handleSeeAll}
						onFocus={handleSeeAllFocus}
						spotlightId={`homelab-discovery-row-${rowIndex}-see-all`}
					>
						<span className={css.seeAllIcon}>→</span>
						<span className={css.seeAllText}>{$L('See All')}</span>
					</SpottableButton>
				</RowContainer>
			</div>
		</div>
	);
});

const HomeLabDiscoveryExperience = ({catalogue, serverUrl, accessToken, userId, onSelectItem, onSelectGenre, onOpenRequests}) => {
	const {settings} = useSettings();
	const tabs = useMemo(() => catalogue.tabs || [], [catalogue.tabs]);
	const viewKey = `${serverUrl}|${userId || 'user'}|${catalogue.generatedAt || catalogue.catalogueVersion || catalogue.schemaVersion}`;

	if (retainedLanding.key !== viewKey) {
		retainedLanding = {key: viewKey, activeTabId: null, tabResults: {}};
	}

	const rememberedTabIndex = tabs.findIndex(tab => tab.id === retainedLanding.activeTabId);
	const [activeTabIndex, setActiveTabIndex] = useState(rememberedTabIndex >= 0 ? rememberedTabIndex : 0);
	const [tabResults, setTabResultsState] = useState(() => ({...retainedLanding.tabResults}));
	const [loadingByTab, setLoadingByTab] = useState({});
	const [focusedItem, setFocusedItem] = useState(null);
	const [backdropUrl, setBackdropUrl] = useState('');
	const requestGenerationRef = useRef({});
	const focusAfterLoadRef = useRef(true);
	const backdropTimerRef = useRef(null);

	const controllers = useMemo(() => {
		const output = new Map();
		for (const tab of tabs) {
			output.set(tab.id, new HomeLabDiscoveryTabController({
				tab,
				sessionSeed: `${viewKey}|${tab.id}`,
				maxConcurrentLoads: 4,
				loadLane: (section, {forceRefresh = false} = {}) => loadHomeLabDiscoveryLane({
					section,
					serverUrl,
					accessToken,
					blockNsfw: true,
					forceRefresh
				})
			}));
		}
		return output;
	}, [accessToken, serverUrl, tabs, viewKey]);

	const setTabResult = useCallback((tabId, result) => {
		setTabResultsState(previous => {
			const next = {...previous, [tabId]: result};
			retainedLanding = {...retainedLanding, tabResults: next};
			return next;
		});
	}, []);

	const loadTab = useCallback(async (tabIndex, refresh = false) => {
		const tab = tabs[tabIndex];
		const controller = tab ? controllers.get(tab.id) : null;
		if (!tab || !controller) return;
		const generation = (requestGenerationRef.current[tab.id] || 0) + 1;
		requestGenerationRef.current[tab.id] = generation;
		setLoadingByTab(previous => ({...previous, [tab.id]: true}));
		try {
			const result = refresh ? await controller.refresh() : await controller.load();
			if (requestGenerationRef.current[tab.id] === generation) setTabResult(tab.id, result);
		} catch (error) {
			if (requestGenerationRef.current[tab.id] === generation) {
				setTabResult(tab.id, {selectedSections: [], lanes: [], usableLanes: [], hiddenLanes: [], failedLanes: [], error});
			}
		} finally {
			if (requestGenerationRef.current[tab.id] === generation) {
				setLoadingByTab(previous => ({...previous, [tab.id]: false}));
			}
		}
	}, [controllers, setTabResult, tabs]);

	const activeTab = tabs[activeTabIndex] || tabs[0];
	const activeResult = activeTab ? tabResults[activeTab.id] : null;
	const visibleLanes = useMemo(() => activeResult?.usableLanes || [], [activeResult]);
	const activeLoading = activeTab ? !!loadingByTab[activeTab.id] : false;

	useEffect(() => {
		if (!activeTab) return;
		retainedLanding = {...retainedLanding, activeTabId: activeTab.id};
		if (!tabResults[activeTab.id] && !loadingByTab[activeTab.id]) loadTab(activeTabIndex);
	}, [activeTab, activeTabIndex, loadTab, loadingByTab, tabResults]);

	useEffect(() => {
		if (!activeResult || !visibleLanes.length || activeLoading || !focusAfterLoadRef.current || !activeTab) return;
		const target = homeLabDiscoveryLandingFocusTarget({
			memory: lastFocusByTab[activeTab.id],
			lanes: visibleLanes
		});
		const timer = setTimeout(() => {
			if (target) Spotlight.focus(target);
			focusAfterLoadRef.current = false;
		}, 100);
		return () => clearTimeout(timer);
	}, [activeLoading, activeResult, activeTab, visibleLanes]);

	useEffect(() => {
		if (focusedItem || !visibleLanes.length) return;
		const first = visibleLanes[0]?.items?.[0];
		if (first) setFocusedItem(first);
	}, [focusedItem, visibleLanes]);

	useEffect(() => () => {
		if (backdropTimerRef.current) clearTimeout(backdropTimerRef.current);
	}, []);

	const handleFocusItem = useCallback((item, rowIndex, itemIndex) => {
		setFocusedItem(item);
		if (activeTab) lastFocusByTab[activeTab.id] = {rowIndex, itemIndex, target: 'item'};
		if (backdropTimerRef.current) clearTimeout(backdropTimerRef.current);
		backdropTimerRef.current = setTimeout(() => {
			const path = mediaBackdropFor(item);
			setBackdropUrl(path ? seerrApi.getImageUrl(path, 'w1280') : '');
		}, 130);
	}, [activeTab]);

	const focusActiveRow = useCallback(() => {
		if (!visibleLanes.length || !activeTab) return;
		const target = homeLabDiscoveryLandingFocusTarget({
			memory: lastFocusByTab[activeTab.id],
			lanes: visibleLanes
		});
		if (target) Spotlight.focus(target);
	}, [activeTab, visibleLanes]);

	const handleToolbarKeyDown = useCallback((event) => {
		if (event.keyCode === KEYS.UP) {
			event.preventDefault();
			event.stopPropagation();
			Spotlight.focus('navbar');
		} else if (event.keyCode === KEYS.DOWN) {
			event.preventDefault();
			event.stopPropagation();
			focusActiveRow();
		} else if (event.keyCode === KEYS.LEFT) {
			const first = event.currentTarget.querySelector('.spottable');
			if (first && first.contains(document.activeElement)) {
				event.preventDefault();
				event.stopPropagation();
				Spotlight.focus('navbar');
			}
		}
	}, [focusActiveRow]);

	const handleTabSelect = useCallback((event) => {
		const index = Number(event.currentTarget?.dataset?.tabIndex);
		if (!Number.isInteger(index) || index < 0 || index >= tabs.length) return;
		setActiveTabIndex(index);
		retainedLanding = {...retainedLanding, activeTabId: tabs[index].id};
		setFocusedItem(null);
		setBackdropUrl('');
		focusAfterLoadRef.current = true;
	}, [tabs]);

	const handleRefresh = useCallback(() => {
		if (!activeTab) return;
		focusAfterLoadRef.current = true;
		loadTab(activeTabIndex, true);
	}, [activeTab, activeTabIndex, loadTab]);

	const handleRowFocus = useCallback((rowIndex, detail = {}) => {
		if (activeTab) lastFocusByTab[activeTab.id] = {rowIndex, ...detail};
	}, [activeTab]);

	const handleNavigateUp = useCallback((fromRowIndex) => {
		if (fromRowIndex <= 0) {
			Spotlight.focus(`homelab-discovery-tab-${activeTabIndex}`);
			return;
		}
		Spotlight.focus(`homelab-discovery-row-${fromRowIndex - 1}`);
		document.querySelector(`[data-row-index="${fromRowIndex - 1}"]`)?.scrollIntoView({behavior: 'smooth', block: 'center'});
	}, [activeTabIndex]);

	const handleNavigateDown = useCallback((fromRowIndex) => {
		const next = fromRowIndex + 1;
		if (next >= visibleLanes.length) return;
		Spotlight.focus(`homelab-discovery-row-${next}`);
		document.querySelector(`[data-row-index="${next}"]`)?.scrollIntoView({behavior: 'smooth', block: 'center'});
	}, [visibleLanes.length]);

	const handleOpenDeep = useCallback((section, rowIndex) => {
		if (!section || !onSelectGenre) return;
		if (activeTab) lastFocusByTab[activeTab.id] = {rowIndex, target: 'see-all'};
		onSelectGenre(homeLabDiscoveryDeepTarget(section.id), section.title, section.query?.mediaType || 'movie');
	}, [activeTab, onSelectGenre]);

	if (!activeTab) {
		return <div className={css.emptyState}>{$L('No Discovery categories are available.')}</div>;
	}

	const rating = mediaRatingFor(focusedItem);
	const year = mediaYearFor(focusedItem);

	return (
		<div className={css.container}>
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
			<div className={`${css.mainContent} ${settings.navbarPosition === 'left' ? css.sidebarOffset : ''}`}>
				<div className={css.hero}>
					<div className={css.heroEyebrow}>{activeTab.title}</div>
					<h1 className={css.detailTitle}>{focusedItem ? mediaTitleFor(focusedItem) : $L('Discover')}</h1>
					{focusedItem && (
						<div className={css.detailMeta}>
							{rating > 0 && <span className={css.detailRating}>★ {rating.toFixed(1)}</span>}
							{year && <span>{year}</span>}
						</div>
					)}
					{focusedItem?.overview && <p className={css.detailOverview}>{focusedItem.overview}</p>}
				</div>

				<ToolbarContainer className={css.toolbar} spotlightId="homelab-discovery-toolbar" onKeyDown={handleToolbarKeyDown}>
					<div className={css.tabRail}>
						{tabs.map((tab, index) => (
							<SpottableButton
								key={tab.id}
								className={`${css.tabButton} ${index === activeTabIndex ? css.tabButtonActive : ''}`}
								data-tab-index={index}
								onClick={handleTabSelect}
								spotlightId={`homelab-discovery-tab-${index}`}
							>
								{tab.title}
							</SpottableButton>
						))}
					</div>
					<div className={css.toolbarActions}>
						{onOpenRequests && (
							<SpottableButton className={css.actionButton} onClick={onOpenRequests} spotlightId="homelab-discovery-requests">
								{$L('Requests')}
							</SpottableButton>
						)}
						<SpottableButton className={css.actionButton} onClick={handleRefresh} spotlightId="homelab-discovery-refresh">
							{$L('Refresh')}
						</SpottableButton>
					</div>
				</ToolbarContainer>

				<div className={css.rowsContainer}>
					{!activeResult && activeLoading ? (
						<div className={css.loadingState}><LoadingSpinner /></div>
					) : visibleLanes.length ? (
						<>
							{visibleLanes.map((lane, index) => (
								<DiscoveryRow
									key={lane.section.id}
									lane={lane}
									rowIndex={index}
									onSelectItem={onSelectItem}
									onFocusItem={handleFocusItem}
									onNavigateUp={handleNavigateUp}
									onNavigateDown={handleNavigateDown}
									onOpenDeep={handleOpenDeep}
									onRowFocus={handleRowFocus}
								/>
							))}
							{activeResult?.failedLanes?.length > 0 && (
								<div className={css.partialWarning}>{$L('Some Discovery rows could not be loaded. Refresh to retry.')}</div>
							)}
						</>
					) : activeResult ? (
						<div className={css.emptyState}>
							<div>{activeResult.error ? $L('Discovery could not be loaded.') : $L('Nothing is available in this category right now.')}</div>
							<SpottableButton className={css.retryButton} onClick={handleRefresh}>{$L('Try Again')}</SpottableButton>
						</div>
					) : (
						<div className={css.loadingState}><LoadingSpinner /></div>
					)}
				</div>
			</div>
		</div>
	);
};

const HomeLabDiscovery = (props) => {
	const {serverUrl, accessToken, user} = useAuth();
	const {isEnabled, isAuthenticated} = useSeerr();
	const serverKey = `${serverUrl || ''}|${user?.Id || 'user'}`;
	const cachedCatalogue = retainedCatalogue.serverKey === serverKey ? retainedCatalogue.catalogue : null;
	const [catalogue, setCatalogue] = useState(cachedCatalogue);
	const [catalogueLoading, setCatalogueLoading] = useState(!cachedCatalogue);
	const [catalogueResolved, setCatalogueResolved] = useState(!!cachedCatalogue);

	useEffect(() => {
		if (!isEnabled || !isAuthenticated || !serverUrl || !accessToken) {
			setCatalogue(null);
			setCatalogueResolved(true);
			setCatalogueLoading(false);
			return;
		}

		let stale = false;
		const matchingCachedCatalogue = retainedCatalogue.serverKey === serverKey
			? retainedCatalogue.catalogue
			: null;
		if (!matchingCachedCatalogue) {
			setCatalogue(null);
			setCatalogueLoading(true);
			setCatalogueResolved(false);
		}

		loadHomeLabDiscoveryCatalogue({serverUrl, accessToken}).then(result => {
			if (stale) return;
			if (result.catalogue) {
				retainedCatalogue = {serverKey, catalogue: result.catalogue};
				setCatalogue(result.catalogue);
			} else if (!matchingCachedCatalogue) {
				setCatalogue(null);
			}
			setCatalogueResolved(true);
			setCatalogueLoading(false);
		}).catch(() => {
			if (stale) return;
			if (!matchingCachedCatalogue) setCatalogue(null);
			setCatalogueResolved(true);
			setCatalogueLoading(false);
		});

		return () => { stale = true; };
	}, [accessToken, isAuthenticated, isEnabled, serverKey, serverUrl]);

	if (!isEnabled || !isAuthenticated || !serverUrl || !accessToken) {
		return <LegacySeerrDiscover {...props} />;
	}

	if (catalogueLoading && !catalogue) {
		return <div className={css.container}><div className={css.loadingState}><LoadingSpinner /></div></div>;
	}

	if (catalogueResolved && !catalogue) {
		return <LegacySeerrDiscover {...props} />;
	}

	return (
		<HomeLabDiscoveryExperience
			catalogue={catalogue}
			serverUrl={serverUrl}
			accessToken={accessToken}
			userId={user?.Id}
			onSelectItem={props.onSelectItem}
			onSelectGenre={props.onSelectGenre}
			onOpenRequests={props.onOpenRequests}
		/>
	);
};

export default HomeLabDiscovery;
