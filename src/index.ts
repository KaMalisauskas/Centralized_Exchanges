import Chaoex from './Exchanges/chaoex/index';
import Idex from './Exchanges/idex/index';

const CustomCcxt : any = {

    chaoex : Chaoex,

    idex   : Idex,

    exchanges : ['idex'],

};

module.exports = CustomCcxt;
