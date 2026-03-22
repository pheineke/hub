#!/bin/bash
echo "Starting Production Environment on port 9919..."
docker-compose -p hub -f docker-compose.yml up -d
