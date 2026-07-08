package simulation

import (
	"icarus-vision/internal/attack"
	"icarus-vision/internal/pb"
	"math/rand"
	"time"
)

func RandRange(min, max float64) float64 {
	return rand.Float64()*(max-min) + min
}

func GenerateRandomEvent() (*pb.AttackEvent, error) {

	attacker := pb.GeoPoint{
		Latitude:  RandRange(-90, 90),
		Longitude: RandRange(-180, 180),
		Error:     pb.GeoError_GEO_ERROR_NONE,
	}

	target := pb.GeoPoint{
		Latitude:  RandRange(-90, 90),
		Longitude: RandRange(-180, 180),
		Error:     pb.GeoError_GEO_ERROR_NONE,
	}

	severity := int32(RandRange(0, 100))

	startTs := time.Now().UnixMilli()
	endTs := startTs

	event, err := attack.NewAttackEvent(&attacker, &target, severity, startTs, endTs)
	if err != nil {
		return nil, err
	}

	return event, nil
}
