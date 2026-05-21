'use strict';

const mapboxToken = window.MAPBOX_TOKEN || localStorage.getItem('MAPBOX_TOKEN') || '';
const mapboxStyle = 'mapbox://styles/limitrofe/cmopsybpt004601s698r83pk0';
const outputWidth = 650;
const textPaddingX = 24;
const titleFont = '900 40px "Open Sans"';
const deckFont = '300 32px "Open Sans"';
const sourceFont = '400 20px "Open Sans"';
const labelFont = '900 22px "Open Sans"';
const editorialLabelFont = '900 20px "Open Sans"';
const red = '#c81712';
const maxScenes = 3;

const titleInput = document.getElementById('title-input');
const deckInput = document.getElementById('deck-input');
const sourceInput = document.getElementById('source-input');
const sceneCountInput = document.getElementById('scene-count-input');
const activeSceneInput = document.getElementById('active-scene-input');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const searchResults = document.getElementById('search-results');
const latitudeInput = document.getElementById('latitude-input');
const longitudeInput = document.getElementById('longitude-input');
const coordinateButton = document.getElementById('coordinate-button');
const zoomOutButton = document.getElementById('zoom-out-button');
const zoomInButton = document.getElementById('zoom-in-button');
const markerSourceInput = document.getElementById('marker-source-input');
const markerStyleInput = document.getElementById('marker-style-input');
const markerLabelInput = document.getElementById('marker-label-input');
const markerCenterButton = document.getElementById('marker-center-button');
const markerClearButton = document.getElementById('marker-clear-button');
const mapLabelsInput = document.getElementById('map-labels-input');
const sceneDrawingsInput = document.getElementById('scene-drawings-input');
const editorialLabelInput = document.getElementById('editorial-label-input');
const editorialSymbolInput = document.getElementById('editorial-symbol-input');
const editorialLabelPositionInput = document.getElementById('editorial-label-position-input');
const editorialImageInput = document.getElementById('editorial-image-input');
const labelAddButton = document.getElementById('label-add-button');
const labelClearButton = document.getElementById('label-clear-button');
const annotationList = document.getElementById('annotation-list');
const sceneShapesInput = document.getElementById('scene-shapes-input');
const shapeTypeInput = document.getElementById('shape-type-input');
const shapeStrokeColorInput = document.getElementById('shape-stroke-color-input');
const shapeStrokeWidthInput = document.getElementById('shape-stroke-width-input');
const shapeStrokeOpacityInput = document.getElementById('shape-stroke-opacity-input');
const shapeFillColorInput = document.getElementById('shape-fill-color-input');
const shapeFillOpacityInput = document.getElementById('shape-fill-opacity-input');
const shapeTextInput = document.getElementById('shape-text-input');
const shapeStartButton = document.getElementById('shape-start-button');
const shapeClearButton = document.getElementById('shape-clear-button');
const shapeList = document.getElementById('shape-list');
const drawingColorInput = document.getElementById('drawing-color-input');
const drawingWidthInput = document.getElementById('drawing-width-input');
const drawingStyleInput = document.getElementById('drawing-style-input');
const drawingArrowInput = document.getElementById('drawing-arrow-input');
const drawingStartButton = document.getElementById('drawing-start-button');
const drawingClearButton = document.getElementById('drawing-clear-button');
const drawingList = document.getElementById('drawing-list');
const annotationEditor = document.getElementById('annotation-editor');
const annotationDeleteButton = document.getElementById('annotation-delete-button');
const selectedLabelTextInput = document.getElementById('selected-label-text-input');
const selectedSymbolInput = document.getElementById('selected-symbol-input');
const selectedLabelPositionInput = document.getElementById('selected-label-position-input');
const selectedLabelLatInput = document.getElementById('selected-label-lat-input');
const selectedLabelLngInput = document.getElementById('selected-label-lng-input');
const locatorModeInput = document.getElementById('locator-mode-input');
const locatorQueryInput = document.getElementById('locator-query-input');
const locatorSearchButton = document.getElementById('locator-search-button');
const locatorFocusButton = document.getElementById('locator-focus-button');
const mapHeightInput = document.getElementById('map-height-input');
const mapHeightValue = document.getElementById('map-height-value');
const heightPresetButtons = Array.from(document.querySelectorAll('.height-preset-button'));
const downloadButton = document.getElementById('download-button');
const statusEl = document.getElementById('status');
const previewTitle = document.getElementById('preview-title');
const previewDeck = document.getElementById('preview-deck');
const previewSource = document.getElementById('preview-source');
const exportFrame = document.getElementById('export-frame');
const mapsStack = document.getElementById('maps-stack');

mapboxgl.accessToken = mapboxToken;

const scenes = [];
let activeSceneIndex = 0;
let storyLocation = {lng: -47.8825, lat: -15.7942};
let labelPlacementSceneIndex = null;
let drawingSceneIndex = null;
let drawingIdCounter = 1;
let drawings = [];
let shapes = [];
let shapeIdCounter = 1;
let shapeMode = null;
let pendingShapeCenter = null;
let editorialImageData = '';
let annotationIdCounter = 1;
let selectedAnnotationId = null;
const imageCache = new Map();

function setStatus(message) {
    statusEl.textContent = message;
}

function normalizeText(value) {
    return String(value || '').trim();
}

function createScene(index) {
    const sceneEl = document.createElement('section');
    const mapEl = document.createElement('div');
    const annotationEl = document.createElement('div');
    const locatorEl = document.createElement('div');
    const locatorMaps = Array.from({length: 3}, (_, mapIndex) => {
        const wrapEl = document.createElement('div');
        const miniMapEl = document.createElement('div');
        const focusEl = document.createElement('span');

        wrapEl.className = 'locator-map-wrap';
        miniMapEl.className = 'locator-map';
        miniMapEl.id = `locator-${index + 1}-${mapIndex + 1}`;
        focusEl.className = 'locator-focus';
        wrapEl.append(miniMapEl, focusEl);

        return {
            wrapEl,
            miniMapEl,
            focusEl,
            map: null,
            center: mapIndex === 0 ? [-53.2, -14.2] : [-47.8825, -15.7942],
            zoom: [2.5, 5.0, 9.0][mapIndex] ?? 5.0,
            revealed: false
        };
    });
    const scene = {
        index,
        height: index === 0 ? 500 : 560,
        marker: null,
        markerSource: 'search',
        markerStyle: index === 0 ? 'box' : 'halo',
        markerLabel: index === 0 ? '' : 'Local do fato',
        showMapLabels: true,
        showDrawings: true,
        showShapes: true,
        previewShape: null,
        editorialLabels: [],
        originalTextLayerVisibility: new Map(),
        locator: {
            mode: index === 0 ? 'three' : 'none',
            query: 'Brasil',
            x: 528,
            y: 14,
            focus: {lng: -47.8825, lat: -15.7942}
        },
        activeDrawing: null,
        map: null,
        locatorMaps,
        sceneEl,
        mapEl,
        annotationEl,
        locatorEl,
        svgEl: null,
        loaded: false
    };

    sceneEl.className = 'map-scene';
    sceneEl.dataset.scene = String(index);
    sceneEl.style.height = `${scene.height}px`;
    mapEl.className = 'scene-map';
    mapEl.id = `map-${index + 1}`;
    annotationEl.className = 'annotation-layer';
    locatorEl.className = 'scene-locator';
    locatorEl.hidden = index !== 0;
    locatorMaps.forEach(locatorMap => locatorEl.append(locatorMap.wrapEl));

    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('class', 'drawing-layer');
    scene.svgEl = svgEl;
    sceneEl.append(mapEl, svgEl, annotationEl, locatorEl);
    mapsStack.append(sceneEl);

    scene.map = new mapboxgl.Map({
        container: mapEl,
        style: mapboxStyle,
        center: index === 0 ? [-47.8825, -15.7942] : [-47.8825, -15.7942],
        zoom: index === 0 ? 3.2 : 8.2,
        attributionControl: false,
        preserveDrawingBuffer: true
    });

    locatorMaps.forEach((locatorMap, mapIndex) => {
        locatorMap.map = new mapboxgl.Map({
            container: locatorMap.miniMapEl,
            style: mapboxStyle,
            center: mapIndex === 0 ? [-53.2, -14.2] : [-47.8825, -15.7942],
            zoom: [2.5, 5.0, 9.0][mapIndex] ?? 5.0,
            attributionControl: false,
            interactive: false,
            preserveDrawingBuffer: true
        });

        locatorMap.map.on('load', () => {
            hideLocatorLabels(locatorMap.map);
            updateSceneLocator(scene);
            if (mapIndex === 0) {
                const bounds = getPresetBounds(scene.locator.query);
                if (bounds) {
                    locatorMap.map.fitBounds(bounds, {padding: 1, duration: 0});
                } else {
                    locatorMap.map.jumpTo({center: locatorMap.center, zoom: locatorMap.zoom});
                }
            } else {
                locatorMap.map.jumpTo({center: locatorMap.center, zoom: locatorMap.zoom});
            }
        });
        locatorMap.map.on('styledata', () => hideLocatorLabels(locatorMap.map));
        locatorMap.map.on('move', () => updateSceneLocatorFocus(scene));
        locatorMap.map.on('moveend', () => updateSceneLocatorFocus(scene));
    });

    setupLocatorDrag(scene);

    scene.map.on('load', () => {
        scene.loaded = true;
        scene.map.setPadding({left: 40, right: 40, top: 20, bottom: 20});
        captureTextLayerVisibility(scene);
        applyMapLabelVisibility(scene);
        applySymbolEdgeAvoidance(scene);
        updateSceneAnnotation(scene);
        updateSceneLocator(scene);
        if (index === activeSceneIndex) {
            syncControlsFromScene();
            setStatus('Mapa pronto para edição.');
        }
    });

    scene.map.on('styledata', () => {
        captureTextLayerVisibility(scene);
        applyMapLabelVisibility(scene);
        applySymbolEdgeAvoidance(scene);
    });

    scene.map.on('move', () => { updateSceneAnnotation(scene); redrawDrawings(scene); });
    scene.map.on('moveend', () => {
        updateSceneAnnotation(scene);
        if (index === activeSceneIndex) {
            syncCoordinateInputs();
        }
    });

    scene.map.on('mousemove', event => {
        if (shapeMode === index && pendingShapeCenter) {
            scene.previewShape = buildShapeObject(scene, pendingShapeCenter, event.lngLat, true);
            redrawDrawings(scene);
        }
    });

    scene.map.on('click', event => {
        if (index !== activeSceneIndex) {
            setActiveScene(index);
        }

        if (shapeMode === index) {
            handleShapeClick(scene, event.lngLat);
            return;
        }

        if (drawingSceneIndex === index) {
            addDrawingPoint(scene, event.lngLat, event.point);
            return;
        }

        if (labelPlacementSceneIndex === index) {
            addEditorialLabelToActiveScene(event.lngLat);
            return;
        }

        setCustomMarkerForActiveScene(event.lngLat);
    });

    scene.map.on('dblclick', event => {
        if (drawingSceneIndex === index) {
            event.preventDefault();
            finalizeDrawing(scene);
        }
    });

    scene.map.on('contextmenu', event => {
        event.preventDefault();
        const {lat, lng} = event.lngLat;
        const latStr = lat.toFixed(6);
        const lngStr = lng.toFixed(6);
        latitudeInput.value = latStr;
        longitudeInput.value = lngStr;
        navigator.clipboard.writeText(`${latStr}, ${lngStr}`).catch(() => {});
        setStoryLocation({lng, lat});
        getVisibleScenes().forEach(s => {
            if (s.index !== index) {
                s.map.flyTo({center: [lng, lat], essential: true});
            }
            applyLocatorFocus(s);
        });
        setStatus(`Coordenadas copiadas: ${latStr}, ${lngStr}`);
    });

    scene.map.on('error', event => {
        setStatus(event?.error?.message || 'Não foi possível carregar o mapa.');
    });

    return scene;
}

