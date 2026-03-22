#!/bin/bash
echo "Updating Test Environment..."
docker-compose -p hub_test -f docker-compose.test.yml build
docker-compose -p hub_test -f docker-compose.test.yml up -d
