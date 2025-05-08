import { Input } from "@/components/ui/input";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { SVGProps, useCallback, useEffect, useMemo, useState } from "react";
import Fuse, { IFuseOptions } from "fuse.js";
import { formatTime, MarkerData } from "./event-map";
import clsx from "clsx";
import { Badge } from "@/components/ui/badge";
import { CrossIcon } from "../../public/icons/cross";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { Calendar, Smile, Calculator, User, CreditCard, Settings } from "lucide-react";

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
  // searchValue: string;
  markers: MarkerData[];
  // setSearchValue: (value: string) => void;
  onResultClick: (marker: MarkerData) => void;
};

export function SearchBar(props: SearchBarProps) {
  const [searchValue, setSearchValue] = useState("");
  const fuse = useCallback(
    () => new Fuse(props.markers, fuseOptions),
    [props.markers]
  );

  const results = useMemo(() => {
    return fuse().search(searchValue);
  }, [fuse, searchValue]);

  return (
    <>
      <div className="relative ">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={({ target }) => setSearchValue(target.value)}
            className="w-[300px] rounded-lg peer rounded-r-none bg-background pl-8"
            placeholder="Search artists"
            type="search"
          />
          <div className="absolute right-4 z-20 h-full top-0 flex items-center">
            <div
              onClick={() => setSearchValue("")}
              className="cursor-pointer bg-slate-800 p-1"
            >
              <CrossIcon />
            </div>
          </div>
          <div
            className={clsx(
              "absolute top-full left-0 z-20 w-full rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-800 dark:bg-gray-950 h-0 border-none peer-focus:h-[200px] peer-focus:border overflow-y-auto",
              {
                hidden: results.length === 0,
              }
            )}
          >
            <div className="p-4">
              <div className="text-xs font-medium">{`${results.length} Search Results`}</div>
              <div className="grid mt-2">
                {results.map((r) => (
                  <div
                    key={r.item.id}
                    className="grid grid-cols-[60%_40%] items-center gap-2 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={(e) => {
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
                        ? r.item.genres.sort().map((g) => (
                            <Badge key={g} className="mr-1 mb-2">
                              {g}
                            </Badge>
                          ))
                        : "n/a"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <DropdownMenu />
    </>
  );
}

function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function Searchbar2(props: SearchBarProps) {
  const [searchValue, setSearchValue] = useState("");
  const fuse = useCallback(
    () => new Fuse(props.markers, fuseOptions),
    [props.markers]
  );

  const results = useMemo(() => {
    return fuse().search(searchValue);
  }, [fuse, searchValue]);
  
  return (
    <Command className="rounded-l-lg rounded-r-none border shadow-md w-[300px]" shouldFilter={false}>
      <CommandInput 
        value={searchValue}
        onValueChange={(search) => setSearchValue(search)}
        placeholder="Search artists" 

      />
      <CommandList hidden={results.length === 0}>
        <CommandEmpty>No results found.</CommandEmpty>
          {results.map((r) => (
            <CommandItem 
              key={r.refIndex}
              onClick={() => {
                props.onResultClick(r.item)
              }}
            >
              {/* <Calendar /> */}
              {/* <span>{r.item.artist_name}</span> */}
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
                  ? r.item.genres.sort().map((g) => (
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
  )
}