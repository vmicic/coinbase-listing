const axios = require('axios');
const {
  getTitlesFromBody,
  getTitlesFromApi,
  getNewTitles,
  isTitleLaunching,
  getLaunchingCoins,
} = require('../src/coinbaseListing');

jest.mock('axios');

describe('get titles from body', () => {
  test('get titles', () => {
    const body = {
      success: true,
      payload: {
        collection: {
          id: 'c114225aeaf7',
          name: 'The Coinbase Blog',
          slug: 'the-coinbase-blog',
          ptsQualifiedAt: 1616092823069,
          type: 'Collection',
        },
        header: {
          title: '',
          description:
            'Stories from the easiest and most trusted place to buy, sell, and use crypto',
          alignment: 2,
          layout: 5,
        },
        streamItems: [],
        references: {
          Post: {
            '868fe4e3fa71': {
              id: '868fe4e3fa71',
              versionId: '341b7a49b0cb',
              creatorId: '913e7ed84452',
              homeCollectionId: 'c114225aeaf7',
              title: '$COIN — it’s only the beginning',
            },
            '18745d6a5d42': {
              id: '18745d6a5d42',
              versionId: '6da1b5f3a039',
              creatorId: '913e7ed84452',
              homeCollectionId: 'c114225aeaf7',
              title: 'Ampleforth Governance Token (FORTH) is launching on Coinbase Pro',
              detectedLanguage: 'en',
              latestVersion: '6da1b5f3a039',
              latestPublishedVersion: '6da1b5f3a039',
              hasUnpublishedEdits: false,
              latestRev: 37,
            },
            a8066c9a41a9: {
              id: 'a8066c9a41a9',
              versionId: '78c66e135952',
              creatorId: '913e7ed84452',
              homeCollectionId: 'c114225aeaf7',
              title: 'Coinbase releases investor education resources',
              detectedLanguage: 'en',
              latestVersion: '78c66e135952',
              latestPublishedVersion: '78c66e135952',
              hasUnpublishedEdits: false,
              latestRev: 76,
              curationEligibleAt: 0,
              primaryTopicId: '9213b0063bcc',
              isProxyPost: false,
              proxyPostFaviconUrl: '',
              proxyPostProviderName: '',
              proxyPostType: 0,
            },
          },
        },
      },
      v: 3,
      b: '20210422-0115-root',
    };

    const titles = getTitlesFromBody(body);
    expect(titles[0]).toStrictEqual('$COIN — it’s only the beginning');
    expect(titles[1]).toStrictEqual(
      'Ampleforth Governance Token (FORTH) is launching on Coinbase Pro',
    );
    expect(titles[2]).toStrictEqual('Coinbase releases investor education resources');
  });
});

describe('get titles from api', () => {
  test('get titles', async () => {
    const data = {
      success: true,
      payload: {
        references: {
          Post: {
            '868fe4e3fa71': {
              id: '868fe4e3fa71',
              versionId: '341b7a49b0cb',
              title: '$COIN — it’s only the beginning',
            },
            '18745d6a5d42': {
              id: '18745d6a5d42',
              versionId: '6da1b5f3a039',
              creatorId: '913e7ed84452',
              homeCollectionId: 'c114225aeaf7',
              title: 'Ampleforth Governance Token (FORTH) is launching on Coinbase Pro',
            },
            a8066c9a41a9: {
              id: 'a8066c9a41a9',
              versionId: '78c66e135952',
              creatorId: '913e7ed84452',
              homeCollectionId: 'c114225aeaf7',
              title: 'Coinbase releases investor education resources',
            },
          },
        },
        paging: {
          next: { to: '1619092390311', ignoredIds: [], page: 4 },
        },
      },
    };

    axios.get.mockResolvedValue({
      data: `])}while(1);</x>${JSON.stringify(data)}`,
    });
    const titles = await getTitlesFromApi('url');
    expect(titles[0]).toStrictEqual('$COIN — it’s only the beginning');
    expect(titles[1]).toStrictEqual(
      'Ampleforth Governance Token (FORTH) is launching on Coinbase Pro',
    );
    expect(titles[2]).toStrictEqual('Coinbase releases investor education resources');
    expect(titles[3]).toStrictEqual('$COIN — it’s only the beginning');
    expect(titles[4]).toStrictEqual(
      'Ampleforth Governance Token (FORTH) is launching on Coinbase Pro',
    );
    expect(titles[5]).toStrictEqual('Coinbase releases investor education resources');
  });
});

