"use client";

import { useEffect, useRef, useState } from "react";

import {
  ExpressionSpecification,
  FilterSpecification,
  Map,
  MapStyle,
  data,
  ControlPosition
} from "@maptiler/sdk";

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
import Link from "next/link";
import { CrossIcon } from "../../public/icons/cross";

const VisitedMarkerLSKey = "porchfest-data";

const DefaultMarkerColor = "#d85240";
const VisitedMarkerColor = "#5A6169";
const BookmarkedMarkerColor = "#f3bb01";

type MarkerState = {
  bookmarked: number[];
  visited: number[];
};

type LocationData = {
  lat: number;
  long: number;
  address: string;
  google_maps_link: string;
};

export type MarkerData = {
  id: number;
  isBookmarked: boolean;
  artist_name: string;
  start_time: number;
  end_time: number;
  genres: string[];
  location: LocationData;
};

type LegendItem = {
  color: string;
  label: string;
}

const legendItems: LegendItem[] = [
  { color: DefaultMarkerColor, label: 'Not Viewed' },
  { color: VisitedMarkerColor, label: 'Viewed' },
  { color: BookmarkedMarkerColor, label: 'Bookmarked' },
];

/**
 * TODO:
 * populate search results - fuzzy matching?
 *  selecting an item from the search should take you to the location
 */

class LegendControl {
  private items: LegendItem[];
  private position: ControlPosition;
  private map?: Map;
  private container!: HTMLElement;
  
  constructor(items: LegendItem[], position = 'top-right' as ControlPosition) {
    this.items = items;
    this.position = position;
  }

  onAdd(map: Map) {
    this.map = map;
    this.container = document.createElement('div');
    this.container.className = 'maplibregl-ctrl legend-control';

    const list = document.createElement('ul');
    list.style.listStyle = 'none';
    list.style.margin = '0px';
    list.style.marginBottom = '8px';
    list.style.marginLeft = '8px';
    list.style.padding = '12px';
    list.style.backgroundColor = "#fff";
    list.style.borderRadius = "5px";

    for (const item of this.items) {
      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.alignItems = 'center';
      li.style.marginBottom = '4px';

      const colorDot = document.createElement('span');
      colorDot.style.display = 'inline-block';
      colorDot.style.width = '16px';
      colorDot.style.height = '16px';
      colorDot.style.borderRadius = "25px"
      colorDot.style.backgroundColor = item.color;
      colorDot.style.marginRight = '8px';

      const label = document.createElement('span');
      label.textContent = item.label;
      label.style.color = "#000"
      label.style.fontSize = "14px"

      li.appendChild(colorDot);
      li.appendChild(label);
      list.appendChild(li);
    }

    this.container.appendChild(list);
    return this.container;
  }

  onRemove() {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    if (this.map) {
      this.map = undefined;
    }
  }

  getDefaultPosition() {
    return this.position;
  }
}

