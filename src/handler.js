const axios = require('axios');

// in order to reduce deployment package
// added only to dev dependencies
// since aws-sdk is available in lambda envronment
// eslint-disable-next-line import/no-extraneous-dependencies
const AWS = require('aws-sdk');
const { buy } = require('./binanceOrder');

const client = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });

const POSTS_API_URI = 'https://medium.com/_/api/collections/c114225aeaf7/stream';
// prettier-ignore
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/833780553488400404/vA6mQgmHhJuXIiW6WTb8PxA-No9edieuuoB4bGbzOPeAEu7Qj5Nb-OqIyZsU-j2f2UeO';

const { DATA_TABLE } = process.env;

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

const alertLaunching = async (coins) => {
  const data = {
    content: `${coins.join(' ')} launched on Coinbase :)`,
    avatar: '',
    username: 'Coinbase listing bot',
  };
  await axios.post(DISCORD_WEBHOOK, JSON.stringify(data), {
    headers: { 'Content-type': 'application/json' },
  });
};

const main = async () => {
  const coins = await detectListing();
  if (coins.length > 0) {
    coins.forEach((coin) => {
      const event = {
        path: '/api/buy',
        queryStringParameters: {
          coin,
          with: 'USDT',
          type: 'MARKET',
          forQuantity: '15',
        },
      };
      // rethink this
      buy(event);
    });
    await alertLaunching(coins);
  }
};

module.exports = { main };
