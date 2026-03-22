#!/bin/bash
echo "Starting Test Environment on port 9929..."
docker-compose -p hub_test -f docker-compose.test.yml up -d
