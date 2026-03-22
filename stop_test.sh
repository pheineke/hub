#!/bin/bash
echo "Stopping Test Environment..."
docker-compose -p hub_test -f docker-compose.test.yml down
