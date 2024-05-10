"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Toggle } from "@/components/ui/toggle";
import { ListBox, ListBoxItem } from "react-aria-components";
import type { Selection } from "react-aria-components";
import clsx from "clsx";
import { Label } from "@/components/ui/label";

interface FilterProps {
  genreOpts: Set<string>;
  open: boolean;
  onlyCurrentlyPlaying: boolean;
  onlyBookmarked: boolean;
  filteredGenres: Set<string>;
  setOnlyCurrentlyPlaying: (val: boolean) => void;
  setOnlyBookmarked: (val: boolean) => void;
  setFilteredGenres: (val: Set<string>) => void;
  onClose: () => void;
  onCacheClear: () => void;
}

export function Filter(props: FilterProps) {
  return (
    <Sheet open={props.open} onOpenChange={() => props.onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filter</SheetTitle>
        </SheetHeader>
        <div className="flex justify-between my-4 flex-col">
          <div className="flex justify-between mb-4 gap-4">
            <Toggle
              variant="outline"
              className="w-full data-[state=on]:bg-primary h-fit py-2"
              aria-label="Currently Playing"
              pressed={props.onlyCurrentlyPlaying}
              onClick={() =>
                props.setOnlyCurrentlyPlaying(!props.onlyCurrentlyPlaying)
              }
            >
              <div>Currently Playing</div>
            </Toggle>
            <Toggle
              variant="outline"
              className="w-full data-[state=on]:bg-primary h-fit py-2"
              aria-label="Only Bookmarked"
              pressed={props.onlyBookmarked}
              onClick={() => props.setOnlyBookmarked(!props.onlyBookmarked)}
            >
              Only Bookmarked
            </Toggle>
          </div>

          <Button
            variant="outline"
            className="rounded-r-none"
            onClick={() => {
              props.setOnlyBookmarked(false);
              props.setOnlyCurrentlyPlaying(false);
              props.setFilteredGenres(new Set());
            }}
          >
            Clear Filters
          </Button>
        </div>
        <Label>
          Genres {props.filteredGenres.size}/{props.genreOpts.size}
        </Label>
        <ListBox
          className="outline-0 p-1 border rounded-lg max-h-[400px] overflow-y-auto mt-2"
          aria-label="Genres"
          onSelectionChange={(keys) =>
            props.setFilteredGenres(keys as Set<string>)
          }
          selectionMode="multiple"
          selectedKeys={props.filteredGenres as Selection}
        >
          {Array.from(props.genreOpts).map((g) => (
            <ListBoxItem
              key={g}
              id={g}
              textValue={g}
              className={({ isSelected }) => {
                return clsx(
                  "outline outline-blue-600 dark:outline-blue-500 forced-colors:outline-[Highlight] group relative flex items-center gap-8 cursor-default select-none py-1.5 px-2.5 rounded-md will-change-transform text-sm forced-color-adjust-none text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 -outline-offset-2 outline-0",
                  {
                    "bg-blue-600 hover:bg-blue-600 hover:dark:bg-blue-600 text-white forced-colors:bg-[Highlight] forced-colors:text-[HighlightText] [&:has(+[data-selected])]:rounded-b-none [&+[data-selected]]:rounded-t-none -outline-offset-4 outline-white dark:outline-white forced-colors:outline-[HighlightText] outline-0":
                      isSelected,
                  }
                );
              }}
            >
              {g}
            </ListBoxItem>
          ))}
        </ListBox>
        <Button
          variant="destructive"
          className="mt-4"
          onClick={() => props.onCacheClear()}
        >
          Reset Visited Markers
        </Button>
      </SheetContent>
    </Sheet>
  );
}
