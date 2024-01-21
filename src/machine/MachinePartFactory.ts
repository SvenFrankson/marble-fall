var TrackNames = [
    "ramp-1.1",
    "join",
    "split",
    "rampX-1.1",
    "uturn-s",
    "uturn-l",
    "loop",
    "wave",
    "snake",
    "spiral",
    "elevator-4"
];

class MachinePartFactory {

    constructor(public machine: Machine) {

    }

    public createTrackWH(trackname: string, i: number, j: number, w?: number, h?: number, mirror?: boolean): MachinePart {
        trackname = trackname.split("-")[0];
        let wh = "";
        if (isFinite(w)) {
            wh += w.toFixed(0) + ".";
        }
        if (isFinite(h)) {
            wh += h.toFixed(0);
        }
        trackname += "-" + wh;
        return this.createTrack(trackname, i, j, mirror);
    }

    public createTrack(trackname: string, i: number, j: number, mirror?: boolean): MachinePart {
        if (trackname.startsWith("flat-")) {
            let w = parseInt(trackname.split("-")[1]);
            return new Ramp(this.machine, i, j, w, 0, mirror);
        }
        if (trackname.startsWith("flatX-")) {
            let w = parseInt(trackname.split("-")[1]);
            return new CrossingRamp(this.machine, i, j, w, 0, mirror);
        }
        if (trackname.startsWith("ramp-")) {
            let w = parseInt(trackname.split("-")[1].split(".")[0]);
            let h = parseInt(trackname.split("-")[1].split(".")[1]);
            return new Ramp(this.machine, i, j, w, h, mirror);
        }
        if (trackname.startsWith("rampX-")) {
            let w = parseInt(trackname.split("-")[1].split(".")[0]);
            let h = parseInt(trackname.split("-")[1].split(".")[1]);
            return new CrossingRamp(this.machine, i, j, w, h, mirror);
        }
        if (trackname === "uturn-s") {
            return new UTurn(this.machine, i, j, mirror);
        }
        if (trackname === "uturn-l") {
            return new UTurnLarge(this.machine, i, j, mirror);
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
        if (trackname === "join") {
            return new Join(this.machine, i, j, mirror);
        }
        if (trackname === "split") {
            return new Split(this.machine, i, j, mirror);
        }
        if (trackname.startsWith("elevator-")) {
            let h = parseInt(trackname.split("-")[1]);
            return new Elevator(this.machine, i, j, h, mirror);
        }
    }
}