function getVisibleScenes() {
    const count = Number.parseInt(sceneCountInput.value, 10) || 1;
    return scenes.slice(0, Math.max(1, Math.min(maxScenes, count)));
}

function getActiveScene() {
    return scenes[activeSceneIndex];
}

function getSelectedAnnotation() {
    return getActiveScene().editorialLabels.find(annotation => annotation.id === selectedAnnotationId) || null;
}

function getSymbolLabel(symbol) {
    const labels = {
        dot: 'Ponto',
        square: 'Quadrado',
        triangle: 'Triângulo',
        image: 'PNG',
        none: 'Sem símbolo'
    };

    return labels[symbol] || 'Ponto';
}

function selectAnnotation(id) {
    selectedAnnotationId = id;
    updateSceneAnnotation(getActiveScene());
    renderAnnotationPanel();
}

function renderAnnotationPanel() {
    const scene = getActiveScene();
    const selected = getSelectedAnnotation();

    annotationList.replaceChildren();

    if (!scene.editorialLabels.length) {
        const empty = document.createElement('p');
        empty.className = 'annotation-empty';
        empty.textContent = 'Nenhum item manual nesta cena.';
        annotationList.append(empty);
    } else {
        scene.editorialLabels.forEach((annotation, index) => {
            const button = document.createElement('button');
            const symbol = document.createElement('span');
            const textWrap = document.createElement('span');
            const title = document.createElement('strong');
            const meta = document.createElement('span');
            const symbolType = annotation.symbol || 'dot';
            const titleText = normalizeText(annotation.text) || getSymbolLabel(symbolType);

            button.type = 'button';
            button.className = 'annotation-item';
            button.classList.toggle('is-selected', annotation.id === selectedAnnotationId);
            button.addEventListener('click', () => selectAnnotation(annotation.id));
            symbol.className = `annotation-item__symbol annotation-item__symbol--${symbolType}`;
            textWrap.className = 'annotation-item__text';
            title.textContent = titleText;
            meta.textContent = `Item ${index + 1} · ${getSymbolLabel(symbolType)}`;
            textWrap.append(title, meta);
            button.append(symbol, textWrap);
            annotationList.append(button);
        });
    }

    annotationEditor.hidden = !selected;

    if (!selected) {
        return;
    }

    selectedLabelTextInput.value = selected.text || '';
    selectedSymbolInput.value = selected.symbol || 'dot';
    selectedLabelPositionInput.value = selected.textPosition || 'right';
    selectedLabelLatInput.value = Number(selected.lat).toFixed(6);
    selectedLabelLngInput.value = Number(selected.lng).toFixed(6);
}

function syncSelectedAnnotation(update) {
    const annotation = getSelectedAnnotation();

    if (!annotation) {
        return;
    }

    update(annotation);

    if (!normalizeText(annotation.text) && annotation.symbol === 'none') {
        annotation.symbol = 'dot';
        selectedSymbolInput.value = 'dot';
        setStatus('O item precisa ter texto ou símbolo.');
    }

    updateSceneAnnotation(getActiveScene());
    renderAnnotationPanel();
}

function setPreviewText() {
    previewTitle.textContent = titleInput.value || '';
    previewDeck.textContent = deckInput.value || '';
    previewSource.textContent = sourceInput.value || '';
    exportFrame.classList.toggle('no-heading', !normalizeText(titleInput.value) && !normalizeText(deckInput.value));
}

function refreshSceneVisibility() {
    const visibleScenes = getVisibleScenes();

    scenes.forEach(scene => {
        const isVisible = visibleScenes.includes(scene);
        scene.sceneEl.hidden = !isVisible;
        scene.sceneEl.classList.toggle('is-active', scene.index === activeSceneIndex && isVisible);

        if (isVisible) {
            window.requestAnimationFrame(() => {
                scene.map.resize();
                scene.locatorMaps.forEach(locatorMap => locatorMap.map.resize());
                updateSceneAnnotation(scene);
                updateSceneLocator(scene);
                applyMapLabelVisibility(scene);
            });
        }
    });

    if (!visibleScenes.includes(getActiveScene())) {
        setActiveScene(visibleScenes.length - 1);
    }

    renderAnnotationPanel();
}

function setActiveScene(index) {
    activeSceneIndex = Math.max(0, Math.min(getVisibleScenes().length - 1, index));
    setLabelPlacementMode(null);
    if (drawingSceneIndex !== null && drawingSceneIndex !== activeSceneIndex) {
        const prev = scenes[drawingSceneIndex];
        if (prev) { prev.activeDrawing = null; redrawDrawings(prev); }
        setDrawingMode(null);
    }
    if (shapeMode !== null && shapeMode !== activeSceneIndex) {
        setShapeMode(null);
    }
    selectedAnnotationId = getActiveScene().editorialLabels[0]?.id || null;
    activeSceneInput.value = String(activeSceneIndex);
    scenes.forEach(scene => scene.sceneEl.classList.toggle('is-active', scene.index === activeSceneIndex));
    syncControlsFromScene();
    renderAnnotationPanel();
    renderDrawingList();
}

function syncControlsFromScene() {
    const scene = getActiveScene();
    mapHeightInput.value = String(scene.height);
    mapHeightValue.textContent = `${scene.height}px`;
    markerSourceInput.value = scene.markerSource;
    markerSourceInput.disabled = scene.index === 0;
    markerCenterButton.disabled = !canSetCustomMarker(scene);
    markerClearButton.disabled = !canSetCustomMarker(scene);
    markerStyleInput.value = scene.markerStyle;
    markerLabelInput.value = scene.markerLabel;
    mapLabelsInput.value = scene.showMapLabels ? 'show' : 'hide';
    sceneDrawingsInput.value = scene.showDrawings ? 'show' : 'hide';
    sceneShapesInput.value = scene.showShapes ? 'show' : 'hide';
    locatorModeInput.value = scene.locator.mode;
    locatorQueryInput.value = scene.locator.query;
    syncCoordinateInputs();
    renderDrawingList();
    renderShapeList();
}

function syncCoordinateInputs() {
    const center = getActiveScene().map.getCenter();
    latitudeInput.value = center.lat.toFixed(6);
    longitudeInput.value = center.lng.toFixed(6);
}

function setSceneHeight(value) {
    const scene = getActiveScene();
    const height = Number.parseInt(value, 10);
    scene.height = Number.isFinite(height) ? Math.max(180, Math.min(1000, height)) : 520;
    mapHeightInput.value = String(scene.height);
    mapHeightValue.textContent = `${scene.height}px`;
    scene.sceneEl.style.height = `${scene.height}px`;
    window.requestAnimationFrame(() => {
        scene.map.resize();
        updateSceneAnnotation(scene);
        updateSceneLocator(scene);
    });
}

function parseCoordinatePair(value) {
    const match = String(value || '').trim().match(/^\s*(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)\s*$/);

    if (!match) {
        return null;
    }

    const first = Number.parseFloat(match[1].replace(',', '.'));
    const second = Number.parseFloat(match[2].replace(',', '.'));

    if (!isValidLatitude(first) || !isValidLongitude(second)) {
        return null;
    }

    return {lat: first, lng: second};
}

function isValidLatitude(value) {
    return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value) {
    return Number.isFinite(value) && value >= -180 && value <= 180;
}

function goToCoordinates(lat, lng, zoom = Math.max(getActiveScene().map.getZoom(), 10)) {
    getActiveScene().map.flyTo({
        center: [lng, lat],
        zoom,
        essential: true
    });
}

function getSceneMarker(scene) {
    if (scene.index === 0 || scene.markerSource === 'search') {
        return storyLocation;
    }

    return scene.marker || storyLocation;
}

function canSetCustomMarker(scene) {
    return scene.index > 0 && scene.markerSource === 'custom';
}

function refreshAllSceneMarkers() {
    scenes.forEach(scene => {
        updateSceneAnnotation(scene);
        updateSceneLocator(scene);
    });
}

function setStoryLocation(lngLat) {
    storyLocation = {lng: lngLat.lng, lat: lngLat.lat};
    scenes.forEach(scene => {
        if (scene.index === 0 || scene.markerSource === 'search') {
            scene.locator.focus = {...storyLocation};
        }
    });
    refreshAllSceneMarkers();
}

