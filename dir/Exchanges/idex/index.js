"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Dependencies
const https = require('https');
const url = require('url');
// Local Dependencies
class Idex {
    constructor(data) {
        this.agent = data && data.agent ? data.agent : null;
        this.id = 'idex';
        this.url = 'https://api.idex.market/';
        this.has = { fetchTickers: true, fetchTicker: true };
        this.markets = {};
        this.markets_by_id = {};
        this.loadedMarkets = false;
        this.numberMarketId = {};
    }
    loadMarkets() {
        return new Promise(async (resolve, reject) => {
            try {
                let options = url.parse(`${this.url}returnTicker`);
                // Add agent
                if (this.agent)
                    options.agent = this.agent;
                // Load markets
                const MARKETS = await this.apiCall(options);
                this.loadedMarkets = true;
                // standardizing data
                this.addMarkets(MARKETS);
                resolve(this.markets);
            }
            catch (e) {
                console.log(e);
                this.loadedMarkets = false;
                reject(`Error idex loadMarkets: ${String(e)}`);
            }
        });
    }
    fetchTickers() {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.loadedMarkets)
                    return reject('Error idex: Exchange is not loaded locally');
                let options = url.parse(`${this.url}returnTicker`);
                if (this.agent)
                    options.agent = this.agent;
                // Get tickers
                const TICKERS = await this.apiCall(options);
                resolve(this.prepTickers(TICKERS));
            }
            catch (e) {
                reject(`Error idex fetchTickers: ${String(e)}`);
            }
        });
    }
    fetchTicker(symbol) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.loadedMarkets)
                    return reject('Error idex: Exchange is not loaded locally');
                if (typeof symbol !== 'string' || !symbol.includes('/'))
                    return reject('Error idex: Received pair format is not valid');
                if (!this.markets[symbol])
                    return reject(`Error idex: symbol ${symbol} is not supported`);
                const PAIR = this.markets[symbol].id;
                let options = url.parse(`${this.url}returnTicker`);
                if (this.agent)
                    options.agent = this.agent;
                options.method = 'POST';
                options.headers = {
                    'Content-type': 'application/json',
                };
                // Get tickers
                const TICKERS = await this.apiCall(options, JSON.stringify({ market: PAIR }));
                resolve(this.prepTicker(TICKERS, symbol));
            }
            catch (e) {
                reject(`Error idex fetchTickers: ${String(e)}`);
            }
        });
    }
    fetchOrderBook(symbol, limit) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.loadedMarkets)
                    return reject('Error idex: Exchange is not loaded locally');
                if (typeof symbol !== 'string' || !symbol.includes('/'))
                    return reject('Error idex: Received pair format is not valid');
                if (!this.markets[symbol])
                    return reject(`Error idex: symbol ${symbol} is not supported`);
                let options = url.parse(`${this.url}returnOrderBook`);
                if (this.agent)
                    options.agent = this.agent;
                const PAIR = this.markets[symbol].id;
                options.method = 'POST';
                options.headers = {
                    'Content-type': 'application/json',
                };
                // Get ob
                let OB = await this.apiCall(options, JSON.stringify({ market: PAIR }));
                resolve(await this.prepOb(OB));
            }
            catch (e) {
                reject(`Error idex fetchOrderBook: ${String(e)}`);
            }
        });
    }
    // Custom made api call with support for proxies
    apiCall(options, body) {
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let buffer = '';
                res.on('data', (d) => {
                    buffer += d;
                });
                res.on('end', () => {
                    try {
                        const data = JSON.parse(buffer);
                        if (data.error)
                            return reject(data.error ?
                                data.error :
                                `Error: idex! Bad response received from exchange`);
                        resolve(data);
                    }
                    catch (e) {
                        return reject(`in parsing: ${String(e)}, ${String(buffer)}`);
                    }
                });
            });
            req.on('error', (e) => {
                console.error('error in custom idex', e);
                reject(String(e));
            });
            if (options.method && options.method === 'POST')
                req.write(body);
            req.end();
        });
    }
    // Add markets to main obj by standards
    addMarkets(markets) {
        for (let coin in markets) {
            if (markets[coin]) {
                const [base, quote] = coin.split('_');
                const SYMBOL = `${quote}/${base}`;
                this.markets[SYMBOL] = {
                    active: true,
                    base,
                    id: coin,
                    quote,
                    symbol: SYMBOL,
                };
                this.markets_by_id[coin] = {
                    active: true,
                    base,
                    id: coin,
                    quote,
                    symbol: SYMBOL,
                };
            }
        }
    }
    // Prep tickers by standards
    prepTicker(data, symbol) {
        return {
            ask: Number(data.lowestAsk),
            bid: Number(data.highestBid),
            info: {
                MarketName: this.markets[symbol].id,
            },
            percentage: data.percentChange,
            symbol,
            timestamp: Date.now(),
        };
    }
    prepTickers(data) {
        let result = {};
        for (let coin in data) {
            if (data[coin]) {
                const SYMBOL = this.markets_by_id[coin].symbol;
                result[SYMBOL] = {
                    ask: Number(data[coin].lowestAsk),
                    bid: Number(data[coin].highestBid),
                    info: {
                        MarketName: this.markets[SYMBOL].id,
                    },
                    percentage: data[coin].percentChange,
                    symbol: SYMBOL,
                    timestamp: Date.now(),
                };
            }
        }
        return result;
    }
    async prepOb(data) {
        try {
            const [firstResponse, secondResponse] = await Promise.all([
                this.loopOb(data.asks, 'asks'),
                this.loopOb(data.bids, 'bids'),
            ]);
            if (firstResponse.type === 'asks') {
                return {
                    asks: firstResponse.result,
                    bids: secondResponse.result,
                    nonce: undefined,
                    timestamp: Date.now(),
                };
            }
            return {
                asks: secondResponse.result,
                bids: firstResponse.result,
                nonce: undefined,
                timestamp: Date.now(),
            };
        }
        catch (e) {
            throw e;
        }
    }
    loopOb(data, type) {
        return new Promise((resolve, reject) => {
            try {
                let i = 0;
                let iMax = data.length;
                let result = [];
                for (; i < iMax; i++) {
                    result.push([data[i].price, data[i].amount]);
                }
                resolve({ result, type });
            }
            catch (e) {
                reject(`Error in loopOb: ${String(e)}`);
            }
        });
    }
}
exports.default = Idex;
