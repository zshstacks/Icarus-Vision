package domain

type Track struct {
	ID           string   `json:"id"`            //ICAO24
	Callsign     string   `json:"callsign"`      //digital name planes
	Lat          float64  `json:"lat"`           //latitude
	Lon          float64  `json:"lon"`           //longitude
	Altitude     *float64 `json:"altitude"`      //meters
	OnGround     bool     `json:"on_ground"`     // grounded or not
	Speed        *float64 `json:"speed"`         //velocity m/s
	Heading      *float64 `json:"heading"`       //true track degrees(0-360)
	VerticalRate *float64 `json:"vertical_rate"` // how fast a plane is climbing or descending
	Timestamp    int64    `json:"timestamp"`     //exact time of planes position
}
