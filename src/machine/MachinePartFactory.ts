var TrackNames = [
    "ramp-1.1.1",
    "ramp-1.1.2",
    "join",
    "split",
    "uturn-s",
    "uturn-l",
    "uturnlayer",
    "uturn-2layer",
    "loop",
    "wave",
    "snake",
    "spiral",
    "elevator-4"
];

class MachinePartFactory {

    constructor(public machine: Machine) {

    }

    public createTrackWHD(trackname: string, i: number, j: number, k: number = 0, w?: number, h?: number, d?: number, mirrorX?: boolean, mirrorZ?: boolean): MachinePart {
        trackname = trackname.split("-")[0];
        let whd = "";
        if (isFinite(w)) {
            whd += w.toFixed(0) + ".";
        }
        if (isFinite(h)) {
            whd += h.toFixed(0) + ".";
        }
        if (isFinite(d)) {
            whd += d.toFixed(0) + ".";
        }
        whd = whd.substring(0, whd.length - 1);
        trackname += "-" + whd;
        return this.createTrack(trackname, i, j, k, mirrorX, mirrorZ);
    }

    public createTrack(trackname: string, i: number, j: number, k: number = 0, mirrorX?: boolean, mirrorZ?: boolean): MachinePart {
        if (trackname.startsWith("ramp-")) {
            let w = parseInt(trackname.split("-")[1].split(".")[0]);
            let h = parseInt(trackname.split("-")[1].split(".")[1]);
            let d = parseInt(trackname.split("-")[1].split(".")[2]);
            return new Ramp(this.machine, i, j, k, w, h, isFinite(d) ? d : 1, mirrorX, mirrorZ);
        }
        if (trackname === "uturn-s") {
            return new UTurn(this.machine, i, j, k, mirrorX);
        }
        if (trackname === "uturn-l") {
            return new UTurnLarge(this.machine, i, j, k, mirrorX);
        }
        if (trackname.startsWith("uturnlayer-")) {
            let h = parseInt(trackname.split("-")[1].split(".")[0]);
            let d = parseInt(trackname.split("-")[1].split(".")[1]);
            return new UTurnLayer(this.machine, i, j, k, h, d, mirrorX, mirrorZ);
        }
        if (trackname === "loop") {
            return new Loop(this.machine, i, j, k, mirrorX);
        }
        if (trackname === "wave") {
            return new Wave(this.machine, i, j, k, mirrorX);
        }
        if (trackname === "snake") {
            return new Snake(this.machine, i, j, k, mirrorX);
        }
        if (trackname === "spiral") {
            return new Spiral(this.machine, i, j, k, mirrorX);
        }
        if (trackname === "join") {
            return new Join(this.machine, i, j, k, mirrorX);
        }
        if (trackname === "split") {
            return new Split(this.machine, i, j, k, mirrorX);
        }
        if (trackname.startsWith("elevator-")) {
            let h = parseInt(trackname.split("-")[1]);
            return new Elevator(this.machine, i, j, k, h, mirrorX);
        }
    }
}