function setCustomMarkerForActiveScene(lngLat) {
    const scene = getActiveScene();

    if (!canSetCustomMarker(scene)) {
        const reason = scene.index === 0
            ? 'Na cena 1, o ponto é fixo no local da busca.'
            : 'Para mover o ponto nesta cena, escolha "Escolher ponto manual nesta cena".';
        setStatus(reason);
        return;
    }

    scene.marker = {lng: lngLat.lng, lat: lngLat.lat};
    scene.locator.focus = {...scene.marker};
    scene.markerStyle = markerStyleInput.value;
    scene.markerLabel = markerLabelInput.value;
    updateSceneAnnotation(scene);
    updateSceneLocator(scene);
    setStatus(`Destaque aplicado na cena ${scene.index + 1}.`);
}

function clearMarkerForActiveScene() {
    const scene = getActiveScene();

    if (!canSetCustomMarker(scene)) {
        setStatus(scene.index === 0
            ? 'Na cena 1, o ponto fica sempre no local da busca.'
            : 'Esta cena está usando o local da busca.');
        return;
    }

    scene.marker = null;
    updateSceneAnnotation(scene);
    updateSceneLocator(scene);
    setStatus(`Ponto manual removido da cena ${scene.index + 1}.`);
}

async function searchPlace() {
    const query = normalizeText(searchInput.value);

    searchResults.replaceChildren();

    if (!query) {
        setStatus('Digite um local para buscar.');
        return;
    }

    const coordinates = parseCoordinatePair(query);
    if (coordinates) {
        getVisibleScenes().forEach(scene => {
            scene.map.flyTo({
                center: [coordinates.lng, coordinates.lat],
                zoom: scene.index === 0 ? scene.map.getZoom() : 12,
                essential: true
            });
        });
        setStoryLocation({lng: coordinates.lng, lat: coordinates.lat});
        setStatus('Local da busca atualizado pelas coordenadas.');
        return;
    }

    setStatus('Buscando local...');

    const params = new URLSearchParams({
        access_token: mapboxToken,
        language: 'pt',
        limit: '5',
        autocomplete: 'true'
    });
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params.toString()}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('A busca do Mapbox não respondeu como esperado.');
        }

        const data = await response.json();
        const features = Array.isArray(data.features) ? data.features : [];

        if (!features.length) {
            setStatus('Nenhum resultado encontrado.');
            return;
        }

        renderSearchResults(features);
        setStatus(`${features.length} resultado(s) encontrado(s).`);
    } catch (error) {
        setStatus(error.message || 'Não foi possível fazer a busca.');
    }
}

function renderSearchResults(features) {
    const fragment = document.createDocumentFragment();

    features.forEach(feature => {
        const button = document.createElement('button');
        const [lng, lat] = feature.center || [];

        button.type = 'button';
        button.className = 'result-button';
        button.textContent = feature.place_name || feature.text || 'Resultado sem nome';
        button.addEventListener('click', () => {
            searchInput.value = feature.place_name || feature.text || '';
            searchResults.replaceChildren();

            getVisibleScenes().forEach(scene => {
                if (scene.index === 0) {
                    if (isValidLatitude(lat) && isValidLongitude(lng)) {
                        scene.map.flyTo({center: [lng, lat], essential: true});
                    }
                } else if (Array.isArray(feature.bbox) && feature.bbox.length === 4) {
                    scene.map.fitBounds(
                        [
                            [feature.bbox[0], feature.bbox[1]],
                            [feature.bbox[2], feature.bbox[3]]
                        ],
                        {padding: 54, maxZoom: 13, essential: true}
                    );
                } else if (isValidLatitude(lat) && isValidLongitude(lng)) {
                    scene.map.flyTo({center: [lng, lat], zoom: 12, essential: true});
                }
            });

            if (isValidLatitude(lat) && isValidLongitude(lng)) {
                setStoryLocation({lng, lat});
                getVisibleScenes().forEach(scene => applyLocatorLevels(scene, feature));
            }

            setStatus('Local da busca aplicado em todas as cenas.');
        });

        fragment.append(button);
    });

    searchResults.replaceChildren(fragment);
}

function goToCoordinateFields() {
    const lat = Number.parseFloat(String(latitudeInput.value).replace(',', '.'));
    const lng = Number.parseFloat(String(longitudeInput.value).replace(',', '.'));

    if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
        setStatus('Informe latitude entre -90 e 90 e longitude entre -180 e 180.');
        return;
    }

    goToCoordinates(lat, lng);
    setStoryLocation({lng, lat});
    setStatus('Local da busca atualizado pelas coordenadas.');
}

function changeZoom(delta) {
    getActiveScene().map.easeTo({
        zoom: getActiveScene().map.getZoom() + delta,
        duration: 220,
        essential: true
    });
}

function captureTextLayerVisibility(scene) {
    const style = scene.map.getStyle();

    if (!style?.layers?.length) {
        return;
    }

    const layers = style.layers || [];

    layers.forEach(layer => {
        const hasText = layer.type === 'symbol'
            && layer.layout
            && Object.prototype.hasOwnProperty.call(layer.layout, 'text-field');

        if (hasText && !scene.originalTextLayerVisibility.has(layer.id)) {
            scene.originalTextLayerVisibility.set(layer.id, layer.layout.visibility || 'visible');
        }
    });
}

function applySymbolEdgeAvoidance(scene) {
    const style = scene.map.getStyle();
    if (!style?.layers) return;
    style.layers.forEach(layer => {
        if (layer.type !== 'symbol') return;
        try { scene.map.setLayoutProperty(layer.id, 'symbol-avoid-edges', true); } catch {}
    });
}

function setDrawingMode(sceneIndex) {
    drawingSceneIndex = sceneIndex;
    drawingStartButton.textContent = sceneIndex === null ? 'Começar linha' : 'Fechar linha';
    scenes.forEach(scene => {
        scene.sceneEl.classList.toggle('is-drawing', scene.index === sceneIndex);
        if (sceneIndex !== null && scene.index === sceneIndex) {
            scene.map.doubleClickZoom.disable();
        } else {
            scene.map.doubleClickZoom.enable();
        }
    });
}

function addDrawingPoint(scene, lngLat, pixelPoint) {
    if (!scene.activeDrawing) return;
    const SNAP = 12;
    if (pixelPoint) {
        for (let i = 0; i < scene.activeDrawing.points.length; i++) {
            const p = scene.activeDrawing.points[i];
            const proj = scene.map.project([p.lng, p.lat]);
            const dx = proj.x - pixelPoint.x;
            const dy = proj.y - pixelPoint.y;
            if (Math.sqrt(dx * dx + dy * dy) <= SNAP) {
                scene.activeDrawing.points.splice(i, 1);
                redrawDrawings(scene);
                return;
            }
        }
    }
    scene.activeDrawing.points.push({lng: lngLat.lng, lat: lngLat.lat});
    redrawDrawings(scene);
}

function finalizeDrawing(scene) {
    if (!scene.activeDrawing) return;
    scene.activeDrawing.color = drawingColorInput.value;
    scene.activeDrawing.width = Math.max(1, Math.min(100, Number(drawingWidthInput.value) || 3));
    scene.activeDrawing.dashed = drawingStyleInput.value === 'dashed';
    scene.activeDrawing.arrow = drawingArrowInput.value;
    if (scene.activeDrawing.points.length >= 2) {
        drawings.push(scene.activeDrawing);
        renderDrawingList();
        scenes.forEach(s => redrawDrawings(s));
    }
    scene.activeDrawing = null;
    setDrawingMode(null);
    redrawDrawings(scene);
}

function appendSvgArrow(svg, pts, color, width, atEnd) {
    const end = atEnd ? pts[pts.length - 1] : pts[0];
    const before = atEnd ? pts[pts.length - 2] : pts[1];
    const dx = end.x - before.x;
    const dy = end.y - before.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const size = Math.max(12, width * 4);
    const half = size * 0.38;
    // tip extends BEYOND the endpoint
    const tipX = end.x + ux * size * 0.6;
    const tipY = end.y + uy * size * 0.6;
    // base sits at the endpoint, perpendicular to the line
    const p2x = (end.x - uy * half).toFixed(1);
    const p2y = (end.y + ux * half).toFixed(1);
    const p3x = (end.x + uy * half).toFixed(1);
    const p3y = (end.y - ux * half).toFixed(1);
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', `${tipX.toFixed(1)},${tipY.toFixed(1)} ${p2x},${p2y} ${p3x},${p3y}`);
    poly.setAttribute('fill', color);
    svg.appendChild(poly);
}

function renderSvgShape(svg, shape, scene) {
    if (!shape.points?.length) return;
    const pts = shape.points.map(p => scene.map.project([p.lng, p.lat]));
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
    poly.setAttribute('fill', shape.fillColor);
    poly.setAttribute('fill-opacity', String(shape.fillOpacity));
    poly.setAttribute('stroke', shape.strokeWidth > 0 ? shape.strokeColor : 'none');
    poly.setAttribute('stroke-width', String(shape.strokeWidth));
    poly.setAttribute('stroke-opacity', String(shape.strokeOpacity));
    poly.setAttribute('stroke-linejoin', 'round');
    if (shape._preview) poly.setAttribute('stroke-dasharray', '6,4');
    svg.appendChild(poly);
    if (shape.text) {
        const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', cx.toFixed(1));
        t.setAttribute('y', cy.toFixed(1));
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('dominant-baseline', 'middle');
        t.setAttribute('font-family', '"Open Sans", sans-serif');
        t.setAttribute('font-weight', '900');
        t.setAttribute('font-size', '14');
        t.setAttribute('fill', shape.strokeColor);
        t.setAttribute('paint-order', 'stroke');
        t.setAttribute('stroke', '#ffffff');
        t.setAttribute('stroke-width', '3');
        t.setAttribute('stroke-linejoin', 'round');
        t.textContent = shape.text;
        svg.appendChild(t);
    }
    if (shape._preview && pendingShapeCenter) {
        const cPx = scene.map.project([pendingShapeCenter.lng, pendingShapeCenter.lat]);
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', cPx.x.toFixed(1));
        dot.setAttribute('cy', cPx.y.toFixed(1));
        dot.setAttribute('r', '5');
        dot.setAttribute('fill', shape.strokeColor);
        dot.setAttribute('stroke', '#ffffff');
        dot.setAttribute('stroke-width', '2');
        svg.appendChild(dot);
    }
}

