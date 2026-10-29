# ---------- build ----------
FROM golang:1.27-alpine AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
# Fixed path to ./cmd/server
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/icarus ./cmd/server

# ---------- runtime ----------
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata \
 && addgroup -S icarus && adduser -S icarus -G icarus

WORKDIR /app

COPY --from=builder /out/icarus /app/icarus
COPY --from=builder /src/migrations /app/migrations

USER icarus

EXPOSE 8080

ENTRYPOINT ["/app/icarus"]