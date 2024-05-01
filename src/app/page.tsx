import EventMap from "./event-map";

import * as data from "../../public/output-2.json"

export default function Home() {
  return (
    <EventMap markerData={data.map(d => d)} />
  )
}
