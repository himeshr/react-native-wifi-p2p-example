import React from 'react';
import {View, Text, ScrollView} from 'react-native';
import {styles} from '../styles/styles';

const MessageList = ({messages = []}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.subtitle}>Messages</Text>

      <ScrollView
        style={{
          maxHeight: 200,
          minHeight: 100,
          borderWidth: 1,
          borderColor: '#e0e0e0',
          borderRadius: 8,
          padding: 8,
        }}
        contentContainerStyle={{paddingBottom: 10}}>
        {messages.length === 0 ? (
          <Text
            style={{
              color: '#666',
              fontStyle: 'italic',
              textAlign: 'center',
              marginTop: 10,
            }}>
            No messages yet
          </Text>
        ) : (
          messages.map((msg, index) => (
            <View
              key={index}
              style={[
                styles.messageContainer,
                msg.isSent ? styles.sentMessage : styles.receivedMessage,
              ]}>
              <Text style={styles.messageText}>{msg.text}</Text>
              <Text style={styles.messageTime}>
                {msg.time} - {msg.isSent ? 'Sent' : 'Received'}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default MessageList;
