var TrackNames = [
    "ramp-1.1.1",
    "wave-2.1.1",
    "snake-2.1.1",
    "join",
    "flatjoin",
    "split",
    "uturn-0.2",
    "wall-4.2",
    "uturnsharp",
    "loop-1.1",
    "spiral-1.2.1",
    "elevator-4",
];

interface ICreateTrackWHDNProp {
    i?: number;
    j?: number;
    k?: number;
    w?: number;
    h?: number;
    d?: number;
    n?: number;
    mirrorX?: boolean;
    mirrorZ?: boolean;
}

class MachinePartFactory {

    constructor(public machine: Machine) {

    }

    public createTrackWHDN(trackname: string, props?: ICreateTrackWHDNProp): MachinePart {
        if (!props) {
            props = {};
        }
        trackname = trackname.split("-")[0];
        let whd = "";
        if (isFinite(props.w)) {
            whd += props.w.toFixed(0) + ".";
        }
        if (isFinite(props.h)) {
            whd += props.h.toFixed(0) + ".";
        }
        if (isFinite(props.d)) {
            whd += props.d.toFixed(0) + ".";
        }
        if (isFinite(props.n)) {
            whd += props.n.toFixed(0) + ".";
        }
        whd = whd.substring(0, whd.length - 1);
        trackname += "-" + whd;
        console.log(trackname);
        return this.createTrack(trackname, props.i, props.j, props.k, props.mirrorX, props.mirrorZ);
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
        if (trackname.startsWith("wall-")) {
            let h = parseInt(trackname.split("-")[1].split(".")[0]);
            let d = parseInt(trackname.split("-")[1].split(".")[1]);
            if (isFinite(h) && isFinite(d)) {
                return new Wall(this.machine, i, j, k, h, d, mirrorX);
            }
        }
        if (trackname === "uturnsharp") {
            return new UTurnSharp(this.machine, i, j, k, mirrorX, mirrorZ);
        }
        if (trackname.startsWith("loop-")) {
            let w = parseInt(trackname.split("-")[1].split(".")[0]);
            let d = parseInt(trackname.split("-")[1].split(".")[1]);
            let n = parseInt(trackname.split("-")[1].split(".")[2]);
            return new Loop(this.machine, i, j, k, w, d, n, mirrorX, mirrorZ);
        }
        if (trackname.startsWith("spiral-")) {
            let w = parseInt(trackname.split("-")[1].split(".")[0]);
            let h = parseInt(trackname.split("-")[1].split(".")[1]);
            let n = parseInt(trackname.split("-")[1].split(".")[2]);
            return new Spiral(this.machine, i, j, k, w, h, n, mirrorX, mirrorZ);
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