function redrawDrawings(scene) {
    const svg = scene.svgEl;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    if (scene.showShapes) {
        const allShapes = [...shapes, ...(scene.previewShape ? [scene.previewShape] : [])];
        allShapes.forEach(shape => renderSvgShape(svg, shape, scene));
        if (shapeMode === scene.index && pendingShapeCenter && !scene.previewShape) {
            const cPx = scene.map.project([pendingShapeCenter.lng, pendingShapeCenter.lat]);
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', cPx.x.toFixed(1));
            dot.setAttribute('cy', cPx.y.toFixed(1));
            dot.setAttribute('r', '5');
            dot.setAttribute('fill', shapeStrokeColorInput.value);
            dot.setAttribute('stroke', '#ffffff');
            dot.setAttribute('stroke-width', '2');
            svg.appendChild(dot);
        }
    }

    if (!scene.showDrawings) return;

    const all = [...drawings, ...(scene.activeDrawing ? [{...scene.activeDrawing, _active: true, arrow: 'none'}] : [])];

    all.forEach(drawing => {
        if (!drawing.points.length) return;
        const pts = drawing.points.map(p => scene.map.project([p.lng, p.lat]));

        if (pts.length === 1) {
            const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            c.setAttribute('cx', String(pts[0].x));
            c.setAttribute('cy', String(pts[0].y));
            c.setAttribute('r', String(Math.max(3, drawing.width)));
            c.setAttribute('fill', drawing.color);
            svg.appendChild(c);
            return;
        }

        const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('stroke', drawing.color);
        path.setAttribute('stroke-width', String(drawing.width));
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');

        if (drawing._active) {
            path.setAttribute('stroke-opacity', '0.6');
            path.setAttribute('stroke-dasharray', '6,4');
        } else if (drawing.dashed) {
            const dl = Math.max(8, drawing.width * 3);
            const gl = Math.max(5, drawing.width * 2);
            path.setAttribute('stroke-dasharray', `${dl},${gl}`);
        }

        svg.appendChild(path);

        if (drawing._active) {
            pts.forEach(pt => {
                const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                handle.setAttribute('cx', pt.x.toFixed(1));
                handle.setAttribute('cy', pt.y.toFixed(1));
                handle.setAttribute('r', '6');
                handle.setAttribute('fill', drawing.color);
                handle.setAttribute('stroke', '#ffffff');
                handle.setAttribute('stroke-width', '2');
                svg.appendChild(handle);
            });
        }

        if (!drawing._active && drawing.arrow !== 'none') {
            if (drawing.arrow === 'end' || drawing.arrow === 'both') {
                appendSvgArrow(svg, pts, drawing.color, drawing.width, true);
            }
            if (drawing.arrow === 'both') {
                appendSvgArrow(svg, pts, drawing.color, drawing.width, false);
            }
        }
    });
}

function renderDrawingList() {
    const scene = getActiveScene();
    if (!scene) return;
    drawingList.replaceChildren();

    if (!drawings.length) {
        const empty = document.createElement('p');
        empty.className = 'annotation-empty';
        empty.textContent = 'Nenhuma linha desenhada.';
        drawingList.append(empty);
        return;
    }

    drawings.forEach((drawing, i) => {
        const item = document.createElement('div');
        item.className = 'annotation-item';

        const swatch = document.createElement('span');
        swatch.style.cssText = `display:inline-block;width:28px;height:4px;background:${drawing.color};border-radius:2px;flex-shrink:0;margin-top:8px;`;

        const textWrap = document.createElement('span');
        textWrap.className = 'annotation-item__text';
        const title = document.createElement('strong');
        title.textContent = `Linha ${i + 1}`;
        const meta = document.createElement('span');
        meta.textContent = `${drawing.dashed ? 'tracejada' : 'sólida'}${drawing.arrow !== 'none' ? ' · seta' : ''} · ${drawing.width}px`;
        textWrap.append(title, meta);

        const editBtn = document.createElement('button');
        editBtn.className = 'text-button';
        editBtn.type = 'button';
        editBtn.textContent = 'Editar';
        editBtn.addEventListener('click', () => {
            if (drawingSceneIndex !== null) {
                const prev = scenes[drawingSceneIndex];
                if (prev) { prev.activeDrawing = null; redrawDrawings(prev); }
                setDrawingMode(null);
            }
            const scene = getActiveScene();
            drawings = drawings.filter(d => d.id !== drawing.id);
            scene.activeDrawing = drawing;
            drawingColorInput.value = drawing.color;
            drawingWidthInput.value = String(drawing.width);
            drawingStyleInput.value = drawing.dashed ? 'dashed' : 'solid';
            drawingArrowInput.value = drawing.arrow;
            setDrawingMode(scene.index);
            scenes.forEach(s => redrawDrawings(s));
            renderDrawingList();
            setStatus('Clique no mapa para adicionar pontos. Clique num vértice existente para removê-lo.');
        });

        const del = document.createElement('button');
        del.className = 'text-button danger';
        del.type = 'button';
        del.textContent = 'Apagar';
        del.addEventListener('click', () => {
            drawings = drawings.filter(d => d.id !== drawing.id);
            scenes.forEach(s => redrawDrawings(s));
            renderDrawingList();
        });

        item.append(swatch, textWrap, editBtn, del);
        drawingList.appendChild(item);
    });
}

function generateShapePoints(scene, center, edge, type) {
    const cPx = scene.map.project([center.lng, center.lat]);
    const ePx = scene.map.project([edge.lng, edge.lat]);
    const radius = Math.sqrt((ePx.x - cPx.x) ** 2 + (ePx.y - cPx.y) ** 2);
    const configs = {circle: {n: 48, rot: 0}, square: {n: 4, rot: Math.PI / 4}, hexagon: {n: 6, rot: 0}, triangle: {n: 3, rot: -Math.PI / 2}};
    const {n, rot} = configs[type] || configs.circle;
    return Array.from({length: n}, (_, i) => {
        const angle = (2 * Math.PI * i / n) + rot;
        const lngLat = scene.map.unproject([cPx.x + radius * Math.cos(angle), cPx.y + radius * Math.sin(angle)]);
        return {lng: lngLat.lng, lat: lngLat.lat};
    });
}

function buildShapeObject(scene, center, edge, preview = false) {
    return {
        id: preview ? -1 : shapeIdCounter++,
        type: shapeTypeInput.value,
        points: generateShapePoints(scene, center, edge, shapeTypeInput.value),
        center: {...center},
        strokeColor: shapeStrokeColorInput.value,
        strokeWidth: Number(shapeStrokeWidthInput.value) || 0,
        strokeOpacity: Math.min(1, Math.max(0, Number(shapeStrokeOpacityInput.value) / 100)),
        fillColor: shapeFillColorInput.value,
        fillOpacity: Math.min(1, Math.max(0, Number(shapeFillOpacityInput.value) / 100)),
        text: shapeTextInput.value,
        _preview: preview
    };
}

function setShapeMode(sceneIndex) {
    shapeMode = sceneIndex;
    pendingShapeCenter = null;
    shapeStartButton.textContent = sceneIndex === null ? 'Inserir forma' : 'Cancelar';
    scenes.forEach(s => {
        s.sceneEl.classList.toggle('is-placing-shape', s.index === sceneIndex);
        if (s.index !== sceneIndex) { s.previewShape = null; }
    });
    if (sceneIndex === null) scenes.forEach(s => redrawDrawings(s));
}

function handleShapeClick(scene, lngLat) {
    if (!pendingShapeCenter) {
        pendingShapeCenter = {lng: lngLat.lng, lat: lngLat.lat};
        setStatus('Clique novamente para definir o tamanho da forma.');
    } else {
        shapes.push(buildShapeObject(scene, pendingShapeCenter, lngLat));
        scene.previewShape = null;
        setShapeMode(null);
        scenes.forEach(s => redrawDrawings(s));
        renderShapeList();
        setStatus('Forma inserida.');
    }
}

function renderShapeList() {
    shapeList.replaceChildren();
    if (!shapes.length) {
        const empty = document.createElement('p');
        empty.className = 'annotation-empty';
        empty.textContent = 'Nenhuma forma inserida.';
        shapeList.append(empty);
        return;
    }
    const typeLabels = {circle: 'Círculo', square: 'Quadrado', hexagon: 'Hexágono', triangle: 'Triângulo'};
    shapes.forEach((shape, i) => {
        const item = document.createElement('div');
        item.className = 'annotation-item';
        const swatch = document.createElement('span');
        swatch.style.cssText = `display:inline-block;width:16px;height:16px;background:${shape.fillColor};border:2px solid ${shape.strokeColor};border-radius:50%;flex-shrink:0;opacity:${shape.fillOpacity + 0.2};`;
        const textWrap = document.createElement('span');
        textWrap.className = 'annotation-item__text';
        const title = document.createElement('strong');
        title.textContent = `${typeLabels[shape.type] || shape.type} ${i + 1}`;
        const meta = document.createElement('span');
        meta.textContent = shape.text || `fill ${Math.round(shape.fillOpacity * 100)}%`;
        textWrap.append(title, meta);
        const del = document.createElement('button');
        del.className = 'text-button danger';
        del.type = 'button';
        del.textContent = 'Apagar';
        del.addEventListener('click', () => {
            shapes = shapes.filter(s => s.id !== shape.id);
            scenes.forEach(s => redrawDrawings(s));
            renderShapeList();
        });
        item.append(swatch, textWrap, del);
        shapeList.appendChild(item);
    });
}

