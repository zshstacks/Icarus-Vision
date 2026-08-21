package adsb

import (
	"fmt"
	"icarus-vision/internal/domain"
	"strings"
)

func rowToTrack(row []interface{}) (domain.Track, error) {
	if len(row) < 17 {
		return domain.Track{}, fmt.Errorf("adsb row too short: got %d elements, need at least %d", len(row), 17)
	}

	icao24, ok := row[0].(string)
	if !ok {
		return domain.Track{}, fmt.Errorf("adsb row: icao24 missing or wrong type")
	}

	icao24 = strings.ToLower(strings.TrimSpace(icao24))

	onGround, ok := row[8].(bool)
	if !ok {
		return domain.Track{}, fmt.Errorf("adsb row: onGround missing or wrong type")
	}

	timeStamp, ok := row[4].(float64)
	if !ok {
		return domain.Track{}, fmt.Errorf("adsb row: timeStamp missing or wrong type")
	}

	lon, ok := row[5].(float64)
	if !ok {
		return domain.Track{}, fmt.Errorf("adsb row: Lon missing or wrong type")
	}

	lat, ok := row[6].(float64)
	if !ok {
		return domain.Track{}, fmt.Errorf("adsb row: Lat missing or wrong type")
	}

	callsign, ok := row[1].(string) //can be null
	if ok {
		callsign = strings.TrimSpace(callsign)
	}

	altitude := optionalFloat(row, 7)
	speed := optionalFloat(row, 9)
	heading := optionalFloat(row, 10)
	verticalRate := optionalFloat(row, 11)

	return domain.Track{
		ID:           icao24,
		Callsign:     callsign,
		Lat:          lat,
		Lon:          lon,
		Altitude:     altitude,
		OnGround:     onGround,
		Speed:        speed,
		Heading:      heading,
		VerticalRate: verticalRate,
		Timestamp:    int64(timeStamp),
	}, nil
}

// helper
func optionalFloat(row []interface{}, idx int) *float64 {
	if v, ok := row[idx].(float64); ok {
		return &v
	}
	return nil
}
