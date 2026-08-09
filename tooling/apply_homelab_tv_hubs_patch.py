#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(relative, old, new):
    path = ROOT / relative
    text = path.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise RuntimeError(f"Patch anchor not found in {relative}: {old[:120]!r}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def patch_browse():
    rel = "packages/app/src/views/Browse/Browse.js"
    replace_once(
        rel,
        "import useExternalRows from './useExternalRows';\nimport {buildBrowseRows, sameRowList} from './buildBrowseRows';",
        "import useExternalRows from './useExternalRows';\nimport useHomeLabHubRows from './useHomeLabHubRows';\nimport {buildBrowseRows, sameRowList} from './buildBrowseRows';"
    )
    replace_once(
        rel,
        "\tconst contentRowsRef = useRef(null);\n\n\tconst showFeaturedBar = (settings.featuredBarStyle !== 'off');",
        "\tconst contentRowsRef = useRef(null);\n\tconst [homeLabHub, setHomeLabHub] = useState('home');\n\tconst {rows: homeLabHubRows, isLoading: homeLabHubLoading} = useHomeLabHubRows({\n\t\thub: homeLabHub,\n\t\tapi,\n\t\tseerrEnabled,\n\t\tseerrAuthenticated,\n\t\tnextUpMaxDays: settings.nextUpMaxDays\n\t});\n\n\tconst showFeaturedBar = homeLabHub === 'home' && (settings.featuredBarStyle !== 'off');"
    )
    replace_once(
        rel,
        "\t// Only the settings the row list is built from, so a change to any other one doesn't\n",
        "\tconst activeLoading = homeLabHub === 'home' ? isLoading : homeLabHubLoading;\n\n\tuseEffect(() => {\n\t\tconst handleHomeLabHub = (event) => {\n\t\t\tconst hub = event?.detail?.hub;\n\t\t\tif (['home', 'movies', 'tv', 'anime'].indexOf(hub) === -1) return;\n\t\t\tlastFocusState = null;\n\t\t\tlastFocusedRowRef.current = null;\n\t\t\tinitialFocusSetRef.current = false;\n\t\t\tsetFocusedItemForBackdrop(null);\n\t\t\tsetHomeLabHub(hub);\n\t\t\tsetBrowseMode('rows');\n\t\t\tsetTimeout(() => {\n\t\t\t\tif (contentRowsRef.current) contentRowsRef.current.scrollTop = 0;\n\t\t\t}, 0);\n\t\t};\n\n\t\twindow.addEventListener('moonfin:homelabHub', handleHomeLabHub);\n\t\treturn () => window.removeEventListener('moonfin:homelabHub', handleHomeLabHub);\n\t}, [setBrowseMode]);\n\n\t// Only the settings the row list is built from, so a change to any other one doesn't\n"
    )
    replace_once(
        rel,
        "\tconst filteredRows = useMemo(() => {\n\t\tconst result = buildBrowseRows({",
        "\tconst filteredRows = useMemo(() => {\n\t\tif (homeLabHub !== 'home') return homeLabHubRows;\n\t\tconst result = buildBrowseRows({"
    )
    replace_once(
        rel,
        "\t}, [allRowData, seerrRows, externalRows, homeRowsConfig, pluginSectionsConfig, rowBuildSettings]);",
        "\t}, [allRowData, seerrRows, externalRows, homeRowsConfig, pluginSectionsConfig, rowBuildSettings, homeLabHub, homeLabHubRows]);"
    )
    replace_once(
        rel,
        "\tif (isLoading) {\n",
        "\tif (activeLoading) {\n"
    )


def patch_icons():
    rel = "packages/app/src/components/icons/navIcons.js"
    replace_once(
        rel,
        "\tlibraries: 'M20.84 2.18L16.91 2.96L19.65 6.5L21.62 6.1L20.84 2.18M13.97 3.54L12 3.93L14.75 7.46L16.71 7.07L13.97 3.54M9.07 4.5L7.1 4.91L9.85 8.44L11.81 8.05L9.07 4.5M4.16 5.5L3.18 5.69A2 2 0 0 0 1.61 8.04L2 10L6.9 9.03L4.16 5.5M2 10V20C2 21.11 2.9 22 4 22H20C21.11 22 22 21.11 22 20V10H2Z',\n\tsettings:",
        "\tlibraries: 'M20.84 2.18L16.91 2.96L19.65 6.5L21.62 6.1L20.84 2.18M13.97 3.54L12 3.93L14.75 7.46L16.71 7.07L13.97 3.54M9.07 4.5L7.1 4.91L9.85 8.44L11.81 8.05L9.07 4.5M4.16 5.5L3.18 5.69A2 2 0 0 0 1.61 8.04L2 10L6.9 9.03L4.16 5.5M2 10V20C2 21.11 2.9 22 4 22H20C21.11 22 22 21.11 22 20V10H2Z',\n\tmovies: 'M18 4l2 4h-3l-2-4h-3l2 4h-3L9 4H6l2 4H5L3 4H2v16h20V4h-4zM4 10h16v8H4v-8z',\n\ttv: 'M21 3H3C1.9 3 1 3.9 1 5v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM8 8v8l7-4-7-4z',\n\tanime: 'M12 2l2.9 5.88L21 9l-4.5 4.39L17.56 20 12 17.1 6.44 20l1.06-6.61L3 9l6.1-1.12L12 2z',\n\tsettings:"
    )
    replace_once(
        rel,
        "export const LibrariesIcon = (props) => <NavIcon {...props} path={PATHS.libraries} />;\nexport const SettingsIcon",
        "export const LibrariesIcon = (props) => <NavIcon {...props} path={PATHS.libraries} />;\nexport const MoviesIcon = (props) => <NavIcon {...props} path={PATHS.movies} />;\nexport const TvIcon = (props) => <NavIcon {...props} path={PATHS.tv} />;\nexport const AnimeIcon = (props) => <NavIcon {...props} path={PATHS.anime} />;\nexport const SettingsIcon"
    )


def patch_navbar():
    rel = "packages/app/src/components/NavBar/NavBar.js"
    replace_once(
        rel,
        "import {FavoritesIcon, GenresIcon, HomeIcon, SearchIcon, SettingsIcon, ShuffleIcon} from '../icons/navIcons';",
        "import {AnimeIcon, FavoritesIcon, GenresIcon, HomeIcon, MoviesIcon, SearchIcon, SettingsIcon, ShuffleIcon, TvIcon} from '../icons/navIcons';"
    )
    replace_once(
        rel,
        "\tconst handleNavKeyDown = useCallback((e) => {\n\t\tif (e.keyCode !== KEYS.DOWN) return;\n\t\te.preventDefault();\n\t\te.stopPropagation();\n\t\tfocusFirstContentTarget(CONTENT_FOCUS_TARGETS, 'down');\n\t}, []);\n\n\treturn (",
        "\tconst handleNavKeyDown = useCallback((e) => {\n\t\tif (e.keyCode !== KEYS.DOWN) return;\n\t\te.preventDefault();\n\t\te.stopPropagation();\n\t\tfocusFirstContentTarget(CONTENT_FOCUS_TARGETS, 'down');\n\t}, []);\n\n\tconst openHomeLabHub = useCallback((hub) => {\n\t\tonHome?.();\n\t\tsetTimeout(() => {\n\t\t\twindow.dispatchEvent(new CustomEvent('moonfin:homelabHub', {detail: {hub}}));\n\t\t}, 0);\n\t}, [onHome]);\n\tconst handleHomeLabHome = useCallback(() => openHomeLabHub('home'), [openHomeLabHub]);\n\tconst handleHomeLabMovies = useCallback(() => openHomeLabHub('movies'), [openHomeLabHub]);\n\tconst handleHomeLabTv = useCallback(() => openHomeLabHub('tv'), [openHomeLabHub]);\n\tconst handleHomeLabAnime = useCallback(() => openHomeLabHub('anime'), [openHomeLabHub]);\n\n\treturn ("
    )
    replace_once(
        rel,
        "\t\t\t\t\t<NavPillButton Icon={HomeIcon} slot={1} label={$L('Home')} onClick={onHome} spotlightId=\"navbar-home\" isDefault />\n\t\t\t\t\t<NavPillButton Icon={SearchIcon} slot={2} label={$L('Search')} onClick={onSearch} spotlightId=\"navbar-search\" />",
        "\t\t\t\t\t<NavPillButton Icon={HomeIcon} slot={1} label={$L('Home')} onClick={handleHomeLabHome} spotlightId=\"navbar-home\" isDefault />\n\t\t\t\t\t<NavPillButton Icon={MoviesIcon} slot={2} label={$L('Movies')} onClick={handleHomeLabMovies} spotlightId=\"navbar-homelab-movies\" />\n\t\t\t\t\t<NavPillButton Icon={TvIcon} slot={3} label={$L('TV')} onClick={handleHomeLabTv} spotlightId=\"navbar-homelab-tv\" />\n\t\t\t\t\t<NavPillButton Icon={AnimeIcon} slot={4} label={$L('Anime')} onClick={handleHomeLabAnime} spotlightId=\"navbar-homelab-anime\" />\n\t\t\t\t\t<NavPillButton Icon={SearchIcon} slot={5} label={$L('Search')} onClick={onSearch} spotlightId=\"navbar-search\" />"
    )


def patch_sidebar():
    rel = "packages/app/src/components/Sidebar/Sidebar.js"
    replace_once(
        rel,
        "import {FavoritesIcon, GenresIcon, HomeIcon, SearchIcon, SettingsIcon, ShuffleIcon} from '../icons/navIcons';",
        "import {AnimeIcon, FavoritesIcon, GenresIcon, HomeIcon, MoviesIcon, SearchIcon, SettingsIcon, ShuffleIcon, TvIcon} from '../icons/navIcons';"
    )
    replace_once(
        rel,
        "\tconst handleNavKeyDown = useCallback((e) => {\n\t\tif (e.keyCode === KEYS.RIGHT) {\n\t\t\te.preventDefault();\n\t\t\te.stopPropagation();\n\t\t\tfocusFirstContentTarget(SIDEBAR_CONTENT_FOCUS_TARGETS, 'right');\n\t\t} else if (e.keyCode === KEYS.UP || e.keyCode === KEYS.DOWN) {\n\t\t\ttrapVerticalEdges(e);\n\t\t}\n\t}, []);\n\n\treturn (",
        "\tconst handleNavKeyDown = useCallback((e) => {\n\t\tif (e.keyCode === KEYS.RIGHT) {\n\t\t\te.preventDefault();\n\t\t\te.stopPropagation();\n\t\t\tfocusFirstContentTarget(SIDEBAR_CONTENT_FOCUS_TARGETS, 'right');\n\t\t} else if (e.keyCode === KEYS.UP || e.keyCode === KEYS.DOWN) {\n\t\t\ttrapVerticalEdges(e);\n\t\t}\n\t}, []);\n\n\tconst openHomeLabHub = useCallback((hub) => {\n\t\tonHome?.();\n\t\tsetTimeout(() => {\n\t\t\twindow.dispatchEvent(new CustomEvent('moonfin:homelabHub', {detail: {hub}}));\n\t\t}, 0);\n\t}, [onHome]);\n\tconst handleHomeLabHome = useCallback(() => openHomeLabHub('home'), [openHomeLabHub]);\n\tconst handleHomeLabMovies = useCallback(() => openHomeLabHub('movies'), [openHomeLabHub]);\n\tconst handleHomeLabTv = useCallback(() => openHomeLabHub('tv'), [openHomeLabHub]);\n\tconst handleHomeLabAnime = useCallback(() => openHomeLabHub('anime'), [openHomeLabHub]);\n\n\treturn ("
    )
    replace_once(
        rel,
        "\t\t\t\t<SidebarItem Icon={HomeIcon} slot={1} label={$L('Home')} onClick={onHome} spotlightId=\"navbar-home\" className={spotlightDefaultClass} />\n\t\t\t\t<SidebarItem Icon={SearchIcon} slot={2} label={$L('Search')} onClick={onSearch} />",
        "\t\t\t\t<SidebarItem Icon={HomeIcon} slot={1} label={$L('Home')} onClick={handleHomeLabHome} spotlightId=\"navbar-home\" className={spotlightDefaultClass} />\n\t\t\t\t<SidebarItem Icon={MoviesIcon} slot={2} label={$L('Movies')} onClick={handleHomeLabMovies} spotlightId=\"navbar-homelab-movies\" />\n\t\t\t\t<SidebarItem Icon={TvIcon} slot={3} label={$L('TV')} onClick={handleHomeLabTv} spotlightId=\"navbar-homelab-tv\" />\n\t\t\t\t<SidebarItem Icon={AnimeIcon} slot={4} label={$L('Anime')} onClick={handleHomeLabAnime} spotlightId=\"navbar-homelab-anime\" />\n\t\t\t\t<SidebarItem Icon={SearchIcon} slot={5} label={$L('Search')} onClick={onSearch} />"
    )


def main():
    patch_browse()
    patch_icons()
    patch_navbar()
    patch_sidebar()
    print("Home Lab Smart-TV hub patch applied.")


if __name__ == "__main__":
    main()
