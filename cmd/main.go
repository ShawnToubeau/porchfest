package main

import (
	"encoding/csv"
	"encoding/json"
	"flag"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

type GeocodeResult struct {
	Latitude  string `json:"lat"`
	Longitude string `json:"lon"`
}

type Location struct {
	Lat            float64 `json:"lat"`
	Long           float64 `json:"long"`
	Address        string  `json:"address"`
	GoogleMapsLink string  `json:"google_maps_link"`
}

type Properties struct {
	ArtistName string   `json:"artist_name"`
	StartTime  int64    `json:"start_time"`
	EndTime    int64    `json:"end_time"`
	Genres     []string `json:"genres"`
	Location   Location `json:"location"`
}

type Geometry struct {
	Type        string    `json:"type"`
	Coordinates []float64 `json:"coordinates"` // [lon, lat]
}

type Feature struct {
	ID         int        `json:"id"`
	Type       string     `json:"type"`
	Geometry   Geometry   `json:"geometry"`
	Properties Properties `json:"properties"`
}

type FeatureCollection struct {
	Type     string    `json:"type"`
	Features []Feature `json:"features"`
}

func main() {
	// Parse command-line flag
	year := flag.String("year", "2025", "Data year: year of the event")
	format := flag.String("format", "csv", "Output format: csv or geojson")
	flag.Parse()

	// Open input CSV
	inputFile, err := os.Open(fmt.Sprintf("data/%s/input.csv", *year))
	if err != nil {
		fmt.Println("Error opening input file:", err)
		return
	}
	defer inputFile.Close()

	reader := csv.NewReader(inputFile)
	records, err := reader.ReadAll()
	if err != nil {
		fmt.Println("Error reading CSV:", err)
		return
	}

	// Prepare output
	if *format == "csv" {
		writeCSV(records, year)
	} else if *format == "geojson" {
		writeGeoJSON(records, year)
	} else {
		fmt.Println("Invalid format. Use --format=csv or --format=geojson")
	}
}

func writeCSV(rows [][]string, year *string) {
	outputFile, err := os.Create(fmt.Sprintf("data/%s/output.csv", *year))
	if err != nil {
		fmt.Println("Error creating output file:", err)
		return
	}
	defer outputFile.Close()

	writer := csv.NewWriter(outputFile)
	defer writer.Flush()

	// Write header with additional columns
	if len(rows) > 0 {
		header := append(rows[0], "Latitude", "Longitude", "Google Maps Link")
		writer.Write(header)
	}

	// Process each record
	for _, record := range rows[1:] {
		if len(record) < 4 {
			continue
		}
		address := record[3]
		query := url.QueryEscape(fmt.Sprintf("%s, somerville", address))
		searchURL := fmt.Sprintf("http://localhost:8080/search.php?q=%s&format=json", query)

		resp, err := http.Get(searchURL)
		if err != nil {
			fmt.Println("Error requesting geocode for:", address, err)
			continue
		}
		defer resp.Body.Close()

		var results []GeocodeResult
		if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
			fmt.Println("Error decoding JSON for:", address, err)
			continue
		}

		lat, lon, link := "", "", ""
		if len(results) > 0 {
			lat = results[0].Latitude
			lon = results[0].Longitude
			link = googleMapsLink(lat, lon)
		}

		newRecord := append(record, lat, lon, link)
		writer.Write(newRecord)
	}
}

func writeGeoJSON(rows [][]string, year *string) {
	var features []Feature

	for i, record := range rows {
		if i == 0 {
			continue
		}

		name := record[0]
		timeRange := record[1]
		genres := trimStrings(strings.Split(record[2], ","))
		address := strings.TrimSpace(record[3])

		latStr, lonStr := getCoordinates(address)
		lat := parseFloat(latStr)
		lon := parseFloat(lonStr)
		link := googleMapsLink(latStr, lonStr)

		startTime, endTime := parseTimeRange(timeRange)

		feature := Feature{
			ID:   i,
			Type: "Feature",
			Geometry: Geometry{
				Type:        "Point",
				Coordinates: []float64{lon, lat},
			},
			Properties: Properties{
				ArtistName: name,
				StartTime:  startTime,
				EndTime:    endTime,
				Genres:     genres,
				Location: Location{
					Lat:            lat,
					Long:           lon,
					Address:        address,
					GoogleMapsLink: link,
				},
			},
		}

		features = append(features, feature)
	}

	fc := FeatureCollection{
		Type:     "FeatureCollection",
		Features: features,
	}

	outputFile, err := os.Create("output.geojson")
	if err != nil {
		fmt.Println("Error creating geojson file:", err)
		return
	}
	defer outputFile.Close()

	encoder := json.NewEncoder(outputFile)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(fc); err != nil {
		fmt.Println("Error encoding geojson:", err)
	}
}

func getCoordinates(address string) (string, string) {
	query := address
	if !strings.Contains(strings.ToLower(address), "somerville") {
		query = fmt.Sprintf("%s, somerville", address)
	}

	searchURL := fmt.Sprintf("http://localhost:8080/search.php?q=%s&format=json", url.QueryEscape(query))

	resp, err := http.Get(searchURL)
	if err != nil {
		fmt.Println("Error requesting geocode for:", address, err)
		return "", ""
	}
	defer resp.Body.Close()

	var results []GeocodeResult
	if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
		fmt.Println("Error decoding JSON for:", address, err)
		return "", ""
	}

	if len(results) > 0 {
		return results[0].Latitude, results[0].Longitude
	}
	return "", ""
}

func googleMapsLink(lat, lon string) string {
	return fmt.Sprintf("https://maps.google.com/?q=%s,%s", lat, lon)
}

func parseFloat(s string) float64 {
	val, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0.0
	}
	return val
}

func parseTimeRange(timeStr string) (int64, int64) {
	layout := "3:04pm"
	times := strings.Split(timeStr, "–")
	if len(times) != 2 {
		return 0, 0
	}
	start, err1 := time.Parse(layout, strings.TrimSpace(times[0]))
	end, err2 := time.Parse(layout, strings.TrimSpace(times[1]))
	now := time.Now()

	// combine with today's date
	start = time.Date(now.Year(), now.Month(), now.Day(), start.Hour(), start.Minute(), 0, 0, now.Location())
	end = time.Date(now.Year(), now.Month(), now.Day(), end.Hour(), end.Minute(), 0, 0, now.Location())

	if err1 != nil || err2 != nil {
		return 0, 0
	}
	return start.Unix() * 1000, end.Unix() * 1000
}

func trimStrings(arr []string) []string {
	out := []string{}
	for _, v := range arr {
		out = append(out, strings.TrimSpace(v))
	}
	return out
}
