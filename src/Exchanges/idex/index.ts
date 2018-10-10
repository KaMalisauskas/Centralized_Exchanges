// Dependencies
const https = require('https');
const url = require('url');

// Local Dependencies

export default class Idex {

    public agent          : any;
    public id             : string;
    public url            : string;
    public has            : IHasExchangeCcxtStructure;
    public markets        : IMarketsExchangeCcxtStructure;
    public markets_by_id  : IMarketsByIdExchangeCcxtStructure;
    public loadedMarkets  : boolean;
    public numberMarketId : INumberMarketIds;

    constructor (data? : any) {

        this.agent          = data && data.agent ? data.agent : null;
        this.id             = 'idex';
        this.url            = 'https://api.idex.market/';
        this.has            = {fetchTickers: true, fetchTicker: true};
        this.markets        = {};
        this.markets_by_id  = {};
        this.loadedMarkets  = false;
        this.numberMarketId = {};

    }

    public loadMarkets () {
        return new Promise(async (resolve, reject) => {
            try {

                let options: any = url.parse(`${this.url}returnTicker`);

                // Add agent
                if (this.agent)
                    options.agent = this.agent;

                // Load markets
                const MARKETS : IIdexTickers = await this.apiCall(options);

                this.loadedMarkets = true;

                // standardizing data
                this.addMarkets(MARKETS);
                resolve(this.markets);

            } catch (e) {

                console.log(e);
                this.loadedMarkets = false;
                reject(`Error idex loadMarkets: ${String(e)}`);

            }

        });
    }

    public fetchTickers () {
        return new Promise(async (resolve, reject) => {

            try {

                if (!this.loadedMarkets)
                    return reject('Error idex: Exchange is not loaded locally');

                let options: any = url.parse(
                    `${this.url}returnTicker`,
                );

                if (this.agent)
                    options.agent = this.agent;

                // Get tickers
                const TICKERS : any = await this.apiCall(options);

                resolve(this.prepTickers(TICKERS));

            } catch (e) {

                reject(`Error idex fetchTickers: ${String(e)}`);
            }

        });
    }

    public fetchTicker (symbol : string) {
        return new Promise (async (resolve, reject) => {

            try {

                if (!this.loadedMarkets)
                    return reject('Error idex: Exchange is not loaded locally');

                if (typeof symbol !== 'string' || !symbol.includes('/'))
                    return reject('Error idex: Received pair format is not valid');

                if (!this.markets[symbol])
                    return reject(`Error idex: symbol ${symbol} is not supported`);

                const PAIR : string = this.markets[symbol].id;

                let options: any = url.parse(
                    `${this.url}returnTicker`,
                );

                if (this.agent)
                    options.agent = this.agent;

                options.method = 'POST';

                options.headers = {
                    'Content-type': 'application/json',
                };

                // Get tickers
                const TICKERS : any = await this.apiCall(options, JSON.stringify({market: PAIR}));

                resolve(this.prepTicker(TICKERS, symbol));

            } catch (e) {

                reject(`Error idex fetchTickers: ${String(e)}`);
            }

        });
    }

    public fetchOrderBook (symbol : string, limit? : number) : Promise<IOb> {
        return new Promise(async (resolve, reject) => {
            try {

                if (!this.loadedMarkets)
                    return reject('Error idex: Exchange is not loaded locally');

                if (typeof symbol !== 'string' || !symbol.includes('/'))
                    return reject('Error idex: Received pair format is not valid');

                if (!this.markets[symbol])
                    return reject(`Error idex: symbol ${symbol} is not supported`);

                let options: any = url.parse(
                    `${this.url}returnOrderBook`,
                );

                if (this.agent)
                    options.agent = this.agent;

                const PAIR : string = this.markets[symbol].id;

                options.method = 'POST';

                options.headers = {
                    'Content-type': 'application/json',
                };

                // Get ob
                let OB : IIdexOb = await this.apiCall(options, JSON.stringify({market: PAIR}));

                resolve(await this.prepOb(OB));

            } catch (e) {

                reject(`Error idex fetchOrderBook: ${String(e)}`);

            }

        });
    }

    // Custom made api call with support for proxies
    private apiCall (options : any, body? : string) : any {
        return new Promise((resolve, reject) => {

            const req = https.request(options, (res: any) => {

                let buffer: string = '';

                res.on('data', (d: any) => {
                    buffer += d;
                });

                res.on('end', () => {

                    try {
                        const data = JSON.parse(buffer);

                        if (data.error)
                            return reject(
                                data.error ?
                                    data.error :
                                    `Error: idex! Bad response received from exchange`,
                            );

                        resolve(data);

                    } catch (e) {
                        return reject(`in parsing: ${String(e)}, ${String(buffer)}`);
                    }

                });
            });

            req.on('error', (e: any) => {
                console.error('error in custom idex', e);
                reject(String(e));
            });

            if (options.method && options.method === 'POST')
                req.write(body);

            req.end();

        });
    }

    // Add markets to main obj by standards
    private addMarkets (markets : IIdexTickers) {

        for (let coin in markets) {

            if (markets[coin]) {

                const [base, quote] = coin.split('_');

                const SYMBOL : string = `${quote}/${base}`;

                this.markets[SYMBOL] = {
                    active      : true,
                    base,
                    id          : coin,
                    quote,
                    symbol      : SYMBOL,
                };

                this.markets_by_id[coin] = {
                    active      : true,
                    base,
                    id          : coin,
                    quote,
                    symbol      : SYMBOL,
                };

            }

        }

    }

    // Prep tickers by standards
    private prepTicker (data : IIdexTickers, symbol : string) {
        return {
            ask         : Number(data.lowestAsk),
            bid         : Number(data.highestBid),
            info: {
                MarketName: this.markets[symbol].id,
            },
            percentage  : data.percentChange,
            symbol,
            timestamp   : Date.now(),
        };
    }

    private prepTickers (data : IIdexTickers) : ITickers {

        let result : ITickers = {};

        for (let coin in data) {

            if (data[coin]) {

                const SYMBOL : string = this.markets_by_id[coin].symbol;

                result[SYMBOL] = {
                    ask         : Number(data[coin].lowestAsk),
                    bid         : Number(data[coin].highestBid),
                    info: {
                        MarketName: this.markets[SYMBOL].id,
                    },
                    percentage  : data[coin].percentChange,
                    symbol      : SYMBOL,
                    timestamp   : Date.now(),
                };

            }

        }

        return result;

    }

    private async prepOb (data : IIdexOb) : Promise<IOb> {

        try {

            const [firstResponse, secondResponse] : IIdexObLoop[] = await Promise.all([
                this.loopOb(data.asks, 'asks'),
                this.loopOb(data.bids, 'bids'),
            ]);

            if (firstResponse.type === 'asks') {

                return {
                    asks: firstResponse.result,
                    bids: secondResponse.result,
                    nonce     : undefined,
                    timestamp : Date.now(),
                };

            }

            return {
                asks: secondResponse.result,
                bids: firstResponse.result,
                nonce     : undefined,
                timestamp : Date.now(),
            };

        } catch (e) {
            throw e;
        }

    }

    private loopOb (data : IIdexObSngl[], type : string) : Promise<IIdexObLoop>{
        return new Promise((resolve, reject) => {

            try {

                let i : number = 0;

                let iMax: number = data.length;

                let result : any = [];

                for (; i < iMax; i++) {

                    result.push([data[i].price, data[i].amount]);

                }

                resolve({result, type});

            } catch (e) {
                reject(`Error in loopOb: ${String(e)}`);
            }

        });

    }
}
