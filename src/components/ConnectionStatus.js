import React from 'react';
import {View, Text} from 'react-native';
import {styles} from '../styles/styles';

const ConnectionStatus = ({
  isConnected,
  connectionInfo,
  thisDevice,
}) => {
  const isGroupOwner = connectionInfo && connectionInfo.isGroupOwner;
  const connectedDeviceName = connectionInfo && connectionInfo.deviceAddress;

  return (
    <View style={styles.statusContainer}>
      <View style={styles.statusRow}>
        <View
          style={[
            styles.connectionIndicator,
            isConnected ? styles.connected : styles.disconnected,
          ]}
        />
        <Text style={styles.statusText}>
          {isConnected ? 'Connected' : 'Disconnected'}
          {isConnected && (
            <Text style={styles.connectionText}>
              {' as '}
              <Text style={styles.statusHighlight}>
                {isGroupOwner ? 'GROUP OWNER' : 'CLIENT'}
              </Text>
            </Text>
          )}
        </Text>
      </View>

      {isConnected && connectionInfo && (
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>
            Group formed: {connectionInfo.groupFormed ? 'Yes' : 'No'}
          </Text>
        </View>
      )}

      {thisDevice && (
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>
            This device:{' '}
            <Text style={styles.statusHighlight}>
              {thisDevice.deviceName || thisDevice.deviceAddress || 'Unknown'}
            </Text>
          </Text>
        </View>
      )}

      {isConnected && connectionInfo && connectionInfo.groupFormed && connectionInfo.groupOwnerAddress && (
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>
            IP address:{' '}
            <Text style={styles.statusHighlight}>
              {connectionInfo.groupOwnerAddress.hostAddress || 'Unknown'}
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
};

export default ConnectionStatus;
