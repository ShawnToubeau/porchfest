"use client";

import { useEffect, useRef, useState } from "react";

import { Map, MapStyle, Marker } from "@maptiler/sdk";

import "@maptiler/sdk/dist/maptiler-sdk.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MixerIcon from "../../public/icons/mixer";
import { Filter } from "./filter";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

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

/**
 * TODO:
 * prevent zooming - esp for iphone
 * location not working on iphone
 * populate search results - fuzzy matching?
 *  selecting an item should take you to the location
 */

interface EventMapProps {
  markerData: MarkerData[];
}

export default function EventMap(props: EventMapProps) {
  const map = useRef<Map | null>(null);
  const [onlyCurrentlyPlaying, setOnlyCurrentlyPlaying] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [filteredGenres, setFilteredGenres] = useState<Set<string>>(
    new Set([])
  );
  const [showSheet, setShowSheet] = useState(false);
  const [currMarker, setCurrMarker] = useState<MarkerData | null>(null);

  useEffect(() => {
    document.addEventListener("gesturestart", function (e) {
      e.preventDefault();
        document.body.style.zoom = "0.99";
    });
    
    document.addEventListener("gesturechange", function (e) {
      e.preventDefault();
    
      document.body.style.zoom = "0.99";
    });
    document.addEventListener("gestureend", function (e) {
        e.preventDefault();
        document.body.style.zoom = "1";
    });
  })

  useEffect(() => {
    if (currMarker) {
      setTimeout(() => {
        const overlays = Array.from(
          document.getElementsByClassName("drawer-overlay")
        );

        overlays.map((o) => {
          console.log("EVENT: add click listener for drawer overlay");
          o.addEventListener("click", () => setCurrMarker(null));
        });
      }, 20);
    }
  }, [currMarker]);

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
        lat: 42.392251196294296,
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
        setCurrMarker(d);
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
    <div className="h-dvh w-full absolute" id="map">
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

      <Drawer open={!!currMarker} onClose={() => setCurrMarker(null)}>
        <DrawerContent onClick={() => console.log("close")}>
          {currMarker && (
            <>
              <DrawerHeader>
                <DrawerTitle>{currMarker.artist_name}</DrawerTitle>
                <DrawerDescription>
                  <div className="mr-2 inline-block">Genres:</div>
                  {currMarker.genres.sort().map((g) => (
                    <Badge key={g} className="mr-1 mb-2">
                      {g}
                    </Badge>
                  ))}
                </DrawerDescription>
              </DrawerHeader>
              <div className="grid w-full items-center gap-4 px-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="name" className="text-lg">
                    Time
                  </Label>
                  <div className="flex gap-1">
                    {formatTime(currMarker.start_time)}-
                    {formatTime(currMarker.end_time)}
                  </div>
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="name" className="text-lg">
                    Address
                  </Label>
                  <div>{currMarker.location.address}</div>
                </div>
              </div>

              <DrawerFooter className="flex flex-row justify-between">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setCurrMarker(null)}
                >
                  Close
                </Button>
                <Button className="w-full">About</Button>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

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

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
