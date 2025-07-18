/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {PureComponent} from 'react';
import {StyleSheet, View, Button} from 'react-native';
import {
  initialize,
  startDiscoveringPeers,
  stopDiscoveringPeers,
  subscribeOnConnectionInfoUpdates,
  subscribeOnThisDeviceChanged,
  subscribeOnPeersUpdates,
  connect,
  cancelConnect,
  createGroup,
  removeGroup,
  getAvailablePeers,
  sendFile,
  receiveFile,
  getConnectionInfo,
  getGroupInfo,
  receiveMessage,
  sendMessage,
} from 'react-native-wifi-p2p';
import {PermissionsAndroid} from 'react-native';

type Props = {};
export default class App extends PureComponent<Props> {
  peersUpdatesSubscription;
  connectionInfoUpdatesSubscription;
  thisDeviceChangedSubscription;

  state = {
    devices: [],
  };

  async componentDidMount() {
    try {
      console.log('Initializing Wi-Fi P2P...');
      await initialize();

      // Request necessary permissions for Android
      try {
        // Location permission is required in Android >= 6.0 for Wi-Fi P2P
        const locationGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          {
            title: 'Access to Wi-Fi P2P mode',
            message: 'Location permission is required for Wi-Fi P2P functionality',
            buttonPositive: 'OK',
          },
        );

        // Fine location might be needed on newer Android versions
        const fineLocationGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Fine Location for Wi-Fi P2P',
            message: 'Precise location may be needed for better device discovery',
            buttonPositive: 'OK',
          },
        );

