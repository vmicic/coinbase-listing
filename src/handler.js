const axios = require('axios');

// in order to reduce deployment package
// added only to dev dependencies
// since aws-sdk is available in lambda envronment
// eslint-disable-next-line import/no-extraneous-dependencies
const AWS = require('aws-sdk');

const client = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });

const POSTS_API_URI = 'https://medium.com/_/api/collections/c114225aeaf7/stream';
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/833780553488400404/vA6mQgmHhJuXIiW6WTb8PxA-No9edieuuoB4bGbzOPeAEu7Qj5Nb-OqIyZsU-j2f2UeO';

const { DATA_TABLE } = process.env;

const getTitlesFromApi = async (url) => {
  const response = await axios.get(url);
  const body = JSON.parse(response.data.substring(16));
  const posts = { ...body.payload.references.Post };
  const postsId = Object.keys(posts);
  return postsId.map((id) => posts[id].title);
};

const getSavedTitlesFromDatabase = async () => {
  const data = await client.scan({
    TableName: DATA_TABLE,
  }).promise();
  return data.Items.map((item) => item.id);
};

const saveTitlesToDatabase = async (titles) => {
  const promises = [];
  // replace with bulk write later
  titles.forEach((title) => {
    const saveTitlePromise = client.put({ TableName: DATA_TABLE, Item: { id: title } }).promise();
    promises.push(saveTitlePromise);
  });
  await Promise.all(promises);
};

// note, I've used the sort inside
// also, this is a pretty bad way of handling this
// but will be updated
const compareTitles = (oldTitles, titlesFromApi) =>
  JSON.stringify(oldTitles.sort()) !== JSON.stringify(titlesFromApi.sort());

// just to make sure that the case doesn't mess us up
const isTitleLaunching = (title) => title.toLowerCase().includes('launching on Coinbase'.toLowerCase());

const getLaunchingCoins = (title) => {
  const words = title.split(' ');
  const coins = words
    .filter((word) => {
      // get only words in between parentheses
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
  await saveTitlesToDatabase(titles);

  const isNewTitleAdded = compareTitles(oldTitles, titles);
  if (!isNewTitleAdded) {
    return [];
  }

  const newTitle = titles[0];
  if (!isTitleLaunching(newTitle)) {
    return [];
  }
  const coins = getLaunchingCoins(newTitle);
  return coins;
};

const alertLaunching = async (coins) => {
  const data = {
    content: `${coins.join(' ')} launched on Coinbase :)`,
    avatar: '',
    username: 'Coinbase listing bot',
  };
  await axios.post(DISCORD_WEBHOOK, JSON.stringify(data), { headers: { 'Content-type': 'application/json' } });
};

const main = async () => {
  const coins = await detectListing();
  if (coins.length > 0) {
    // place to handle binance :)
    await alertLaunching(coins);
  }
};

module.exports = { main };
