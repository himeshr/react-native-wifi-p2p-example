/**
 * Logger utility functions for WiFi P2P app
 */

// Timestamp format for logs
const getTimestamp = () => {
  return new Date().toISOString().substr(11, 8); // HH:MM:SS format
};

// Log levels
export const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
};

// Format log message with timestamp and level
export const formatLogMessage = (level, message) => {
  return `${getTimestamp()} [${level}] ${message}`;
};

// Logging functions
export const logDebug = (message) => {
  const formattedMessage = formatLogMessage(LogLevel.DEBUG, message);
  console.log(formattedMessage);
  return formattedMessage;
};

export const logInfo = (message) => {
  const formattedMessage = formatLogMessage(LogLevel.INFO, message);
  console.log(formattedMessage);
  return formattedMessage;
};

export const logWarning = (message) => {
  const formattedMessage = formatLogMessage(LogLevel.WARNING, message);
  console.warn(formattedMessage);
  return formattedMessage;
};

export const logError = (message, error) => {
  let errorMessage = message;
  if (error) {
    if (typeof error === 'object') {
      errorMessage += `: ${error.message || JSON.stringify(error)}`;
    } else {
      errorMessage += `: ${error}`;
    }
  }
  const formattedMessage = formatLogMessage(LogLevel.ERROR, errorMessage);
  console.error(formattedMessage);
  return formattedMessage;
};
