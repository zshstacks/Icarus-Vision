package domain

type Event struct {
	Type   string  `json:"type"`
	Source string  `json:"source"`
	Data   []Track `json:"data"`
}
