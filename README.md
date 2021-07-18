# coinbase-listing

## Description

Serverless function that automatically buys new Coinbase listings on Binance.

## Setup

 - create .env file in project root with `API_KEY` and `API_SECRET` variable

## Requests

 - buy on Binance:  
 `curl --location --request POST 'http://localhost:3000/dev/api/buy?coin=DOT&coinWith=USDT&type=MARKET&forQuantity=12'`
