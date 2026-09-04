type FootprintArticle = {
    title: string;
    url: string;
    place: string;
    lat: number;
    lng: number;
    date?: string;
    isFallbackLocation: boolean;
};

type FootprintProfile = {
    title: string;
    url: string;
    place: string;
    lat: number;
    lng: number;
};

type FootprintLocationCluster = {
    key: string;
    place: string;
    lat: number;
    lng: number;
    articles: FootprintArticle[];
};

type FootprintViewState = 'preview' | 'expanding' | 'expanded' | 'collapsing';

type FootprintCamera = {
    anchorLatitude: number;
    widthRatio: number;
    distance: number;
    tilt: number;
    northPoleY: number;
    rotationSpeed: number;
};

type FootprintSourceSnapshot = {
    article: FootprintArticle;
    element: HTMLElement;
    rect: DOMRect;
};

const loadedScripts = new Map<string, Promise<void>>();

function initImageCaptions() {
    const article = document.querySelector<HTMLElement>('.article-content');
    if (!article) return;

    article.querySelectorAll<HTMLImageElement>('img[data-caption]').forEach((image) => {
        const caption = image.dataset.caption?.trim();
        if (!caption) return;

        const existingFigure = image.closest('figure');
        if (existingFigure) {
            if (!existingFigure.querySelector('figcaption')) {
                const figcaption = document.createElement('figcaption');
                figcaption.textContent = caption;
                existingFigure.appendChild(figcaption);
            }
            return;
        }

        const paragraph = image.closest('p');
        if (!paragraph || paragraph.textContent?.trim()) return;

        const content = image.parentElement?.tagName === 'A' ? image.parentElement : image;
        const figure = document.createElement('figure');
        figure.className = 'article-image-caption';
        content.parentElement?.insertBefore(figure, content);
        figure.appendChild(content);

        const figcaption = document.createElement('figcaption');
        figcaption.textContent = caption;
        figure.appendChild(figcaption);
    });
}

function loadScript(src: string): Promise<void> {
    if (loadedScripts.has(src)) return loadedScripts.get(src);

    const promise = new Promise<void>((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement;
        if (existing) {
            if (existing.dataset.footprintLoaded === 'true') {
                resolve();
                return;
            }
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.defer = true;
        script.onload = () => {
            script.dataset.footprintLoaded = 'true';
            resolve();
        };
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });

    loadedScripts.set(src, promise);
    return promise;
}

function parseFootprintJSON<T>(widget: HTMLElement, selector: string, fallback: T): T {
    const data = widget.querySelector<HTMLScriptElement>(selector);
    if (!data?.textContent) return fallback;

    try {
        const parsed = JSON.parse(data.textContent);
        return (typeof parsed === 'string' ? JSON.parse(parsed) : parsed) as T;
    } catch (error) {
        console.warn(`Unable to parse footprint data: ${selector}`, error);
        return fallback;
    }
}

function parseFootprintArticles(widget: HTMLElement): FootprintArticle[] {
    const points = parseFootprintJSON<FootprintArticle[]>(widget, '.footprint-points', []);
    if (!Array.isArray(points)) return [];

    return points
        .filter((point) => Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng)))
        .map((point) => ({
            ...point,
            lat: Number(point.lat),
            lng: Number(point.lng),
            isFallbackLocation: Boolean(point.isFallbackLocation),
        }));
}

function parseFootprintProfile(widget: HTMLElement): FootprintProfile {
    const fallback: FootprintProfile = {
        title: '现居地',
        url: '/about/',
        place: '深圳',
        lat: 22.5431,
        lng: 114.0579,
    };
    const profile = parseFootprintJSON<FootprintProfile>(widget, '.footprint-profile', fallback);
    return {
        ...fallback,
        ...profile,
        lat: Number(profile.lat ?? fallback.lat),
        lng: Number(profile.lng ?? fallback.lng),
    };
}

function groupFootprintArticles(articles: FootprintArticle[]): FootprintLocationCluster[] {
    const grouped = new Map<string, FootprintLocationCluster>();

    articles.forEach((article) => {
        const key = `${article.lat.toFixed(4)},${article.lng.toFixed(4)}`;
        const cluster = grouped.get(key) || {
            key,
            place: article.place,
            lat: article.lat,
            lng: article.lng,
            articles: [],
        };
        cluster.articles.push(article);
        grouped.set(key, cluster);
    });

    return Array.from(grouped.values()).map((cluster) => ({
        ...cluster,
        articles: cluster.articles.sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    }));
}

function positionFootprintTip(container: HTMLElement, tip: HTMLElement, anchor: { x: number; y: number }) {
    const bounds = container.getBoundingClientRect();
    const offset = tip.classList.contains('footprint-globe__tip--preview-articles')
        ? 12
        : 14;
    const tipWidth = tip.offsetWidth || 220;
    const tipHeight = tip.offsetHeight || 80;
    const maxLeft = Math.max(offset, bounds.width - tipWidth - offset);
    const maxTop = Math.max(offset, bounds.height - tipHeight - offset);
    const rawLeft = anchor.x + offset;
    const rawTop = anchor.y - tipHeight / 2;
    const left = Math.min(maxLeft, Math.max(offset, rawLeft));
    const top = Math.min(maxTop, Math.max(offset, rawTop));

    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
}

