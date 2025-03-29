#!/bin/bash
# .cursor/rules/git-capture-diffs.sh
#
# This script captures git diff information between commits and/or for specified targets
# and creates a machine-readable report in JSON format.
#
# Usage: 
#   ./git-capture-diffs.sh [--commits SHA1 SHA2] [target1] [target2] ...
#
# Options:
#   --commits SHA1 SHA2  Compare changes between two specific commit SHAs
#
# If no targets are specified, the current directory is used.
# The script will create a JSON report at .idea/_gitdiff.json

# Get the root of the git repository
ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "ERR_NOT_GIT_REPO"; exit 1; }
cd "$ROOT" || exit 1

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo "Error: jq is required but not installed. Please install jq."
  exit 1
fi

# Initialize variables
COMPARE_COMMITS=false
COMMIT_FROM=""
COMMIT_TO=""
TARGETS=()

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --commits)
      if [[ $# -lt 3 ]]; then
        echo "Error: --commits requires two SHA arguments"
        exit 1
      fi
      COMPARE_COMMITS=true
      COMMIT_FROM="$2"
      COMMIT_TO="$3"
      shift 3  # Skip past the option and its two values
      ;;
    *)
      TARGETS+=("$1")
      shift
      ;;
  esac
done

# If no targets provided, use current directory
if [ ${#TARGETS[@]} -eq 0 ]; then
  TARGETS=(".")
fi

# Validate commit SHAs if provided
if [ "$COMPARE_COMMITS" = true ]; then
  if ! git rev-parse --verify "$COMMIT_FROM" >/dev/null 2>&1; then
    echo "Error: Invalid commit SHA: $COMMIT_FROM"
    exit 1
  fi
  
  if ! git rev-parse --verify "$COMMIT_TO" >/dev/null 2>&1; then
    echo "Error: Invalid commit SHA: $COMMIT_TO"
    exit 1
  fi
fi

# Validate all targets (both files and directories)
INVALID_TARGETS=()
for target in "${TARGETS[@]}"; do
  if [ ! -e "$target" ]; then
    INVALID_TARGETS+=("$target")
  fi
done

# If there are invalid targets, print them and exit with error
if [ ${#INVALID_TARGETS[@]} -ne 0 ]; then
  echo "Warning: The following targets do not exist: ${INVALID_TARGETS[*]}"
  echo "Continuing with valid targets only..."
  
  # Filter out invalid targets
  VALID_TARGETS=()
  for target in "${TARGETS[@]}"; do
    if [ -e "$target" ]; then
      VALID_TARGETS+=("$target")
    fi
  done
  
  # If no valid targets remain, exit
  if [ ${#VALID_TARGETS[@]} -eq 0 ]; then
    echo "Error: No valid targets to process. Exiting."
    exit 1
  fi
  
  # Replace targets with valid targets
  TARGETS=("${VALID_TARGETS[@]}")
fi

# Function to check if a file is binary
is_binary() {
  if file "$1" | grep -q "text"; then
    return 1  # Not binary (text)
  else
    return 0  # Binary
  fi
}

# Create output file
OUTPUT_FILE=".idea/diffs.json"
TEMP_DIR=$(mktemp -d)
STATUS_FILE="$TEMP_DIR/status.txt"
DIFF_FILE="$TEMP_DIR/diff.txt"
UNTRACKED_LIST="$TEMP_DIR/untracked.txt"
CHANGED_FILES="$TEMP_DIR/changed_files.txt"

# Get git status and diff based on whether we're comparing commits
if [ "$COMPARE_COMMITS" = true ]; then
  # When comparing commits, we don't need the working directory status
  echo "[]" > "$STATUS_FILE"
  
  # Get list of changed files between commits
  git diff --name-only "$COMMIT_FROM" "$COMMIT_TO" -- "${TARGETS[@]}" > "$CHANGED_FILES"
  
  # Get the diff between commits
  git diff "$COMMIT_FROM" "$COMMIT_TO" -- "${TARGETS[@]}" > "$DIFF_FILE"
  
  # No untracked files when comparing commits
  echo "" > "$UNTRACKED_LIST"
else
  # Get git status
  git status --porcelain "${TARGETS[@]}" > "$STATUS_FILE"
  
  # Get git diff
  git diff "${TARGETS[@]}" > "$DIFF_FILE"
  
  # Get untracked files
  git ls-files --others --exclude-standard "${TARGETS[@]}" > "$UNTRACKED_LIST"
fi

# Start building JSON
echo "{" > "$OUTPUT_FILE"
echo "  \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"," >> "$OUTPUT_FILE"
echo "  \"repository\": \"$(git config --get remote.origin.url || echo "unknown")\"," >> "$OUTPUT_FILE"
echo "  \"branch\": \"$(git rev-parse --abbrev-ref HEAD)\"," >> "$OUTPUT_FILE"

# Add commit comparison information if applicable
if [ "$COMPARE_COMMITS" = true ]; then
  echo "  \"comparison\": {" >> "$OUTPUT_FILE"
  echo "    \"from\": \"$COMMIT_FROM\"," >> "$OUTPUT_FILE"
  echo "    \"to\": \"$COMMIT_TO\"" >> "$OUTPUT_FILE"
  echo "  }," >> "$OUTPUT_FILE"
else
  echo "  \"commit\": \"$(git rev-parse HEAD)\"," >> "$OUTPUT_FILE"
fi

echo "  \"targets\": [" >> "$OUTPUT_FILE"

# Add targets as JSON array
for i in "${!TARGETS[@]}"; do
  if [ $i -eq $((${#TARGETS[@]}-1)) ]; then
    echo "    \"${TARGETS[$i]}\"" >> "$OUTPUT_FILE"
  else
    echo "    \"${TARGETS[$i]}\"," >> "$OUTPUT_FILE"
  fi
done
echo "  ]," >> "$OUTPUT_FILE"

# Add status information
echo "  \"status\": [" >> "$OUTPUT_FILE"
if [ -s "$STATUS_FILE" ]; then
  first=true
  while IFS= read -r line; do
    status_code="${line:0:2}"
    file_path="${line:3}"
    
    if [ "$first" = true ]; then
      first=false
    else
      echo "," >> "$OUTPUT_FILE"
    fi
    
    echo -n "    {\"status\": \"$status_code\", \"path\": \"$file_path\"}" >> "$OUTPUT_FILE"
  done < "$STATUS_FILE"
fi
echo "" >> "$OUTPUT_FILE"
echo "  ]," >> "$OUTPUT_FILE"

# Add changed files between commits if comparing commits
if [ "$COMPARE_COMMITS" = true ]; then
  echo "  \"changed_files\": [" >> "$OUTPUT_FILE"
  if [ -s "$CHANGED_FILES" ]; then
    first=true
    while IFS= read -r file; do
      if [ "$first" = true ]; then
        first=false
      else
        echo "," >> "$OUTPUT_FILE"
      fi
      
      echo -n "    \"$file\"" >> "$OUTPUT_FILE"
    done < "$CHANGED_FILES"
  fi
  echo "" >> "$OUTPUT_FILE"
  echo "  ]," >> "$OUTPUT_FILE"
fi

# Add diff information
echo "  \"diff\": $(cat "$DIFF_FILE" | jq -R -s .)," >> "$OUTPUT_FILE"

# Add untracked files
echo "  \"untracked\": [" >> "$OUTPUT_FILE"
if [ -s "$UNTRACKED_LIST" ]; then
  first=true
  while IFS= read -r file; do
    if [ "$first" = true ]; then
      first=false
    else
      echo "," >> "$OUTPUT_FILE"
    fi
    
    # Check if file is binary
    if is_binary "$file"; then
      # For binary files, just include the path and a flag indicating it's binary
      echo -n "    {\"path\": \"$file\", \"is_binary\": true}" >> "$OUTPUT_FILE"
    else
      # For text files, include the content
      file_content=$(cat "$file" 2>/dev/null | jq -R -s .)
      echo -n "    {\"path\": \"$file\", \"is_binary\": false, \"content\": $file_content}" >> "$OUTPUT_FILE"
    fi
  done < "$UNTRACKED_LIST"
fi
echo "" >> "$OUTPUT_FILE"
echo "  ]" >> "$OUTPUT_FILE"

# Close JSON
echo "}" >> "$OUTPUT_FILE"

# Clean up temp files
rm -rf "$TEMP_DIR"

if [ "$COMPARE_COMMITS" = true ]; then
  echo "Git diff report between commits $COMMIT_FROM and $COMMIT_TO created at $OUTPUT_FILE in JSON format"
else
  echo "Git diff report created at $OUTPUT_FILE in JSON format"
fi