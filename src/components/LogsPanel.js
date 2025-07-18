import React from 'react';
import {View, Text, ScrollView, TouchableOpacity} from 'react-native';
import {styles} from '../styles/styles';

const LogsPanel = ({logs = [], onClearLogs, maxLogs = 30}) => {
  // Take only the most recent logs up to maxLogs
  const displayLogs = logs.slice(-maxLogs);
  
  return (
    <View style={styles.section}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
        <Text style={styles.subtitle}>Debug Logs</Text>
        <TouchableOpacity 
          onPress={onClearLogs}
          style={{padding: 5, backgroundColor: '#eee', borderRadius: 4}}>
          <Text style={{color: '#333'}}>Clear</Text>
        </TouchableOpacity>
      </View>
      <ScrollView 
        style={styles.logsContainer}
        contentContainerStyle={{paddingVertical: 5}}>
        {displayLogs.length === 0 ? (
          <Text style={styles.logText}>No logs yet.</Text>
        ) : (
          displayLogs.map((log, index) => {
            let logStyle;
            if (log.includes('ERROR') || log.includes('failed')) {
              logStyle = styles.logError;
            } else if (log.includes('WARNING')) {
              logStyle = styles.logWarning;
            } else if (log.includes('INFO')) {
              logStyle = styles.logInfo;
            } else {
              logStyle = styles.logDebug;
            }

            return (
              <Text key={index} style={[styles.logText, logStyle]}>
                {log}
              </Text>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

export default LogsPanel;
