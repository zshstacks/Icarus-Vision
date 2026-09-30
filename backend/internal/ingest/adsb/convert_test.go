package adsb

import "testing"

func validRow() []interface{} {
	return []interface{}{
		"ABC123",                  // 0 icao24
		"UAL123  ",                // 1 callsign (with trailing spaces to trim)
		"United States",           // 2 origin_country
		1234567890,                // 3 time_position
		1700000000.0,              // 4 last_contact
		-74.0,                     // 5 lon
		40.5,                      // 6 lat
		10500.0,                   // 7 baro_altitude
		false,                     // 8 on_ground
		250.5,                     // 9 velocity
		90.0,                      // 10 true_track
		2.5,                       // 11 vertical_rate
		nil, nil, nil, false, 0.0, // filler to reach len >= 17
	}
}

func TestRowToTrack_Valid(t *testing.T) {
	track, err := rowToTrack(validRow())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if track.ID != "abc123" {
		t.Errorf("ID: want lowercase icao24 %q, got %q", "abc123", track.ID)
	}
	if track.Callsign != "UAL123" {
		t.Errorf("Callsign: want trimmed %q, got %q", "UAL123", track.Callsign)
	}
	if track.Lat != 40.5 {
		t.Errorf("Lat: want 40.5, got %v", track.Lat)
	}
	if track.Lon != -74.0 {
		t.Errorf("Lon: want -74.0, got %v", track.Lon)
	}
	if track.Timestamp != 1700000000 {
		t.Errorf("Timestamp: want 1700000000, got %d", track.Timestamp)
	}
	if track.OnGround {
		t.Error("OnGround should be false")
	}
	if track.Altitude == nil || *track.Altitude != 10500.0 {
		t.Errorf("Altitude: want 10500.0, got %v", track.Altitude)
	}
	if track.Speed == nil || *track.Speed != 250.5 {
		t.Errorf("Speed: want 250.5, got %v", track.Speed)
	}
	if track.Heading == nil || *track.Heading != 90.0 {
		t.Errorf("Heading: want 90.0, got %v", track.Heading)
	}
	if track.VerticalRate == nil || *track.VerticalRate != 2.5 {
		t.Errorf("VerticalRate: want 2.5, got %v", track.VerticalRate)
	}
}

func TestRowToTrack_RequiredFieldErrors(t *testing.T) {
	cases := []struct {
		name string
		mut  func([]interface{}) []interface{}
	}{
		{"row too short", func(r []interface{}) []interface{} { return r[:10] }},
		{"icao24 nil", func(r []interface{}) []interface{} { r[0] = nil; return r }},
		{"icao24 wrong type", func(r []interface{}) []interface{} { r[0] = 123; return r }},
		{"on_ground nil", func(r []interface{}) []interface{} { r[8] = nil; return r }},
		{"on_ground wrong type", func(r []interface{}) []interface{} { r[8] = "false"; return r }},
		{"last_contact nil", func(r []interface{}) []interface{} { r[4] = nil; return r }},
		{"last_contact wrong type", func(r []interface{}) []interface{} { r[4] = "1700000000"; return r }},
		{"lon nil", func(r []interface{}) []interface{} { r[5] = nil; return r }},
		{"lon wrong type", func(r []interface{}) []interface{} { r[5] = "−74.0"; return r }},
		{"lat nil", func(r []interface{}) []interface{} { r[6] = nil; return r }},
		{"lat wrong type", func(r []interface{}) []interface{} { r[6] = "40.5"; return r }},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := rowToTrack(tc.mut(validRow())); err == nil {
				t.Fatal("expected error, got nil")
			}
		})
	}
}

func TestRowToTrack_OptionalFieldsNil(t *testing.T) {
	row := validRow()
	row[1] = nil  // callsign
	row[7] = nil  // altitude
	row[9] = nil  // speed
	row[10] = nil // heading
	row[11] = nil // vertical_rate

	track, err := rowToTrack(row)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if track.Callsign != "" {
		t.Errorf("callsign should default to empty string, got %q", track.Callsign)
	}
	if track.Altitude != nil {
		t.Errorf("altitude should be nil, got %v", *track.Altitude)
	}
	if track.Speed != nil {
		t.Errorf("speed should be nil, got %v", *track.Speed)
	}
	if track.Heading != nil {
		t.Errorf("heading should be nil, got %v", *track.Heading)
	}
	if track.VerticalRate != nil {
		t.Errorf("vertical_rate should be nil, got %v", *track.VerticalRate)
	}
}

func TestRowToTrack_ZeroIsNotNil(t *testing.T) {
	row := validRow()
	row[7] = 0.0  // altitude
	row[9] = 0.0  // speed
	row[10] = 0.0 // heading
	row[11] = 0.0 // vertical_rate

	track, err := rowToTrack(row)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if track.Altitude == nil || *track.Altitude != 0 {
		t.Errorf("altitude 0 should be pointer-to-0, got %v", track.Altitude)
	}
	if track.Speed == nil || *track.Speed != 0 {
		t.Errorf("speed 0 should be pointer-to-0, got %v", track.Speed)
	}
	if track.Heading == nil || *track.Heading != 0 {
		t.Errorf("heading 0 should be pointer-to-0, got %v", track.Heading)
	}
	if track.VerticalRate == nil || *track.VerticalRate != 0 {
		t.Errorf("vertical_rate 0 should be pointer-to-0, got %v", track.VerticalRate)
	}
}
