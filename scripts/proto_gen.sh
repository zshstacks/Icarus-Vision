#!/bin/bash
set -e

echo "=== Icarus Vision - Protobuf Code Generation ==="

PROTO_DIR="shared/proto"
BACKEND_OUT="backend/internal/pb"
FRONTEND_OUT="frontend/src/proto"

# Ensure output directories exist
mkdir -p "$BACKEND_OUT"
mkdir -p "$FRONTEND_OUT"

echo "→ Generating Go code..."
protoc --proto_path="$PROTO_DIR" \
  --go_out="$BACKEND_OUT" \
  --go_opt=paths=source_relative \
  "$PROTO_DIR/threat_vector.proto"

echo "→ Generating TypeScript code (@bufbuild/protoc-gen-es)..."

# Fix: Add frontend's local node_modules bin to PATH
export PATH="$PATH:$(pwd)/frontend/node_modules/.bin"

protoc --proto_path="$PROTO_DIR" \
  --es_out="$FRONTEND_OUT" \
  --es_opt=target=ts \
  --es_opt=import_extension=.ts \
  "$PROTO_DIR/threat_vector.proto"

echo "✅ Protobuf generation completed successfully!"
echo "   Go  → $BACKEND_OUT/threat_vector.pb.go"
echo "   TS  → $FRONTEND_OUT/threat_vector_pb.ts"