const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const { sendMessageDiscord } = require('./discord');
const { getErrorResponse } = require('./errors/handleError');
const { BadRequestError } = require('./errors/BadRequestError');

const BINANCE_BASE_URL = 'https://api.binance.com';
const { API_KEY, API_SECRET } = process.env;

const buildSignature = (data) => crypto.createHmac('sha256', API_SECRET).update(data).digest('hex');

const getCurrentPrice = async (symbol) => {
  const url = `${BINANCE_BASE_URL}/api/v3/ticker/price?symbol=${symbol}`;

  const requestConfig = {
    method: 'GET',
    url,
  };
  const response = await axios(requestConfig);
  return response.data.price;
};

const getNumberOfDecimalPoints = async (symbol) => {
  const requestConfig = {
    method: 'GET',
    url: `${BINANCE_BASE_URL}/api/v3/exchangeInfo`,
    headers: {
      'X-MBX-APIKEY': API_KEY,
    },
  };

  const response = await axios(requestConfig);
  const { symbols } = response.data;
  let { stepSize } = symbols
    .find((sym) => sym.symbol === symbol)
    .filters.find((filter) => filter.filterType === 'LOT_SIZE');

  for (let i = 0; i < 10; i += 1) {
    if (stepSize === 1) {
      return i;
    }

    stepSize *= 10;
  }

  throw new BadRequestError(400, 'Unexpected value for LOT_SIZE');
};

const getResponse = async (orderResponse, dataForResponse) => {
  const { coin, coinWith } = dataForResponse;
  const { data } = orderResponse;

  const messageContent = `Bought ${data.origQty} ${coin} with ${data.cummulativeQuoteQty} ${coinWith}.`;
  await sendMessageDiscord(messageContent, 'Binance buy bot');

  const body = {
    msg: `Bought ${data.origQty} ${coin} with ${data.cummulativeQuoteQty} ${coinWith}`,
  };
  return {
    statusCode: orderResponse.status,
    body: JSON.stringify(body),
    headers: { 'Content-type': 'application/json' },
  };
};

const buyMarketPrice = async (event) => {
  const { coin, coinWith, forQuantity } = event.queryStringParameters;
  const symbol = `${coin.toUpperCase()}${coinWith.toUpperCase()}`;
  const pricePerCoin = await getCurrentPrice(symbol);

  // put lot_size to db, it needs decent ammount of time to find it, because response is big
  const decimalPoints = await getNumberOfDecimalPoints(symbol);
  const quantity = (forQuantity / pricePerCoin).toFixed(decimalPoints);

  const queryString = `symbol=${symbol}&side=BUY&type=MARKET&quantity=${quantity}&timestamp=${Date.now()}`;
  const signature = buildSignature(queryString);

  const requestConfig = {
    method: 'POST',
    url: `${BINANCE_BASE_URL}/api/v3/order?${queryString}&signature=${signature}`,
    headers: {
      'X-MBX-APIKEY': API_KEY,
    },
  };

  const orderResponse = await axios(requestConfig);
  const dataForResponse = { coin, coinWith };
  return getResponse(orderResponse, dataForResponse);
};

const buy = async (event) => {
  const { type } = event.queryStringParameters;

  if (type.toLowerCase() === 'market') {
    return buyMarketPrice(event);
  }

  return {};
};

const buyWrapper = async (event) => {
  try {
    return await buy(event);
  } catch (error) {
    return getErrorResponse(error);
  }
};

module.exports = { buy, buyWrapper };
