package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type Location struct {
	Lat            float64 `json:"lat"`
	Long           float64 `json:"long"`
	Address        string  `json:"address"`
	GoogleMapsLink string  `json:"google_maps_link"`
}

type Event struct {
	ArtistName string   `json:"artist_name"`
	StartTime  int64    `json:"start_time"`
	EndTime    int64    `json:"end_time"`
	Genres     []string `json:"genres"`
	Location   Location `json:"location"`
}

type GeoJSONFeature struct {
	Type       string      `json:"type"`
	Geometry   GeoJSONGeom `json:"geometry"`
	Properties Event       `json:"properties"`
}

type GeoJSONGeom struct {
	Type        string    `json:"type"`
	Coordinates []float64 `json:"coordinates"`
}

func main() {
	currentDir, err := os.Getwd()
	if err != nil {
		panic("failed to get working directory")
	}

	// build filepath to video files
	filePath := filepath.Join(currentDir, "public/artists-2024-05-06.json")

	// Read JSON file
	raw, err := os.ReadFile(filePath)
	if err != nil {
		fmt.Println("Error reading JSON file:", err)
		return
	}

	// Parse JSON
	var rawData []Event
	if err := json.Unmarshal(raw, &rawData); err != nil {
		fmt.Println("Error parsing JSON:", err)
		return
	}

	var features []GeoJSONFeature

	for _, event := range rawData {
		feature := GeoJSONFeature{
			Type: "Feature",
			Geometry: GeoJSONGeom{
				Type:        "Point",
				Coordinates: []float64{event.Location.Long, event.Location.Lat},
			},
			Properties: event,
		}

		features = append(features, feature)
	}

	featureCollection := struct {
		Type     string           `json:"type"`
		Features []GeoJSONFeature `json:"features"`
	}{
		Type:     "FeatureCollection",
		Features: features,
	}

	geoJSON, err := json.MarshalIndent(featureCollection, "", "    ")
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	file, err := os.Create("data/output.geojson")
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	defer file.Close()

	file.Write(geoJSON)
	fmt.Println("GeoJSON file created successfully")
}
