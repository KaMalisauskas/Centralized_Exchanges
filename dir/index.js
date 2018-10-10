"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./Exchanges/chaoex/index");
const index_2 = require("./Exchanges/idex/index");
const CustomCcxt = {
    chaoex: index_1.default,
    idex: index_2.default,
    exchanges: ['idex'],
};
exports.default = CustomCcxt;
