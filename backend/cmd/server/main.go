package main

import (
	"fmt"
	"icarus-vision/internal/simulation"
)

func main() {

	event, err := simulation.GenerateRandomEvent()
	if err != nil {
		fmt.Println("GenerateRandomEvent error: ", err)
		return
	}

	fmt.Println("GenerateRandomEvent success: ", event)

}
