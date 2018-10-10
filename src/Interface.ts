/*
 *
 *
 * Custom Ccxt Exchanges
 *
 */

interface INumberMarketIds {
    [symbol : string] : number;
}

interface IExchangeConstructor {
    apiKey?   : string;
    secret?   : string;
    password? : string;
    uid?      : string;
    agent?    : string;
}

interface ILimitsExchangeCcxtStructure {
    min    : number;
    max    : number;
}

interface IHasExchangeCcxtStructure {
    fetchTickers     : boolean;
    fetchTicker      : boolean;
}

interface IMarketsExchangeCcxtStructure {
    [symbol : string] : {
        id          : string;
        symbol      : string;
        base        : string;
        quote       : string;
        active      : boolean;
        precision?  : {
            price?       : number;
            amount?      : number;
            cost?        : number;
        };
        limits?     : {
            amount?      : ILimitsExchangeCcxtStructure;
            price?       : ILimitsExchangeCcxtStructure;
            cost ?       : ILimitsExchangeCcxtStructure;
        };
    };
}

interface IMarketsByIdExchangeCcxtStructure {
    [id : string] : {
        id          : string;
        symbol      : string;
        base        : string;
        quote       : string;
        active      : boolean;
    };
}

interface IBaseExchangeCcxtStructure {
    id            : string;
    url           : string;
    has           : IHasExchangeCcxtStructure;
    apiKey        : string;
    secret        : string;
    password      : string;
    uid           : string;
    markets       : IMarketsExchangeCcxtStructure;
    markets_by_id : IMarketsByIdExchangeCcxtStructure;
}

interface ITicker {
    ask: number;
    bid: number;
    info: {
        MarketName: string;
    };
    symbol     : string;
    timestamp  : number;
    percentage?: string;
    change?: number;
}

interface ITickers {
    [symbol : string] : ITicker;
}

interface IOb {
    bids      : Array<[number, number]>;
    asks      : Array<[number, number]>;
    timestamp : number;
    nonce?    : string;

}

/*
 *
 * Custom Exchanges
 *
 */

// Idex

interface IIdexTickers {
    [key : string] : {
        last          : string;
        high          : string;
        low           : string;
        lowestAsk     : string;
        highestBid    : string;
        percentChange : string;
        baseVolume    : string;
        quoteVolume   : string;
    };
}

interface IIdexObSngl {

    price: string;
    amount: string;
    total: string;
    orderHash: string;
    params: {
        tokenBuy: string;
        buySymbol: string;
        buyPrecision: string;
        amountBuy: string;
        tokenSell: string;
        sellSymbol: string;
        sellPrecision: string;
        amountSell: string;
        expires: string;
        nonce: string;
        user: string;
    };

}

interface IIdexOb {
    asks : IIdexObSngl[];
    bids : IIdexObSngl[];
}

interface IIdexObLoop {
    result : Array<[number, number]>;
    type : string;
}
