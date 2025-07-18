/**
 * WiFi P2P Demo App with Improved UI
 */

import React, {Component} from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  PermissionsAndroid,
  Platform,
  Alert,
  ToastAndroid,
} from 'react-native';

// Import WiFi P2P functions from the library
import {
  initialize,
  startDiscoveringPeers,
  stopDiscoveringPeers,
  unsubscribe,
  subscribeOnPeersUpdates,
  subscribeOnConnectionInfoUpdates,
  connect,
  disconnect,
  removeGroup,
  getAvailablePeers,
  sendMessage,
  receiveMessage,
  getConnectionInfo,
  getGroupInfo,
} from 'react-native-wifi-p2p';

// Import custom components
import DeviceList from './components/DeviceList';
import ConnectionStatus from './components/ConnectionStatus';
import DiscoveryControls from './components/DiscoveryControls';
import LogsPanel from './components/LogsPanel';
import MessageInput from './components/MessageInput';
import MessageList from './components/MessageList';
import FetchMessagesButton from './components/FetchMessagesButton';

// Import utilities
import {logDebug, logInfo, logError, logWarning} from './utils/logger';
import {styles} from './styles/styles';

class App extends Component {
  // Subscription references for cleanup
  peersUpdatesSubscription = null;
  connectionInfoUpdatesSubscription = null;
  discoveryInterval = null;

  state = {
    // Connection state
    isInitialized: false,
    isDiscovering: false,
    isConnecting: false,

    // Device info
    devices: [],
    selectedDevice: null,
    connectionInfo: null,
    thisDevice: null,

    // Logs for debugging
    logs: [],

    // Message handling
    messages: [],
    receivingMessages: false,
    isSendingMessage: false, // Track when a message is being sent
    isFetchingMessages: false,

    // Group info
    groupInfo: null,

    // File transfer
    selectedFile: null,
    receivedFile: null,
  };

  componentDidMount = async () => {
    this.addLog('App starting - Initializing WiFi P2P');

    try {
      this.addLog('Initializing Wi-Fi P2P module...');
      await initialize();
      this.addLog('WiFi P2P initialized successfully');

      // Request permissions first before setting up other WiFi P2P functionality
      await this.requestRequiredPermissions();

      // Continue with WiFi P2P initialization after permissions are granted
      this.initializeWifiP2p();
    } catch (error) {
      this.addLog(`Failed to initialize WiFi P2P: ${error.message || error}`);
      console.error('Failed to initialize WiFi P2P:', error);
    }
  };

  componentWillUnmount() {
    // Clean up all subscriptions and intervals
    if (this.peersUpdatesSubscription) {
      this.peersUpdatesSubscription.remove();
    }

    if (this.connectionInfoUpdatesSubscription) {
      this.connectionInfoUpdatesSubscription.remove();
    }

    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }

    // Stop discovering peers when component unmounts
    stopDiscoveringPeers().catch(err =>
      this.addLog(`Error stopping peer discovery: ${err}`),
    );

