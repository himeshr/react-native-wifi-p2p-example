import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
  /* Main Layout */
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#444',
  },

  /* Status Section */
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d0e1f9',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    marginRight: 12,
    flexBasis: '48%',
  },
  connectionIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  connected: {
    backgroundColor: '#4CAF50',
  },
  disconnected: {
    backgroundColor: '#F44336',
  },
  statusText: {
    fontSize: 14,
    color: '#333',
  },
  connectionText: {
    fontWeight: 'bold',
  },
  statusHighlight: {
    color: '#0D47A1',
    fontWeight: 'bold',
  },

  /* Button Styles */
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 12,
    marginVertical: 5,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  buttonDisabled: {
    backgroundColor: '#B0BEC5',
  },

  /* Device List */
  devicesHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 5,
  },
  deviceItem: {
    padding: 12,
    backgroundColor: '#ffffff',
    marginVertical: 5,
    borderRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  deviceItemSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
  },
  deviceItemText: {
    color: '#000',
    fontSize: 14,
  },
  deviceItemTextSelected: {
    fontWeight: 'bold',
    color: '#0D47A1',
  },
  deviceItemEmpty: {
    color: '#555',
    fontStyle: 'italic',
    marginLeft: 10,
    marginVertical: 10,
    textAlign: 'center',
  },

  /* Form Controls */
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
    fontSize: 16,
    color: '#00AA00',
  },
  inputDisabled: {
    backgroundColor: '#f0f0f0',
    color: '#888888',
    borderColor: '#ddd',
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: '500',
    color: '#333',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  /* Messages */
  messageContainer: {
    padding: 10,
    marginVertical: 5,
    borderRadius: 8,
    maxWidth: '80%',
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#bbdefb',
    color: '#00AA00',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#0D47A1',
  },
  messageText: {
    fontSize: 14,
    color: '#0D47A1',
  },
  messageTime: {
    fontSize: 10,
    color: '#757575',
    alignSelf: 'flex-end',
    marginTop: 2,
  },

  /* Logs Panel */
  logsContainer: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 200,
  },
  logText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
  },
  logTime: {
    color: '#757575',
    marginRight: 5,
  },
  logDebug: {
    color: '#2196F3',
  },
  logInfo: {
    color: '#4CAF50',
  },
  logWarning: {
    color: '#FF9800',
  },
  logError: {
    color: '#F44336',
  },
  /* Client List Item */
  clientListItem: {
    marginLeft: 10,
    color: '#0D47A1',
  },
});
