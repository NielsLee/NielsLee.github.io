type FootprintPoint = {
    title: string;
    url: string;
    place: string;
    lat: number;
    lng: number;
    date?: string;
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
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });

    loadedScripts.set(src, promise);
    return promise;
}

function parseFootprintPoints(widget: HTMLElement): FootprintPoint[] {
    const data = widget.querySelector<HTMLScriptElement>('.footprint-points');
    if (!data?.textContent) return [];

    try {
        const parsed = JSON.parse(data.textContent);
        const points = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
        if (!Array.isArray(points)) return [];

        return points.filter((point: FootprintPoint) => {
            return Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng));
        });
    } catch (error) {
        console.warn('Unable to parse footprint points', error);
        return [];
    }
}

function positionFootprintTip(container: HTMLElement, tip: HTMLElement, event: MouseEvent | FocusEvent, fallback?: { x: number; y: number }) {
    const bounds = container.getBoundingClientRect();
    const offset = 10;
    const tipWidth = tip.offsetWidth || 120;
    const tipHeight = tip.offsetHeight || 48;
    const maxLeft = Math.max(offset, bounds.width - tipWidth - offset);
    const maxTop = Math.max(offset, bounds.height - tipHeight - offset);
    const hasPointer = 'clientX' in event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY);
    const rawLeft = hasPointer ? event.clientX - bounds.left + offset : (fallback?.x ?? bounds.width / 2) + offset;
    const rawTop = hasPointer ? event.clientY - bounds.top + offset : (fallback?.y ?? bounds.height / 2) + offset;
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
    const globe = widget.querySelector<HTMLElement>('.footprint-globe');
    const empty = widget.querySelector<HTMLElement>('.footprint-globe__empty');
    const tip = widget.querySelector<HTMLElement>('.footprint-globe__tip');
    const zoomLabel = widget.querySelector<HTMLElement>('.footprint-globe__zoom');
    const zoomInButton = widget.querySelector<HTMLButtonElement>('[data-action="zoom-in"]');
    const zoomOutButton = widget.querySelector<HTMLButtonElement>('[data-action="zoom-out"]');
    const resetButton = widget.querySelector<HTMLButtonElement>('[data-action="reset"]');
    const points = parseFootprintPoints(widget);

    if (!svg || !globe || !empty || !tip || !zoomLabel || !zoomInButton || !zoomOutButton || !resetButton) return;
    empty.hidden = points.length > 0;

    const d3Url = widget.dataset.d3Url;
    const topojsonUrl = widget.dataset.topojsonUrl;
    const boundaryUrl = widget.dataset.boundaryUrl;
    if (!d3Url || !topojsonUrl || !boundaryUrl) return;

    try {
        await Promise.all([loadScript(d3Url), loadScript(topojsonUrl)]);
    } catch (error) {
        empty.hidden = false;
        empty.textContent = '地图资源加载失败';
        console.warn(error);
        return;
    }

    const d3 = (window as any).d3;
    const topojson = (window as any).topojson;
    if (!d3 || !topojson) return;

    let world: any;
    try {
        world = await loadBoundaryData(d3, boundaryUrl);
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

    points.forEach((point) => {
        const coordinates = [Number(point.lng), Number(point.lat)];
        const country = countries.features.find((feature: any) => d3.geoContains(feature, coordinates));
        if (!country) return;

        const countryId = String(country.id);
        if (chinaIds.has(countryId)) {
            chinaIds.forEach((id) => visitedCountryIds.add(id));
            return;
        }

        visitedCountryIds.add(countryId);
    });

    const chinaGeometry = topojson.merge(
        world,
        world.objects.countries.geometries.filter((item: any) => chinaIds.has(String(item.id)))
    );

    const selection = d3.select(svg);
    selection.selectAll('*').remove();

    const sphere = { type: 'Sphere' };
    const graticule = d3.geoGraticule10();
    const projection = d3.geoOrthographic().clipAngle(90).precision(0.5);
    const path = d3.geoPath(projection);
    const defaultRotation: [number, number, number] = [-104, -28, 0];
    const defaultScale = 1;
    const zoomExtent: [number, number] = [0.75, 4];
    let rotation: [number, number, number] = [...defaultRotation];
    let scaleFactor = defaultScale;

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
    const china = selection.append('path').attr('class', 'footprint-globe__china').datum(chinaGeometry);
    const border = selection.append('path').attr('class', 'footprint-globe__borders').datum(borders);
    const markerLayer = selection.append('g').attr('class', 'footprint-globe__markers');

    points.forEach((point) => {
        const marker = markerLayer
            .append('a')
            .attr('href', point.url)
            .attr('aria-label', `${point.place}: ${point.title}`)
            .append('circle')
            .attr('r', 3.6)
            .attr('class', 'footprint-globe__marker');

        marker
            .on('mouseenter', (event: MouseEvent) => {
                tip.hidden = false;
                tip.innerHTML = `<strong>${point.place}</strong><span>${point.title}</span>`;
                positionFootprintTip(globe, tip, event);
            })
            .on('mousemove', (event: MouseEvent) => {
                positionFootprintTip(globe, tip, event);
            })
            .on('focus', function (this: SVGCircleElement, event: FocusEvent) {
                tip.hidden = false;
                tip.innerHTML = `<strong>${point.place}</strong><span>${point.title}</span>`;
                positionFootprintTip(globe, tip, event, {
                    x: Number(this.getAttribute('cx')) || 0,
                    y: Number(this.getAttribute('cy')) || 0,
                });
            })
            .on('mouseleave blur', () => {
                tip.hidden = true;
            });
    });

    function render() {
        const box = svg.getBoundingClientRect();
        const width = Math.max(220, box.width || 260);
        const height = Math.max(220, box.height || 260);
        const radius = Math.min(width, height) * 0.46 * scaleFactor;

        projection.translate([width / 2, height / 2]).scale(radius).rotate(rotation);
        selection.attr('viewBox', `0 0 ${width} ${height}`);
        zoomLabel.textContent = `${Math.round(scaleFactor * 100)}%`;

        ocean.datum(sphere).attr('d', path);
        grid.datum(graticule).attr('d', path);
        land.attr('d', path);
        china.attr('d', path);
        border.attr('d', path);

        markerLayer.selectAll('circle').each(function (_: unknown, index: number) {
            const point = points[index];
            const coordinates = projection([Number(point.lng), Number(point.lat)]);
            const visible = d3.geoDistance([Number(point.lng), Number(point.lat)], [-rotation[0], -rotation[1]]) <= Math.PI / 2;
            d3.select(this)
                .attr('cx', coordinates ? coordinates[0] : -999)
                .attr('cy', coordinates ? coordinates[1] : -999)
                .style('display', visible && coordinates ? null : 'none');
        });
    }

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent(zoomExtent)
        .on('zoom', (event: any) => {
            scaleFactor = event.transform.k;
            render();
        });

    function setScale(nextScale: number) {
        const clampedScale = Math.max(zoomExtent[0], Math.min(zoomExtent[1], nextScale));
        selection.call(zoomBehavior.transform, d3.zoomIdentity.scale(clampedScale));
    }

    selection.call(
        d3.drag<SVGSVGElement, unknown>()
            .on('drag', (event: any) => {
                const dragSpeed = 0.45 / Math.max(1, Math.sqrt(scaleFactor));
                rotation = [
                    rotation[0] + event.dx * dragSpeed,
                    Math.max(-80, Math.min(80, rotation[1] - event.dy * dragSpeed)),
                    rotation[2],
                ];
                render();
            })
    );

    selection.call(zoomBehavior);

    zoomInButton.addEventListener('click', (event) => {
        event.stopPropagation();
        setScale(scaleFactor + 0.25);
    });

    zoomOutButton.addEventListener('click', (event) => {
        event.stopPropagation();
        setScale(scaleFactor - 0.25);
    });

    resetButton.addEventListener('click', (event) => {
        event.stopPropagation();
        rotation = [...defaultRotation];
        selection.call(zoomBehavior.transform, d3.zoomIdentity.scale(defaultScale));
        render();
    });

    widget.querySelector<HTMLElement>('.footprint-globe__controls')?.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
    });

    widget.querySelector<HTMLElement>('.footprint-globe__controls')?.addEventListener('wheel', (event) => {
        event.preventDefault();
        event.stopPropagation();
    }, { passive: false });

    globe.addEventListener('wheel', (event) => {
        event.preventDefault();
        event.stopPropagation();
    }, { passive: false });

    new ResizeObserver(render).observe(svg);
    render();
}

document.addEventListener('DOMContentLoaded', () => {
    initImageCaptions();

    document.querySelectorAll<HTMLElement>('.widget.footprint').forEach((widget) => {
        initFootprintWidget(widget);
    });
});
