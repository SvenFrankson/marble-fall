/// <reference path="./Track.ts"/>

class FlatLoop extends Track {
    constructor(game: Game, i: number, j: number) {
        super(game, i, j);

        this.deserialize({"points":[{"position":{"x":-0.056249999999999994,"y":0.032475952641916446,"z":0},"normal":{"x":0.09950371902099892,"y":0.9950371902099892,"z":0},"dir":{"x":0.9950371902099892,"y":-0.09950371902099892,"z":0}},{"position":{"x":0.00013117709089955666,"y":0.02681771816142543,"z":-0.0008691451477942794},"normal":{"x":0.06013055785047781,"y":0.9772966736270935,"z":-0.20316379532290918}},{"position":{"x":0.03729992082962928,"y":0.022330082345944437,"z":-0.021117524203230674},"normal":{"x":-0.17230764542910132,"y":0.9564122553470104,"z":-0.23576614080211902}},{"position":{"x":0.0388,"y":0.018,"z":-0.0649},"normal":{"x":-0.23459665547179567,"y":0.9720922072636946,"z":0.0010722959693467982}},{"position":{"x":0,"y":0.0134,"z":-0.086},"normal":{"x":-0.11641347731821079,"y":0.9706017270599991,"z":0.21066606211449826}},{"position":{"x":-0.03785581637015418,"y":0.009270059536442235,"z":-0.06703833611704814},"normal":{"x":0.11796601040944829,"y":0.9716067942972144,"z":0.2050957280480716}},{"position":{"x":-0.03611819539841811,"y":0.004703114480343419,"z":-0.02402565955208746},"normal":{"x":0.25504698351749366,"y":0.9667904709563657,"z":-0.016346910001466614}},{"position":{"x":0,"y":0.0004,"z":-0.001},"normal":{"x":0.12214462616353287,"y":0.9720855980710909,"z":-0.2003254360338217}},{"position":{"x":0.0375,"y":-0.0038,"z":-0.0204},"normal":{"x":-0.11964477766740955,"y":0.9708483625651176,"z":-0.20769830062267303}},{"position":{"x":0.039,"y":-0.0084,"z":-0.0646},"normal":{"x":-0.23699338453768456,"y":0.9715109569982103,"z":-0.0007720866497006876}},{"position":{"x":0,"y":-0.013,"z":-0.086},"normal":{"x":-0.11960413777425635,"y":0.958032045443619,"z":0.2605176580011282}},{"position":{"x":-0.0381,"y":-0.0174,"z":-0.0669},"normal":{"x":0.1634069356663116,"y":0.9599541428093687,"z":0.2275658521819039},"tangentIn":1},{"position":{"x":-0.0361,"y":-0.0216,"z":-0.0238},"normal":{"x":0.30696027384334723,"y":0.9501014912553933,"z":-0.055520686201587816}},{"position":{"x":0,"y":-0.0258,"z":0},"normal":{"x":0.16500014231293691,"y":0.9660542507982967,"z":-0.19878163283173855}},{"position":{"x":0.056249999999999994,"y":-0.032475952641916446,"z":0},"normal":{"x":0.09950371902099892,"y":0.9950371902099892,"z":0},"dir":{"x":0.9950371902099892,"y":-0.09950371902099892,"z":0}}]});

        this.subdivisions = 3;

        this.generateWires();
    }
}
