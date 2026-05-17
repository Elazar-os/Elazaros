#!/bin/bash
# Refresh menu screens to regenerate JSON files from database

echo "Refreshing menu screens..."
curl -X POST http://localhost:5000/api/refresh-screens

echo ""
echo "Done! The static JSON files have been regenerated from the database."
echo "Screens should update within 2 seconds."
