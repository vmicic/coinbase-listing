const axios = require('axios');

// prettier-ignore
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/833780553488400404/vA6mQgmHhJuXIiW6WTb8PxA-No9edieuuoB4bGbzOPeAEu7Qj5Nb-OqIyZsU-j2f2UeO';

const sendMessageDiscord = (content, username) => {
  const message = {
    content,
    avatar: '',
    username,
  };

  return axios.post(DISCORD_WEBHOOK, JSON.stringify(message), {
    headers: { 'Content-type': 'application/json' },
  });
};

module.exports = {
  sendMessageDiscord,
};
