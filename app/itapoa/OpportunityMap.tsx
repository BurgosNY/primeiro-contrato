"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";

type MapOpportunity = {
  id: string;
  service: string;
  activity: string;
  location: string;
  match: number;
};

type OpportunityMapProps = {
  opportunities: MapOpportunity[];
  selectedId: string;
  companyName: string;
  companyInitials: string;
  radiusKm: number;
  onSelect: (id: string) => void;
};

const LOCATIONS: Record<string, [number, number]> = {
  "Itapema do Norte · Itapoá": [-26.0708, -48.6167],
  "Paese · Itapoá": [-26.096, -48.6238],
  "Centro · Itapoá": [-26.1162, -48.6147],
  "Samambaial · Itapoá": [-26.1431, -48.6112],
};

const COMPANY_LOCATION: [number, number] = [-26.1162, -48.6147];

export function OpportunityMap({ opportunities, selectedId, companyName, companyInitials, radiusKm, onSelect }: OpportunityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  const selectedIdRef = useRef(selectedId);
  const [mapFailed, setMapFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;

    const markerStore = markersRef.current;
    void import("leaflet").then((L) => {
      if (disposed || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
        preferCanvas: true,
      });
      mapRef.current = map;
      L.control.zoom({ position: "bottomleft" }).addTo(map);

      const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      });
      tiles.on("tileerror", () => setMapFailed(true));
      tiles.on("load", () => setMapFailed(false));
      tiles.addTo(map);

      const companyIcon = L.divIcon({
        className: "map-marker-shell",
        html: `<span class="map-marker company-marker" aria-hidden="true">${companyInitials.replace(/[^A-Z0-9]/g, "").slice(0, 2)}</span>`,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });
      const companyTooltip = document.createElement("span");
      companyTooltip.textContent = `${companyName} · base operacional`;
      L.marker(COMPANY_LOCATION, { icon: companyIcon, title: companyName })
        .addTo(map)
        .bindTooltip(companyTooltip, { direction: "top", offset: [0, -15] });
      L.circle(COMPANY_LOCATION, {
        radius: radiusKm * 1_000,
        color: "#0f6b57",
        weight: 1,
        opacity: 0.38,
        fillColor: "#dff2e9",
        fillOpacity: 0.1,
        interactive: false,
      }).addTo(map);

      const bounds = L.latLngBounds([COMPANY_LOCATION]);
      opportunities.forEach((opportunity, index) => {
        const base = LOCATIONS[opportunity.location];
        if (!base) return;
        const angle = index * 1.83;
        const point: [number, number] = [base[0] + Math.sin(angle) * 0.0022, base[1] + Math.cos(angle) * 0.0022];
        bounds.extend(point);

        const icon = L.divIcon({
          className: "map-marker-shell",
          html: `<span class="map-marker opportunity-marker${opportunity.id === selectedIdRef.current ? " selected" : ""}" aria-hidden="true"><span>${opportunity.match}%</span></span>`,
          iconSize: [46, 46],
          iconAnchor: [23, 23],
        });
        const marker = L.marker(point, { icon, title: opportunity.service }).addTo(map);
        marker.on("click", () => onSelectRef.current(opportunity.id));
        const tooltip = document.createElement("span");
        const activity = document.createElement("strong");
        activity.textContent = opportunity.activity;
        tooltip.append(activity, document.createElement("br"), opportunity.service);
        marker.bindTooltip(tooltip, {
          direction: "top",
          offset: [0, -17],
        });
        markerStore.set(opportunity.id, marker);
      });

      map.fitBounds(bounds.pad(0.12), { padding: [34, 34], animate: false, maxZoom: 13 });
    }).catch(() => setMapFailed(true));

    return () => {
      disposed = true;
      markerStore.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [companyInitials, companyName, opportunities, radiusKm, retryKey]);

  useEffect(() => {
    const marker = markersRef.current.get(selectedId);
    const map = mapRef.current;
    if (!marker || !map) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) map.setView(marker.getLatLng(), Math.max(map.getZoom(), 14), { animate: false });
    else map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 14), { duration: 0.28, easeLinearity: 0.24 });

    markersRef.current.forEach((item, id) => {
      const element = item.getElement()?.querySelector(".opportunity-marker");
      element?.classList.toggle("selected", id === selectedId);
    });
  }, [selectedId]);

  return (
    <section className="map-panel" aria-label="Mapa das oportunidades">
      <div className="map-canvas" ref={containerRef} />
      <div className="map-caption"><span>Área aproximada</span><p>Os pins usam o centro do bairro informado no edital.</p></div>
      {mapFailed ? (
        <div className="map-fallback" role="status">
          <strong>Mapa indisponível</strong>
          <p>A seleção e os detalhes continuam funcionando.</p>
          <button type="button" onClick={() => { setMapFailed(false); setRetryKey((value) => value + 1); }}>Tentar novamente</button>
        </div>
      ) : null}
    </section>
  );
}