function drawShapes(ctx, scene, offsetY) {
    if (!scene.showShapes) return;
    shapes.forEach(shape => {
        if (!shape.points?.length) return;
        const pts = shape.points.map(p => scene.map.project([p.lng, p.lat]));
        ctx.save();
        ctx.beginPath();
        pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, offsetY + p.y); else ctx.lineTo(p.x, offsetY + p.y); });
        ctx.closePath();
        ctx.globalAlpha = shape.fillOpacity;
        ctx.fillStyle = shape.fillColor;
        ctx.fill();
        if (shape.strokeWidth > 0) {
            ctx.globalAlpha = shape.strokeOpacity;
            ctx.strokeStyle = shape.strokeColor;
            ctx.lineWidth = shape.strokeWidth;
            ctx.lineJoin = 'round';
            ctx.stroke();
        }
        if (shape.text) {
            const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
            const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
            ctx.globalAlpha = 1;
            ctx.font = '900 14px "Open Sans"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            ctx.strokeText(shape.text, cx, offsetY + cy);
            ctx.fillStyle = shape.strokeColor;
            ctx.fillText(shape.text, cx, offsetY + cy);
        }
        ctx.restore();
    });
}

function drawArrowhead(ctx, x1, y1, x2, y2, color, lineWidth) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const size = Math.max(12, lineWidth * 4);
    const half = size * 0.38;
    const tipX = x2 + ux * size * 0.6;
    const tipY = y2 + uy * size * 0.6;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(x2 - uy * half, y2 + ux * half);
    ctx.lineTo(x2 + uy * half, y2 - ux * half);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawDrawings(ctx, scene, offsetY) {
    if (!scene.showDrawings) return;
    drawings.forEach(drawing => {
        if (drawing.points.length < 2) return;
        const pts = drawing.points.map(p => scene.map.project([p.lng, p.lat]));
        ctx.save();
        ctx.strokeStyle = drawing.color;
        ctx.lineWidth = drawing.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (drawing.dashed) {
            const dl = Math.max(8, drawing.width * 3);
            const gl = Math.max(5, drawing.width * 2);
            ctx.setLineDash([dl, gl]);
        } else {
            ctx.setLineDash([]);
        }
        ctx.beginPath();
        pts.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, offsetY + p.y);
            else ctx.lineTo(p.x, offsetY + p.y);
        });
        ctx.stroke();
        if (drawing.arrow !== 'none') {
            ctx.setLineDash([]);
            const last = pts[pts.length - 1];
            const prev = pts[pts.length - 2];
            if (drawing.arrow === 'end' || drawing.arrow === 'both') {
                drawArrowhead(ctx, prev.x, offsetY + prev.y, last.x, offsetY + last.y, drawing.color, drawing.width);
            }
            if (drawing.arrow === 'both') {
                drawArrowhead(ctx, pts[1].x, offsetY + pts[1].y, pts[0].x, offsetY + pts[0].y, drawing.color, drawing.width);
            }
        }
        ctx.restore();
    });
}

function hideLocatorLabels(map) {
    const style = map.getStyle();
    if (!style?.layers) return;
    style.layers.forEach(layer => {
        if (layer.type === 'symbol' && layer.layout?.['text-field']) {
            try { map.setLayoutProperty(layer.id, 'visibility', 'none'); } catch {}
        }
    });
}

function applyMapLabelVisibility(scene) {
    if (!scene.map.getStyle()?.layers?.length) {
        return;
    }

    captureTextLayerVisibility(scene);

    scene.originalTextLayerVisibility.forEach((originalVisibility, layerId) => {
        if (!scene.map.getLayer(layerId)) {
            return;
        }

        try {
            scene.map.setLayoutProperty(layerId, 'visibility', scene.showMapLabels ? originalVisibility : 'none');
        } catch {
            // Some imported style layers can disappear while Mapbox is refreshing the style.
        }
    });
}

function setLabelPlacementMode(sceneIndex) {
    labelPlacementSceneIndex = sceneIndex;
    labelAddButton.textContent = sceneIndex === null ? 'Inserir no clique' : 'Clique no mapa';
    scenes.forEach(scene => {
        scene.sceneEl.classList.toggle('is-placing-label', scene.index === sceneIndex);
    });
}

function getDefaultLabelOffset(position) {
    const offsets = {
        right: {x: 16, y: -13},
        left: {x: -16, y: -13},
        top: {x: 0, y: -40},
        bottom: {x: 0, y: 18}
    };

    return offsets[position] || offsets.right;
}

function getTextAlignForPosition(position) {
    if (position === 'left') return 'right';
    if (position === 'top' || position === 'bottom') return 'center';
    return 'left';
}

function addEditorialLabelToActiveScene(lngLat) {
    const scene = getActiveScene();
    const text = normalizeText(editorialLabelInput.value);
    const symbol = editorialSymbolInput.value;
    const textPosition = editorialLabelPositionInput.value;
    const defaultOffset = getDefaultLabelOffset(textPosition);

    if (!text && symbol === 'none') {
        setStatus('O item precisa ter texto ou símbolo.');
        setLabelPlacementMode(null);
        return;
    }

    if (symbol === 'image' && !editorialImageData) {
        setStatus('Faça upload de um PNG antes de inserir esse símbolo.');
        setLabelPlacementMode(null);
        return;
    }

    const annotation = {
        id: `annotation-${annotationIdCounter}`,
        lng: lngLat.lng,
        lat: lngLat.lat,
        text,
        symbol,
        imageData: symbol === 'image' ? editorialImageData : '',
        textPosition,
        offsetX: defaultOffset.x,
        offsetY: defaultOffset.y
    };

    annotationIdCounter += 1;
    scene.editorialLabels.push(annotation);
    selectedAnnotationId = annotation.id;
    updateSceneAnnotation(scene);
    renderAnnotationPanel();
    setLabelPlacementMode(null);
    setStatus(`Elemento manual adicionado na cena ${scene.index + 1}.`);
}

function clearEditorialLabelsForActiveScene() {
    const scene = getActiveScene();

    scene.editorialLabels = [];
    selectedAnnotationId = null;
    updateSceneAnnotation(scene);
    renderAnnotationPanel();
    setStatus(`Rótulos manuais removidos da cena ${scene.index + 1}.`);
}

function updateEditorialLabelOffset(scene, editorialLabel, deltaX, deltaY) {
    editorialLabel.offsetX += deltaX;
    editorialLabel.offsetY += deltaY;
    editorialLabel.textPosition = 'custom';
    updateSceneAnnotation(scene);
}

function startEditorialTextDrag(event, scene, editorialLabel) {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const initialX = editorialLabel.offsetX;
    const initialY = editorialLabel.offsetY;
    const pointerId = event.pointerId;
    const target = event.currentTarget;

    target.setPointerCapture(pointerId);

    function onPointerMove(moveEvent) {
        if (moveEvent.pointerId !== pointerId) {
            return;
        }

        editorialLabel.offsetX = initialX + moveEvent.clientX - startX;
        editorialLabel.offsetY = initialY + moveEvent.clientY - startY;
        target.style.left = `${editorialLabel.offsetX}px`;
        target.style.top = `${editorialLabel.offsetY}px`;
    }

    function onPointerEnd(endEvent) {
        if (endEvent.pointerId !== pointerId) {
            return;
        }

        editorialLabel.textPosition = 'custom';
        selectedAnnotationId = editorialLabel.id;
        renderAnnotationPanel();
        target.removeEventListener('pointermove', onPointerMove);
        target.removeEventListener('pointerup', onPointerEnd);
        target.removeEventListener('pointercancel', onPointerEnd);
    }

    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', onPointerEnd);
    target.addEventListener('pointercancel', onPointerEnd);
}

function startEditorialSymbolDrag(event, scene, editorialLabel) {
    event.preventDefault();
    event.stopPropagation();

    selectedAnnotationId = editorialLabel.id;
    renderAnnotationPanel();

    const pointerId = event.pointerId;
    const target = event.currentTarget;
    const labelEl = target.closest('.editorial-label');
    const mapCanvas = scene.map.getCanvas();
    const dragPanWasEnabled = scene.map.dragPan.isEnabled();

    if (dragPanWasEnabled) {
        scene.map.dragPan.disable();
    }

    target.setPointerCapture(pointerId);

    function moveAnnotation(moveEvent) {
        if (moveEvent.pointerId !== pointerId) {
            return;
        }

        const rect = mapCanvas.getBoundingClientRect();
        const point = [
            moveEvent.clientX - rect.left,
            moveEvent.clientY - rect.top
        ];
        const lngLat = scene.map.unproject(point);

        editorialLabel.lng = lngLat.lng;
        editorialLabel.lat = lngLat.lat;

        if (labelEl) {
            const projectedPoint = scene.map.project([editorialLabel.lng, editorialLabel.lat]);
            labelEl.style.left = `${projectedPoint.x}px`;
            labelEl.style.top = `${projectedPoint.y}px`;
        }

        selectedLabelLatInput.value = editorialLabel.lat.toFixed(6);
        selectedLabelLngInput.value = editorialLabel.lng.toFixed(6);
    }

    function endDrag(endEvent) {
        if (endEvent.pointerId !== pointerId) {
            return;
        }

        if (dragPanWasEnabled) {
            scene.map.dragPan.enable();
        }

        updateSceneAnnotation(scene);
        renderAnnotationPanel();
        target.removeEventListener('pointermove', moveAnnotation);
        target.removeEventListener('pointerup', endDrag);
        target.removeEventListener('pointercancel', endDrag);
    }

    target.addEventListener('pointermove', moveAnnotation);
    target.addEventListener('pointerup', endDrag);
    target.addEventListener('pointercancel', endDrag);
}

function createEditorialSymbol(editorialLabel) {
    if (editorialLabel.symbol === 'none') {
        const empty = document.createElement('span');
        empty.className = 'editorial-label__symbol editorial-label__symbol--none';
        return empty;
    }

    if (editorialLabel.symbol === 'image' && editorialLabel.imageData) {
        const image = document.createElement('img');
        image.className = 'editorial-label__symbol editorial-label__symbol--image';
        image.src = editorialLabel.imageData;
        image.alt = '';
        return image;
    }

    const symbol = document.createElement('span');
    const symbolType = editorialLabel.symbol || 'dot';
    symbol.className = `editorial-label__symbol editorial-label__symbol--${symbolType}`;
    return symbol;
}

