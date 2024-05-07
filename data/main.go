package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type Event struct {
	ArtistName string   `json:"artist_name"`
	StartTime  int64    `json:"start_time"`
	EndTime    int64    `json:"end_time"`
	Genres     []string `json:"genres"`
	Location   Location `json:"location"`
}

type Location struct {
	Lat            float64 `json:"lat"`
	Long           float64 `json:"long"`
	Address        string  `json:"address"`
	GoogleMapsLink string  `json:"google_maps_link"`
}

type RawData struct {
	Data [][]string `json:"data"`
}

func main() {
	currentDir, err := os.Getwd()
	if err != nil {
		panic("failed to get working directory")
	}

	// build filepath to video files
	filePath := filepath.Join(currentDir, "data/raw-2024-05-06.json")

	// Read JSON file
	raw, err := os.ReadFile(filePath)
	if err != nil {
		fmt.Println("Error reading JSON file:", err)
		return
	}

	// Parse JSON
	var rawData RawData
	if err := json.Unmarshal(raw, &rawData); err != nil {
		fmt.Println("Error parsing JSON:", err)
		return
	}

	// Convert raw data to desired format
	var events []Event
	for _, entry := range rawData.Data {
		address := strings.TrimSpace(strings.Split(strings.Trim(strings.Split(entry[4], "\">")[1], "</a>"), "\u003ci")[0])
		geocodeRes, err := geocode(strings.ReplaceAll(address, " ", "+"))
		if err != nil {
			fmt.Println("Error parsing geocode res:", err)
			//break
			geocodeRes.Latitude = "0.0"
			geocodeRes.Longitude = "0.0"
		}
		// Convert string to float64
		lat, err := strconv.ParseFloat(geocodeRes.Latitude, 64)
		if err != nil {
			fmt.Println("Error:", err)
			return
		}
		long, err := strconv.ParseFloat(geocodeRes.Longitude, 64)
		if err != nil {
			fmt.Println("Error:", err)
			return
		}

		startTime := strings.TrimSpace(strings.Split(entry[1], "&")[0])
		endTime := strings.TrimSpace(entry[2])

		// Define the layout for parsing the time string
		layout := "2006-01-02 03:04pm"

		// Define the time string and the location
		startTimeString := ""
		if len(startTime) == 6 {
			startTimeString = "2024-05-11 0" + startTime
		} else {
			startTimeString = "2024-05-11 " + startTime
		}
		endTimeString := ""
		if len(endTime) == 6 {
			endTimeString = "2024-05-11 0" + endTime
		} else {
			endTimeString = "2024-05-11 " + endTime
		}
		location, err := time.LoadLocation("America/New_York")
		if err != nil {
			fmt.Println("Error:", err)
			return
		}

		// Parse the time string to time.Time object with the specified layout and location
		parsedStartTime, err := time.ParseInLocation(layout, startTimeString, location)
		if err != nil {
			fmt.Println("Error:", err)
			return
		}
		parsedEndTime, err := time.ParseInLocation(layout, endTimeString, location)
		if err != nil {
			fmt.Println("Error:", err)
			return
		}

		event := Event{
			ArtistName: strings.Split(strings.Split(entry[0], "\">")[1], "</a>")[0],
			StartTime:  parsedStartTime.UnixMilli(),
			EndTime:    parsedEndTime.UnixMilli(),
			Genres:     strings.Split(strings.TrimSpace(entry[3]), ", "),
			Location: Location{
				Lat:            lat,
				Long:           long,
				Address:        address,
				GoogleMapsLink: strings.Split(strings.Split(entry[4], "href=\"")[1], "\"")[0],
			},
		}
		events = append(events, event)
	}

	// Convert to JSON
	output, err := json.MarshalIndent(events, "", "  ")
	if err != nil {
		fmt.Println("Error marshaling JSON:", err)
		return
	}

	// Write JSON to file
	err = os.WriteFile("data/artists-2024-05-06.json", output, 0644)
	if err != nil {
		fmt.Println("Error writing JSON to file:", err)
		return
	}

	fmt.Println("JSON data written to output.json successfully.")

	//// Print JSON
	//fmt.Println(string(output))
}

type GeocodeResult struct {
	Latitude  string `json:"lat"`
	Longitude string `json:"lon"`
}

func geocode(address string) (GeocodeResult, error) {
	url := fmt.Sprintf("http://localhost:8080/search.php?q=%s,somerville", address)

	resp, err := http.Get(url)
	if err != nil {
		return GeocodeResult{}, err
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return GeocodeResult{}, err
	}

	var locations []GeocodeResult
	if err := json.Unmarshal(body, &locations); err != nil {
		return GeocodeResult{}, err
	}

	if len(locations) == 0 {
		return GeocodeResult{}, fmt.Errorf("no geocoding results found: address - %v", address)
	}

	return locations[0], nil
}
