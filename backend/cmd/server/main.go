package main

import (
	"icarus-vision/internal/simulation"
	"time"
)

func main() {
	cancel := simulation.RunSimulationStream()
	time.Sleep(5 * time.Second)
	cancel()
	time.Sleep(1 * time.Second)
}
