import EventMap, { MarkerData } from "./event-map";

import { promises as fs } from 'fs';

export default async function Home() {
  const file = await fs.readFile(process.cwd() + '/public/output-2.json', 'utf8');
  const data: MarkerData[] = JSON.parse(file);

  return (
    <EventMap markerData={data.map(d => d)} />
  )
}
