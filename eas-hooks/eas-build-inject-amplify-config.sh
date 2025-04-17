#!/usr/bin/env bash
# ./eas-hooks/eas-build-inject-amplify-config.sh

set -e # Exit immediately if a command exits with a non-zero status.
set -x # Print commands and their arguments as they are executed.

echo "EAS Build Hook: Injecting amplify_outputs.json based on AMPLIFY_ENV=${AMPLIFY_ENV}"

# Define the target file path relative to the project root
OUTPUT_FILE_PATH="./amplify_outputs.json"

# Check which environment we are building for
if [[ "$AMPLIFY_ENV" == "dev" ]]; then
  echo "Using DEV configuration."
  # Check if the secret environment variable is set and not empty
  if [[ -z "$AMPLIFY_OUTPUTS_DEV" ]]; then
    echo "Error: AMPLIFY_OUTPUTS_DEV secret is not set or empty." >&2
    exit 1
  fi
  # Write the secret content to the file
  echo "$AMPLIFY_OUTPUTS_DEV" > "$OUTPUT_FILE_PATH"
  echo "Successfully wrote DEV config to $OUTPUT_FILE_PATH"

elif [[ "$AMPLIFY_ENV" == "main" ]]; then
  echo "Using MAIN configuration."
  # Check if the secret environment variable is set and not empty
  if [[ -z "$AMPLIFY_OUTPUTS_MAIN" ]]; then
    echo "Error: AMPLIFY_OUTPUTS_MAIN secret is not set or empty." >&2
    exit 1
  fi
  # Write the secret content to the file
  echo "$AMPLIFY_OUTPUTS_MAIN" > "$OUTPUT_FILE_PATH"
  echo "Successfully wrote MAIN config to $OUTPUT_FILE_PATH"

else
  echo "Warning: AMPLIFY_ENV is not set or not recognized ('$AMPLIFY_ENV'). No amplify_outputs.json will be created." >&2
  # Depending on your needs, you might want to exit 1 here if a config is always required
  # exit 1
fi

# Verify the file was created (optional)
if [[ -f "$OUTPUT_FILE_PATH" ]]; then
    echo "Verified $OUTPUT_FILE_PATH exists."
else
    echo "Warning: $OUTPUT_FILE_PATH was not created." >&2
fi

exit 0 # Ensure the hook exits successfully if logic completes