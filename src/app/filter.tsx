"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Toggle } from "@/components/ui/toggle";
import { useMemo } from "react";
import { ListBox, ListBoxItem } from "react-aria-components";
import type { Selection } from "react-aria-components";
import { MarkerData } from "./event-map";
import clsx from "clsx";
import { Label } from "@/components/ui/label";

interface FilterProps {
  markerData: MarkerData[];
  open: boolean;
  onlyCurrentlyPlaying: boolean;
  filteredGenres: Selection;
  setOnlyCurrentlyPlaying: (val: boolean) => void;
  setFilteredGenres: (val: Selection) => void;
  onClose: () => void;
}

export function Filter(props: FilterProps) {
  const genreOpts = useMemo(() => {
    return new Set(
      props.markerData.flatMap((d) => d.genres.filter((g) => g !== "")).sort()
    );
  }, [props.markerData]);

  return (
    <Sheet open={props.open} onOpenChange={() => props.onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filter</SheetTitle>
          <div className="flex justify-between">
            <Toggle
              variant="outline"
              className="w-max p-4"
              aria-label="Currently Playing"
              pressed={props.onlyCurrentlyPlaying}
              onClick={() =>
                props.setOnlyCurrentlyPlaying(!props.onlyCurrentlyPlaying)
              }
            >
              Currently Playing
            </Toggle>

            <Button
              variant="outline"
              className="rounded-r-none"
              onClick={() => {
                props.setOnlyCurrentlyPlaying(false);
                props.setFilteredGenres(new Set());
              }}
            >
              Clear
            </Button>
          </div>
          <Label>Genres</Label>
          <ListBox
            className="outline-0 p-1 border rounded-lg"
            aria-label="Genres"
            onSelectionChange={props.setFilteredGenres}
            selectionMode="multiple"
            selectedKeys={props.filteredGenres}
          >
            {Array.from(genreOpts).map((g) => (
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
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
