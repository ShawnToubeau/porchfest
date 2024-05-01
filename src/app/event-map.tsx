"use client";

import { useEffect, useRef, useState } from "react";
import type { Selection } from "react-aria-components";

import { Map, MapStyle, Marker, Popup } from "@maptiler/sdk";

import "@maptiler/sdk/dist/maptiler-sdk.css";
import { PopupContent } from "./popup-content";
import { createRoot } from "react-dom/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MixerIcon from "../../public/icons/mixer";
import { Filter } from "./filter";

type LocationData = {
  lat: number;
  long: number;
  address: string;
  google_maps_link: string;
};

export type MarkerData = {
  artist_name: string;
  start_time: number;
  end_time: number;
  genres: string[];
  location: LocationData;
};

interface EventMapProps {
  markerData: MarkerData[];
}

export default function EventMap(props: EventMapProps) {
  const map = useRef<Map | null>(null);
  const [onlyCurrentlyPlaying, setOnlyCurrentlyPlaying] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [filteredGenres, setFilteredGenres] = useState<Set<string>>(new Set([]));
  const [showSheet, setShowSheet] = useState(false);

  useEffect(() => {
    if (map.current !== null) {
      return;
    }

    console.log("EVENT: map created");
    const mtLayer = new Map({
      container: document.getElementById("map") as HTMLElement,
      apiKey: process.env.NEXT_PUBLIC_MAPTILER_API_KEY,
      navigationControl: false,
      geolocate: true,
      geolocateControl: "bottom-right",
      zoom: 13,
      center: {
        lng: -71.10766319928621,
        lat: 42.392251196294296
      },
      style: MapStyle.BRIGHT,
    });

    map.current = mtLayer;
  }, []);

  useEffect(() => {
    const m = map.current;

    if (!m) {
      return;
    }

    let filteredMarkers = props.markerData;
    if (onlyCurrentlyPlaying) {
      filteredMarkers = filteredMarkers.filter(
        (m) =>
          onlyCurrentlyPlaying &&
          m.start_time <= 1715457600001 &&
          1715457600001 <= m.end_time
      );
    }

    const fg = filteredGenres as Set<string>;
    if (fg.size > 0) {
      filteredMarkers = filteredMarkers.filter((m) =>
        m.genres.some((v) => fg.has(v))
      );
    }

    if (searchFilter.length > 0) {
      filteredMarkers = filteredMarkers.filter((m) =>
        m.artist_name.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }

    console.log("EVENT: added markers");
    const markers = filteredMarkers.map((d) => {
      const marker = new Marker({})
        .setLngLat([d.location.long, d.location.lat])
        .addTo(m);

      marker.getElement().addEventListener("click", () => {
        const popupContainer = document.createElement("div");
        var popup = new Popup({
          offset: 25,
          maxWidth: "none",
          closeButton: false,
        }).setDOMContent(popupContainer);

        createRoot(popupContainer).render(
          <PopupContent markerData={d} onClose={() => marker.togglePopup()} />
        );

        marker.setPopup(popup);
      });

      return marker;
    });

    return () => {
      console.log("EVENT: removed markers");
      markers.forEach((m) => {
        m.remove();
      });
    };
  }, [props.markerData, onlyCurrentlyPlaying, searchFilter, filteredGenres]);

  return (
    <div className="h-full w-full absolute" id="map">
      <div className="relative top-10 z-10 flex justify-center">
        <Button
          variant="outline"
          className="rounded-r-none"
          onClick={() => setShowSheet((s) => !s)}
        >
          <MixerIcon />
        </Button>
        <Input
          className="w-[300px] rounded-l-none"
          placeholder="Search an artist"
          value={searchFilter}
          onChange={({ target }) => setSearchFilter(target.value)}
        />
      </div>
      <Filter 
        open={showSheet}
        onClose={() => setShowSheet(false)}
        filteredGenres={filteredGenres}
        setFilteredGenres={setFilteredGenres}
        markerData={props.markerData}
        onlyCurrentlyPlaying={onlyCurrentlyPlaying}
        setOnlyCurrentlyPlaying={setOnlyCurrentlyPlaying}
      />
    </div>
  );
}
