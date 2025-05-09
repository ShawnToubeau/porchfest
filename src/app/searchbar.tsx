import { useCallback, useMemo, useRef, useState } from "react";
import Fuse, { IFuseOptions } from "fuse.js";
import { formatTime, MarkerData } from "./event-map";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const fuseOptions: IFuseOptions<MarkerData> = {
  // isCaseSensitive: false,
  // includeScore: false,
  // shouldSort: true,
  // includeMatches: false,
  // findAllMatches: false,
  minMatchCharLength: 2,
  // location: 0,
  // threshold: 0.6,
  // distance: 100,
  // useExtendedSearch: false,
  // ignoreLocation: false,
  // ignoreFieldNorm: false,
  // fieldNormWeight: 1,
  keys: ["artist_name"],
};

type SearchBarProps = {
  markers: MarkerData[];
  onResultClick: (marker: MarkerData) => void;
};

export function Searchbar(props: SearchBarProps) {
  const [searchValue, setSearchValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const commandRef = useRef<HTMLDivElement | null>(null);

  const fuse = useCallback(
    () => new Fuse(props.markers, fuseOptions),
    [props.markers]
  );

  const results = useMemo(() => {
    return fuse().search(searchValue, {
      limit: 10
    });
  }, [fuse, searchValue]);

  return (
    <div
      ref={commandRef}
      tabIndex={-1} // ensure it's focusable
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        // Check if focus moved outside the container
        if (!commandRef.current?.contains(e.relatedTarget)) {
          setIsFocused(false);
        }
      }}
    >
      <Command className="rounded-l-lg rounded-r-none border shadow-md w-[300px]" shouldFilter={false}>
        <CommandInput
          value={searchValue}
          onValueChange={(search) => setSearchValue(search)}
          placeholder="Search artists"
          onClear={() => setSearchValue("")}
        />
        <CommandList hidden={!isFocused || searchValue.length < 2}>
          <CommandEmpty>No results found.</CommandEmpty>
          {results.map((r) => (
            <CommandItem
              key={r.refIndex}
              onSelect={() => {
                setSearchValue(r.item.artist_name)
                setIsFocused(false)
                props.onResultClick(r.item)
              }}
            >
              <div>
                <p className="text-sm font-medium">
                  {r.item.artist_name}
                </p>
                <div className="flex gap-1">
                  {formatTime(r.item.start_time)}
                  <div>-</div>
                  {formatTime(r.item.end_time)}
                </div>
              </div>
              <div>
                {r.item.genres.length
                  // limit the genres listed to 3 to prevent overflow
                  ? r.item.genres.slice(0, 3).sort().map((g) => (
                    <Badge key={g} className="mr-1 mb-2">
                      {g}
                    </Badge>
                  ))
                  : "n/a"}
              </div>
            </CommandItem>
          ))}
        </CommandList>
      </Command>
    </div>
  )
}