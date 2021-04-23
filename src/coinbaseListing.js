const axios = require('axios');

// in order to reduce deployment package
// added only to dev dependencies
// since aws-sdk is available in lambda envronment
// eslint-disable-next-line import/no-extraneous-dependencies
const AWS = require('aws-sdk');
const { buyWrapper } = require('./binanceOrder');
const { sendMessageDiscord } = require('./discord');

const client = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });

const POSTS_API_URI = 'https://medium.com/_/api/collections/c114225aeaf7/stream';
const { DATA_TABLE, COIN_WITH, FOR_QUANTITY } = process.env;

const getTitlesFromBody = (body) => {
  const posts = { ...body.payload.references.Post };
  const postsId = Object.keys(posts);
  return postsId.map((id) => posts[id].title);
};

const getTitlesFromApi = async (url) => {
  const response = await axios.get(url);
  const body = JSON.parse(response.data.substring(16));
  const titles = getTitlesFromBody(body);

  const { to, page } = body.payload.paging.next;
  const POSTS_API_URI_NEXT = `${POSTS_API_URI}?to=${to}&page=${page}`;
  const responseNext = await axios.get(POSTS_API_URI_NEXT);
  const bodyNext = JSON.parse(responseNext.data.substring(16));
  const titlesNext = getTitlesFromBody(bodyNext);

  return titles.concat(titlesNext);
};

const getSavedTitlesFromDatabase = async () => {
  const data = await client
    .scan({
      TableName: DATA_TABLE,
    })
    .promise();
  return data.Items.map((item) => item.id);
};

const saveTitlesToDatabase = async (titles) => {
  const promises = [];
  // replace with bulk write later
  titles.forEach((title) => {
    const saveTitlePromise = client
      .put({
        TableName: DATA_TABLE,
        Item: { id: title },
      })
      .promise();
    promises.push(saveTitlePromise);
  });
  await Promise.all(promises);
};

// note, I've used the sort inside
// also, this is a pretty bad way of handling this
// but will be updated
const getNewTitles = (oldTitles, titles) => titles.filter((title) => !oldTitles.includes(title));
// just to make sure that the case doesn't mess us up
const isTitleLaunching = (title) =>
  title.toLowerCase().includes('launching on Coinbase'.toLowerCase());

const getLaunchingCoins = (title) => {
  const words = title.split(' ');
  const coins = words
    .filter((word) => {
      // get only words with parantheses from both sides
      const regExp = /\(([^)]+)\)/;
      return regExp.exec(word);
    })
    .map((coin) => {
      // extract word between parentheses
      const regExp = /\(([^)]+)\)/;
      const matches = regExp.exec(coin);
      return matches[1];
    });

  return coins;
};

const detectListing = async () => {
  const titles = await getTitlesFromApi(POSTS_API_URI);
  const oldTitles = await getSavedTitlesFromDatabase();

  const newTitles = getNewTitles([...oldTitles], [...titles]);
  if (newTitles.length === 0) {
    return [];
  }

  // save only if there are new titles
  await saveTitlesToDatabase(titles);

  let coins = [];
  newTitles.forEach((title) => {
    if (isTitleLaunching(title)) {
      coins = coins.concat(getLaunchingCoins(title));
    }
  });

  return coins;
};

const buyCoins = (coins) => {
  let buyPromises = [];
  coins.forEach((coin) => {
    const event = {
      path: '/api/buy',
      queryStringParameters: {
        coin,
        coinWith: COIN_WITH,
        type: 'MARKET',
        forQuantity: FOR_QUANTITY,
      },
    };
    // rethink this
    buyPromises = [...buyPromises, buyWrapper(event)];
  });

  return buyPromises;
};

const main = async () => {
  const coins = await detectListing();
  if (coins.length > 0) {
    await sendMessageDiscord(`${coins.join(' ')} launched on Coinbase :)`, 'Coinbase listing bot');
    await Promise.allSettled(buyCoins(coins));
  }
};

module.exports = {
  main,
  getTitlesFromBody,
  getTitlesFromApi,
  getNewTitles,
  isTitleLaunching,
  getLaunchingCoins,
};
