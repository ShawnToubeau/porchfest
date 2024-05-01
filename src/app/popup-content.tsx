"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MarkerData } from "./event-map";
import { Badge } from "@/components/ui/badge";

interface PopupContentProps {
  markerData: MarkerData;
  onClose: () => void;
}

export function PopupContent(props: PopupContentProps) {
  return (
    <Card className="w-[350px] rounded-[3px]">
      <CardHeader className="pb-2">
        <CardTitle className="mb-2">{props.markerData.artist_name}</CardTitle>
        <CardDescription>
          <div className="mr-2 inline-block">Genres:</div>
          {props.markerData.genres.sort().map((g) => (
            <Badge key={g} className="mr-1 mb-2">
              {g}
            </Badge>
          ))}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid w-full items-center gap-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="name" className="text-lg">
              Time
            </Label>
            <div className="flex gap-1">
              {formatTime(props.markerData.start_time)}-
              {formatTime(props.markerData.end_time)}
            </div>
          </div>
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="name" className="text-lg">
              Address
            </Label>
            <div>{props.markerData.location.address}</div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={props.onClose}>
          Close
        </Button>
        <Button>About</Button>
      </CardFooter>
    </Card>
  );
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}