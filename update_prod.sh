#!/bin/bash
echo "Updating Production Environment..."
docker-compose -p hub -f docker-compose.yml build
docker-compose -p hub -f docker-compose.yml up -d
