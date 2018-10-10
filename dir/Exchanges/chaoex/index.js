"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Dependencies
const https = require('https');
const url = require('url');
// Local Dependencies
class Chaoex {
    constructor({ apiKey, secret, password, uid, agent }) {
        this.agent = agent ? agent : null;
        this.id = 'chaoex';
        this.url = 'https://www.chaoex.com/12lian/';
        this.has = { fetchTickers: true, fetchTicker: true };
        this.apiKey = apiKey ? apiKey : '';
        this.secret = secret ? secret : '';
        this.password = password ? password : '';
        this.uid = uid ? uid : '';
        this.markets = {};
        this.markets_by_id = {};
        this.loadedMarkets = false;
        this.numberMarketId = {};
    }
    loadMarkets() {
        return new Promise(async (resolve, reject) => {
            try {
                let options = url.parse(`${this.url}coin/allCurrencyRelations`);
                if (this.agent)
                    options.agent = this.agent;
                const MARKETS = await this.apiCall(options);
                this.loadedMarkets = true;
                this.addMarkets(MARKETS);
                resolve();
            }
            catch (e) {
                this.loadedMarkets = false;
                reject(`Error chaoex loadMarkets: ${String(e)}`);
            }
        });
    }
    fetchTicker(symbol) {
        return new Promise((resolve, reject) => {
            try {
                if (!this.loadedMarkets)
                    return reject('Error chaoex: Exchange is not loaded locally');
                if (typeof symbol !== 'string' || !symbol.includes('/'))
                    return reject('Error chaoex: Received pair format is not valid');
                if (!this.markets[symbol])
                    return reject(`Error chaoex: symbol ${symbol} is not supported`);
                let [quote, base] = symbol.split('/');
                quote = quote.toLowerCase();
                base = base.toLowerCase();
                let options = url.parse(`${this.url}quote/v2/realTime?coins=${base}_${quote}`);
                if (this.agent)
                    options.agent = this.agent;
                const TICKERS = this.apiCall(options);
                resolve(this.prepTicker(TICKERS, symbol));
            }
            catch (e) {
                reject(`Error chaoex fetchTickers: ${String(e)}`);
            }
        });
    }
    fetchOrderBook(symbol, limit) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.loadedMarkets)
                    return reject('Error chaoex: Exchange is not loaded locally');
                if (typeof symbol !== 'string' || !symbol.includes('/'))
                    return reject('Error chaoex: Received pair format is not valid');
                if (!this.markets[symbol])
                    return reject(`Error chaoex: symbol ${symbol} is not supported`);
                let [quote, base] = symbol.split('/');
                let baseId = this.numberMarketId[base];
                let quoteId = this.numberMarketId[quote];
                limit = limit ? limit : 50;
                if (!baseId && !quoteId)
                    return reject(`Base or quote currencies id (${base}, ${quote} is undefiened`);
                let options = url.parse(`${this.url}quote/tradeDeepin?baseCurrencyId=${baseId}&tradeCurrencyId=${quoteId}&limit=${limit}`);
                if (this.agent)
                    options.agent = this.agent;
                let OB = await this.apiCall(options);
                resolve({
                    asks: OB.asks,
                    bids: OB.bids,
                    nonce: undefined,
                    timestamp: Date.now(),
                });
            }
            catch (e) {
                reject(`Error chaoex fetchOrderBook: ${String(e)}`);
            }
        });
    }
    apiCall(options) {
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let buffer = '';
                res.on('data', (d) => {
                    buffer += d;
                });
                res.on('end', () => {
                    const data = JSON.parse(buffer);
                    if (!data.attachment)
                        return reject(data.message || data.error ?
                            `${data.message} ${data.error ? data.error : ''}` :
                            `Error: chaoex! Bad response received from exchange`);
                    resolve(data.attachment);
                });
            });
            req.on('error', (e) => {
                console.error('error in custom chaoex', e);
                reject(String(e));
            });
            req.end();
        });
    }
    addMarkets(markets) {
        let i = 0;
        let iMax = markets.length;
        for (; i < iMax; i++) {
            const MARKET_ID = `${markets[i].tradeCurrencyNameEn.toLowerCase()}_${markets[i].baseCurrencyNameEn.toLowerCase()}`;
            const SYMBOL = `${markets[i].tradeCurrencyNameEn}/${markets[i].baseCurrencyNameEn}`;
            if (!this.numberMarketId[markets[i].tradeCurrencyNameEn])
                this.numberMarketId[markets[i].tradeCurrencyNameEn] = markets[i].tradeCurrencyId;
            if (!this.numberMarketId[markets[i].baseCurrencyNameEn])
                this.numberMarketId[markets[i].baseCurrencyNameEn] = markets[i].baseCurrencyId;
            this.markets[SYMBOL] = {
                active: true,
                base: markets[i].baseCurrencyNameEn,
                id: MARKET_ID,
                limits: {
                    amount: {
                        max: markets[i].amountHighLimit,
                        min: markets[i].amountLowLimit,
                    },
                },
                quote: markets[i].tradeCurrencyNameEn,
                symbol: SYMBOL,
            };
            this.markets_by_id[MARKET_ID] = {
                active: true,
                base: markets[i].baseCurrencyNameEn,
                id: MARKET_ID,
                quote: markets[i].tradeCurrencyNameEn,
                symbol: SYMBOL,
            };
        }
    }
    prepTicker(data, symbol) {
        return {
            ask: data.attachment.sell,
            bid: data.attachment.buy,
            change: data.attachment.changeAmount,
            info: {
                MarketName: this.markets[symbol].id,
            },
            percentage: data.attachment.changeRate,
            symbol,
            timestamp: Date.now(),
        };
    }
}
exports.default = Chaoex;
