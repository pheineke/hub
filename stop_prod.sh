#!/bin/bash
echo "Stopping Production Environment..."
docker-compose -p hub -f docker-compose.yml down