export default function EventMap() {
  const mapRef = useRef<Map | null>(null);
  const [onlyCurrentlyPlaying, setOnlyCurrentlyPlaying] = useState(false);
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [filteredGenres, setFilteredGenres] = useState<Set<string>>(
    new Set([])
  );
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set([]));
  const [showSheet, setShowSheet] = useState(false);
  const [currMarker, setCurrMarker] = useState<MarkerData | null>(null);
  const [genreOpts, setGenreOpts] = useState<Set<string>>(new Set());

  // add click handler to drawer overlay
  useEffect(() => {
    if (currMarker) {
      // delay to give the DOM time to render
      setTimeout(() => {
        const overlays = Array.from(
          document.getElementsByClassName("drawer-overlay")
        );

        overlays.map((o) => {
          o.addEventListener("click", () => setCurrMarker(null));
        });
      }, 200);
    }
  }, [currMarker]);

  // init map and load data source
  useEffect(() => {
    if (mapRef.current !== null) {
      return;
    }

    // prevent auto-zooming on search bar focus on iPhones
    if (navigator.userAgent.indexOf("iPhone") > -1) {
      document
        .querySelector("[name=viewport]")
        ?.setAttribute(
          "content",
          "width=device-width, initial-scale=1, maximum-scale=1"
        );
    }

    const map = new Map({
      container: document.getElementById("map") as HTMLElement,
      apiKey: process.env.NEXT_PUBLIC_MAPTILER_API_KEY,
      navigationControl: false,
      geolocate: true,
      logoPosition: "bottom-right",
      geolocateControl: "bottom-right",
      zoom: 13,
      center: {
        lng: -71.10766319928621,
        lat: 42.392251196294296,
      },
      style: MapStyle.BRIGHT,
    });

    map.addControl(new LegendControl(legendItems), 'bottom-left');

    map.on("load", async function () {
      if (!process.env.NEXT_PUBLIC_MAPTILER_DATA_ID) {
        console.error("missing NEXT_PUBLIC_MAPTILER_DATA_ID")
        return
      }

      const geojson = await data.get(process.env.NEXT_PUBLIC_MAPTILER_DATA_ID);
      setGenreOpts(
        new Set(
          geojson.features
            .flatMap((f) =>
              f.properties?.genres.filter((g: string) => g !== "")
            )
            .sort()
        )
      );

      map.addSource("artists", {
        type: "geojson",
        data: geojson,
        generateId: true,
      });

      map.addLayer({
        id: "artists-fills",
        type: "circle",
        source: "artists",
        layout: {},
        paint: {
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            2, 1,
            8, 5,
            12, 8,
          ],
          "circle-color": [
            "case",
            ["==", ["feature-state", "bookmarked"], true],
            BookmarkedMarkerColor,
            ["==", ["feature-state", "visited"], true],
            VisitedMarkerColor,
            DefaultMarkerColor,
          ],
        },
      });

      // color visited and bookmarked points
      const { visitSet, bookmarkSet } = getMarkerLocalStorage();
      Array.from(bookmarkSet).forEach((v) => {
        map.setFeatureState({ source: "artists", id: v }, { bookmarked: true });
      });
      Array.from(visitSet).forEach((v) => {
        map.setFeatureState({ source: "artists", id: v }, { visited: true });
      });

      // store bookmarks in state because feature state can't be used in filters
      setBookmarked(bookmarkSet);
    });

    map.on("click", "artists-fills", function (e) {
      if (e?.features) {
        const feature = e.features[0];
        if (feature.geometry.type === "Point") {
          map.flyTo({
            center: feature.geometry.coordinates as [number, number],
            zoom: 16,
          });
        }

        // set point to visited
        map.setFeatureState(
          { source: "artists", id: feature.id },
          { visited: true }
        );

        const { visitSet, bookmarkSet } = getMarkerLocalStorage();
        // track the state change in localstorage
        updateMarkerLocalStorage({
          visitSet: visitSet.add(feature.id as number),
        });

        setCurrMarker({
          ...(feature.properties as MarkerData),
          id: feature.id as number,
          isBookmarked: bookmarkSet.has(feature.id as number),
          genres: JSON.parse(feature.properties.genres),
          location: JSON.parse(feature.properties.location),
        });
      }
    });

    map.on("mouseenter", "artists-fills", function () {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "artists-fills", function () {
      map.getCanvas().style.cursor = "";
    });

    mapRef.current = map;
  }, []);

  // filter points
  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      const source = map.getSource("artists");
      if (source) {
        var filters: FilterSpecification = [
          "all",
          [
            "in",
            searchFilter.toLowerCase(),
            ["string", ["downcase", ["get", "artist_name"]]],
          ],
        ];

        if (filteredGenres.size > 0) {
          const genreFilters: ExpressionSpecification[] = Array.from(
            filteredGenres
          ).map((genre) => {
            return ["in", genre, ["array", ["get", "genres"]]];
          });
          filters.push(...genreFilters);
        }

        if (onlyCurrentlyPlaying) {
          const now = new Date().getTime();
          filters.push(["<=", ["get", "start_time"], now]);
          filters.push([">=", ["get", "end_time"], now]);
        }

        if (onlyBookmarked) {
          filters.push([
            "in",
            ["number", ["id"]],
            ["literal", Array.from(bookmarked)],
          ]);
        }

        map.setFilter("artists-fills", filters);
      }
    }
  }, [
    bookmarked,
    filteredGenres,
    onlyBookmarked,
    onlyCurrentlyPlaying,
    searchFilter,
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
        <div className="relative">
          <Input
            className="w-[300px] rounded-l-none"
            placeholder="Search artists"
            value={searchFilter}
            onChange={({ target }) => setSearchFilter(target.value)}
          />
          <div className="absolute right-4 z-20 h-full top-0 flex items-center">
            <div
              onClick={() => setSearchFilter("")}
              className="cursor-pointer bg-slate-800 p-1"
            >
              <CrossIcon />
            </div>
          </div>
        </div>
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
                        if (currMarker.isBookmarked) {
                          mapRef.current?.setFeatureState(
                            { source: "artists", id: currMarker.id },
                            { bookmarked: false }
                          );
                          bookmarked.delete(currMarker.id);
                          updateMarkerLocalStorage({
                            bookmarkSet: bookmarked,
                          });
                          setBookmarked(bookmarked);
                          setCurrMarker((s) => {
                            if (s) {
                              return {
                                ...s,
                                isBookmarked: false,
                              };
                            }
                            return s;
                          });
                        } else {
                          mapRef.current?.setFeatureState(
                            { source: "artists", id: currMarker.id },
                            { bookmarked: true }
                          );
                          const updatedSet = bookmarked.add(currMarker.id);
                          updateMarkerLocalStorage({
                            bookmarkSet: updatedSet,
                          });
                          setBookmarked(updatedSet);
                          setCurrMarker((s) => {
                            if (s) {
                              return {
                                ...s,
                                isBookmarked: true,
                              };
                            }
                            return s;
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
                <DrawerDescription className="text-left mt-1 pr-16">
                  <div className="mr-2 inline-block">Genres:</div>
                  {currMarker.genres.length
                    ? currMarker.genres.sort().map((g) => (
                        <Badge key={g} className="mr-1 mb-2">
                          {g}
                        </Badge>
                      ))
                    : "n/a"}
                </DrawerDescription>
              </DrawerHeader>
              <div className="grid w-full items-center gap-4 px-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="name" className="text-lg">
                    Time
                  </Label>
                  <div className="flex gap-1">
                    {formatTime(currMarker.start_time)}
                    <div>-</div>
                    {formatTime(currMarker.end_time)}
                  </div>
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="name" className="text-lg">
                    Address
                  </Label>
                  <Link
                    href={currMarker.location.google_maps_link}
                    className="text-[#0090FF]"
                    target="_blank"
                  >
                    {currMarker.location.address}
                  </Link>
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
        genreOpts={genreOpts}
        onClose={() => setShowSheet(false)}
        filteredGenres={filteredGenres}
        setFilteredGenres={setFilteredGenres}
        onlyCurrentlyPlaying={onlyCurrentlyPlaying}
        setOnlyCurrentlyPlaying={setOnlyCurrentlyPlaying}
        onlyBookmarked={onlyBookmarked}
        setOnlyBookmarked={setOnlyBookmarked}
        onCacheClear={() => {
          const map = mapRef.current;
          if (map) {
            const { visitSet } = getMarkerLocalStorage();
            Array.from(visitSet).forEach((v) => {
              map.setFeatureState(
                { source: "artists", id: v },
                { visited: false }
              );
            });
            updateMarkerLocalStorage({
              visitSet: new Set(),
            });
          }
        }}
      />
    </div>
  );
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    timeStyle: "short",
  });
}

function getMarkerLocalStorage() {
  let markerState: MarkerState | null = null;
  const markerStateLS = localStorage.getItem(VisitedMarkerLSKey);
  if (markerStateLS !== null) {
    markerState = JSON.parse(markerStateLS) as MarkerState;
  }

  let bookmarkSet = new Set<number>(markerState?.bookmarked ?? []);
  let visitSet = new Set<number>(markerState?.visited ?? []);

  return {
    bookmarkSet,
    visitSet,
  };
}

function updateMarkerLocalStorage({
  bookmarkSet,
  visitSet,
}: {
  bookmarkSet?: Set<number>;
  visitSet?: Set<number>;
}) {
  const lsState = getMarkerLocalStorage();

  let markerState: MarkerState = {
    bookmarked: Array.from(bookmarkSet ?? lsState.bookmarkSet),
    visited: Array.from(visitSet ?? lsState.visitSet),
  };

  localStorage.setItem(VisitedMarkerLSKey, JSON.stringify(markerState));
}
