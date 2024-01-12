/// <reference path="./Track.ts"/>

class Snake extends Track {
    constructor(game: Game, i: number, j: number, mirror?: boolean) {
        super(game, i, j);

        this.deltaJ = 1;

        this.deserialize({"points":[{"position":{"x":-0.075,"y":0,"z":0},"normal":{"x":0,"y":1,"z":0},"dir":{"x":1,"y":0,"z":0}},{"position":{"x":0.015,"y":-0.0006,"z":-0.02},"normal":{"x":0,"y":0.983976396926608,"z":0.17829876693721267}},{"position":{"x":0.075,"y":0,"z":0},"normal":{"x":-0.0008909764600687716,"y":0.9800741060756494,"z":-0.1986301909603991}},{"position":{"x":0.125,"y":-0.0005,"z":-0.02},"normal":{"x":0,"y":0.9797898655773956,"z":0.20002954609714332}},{"position":{"x":0.225,"y":0,"z":0},"normal":{"x":0,"y":1,"z":0},"dir":{"x":1,"y":0,"z":0}}]});
        
        this.generateWires();
    }
}