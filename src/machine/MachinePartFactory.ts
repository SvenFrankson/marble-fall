var TrackNames = [
    "ramp-1.1.1",
    "wave-1.1.1",
    "snake-2.1.1",
    "join",
    "flatjoin",
    "split",
    "uturn-0.2",
    "loop-1.2",
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
        if (trackname.startsWith("wave-")) {
            let w = parseInt(trackname.split("-")[1].split(".")[0]);
            let h = parseInt(trackname.split("-")[1].split(".")[1]);
            let d = parseInt(trackname.split("-")[1].split(".")[2]);
            return new Wave(this.machine, i, j, k, w, h, isFinite(d) ? d : 1, mirrorX, mirrorZ);
        }
        if (trackname.startsWith("snake-")) {
            let w = parseInt(trackname.split("-")[1].split(".")[0]);
            let h = parseInt(trackname.split("-")[1].split(".")[1]);
            let d = parseInt(trackname.split("-")[1].split(".")[2]);
            return new Snake(this.machine, i, j, k, w, h, isFinite(d) ? d : 1, mirrorX, mirrorZ);
        }
        if (trackname.startsWith("uturn-")) {
            let h = parseInt(trackname.split("-")[1].split(".")[0]);
            let d = parseInt(trackname.split("-")[1].split(".")[1]);
            if (isFinite(h) && isFinite(d)) {
                return new UTurn(this.machine, i, j, k, h, d, mirrorX, mirrorZ);
            }
        }
        if (trackname.startsWith("loop-")) {
            let w = parseInt(trackname.split("-")[1].split(".")[0]);
            let d = parseInt(trackname.split("-")[1].split(".")[1]);
            return new Loop(this.machine, i, j, k, w, d, mirrorX, mirrorZ);
        }
        if (trackname === "join") {
            return new Join(this.machine, i, j, k, mirrorX);
        }
        if (trackname === "flatjoin") {
            return new FlatJoin(this.machine, i, j, k, mirrorX);
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