const { sendMessageDiscord } = require('../discord');

const errorResponseFromAxios = async (error) => {
  if (error.response.data.msg === 'Invalid symbol.') {
    const url = new URL(error.config.url);
    const queryParams = new URLSearchParams(url.search);
    await sendMessageDiscord(
      `Error while buying. ${queryParams.get('symbol')} not found on Binance.`,
      'Binance buy bot',
    );
  }

  return {
    statusCode: error.response.status,
    body: JSON.stringify(error.response.data),
    headers: { 'Content-type': 'application/json' },
  };
};

module.exports = {
  errorResponseFromAxios,
};
