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
  sendMessageTo,
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
import {
  logDebug,
  logInfo,
  logError,
  logWarning,
  logWifiStatus,
  logWifiError,
  logInitialization,
  logCategorizedError,
} from './utils/logger';
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

    // Initialize WiFi P2P only once
    await this.initializeWifiP2p();
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

  // Initialize WiFi P2P functionality (called only once)
  initializeWifiP2p = async () => {
    try {
      // Check if already initialized to prevent multiple initialization
      if (this.state.isInitialized) {
        const logMessage = logInitialization(
          'Check',
          true,
          'Already initialized, skipping',
        );
        this.addLog(logMessage);
        return;
      }

      const startLogMessage = logInitialization(
        'Start',
        true,
        'Beginning WiFi P2P setup',
      );
      this.addLog(startLogMessage);

      // Check WiFi status before initialization
      await this.checkWifiStatus();

      // Initialize WiFi P2P (only once)
      await initialize();
      const initLogMessage = logInitialization(
        'WiFi P2P Module',
        true,
        'Core module initialized',
      );
      this.addLog(initLogMessage);

      // Request necessary permissions for Android
      await this.requestRequiredPermissions();
      const permLogMessage = logInitialization(
        'Permissions',
        true,
        'Required permissions obtained',
      );
      this.addLog(permLogMessage);

      // Set up subscriptions
      this.setupSubscriptions();
      const subLogMessage = logInitialization(
        'Subscriptions',
        true,
        'Event listeners configured',
      );
      this.addLog(subLogMessage);

      this.setState({isInitialized: true});

      // After initialization, check connection info
      this.getConnectionInformation();

      const completeLogMessage = logInitialization(
        'Complete',
        true,
        'WiFi P2P fully initialized',
      );
      this.addLog(completeLogMessage);
    } catch (error) {
      const errorLogMessage = logCategorizedError(
        'WiFi P2P initialization failed',
        error,
      );
      this.addLog(errorLogMessage);

      // Check for specific WiFi errors
      if (this.isWifiNotEnabledError(error)) {
        this.handleWifiNotEnabledError();
      } else {
        Alert.alert(
          'Initialization Error',
          `Failed to initialize Wi-Fi P2P: ${error.message || error}`,
          [{text: 'OK'}],
        );
      }
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

  // Check WiFi status before initialization
  checkWifiStatus = async () => {
    try {
      const checkingMessage = logWifiStatus('Checking WiFi availability...');
      this.addLog(checkingMessage);

      // On Android, we can check if WiFi is enabled
      if (Platform.OS === 'android') {
        // Note: This is a basic check. The actual WiFi P2P module will provide more detailed errors
        const statusMessage = logWifiStatus('Android WiFi check completed');
        this.addLog(statusMessage);
      } else {
        const statusMessage = logWifiStatus('iOS WiFi check completed');
        this.addLog(statusMessage);
      }
    } catch (error) {
      const errorMessage = logWifiError('Status Check', error);
      this.addLog(errorMessage);
      throw new Error(`WiFi not available: ${error.message || error}`);
    }
  };

  // Check if error indicates WiFi is not enabled
  isWifiNotEnabledError = error => {
    if (!error) {
      return false;
    }

    const errorMessage = (error.message || error.toString()).toLowerCase();

    // Common WiFi not enabled error patterns
    const wifiErrorPatterns = [
      'wifi not enabled',
      'wifi is not enabled',
      'wi-fi not enabled',
      'wi-fi is not enabled',
      'wifi disabled',
      'wifi is disabled',
      'wifi p2p not supported',
      'wifi p2p disabled',
      'wifi adapter not found',
      'no wifi adapter',
      'wifi hardware not available',
      'wifi service not available',
    ];

    const isWifiError = wifiErrorPatterns.some(pattern =>
      errorMessage.includes(pattern),
    );

    if (isWifiError) {
      this.addLog(`Detected WiFi not enabled error: ${errorMessage}`);
    }

    return isWifiError;
  };

  // Handle WiFi not enabled error specifically
  handleWifiNotEnabledError = () => {
    this.addLog('Handling WiFi not enabled error');

    Alert.alert(
      'WiFi Not Enabled',
      'WiFi P2P requires WiFi to be enabled on your device. Please enable WiFi in your device settings and try again.',
      [
        {
          text: 'Open Settings',
          onPress: () => {
            this.addLog('User chose to open WiFi settings');
            // On Android, we could potentially open WiFi settings
            if (Platform.OS === 'android') {
              // Note: Opening settings requires additional setup
              ToastAndroid.show(
                'Please enable WiFi in Settings',
                ToastAndroid.LONG,
              );
            }
          },
        },
        {
          text: 'Retry',
          onPress: () => {
            this.addLog('User chose to retry WiFi P2P initialization');
            // Reset initialization state and try again
            this.setState({isInitialized: false});
            setTimeout(() => {
              this.initializeWifiP2p();
            }, 1000);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            this.addLog('User cancelled WiFi initialization');
          },
        },
      ],
    );
  };

  // Check if error is a MAC address error (common in P2P communication)
  isMacAddressError = error => {
    if (!error) {
      return false;
    }

    const errorMessage = (error.message || error.toString()).toLowerCase();

    // MAC address pattern: XX:XX:XX:XX:XX:XX
    const macAddressPattern =
      /^[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}$/i;

    // Check if the error message is just a MAC address
    const isMacError = macAddressPattern.test(errorMessage.trim());

    if (isMacError) {
      this.addLog(`Detected MAC address error: ${errorMessage}`);
    }

    return isMacError;
  };

  // Check if error is a connection-related error
  isConnectionError = error => {
    if (!error) {
      return false;
    }

    const errorMessage = (error.message || error.toString()).toLowerCase();

    const connectionErrorPatterns = [
      'connection refused',
      'connection failed',
      'connection timeout',
      'connection reset',
      'no route to host',
      'network unreachable',
      'socket closed',
      'socket timeout',
      'peer disconnected',
      'connection lost',
      'connection aborted',
    ];

    const isConnError = connectionErrorPatterns.some(pattern =>
      errorMessage.includes(pattern),
    );

    if (isConnError) {
      this.addLog(`Detected connection error: ${errorMessage}`);
    }

    return isConnError;
  };

  // Handle MAC address error specifically
  handleMacAddressError = error => {
    const macAddress = error.message || error.toString();
    this.addLog(`Handling MAC address error: ${macAddress}`);

    Alert.alert(
      'Device Communication Error',
      `Failed to communicate with device ${macAddress}. This could be due to:\n\n` +
        '• The target device is no longer in range\n' +
        '• The WiFi P2P connection was interrupted\n' +
        '• The target device is not ready to receive messages\n\n' +
        'Try reconnecting to the device.',
      [
        {
          text: 'Refresh Devices',
          onPress: () => {
            this.addLog('User chose to refresh device list');
            this.refreshPeerList();
          },
        },
        {
          text: 'Reconnect',
          onPress: () => {
            this.addLog('User chose to reconnect');
            // Disconnect and try to reconnect
            this.disconnect().then(() => {
              setTimeout(() => {
                this.startDiscovery();
              }, 1000);
            });
          },
        },
        {
          text: 'OK',
          style: 'cancel',
        },
      ],
    );
  };

  // Handle connection error specifically
  handleConnectionError = error => {
    this.addLog(`Handling connection error: ${error.message || error}`);

    Alert.alert(
      'Connection Error',
      `Network communication failed: ${error.message || error}\n\n` +
        'This could be due to:\n' +
        '• Poor WiFi signal strength\n' +
        '• Network congestion\n' +
        '• Device moved out of range\n' +
        '• WiFi P2P connection instability',
      [
        {
          text: 'Check Connection',
          onPress: () => {
            this.addLog('User chose to check connection');
            this.getConnectionInformation();
          },
        },
        {
          text: 'Retry',
          onPress: () => {
            this.addLog('User chose to retry connection');
            // Wait a moment then try again
            setTimeout(() => {
              this.getConnectionInformation();
            }, 2000);
          },
        },
        {
          text: 'OK',
          style: 'cancel',
        },
      ],
    );
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
    this.handleNewInfo = info => {
      console.log('Connection info updated:', info);
      this.addLog(`Connection info updated: ${JSON.stringify(info)}`);

      // Store the updated information
      this.setState({connectionInfo: info});

      // If connection was just formed, handle role-based setup
      if (info?.groupFormed) {
        // Get group info with retries, important for both roles
        this.getGroupInfoWithRetry();

        // IMPORTANT: Only Group Owner should start message receiver
        if (info.isGroupOwner) {
          console.log('Connection established - Group Owner starting message receiver');
          this.addLog('Group Owner: Starting message receiver');

          // First stop any existing receiver
          this.stopReceivingMessages();

          // Delay starting the receiver to ensure group info is available
          const delay = 1500; // Delay for connection to stabilize
          this.addLog(`Group Owner: Will start receiver in ${delay}ms`);
          
          setTimeout(() => {
            this.startReceivingMessages();
          }, delay);

          ToastAndroid.show(
            'Group Owner: Message receiver scheduled',
            ToastAndroid.SHORT,
          );
        } else {
          // Client - no message receiver, only sending capability
          console.log('Connection established - Client ready to send messages');
          this.addLog('Client: Ready to send messages (no receiver)');
          
          // Make sure no receiver is running for client
          this.stopReceivingMessages();
          
          ToastAndroid.show(
            'Client: Ready to send messages',
            ToastAndroid.SHORT,
          );
        }
      }

      // If we've disconnected, clean up
      if (!info || !info.groupFormed) {
        this.stopReceivingMessages();
        console.log('Group disbanded or connection lost');
        this.addLog('Group disbanded or connection lost');
      }
    };

    this.connectionInfoUpdatesSubscription = subscribeOnConnectionInfoUpdates(
      this.handleNewInfo,
    );
  };

  // Get current connection information
  getConnectionInformation = async () => {
    try {
      this.addLog('Checking WiFi P2P connection status...');

      const connectionInfo = await getConnectionInfo();
      const connectionLogMessage = logInfo(
        `Connection status: ${
          connectionInfo?.groupFormed ? 'Connected' : 'Disconnected'
        }`,
      );
      this.addLog(connectionLogMessage);
      this.addLog(`Current connection info: ${JSON.stringify(connectionInfo)}`);
      this.setState({connectionInfo});

      // Get group info if available
      try {
        const groupInfo = await getGroupInfo();
        const groupLogMessage = logInfo(
          `Group info retrieved: ${groupInfo ? 'Available' : 'None'}`,
        );
        this.addLog(groupLogMessage);
        this.addLog(`Group info: ${JSON.stringify(groupInfo)}`);
        this.setState({groupInfo});

        // Update thisDevice with owner information if available
        if (groupInfo && groupInfo.owner) {
          this.setState({thisDevice: groupInfo.owner});
          this.addLog(
            `Device role: ${
              connectionInfo?.isGroupOwner ? 'Group Owner' : 'Client'
            }`,
          );
        }

        // IMPORTANT: Only Group Owner should receive messages, Client should only send
        if (
          connectionInfo &&
          connectionInfo.groupFormed &&
          connectionInfo.isGroupOwner &&
          !this.state.receivingMessages
        ) {
          this.addLog('Connection established - starting message receiver (Group Owner only)');
          this.startReceivingMessages();
        } else if (connectionInfo && connectionInfo.groupFormed && !connectionInfo.isGroupOwner) {
          this.addLog('Connected as Client - ready to send messages (not receiving)');
        }
      } catch (groupError) {
        const groupErrorMessage = logCategorizedError(
          'Group info retrieval failed',
          groupError,
        );
        this.addLog(groupErrorMessage);

        // Check if this is a WiFi-related error
        if (this.isWifiNotEnabledError(groupError)) {
          this.handleWifiNotEnabledError();
        }
      }
    } catch (error) {
      const errorMessage = logCategorizedError(
        'Connection info retrieval failed',
        error,
      );
      this.addLog(errorMessage);

      // Check for specific error types
      if (this.isWifiNotEnabledError(error)) {
        this.handleWifiNotEnabledError();
      } else if (this.isConnectionError(error)) {
        this.handleConnectionError(error);
      }
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
      this.addLog(`Peer discovery failed: ${error.message || error}`);

      // Check if this is a WiFi-related error
      if (this.isWifiNotEnabledError(error)) {
        this.handleWifiNotEnabledError();
      } else {
        ToastAndroid.show('Failed to start discovery', ToastAndroid.SHORT);
        Alert.alert(
          'Discovery Error',
          `Failed to start peer discovery: ${error.message || error}`,
          [{text: 'OK'}],
        );
      }
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

  // Get group info with retries - critical for clients where group info
  // might not be immediately available after connection
  getGroupInfoWithRetry = async () => {
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 1000;
    let attempt = 0;

    const attemptGetInfo = async () => {
      attempt++;
      this.addLog(`Getting group info (attempt ${attempt}/${MAX_RETRIES})`);

      try {
        // Call the native getGroupInfo function
        const groupInfo = await getGroupInfo();

        if (groupInfo) {
          // Update state with the new group info
          this.setState({groupInfo});

          // Also update device info if we're the owner
          if (groupInfo && groupInfo.owner) {
            this.setState({thisDevice: groupInfo.owner});
          }

          this.addLog(`Successfully got group info on attempt ${attempt}`);
          return groupInfo;
        } else {
          this.addLog(
            `Group info attempt ${attempt} returned null or undefined`,
          );
        }
      } catch (error) {
        this.addLog(`Group info attempt ${attempt} failed: ${error}`);
      }

      if (attempt < MAX_RETRIES) {
        this.addLog(`Waiting ${RETRY_DELAY}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return attemptGetInfo();
      } else {
        this.addLog('Maximum group info retrieval attempts reached');
        return null;
      }
    };

    return attemptGetInfo();
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
    // Get current connection info from state
    const {connectionInfo, selectedDevice} = this.state;

    // Check if we're connected to a group
    if (!connectionInfo || !connectionInfo.groupFormed) {
      const errorMsg = 'Cannot send message: Not connected to any device';
      console.warn(errorMsg);
      this.addLog(errorMsg);
      ToastAndroid.show(errorMsg, ToastAndroid.SHORT);
      return;
    }

    // Block UI while sending
    this.setState({isSendingMessage: true});

    try {
      // Generate a unique ID for this message to identify our own messages
      const messageId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const timestamp = new Date().toLocaleTimeString();

      // Create the message with its ID
      const messageWithId = JSON.stringify({
        id: messageId,
        content: message,
        timestamp: timestamp,
        sender: connectionInfo.isGroupOwner ? 'groupOwner' : 'client',
      });

      this.addLog(`Sending message: ${message}`);
      console.log(`Attempting to send message with ID: ${messageId}`);

      // Store this message ID to ignore it if we receive it back
      this.sentMessageIds = this.sentMessageIds || [];
      this.sentMessageIds.push(messageId);

      // Keep only the last 20 sent message IDs
      if (this.sentMessageIds.length > 20) {
        this.sentMessageIds = this.sentMessageIds.slice(-20);
      }

      // Using the promise-based approach similar to AppOld1.js
      this.addLog('Sending message via sendMessage');

      // Send the message using the appropriate method
      console.log(
        `Sending as ${connectionInfo.isGroupOwner ? 'group owner' : 'client'}`,
      );
      this.addLog(
        `Role: ${connectionInfo.isGroupOwner ? 'Group Owner' : 'Client'}`,
      );

      // CRITICAL: According to WiFi P2P documentation:
      // - Only CLIENT should send messages using sendMessage()
      // - Only GROUP OWNER should receive messages using receiveMessage()
      // - You cannot be both sender and receiver simultaneously
      
      if (connectionInfo.isGroupOwner) {
        // Group Owner should NOT send messages in normal client-server pattern
        // Group Owner is the server that receives messages from clients
        const errorMsg = 'Group Owner cannot send messages. Only clients can send to the group owner.';
        this.addLog(errorMsg);
        ToastAndroid.show(errorMsg, ToastAndroid.LONG);
        
        Alert.alert(
          'Invalid Operation',
          'As the Group Owner (server), you can only receive messages from clients. ' +
          'To send messages, you need to be a client connecting to another group owner.',
          [{text: 'OK'}]
        );
        return;
      } else {
        // Client sending to Group Owner (server)
        this.addLog('Client sending message to Group Owner...');
        
        // Add a slight delay to ensure group owner's receiver is ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Send the message using sendMessage() (client to server)
        this.addLog('Executing sendMessage (client to server)');
        const metaInfo = await sendMessage(messageWithId);
        console.log('Message sent successfully', metaInfo);
        this.addLog(`Send operation successful: ${JSON.stringify(metaInfo)}`);
      }

      console.log('sendMessage call completed successfully');
      this.addLog('Network send operation completed');
      ToastAndroid.show('Message sent', ToastAndroid.SHORT);
    } catch (error) {
      // Enhanced error logging and categorization
      const errorLogMessage = logCategorizedError('Message send failed', error);
      this.addLog(errorLogMessage);

      console.error('Error in sendMessageToPeer:', error);
      console.log('Error details:', JSON.stringify(error));

      // Check for specific error types
      if (this.isMacAddressError(error)) {
        this.handleMacAddressError(error);
      } else if (this.isConnectionError(error)) {
        this.handleConnectionError(error);
      } else if (this.isWifiNotEnabledError(error)) {
        this.handleWifiNotEnabledError();
      } else {
        // Generic error handling
        const errorMsg = `Failed to send message: ${error.message || error}`;
        this.addLog(errorMsg);
        ToastAndroid.show(errorMsg, ToastAndroid.LONG);

        Alert.alert(
          'Message Send Error',
          `Could not send message: ${error.message || error}`,
          [{text: 'OK'}],
        );
      }
    } finally {
      // Ensure UI is always unblocked even if there's an error
      console.log('Message send operation completed (success or failure)');
      this.addLog('Message operation completed');

      // Always make sure to unblock the UI even if there was an error
      this.setState({isSendingMessage: false});
    }
  };

  // Start receiving messages
  startReceivingMessages = async () => {
    try {
      if (this.state.receivingMessages) {
        this.addLog('Already receiving messages');
        return;
      }

      // Check connection info before receiving
      const connInfo = await getConnectionInfo();
      console.log('Connection info before receiving:', connInfo);
      this.addLog(
        `Connection status: ${
          connInfo?.groupFormed ? 'Connected' : 'Not connected'
        }`,
      );

      if (!connInfo || !connInfo.groupFormed) {
        const errorMsg = 'Cannot receive messages: not connected to any device';
        this.addLog(errorMsg);
        ToastAndroid.show(errorMsg, ToastAndroid.SHORT);
        return;
      }
      
      // CRITICAL: Only Group Owner should receive messages
      if (!connInfo.isGroupOwner) {
        const errorMsg = 'Only Group Owner can receive messages. Clients should only send.';
        this.addLog(errorMsg);
        ToastAndroid.show(errorMsg, ToastAndroid.SHORT);
        return;
      }
      
      this.addLog('Starting to receive messages (Group Owner only)...');
      console.log('Setting up message receiver for Group Owner...');

      // CRITICAL: Make sure we have group info before proceeding (especially for clients)
      if (!this.state.groupInfo) {
        this.addLog('No group info available, attempting to fetch it first...');
        await this.getGroupInfoWithRetry();
      }

      // Double-check we have group owner address if we're a client
      if (!connInfo.isGroupOwner && !connInfo.groupOwnerAddress) {
        const warnMsg = 'Warning: Group owner address is missing';
        this.addLog(warnMsg);
        console.warn(warnMsg);

        // If still no group owner address, try refreshing connection info
        this.addLog(
          'Trying to refresh connection info to get group owner address',
        );
        const refreshedConnInfo = await getConnectionInfo();
        if (refreshedConnInfo?.groupOwnerAddress) {
          this.addLog(
            `Found group owner address: ${refreshedConnInfo.groupOwnerAddress}`,
          );
          this.setState({connectionInfo: refreshedConnInfo});
        } else {
          this.addLog('Still missing group owner address after refresh');
        }
      }

      // Update state to indicate we're now receiving
      this.setState({receivingMessages: true});
      this.addLog('Message receiver activated');

      // Call the function to listen for messages
      this.listenForNextMessage();

      // Show feedback to user
      ToastAndroid.show('Actively listening for messages', ToastAndroid.SHORT);
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

    // Get connection info for logging
    const connRole = this.state.connectionInfo?.isGroupOwner
      ? 'GROUP OWNER'
      : 'CLIENT';
    console.log(`[${connRole}] Listening for next message...`);
    this.addLog(`[${connRole}] Listening for next message...`);

    // Call receiveMessage() - per documentation, this listens for ONE message
    receiveMessage()
      .then(messageData => {
        console.log(`[${connRole}] RECEIVED MESSAGE FROM PEER:`, messageData);
        this.addLog(`[${connRole}] Received message from peer: ${messageData}`);

        if (messageData && typeof messageData === 'string') {
          let parsedMessage;
          let messageText;
          let messageId;
          let senderType = 'unknown';

          // Try to parse the message as JSON first (our new format with ID)
          try {
            parsedMessage = JSON.parse(messageData);
            messageText = parsedMessage.content;
            messageId = parsedMessage.id;
            senderType = parsedMessage.sender || 'unknown';

            console.log(`[${connRole}] Parsed message:`, {
              messageId,
              senderType,
              text: messageText,
            });

            // Check if this is our own message that we sent (avoid duplicates)
            if (
              this.sentMessageIds &&
              this.sentMessageIds.includes(messageId)
            ) {
              console.log(
                `[${connRole}] Ignoring own message with ID:`,
                messageId,
              );
              this.addLog(
                `[${connRole}] Ignored own message with ID: ${messageId}`,
              );

              // Continue listening for the next message
              if (this.state.receivingMessages) {
                setTimeout(() => {
                  this.listenForNextMessage();
                }, 300);
              }
              return;
            }
          } catch (e) {
            // If parsing fails, it's an old-format message without ID
            console.log(
              `[${connRole}] Received message in legacy format or parse error:`,
              e,
            );
            this.addLog(
              `[${connRole}] Received message in legacy format or parse error: ${e}`,
            );
            messageText = messageData;
            messageId = `received-${Date.now()}`;
          }

          this.addLog(
            `[${connRole}] Received message from ${senderType}: ${messageText}`,
          );

          // Add to messages list
          const timestamp = new Date().toLocaleTimeString();
          this.setState(prevState => ({
            messages: [
              ...prevState.messages,
              {
                id: messageId,
                text: messageText,
                time: timestamp,
                isSent: false,
                sender: senderType,
              },
            ],
          }));

          // Show notification
          ToastAndroid.show(`Message from ${senderType}`, ToastAndroid.SHORT);
        } else {
          console.log(
            `[${connRole}] Received invalid message format:`,
            messageData,
          );
          this.addLog(
            `[${connRole}] Received invalid message format: ${typeof messageData}`,
          );
        }

        // Continue listening for the next message if still in receiving mode
        if (this.state.receivingMessages) {
          setTimeout(() => {
            this.listenForNextMessage();
          }, 300); // Short delay between messages
        }
      })
      .catch(err => {
        console.log(`[${connRole}] Error receiving message:`, err);
        this.addLog(`[${connRole}] Error receiving message: ${err}`);

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
    if (!this.state.receivingMessages) {
      return;
    }

    // Log the action with role info for debugging
    const connRole = this.state.connectionInfo?.isGroupOwner
      ? 'GROUP OWNER'
      : 'CLIENT';
    console.log(`[${connRole}] Stopping message receiver`);
    this.addLog(`[${connRole}] Stopping message receiver`);

    // Set flag to stop the recursive receive loop
    this.setState({receivingMessages: false});
    try {
      // Refresh connection subscription to reset any in-progress operations
      if (this.connectionInfoUpdatesSubscription) {
        this.connectionInfoUpdatesSubscription.remove();
        this.connectionInfoUpdatesSubscription =
          subscribeOnConnectionInfoUpdates(this.handleNewInfo);
        console.log(`[${connRole}] Reset connection subscription`);
        this.addLog(`[${connRole}] Reset connection subscription`);
        this.addLog('Message receiving stopped successfully');
      }
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
                connectionInfo={this.state.connectionInfo}
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