function setupLocatorDrag(scene) {
    let dragState = null;

    scene.locatorEl.addEventListener('pointerdown', event => {
        if (scene.locator.mode === 'none') {
            return;
        }

        if (scene.index !== activeSceneIndex) {
            setActiveScene(scene.index);
        }

        dragState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            locatorX: scene.locator.x,
            locatorY: scene.locator.y
        };

        scene.locatorEl.classList.add('is-dragging');
        scene.locatorEl.setPointerCapture(event.pointerId);
    });

    scene.locatorEl.addEventListener('pointermove', event => {
        if (!dragState || dragState.pointerId !== event.pointerId) {
            return;
        }

        const nextX = dragState.locatorX + event.clientX - dragState.startX;
        const nextY = dragState.locatorY + event.clientY - dragState.startY;
        setLocatorPosition(scene, nextX, nextY);
    });

    scene.locatorEl.addEventListener('pointerup', event => {
        if (dragState?.pointerId === event.pointerId) {
            dragState = null;
            scene.locatorEl.classList.remove('is-dragging');
        }
    });

    scene.locatorEl.addEventListener('pointercancel', () => {
        dragState = null;
        scene.locatorEl.classList.remove('is-dragging');
    });
}

function getLocatorSize(scene) {
    if (scene.locator.mode === 'three') {
        return {width: 170, height: 58};
    }

    if (scene.locator.mode === 'two') {
        return {width: 114, height: 58};
    }

    return {width: 58, height: 58};
}

function setLocatorPosition(scene, x, y) {
    const size = getLocatorSize(scene);
    const maxX = Math.max(0, outputWidth - size.width);
    const maxY = Math.max(0, scene.height - size.height);

    scene.locator.x = Math.max(0, Math.min(maxX, x));
    scene.locator.y = Math.max(0, Math.min(maxY, y));
    scene.locatorEl.style.transform = `translate(${scene.locator.x}px, ${scene.locator.y}px)`;
}

function updateSceneLocator(scene) {
    const enabled = scene.locator.mode !== 'none';

    scene.locatorEl.hidden = !enabled;
    scene.locatorMaps[1].wrapEl.hidden = !['two', 'three'].includes(scene.locator.mode);
    scene.locatorMaps[2].wrapEl.hidden = scene.locator.mode !== 'three';

    if (!enabled) {
        return;
    }

    setLocatorPosition(scene, scene.locator.x, scene.locator.y);
    scene.locatorMaps.forEach(locatorMap => locatorMap.map.resize());
    updateSceneLocatorFocus(scene);
}

function updateSceneLocatorFocus(scene) {
    if (scene.locator.mode === 'none') {
        return;
    }

    const focus = getSceneMarker(scene) || scene.locator.focus || scene.map.getCenter();

    scene.locatorMaps.forEach(locatorMap => {
        const point = locatorMap.map.project([focus.lng, focus.lat]);
        const x = Math.max(5, Math.min(45, point.x));
        const y = Math.max(5, Math.min(45, point.y));

        locatorMap.focusEl.style.left = `${x}px`;
        locatorMap.focusEl.style.top = `${y}px`;
    });
}

function applyLocatorLevels(scene, feature) {
    if (scene.locator.mode === 'none') return;

    const [lng, lat] = feature.center || [];
    if (!isValidLatitude(lat) || !isValidLongitude(lng)) return;

    const context = feature.context || [];
    const countryCtx = context.find(c => c.id?.startsWith('country.'));
    const isBrazil = countryCtx?.short_code?.toUpperCase() === 'BR'
        || ((feature.place_type || []).includes('country') && feature.properties?.short_code?.toUpperCase() === 'BR');

    const levels = isBrazil
        ? [
            {center: [-53.2, -14.2], zoom: 2.8},
            {center: [lng, lat], zoom: 5.5},
            {center: [lng, lat], zoom: 9.5}
          ]
        : [
            {center: [0, 20], zoom: 0.5},
            {center: [lng, lat], zoom: 3.5},
            {center: [lng, lat], zoom: 8.0}
          ];

    scene.locatorMaps.forEach((locatorMap, i) => {
        if (i >= levels.length) return;
        locatorMap.center = levels[i].center;
        locatorMap.zoom = levels[i].zoom;
        locatorMap.map.easeTo({center: levels[i].center, zoom: levels[i].zoom, duration: 300});
    });
}

function applyLocatorFocus(scene) {
    const focus = getSceneMarker(scene) || scene.map.getCenter();
    const detailZooms = [5.0, 9.5];

    scene.locator.focus = {lng: focus.lng, lat: focus.lat};
    scene.locatorMaps.slice(1).forEach((locatorMap, i) => {
        const zoom = detailZooms[i] ?? 9.5;
        locatorMap.center = [focus.lng, focus.lat];
        locatorMap.zoom = zoom;
        locatorMap.map.easeTo({center: [focus.lng, focus.lat], zoom, duration: 0});
    });
    updateSceneLocator(scene);
}

function getPresetBounds(query) {
    const normalized = normalizeText(query)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    const presets = {
        mundo: [[-179, -58], [179, 78]],
        'mundo todo': [[-179, -58], [179, 78]],
        brasil: [[-73.9, -33.7], [-28.8, 5.3]],
        brazil: [[-73.9, -33.7], [-28.8, 5.3]],
        america: [[-168, -56], [-30, 73]],
        americas: [[-168, -56], [-30, 73]],
        'america do sul': [[-83, -56], [-34, 14]],
        'america sul': [[-83, -56], [-34, 14]],
        'america do norte': [[-168, 7], [-52, 73]],
        europa: [[-25, 34], [45, 72]],
        asia: [[25, -12], [180, 78]],
        africa: [[-20, -35], [52, 38]],
        oceania: [[105, -48], [180, 8]]
    };

    return presets[normalized] || null;
}

async function geocodeQuery(query) {
    const params = new URLSearchParams({
        access_token: mapboxToken,
        language: 'pt',
        limit: '1',
        autocomplete: 'false'
    });
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error('A busca do Mapbox não respondeu como esperado.');
    }

    const data = await response.json();
    return Array.isArray(data.features) ? data.features[0] : null;
}

async function applyLocatorArea() {
    const scene = getActiveScene();
    const query = normalizeText(locatorQueryInput.value);

    if (scene.locator.mode === 'none') {
        scene.locator.mode = 'three';
        locatorModeInput.value = 'three';
    }

    if (!query) {
        setStatus('Digite uma área para o localizador.');
        return;
    }

    scene.locator.query = query;
    setStatus('Buscando área do localizador...');

    try {
        const presetBounds = getPresetBounds(query);

        if (presetBounds) {
            scene.locatorMaps[0].map.fitBounds(presetBounds, {padding: 1, duration: 0});
        } else {
            const feature = await geocodeQuery(query);

            if (!feature) {
                setStatus('Nenhuma área encontrada para o localizador.');
                return;
            }

            if (Array.isArray(feature.bbox) && feature.bbox.length === 4) {
                scene.locatorMaps[0].map.fitBounds(
                    [
                        [feature.bbox[0], feature.bbox[1]],
                        [feature.bbox[2], feature.bbox[3]]
                    ],
                    {padding: 1, duration: 0}
                );
            } else if (Array.isArray(feature.center)) {
                scene.locatorMaps[0].map.easeTo({
                    center: feature.center,
                    zoom: 3.2,
                    duration: 0
                });
            }
        }

        applyLocatorFocus(scene);
        updateSceneLocator(scene);
        setStatus(`Localizador aplicado na cena ${scene.index + 1}.`);
    } catch (error) {
        setStatus(error.message || 'Não foi possível aplicar o localizador.');
    }
}

function updateSceneAnnotation(scene) {
    scene.annotationEl.replaceChildren();

    const sceneMarker = getSceneMarker(scene);

    if (sceneMarker && scene.markerStyle !== 'none') {
        const point = scene.map.project([sceneMarker.lng, sceneMarker.lat]);
        const marker = document.createElement('div');
        const halo = document.createElement('span');
        const dot = document.createElement('span');

        marker.className = `map-marker map-marker--${scene.markerStyle}`;
        marker.style.left = `${point.x}px`;
        marker.style.top = `${point.y}px`;
        marker.classList.toggle('map-marker--label-left', point.x > outputWidth - 230);
        halo.className = 'map-marker__halo';
        dot.className = 'map-marker__dot';
        marker.append(halo, dot);

        if (normalizeText(scene.markerLabel)) {
            const label = document.createElement('span');
            label.className = 'map-marker__label';
            label.textContent = scene.markerLabel;
            marker.append(label);
        }

        scene.annotationEl.append(marker);
    }

    scene.editorialLabels.forEach(editorialLabel => {
        const point = scene.map.project([editorialLabel.lng, editorialLabel.lat]);
        const label = document.createElement('div');
        const symbol = createEditorialSymbol(editorialLabel);

        label.className = 'editorial-label';
        label.classList.toggle('is-selected', editorialLabel.id === selectedAnnotationId);
        label.style.left = `${point.x}px`;
        label.style.top = `${point.y}px`;
        label.classList.toggle(
            'editorial-label--left',
            editorialLabel.textPosition === 'left' || point.x + editorialLabel.offsetX > outputWidth - 220
        );
        label.addEventListener('pointerdown', event => {
            event.stopPropagation();
            selectedAnnotationId = editorialLabel.id;
            renderAnnotationPanel();
            updateSceneAnnotation(scene);
        });
        symbol.addEventListener('pointerdown', event => startEditorialSymbolDrag(event, scene, editorialLabel));
        label.append(symbol);

        if (normalizeText(editorialLabel.text)) {
            const text = document.createElement('span');
            text.className = 'editorial-label__text';
            text.textContent = editorialLabel.text;
            text.style.left = `${editorialLabel.offsetX}px`;
            text.style.top = `${editorialLabel.offsetY}px`;
            text.style.textAlign = getTextAlignForPosition(editorialLabel.textPosition);
            text.addEventListener('pointerdown', event => startEditorialTextDrag(event, scene, editorialLabel));
            label.append(text);
        }

        scene.annotationEl.append(label);
    });
}

function waitForMapIdle(scene) {
    const maps = [scene.map, ...scene.locatorMaps.map(locatorMap => locatorMap.map)];
    const waits = maps.map(map => {
        if (map.loaded()) {
            return Promise.resolve();
        }

        return new Promise(resolve => map.once('idle', resolve));
    });

    return Promise.all(waits);
}