async function loadBoundaryData(d3: any, boundaryUrl: string) {
    const cacheKey = `footprint:boundary:${boundaryUrl}`;

    try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch (error) {
        console.warn('Unable to read cached footprint boundary data', error);
    }

    const data = await d3.json(boundaryUrl);

    try {
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (error) {
        console.warn('Unable to cache footprint boundary data', error);
    }

    return data;
}

async function initFootprintWidget(widget: HTMLElement) {
    const svg = widget.querySelector<SVGSVGElement>('.footprint-globe__canvas');
    const globeSlot = widget.querySelector<HTMLElement>('.footprint-globe__slot');
    const globe = widget.querySelector<HTMLElement>('.footprint-globe');
    const empty = widget.querySelector<HTMLElement>('.footprint-globe__empty');
    const tip = widget.querySelector<HTMLElement>('.footprint-globe__tip');
    const zoomLabel = widget.querySelector<HTMLElement>('.footprint-globe__zoom');
    const zoomInButton = widget.querySelector<HTMLButtonElement>('[data-action="zoom-in"]');
    const zoomOutButton = widget.querySelector<HTMLButtonElement>('[data-action="zoom-out"]');
    const resetButton = widget.querySelector<HTMLButtonElement>('[data-action="reset"]');
    const expandButton = widget.querySelector<HTMLButtonElement>('[data-action="expand"]');
    const expandIcon = widget.querySelector<HTMLElement>('[data-expand-icon]');
    const expandLabel = widget.querySelector<HTMLElement>('[data-expand-label]');
    const markersLayer = widget.querySelector<HTMLElement>('.footprint-globe__markers-layer');
    const starfield = widget.querySelector<HTMLElement>('.footprint-globe__starfield');
    const status = widget.querySelector<HTMLElement>('.footprint-globe__status');
    const articles = parseFootprintArticles(widget);
    const locatedArticles = articles.filter((article) => !article.isFallbackLocation);
    const profile = parseFootprintProfile(widget);
    const clusters = groupFootprintArticles(locatedArticles);

    if (!svg || !globeSlot || !globe || !empty || !tip || !zoomLabel || !zoomInButton || !zoomOutButton || !resetButton || !expandButton || !expandLabel || !markersLayer || !starfield || !status) return;
    empty.hidden = articles.length > 0;

    const d3Url = widget.dataset.d3Url;
    const projectionUrl = widget.dataset.projectionUrl;
    const topojsonUrl = widget.dataset.topojsonUrl;
    const boundaryUrl = widget.dataset.boundaryUrl;
    const chinaBoundaryUrl = widget.dataset.chinaBoundaryUrl;
    const starfieldEngineUrl = widget.dataset.starfieldEngineUrl;
    const starfieldBundleUrl = widget.dataset.starfieldBundleUrl;
    if (!d3Url || !topojsonUrl || !boundaryUrl || !chinaBoundaryUrl) return;

    try {
        await Promise.all([loadScript(d3Url), loadScript(topojsonUrl)]);
    } catch (error) {
        empty.hidden = false;
        empty.textContent = '地图资源加载失败';
        console.warn(error);
        return;
    }

    if (projectionUrl) {
        try {
            await loadScript(projectionUrl);
        } catch (error) {
            console.warn('Satellite projection unavailable; using orthographic fallback', error);
        }
    }

    const d3 = (window as any).d3;
    const topojson = (window as any).topojson;
    if (!d3 || !topojson) return;

    let world: any;
    let chinaWorld: any;
    try {
        [world, chinaWorld] = await Promise.all([
            loadBoundaryData(d3, boundaryUrl),
            loadBoundaryData(d3, chinaBoundaryUrl),
        ]);
    } catch (error) {
        empty.hidden = false;
        empty.textContent = '国家边界加载失败';
        console.warn(error);
        return;
    }

    const countries = topojson.feature(world, world.objects.countries);
    const borders = topojson.mesh(world, world.objects.countries, (a: any, b: any) => a !== b);
    const chinaIds = new Set(['156', '158', '344', '446']);
    const visitedCountryIds = new Set<string>();
    const chinaObject = chinaWorld.objects.default;
    const chinaGeometry = topojson.merge(
        chinaWorld,
        chinaObject.geometries.filter((item: any) => item.type === 'Polygon' || item.type === 'MultiPolygon')
    );
    let chinaVisited = false;

    function markVisitedCountry(point: { lat: number; lng: number }) {
        const coordinates = [Number(point.lng), Number(point.lat)];
        if (d3.geoContains(chinaGeometry, coordinates)) {
            chinaVisited = true;
            chinaIds.forEach((id) => visitedCountryIds.add(id));
            return;
        }

        const country = countries.features.find((feature: any) => d3.geoContains(feature, coordinates));
        if (!country) return;

        const countryId = String(country.id);
        if (chinaIds.has(countryId)) {
            chinaVisited = true;
            chinaIds.forEach((id) => visitedCountryIds.add(id));
            return;
        }

        visitedCountryIds.add(countryId);
    }

    locatedArticles.forEach(markVisitedCountry);
    markVisitedCountry(profile);

    const selection = d3.select(svg);
    selection.selectAll('*').remove();

    const sphere = { type: 'Sphere' };
    const graticule = d3.geoGraticule10();
    const supportsSatellite = typeof d3.geoSatellite === 'function';
    const createProjection = () => supportsSatellite
        ? d3.geoSatellite().precision(0.5)
        : d3.geoOrthographic().clipAngle(90).precision(0.5);
    const projection = createProjection();
    const targetProjection = createProjection();
    const frameProjection = createProjection();
    const path = d3.geoPath(projection);
    const camera: FootprintCamera = {
        anchorLatitude: Number(widget.dataset.cameraAnchorLatitude || 0),
        widthRatio: Number(widget.dataset.cameraWidthRatio || 0.5),
        distance: Number(widget.dataset.cameraDistance || 18),
        tilt: 0,
        northPoleY: Number(widget.dataset.cameraNorthPoleY || 0.5),
        rotationSpeed: Number(widget.dataset.cameraRotationSpeed || 2),
    };
    const defaultCameraDistance = camera.distance;
    const cameraDistanceExtent: [number, number] = [12, 36];
    // geoSatellite measures tilt from the local surface normal:
    // 0° looks straight down and 90° looks toward the horizon.
    const getSatelliteTilt = () => Math.max(0, Math.min(90, camera.tilt));
    const getSatelliteDistance = () => Math.max(1.01, camera.distance);
    // Keep the scale calibration independent from the configured default and
    // slider range. At the same distance, the globe must always have the same
    // apparent size; 8R remains the immutable widthRatio reference distance.
    const scaleReferenceDistance = 8;
    const defaultPreviewRotation: [number, number, number] = [-104, -28, 0];
    // The virtual camera starts above the equator at the home longitude.
    const defaultExpandedRotation: [number, number, number] = [-profile.lng, -camera.anchorLatitude, 0];
    const zoomExtent: [number, number] = [0.75, 6];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let previewRotation: [number, number, number] = [...defaultPreviewRotation];
    let expandedRotation: [number, number, number] = [...defaultExpandedRotation];
    let expandedCameraRotation: [number, number, number] = [...defaultExpandedRotation];
    let scaleFactor = 1;
    let cameraProgress = 0;
    let state: FootprintViewState = 'preview';
    let savedScrollY = 0;
    let previewRect: DOMRect | null = null;
    let sourceSnapshots: FootprintSourceSnapshot[] = [];
    let avatarSnapshot: { element: HTMLElement; rect: DOMRect } | null = null;
    let transitionStage: HTMLElement | null = null;
    let rotationFrame = 0;
    let lastRotationTime = 0;
    const resumeTimers = new Map<string, number>();
    let closeTipTimer = 0;
    let activeClusterKey = '';
    let dragMode: 'axis' | 'camera' = 'camera';
    let starfieldContainer: any = null;
    let starfieldPromise: Promise<any> | null = null;
    let starfieldLayout: 'preview' | 'expanded' | null = null;
    let starfieldWidth = 0;
    let starfieldHeight = 0;
    let previewLayerFrame = 0;
    const pauseReasons = new Set<string>();
    const inertNodes: Array<{ node: HTMLElement; inert: boolean; ariaHidden: string | null }> = [];
    const clusterMarkers = new Map<string, HTMLButtonElement>();
    const homeClusterKey = `${profile.lat.toFixed(4)},${profile.lng.toFixed(4)}`;

    type GlobeLayerFrame = {
        left: string;
        top: string;
        width: string;
        height: string;
        borderRadius: string;
    };

    function previewGlobeLayerFrame(rect = globeSlot.getBoundingClientRect()): GlobeLayerFrame {
        return {
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${Math.max(1, rect.width)}px`,
            height: `${Math.max(1, rect.height)}px`,
            borderRadius: getComputedStyle(globeSlot).borderRadius,
        };
    }

    function expandedGlobeLayerFrame(): GlobeLayerFrame {
        return {
            left: '0px',
            top: '0px',
            width: `${Math.max(1, window.innerWidth)}px`,
            height: `${Math.max(1, window.innerHeight)}px`,
            borderRadius: '0px',
        };
    }

    function applyGlobeLayerFrame(frame: GlobeLayerFrame) {
        Object.assign(globe.style, frame);
    }

    function syncPreviewGlobeLayer() {
        if (state !== 'preview') return;
        previewRect = globeSlot.getBoundingClientRect();
        applyGlobeLayerFrame(previewGlobeLayerFrame(previewRect));
    }

    function queuePreviewGlobeLayerSync() {
        if (state !== 'preview' || previewLayerFrame) return;
        previewLayerFrame = requestAnimationFrame(() => {
            previewLayerFrame = 0;
            syncPreviewGlobeLayer();
        });
    }

    function syncStarfieldSize(force = false) {
        if (!starfieldContainer) return;
        const box = starfield.getBoundingClientRect();
        const nextWidth = Math.max(1, Math.round(box.width));
        const nextHeight = Math.max(1, Math.round(box.height));
        if (!force && nextWidth === starfieldWidth && nextHeight === starfieldHeight) return;

        starfieldWidth = nextWidth;
        starfieldHeight = nextHeight;
        starfieldContainer.canvas?.resize?.();
    }

    function ensureStarfield() {
        if (starfieldContainer) return Promise.resolve(starfieldContainer);
        if (starfieldPromise) return starfieldPromise;
        if (!starfieldEngineUrl || !starfieldBundleUrl) return Promise.resolve(null);

        starfieldPromise = (async () => {
            await loadScript(starfieldEngineUrl);
            await loadScript(starfieldBundleUrl);

            const engine = (window as any).tsParticles;
            const loadBasic = (window as any).loadBasic;
            if (!engine || typeof loadBasic !== 'function') {
                throw new Error('tsParticles basic bundle is unavailable');
            }

            await loadBasic(engine);
            const container = await engine.load({
                id: starfield.id,
                options: {
                    fullScreen: { enable: false },
                    background: {
                        color: { value: '#000000' },
                        opacity: 0,
                    },
                    detectRetina: true,
                    fpsLimit: reduceMotion ? 1 : 40,
                    pauseOnBlur: true,
                    pauseOnOutsideViewport: true,
                    particles: {
                        color: {
                            value: ['#ffffff', '#d8e9ff', '#a9cfff', '#fff4dc'],
                        },
                        links: { enable: false },
                        move: {
                            direction: 'none',
                            enable: !reduceMotion,
                            outModes: { default: 'out' },
                            random: true,
                            speed: 0.055,
                            straight: false,
                        },
                        number: {
                            value: 640,
                            limit: 900,
                            density: {
                                enable: true,
                                width: 960,
                                height: 600,
                            },
                        },
                        opacity: {
                            value: { min: 0.28, max: 0.94 },
                            animation: {
                                enable: !reduceMotion,
                                speed: { min: 0.2, max: 1.05 },
                                startValue: 'random',
                                sync: false,
                            },
                        },
                        shape: { type: 'circle' },
                        size: {
                            value: { min: 0.55, max: 2.25 },
                            animation: {
                                enable: !reduceMotion,
                                speed: { min: 0.1, max: 0.55 },
                                startValue: 'random',
                                sync: false,
                            },
                        },
                    },
                    interactivity: {
                        events: {
                            onClick: { enable: false },
                            onHover: { enable: false },
                        },
                    },
                },
            });

            starfieldContainer = container;
            starfieldLayout = state === 'preview' ? 'preview' : null;
            starfieldWidth = 0;
            starfieldHeight = 0;
            syncStarfieldSize(true);
            starfield.classList.add('is-ready');
            return container;
        })().catch((error) => {
            starfieldPromise = null;
            console.warn('Unable to load Footprint starfield; keeping the gradient background', error);
            return null;
        });

        return starfieldPromise;
    }

    async function playStarfield(refreshLayout = false) {
        const container = await ensureStarfield();
        if (!container || state === 'collapsing') return;

        const targetLayout = state === 'expanded' ? 'expanded' : 'preview';
        syncStarfieldSize(true);

        // Resizing the tsParticles canvas updates its pixel buffer, but the
        // existing particles keep coordinates from the old preview rectangle.
        // Refresh once after each stable preview/fullscreen transition so the
        // particles are regenerated across the complete new drawing area.
        if (refreshLayout && starfieldLayout !== targetLayout && typeof container.refresh === 'function') {
            await container.refresh();
            starfieldWidth = 0;
            starfieldHeight = 0;
            syncStarfieldSize(true);
        }

        starfieldLayout = targetLayout;
        container.play?.();
        if (reduceMotion) {
            requestAnimationFrame(() => container.pause?.());
        }
    }

    function setExpandedMarkersVisible(visible: boolean) {
        markersLayer.classList.toggle('is-visible', visible);
        markersLayer.setAttribute('aria-hidden', String(!visible));
        (markersLayer as any).inert = !visible;
    }

    const ocean = selection.append('path').attr('class', 'footprint-globe__ocean');
    const grid = selection.append('path').attr('class', 'footprint-globe__grid');
    const landLayer = selection.append('g').attr('class', 'footprint-globe__land');
    const land = landLayer
        .selectAll('path')
        .data(countries.features)
        .enter()
        .append('path')
        .attr('class', (feature: any) => {
            const countryId = String(feature.id);
            return visitedCountryIds.has(countryId)
                ? 'footprint-globe__country footprint-globe__country--visited'
                : 'footprint-globe__country';
        });
    const border = selection.append('path').attr('class', 'footprint-globe__borders').datum(borders);
    const china = selection
        .append('path')
        .attr('class', chinaVisited
            ? 'footprint-globe__china footprint-globe__china--visited'
            : 'footprint-globe__china')
        .datum(chinaGeometry);
    const markerLayer = selection.append('g').attr('class', 'footprint-globe__markers footprint-globe__markers--preview');
    const previewPoints: Array<FootprintLocationCluster | FootprintProfile> = [...clusters, profile];

    function openPreviewPointTip(
        point: FootprintLocationCluster | FootprintProfile,
        isProfile: boolean,
        anchor: { x: number; y: number }
    ) {
        window.clearTimeout(closeTipTimer);
        pauseReasons.add('tooltip');
        tip.replaceChildren();
        tip.classList.remove(
            'footprint-globe__tip--articles',
            'footprint-globe__tip--preview-articles'
        );
        tip.classList.add('footprint-globe__tip--preview-articles');

        const heading = document.createElement('strong');
        heading.textContent = point.place;
        const list = document.createElement('ul');
        const previewCluster = isProfile ? null : point as FootprintLocationCluster;
        const titles = isProfile
            ? [{ title: profile.title, url: profile.url }]
            : previewCluster.articles.map((article) => ({ title: article.title, url: '' }));
        titles.forEach(({ title, url }) => {
            const item = document.createElement('li');
            if (url) {
                item.className = 'footprint-globe__tip-current-location';
                const link = document.createElement('a');
                link.href = url;
                link.textContent = title;
                item.appendChild(link);
            } else {
                item.textContent = title;
            }
            list.appendChild(item);
        });
        tip.append(heading, list);
        tip.hidden = false;
        positionFootprintTip(globe, tip, anchor);
    }

    previewPoints.forEach((point, index) => {
        const isProfile = index === previewPoints.length - 1;
        const markerLink = markerLayer
            .append('a')
            .attr('href', isProfile ? profile.url : (point as FootprintLocationCluster).articles[0]?.url)
            .attr('aria-label', isProfile
                ? `${profile.place}: ${profile.title}`
                : `${point.place}: ${(point as FootprintLocationCluster).articles.length} 篇文章`);
        markerLink
            .append('circle')
            .attr('r', 8)
            .attr('class', 'footprint-globe__marker-hit');
        const marker = markerLink
            .append('circle')
            .attr('r', 3.6)
            .attr('class', isProfile
                ? 'footprint-globe__marker footprint-globe__marker--profile'
                : 'footprint-globe__marker');

        markerLink
            .on('pointerenter', () => {
                openPreviewPointTip(point, isProfile, {
                    x: Number(marker.attr('cx')) || 0,
                    y: Number(marker.attr('cy')) || 0,
                });
            })
            .on('pointerleave', scheduleCloseClusterTip);

        markerLink
            .on('focus', () => {
                openPreviewPointTip(point, isProfile, {
                    x: Number(marker.attr('cx')) || 0,
                    y: Number(marker.attr('cy')) || 0,
                });
            })
            .on('blur', scheduleCloseClusterTip);
    });

    const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress;
    const easeInOut = (progress: number) => progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    function getExpandedScale(target: any, width: number, fullRotation: [number, number, number]) {
        const satelliteDistance = getSatelliteDistance();
        if (supportsSatellite) {
            target
                .distance(satelliteDistance)
                .tilt(getSatelliteTilt());
        } else {
            target.clipAngle(90);
        }

        target
            .rotate(fullRotation)
            .scale(1)
            .translate([0, 0]);

        const bounds = d3.geoPath(target).bounds(sphere);
        const projectedWidth = bounds[1][0] - bounds[0][0];
        const distanceRatio = scaleReferenceDistance / satelliteDistance;
        return Number.isFinite(projectedWidth) && projectedWidth > 0
            ? width * camera.widthRatio * distanceRatio / projectedWidth
            : width * camera.widthRatio * distanceRatio / 2;
    }

    function configureProjection(
        target: any,
        width: number,
        height: number,
        progress: number,
        fullRotation = expandedRotation,
        zoom = scaleFactor,
        cameraRotation = expandedCameraRotation
    ) {
        const previewScale = Math.min(width, height) * 0.46;
        const expandedScale = getExpandedScale(frameProjection, width, cameraRotation);
        // Preview zoom belongs to the compact globe only. Fade it out while
        // entering fullscreen so the expanded globe's apparent size is driven
        // exclusively by the satellite distance.
        const effectiveZoom = lerp(zoom, 1, progress);
        const rotation: [number, number, number] = [
            lerp(previewRotation[0], fullRotation[0], progress),
            lerp(previewRotation[1], fullRotation[1], progress),
            lerp(previewRotation[2], fullRotation[2], progress),
        ];
        const frameRotation: [number, number, number] = [
            lerp(previewRotation[0], cameraRotation[0], progress),
            lerp(previewRotation[1], cameraRotation[1], progress),
            lerp(previewRotation[2], cameraRotation[2], progress),
        ];

        if (supportsSatellite) {
            target.distance(lerp(8, getSatelliteDistance(), progress));
            target.tilt(getSatelliteTilt() * progress);
        } else {
            target.clipAngle(90);
        }

        target
            .rotate(rotation)
            .scale(lerp(previewScale, expandedScale, progress) * effectiveZoom)
            .translate([width / 2, height / 2]);

        if (progress > 0) {
            if (supportsSatellite) {
                frameProjection.distance(lerp(8, getSatelliteDistance(), progress));
                frameProjection.tilt(getSatelliteTilt() * progress);
            } else {
                frameProjection.clipAngle(90);
            }
            frameProjection
                .rotate(frameRotation)
                .scale(lerp(previewScale, expandedScale, progress) * effectiveZoom)
                .translate([width / 2, height / 2]);

            const northPole = frameProjection([profile.lng, 90]);
            if (northPole && Number.isFinite(northPole[1])) {
                const targetY = height * camera.northPoleY;
                const fullTranslateY = height / 2 + targetY - northPole[1];
                target.translate([width / 2, lerp(height / 2, fullTranslateY, progress)]);
            }
        }

        return target;
    }

    function pointIsVisible(target: any, coordinates: [number, number]) {
        let visible = false;
        const sink = {
            point: () => { visible = true; },
            lineStart: () => undefined,
            lineEnd: () => undefined,
            polygonStart: () => undefined,
            polygonEnd: () => undefined,
            sphere: () => undefined,
        };
        d3.geoStream({ type: 'Point', coordinates }, target.stream(sink));
        return visible;
    }

    function getTargetPoint(point: { lat: number; lng: number }, kind: 'cluster' | 'profile' = 'cluster') {
        const width = Math.max(1, window.innerWidth);
        const height = Math.max(1, window.innerHeight);
        configureProjection(targetProjection, width, height, 1, expandedRotation, scaleFactor);
        const projected = targetProjection([Number(point.lng), Number(point.lat)]);
        if (!projected) return { x: width / 2, y: height / 2 };

        const isHome = `${Number(point.lat).toFixed(4)},${Number(point.lng).toFixed(4)}` === homeClusterKey;
        if (!isHome) return { x: projected[0], y: projected[1] };
        return kind === 'profile'
            ? { x: projected[0] - 22, y: projected[1] - 8 }
            : { x: projected[0] + 25, y: projected[1] + 10 };
    }

    function updateHTMLMarkers(width: number, height: number) {
        clusterMarkers.forEach((marker, key) => {
            const cluster = clusters.find((item) => item.key === key);
            if (!cluster) return;
            const coordinates: [number, number] = [cluster.lng, cluster.lat];
            const projected = projection(coordinates);
            const visible = projected && pointIsVisible(projection, coordinates);
            const x = projected ? projected[0] : -999;
            const y = projected ? projected[1] : -999;
            marker.style.left = `${x}px`;
            marker.style.top = `${y}px`;
            marker.hidden = !visible || !projected || x < -24 || x > width + 24 || y < -24 || y > height + 24;
            if (marker.hidden && activeClusterKey === key) closeClusterTip(true);
        });

        const avatarMarker = markersLayer.querySelector<HTMLElement>('.footprint-profile-marker');
        if (avatarMarker) {
            const coordinates: [number, number] = [profile.lng, profile.lat];
            const projected = projection(coordinates);
            const visible = projected && pointIsVisible(projection, coordinates);
            avatarMarker.style.left = `${projected ? projected[0] - 22 : -999}px`;
            avatarMarker.style.top = `${projected ? projected[1] - 8 : -999}px`;
            avatarMarker.hidden = !visible || !projected;
        }
    }

    function render() {
        const box = globe.getBoundingClientRect();
        const width = Math.max(220, box.width || 260);
        const height = Math.max(220, box.height || 260);
        syncStarfieldSize();

        configureProjection(projection, width, height, cameraProgress);
        selection.attr('viewBox', `0 0 ${width} ${height}`);
        zoomLabel.textContent = state === 'preview'
            ? `${Math.round(scaleFactor * 100)}%`
            : `${camera.distance.toFixed(1)}R`;

        ocean.datum(sphere).attr('d', path);
        grid.datum(graticule).attr('d', path);
        land.attr('d', path);
        china.attr('d', path);
        border.attr('d', path);

        markerLayer.selectAll('a').each(function (_: unknown, index: number) {
            const point = previewPoints[index];
            const coordinates = projection([Number(point.lng), Number(point.lat)]);
            const visible = pointIsVisible(projection, [Number(point.lng), Number(point.lat)]);
            const markerLink = d3.select(this);
            markerLink.selectAll('circle')
                .attr('cx', coordinates ? coordinates[0] : -999)
                .attr('cy', coordinates ? coordinates[1] : -999);
            markerLink.style('display', visible && coordinates ? null : 'none');
        });

        updateHTMLMarkers(width, height);
    }

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent(zoomExtent)
        .on('zoom', (event: any) => {
            scaleFactor = event.transform.k;
            render();
            if (state === 'expanded') pauseRotationTemporarily('zoom');
        });

    function setScale(nextScale: number) {
        const clampedScale = Math.max(zoomExtent[0], Math.min(zoomExtent[1], nextScale));
        selection.call(zoomBehavior.transform, d3.zoomIdentity.scale(clampedScale));
    }

    function isGlobeSurfaceTarget(target: EventTarget | null) {
        if (!(target instanceof Element)) return false;
        return Boolean(target.closest([
            '.footprint-globe__ocean',
            '.footprint-globe__country',
            '.footprint-globe__china',
            '.footprint-globe__grid',
            '.footprint-globe__borders',
            '.footprint-globe__marker',
        ].join(', ')));
    }

    selection.call(
        d3.drag<SVGSVGElement, unknown>()
            .on('start', (event: any) => {
                dragMode = isGlobeSurfaceTarget(event.sourceEvent?.target) ? 'axis' : 'camera';
                pauseReasons.add('drag');
                clearTemporaryRotationPause('drag-end');
            })
            .on('drag', (event: any) => {
                const dragSpeed = 0.45 / Math.max(1, Math.sqrt(scaleFactor));
                const longitudeDelta = event.dx * dragSpeed;
                const latitudeDelta = -event.dy * dragSpeed;

                if (state === 'preview') {
                    previewRotation = [
                        previewRotation[0] + longitudeDelta,
                        Math.max(-90, Math.min(90, previewRotation[1] + latitudeDelta)),
                        previewRotation[2],
                    ];
                } else if (dragMode === 'axis') {
                    // A surface drag rotates only the earth. The camera frame and its
                    // north-pole calibration stay fixed, so every gesture rolls the
                    // sphere around its visual center instead of moving the viewpoint.
                    expandedRotation = [
                        expandedRotation[0] + longitudeDelta,
                        Math.max(-90, Math.min(90, expandedRotation[1] + latitudeDelta)),
                        expandedRotation[2],
                    ];
                } else {
                    // A background drag changes the camera frame. Apply the same delta
                    // to the rendered earth so its existing orientation relative to
                    // the camera is preserved while the viewpoint moves.
                    const nextCameraLatitude = Math.max(
                        -80,
                        Math.min(80, expandedCameraRotation[1] + latitudeDelta)
                    );
                    const appliedLatitudeDelta = nextCameraLatitude - expandedCameraRotation[1];
                    expandedCameraRotation = [
                        expandedCameraRotation[0] + longitudeDelta,
                        nextCameraLatitude,
                        expandedCameraRotation[2],
                    ];
                    expandedRotation = [
                        expandedRotation[0] + longitudeDelta,
                        Math.max(-90, Math.min(90, expandedRotation[1] + appliedLatitudeDelta)),
                        expandedRotation[2],
                    ];
                }
                render();
            })
            .on('end', () => {
                pauseReasons.delete('drag');
                pauseRotationTemporarily('drag-end');
            })
    );

    selection.call(zoomBehavior);

    zoomInButton.addEventListener('click', (event) => {
        event.stopPropagation();
        if (state === 'expanded') setCameraDistance(camera.distance - 1);
        else setScale(scaleFactor + 0.25);
    });

    zoomOutButton.addEventListener('click', (event) => {
        event.stopPropagation();
        if (state === 'expanded') setCameraDistance(camera.distance + 1);
        else setScale(scaleFactor - 0.25);
    });

    resetButton.addEventListener('click', (event) => {
        event.stopPropagation();
        if (state === 'preview') {
            previewRotation = [...defaultPreviewRotation];
            selection.call(zoomBehavior.transform, d3.zoomIdentity.scale(1));
        } else {
            expandedRotation = [...defaultExpandedRotation];
            expandedCameraRotation = [...defaultExpandedRotation];
            scaleFactor = 1;
            setCameraDistance(defaultCameraDistance);
        }
        render();
    });

    widget.querySelector<HTMLElement>('.footprint-globe__controls')?.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
    });

    widget.querySelector<HTMLElement>('.footprint-globe__controls')?.addEventListener('wheel', (event) => {
        event.preventDefault();
        event.stopPropagation();
    }, { passive: false });

    function setCameraDistance(nextDistance: number) {
        const [min, max] = cameraDistanceExtent;
        const clamped = Math.max(min, Math.min(max, nextDistance));
        camera.distance = Math.round(clamped * 10) / 10;
        render();
        if (state === 'expanded') pauseRotationTemporarily('distance-control');
    }

    globe.addEventListener('wheel', (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest('.footprint-globe__controls')) return;

        event.preventDefault();
        if (state !== 'expanded') return;

        event.stopPropagation();
        setCameraDistance(camera.distance + Math.sign(event.deltaY) * 0.5);
    }, { passive: false, capture: true });

    function createHTMLMarkers() {
        markersLayer.replaceChildren();
        clusters.forEach((cluster) => {
            const marker = document.createElement('button');
            marker.type = 'button';
            marker.className = 'footprint-location-marker';
            marker.dataset.clusterKey = cluster.key;
            marker.setAttribute('aria-label', `${cluster.place}，${cluster.articles.length} 篇文章`);

            const dot = document.createElement('span');
            dot.className = 'footprint-location-marker__dot';
            dot.setAttribute('aria-hidden', 'true');
            marker.appendChild(dot);

            marker.addEventListener('pointerenter', () => openClusterTip(cluster, marker));
            marker.addEventListener('pointerleave', scheduleCloseClusterTip);
            marker.addEventListener('focus', () => openClusterTip(cluster, marker));
            marker.addEventListener('blur', scheduleCloseClusterTip);
            marker.addEventListener('click', () => {
                openClusterTip(cluster, marker);
            });
            markersLayer.appendChild(marker);
            clusterMarkers.set(cluster.key, marker);
        });

        const avatar = document.querySelector<HTMLImageElement>('.site-avatar img');
        const avatarMarker = document.createElement('a');
        avatarMarker.className = 'footprint-profile-marker';
        avatarMarker.href = profile.url;
        avatarMarker.setAttribute('aria-label', `关于峰峰：${profile.place}`);
        if (avatar?.currentSrc || avatar?.src) {
            const image = document.createElement('img');
            image.src = avatar.currentSrc || avatar.src;
            image.alt = '';
            avatarMarker.appendChild(image);
        } else {
            avatarMarker.textContent = '👤';
        }
        markersLayer.appendChild(avatarMarker);
    }

    function openClusterTip(cluster: FootprintLocationCluster, marker: HTMLElement) {
        if (state !== 'expanded' || !markersLayer.classList.contains('is-visible') || marker.hidden) return;
        window.clearTimeout(closeTipTimer);
        activeClusterKey = cluster.key;
        pauseReasons.add('tooltip');
        tip.replaceChildren();
        tip.classList.remove(
            'footprint-globe__tip--preview-articles'
        );
        tip.classList.add('footprint-globe__tip--articles');

        const heading = document.createElement('strong');
        heading.textContent = cluster.place;
        const count = document.createElement('span');
        count.textContent = `${cluster.articles.length} 篇文章`;
        const list = document.createElement('ul');
        cluster.articles.forEach((article) => {
            const item = document.createElement('li');
            const link = document.createElement('a');
            link.href = article.url;
            link.textContent = article.title;
            item.appendChild(link);
            list.appendChild(item);
        });
        tip.append(heading, count, list);
        tip.hidden = false;

        const globeRect = globe.getBoundingClientRect();
        const markerRect = marker.getBoundingClientRect();
        positionFootprintTip(globe, tip, {
            x: markerRect.left - globeRect.left + markerRect.width / 2,
            y: markerRect.top - globeRect.top + markerRect.height / 2,
        });
    }

    function isMarkerOrTipTarget(target: EventTarget | null) {
        if (!(target instanceof Node)) return false;
        if (tip.contains(target)) return true;
        return target instanceof Element && Boolean(target.closest(
            '.footprint-location-marker, .footprint-globe__markers--preview'
        ));
    }

    function scheduleCloseClusterTip(event?: Event) {
        const relatedTarget = event && 'relatedTarget' in event
            ? (event as MouseEvent | FocusEvent).relatedTarget
            : null;
        if (isMarkerOrTipTarget(relatedTarget)) {
            window.clearTimeout(closeTipTimer);
            return;
        }
        window.clearTimeout(closeTipTimer);
        const isPreviewTip = tip.classList.contains('footprint-globe__tip--preview-articles');
        closeTipTimer = window.setTimeout(
            () => closeClusterTip(!isPreviewTip),
            isPreviewTip ? 180 : 30
        );
    }

    function closeClusterTip(immediate = false) {
        const close = () => {
            activeClusterKey = '';
            tip.hidden = true;
            tip.classList.remove(
                'footprint-globe__tip--articles',
                'footprint-globe__tip--preview-articles'
            );
            pauseReasons.delete('tooltip');
            if (state === 'expanded') pauseRotationTemporarily('tooltip-close');
        };
        if (immediate) close();
        else {
            window.clearTimeout(closeTipTimer);
            closeTipTimer = window.setTimeout(close, 80);
        }
    }

    tip.addEventListener('pointerenter', () => {
        window.clearTimeout(closeTipTimer);
        pauseReasons.add('tooltip');
    });
    tip.addEventListener('pointerleave', (event) => {
        if (isMarkerOrTipTarget(event.relatedTarget)) {
            window.clearTimeout(closeTipTimer);
            return;
        }
        // Once the pointer has left an expanded article popup there is no
        // marker-to-popup gap to bridge, so close it in the same event turn.
        if (state === 'expanded') closeClusterTip(true);
        else scheduleCloseClusterTip(event);
    });
    tip.addEventListener('focusin', () => pauseReasons.add('tooltip'));
    tip.addEventListener('focusout', scheduleCloseClusterTip);

    function captureSources() {
        const overviewSources = Array.from(
            document.querySelectorAll<HTMLElement>('.home-overview [data-footprint-article-url]')
        );
        const sourceElements = overviewSources.length > 0
            ? overviewSources
            : Array.from(document.querySelectorAll<HTMLElement>('.article-list [data-footprint-article-url]'));
        const byURL = new Map<string, HTMLElement>();
        sourceElements.forEach((element) => {
            const url = element.dataset.footprintArticleUrl;
            if (url) byURL.set(url, element);
        });

        sourceSnapshots = articles.flatMap((article) => {
            const element = byURL.get(article.url);
            return element ? [{ article, element, rect: element.getBoundingClientRect() }] : [];
        });

        const avatar = document.querySelector<HTMLElement>('.site-avatar img');
        avatarSnapshot = avatar ? { element: avatar, rect: avatar.getBoundingClientRect() } : null;
    }

    function ensureTransitionStage() {
        transitionStage?.remove();
        transitionStage = document.createElement('div');
        transitionStage.className = 'footprint-transition-stage';
        document.body.appendChild(transitionStage);
        return transitionStage;
    }

    function prepareProxy(element: HTMLElement, rect: DOMRect) {
        const proxy = element.cloneNode(true) as HTMLElement;
        proxy.className = `${proxy.className} footprint-flight-proxy`;
        proxy.removeAttribute('id');
        proxy.querySelectorAll<HTMLElement>('a, button, input, select, textarea').forEach((child) => {
            child.setAttribute('tabindex', '-1');
        });
        Object.assign(proxy.style, {
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${Math.max(36, rect.width)}px`,
            height: `${Math.max(36, rect.height)}px`,
        });
        return proxy;
    }

    function waitForNextPaint() {
        return new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
    }

    function animateHomepageSources(reverse = false) {
        if (reduceMotion) return Promise.resolve();
        const stage = ensureTransitionStage();
        const animations: Promise<unknown>[] = [];
        const sourceDuration = 760;
        const sourceDelay = reverse ? 40 : 120;

        sourceSnapshots.forEach((snapshot, index) => {
            const proxy = prepareProxy(snapshot.element, snapshot.rect);
            stage.appendChild(proxy);
            const target = getTargetPoint(snapshot.article);
            const startCenter = {
                x: snapshot.rect.left + snapshot.rect.width / 2,
                y: snapshot.rect.top + snapshot.rect.height / 2,
            };
            const dx = target.x - startCenter.x;
            const dy = target.y - startCenter.y;
            const arc = Math.min(180, 60 + Math.abs(dx) * 0.12);
            const frames = [
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${dx * 0.52}px, ${dy * 0.48 - arc}px) scale(.52)`, opacity: 0.92, offset: 0.52 },
                { transform: `translate(${dx}px, ${dy}px) scale(.08)`, opacity: 0 },
            ];
            if (reverse) frames.reverse();
            const animation = proxy.animate(frames, {
                duration: sourceDuration,
                delay: sourceDelay + index * 8,
                easing: 'cubic-bezier(.22,.72,.24,1)',
                fill: 'both',
            });
            animations.push(animation.finished.catch(() => undefined));
        });

        if (avatarSnapshot) {
            const proxy = prepareProxy(avatarSnapshot.element, avatarSnapshot.rect);
            proxy.classList.add('footprint-flight-proxy--avatar');
            stage.appendChild(proxy);
            const target = getTargetPoint(profile, 'profile');
            const startCenter = {
                x: avatarSnapshot.rect.left + avatarSnapshot.rect.width / 2,
                y: avatarSnapshot.rect.top + avatarSnapshot.rect.height / 2,
            };
            const dx = target.x - startCenter.x;
            const dy = target.y - startCenter.y;
            const frames = [
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${dx * 0.5}px, ${dy * 0.45 - 110}px) scale(.7)`, opacity: 1, offset: 0.5 },
                { transform: `translate(${dx}px, ${dy}px) scale(.46)`, opacity: 0 },
            ];
            if (reverse) frames.reverse();
            const animation = proxy.animate(frames, {
                duration: 820,
                delay: reverse ? 40 : 90,
                easing: 'cubic-bezier(.22,.72,.24,1)',
                fill: 'both',
            });
            animations.push(animation.finished.catch(() => undefined));
        }

        return Promise.all(animations).then(() => undefined);
    }

    function animateCamera(from: number, to: number, duration: number) {
        if (reduceMotion || duration <= 0) {
            cameraProgress = to;
            render();
            return Promise.resolve();
        }
        return new Promise<void>((resolve) => {
            const start = performance.now();
            const frame = (now: number) => {
                const raw = Math.min(1, (now - start) / duration);
                cameraProgress = lerp(from, to, easeInOut(raw));
                render();
                if (raw < 1) requestAnimationFrame(frame);
                else resolve();
            };
            requestAnimationFrame(frame);
        });
    }

    function setBackgroundInert(enabled: boolean) {
        if (enabled) {
            inertNodes.length = 0;
            document.querySelectorAll<HTMLElement>('.left-sidebar, main.main, .right-sidebar .widget:not(.footprint), .support-me-floating-button').forEach((node) => {
                inertNodes.push({ node, inert: Boolean((node as any).inert), ariaHidden: node.getAttribute('aria-hidden') });
                (node as any).inert = true;
                node.setAttribute('aria-hidden', 'true');
            });
            return;
        }
        inertNodes.forEach(({ node, inert, ariaHidden }) => {
            (node as any).inert = inert;
            if (ariaHidden === null) node.removeAttribute('aria-hidden');
            else node.setAttribute('aria-hidden', ariaHidden);
        });
        inertNodes.length = 0;
    }

    const bodyStyleKeys = ['position', 'top', 'left', 'right', 'width', 'overflow'] as const;
    const savedBodyStyles = new Map<string, string>();
    function lockPage() {
        savedScrollY = window.scrollY;
        bodyStyleKeys.forEach((key) => savedBodyStyles.set(key, document.body.style[key]));
        Object.assign(document.body.style, {
            position: 'fixed',
            top: `${-savedScrollY}px`,
            left: '0',
            right: '0',
            width: '100%',
            overflow: 'hidden',
        });
    }

    function unlockPage() {
        bodyStyleKeys.forEach((key) => {
            document.body.style[key] = savedBodyStyles.get(key) || '';
        });
        savedBodyStyles.clear();
        window.scrollTo(0, savedScrollY);
    }

    function globeLayerFrames(rect: DOMRect, reverse = false) {
        const preview = previewGlobeLayerFrame(rect);
        const expanded = expandedGlobeLayerFrame();
        return reverse ? [expanded, preview] : [preview, expanded];
    }

    function clearTemporaryRotationPause(reason: string) {
        const timer = resumeTimers.get(reason);
        if (timer) window.clearTimeout(timer);
        resumeTimers.delete(reason);
        pauseReasons.delete(reason);
    }

    function resetRotationPauses() {
        resumeTimers.forEach((timer) => window.clearTimeout(timer));
        resumeTimers.clear();
        pauseReasons.clear();
    }

    function pauseRotationTemporarily(reason: string) {
        pauseReasons.add(reason);
        const previousTimer = resumeTimers.get(reason);
        if (previousTimer) window.clearTimeout(previousTimer);
        const timer = window.setTimeout(() => {
            resumeTimers.delete(reason);
            pauseReasons.delete(reason);
        }, 2500);
        resumeTimers.set(reason, timer);
    }

    function startRotation() {
        if (reduceMotion) return;
        cancelAnimationFrame(rotationFrame);
        lastRotationTime = performance.now();
        const tick = (now: number) => {
            const elapsed = Math.min(50, now - lastRotationTime);
            lastRotationTime = now;
            if (pauseReasons.size === 0 && (state === 'preview' || state === 'expanded')) {
                const rotation = state === 'preview' ? previewRotation : expandedRotation;
                rotation[0] += camera.rotationSpeed * elapsed / 1000;
                render();
            }
            rotationFrame = requestAnimationFrame(tick);
        };
        rotationFrame = requestAnimationFrame(tick);
    }

    function stopRotation() {
        cancelAnimationFrame(rotationFrame);
        rotationFrame = 0;
    }

    function setExpandButtonState(expanded: boolean) {
        expandButton.setAttribute('aria-expanded', String(expanded));
        expandButton.setAttribute('aria-label', expanded ? '收起' : '展开 Footprint 地球');
        expandLabel.textContent = expanded ? '收起' : '';
        if (expandIcon) expandIcon.textContent = expanded ? '×' : '✨';
    }

    async function expandGlobe() {
        if (state !== 'preview') return;
        state = 'expanding';
        starfield.classList.add('is-layout-transitioning');
        // Disable D3's wheel/pinch scale handlers for the entire fullscreen
        // lifecycle. Fullscreen zoom is a physical camera-distance change.
        selection.on('.zoom', null);
        document.body.classList.remove('footprint-restoring');
        closeClusterTip(true);
        resetRotationPauses();
        void playStarfield();
        expandButton.disabled = true;
        expandButton.hidden = true;
        setExpandButtonState(true);
        zoomInButton.setAttribute('aria-label', '缩短球心距离（放大地图）');
        zoomOutButton.setAttribute('aria-label', '增加球心距离（缩小地图）');
        status.textContent = '正在展开足迹地球';
        previewRect = globeSlot.getBoundingClientRect();
        applyGlobeLayerFrame(previewGlobeLayerFrame(previewRect));
        captureSources();
        setBackgroundInert(true);
        lockPage();
        document.body.classList.add('footprint-fullscreen');
        widget.classList.add('is-fullscreen');
        setExpandedMarkersVisible(false);
        cameraProgress = 0;
        render();

        const duration = reduceMotion ? 160 : 780;
        const globeAnimation = globe.animate(globeLayerFrames(previewRect), {
            duration,
            easing: 'cubic-bezier(.2,.72,.22,1)',
            fill: 'both',
        });
        const cameraAnimation = animateCamera(0, 1, reduceMotion ? 160 : 1080);
        const sourceAnimation = animateHomepageSources(false);

        if (!reduceMotion) await new Promise((resolve) => window.setTimeout(resolve, 980));
        setExpandedMarkersVisible(true);

        await Promise.all([
            globeAnimation.finished.catch(() => undefined),
            cameraAnimation,
            sourceAnimation,
        ]);
        applyGlobeLayerFrame(expandedGlobeLayerFrame());
        globeAnimation.cancel();
        transitionStage?.remove();
        transitionStage = null;
        state = 'expanded';
        await playStarfield(true);
        starfield.classList.remove('is-layout-transitioning');
        expandButton.disabled = false;
        expandButton.hidden = false;
        status.textContent = `足迹地球已展开，共 ${locatedArticles.length} 篇足迹文章，${clusters.length} 个地点`;
        expandButton.focus({ preventScroll: true });
        startRotation();
    }

    async function collapseGlobe() {
        if (state !== 'expanded') return;
        state = 'collapsing';
        starfield.classList.add('is-layout-transitioning');
        expandButton.disabled = true;
        expandButton.hidden = true;
        stopRotation();
        closeClusterTip(true);
        resetRotationPauses();
        status.textContent = '正在收起足迹地球';
        setExpandedMarkersVisible(false);
        // Keep the pre-lock slot frame. Measuring the sticky sidebar while the
        // body is fixed would include the scroll-lock offset and cause a jump
        // when unlockPage() restores the document.

        const duration = reduceMotion ? 160 : 780;
        const globeAnimation = globe.animate(globeLayerFrames(previewRect, true), {
            duration,
            easing: 'cubic-bezier(.4,0,.28,1)',
            fill: 'both',
        });
        const cameraAnimation = animateCamera(cameraProgress, 0, duration);
        const sourceAnimation = animateHomepageSources(true);
        await Promise.all([
            globeAnimation.finished.catch(() => undefined),
            cameraAnimation,
            sourceAnimation,
        ]);
        applyGlobeLayerFrame(previewGlobeLayerFrame(previewRect));
        globeAnimation.cancel();
        document.body.classList.add('footprint-restoring');
        widget.classList.remove('is-fullscreen');
        document.body.classList.remove('footprint-fullscreen');
        setBackgroundInert(false);
        unlockPage();
        cameraProgress = 0;
        setExpandButtonState(false);
        status.textContent = '足迹地球已收起';
        state = 'preview';
        selection.call(zoomBehavior);
        await playStarfield(true);
        starfield.classList.remove('is-layout-transitioning');
        syncPreviewGlobeLayer();
        render();
        startRotation();
        if (transitionStage) await waitForNextPaint();
        transitionStage?.remove();
        transitionStage = null;
        document.body.classList.remove('footprint-restoring');
        expandButton.disabled = false;
        expandButton.hidden = false;
        zoomInButton.setAttribute('aria-label', '放大地图');
        zoomOutButton.setAttribute('aria-label', '缩小地图');
        expandButton.focus({ preventScroll: true });
    }

    expandButton.addEventListener('click', (event) => {
        event.stopPropagation();
        if (state === 'preview') expandGlobe();
        else if (state === 'expanded') collapseGlobe();
    });

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && state === 'expanded') {
            event.preventDefault();
            collapseGlobe();
        }
    });

    window.addEventListener('resize', () => {
        if (state === 'preview') syncPreviewGlobeLayer();
        else if (state === 'expanded') applyGlobeLayerFrame(expandedGlobeLayerFrame());
        render();
    });

    window.addEventListener('scroll', queuePreviewGlobeLayerSync, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
        // animateCamera already renders every visual frame while the fixed
        // globe layer is resizing. Rendering again from ResizeObserver would
        // duplicate the expensive geographic path work in the same frame.
        if (state === 'expanding' || state === 'collapsing') return;
        if (state === 'preview') syncPreviewGlobeLayer();
        render();
    });
    resizeObserver.observe(svg);
    resizeObserver.observe(globeSlot);
    createHTMLMarkers();
    setExpandedMarkersVisible(false);
    setExpandButtonState(false);
    expandButton.hidden = false;
    syncPreviewGlobeLayer();
    widget.classList.add('is-layer-ready');
    void ensureStarfield();
    render();
    startRotation();
}

function initResumePage() {
    const root = document.querySelector<HTMLElement>('[data-resume-root]');
    if (!root) return;
    const drawerRoot = root.querySelector<HTMLElement>('[data-resume-drawer-root]');

    root.querySelectorAll<HTMLElement>('[data-resume-detail-id]').forEach((entry) => {
        entry.dispatchEvent(new CustomEvent('resume:detail-entry-ready', {
            bubbles: true,
            detail: {
                id: entry.dataset.resumeDetailId,
                drawerRoot,
            },
        }));
    });

    root.dispatchEvent(new CustomEvent('annotations:scope-ready', {
        bubbles: true,
        detail: {
            scope: root.dataset.annotationScope || 'resume',
            entries: Array.from(root.querySelectorAll<HTMLElement>('[data-resume-entry]')),
        },
    }));
}

document.addEventListener('DOMContentLoaded', () => {
    initImageCaptions();
    initResumePage();

    document.querySelectorAll<HTMLElement>('.widget.footprint').forEach((widget) => {
        initFootprintWidget(widget);
    });
});