describe('get new titles', () => {
  test('no new titles', () => {
    const oldTitles = [
      '$COIN — it’s only the beginning',
      'Ampleforth Governance Token (FORTH) is launching on Coinbase Pro',
      'Coinbase releases investor education resources',
    ];

    const titles = [
      '$COIN — it’s only the beginning',
      'Ampleforth Governance Token (FORTH) is launching on Coinbase Pro',
      'Coinbase releases investor education resources',
    ];

    const newTitles = getNewTitles([...oldTitles], [...titles]);
    expect(newTitles.length).toBe(0);
  });

  test('one new title', () => {
    const oldTitles = [
      '$COIN — it’s only the beginning',
      'Ampleforth Governance Token (FORTH) is launching on Coinbase Pro',
      'Coinbase releases investor education resources',
    ];

    const titles = [
      '$COIN — it’s only the beginning',
      'Ampleforth Governance Token (FORTH) is launching on Coinbase Pro',
      'Coinbase releases investor education resources',
      'ThroChain (RUNE) is launching on Coinbase Pro',
    ];

    const newTitles = getNewTitles([...oldTitles], [...titles]);
    expect(newTitles.length).toBe(1);
    expect(newTitles[0]).toMatch('ThroChain (RUNE) is launching on Coinbase Pro');
  });

  test('two new titles', () => {
    const oldTitles = [
      '$COIN — it’s only the beginning',
      'Ampleforth Governance Token (FORTH) is launching on Coinbase Pro',
      'Coinbase releases investor education resources',
    ];

    const titles = [
      '$COIN — it’s only the beginning',
      'Ampleforth Governance Token (FORTH) is launching on Coinbase Pro',
      'Coinbase releases investor education resources',
      'ThroChain (RUNE) is launching on Coinbase Pro',
      'Haven (XHV) is launching on Coinbase Pro',
    ];

    const newTitles = getNewTitles([...oldTitles], [...titles]);
    expect(newTitles.length).toBe(2);
    expect(newTitles[0]).toMatch('ThroChain (RUNE) is launching on Coinbase Pro');
    expect(newTitles[1]).toMatch('Haven (XHV) is launching on Coinbase Pro');
  });
});

describe('is title launching', () => {
  test('title is launching', () => {
    const title = 'ThorCHAIN (RUNE) is launching on Coinbase Pro';
    expect(isTitleLaunching(title)).toBeTruthy();
  });

  test('title is not launching', () => {
    const title = 'ThorCHAIN (RUNE) is on Coinbase Pro';
    expect(isTitleLaunching(title)).toBeFalsy();
  });
});

describe('get launching coins', () => {
  test('get single launching coin', () => {
    const title = 'ThorCHAIN (RUNE) is on Coinbase Pro';
    const coins = getLaunchingCoins(title);

    expect(coins.length).toBe(1);
    expect(coins[0]).toMatch('RUNE');
  });

  test('get multiple launching coins', () => {
    // prettier-ignore
    const title = '1inch (1INCH), Enjin Coin (ENJ), NKN (NKN) and Origin Token (OGN) are launching on Coinbase Pro';
    const coins = getLaunchingCoins(title);

    expect(coins.length).toBe(4);
    expect(coins[0]).toMatch('1INCH');
    expect(coins[1]).toMatch('ENJ');
    expect(coins[2]).toMatch('NKN');
    expect(coins[3]).toMatch('OGN');
  });
});
