#!/bin/bash
# Run the Homey app with file logging enabled

# Set up log directory and files
LOG_DIR="$(pwd)/logs"
TERMINAL_LOG="$LOG_DIR/terminal.log"
DEBUG_LOG="$LOG_DIR/debug.log"
APP_LOG="$LOG_DIR/app.log"
EXCEPTIONS_LOG="$LOG_DIR/exceptions.log"
WARNINGS_LOG="$LOG_DIR/warnings.log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Set the environment variable to force file logging
export FORCE_FILE_LOGGING=true

# First, run our test script to verify file logging is working
echo "Running file logging test..."
node test-file-logging.js

# Create a function to display log files
show_logs() {
  local log_file="$1"
  local lines="${2:-10}"
  
  echo ""
  echo "--- Last $lines lines of $(basename "$log_file") ---"
  if [ -f "$log_file" ]; then
    tail -n "$lines" "$log_file"
  else
    echo "Log file does not exist: $log_file"
  fi
  echo "--------------------------------"
}

# Ask the user if they want to continue with running the Homey app
read -p "Do you want to run the Homey app with file logging enabled? (y/n): " choice
if [[ "$choice" =~ ^[Yy]$ ]]; then
  # Set up timestamp for this run
  TIMESTAMP=$(date +"%Y-%m-%dT%H:%M:%S")
  echo "==============================" | tee -a "$TERMINAL_LOG"
  echo "Starting Homey app run at $TIMESTAMP" | tee -a "$TERMINAL_LOG"
  echo "==============================" | tee -a "$TERMINAL_LOG"
  
  # Run the Homey app with file logging enabled AND capture terminal output
  echo "Running Homey app with file logging enabled..."
  homey app run 2>&1 | tee -a "$TERMINAL_LOG"
  
  # After the app stops, show log summary
  echo "" | tee -a "$TERMINAL_LOG"
  echo "==============================" | tee -a "$TERMINAL_LOG"
  echo "Homey app run completed at $(date +"%Y-%m-%dT%H:%M:%S")" | tee -a "$TERMINAL_LOG"
  echo "==============================" | tee -a "$TERMINAL_LOG"
  
  # Show logs
  echo ""
  echo "=== LOG SUMMARY ==="
  
  # Show terminal log
  show_logs "$TERMINAL_LOG" 20
  
  # Show other logs
  show_logs "$APP_LOG" 10
  show_logs "$DEBUG_LOG" 10
  show_logs "$EXCEPTIONS_LOG" 10
  show_logs "$WARNINGS_LOG" 10
  
  echo ""
  echo "Log files are located at:"
  echo "- Terminal Log: $TERMINAL_LOG"
  echo "- App Log: $APP_LOG" 
  echo "- Debug Log: $DEBUG_LOG" 
  echo "- Warnings Log: $WARNINGS_LOG"
  echo "- Exceptions Log: $EXCEPTIONS_LOG"
else
  echo "Skipping Homey app run."
fi

# Clean up
unset FORCE_FILE_LOGGING

echo ""
echo "You can view the full terminal log with:"
echo "less $TERMINAL_LOG"