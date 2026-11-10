<script setup lang="ts">
import { Map, NavigationControl, Marker, setWorkerUrl } from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import type { Place } from "~/composables/useTripPlaces";

import "maplibre-gl/dist/maplibre-gl.css";

setWorkerUrl(maplibreWorkerUrl);

const maxGlobeDiameter = "90vh";

const props = defineProps<{
  places: Place[];
  focusedPlaceId?: string | null;
  preview?: [number, number] | null;
}>();

const emit = defineEmits<{
  "focus-place": [id: string];
}>();

const container = ref<HTMLDivElement | null>(null);
const attributionHost = ref<HTMLDivElement | null>(null);
//const shadowVisible = ref(true);

let map: Map | null = null;
let resizeObserver: ResizeObserver | null = null;
const markers: Marker[] = [];
let previewMarker: Marker | null = null;

function createMap(element: HTMLDivElement) {
  if (map) {
    return;
  }

  resizeObserver = new ResizeObserver(() => {
    map?.resize();
    //  syncShadow();
  });
  resizeObserver.observe(element);

  map = new Map({
    container: element,
    style: "https://tiles.openfreemap.org/styles/liberty",
    center: [-60, -10],
    zoom: 2,
    attributionControl: {
      compact: false,
    },
  });

  mountAttribution();

  map.addControl(
    new NavigationControl({
      visualizePitch: true,
    }),
    "bottom-right",
  );

  map.on("style.load", () => {
    map?.setProjection({ type: "globe" });
    map?.setLayerZoomRange("label_city", 1, 24);
    map?.setLayerZoomRange("label_city_capital", 1, 24);
    map?.setLayoutProperty("label_city", "icon-optional", true);
    map?.setLayoutProperty("label_city_capital", "icon-optional", true);
    renderPlaceMarkers();
    syncPreview();
    focusPlace(props.focusedPlaceId);
    // syncShadow();
  });
  //syncShadow();
}
/*
function syncShadow() {
  const box = container.value?.clientWidth ?? 0;
  const max = window.innerHeight * 0.9;
  shadowVisible.value = box > 0 && box >= max - 1;
}
*/
function renderPlaceMarkers() {
  if (!map) {
    return;
  }

  for (const marker of markers) {
    marker.remove();
  }
  markers.length = 0;

  for (const [index, place] of props.places.entries()) {
    if (!place.coordinates) {
      continue;
    }
    const pin = document.createElement("button");
    pin.type = "button";
    const isFocused = place.id === props.focusedPlaceId;
    pin.className = [
      "flex cursor-pointer items-center justify-center rounded-full border-0 p-0 font-semibold leading-none text-slate-950",
      index === undefined ? "size-3" : "size-6 text-[11px]",
      isFocused
        ? "bg-amber-400 ring-4 ring-amber-400/30"
        : "bg-green-400 ring-4 ring-green-400/30",
    ].join(" ");
    pin.textContent = index === undefined ? "" : String(index + 1);
    pin.setAttribute(
      "aria-label",
      index === undefined ? place.name : `${index + 1}. ${place.name}`,
    );
    pin.addEventListener("click", (event) => {
      event.stopPropagation();
      emit("focus-place", place.id);
      focusPlace(place.id);
    });

    markers.push(
      new Marker({ element: pin, anchor: "center" })
        .setLngLat(place.coordinates)
        .addTo(map),
    );
  }
}

function mountAttribution() {
  const attrib = map
    ?.getContainer()
    .querySelector<HTMLElement>(".maplibregl-ctrl-attrib");
  const host = attributionHost.value;
  if (!attrib || !host || attrib.parentElement === host) {
    return;
  }
  host.appendChild(attrib);
}

function flyTo(coordinates: [number, number], zoom: number) {
  if (!map) {
    return;
  }
  map.flyTo({
    center: coordinates,
    zoom: Math.max(map.getZoom(), zoom),
    speed: 0.8,
    curve: 1.4,
    essential: true,
  });
}

function focusPlace(id: string | null | undefined) {
  if (!id) {
    return;
  }
  const place = props.places.find((item) => item.id === id);
  if (!place?.coordinates) {
    return;
  }
  flyTo(place.coordinates, 7.5);
}

function showPreview(coordinates: [number, number]) {
  if (!map) {
    return;
  }
  if (!previewMarker) {
    const pin = document.createElement("div");
    pin.className =
      "size-4 rounded-full border-2 border-white bg-amber-300 ring-4 ring-amber-300/40";
    pin.setAttribute("aria-hidden", "true");
    previewMarker = new Marker({ element: pin, anchor: "center" });
  }
  previewMarker.setLngLat(coordinates).addTo(map);
}

function removePreview() {
  previewMarker?.remove();
}

function syncPreview() {
  if (!props.preview) {
    removePreview();
    return;
  }
  showPreview(props.preview);
}

watch(
  container,
  (element) => {
    if (element) {
      createMap(element);
    }
  },
  { flush: "post" },
);

watch(attributionHost, () => {
  mountAttribution();
});

watch(
  [() => props.places, () => props.focusedPlaceId],
  () => {
    renderPlaceMarkers();
  },
  { deep: true },
);

watch(
  () => props.focusedPlaceId,
  (id) => {
    focusPlace(id);
  },
);

watch(
  () => props.preview?.join(","),
  () => {
    syncPreview();
    if (props.preview) {
      flyTo(props.preview, 4.2);
    }
  },
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  previewMarker?.remove();
  previewMarker = null;
  map?.remove();
  map = null;
});
</script>

<template>
  <div class="pointer-events-none absolute inset-0">
    <div
      class="flex h-full min-w-0 items-center justify-center [container-type:size]"
    >
      <div
        class="pointer-events-auto relative aspect-square max-h-full min-w-0 max-w-full overflow-hidden rounded-full transition-[width,transform] duration-500 ease-out"
        :class="places.length > 0 ? 'translate-x-[20%]' : 'translate-x-0'"
        :style="{ width: `min(${maxGlobeDiameter}, 100%)` }"
      >
        <div ref="container" class="h-full w-full" />
        <!--   <div
          v-show="shadowVisible"
          class="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_48px_10px_rgba(2,6,23,0.45)]"
        /> -->
      </div>
    </div>
    <div
      ref="attributionHost"
      class="pointer-events-auto absolute bottom-2.5 left-2.5 z-10 overflow-hidden rounded-full bg-white/90 p-1 text-xs"
    />
  </div>
</template>
