import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import {styles as appStyles} from '../styles/styles';

const FetchMessagesButton = ({
  onFetchMessages,
  isConnected,
  isFetching = false,
  receivingMessages = false,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          appStyles.button,
          styles.fetchButton,
          !isConnected && appStyles.buttonDisabled,
          isFetching && styles.fetchingButton,
        ]}
        onPress={onFetchMessages}
        disabled={!isConnected || isFetching}
        activeOpacity={0.7}>
        {isFetching ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={appStyles.buttonText}>
            {receivingMessages ? 'Refresh Messages' : 'Fetch Messages'}
          </Text>
        )}
      </TouchableOpacity>
      {receivingMessages && (
        <View style={styles.indicatorContainer}>
          <View style={styles.activeIndicator} />
          <Text style={styles.statusText}>Receiving active</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fetchButton: {
    backgroundColor: '#007bff',
    flex: 1,
  },
  fetchingButton: {
    backgroundColor: '#0056b3',
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#4CAF50',
  },
});

export default FetchMessagesButton;