function getFileSlug() {
    const rawTitle = normalizeText(titleInput.value) || 'mapa';
    return rawTitle
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 54) || 'mapa';
}

function wrapText(ctx, text, maxWidth) {
    const paragraphs = String(text || '').split(/\n+/);
    const lines = [];

    paragraphs.forEach(paragraph => {
        const words = paragraph.trim().split(/\s+/).filter(Boolean);

        if (!words.length) {
            lines.push('');
            return;
        }

        let currentLine = '';

        words.forEach(word => {
            const candidate = currentLine ? `${currentLine} ${word}` : word;

            if (ctx.measureText(candidate).width <= maxWidth) {
                currentLine = candidate;
                return;
            }

            if (currentLine) {
                lines.push(currentLine);
            }

            currentLine = word;
        });

        if (currentLine) {
            lines.push(currentLine);
        }
    });

    return lines;
}

function measureBlock(ctx, text, font, lineHeight, maxWidth) {
    ctx.font = font;
    return {
        lines: wrapText(ctx, text, maxWidth),
        lineHeight
    };
}

function drawTextBlock(ctx, block, x, y) {
    block.lines.forEach((line, index) => {
        ctx.fillText(line, x, y + (index * block.lineHeight));
    });

    return y + (block.lines.length * block.lineHeight);
}

function drawMarker(ctx, scene, offsetY) {
    const sceneMarker = getSceneMarker(scene);

    if (!sceneMarker || scene.markerStyle === 'none') {
        return;
    }

    const point = scene.map.project([sceneMarker.lng, sceneMarker.lat]);
    const x = point.x;
    const y = offsetY + point.y;

    ctx.save();
    ctx.strokeStyle = red;
    ctx.fillStyle = red;
    ctx.lineWidth = 4;

    if (scene.markerStyle === 'box') {
        ctx.strokeRect(x - 84, y - 64, 168, 128);
    }

    if (scene.markerStyle === 'loupe') {
        ctx.beginPath();
        ctx.arc(x, y, 46, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 32, y + 32);
        ctx.lineTo(x + 64, y + 64);
        ctx.stroke();
    }

    if (scene.markerStyle === 'halo') {
        ctx.fillStyle = 'rgba(200, 23, 18, 0.16)';
        ctx.beginPath();
        ctx.arc(x, y, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(200, 23, 18, 0.24)';
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
    }

    if (scene.markerStyle === 'pin') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.lineWidth = 4;
    }

    ctx.fillStyle = red;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();

    if (normalizeText(scene.markerLabel)) {
        const labelLines = measureBlock(ctx, scene.markerLabel, labelFont, 25, 250).lines;
        const labelLeft = x > outputWidth - 230;
        const labelX = labelLeft ? x - 20 : x + 20;

        ctx.font = labelFont;
        ctx.textBaseline = 'top';
        ctx.textAlign = labelLeft ? 'right' : 'left';
        labelLines.forEach((line, index) => {
            const lineY = y - 8 + (index * 25);
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#ffffff';
            ctx.strokeText(line, labelX, lineY);
            ctx.fillStyle = red;
            ctx.fillText(line, labelX, lineY);
        });
    }

    ctx.restore();
}

function loadImage(src) {
    if (!src) {
        return Promise.resolve(null);
    }

    if (imageCache.has(src)) {
        return imageCache.get(src).promise;
    }

    const entry = {image: null, promise: null};
    entry.promise = new Promise(resolve => {
        const image = new Image();
        image.onload = () => {
            entry.image = image;
            resolve(image);
        };
        image.onerror = () => resolve(null);
        image.src = src;
    });

    imageCache.set(src, entry);
    return entry.promise;
}

