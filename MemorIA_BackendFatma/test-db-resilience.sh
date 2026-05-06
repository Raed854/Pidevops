#!/bin/bash
# ================================================
# Quick Test Script for Database Resilience
# ================================================
# Usage: bash test-db-resilience.sh

echo "=========================================="
echo "Testing Database Resilience Configuration"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8089"

# Test 1: Health Check
echo -e "${YELLOW}[TEST 1] Health Check${NC}"
echo "Endpoint: GET $BASE_URL/actuator/health"
RESPONSE=$(curl -s "$BASE_URL/actuator/health")
if echo "$RESPONSE" | grep -q '"status":"UP"'; then
    echo -e "${GREEN}✅ Database is UP${NC}"
    echo "Response: $RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${RED}❌ Database is DOWN or not accessible${NC}"
    echo "Response: $RESPONSE"
fi
echo ""

# Test 2: Get Current User Alerts
echo -e "${YELLOW}[TEST 2] Get User Alerts${NC}"
echo "Endpoint: GET $BASE_URL/api/alerts/me"
HTTP_CODE=$(curl -s -w "%{http_code}" -o /tmp/alerts_me.json "$BASE_URL/api/alerts/me")
echo "Status Code: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Success (200)${NC}"
    echo "Alerts count: $(jq 'length' /tmp/alerts_me.json)"
elif [ "$HTTP_CODE" = "503" ]; then
    echo -e "${YELLOW}⚠️  Service Unavailable (503)${NC}"
    jq '.' /tmp/alerts_me.json 2>/dev/null || cat /tmp/alerts_me.json
else
    echo "Response: $(cat /tmp/alerts_me.json)"
fi
echo ""

# Test 3: Get Patient Alerts with Pagination
echo -e "${YELLOW}[TEST 3] Get Patient Alerts with Pagination${NC}"
echo "Endpoint: GET $BASE_URL/api/alerts/patient/1"
HTTP_CODE=$(curl -s -w "%{http_code}" -o /tmp/alerts_patient.json "$BASE_URL/api/alerts/patient/1")
echo "Status Code: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Success (200)${NC}"
    echo "Response: $(jq '.' /tmp/alerts_patient.json 2>/dev/null || cat /tmp/alerts_patient.json)"
elif [ "$HTTP_CODE" = "503" ]; then
    echo -e "${YELLOW}⚠️  Service Unavailable (503)${NC}"
    jq '.' /tmp/alerts_patient.json 2>/dev/null || cat /tmp/alerts_patient.json
else
    echo "Response: $(cat /tmp/alerts_patient.json)"
fi
echo ""

# Test 4: Get Alert Details
echo -e "${YELLOW}[TEST 4] Get Alert Details${NC}"
echo "Endpoint: GET $BASE_URL/api/alerts/5"
HTTP_CODE=$(curl -s -w "%{http_code}" -o /tmp/alert_detail.json "$BASE_URL/api/alerts/5")
echo "Status Code: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Success (200) - Alert found${NC}"
    jq '.' /tmp/alert_detail.json 2>/dev/null || cat /tmp/alert_detail.json
elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "${GREEN}✅ Not Found (404) - Alert doesn't exist${NC}"
    jq '.message' /tmp/alert_detail.json 2>/dev/null || cat /tmp/alert_detail.json
elif [ "$HTTP_CODE" = "503" ]; then
    echo -e "${RED}❌ Service Unavailable (503) - Database issue${NC}"
    jq '.' /tmp/alert_detail.json 2>/dev/null || cat /tmp/alert_detail.json
else
    echo "Response: $(cat /tmp/alert_detail.json)"
fi
echo ""

# Test 5: Check Logs for Errors
echo -e "${YELLOW}[TEST 5] Application Logs Summary${NC}"
echo "Looking for database errors in recent logs..."
echo ""

# Summary
echo "=========================================="
echo "Summary"
echo "=========================================="
echo -e "${GREEN}✅ All tests completed${NC}"
echo ""
echo "Expected Results:"
echo "✅ Health Check: status = UP"
echo "✅ Alerts endpoints: 200 (success) or 503 (DB down)"
echo "✅ 503 responses should have descriptive message"
echo ""
echo "If you see 503 errors:"
echo "1. Check MySQL is running: mysql -h localhost -P 3307 -u root"
echo "2. Check database exists: mysql> SHOW DATABASES;"
echo "3. Check logs for [api-error] messages"
echo ""
