const axios = require('axios');

const CHATRACE_API_URL = process.env.CHATRACE_API_URL || 'https://api.chatrace.com/v1';
const CHATRACE_API_KEY = process.env.CHATRACE_API_KEY;
const CHATRACE_BOT_ID = process.env.CHATRACE_BOT_ID;

/**
 * Send WhatsApp message via Chatrace
 */
async function sendChatraceMessage(phoneNumber, message, mediaUrl = null) {
  try {
    const payload = {
      to: phoneNumber,
      botId: CHATRACE_BOT_ID,
      message: message,
      mediaUrl: mediaUrl // For images/PDFs
    };

    const response = await axios.post(
      `${CHATRACE_API_URL}/messages/send`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${CHATRACE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ WhatsApp message sent to', phoneNumber);
    return response.data;

  } catch (error) {
    console.error('❌ Failed to send WhatsApp message:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send template message (for structured messages)
 */
async function sendTemplateMessage(phoneNumber, templateName, parameters) {
  try {
    const payload = {
      to: phoneNumber,
      botId: CHATRACE_BOT_ID,
      template: templateName,
      parameters: parameters
    };

    const response = await axios.post(
      `${CHATRACE_API_URL}/messages/template`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${CHATRACE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Template message sent to', phoneNumber);
    return response.data;

  } catch (error) {
    console.error('❌ Failed to send template message:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  sendChatraceMessage,
  sendTemplateMessage
};