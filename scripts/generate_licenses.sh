#!/bin/bash

NOTICE_FILE="./NOTICE.txt"
NOTICE_FILE_XML="./NOTICE.xml"
LICENSES_FILE="./LICENSES.txt"

# Generate NOTICE.txt with list of dependencies and their license
# Limit to runtime dependencies
cat ./scripts/static_data/NOTICE_HEADER.txt > $NOTICE_FILE && pnpm licenses list --prod --filter . >> $NOTICE_FILE;
cat ./scripts/static_data/NOTICE_XML_HEADER.txt > $NOTICE_FILE_XML && pnpm licenses list --prod --filter . --json | node ./scripts/generate_licenses_xml.js >> $NOTICE_FILE_XML;

# Generate LICENSES.txt with list of full text version of the licenses that dependecies use
# Limit to runtime licenses
cat ./scripts/static_data/LICENSES_HEADER.txt > $LICENSES_FILE && pnpm licenses list --prod --filter . --json | node ./scripts/generate_licenses_disclaimer.js >> $LICENSES_FILE;

exit 0;
