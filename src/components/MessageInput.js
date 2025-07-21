import React, {useState} from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import {styles} from '../styles/styles';

const MessageInput = ({
  onSendMessage,
  isConnected,
  isSendingMessage = false,
  connectionInfo = null,
}) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() === '') {
      console.log('Message is empty, not sending');
      return;
    }

    // Don't attempt to send if we're already sending a message
    if (isSendingMessage) {
      console.log('Already sending a message, ignoring request');
      return;
    }

    try {
      console.log('Attempting to send message:', message);
      const currentMessage = message;

      // We don't clear the message immediately to prevent UI jarring
      // It will be cleared once the send completes in the parent component
      onSendMessage(currentMessage);
      console.log('onSendMessage call initiated');
    } catch (error) {
      console.error('Error in handleSend:', error);
    }
  };

  // Check if user can send messages (only clients can send)
  const canSendMessages = isConnected && connectionInfo && connectionInfo.groupFormed && !connectionInfo.isGroupOwner;
  const isGroupOwner = connectionInfo && connectionInfo.isGroupOwner;
  
  return (
    <View style={styles.section}>
      <Text style={styles.subtitle}>
        {isGroupOwner ? 'Message Receiver (Group Owner)' : 'Send Message (Client)'}
      </Text>
      
      {isGroupOwner && (
        <Text style={[styles.statusText, {marginBottom: 10, fontStyle: 'italic'}]}>
          As Group Owner, you receive messages from clients. You cannot send messages.
        </Text>
      )}
      
      {!isConnected && (
        <Text style={[styles.statusText, {marginBottom: 10, fontStyle: 'italic'}]}>
          Connect to a device to enable messaging
        </Text>
      )}
      
      <View style={styles.messageInputContainer}>
        <TextInput
          style={[
            styles.input,
            {flex: 1},
            isSendingMessage && styles.inputDisabled,
          ]}
          value={message}
          onChangeText={setMessage}
          placeholder={
            isGroupOwner 
              ? 'Group Owner receives messages only'
              : isSendingMessage 
                ? 'Sending message...' 
                : 'Type your message...'
          }
          editable={canSendMessages && !isSendingMessage}
          onSubmitEditing={() => {
            if (canSendMessages && !isSendingMessage && message.trim() !== '') {
              handleSend();
            }
          }}
        />
        <TouchableOpacity
          style={[
            styles.button,
            {marginLeft: 8, width: 80},
            (!canSendMessages || message.trim() === '' || isSendingMessage) &&
              styles.buttonDisabled,
          ]}
          onPress={handleSend}
          disabled={!canSendMessages || message.trim() === '' || isSendingMessage}
          activeOpacity={0.7}>
          {isSendingMessage ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default MessageInput;
