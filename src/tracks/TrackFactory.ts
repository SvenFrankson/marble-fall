var TrackNames = [
    "flat-1",
    "flat-2",
    "flat-3",
    "flatX-1",
    "flatX-2",
    "flatX-3",
    "ramp-1.1",
    "ramp-2.1",
    "ramp-3.1",
    "ramp-1.2",
    "ramp-2.2",
    "ramp-3.2",
    "rampX-1.1",
    "rampX-2.1",
    "rampX-3.1",
    "rampX-1.2",
    "rampX-2.2",
    "rampX-3.2",
    "uturn-s",
    "uturn-l",
    "loop",
    "wave",
    "snake"
];

class TrackFactory {

    constructor(public game: Game) {

    }

    public createTrack(trackname: string, i: number, j: number, mirror?: boolean): Track {
        for (let n = 1; n <= 3; n++) {
            if (trackname === "flat-" + n.toFixed(0)) {
                return new Flat(this.game, i, j, n);
            }
        }
        for (let n = 1; n <= 3; n++) {
            if (trackname === "flatX-" + n.toFixed(0)) {
                return new CrossingFlat(this.game, i, j, n);
            }
        }
        for (let n = 1; n <= 3; n++) {
            for (let m = 1; m <= 2; m++) {
                if (trackname === "ramp-" + n.toFixed(0) + "." + m.toFixed(0)) {
                    return new Ramp(this.game, i, j, n, m, mirror);
                }
            }
        }
        for (let n = 1; n <= 3; n++) {
            for (let m = 1; m <= 2; m++) {
                if (trackname === "rampX-" + n.toFixed(0) + "." + m.toFixed(0)) {
                    return new CrossingRamp(this.game, i, j, n, m, mirror);
                }
            }
        }
        if (trackname === "uturn-s") {
            return new UTurn(this.game, i, j, mirror);
        }
        if (trackname === "uturn-l") {
            return new UTurn(this.game, i, j, mirror);
        }
        if (trackname === "loop") {
            return new Loop(this.game, i, j, mirror);
        }
        if (trackname === "wave") {
            return new Wave(this.game, i, j, mirror);
        }
        if (trackname === "snake") {
            return new Snake(this.game, i, j, mirror);
        }
        if (trackname === "spiral") {
            return new Spiral(this.game, i, j, mirror);
        }
    }
}