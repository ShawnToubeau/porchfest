# Porchfest.io

## Getting Started

If reverse geocoding data, start the Nominatim service.

(this may take a while)

```bash
make up
```

Convert bathroom JSON to GeoJSON with jq.

```bash
jq '{
  type: "FeatureCollection",
  features: map({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [.lng, .lat]
    },
    properties: {}
  })
}' bathroom-coords.json > bathroom.geojson
```

Create an .env from .env.example.

```bash
mv .env.example .env
```


## Resources

https://somervilleartscouncil.org/porchfest
https://porchfest.info/custom/