        console.log(
          locationGranted === PermissionsAndroid.RESULTS.GRANTED
            ? 'You can use the p2p mode'
            : 'Permission denied: p2p mode will not work',
        );
      } catch (permissionError) {
        console.log('Permission request failed:', permissionError);
      }

      // Set up event subscriptions
      console.log('Setting up Wi-Fi P2P subscriptions...');
      this.peersUpdatesSubscription = subscribeOnPeersUpdates(
        this.handleNewPeers,
      );
      this.connectionInfoUpdatesSubscription = subscribeOnConnectionInfoUpdates(
        this.handleNewInfo,
      );
      this.thisDeviceChangedSubscription = subscribeOnThisDeviceChanged(
        this.handleThisDeviceChanged,
      );

      // Start discovering peers
      console.log('Starting peer discovery...');
      const status = await startDiscoveringPeers();
      console.log('startDiscoveringPeers status: ', status);
    } catch (e) {
      console.error('Wi-Fi P2P initialization error:', e);
    }
  }

  componentWillUnmount() {
    this.peersUpdatesSubscription?.remove();
    this.connectionInfoUpdatesSubscription?.remove();
    this.thisDeviceChangedSubscription?.remove();

    // Clear discovery interval if it exists
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }

    // Stop discovering peers when component unmounts
    stopDiscoveringPeers().catch(err => console.log('Error stopping peer discovery:', err));
  }

  handleNewInfo = info => {
    console.log('OnConnectionInfoUpdated', info);
  };

  handleNewPeers = ({devices}) => {
    console.log('OnPeersUpdated', devices);
    if (devices && devices.length > 0) {
      console.log('Found devices:', JSON.stringify(devices));
      // Alert user when devices are found
      if (this.state.devices.length === 0 && devices.length > 0) {
        alert(`${devices.length} peer device(s) found! You can now connect.`);
      }
    }
    this.setState({devices: devices || []});
  };

  handleThisDeviceChanged = groupInfo => {
    console.log('THIS_DEVICE_CHANGED_ACTION', groupInfo);
  };

  connectToFirstDevice = () => {
    if (this.state.devices && this.state.devices.length > 0) {
      console.log('Connect to: ', this.state.devices[0]);
      connect(this.state.devices[0].deviceAddress)
        .then(() => console.log('Successfully connected'))
        .catch(err => console.error('Connection error: ', err));
    } else {
      console.log('No devices available to connect to. Please scan for peers first.');
      // You might want to start discovering peers here automatically
      this.onStartInvestigate();
    }
  };

  onCancelConnect = () => {
    cancelConnect()
      .then(() =>
        console.log('cancelConnect', 'Connection successfully canceled'),
      )
      .catch(err =>
        console.error('cancelConnect', 'Something gone wrong. Details: ', err),
      );
  };

  onCreateGroup = () => {
    createGroup()
      .then(() => console.log('Group created successfully!'))
      .catch(err => console.error('Something gone wrong. Details: ', err));
  };

  onRemoveGroup = () => {
    removeGroup()
      .then(() => console.log("Currently you don't belong to group!"))
      .catch(err => console.error('Something gone wrong. Details: ', err));
  };

  onStopInvestigation = () => {
    stopDiscoveringPeers()
      .then(() => console.log('Stopping of discovering was successful'))
      .catch(err =>
        console.error(
          'Something is gone wrong. Maybe your WiFi is disabled? Error details',
          err,
        ),
      );
  };

  onStartInvestigate = () => {
    // Make sure WiFi is enabled first
    console.log('Starting peer discovery...');

    // Setup continuous peer discovery
    // First stop any existing discovery
    stopDiscoveringPeers()
      .then(() => {
        console.log('Stopped previous discovery session');
        // Start new discovery session
        return startDiscoveringPeers();
      })
      .then(status => {
        console.log('startDiscoveringPeers', `Status of discovering peers: ${status}`);
        // Show a message to the user that we're searching for peers
        alert('Searching for nearby devices. Please ensure both devices:\n\n1. Have Wi-Fi enabled\n2. Have this app open\n3. Are within close proximity\n4. Have pressed "Investigate" button');

        // Setup recurring discovery attempts for better reliability
        this.discoveryInterval = setInterval(() => {
          console.log('Restarting peer discovery (interval)...');
          startDiscoveringPeers()
            .then(status => console.log('Recurring discovery status:', status))
            .catch(err => console.log('Recurring discovery error:', err));
        }, 10000); // Every 10 seconds
      })
      .catch(err => {
        console.error(`Peer discovery failed. Error details: ${err}`);
        alert('Failed to discover peers. Please make sure Wi-Fi is enabled and location permissions are granted.');
      });
  };

  onGetAvailableDevices = () => {
    getAvailablePeers().then(peers => console.log(peers));
  };

  onSendFile = () => {
    //const url = '/storage/sdcard0/Music/Rammstein:Amerika.mp3';
    const url =
      '/storage/emulated/0/Music/Bullet For My Valentine:Letting You Go.mp3';
    PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      {
        title: 'Access to read',
        message: 'READ_EXTERNAL_STORAGE',
      },
    )
      .then(granted => {
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('You can use the storage');
        } else {
          console.log('Storage permission denied');
        }
      })
      .then(() => {
        return PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Access to write',
            message: 'WRITE_EXTERNAL_STORAGE',
          },
        );
      })
      .then(() => {
        return sendFile(url)
          .then(metaInfo => console.log('File sent successfully', metaInfo))
          .catch(err => console.log('Error while file sending', err));
      })
      .catch(err => console.log(err));
  };

  onReceiveFile = () => {
    PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      {
        title: 'Access to read',
        message: 'READ_EXTERNAL_STORAGE',
      },
    )
      .then(granted => {
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('You can use the storage');
        } else {
          console.log('Storage permission denied');
        }
      })
      .then(() => {
        return PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Access to write',
            message: 'WRITE_EXTERNAL_STORAGE',
          },
        );
      })
      .then(() => {
        return receiveFile(
          '/storage/emulated/0/Music/',
          'BFMV:Letting You Go.mp3',
        )
          .then(() => console.log('File received successfully'))
          .catch(err => console.log('Error while file receiving', err));
      })
      .catch(err => console.log(err));
  };

  onSendMessage = () => {
    sendMessage('Hello world!')
      .then(metaInfo => console.log('Message sent successfully', metaInfo))
      .catch(err => console.log('Error while message sending', err));
  };

  onReceiveMessage = () => {
    receiveMessage()
      .then(msg => console.log('Message received successfully', msg))
      .catch(err => console.log('Error while message receiving', err));
  };

  onGetConnectionInfo = () => {
    getConnectionInfo().then(info => console.log('getConnectionInfo', info));
  };

  onGetGroupInfo = () => {
    getGroupInfo().then(info => console.log('getGroupInfo', info));
  };

  render() {
    return (
      <View style={styles.container}>
        <Button title="Connect" onPress={this.connectToFirstDevice} />
        <Button title="Cancel connect" onPress={this.onCancelConnect} />
        <Button title="Create group" onPress={this.onCreateGroup} />
        <Button title="Remove group" onPress={this.onRemoveGroup} />
        <Button title="Investigate" onPress={this.onStartInvestigate} />
        <Button
          title="Prevent Investigation"
          onPress={this.onStopInvestigation}
        />
        <Button
          title="Get Available Devices"
          onPress={this.onGetAvailableDevices}
        />
        <Button
          title="Get connection Info"
          onPress={this.onGetConnectionInfo}
        />
        <Button title="Get group info" onPress={this.onGetGroupInfo} />
        <Button title="Send file" onPress={this.onSendFile} />
        <Button title="Receive file" onPress={this.onReceiveFile} />
        <Button title="Send message" onPress={this.onSendMessage} />
        <Button title="Receive message" onPress={this.onReceiveMessage} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});
