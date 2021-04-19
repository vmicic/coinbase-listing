import axios from 'axios';
import dotenv from 'dotenv';

import { writeFile, readFileSync } from 'fs';

dotenv.config();

const blogPostUri = 'https://medium.com/_/api/collections/c114225aeaf7/stream';

const isTitleLaunching = (title) => title.includes('launching on Coinbase');

const getTitlesFromApi = async (url) => {
  const response = await axios.get(url);
  const body = JSON.parse(response.data.substring(16));
  const posts = { ...body.payload.references.Post };
  const postsId = Object.keys(posts);

  return postsId.map((id) => posts[id].title);
};

const saveTitles = (titles) =>
  writeFile('process.env.TITLES_FILE_PATH', JSON.stringify(titles), () => {});

const getOldTitles = () => {
  const data = readFileSync(process.env.TITLES_FILE_PATH);
  if (data.length === 0) {
    return [];
  }
  return JSON.parse(data);
};

const compareTitles = (oldTitles, titlesFromApi) =>
  JSON.stringify(oldTitles) !== JSON.stringify(titlesFromApi);

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

const alertLaunching = (title, coins) => {
  console.log(title);
  console.log(coins);
};

const checkNewBlogPosts = async () => {
  const titlesFromApi = await getTitlesFromApi(blogPostUri);
  const oldTitles = getOldTitles();
  if (oldTitles.length === 0) {
    saveTitles(titlesFromApi);
    return;
  }

  const isTitleAdded = compareTitles(oldTitles, titlesFromApi);

  if (isTitleAdded) {
    const newTitle = titlesFromApi[0];
    if (isTitleLaunching(newTitle)) {
      const coins = getLaunchingCoins(newTitle);
      alertLaunching(newTitle, coins);
    }
    // saveTitles(titlesFromApi);
  }
};

checkNewBlogPosts();
