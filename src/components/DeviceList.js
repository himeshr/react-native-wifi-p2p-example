import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import {styles} from '../styles/styles';

/**
 * Filters devices to only include smartphones and tablets based on device type
 * Common primaryDeviceType values:
 * - Smartphone/Tablet: 10-0050F204-5 (Computer) or 1-0050F204-1 (Computer/PC)
 * - TV: 7-0050F204-1 (Display)
 */
const isSmartphoneOrTablet = device => {
  // Match known smartphone/tablet device types
  if (!device.primaryDeviceType) {
    return true;
  } // Include if type not specified

  // Include devices with Computer category (includes smartphones, tablets)
  if (
    device.primaryDeviceType.startsWith('10-0050F204') ||
    device.primaryDeviceType.startsWith('1-0050F204')
  ) {
    return true;
  }

  // Exclude devices with TV/Display category
  if (device.primaryDeviceType.startsWith('7-0050F204')) {
    return false;
  }

  // Include if device name contains keywords suggesting it's a mobile device
  const name = (device.deviceName || '').toLowerCase();
  if (
    name.includes('phone') ||
    name.includes('android') ||
    name.includes('galaxy') ||
    name.includes('pixel') ||
    name.includes('xiaomi') ||
    name.includes('redmi') ||
    name.includes('oneplus')
  ) {
    return true;
  }

  return false; // Exclude by default if not matching criteria
};

const DeviceList = ({devices = [], onDeviceSelect, selectedDeviceAddress}) => {
  // Filter to only show smartphones and tablets
  const filteredDevices = Array.isArray(devices)
    ? devices.filter(isSmartphoneOrTablet)
    : [];

  return (
    <View style={styles.section}>
      <Text style={styles.devicesHeading}>
        Found Devices: {filteredDevices.length}
        {filteredDevices.length !== devices.length &&
          ` (${
            devices.length - filteredDevices.length
          } non-mobile devices hidden)`}
      </Text>

      {filteredDevices.length === 0 && (
        <Text style={styles.deviceItemEmpty}>
          No mobile devices found. Make sure both devices have pressed "Investigate" button.
        </Text>
      )}

      {filteredDevices.map((device, idx) => (
        <TouchableOpacity
          key={device.deviceAddress || idx}
          style={[
            styles.deviceItem,
            selectedDeviceAddress === device.deviceAddress &&
              styles.deviceItemSelected,
          ]}
          onPress={() => onDeviceSelect(device)}>
          <Text
            style={[
              styles.deviceItemText,
              selectedDeviceAddress === device.deviceAddress &&
                styles.deviceItemTextSelected,
            ]}>
            {device.deviceName || 'Unknown Device'} 
            {'\n'}
            <Text style={{fontSize: 12, color: '#666'}}>
              {device.deviceAddress}
            </Text>
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default DeviceList;
