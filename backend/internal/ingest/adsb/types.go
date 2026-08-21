package adsb

type StatesResponse struct {
	Time   int64           `json:"time"`
	States [][]interface{} `json:"states"`
}