    unsubscribe && unsubscribe();
    this.addLog('App cleanup complete');
  }

  // Initialize WiFi P2P functionality
  initializeWifiP2p = async () => {
    try {
      this.addLog('Initializing Wi-Fi P2P...');
      await initialize();
      this.addLog('Wi-Fi P2P initialized successfully');

      // Request necessary permissions for Android
      await this.requestRequiredPermissions();

      // Set up subscriptions
      this.setupSubscriptions();

      this.setState({isInitialized: true});

      // After initialization, check connection info
      this.getConnectionInformation();
    } catch (error) {
      this.addLog(`Wi-Fi P2P initialization error: ${error}`);
      Alert.alert(
        'Initialization Error',
        'Failed to initialize Wi-Fi P2P. Please ensure Wi-Fi is enabled.',
        [{text: 'OK'}],
      );
    }
  };

  // Request all necessary permissions
  requestRequiredPermissions = async () => {
    try {
      this.addLog('Requesting required permissions...');

      if (Platform.OS === 'android') {
        // For Android 10+ we need different permissions
        const locationPermissions = [
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];

        // Add storage permissions
        const storagePermissions = [
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ];

        // Add NEARBY_WIFI_DEVICES permission for Android 13+
        let wifiPermissions = [];
        if (Platform.Version >= 33) {
          try {
            wifiPermissions = [
              PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES,
            ];
            this.addLog('Added NEARBY_WIFI_DEVICES permission for Android 13+');
          } catch (error) {
            this.addLog(
              `Warning: NEARBY_WIFI_DEVICES permission not available in this React Native version: ${error}`,
            );
          }
        }

        // First check if we already have the permissions
        let missingPermissions = [];
        const allPermissions = [
          ...locationPermissions,
          ...storagePermissions,
          ...wifiPermissions,
        ];

        // Check each permission
        for (const permission of allPermissions) {
          try {
            const hasPermission = await PermissionsAndroid.check(permission);
            if (!hasPermission) {
              missingPermissions.push(permission);
            } else {
              this.addLog(`Already have permission: ${permission}`);
            }
          } catch (error) {
            this.addLog(`Error checking permission ${permission}: ${error}`);
            // Still add to missing to be safe
            missingPermissions.push(permission);
          }
        }

        // Show what permissions we're missing
        this.addLog(`Missing ${missingPermissions.length} permissions`);

        // Request missing permissions
        if (missingPermissions.length > 0) {
          // Request all permissions at once for better UX
          try {
            const results = await PermissionsAndroid.requestMultiple(
              missingPermissions,
            );

            // Check the results
            const deniedPermissions = Object.entries(results)
              .filter(
                ([_, value]) => value !== PermissionsAndroid.RESULTS.GRANTED,
              )
              .map(([key]) => key);

            // Log the results
            for (const [permission, result] of Object.entries(results)) {
              this.addLog(`Permission ${permission}: ${result}`);
            }

            // Show warning if critical permissions denied
            if (deniedPermissions.length > 0) {
              this.addLog('WARNING: Some critical permissions were denied');
              Alert.alert(
                'Permission Required',
                'WiFi P2P functionality requires location and WiFi permissions. ' +
                  'Please grant these permissions in Settings to use these features.',
                [{text: 'OK'}],
              );
            }
          } catch (error) {
            this.addLog(`Error requesting permissions: ${error}`);
            Alert.alert(
              'Permission Error',
              'Could not request permissions: ' + error.message,
              [{text: 'OK'}],
            );
          }
        }
      }
    } catch (error) {
      this.addLog(`Permission request error: ${error}`);
    }
  };

  // Set up event subscriptions
  setupSubscriptions = () => {
    this.addLog('Setting up P2P subscriptions...');

    // Subscribe to peer updates
    this.peersUpdatesSubscription = subscribeOnPeersUpdates(({devices}) => {
      this.addLog(`Peers updated: ${devices.length} devices found`);

      if (devices && devices.length > 0) {
        const deviceList = JSON.stringify(devices);
        this.addLog(`Devices found: ${deviceList}`);

        // Alert user when devices are found
        if (this.state.devices.length === 0 && devices.length > 0) {
          ToastAndroid.show(
            `${devices.length} peer device(s) found!`,
            ToastAndroid.SHORT,
          );
        }
      }

      this.setState({devices: devices || []});
    });

    // Subscribe to connection info updates
    this.connectionInfoUpdatesSubscription = subscribeOnConnectionInfoUpdates(
      info => {
        this.addLog(`Connection info updated: ${JSON.stringify(info)}`);
        this.setState({connectionInfo: info});

        // If we're connected, stop discovery
        if (info && info.groupFormed) {
          this.stopDiscovery();
        }
      },
    );
  };

  // Get current connection information
  getConnectionInformation = async () => {
    try {
      const connectionInfo = await getConnectionInfo();
      this.addLog(`Current connection info: ${JSON.stringify(connectionInfo)}`);
      this.setState({connectionInfo});

      // Get group info if available
      try {
        const groupInfo = await getGroupInfo();
        this.addLog(`Group info: ${JSON.stringify(groupInfo)}`);
        this.setState({groupInfo});

        // Update thisDevice with owner information if available
        if (groupInfo && groupInfo.owner) {
          this.setState({thisDevice: groupInfo.owner});
        }

        // If connected and not already receiving messages, start receiving
        if (
          connectionInfo &&
          connectionInfo.groupFormed &&
          !this.state.receivingMessages
        ) {
          this.startReceivingMessages();
        }
      } catch (groupError) {
        this.addLog(`Could not get group info: ${groupError}`);
      }
    } catch (error) {
      this.addLog(`Error getting connection info: ${error}`);
    }
  };

  // Start peer discovery
  startDiscovery = async () => {
    try {
      this.addLog('Starting peer discovery...');

      // First stop any existing discovery
      await stopDiscoveringPeers().catch(() => {});

      const status = await startDiscoveringPeers();
      this.addLog(`Peer discovery started: ${status}`);

      this.setState({isDiscovering: true});

      // Show message to user
      ToastAndroid.show('Searching for nearby devices...', ToastAndroid.SHORT);

      // Set up recurring discovery for better reliability
      if (this.discoveryInterval) {
        clearInterval(this.discoveryInterval);
      }

      this.discoveryInterval = setInterval(() => {
        this.refreshPeerList();
      }, 10000); // Every 10 seconds

      // After starting discovery, check for available peers
      setTimeout(() => {
        this.refreshPeerList();
      }, 2000);
    } catch (error) {
      this.addLog(`Peer discovery failed: ${error}`);
      ToastAndroid.show('Failed to start discovery', ToastAndroid.SHORT);
    }
  };

  // Stop peer discovery
  stopDiscovery = async () => {
    try {
      this.addLog('Stopping peer discovery...');

      const status = await stopDiscoveringPeers();
      this.addLog(`Peer discovery stopped: ${status}`);

      // Clear discovery interval
      if (this.discoveryInterval) {
        clearInterval(this.discoveryInterval);
        this.discoveryInterval = null;
      }

      this.setState({isDiscovering: false});
    } catch (error) {
      this.addLog(`Stop discovery failed: ${error}`);
    }
  };

  // Refresh the list of peers
  refreshPeerList = async () => {
    try {
      const {devices} = await getAvailablePeers();
      this.addLog(`Available peers refreshed: ${devices.length} devices`);
      this.setState({devices: devices || []});
    } catch (error) {
      this.addLog(`Error refreshing peers: ${error}`);
    }
  };

  // Connect to selected device with retry logic
  connectToDevice = async () => {
    const {selectedDevice} = this.state;
    const MAX_RETRIES = 3;
    let retryCount = 0;
    let connected = false;

    if (!selectedDevice) {
      this.addLog('Cannot connect: No device selected');
      return;
    }

    // Set connecting state
    this.setState({isConnecting: true});

    try {
      this.addLog(
        `Connecting to device: ${
          selectedDevice.deviceName || selectedDevice.deviceAddress
        }`,
      );

      ToastAndroid.show(
        `Connecting to ${selectedDevice.deviceName || 'device'}...`,
        ToastAndroid.SHORT,
      );

      // Connection attempt with retries
      while (retryCount < MAX_RETRIES && !connected) {
        try {
          if (retryCount > 0) {
            this.addLog(
              `Retrying connection (attempt ${retryCount + 1}/${MAX_RETRIES})`,
            );
            ToastAndroid.show(
              `Retrying connection (${retryCount + 1}/${MAX_RETRIES})...`,
              ToastAndroid.SHORT,
            );
          }

          // Attempt to connect
          const status = await connect(selectedDevice.deviceAddress);
          this.addLog(`Connection attempt result: ${status}`);

          // Update connection info
          await this.getConnectionInformation();

          // Check if we're now connected
          if (
            this.state.connectionInfo &&
            this.state.connectionInfo.groupFormed
          ) {
            connected = true;
            break;
          } else {
            // Wait a bit before retrying
            if (retryCount < MAX_RETRIES - 1) {
              this.addLog('Connection not formed yet, waiting before retry...');
              await new Promise(resolve => setTimeout(resolve, 1500));
            }
          }
        } catch (attemptError) {
          this.addLog(
            `Connection attempt ${retryCount + 1} error: ${attemptError}`,
          );
          // Continue to next retry
        }

        retryCount++;
      }

      // Show final result to user
      if (connected) {
        this.addLog(
          'Connection established successfully after ' +
            (retryCount + 1) +
            ' attempt(s)',
        );
        ToastAndroid.show('Connected successfully!', ToastAndroid.SHORT);

        // Start receiving messages
        this.startReceivingMessages();
      } else {
        this.addLog(
          'Failed to establish connection after ' + MAX_RETRIES + ' attempts',
        );
        ToastAndroid.show(
          `Failed to connect after ${MAX_RETRIES} attempts`,
          ToastAndroid.LONG,
        );
      }
    } catch (error) {
      this.addLog(`Connection error: ${error}`);
      ToastAndroid.show(
        `Connection failed: ${error.message || error}`,
        ToastAndroid.LONG,
      );
    } finally {
      // Always reset the connecting state
      this.setState({isConnecting: false});
    }
  };

  // Disconnect from current connection
  disconnectFromDevice = async () => {
    try {
      this.addLog('Disconnecting from device...');

      // Stop receiving messages
      if (this.state.receivingMessages) {
        this.stopReceivingMessages();
      }

      try {
        // Try to disconnect first
        const status = await disconnect();
        this.addLog(`Disconnect result: ${status}`);
      } catch (discError) {
        this.addLog(
          `Disconnect command failed: ${discError}, trying removeGroup next`,
        );
      }

      // Always attempt to remove group as well
      try {
        const removeStatus = await removeGroup();
        this.addLog(`Remove group result: ${removeStatus}`);
      } catch (removeError) {
        this.addLog(`Error removing group: ${removeError}`);
      }

      // Reset connection state
      this.setState({
        connectionInfo: null,
        isConnecting: false,
        receivingMessages: false,
      });

      // Update connection info after a short delay to ensure disconnect has processed
      setTimeout(async () => {
        await this.getConnectionInformation();
        ToastAndroid.show('Disconnected', ToastAndroid.SHORT);
      }, 1000);
    } catch (error) {
      this.addLog(`Disconnect error: ${error}`);
      ToastAndroid.show(
        `Disconnect failed: ${error.message || error}`,
        ToastAndroid.SHORT,
      );

      // Always make sure to reset connecting state even on error
      this.setState({isConnecting: false});

      // Still try to update connection info
      await this.getConnectionInformation();
    }
  };

  // Handle device selection
  handleDeviceSelect = device => {
    this.addLog(
      `Selected device: ${device.deviceName || device.deviceAddress}`,
    );
    this.setState({selectedDevice: device});
  };

  // Add log message
  addLog = message => {
    this.setState(prevState => ({
      logs: [...prevState.logs, message],
    }));
  };

  // Clear logs
  clearLogs = () => {
    this.setState({logs: []});
  };

  // Send a message to the connected peer
  sendMessageToPeer = async message => {
    const {connectionInfo} = this.state;

    // Debug information
    console.log('sendMessageToPeer called with:', message);
    console.log('Current connectionInfo:', connectionInfo);

    if (!connectionInfo || !connectionInfo.groupFormed) {
      const errorMsg = 'Cannot send message: Not connected';
      console.warn(errorMsg);
      this.addLog(errorMsg);
      ToastAndroid.show(errorMsg, ToastAndroid.SHORT);
      return;
    }

    // Set sending state to true to block UI
    this.setState({isSendingMessage: true});
    this.addLog('Setting isSendingMessage to true to block UI');
    console.log('Message sending started - blocking UI');

    try {
      this.addLog(`Sending message: ${message}`);
      console.log(`Attempting to send message: ${message}`);

      // Ensure message is a string
      const messageToSend = String(message);
      console.log(
        `Message converted to string, length: ${messageToSend.length}`,
      );

      // Using the promise-based approach similar to AppOld1.js
      this.addLog('Sending message via sendMessage');

      // Use the imported sendMessage function with proper promise handling
      await sendMessage(messageToSend)
        .then(metaInfo => {
          console.log('Message sent successfully', metaInfo);
          this.addLog(`Send operation successful: ${JSON.stringify(metaInfo)}`);
        })
        .catch(err => {
          throw err; // Re-throw to be caught by the outer catch
        });

      console.log('sendMessage call completed successfully');
      this.addLog('Network send operation completed');

      // Add to local messages
      const timestamp = new Date().toLocaleTimeString();
      this.setState(prevState => ({
        messages: [
          ...prevState.messages,
          {
            text: message,
            time: timestamp,
            isSent: true,
          },
        ],
        isSendingMessage: false, // Unblock UI now that send is complete
      }));

      console.log('Message added to state successfully and UI unblocked');
      this.addLog('Message sent successfully and UI unblocked');
      ToastAndroid.show('Message sent', ToastAndroid.SHORT);
    } catch (error) {
      const errorMsg = `Failed to send message: ${error.message || error}`;
      console.error('Error in sendMessageToPeer:', error);
      console.log('Error details:', JSON.stringify(error));
      this.addLog(errorMsg);
      ToastAndroid.show(errorMsg, ToastAndroid.LONG);

      // The isSendingMessage will be reset in the finally block
    } finally {
      // Ensure UI is always unblocked even if there's an error
      console.log('Message send operation completed (success or failure)');
      this.addLog('Message operation completed');

      // Always make sure to unblock the UI even if there was an error
      this.setState({isSendingMessage: false});
      this.addLog('UI unblocked after send error');
    }
  };

  // Start receiving messages
  startReceivingMessages = async () => {
    try {
      if (this.state.receivingMessages) {
        this.addLog('Already receiving messages');
        return;
      }

      this.addLog('Starting to receive messages...');
      console.log('Setting up message receiver...');

      // Check connection info before receiving
      const connInfo = await getConnectionInfo();
      console.log('Connection info before receiving:', connInfo);

      // Verify we're connected before trying to receive
      if (!connInfo || !connInfo.groupFormed) {
        const errorMsg = 'Cannot receive messages: not connected to any device';
        this.addLog(errorMsg);
        ToastAndroid.show(errorMsg, ToastAndroid.SHORT);
        return;
      }

      // Update state to indicate we're now receiving
      this.setState({receivingMessages: true});
      this.addLog('Message receiver activated');

      // Call the function to listen for messages
      this.listenForNextMessage();
    } catch (error) {
      this.addLog(`Error starting message receiver: ${error}`);
      console.error('Error in startReceivingMessages:', error);
      this.setState({receivingMessages: false});
    }
  };

  // Listen for a single message and then listen for the next one
  // This follows the library's one-message-at-a-time design as per documentation
  listenForNextMessage = () => {
    // Abort if we're not in receiving mode anymore
    if (!this.state.receivingMessages) {
      console.log('Not in receiving mode, stopping message listener');
      return;
    }

    console.log('Listening for next message...');

    // Call receiveMessage() - per documentation, this listens for ONE message
    receiveMessage()
      .then(message => {
        console.log('RECEIVED MESSAGE FROM PEER:', message);

        if (message && typeof message === 'string') {
          this.addLog(`Received message: ${message}`);

          // Add to messages list
          const timestamp = new Date().toLocaleTimeString();
          this.setState(prevState => ({
            messages: [
              ...prevState.messages,
              {
                text: message,
                time: timestamp,
                isSent: false,
              },
            ],
          }));

          // Show notification
          ToastAndroid.show('New message received', ToastAndroid.SHORT);
        } else {
          console.log('Received invalid message format:', message);
          this.addLog(`Received invalid message format: ${typeof message}`);
        }

        // Continue listening for the next message if still in receiving mode
        if (this.state.receivingMessages) {
          setTimeout(() => {
            this.listenForNextMessage();
          }, 300); // Short delay between messages
        }
      })
      .catch(err => {
        console.log('Error receiving message:', err);
        this.addLog(`Error receiving message: ${err}`);

        // Try again with a longer delay if we're still in receiving mode
        if (this.state.receivingMessages) {
          setTimeout(() => {
            this.listenForNextMessage();
          }, 1000); // Longer delay after an error
        }
      });
  };

  // Stop receiving messages
  stopReceivingMessages = () => {
    try {
      this.addLog('Stopping message receiving');

      // If we're not currently receiving, just return
      if (!this.state.receivingMessages) {
        console.log('Not currently receiving messages, nothing to stop');
        return;
      }

      // There's no explicit method to stop a listener in the library,
      // but we can update our state to prevent adding more messages
      this.setState({receivingMessages: false});

      // Just to be safe, unsubscribe and resubscribe to our connection info
      // to disrupt any active listeners
      try {
        if (this.connectionInfoUpdatesSubscription) {
          this.connectionInfoUpdatesSubscription.remove();
          this.connectionInfoUpdatesSubscription =
            subscribeOnConnectionInfoUpdates(this.handleNewInfo);
          console.log('Reset connection info subscription');
        }
      } catch (subError) {
        console.warn('Error resetting subscriptions:', subError);
      }

      console.log('Message receiving stopped');
      this.addLog('Message receiving stopped successfully');
    } catch (error) {
      console.error('Error stopping message receiving:', error);
      this.addLog(`Error stopping message receiving: ${error}`);
    }
  };

  // Manually fetch messages
  fetchMessages = async () => {
    try {
      this.addLog('Starting message fetch operation...');
      this.setState({isFetchingMessages: true});
      console.log('Fetching messages from connected peers');

      // Check if we are connected first
      const connInfo = await getConnectionInfo();
      console.log('Connection info before fetching messages:', connInfo);
      this.addLog(
        `Connection status: ${
          connInfo?.groupFormed ? 'Connected' : 'Not connected'
        }`,
      );

      if (!connInfo || !connInfo.groupFormed) {
        throw new Error('Cannot fetch messages: not connected');
      }

      // First ensure any existing receivers are stopped
      this.stopReceivingMessages();

      // Then start the receiver again
      // This will use our clean implementation to continuously receive messages
      this.startReceivingMessages();

      // Feedback to user
      ToastAndroid.show('Actively listening for messages', ToastAndroid.SHORT);
    } catch (error) {
      const errorMsg = `Failed to fetch messages: ${error.message || error}`;
      console.error('Error in fetchMessages:', error);
      this.addLog(errorMsg);
      ToastAndroid.show(errorMsg, ToastAndroid.LONG);
    } finally {
      this.setState({isFetchingMessages: false});
      console.log('Message fetch operation completed');
      this.addLog('Message fetch operation completed');
    }
  };

  render() {
    const {
      devices,
      isDiscovering,
      selectedDevice,
      connectionInfo,
      thisDevice,
      logs,
      messages,
      groupInfo,
    } = this.state;

    const isConnected = connectionInfo && connectionInfo.groupFormed;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <Text style={styles.title}>WiFi P2P Demo</Text>

          {/* Connection Status */}
          <ConnectionStatus
            isConnected={isConnected}
            connectionInfo={connectionInfo}
            thisDevice={thisDevice}
          />

          {/* Discovery Controls */}
          <DiscoveryControls
            isDiscovering={isDiscovering}
            onStartDiscovery={this.startDiscovery}
            onStopDiscovery={this.stopDiscovery}
            onConnect={this.connectToDevice}
            onDisconnect={this.disconnectFromDevice}
            isConnected={isConnected}
            selectedDevice={selectedDevice}
          />

          {/* Device List */}
          <DeviceList
            devices={devices}
            onDeviceSelect={this.handleDeviceSelect}
            selectedDeviceAddress={selectedDevice?.deviceAddress}
          />

          {/* Message components - only show if connected */}
          {isConnected && (
            <>
              <MessageList messages={messages} />
              <MessageInput
                onSendMessage={this.sendMessageToPeer}
                isConnected={isConnected}
                isSendingMessage={this.state.isSendingMessage}
              />
              <FetchMessagesButton
                onFetchMessages={this.fetchMessages}
                isConnected={isConnected}
                isFetching={this.state.isFetchingMessages}
                receivingMessages={this.state.receivingMessages}
              />
            </>
          )}

          {/* Group Info - only show if connected */}
          {isConnected && groupInfo && (
            <View style={styles.section}>
              <Text style={styles.subtitle}>Group Information</Text>
              {groupInfo.networkName && (
                <Text style={styles.statusText}>
                  Network: {groupInfo.networkName}
                </Text>
              )}
              {groupInfo.passphrase && (
                <Text style={styles.statusText}>
                  Passphrase: {groupInfo.passphrase}
                </Text>
              )}
              {groupInfo.clientList && groupInfo.clientList.length > 0 && (
                <View>
                  <Text style={styles.statusText}>Connected Clients:</Text>
                  {groupInfo.clientList.map((client, idx) => (
                    <Text key={idx} style={styles.clientListItem}>
                      • {client.deviceName || client.deviceAddress}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Logs Panel */}
          <LogsPanel logs={logs} onClearLogs={this.clearLogs} maxLogs={50} />
        </ScrollView>
      </SafeAreaView>
    );
  }
}

export default App;
