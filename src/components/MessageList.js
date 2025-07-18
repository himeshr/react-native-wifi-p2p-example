import React from 'react';
import {View, Text, ScrollView} from 'react-native';
import {styles} from '../styles/styles';

const MessageList = ({messages = []}) => {
  // Create a ref for the ScrollView
  const scrollViewRef = React.useRef(null);

  // Scroll to bottom whenever messages change
  React.useEffect(() => {
    if (scrollViewRef.current && messages.length > 0) {
      // Use a timeout to ensure the layout is complete
      setTimeout(() => {
        scrollViewRef.current.scrollToEnd({animated: true});
      }, 100);
    }
  }, [messages]);

  return (
    <View style={styles.section}>
      <Text style={styles.subtitle}>Messages</Text>

      <ScrollView
        ref={scrollViewRef}
        style={{
          maxHeight: 200,
          minHeight: 100,
          borderWidth: 1,
          borderColor: '#e0e0e0',
          borderRadius: 8,
          padding: 8,
        }}
        contentContainerStyle={{paddingBottom: 10}}
        // Make sure it can scroll
        showsVerticalScrollIndicator={true}
        // Always bounce when scrolling ends
        alwaysBounceVertical={true}
        // Use unique IDs instead of index for better performance
        keyExtractor={(item, index) => item.id || `msg-${index}`}>
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
              key={msg.id || index}
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
