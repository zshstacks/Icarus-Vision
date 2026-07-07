package attack

import (
	"fmt"
	"icarus-vision/internal/pb"

	"github.com/google/uuid"
)

func NewAttackEvent(attackerGeo *pb.GeoPoint, targetGeo *pb.GeoPoint, severity int32, startTs int64, endTs int64) (*pb.AttackEvent, error) {

	if severity > 100 || severity < 0 {
		return nil, fmt.Errorf("invalid severity: %d", severity)
	}

	id := uuid.New().String()

	event := pb.AttackEvent{
		Id:          id,
		AttackerGeo: attackerGeo,
		TargetGeo:   targetGeo,
		Severity:    severity,
		StartTs:     startTs,
		EndTs:       endTs,
	}

	return &event, nil
}
