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
    "snake",
    "elevator-bottom-6",
    "elevator-bottom-10",
    "elevator-bottom-14",
    "elevator-top",
];

class TrackFactory {

    constructor(public machine: Machine) {

    }

    public createTrack(trackname: string, i: number, j: number, mirror?: boolean): Track {
        for (let n = 1; n <= 3; n++) {
            if (trackname === "flat-" + n.toFixed(0)) {
                return new Flat(this.machine, i, j, n);
            }
        }
        for (let n = 1; n <= 3; n++) {
            if (trackname === "flatX-" + n.toFixed(0)) {
                return new CrossingFlat(this.machine, i, j, n);
            }
        }
        for (let n = 1; n <= 3; n++) {
            for (let m = 1; m <= 2; m++) {
                if (trackname === "ramp-" + n.toFixed(0) + "." + m.toFixed(0)) {
                    return new Ramp(this.machine, i, j, n, m, mirror);
                }
            }
        }
        for (let n = 1; n <= 3; n++) {
            for (let m = 1; m <= 2; m++) {
                if (trackname === "rampX-" + n.toFixed(0) + "." + m.toFixed(0)) {
                    return new CrossingRamp(this.machine, i, j, n, m, mirror);
                }
            }
        }
        if (trackname === "uturn-s") {
            return new UTurn(this.machine, i, j, mirror);
        }
        if (trackname === "uturn-l") {
            return new UTurn(this.machine, i, j, mirror);
        }
        if (trackname === "loop") {
            return new Loop(this.machine, i, j, mirror);
        }
        if (trackname === "wave") {
            return new Wave(this.machine, i, j, mirror);
        }
        if (trackname === "snake") {
            return new Snake(this.machine, i, j, mirror);
        }
        if (trackname === "spiral") {
            return new Spiral(this.machine, i, j, mirror);
        }
        for (let n = 6; n <= 14; n += 4) {
            if (trackname === "elevator-bottom-" + n.toFixed(0)) {
                return new ElevatorBottom(this.machine, i, j, n);
            }
        }
        if (trackname === "elevator-top") {
            return new ElevatorTop(this.machine, i, j, mirror);
        }
    }
}