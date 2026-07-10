package simulation

import (
	"context"
	"fmt"
	"time"
)

func RunSimulationStream() context.CancelFunc {
	ticker := time.NewTicker(time.Second)
	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		for {
			select {
			case <-ctx.Done():
				fmt.Println("Ticker done")
				ticker.Stop()
				return
			case <-ticker.C:
				result, err := GenerateRandomEvent()
				if err != nil {
					fmt.Println(err)
					return
				}
				fmt.Println("RunSimulationStream generate event: ", result)
			}

		}

	}()

	return cancel
}
