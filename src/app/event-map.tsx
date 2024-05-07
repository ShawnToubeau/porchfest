"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { LngLat, Map, MapStyle, Marker } from "@maptiler/sdk";

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
import { BookmarkFilledIcon } from "../../public/icons/bookmark-filled";
import { BookmarkIcon } from "../../public/icons/bookmark";

const VisitedMarkerLSKey = "porchfest-data";

const DefaultMarkerColor = "#3B9EFF";
const VisitedMarkerColor = "#5A6169";
const BookmarkedMarkerColor = "#f3bb01";

enum MarkerAction {
  VISIT,
  BOOKMARK,
  UN_BOOKMARK,
  CLEAR_VISITS,
  APPLY_COLORS,
}

type MarkerState = {
  bookmarked: string[];
  visited: string[];
};

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
 * location not working on iphone
 * populate search results - fuzzy matching?
 *  selecting an item should take you to the location
 */

interface EventMapProps {
  markerData: MarkerData[];
}

export default function EventMap(props: EventMapProps) {
  const mapRef = useRef<Map | null>(null);
  const [onlyCurrentlyPlaying, setOnlyCurrentlyPlaying] = useState(false);
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [filteredGenres, setFilteredGenres] = useState<Set<string>>(
    new Set([])
  );
  const [showSheet, setShowSheet] = useState(false);
  const [currMarker, setCurrMarker] = useState<
    (MarkerData & { isBookmarked: boolean; mapMarker: Marker }) | null
  >(null);
  const [markers, setMarkers] = useState<Marker[]>([]);

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
      }, 200);
    }
  }, [currMarker]);

  useEffect(() => {
    if (mapRef.current !== null) {
      return;
    }

    if (navigator.userAgent.indexOf("iPhone") > -1) {
      document
        .querySelector("[name=viewport]")
        ?.setAttribute(
          "content",
          "width=device-width, initial-scale=1, maximum-scale=1"
        );
    }

    console.log("EVENT: map created");
    const map = new Map({
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

    mapRef.current = map;
  }, []);

  const updateMarkerColor = useCallback((marker: Marker, color: string) => {
    const svg = marker._element.children[0].children[0]
      .children[1] as HTMLDivElement;
    svg.style.fill = color;
  }, []);

  const getMarkerLocalStorage = useCallback(() => {
    let markerState: MarkerState | null = null;
    const markerStateLS = localStorage.getItem(VisitedMarkerLSKey);
    if (markerStateLS !== null) {
      markerState = JSON.parse(markerStateLS) as MarkerState;
    }

    let bookmarkSet = new Set<string>(markerState?.bookmarked ?? []);
    let visitSet = new Set<string>(markerState?.visited ?? []);

    return {
      bookmarkSet,
      visitSet,
    };
  }, []);

  const updateMarkerLocalStorage = useCallback(
    (
      marker: Marker,
      updateFn: (bookmarkSet: Set<string>, visitSet: Set<string>) => void
    ) => {
      let markerState: MarkerState | null = null;
      const markerStateLS = localStorage.getItem(VisitedMarkerLSKey);
      if (markerStateLS !== null) {
        markerState = JSON.parse(markerStateLS) as MarkerState;
      }

      let bookmarkSet = new Set<string>(markerState?.bookmarked ?? []);
      let visitSet = new Set<string>(markerState?.visited ?? []);
      updateFn(bookmarkSet, visitSet);

      const newMarkerStateLS: MarkerState = {
        bookmarked: Array.from(bookmarkSet),
        visited: Array.from(visitSet),
      };

      localStorage.setItem(
        VisitedMarkerLSKey,
        JSON.stringify(newMarkerStateLS)
      );
    },
    []
  );

  const handleMarkerAction = useCallback(
    (action: MarkerAction, markers: Marker[], marker?: Marker) => {
      switch (action) {
        case MarkerAction.VISIT:
          if (
            marker &&
            !getMarkerLocalStorage().bookmarkSet.has(marker._lngLat.toString())
          ) {
            updateMarkerColor(marker, VisitedMarkerColor);
            updateMarkerLocalStorage(marker, (_, visitSet) => {
              visitSet.add(marker._lngLat.toString());
            });
          }
          break;
        case MarkerAction.BOOKMARK:
          console.log("bm", marker);
          if (marker) {
            updateMarkerColor(marker, BookmarkedMarkerColor);
            updateMarkerLocalStorage(marker, (bookmarkSet, visitSet) => {
              bookmarkSet.add(marker._lngLat.toString());
              visitSet.delete(marker._lngLat.toString());
            });
          }
          break;
        case MarkerAction.UN_BOOKMARK:
          if (marker) {
            updateMarkerColor(marker, DefaultMarkerColor);
            updateMarkerLocalStorage(marker, (bookmarkSet, _) => {
              bookmarkSet.delete(marker._lngLat.toString());
            });
          }
          break;
        case MarkerAction.CLEAR_VISITS:
          console.log("clears", markers);
          markers.forEach((m) => {
            updateMarkerLocalStorage(m, (_, visitSet) => {
              if (visitSet.has(m._lngLat.toString())) {
                updateMarkerColor(m, DefaultMarkerColor);
                visitSet.delete(m._lngLat.toString());
              }
            });
          });
          break;
        case MarkerAction.APPLY_COLORS:
          markers.forEach((m) => {
            updateMarkerLocalStorage(m, (bookmarkSet, visitSet) => {
              if (visitSet.has(m._lngLat.toString())) {
                updateMarkerColor(m, VisitedMarkerColor);
              }
              if (bookmarkSet.has(m._lngLat.toString())) {
                updateMarkerColor(m, BookmarkedMarkerColor);
              }
            });
          });
          break;
      }
    },
    [getMarkerLocalStorage, updateMarkerColor, updateMarkerLocalStorage]
  );

  useEffect(() => {
    const m = mapRef.current;

    if (!m) {
      return;
    }

    let filteredMarkers = props.markerData;
    const now = new Date().getTime();
    if (onlyCurrentlyPlaying) {
      filteredMarkers = filteredMarkers.filter(
        (m) => onlyCurrentlyPlaying && m.start_time <= now && now <= m.end_time
      );
    }

    if (onlyBookmarked) {
      const { bookmarkSet } = getMarkerLocalStorage();
      filteredMarkers = filteredMarkers.filter((m) =>
        bookmarkSet.has(new LngLat(m.location.long, m.location.lat).toString())
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
      const marker = new Marker({
        color: DefaultMarkerColor,
      })
        .setLngLat([d.location.long, d.location.lat])
        .addTo(m);

      marker.getElement().addEventListener("click", () => {
        console.log(
          "is bm",
          getMarkerLocalStorage().bookmarkSet.has(marker._lngLat.toString())
        );
        setCurrMarker({
          ...d,
          mapMarker: marker,
          isBookmarked: getMarkerLocalStorage().bookmarkSet.has(
            marker._lngLat.toString()
          ),
        });
        mapRef.current?.flyTo({
          center: [d.location.long, d.location.lat],
          zoom: 16,
        });

        handleMarkerAction(MarkerAction.VISIT, [], marker);
      });

      return marker;
    });

    handleMarkerAction(MarkerAction.APPLY_COLORS, markers, undefined);
    setMarkers(markers);

    return () => {
      console.log("EVENT: removed markers");
      markers.forEach((m) => {
        m.remove();
      });
    };
  }, [
    props.markerData,
    onlyCurrentlyPlaying,
    searchFilter,
    filteredGenres,
    handleMarkerAction,
    getMarkerLocalStorage,
    onlyBookmarked,
  ]);

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
        <DrawerContent>
          {currMarker && (
            <>
              <DrawerHeader>
                <DrawerTitle className="relative pr-12 text-left">
                  {currMarker.artist_name}
                  <div className="absolute right-0 top-0">
                    <Button
                      variant="outline"
                      onClick={() => {
                        console.log("click", currMarker.isBookmarked);
                        if (currMarker.isBookmarked) {
                          handleMarkerAction(
                            MarkerAction.UN_BOOKMARK,
                            [],
                            currMarker.mapMarker
                          );
                          setCurrMarker({
                            ...currMarker,
                            isBookmarked: false,
                          });
                        } else {
                          handleMarkerAction(
                            MarkerAction.BOOKMARK,
                            [],
                            currMarker.mapMarker
                          );
                          setCurrMarker({
                            ...currMarker,
                            isBookmarked: true,
                          });
                        }
                      }}
                    >
                      {currMarker.isBookmarked ? (
                        <BookmarkFilledIcon />
                      ) : (
                        <BookmarkIcon />
                      )}
                    </Button>
                  </div>
                </DrawerTitle>
                <DrawerDescription className="text-left mt-1">
                  <div className="mr-2 inline-block">Genres:</div>
                  {currMarker.genres.length ? (
                    currMarker.genres.sort().map((g) => (
                      <Badge key={g} className="mr-1 mb-2">
                        {g}
                      </Badge>
                    ))
                  ) : "n/a"}
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
                {/* TODO individual artist pages? */}
                {/* <Button className="w-full">About</Button> */}
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
        onlyBookmarked={onlyBookmarked}
        setOnlyBookmarked={setOnlyBookmarked}
        onCacheClear={() => {
          handleMarkerAction(MarkerAction.CLEAR_VISITS, markers);
        }}
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
