#!/bin/bash
set -e

BUCKET="neo4j-browser-monific"
REGION="us-east-2"
FILE="dist.zip"

if [ ! -f "$FILE" ]; then
  echo "Error: $FILE not found in $(pwd)"
  exit 1
fi

echo "Deleting existing $FILE from s3://$BUCKET..."
aws s3 rm "s3://$BUCKET/$FILE" --region "$REGION" 2>/dev/null || true

echo "Uploading $FILE to s3://$BUCKET..."
aws s3 cp "$FILE" "s3://$BUCKET/$FILE" --region "$REGION"

echo "Deploy complete: s3://$BUCKET/$FILE"
