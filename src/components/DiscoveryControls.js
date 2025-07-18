import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import {styles} from '../styles/styles';

const DiscoveryControls = ({
  isDiscovering,
  onStartDiscovery,
  onStopDiscovery,
  onConnect,
  onDisconnect,
  isConnected,
  selectedDevice,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.subtitle}>WiFi P2P Controls</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            isDiscovering && styles.buttonDisabled,
          ]}
          onPress={onStartDiscovery}
          disabled={isDiscovering}>
          <Text style={styles.buttonText}>
            {isDiscovering ? 'Searching...' : 'Start Discovery'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.button,
            !isDiscovering && styles.buttonDisabled,
          ]}
          onPress={onStopDiscovery}
          disabled={!isDiscovering}>
          <Text style={styles.buttonText}>Stop Discovery</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            (!selectedDevice || isConnected) && styles.buttonDisabled,
          ]}
          onPress={onConnect}
          disabled={!selectedDevice || isConnected}>
          <Text style={styles.buttonText}>
            {selectedDevice 
              ? `Connect to ${selectedDevice.deviceName || 'Device'}`
              : 'Select a device first'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.button,
            !isConnected && styles.buttonDisabled,
          ]}
          onPress={onDisconnect}
          disabled={!isConnected}>
          <Text style={styles.buttonText}>Disconnect</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default DiscoveryControls;
