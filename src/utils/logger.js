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

// WiFi-specific logging functions
export const logWifiStatus = (status) => {
  const message = `WiFi Status: ${status}`;
  const formattedMessage = formatLogMessage(LogLevel.INFO, message);
  console.log(formattedMessage);
  return formattedMessage;
};

export const logWifiError = (operation, error) => {
  let errorMessage = `WiFi ${operation} failed`;
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

export const logInitialization = (step, success = true, details = '') => {
  const status = success ? 'SUCCESS' : 'FAILED';
  const message = `Initialization ${step}: ${status}${details ? ` - ${details}` : ''}`;
  const level = success ? LogLevel.INFO : LogLevel.ERROR;
  const formattedMessage = formatLogMessage(level, message);
  
  if (success) {
    console.log(formattedMessage);
  } else {
    console.error(formattedMessage);
  }
  
  return formattedMessage;
};

// Log categorization helper
export const categorizeError = (error) => {
  if (!error) return 'UNKNOWN';
  
  const errorMessage = (error.message || error.toString()).toLowerCase();
  
  if (errorMessage.includes('wifi') || errorMessage.includes('wi-fi')) {
    return 'WIFI_ERROR';
  }
  
  if (errorMessage.includes('permission')) {
    return 'PERMISSION_ERROR';
  }
  
  if (errorMessage.includes('initialization') || errorMessage.includes('initialize')) {
    return 'INITIALIZATION_ERROR';
  }
  
  if (errorMessage.includes('discovery') || errorMessage.includes('peer')) {
    return 'DISCOVERY_ERROR';
  }
  
  if (errorMessage.includes('connection') || errorMessage.includes('connect')) {
    return 'CONNECTION_ERROR';
  }
  
  return 'GENERAL_ERROR';
};

// Enhanced error logging with categorization
export const logCategorizedError = (message, error) => {
  const category = categorizeError(error);
  const enhancedMessage = `[${category}] ${message}`;
  return logError(enhancedMessage, error);
};
