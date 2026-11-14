"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import type { LatLng, Place } from "@/lib/geo";

export type MapMember = LatLng & { id: string; nickname: string; stale: boolean; me: boolean };

function ClickToPick({ onPick }: { onPick: ((p: LatLng) => void) | null }) {
  useMapEvents({
    click(e) {
      onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function Recenter({ center }: { center: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng]);
  }, [map, center.lat, center.lng]);
  return null;
}

export default function MeetupMap({
  center,
  place,
  pending,
  members,
  onPick,
}: {
  center: LatLng;
  place: Place | null;
  pending: Place | null;
  members: MapMember[];
  onPick: ((p: LatLng) => void) | null;
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={16}
      className="h-80 w-full rounded-(--radius) border-[3px] border-foreground"
      style={{ cursor: onPick ? "crosshair" : undefined }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} />
      <ClickToPick onPick={onPick} />
      {place && (
        <Circle center={[place.lat, place.lng]} radius={place.radiusM} pathOptions={{ color: "#16a34a" }}>
          <Tooltip permanent direction="center">
            모임 장소
          </Tooltip>
        </Circle>
      )}
      {pending && (
        <Circle
          center={[pending.lat, pending.lng]}
          radius={pending.radiusM}
          pathOptions={{ color: "#2563eb", dashArray: "6 6" }}
        />
      )}
      {members.map((m) => (
        <CircleMarker
          key={m.id}
          center={[m.lat, m.lng]}
          radius={9}
          pathOptions={{
            color: m.me ? "#2563eb" : "#111827",
            fillOpacity: m.stale ? 0.25 : 0.9,
            opacity: m.stale ? 0.35 : 1,
          }}
        >
          <Tooltip permanent direction="top" offset={[0, -8]} opacity={m.stale ? 0.5 : 1}>
            {m.nickname}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