function drawEditorialSymbol(ctx, editorialLabel, x, y) {
    if (editorialLabel.symbol === 'none') {
        return;
    }

    ctx.save();

    if (editorialLabel.symbol === 'square') {
        ctx.fillStyle = red;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.fillRect(x - 7, y - 7, 14, 14);
        ctx.strokeRect(x - 7, y - 7, 14, 14);
    } else if (editorialLabel.symbol === 'triangle') {
        ctx.fillStyle = red;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y - 9);
        ctx.lineTo(x + 10, y + 8);
        ctx.lineTo(x - 10, y + 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    } else if (editorialLabel.symbol === 'image' && editorialLabel.imageData) {
        const cached = imageCache.get(editorialLabel.imageData);
        const image = cached?.image;

        if (image) {
            ctx.drawImage(image, x - 12, y - 12, 24, 24);
        } else {
            drawEditorialSymbol(ctx, {...editorialLabel, symbol: 'dot'}, x, y);
        }
    } else {
        ctx.fillStyle = red;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    ctx.restore();
}

function drawEditorialLabels(ctx, scene, offsetY) {
    scene.editorialLabels.forEach(editorialLabel => {
        const point = scene.map.project([editorialLabel.lng, editorialLabel.lat]);
        const x = point.x;
        const y = offsetY + point.y;
        const labelLeft = editorialLabel.textPosition === 'left' || x + editorialLabel.offsetX > outputWidth - 220;
        const labelX = x + editorialLabel.offsetX;
        const labelY = y + editorialLabel.offsetY;
        const labelLines = measureBlock(ctx, editorialLabel.text, editorialLabelFont, 23, 260).lines;

        ctx.save();
        if (editorialLabel.symbol === 'image' && editorialLabel.imageData) {
            const cached = imageCache.get(editorialLabel.imageData);
            const image = cached?.image;

            if (image) {
                ctx.drawImage(image, x - 12, y - 12, 24, 24);
            } else {
                drawEditorialSymbol(ctx, {...editorialLabel, symbol: 'dot'}, x, y);
            }
        } else {
            drawEditorialSymbol(ctx, editorialLabel, x, y);
        }

        if (normalizeText(editorialLabel.text)) {
            ctx.font = editorialLabelFont;
            ctx.textBaseline = 'top';
            ctx.textAlign = getTextAlignForPosition(editorialLabel.textPosition) || (labelLeft ? 'right' : 'left');
            labelLines.forEach((line, index) => {
                const lineY = labelY + (index * 23);
                ctx.lineWidth = 4;
                ctx.strokeStyle = '#ffffff';
                ctx.strokeText(line, labelX, lineY);
                ctx.fillStyle = '#2f3033';
                ctx.fillText(line, labelX, lineY);
            });
        }
        ctx.restore();
    });
}

function drawLocator(ctx, scene, offsetY) {
    if (scene.locator.mode === 'none') {
        return;
    }

    const count = scene.locator.mode === 'three' ? 3 : scene.locator.mode === 'two' ? 2 : 1;
    const size = getLocatorSize(scene);
    const x = scene.locator.x;
    const y = offsetY + scene.locator.y;
    const focus = getSceneMarker(scene) || scene.locator.focus || scene.map.getCenter();

    ctx.save();
    ctx.fillStyle = 'rgba(65, 65, 65, 0.48)';
    ctx.fillRect(x + 3, y + 5, size.width, size.height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.fillRect(x, y, size.width, size.height);

    for (let index = 0; index < count; index += 1) {
        const locatorMap = scene.locatorMaps[index];
        const mapX = x + 4 + (index * 56);
        const mapY = y + 4;
        const point = locatorMap.map.project([focus.lng, focus.lat]);
        const focusX = mapX + Math.max(5, Math.min(45, point.x));
        const focusY = mapY + Math.max(5, Math.min(45, point.y));

        ctx.drawImage(locatorMap.map.getCanvas(), mapX, mapY, 50, 50);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 1;
        ctx.strokeRect(mapX + 0.5, mapY + 0.5, 49, 49);
        ctx.strokeStyle = red;
        ctx.lineWidth = 2;
        ctx.strokeRect(focusX - 8, focusY - 8, 16, 16);
    }

    ctx.restore();
}

async function exportJpg() {
    setStatus('Preparando JPG...');
    downloadButton.disabled = true;

    try {
        await document.fonts.ready;
        const visibleScenes = getVisibleScenes();
        await Promise.all(visibleScenes.map(waitForMapIdle));
        await Promise.all(
            visibleScenes
                .flatMap(scene => scene.editorialLabels)
                .filter(editorialLabel => editorialLabel.symbol === 'image' && editorialLabel.imageData)
                .map(editorialLabel => loadImage(editorialLabel.imageData))
        );

        const measuringCanvas = document.createElement('canvas');
        const measuringCtx = measuringCanvas.getContext('2d');
        const textWidth = outputWidth - (textPaddingX * 2);
        const titleText = titleInput.value;
        const deckText = deckInput.value;
        const sourceText = sourceInput.value;
        const titleBlock = measureBlock(measuringCtx, titleText, titleFont, 44, textWidth);
        const deckBlock = measureBlock(measuringCtx, deckText, deckFont, 37, textWidth);
        const sourceBlock = measureBlock(measuringCtx, sourceText, sourceFont, 25, textWidth);
        const hasTitle = normalizeText(titleText).length > 0;
        const hasDeck = normalizeText(deckText).length > 0;
        const hasSource = normalizeText(sourceText).length > 0;
        const topPadding = hasTitle || hasDeck ? 24 : 0;
        const gapTitleDeck = hasTitle && hasDeck ? 12 : 0;
        const gapBeforeMap = hasTitle || hasDeck ? 18 : 0;
        const sourceTop = hasSource ? 14 : 0;
        const bottomPadding = hasSource ? 22 : 0;
        const titleHeight = hasTitle ? titleBlock.lines.length * titleBlock.lineHeight : 0;
        const deckHeight = hasDeck ? deckBlock.lines.length * deckBlock.lineHeight : 0;
        const sourceHeight = hasSource ? sourceBlock.lines.length * sourceBlock.lineHeight : 0;
        const dividersHeight = Math.max(0, visibleScenes.length - 1) * 4;
        const mapsHeight = visibleScenes.reduce((sum, scene) => sum + scene.height, 0) + dividersHeight;
        const outputHeight = topPadding + titleHeight + gapTitleDeck + deckHeight + gapBeforeMap + mapsHeight + sourceTop + sourceHeight + bottomPadding;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = outputWidth;
        canvas.height = outputHeight;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outputWidth, outputHeight);
        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';

        let y = topPadding;

        if (hasTitle) {
            ctx.font = titleFont;
            y = drawTextBlock(ctx, titleBlock, textPaddingX, y);
        }

        if (hasTitle && hasDeck) {
            y += gapTitleDeck;
        }

        if (hasDeck) {
            ctx.font = deckFont;
            y = drawTextBlock(ctx, deckBlock, textPaddingX, y);
        }

        if (hasTitle || hasDeck) {
            y += gapBeforeMap;
        }

        visibleScenes.forEach((scene, index) => {
            if (index > 0) {
                ctx.fillStyle = red;
                ctx.fillRect(0, y, outputWidth, 4);
                y += 4;
            }

            const mapCanvas = scene.map.getCanvas();
            ctx.drawImage(mapCanvas, 0, y, outputWidth, scene.height);

            drawMarker(ctx, scene, y);
            drawShapes(ctx, scene, y);
            drawDrawings(ctx, scene, y);
            drawEditorialLabels(ctx, scene, y);
            drawLocator(ctx, scene, y);
            y += scene.height;
        });

        if (hasSource) {
            y += sourceTop;
            ctx.font = sourceFont;
            ctx.fillStyle = '#000000';
            drawTextBlock(ctx, sourceBlock, textPaddingX, y);
        }

        const link = document.createElement('a');
        link.download = `${getFileSlug()}-650px.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.click();

        setStatus(`JPG exportado com ${visibleScenes.length} cena(s) e 650px de largura.`);
    } catch (error) {
        setStatus(error.message || 'Não foi possível exportar o JPG.');
    } finally {
        downloadButton.disabled = false;
    }
}

for (let index = 0; index < maxScenes; index += 1) {
    scenes.push(createScene(index));
}

window.editorScenes = scenes;

[titleInput, deckInput, sourceInput].forEach(input => {
    input.addEventListener('input', setPreviewText);
});

sceneCountInput.addEventListener('change', refreshSceneVisibility);
activeSceneInput.addEventListener('change', event => setActiveScene(Number.parseInt(event.target.value, 10) || 0));
mapHeightInput.addEventListener('input', event => setSceneHeight(event.target.value));
heightPresetButtons.forEach(button => {
    button.addEventListener('click', () => setSceneHeight(button.dataset.height));
});
searchButton.addEventListener('click', searchPlace);
coordinateButton.addEventListener('click', goToCoordinateFields);
zoomOutButton.addEventListener('click', () => changeZoom(-1));
zoomInButton.addEventListener('click', () => changeZoom(1));
markerSourceInput.addEventListener('change', event => {
    const scene = getActiveScene();
    scene.markerSource = scene.index === 0 ? 'search' : event.target.value;
    syncControlsFromScene();
    updateSceneAnnotation(scene);
    updateSceneLocator(scene);
});
markerCenterButton.addEventListener('click', () => setCustomMarkerForActiveScene(getActiveScene().map.getCenter()));
markerClearButton.addEventListener('click', clearMarkerForActiveScene);
markerStyleInput.addEventListener('change', event => {
    getActiveScene().markerStyle = event.target.value;
    updateSceneAnnotation(getActiveScene());
});
markerLabelInput.addEventListener('input', event => {
    getActiveScene().markerLabel = event.target.value;
    updateSceneAnnotation(getActiveScene());
});
mapLabelsInput.addEventListener('change', event => {
    const scene = getActiveScene();
    scene.showMapLabels = event.target.value === 'show';
    applyMapLabelVisibility(scene);
    setStatus(scene.showMapLabels
        ? `Nomes gerais ativados na cena ${scene.index + 1}.`
        : `Nomes gerais ocultados na cena ${scene.index + 1}.`);
});
sceneDrawingsInput.addEventListener('change', event => {
    const scene = getActiveScene();
    scene.showDrawings = event.target.value === 'show';
    redrawDrawings(scene);
    setStatus(scene.showDrawings
        ? `Linhas exibidas na cena ${scene.index + 1}.`
        : `Linhas ocultadas na cena ${scene.index + 1}.`);
});
labelAddButton.addEventListener('click', () => {
    if (labelPlacementSceneIndex === activeSceneIndex) {
        setLabelPlacementMode(null);
        setStatus('Inserção de rótulo manual cancelada.');
        return;
    }

    if (!normalizeText(editorialLabelInput.value) && editorialSymbolInput.value === 'none') {
        setStatus('O item precisa ter texto ou símbolo.');
        return;
    }

    if (editorialSymbolInput.value === 'image' && !editorialImageData) {
        setStatus('Faça upload de um PNG antes de inserir esse símbolo.');
        return;
    }

    setLabelPlacementMode(activeSceneIndex);
    setStatus(`Clique no mapa da cena ${activeSceneIndex + 1} para inserir o elemento manual.`);
});
labelClearButton.addEventListener('click', clearEditorialLabelsForActiveScene);
annotationDeleteButton.addEventListener('click', () => {
    const scene = getActiveScene();

    scene.editorialLabels = scene.editorialLabels.filter(annotation => annotation.id !== selectedAnnotationId);
    selectedAnnotationId = scene.editorialLabels[0]?.id || null;
    updateSceneAnnotation(scene);
    renderAnnotationPanel();
    setStatus(`Item removido da cena ${scene.index + 1}.`);
});
selectedLabelTextInput.addEventListener('input', event => {
    syncSelectedAnnotation(annotation => {
        annotation.text = event.target.value;
    });
});
selectedSymbolInput.addEventListener('change', event => {
    syncSelectedAnnotation(annotation => {
        annotation.symbol = event.target.value;
        if (annotation.symbol === 'image' && editorialImageData) {
            annotation.imageData = editorialImageData;
            loadImage(editorialImageData);
        }
    });
});
selectedLabelPositionInput.addEventListener('change', event => {
    syncSelectedAnnotation(annotation => {
        annotation.textPosition = event.target.value;

        if (annotation.textPosition !== 'custom') {
            const offset = getDefaultLabelOffset(annotation.textPosition);
            annotation.offsetX = offset.x;
            annotation.offsetY = offset.y;
        }
    });
});
selectedLabelLatInput.addEventListener('change', event => {
    syncSelectedAnnotation(annotation => {
        const value = Number.parseFloat(String(event.target.value).replace(',', '.'));
        if (isValidLatitude(value)) {
            annotation.lat = value;
        }
    });
});
selectedLabelLngInput.addEventListener('change', event => {
    syncSelectedAnnotation(annotation => {
        const value = Number.parseFloat(String(event.target.value).replace(',', '.'));
        if (isValidLongitude(value)) {
            annotation.lng = value;
        }
    });
});
editorialImageInput.addEventListener('change', event => {
    const file = event.target.files?.[0];

    if (!file) {
        editorialImageData = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        editorialImageData = String(reader.result || '');
        loadImage(editorialImageData);
        const selected = getSelectedAnnotation();

        if (selected?.symbol === 'image') {
            selected.imageData = editorialImageData;
            updateSceneAnnotation(getActiveScene());
            renderAnnotationPanel();
        }

        setStatus('PNG carregado para o símbolo manual.');
    };
    reader.onerror = () => setStatus('Não foi possível carregar a imagem.');
    reader.readAsDataURL(file);
});
locatorModeInput.addEventListener('change', event => {
    const scene = getActiveScene();
    scene.locator.mode = event.target.value;
    updateSceneLocator(scene);
});
locatorQueryInput.addEventListener('input', event => {
    getActiveScene().locator.query = event.target.value;
});
locatorSearchButton.addEventListener('click', applyLocatorArea);
locatorFocusButton.addEventListener('click', () => {
    applyLocatorFocus(getActiveScene());
    setStatus(`Foco do localizador atualizado na cena ${getActiveScene().index + 1}.`);
});
drawingStartButton.addEventListener('click', () => {
    const scene = getActiveScene();
    if (!scene) return;
    if (drawingSceneIndex === scene.index) {
        finalizeDrawing(scene);
        return;
    }
    if (drawingSceneIndex !== null) {
        const prev = scenes[drawingSceneIndex];
        if (prev) { prev.activeDrawing = null; redrawDrawings(prev); }
        setDrawingMode(null);
    }
    scene.activeDrawing = {
        id: drawingIdCounter++,
        points: [],
        color: drawingColorInput.value,
        width: Math.max(1, Math.min(100, Number(drawingWidthInput.value) || 3)),
        dashed: drawingStyleInput.value === 'dashed',
        arrow: drawingArrowInput.value
    };
    setDrawingMode(scene.index);
    setStatus('Clique no mapa para adicionar pontos. Duplo clique ou "Fechar linha" para finalizar.');
});

drawingClearButton.addEventListener('click', () => {
    drawings = [];
    scenes.forEach(s => { s.activeDrawing = null; redrawDrawings(s); });
    if (drawingSceneIndex !== null) setDrawingMode(null);
    renderDrawingList();
});

sceneShapesInput.addEventListener('change', event => {
    const scene = getActiveScene();
    scene.showShapes = event.target.value === 'show';
    redrawDrawings(scene);
    setStatus(scene.showShapes ? `Formas exibidas na cena ${scene.index + 1}.` : `Formas ocultadas na cena ${scene.index + 1}.`);
});
shapeStartButton.addEventListener('click', () => {
    const scene = getActiveScene();
    if (!scene) return;
    if (shapeMode === scene.index) {
        setShapeMode(null);
        setStatus('Inserção de forma cancelada.');
        return;
    }
    setShapeMode(scene.index);
    setStatus('Clique no mapa para definir o centro da forma.');
});
shapeClearButton.addEventListener('click', () => {
    shapes = [];
    scenes.forEach(s => { s.previewShape = null; redrawDrawings(s); });
    if (shapeMode !== null) setShapeMode(null);
    renderShapeList();
});
downloadButton.addEventListener('click', exportJpg);

searchInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
        event.preventDefault();
        searchPlace();
    }
});

setPreviewText();
refreshSceneVisibility();
setActiveScene(0);
