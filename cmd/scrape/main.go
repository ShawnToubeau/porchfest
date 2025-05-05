package main

import (
	"encoding/json"
	"fmt"
	"github.com/gocolly/colly/v2"
	"log"
	"os"
	"path/filepath"
	"strings"
)

type RawData struct {
	Data [][]string `json:"data"`
}

func main() {
	currentDir, err := os.Getwd()
	if err != nil {
		panic("failed to get working directory")
	}

	// build filepath to video files
	filePath := filepath.Join(currentDir, "../raw-2024-05-06.json")

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

	//for _, entry := range rawData.Data {
	//	href, err := getHref(entry[0])
	//	if err != nil {
	//		log.Fatal(err)
	//	}
	//
	//	fmt.Println(*href)
	//	downloadPage(*href)
	//
	//}
	ps := newPageScraper("https://beta.somervilleartscouncil.org/view/porchfest-single-entry/entry/846/")
	ps.ScrapePage()

	//downloadPage("https://beta.somervilleartscouncil.org/view/porchfest-single-entry/entry/846/")
}

type Link struct {
	Text string `json:"text"`
	Url  string `json:"url"`
}

type ArtistData struct {
	Id     string `json:"id"`
	Name   string `json:"name"`
	About  string `json:"about"`
	Links  []Link `json:"links"`
	ImgUrl string `json:"imgUrl"`
}

type PageScraper struct {
	url        string
	id         string
	artistData ArtistData
}

func newPageScraper(url string) PageScraper {
	splitPath := strings.Split(url, "/entry/")

	return PageScraper{
		url: url,
		artistData: ArtistData{
			Id: strings.Replace(splitPath[1], "/", "", 1),
		},
	}
}

func (ps *PageScraper) ScrapePage() {
	c := colly.NewCollector()

	c.OnRequest(func(r *colly.Request) {
		fmt.Println("Visiting: ", r.URL)
	})

	c.OnError(func(_ *colly.Response, err error) {
		log.Println("Something went wrong: ", err)
	})

	c.OnResponse(func(r *colly.Response) {
		fmt.Println("Page visited: ", r.Request.URL)
	})

	c.OnHTML("#content", func(e *colly.HTMLElement) {
		// artist name
		ps.artistData.Name = e.ChildText(".page-title")
		// links
		e.ForEach(".band-details", func(_ int, elem *colly.HTMLElement) {
			elem.ForEach("a", func(_ int, elem *colly.HTMLElement) {
				ps.artistData.Links = append(ps.artistData.Links, Link{
					Text: elem.Text,
					Url:  strings.ReplaceAll(elem.Attr("href"), " ", "+"),
				})
			})
		})

		e.ForEach(".gv-image", func(_ int, elem *colly.HTMLElement) {
			ps.artistData.ImgUrl = elem.Attr("src")
		})

		err := ps.saveArtistData()
		if err != nil {
			panic(err)
		}

		//fmt.Printf("%+v\n", artist)
		err = ps.downloadImage()
		if err != nil {
			panic(err)
		}
	})

	c.OnScraped(func(r *colly.Response) {
		fmt.Println("Scraped: ", r.Request.URL)
	})

	err := c.Visit(ps.url)
	if err != nil {
		panic(err)
	}
}

func (ps *PageScraper) saveArtistData() error {
	// Marshal the struct to JSON
	jsonData, err := json.MarshalIndent(ps.artistData, "", "  ")
	if err != nil {
		fmt.Println("Error marshaling to JSON:", err)
		return err
	}

	// Create a file to save the JSON data
	file, err := os.Create(fmt.Sprintf("%s/%s.json", ps.artistData.Id, ps.artistData.Name))
	if err != nil {
		fmt.Println("Error creating file:", err)
		return err
	}
	defer func(file *os.File) {
		err := file.Close()
		if err != nil {
			panic(err)
		}
	}(file)

	// Write the JSON data to the file
	_, err = file.Write(jsonData)
	if err != nil {
		fmt.Println("Error writing JSON to file:", err)
		return err
	}

	return nil
}

func (ps *PageScraper) downloadImage() error {
	c := colly.NewCollector()

	err := os.Mkdir(ps.artistData.Id, 0755)
	if err != nil && !os.IsExist(err) {
		return err
	}

	c.OnResponse(func(r *colly.Response) {
		if strings.Contains(r.Headers.Get("Content-Type"), "image/jpeg") {
			err := r.Save(fmt.Sprintf("%s/%s.jpeg", ps.artistData.Id, ps.artistData.Name))
			if err != nil {
				log.Printf("error saving image: %s", err)
			}
		}
	})

	err = c.Visit(ps.artistData.ImgUrl)
	if err != nil {
		return err
	}

	return nil
}

func downloadPage(url string) {
	var artist ArtistData
	c := colly.NewCollector()

	c.OnRequest(func(r *colly.Request) {
		fmt.Println("Visiting: ", r.URL)
	})

	c.OnError(func(_ *colly.Response, err error) {
		log.Println("Something went wrong: ", err)
	})

	c.OnResponse(func(r *colly.Response) {
		fmt.Println("Page visited: ", r.Request.URL)
	})

	c.OnHTML("#content", func(e *colly.HTMLElement) {
		splitPath := strings.Split(e.Request.URL.Path, "/entry/")
		artist.Id = strings.Replace(splitPath[1], "/", "", 1)

		artist.Name = e.ChildText(".page-title")
		e.ForEach(".band-details", func(_ int, elem *colly.HTMLElement) {
			elem.ForEach("a", func(_ int, elem *colly.HTMLElement) {
				artist.Links = append(artist.Links, Link{
					Text: elem.Text,
					Url:  strings.ReplaceAll(elem.Attr("href"), " ", "+"),
				})
			})
		})

		e.ForEach(".gv-image", func(_ int, elem *colly.HTMLElement) {
			artist.ImgUrl = elem.Attr("src")
		})

		fmt.Printf("%+v\n", artist)

		err := os.Mkdir(artist.Id, 0755)
		if err != nil && !os.IsExist(err) {
			panic(err)
		}

		c2 := c.Clone()

		c2.OnResponse(func(r *colly.Response) {
			if strings.Contains(r.Headers.Get("Content-Type"), "image/jpeg") {
				log.Println("dowloading")
				err := r.Save(fmt.Sprintf("%s/%s.jpeg", artist.Id, artist.Name))
				if err != nil {
					log.Println("dowload video error")
					log.Println(err)
					return
				}
				log.Println("dowloaded")
			}
		})

		err = c2.Visit(artist.ImgUrl)
		if err != nil {
			panic(err)
		}

	})

	c.OnScraped(func(r *colly.Response) {
		fmt.Println("Scraped: ", r.Request.URL)
	})

	err := c.Visit(url)
	if err != nil {
		panic(err)
	}
}
