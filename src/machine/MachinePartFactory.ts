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
    "start",
    "end"
];

interface IMachinePartProp {
    fullPartName?: string;
    i?: number;
    j?: number;
    k?: number;
    w?: number;
    h?: number;
    d?: number;
    n?: number;
    color?: number;
    mirrorX?: boolean;
    mirrorZ?: boolean;
}

class MachinePartFactory {

    constructor(public machine: Machine) {

    }

    public createTrackWHDN(trackname: string, props?: IMachinePartProp): MachinePart {
        if (!props) {
            props = {};
        }
        props.fullPartName = trackname; // hacky but work
        
        trackname = trackname.split("-")[0];
        let whdn = "";
        if (isFinite(props.w)) {
            whdn += props.w.toFixed(0) + ".";
        }
        if (isFinite(props.h)) {
            whdn += props.h.toFixed(0) + ".";
        }
        if (isFinite(props.d)) {
            whdn += props.d.toFixed(0) + ".";
        }
        if (isFinite(props.n)) {
            whdn += props.n.toFixed(0) + ".";
        }
        whdn = whdn.substring(0, whdn.length - 1);
        if (whdn.length > 0) {
            trackname += "-" + whdn;
        }
        return this.createTrack(trackname, props);
    }

    public createTrack(trackname: string, prop: IMachinePartProp): MachinePart {
        if (trackname.indexOf("_X") != -1) {
            prop.mirrorX = true;
            trackname = trackname.replace("_X", "");
        }
        if (trackname.indexOf("_Z") != -1) {
            prop.mirrorX = true;
            trackname = trackname.replace("_Z", "");
        }

        if (trackname.startsWith("ramp-")) {
            let w = parseInt(trackname.split("-")[1].split(".")[0]);
            let h = parseInt(trackname.split("-")[1].split(".")[1]);
            let d = parseInt(trackname.split("-")[1].split(".")[2]);
            prop.w = w;
            prop.h = h;
            prop.d = d;
            return new Ramp(this.machine, prop);
        }
        if (trackname.startsWith("wave-")) {
            let w = parseInt(trackname.split("-")[1].split(".")[0]);
            let h = parseInt(trackname.split("-")[1].split(".")[1]);
            let d = parseInt(trackname.split("-")[1].split(".")[2]);
            prop.w = w;
            prop.h = h;
            prop.d = d;
            return new Wave(this.machine, prop);
        }
        if (trackname.startsWith("snake-")) {
            let w = parseInt(trackname.split("-")[1].split(".")[0]);
            let h = parseInt(trackname.split("-")[1].split(".")[1]);
            let d = parseInt(trackname.split("-")[1].split(".")[2]);
            prop.w = w;
            prop.h = h;
            prop.d = d;
            return new Snake(this.machine, prop);
        }
        if (trackname.startsWith("uturn-")) {
            let h = parseInt(trackname.split("-")[1].split(".")[0]);
            let d = parseInt(trackname.split("-")[1].split(".")[1]);
            prop.h = h;
            prop.d = d;
            if (isFinite(h) && isFinite(d)) {
                return new UTurn(this.machine, prop);
            }
        }
        if (trackname.startsWith("wall-")) {
            let h = parseInt(trackname.split("-")[1].split(".")[0]);
            let d = parseInt(trackname.split("-")[1].split(".")[1]);
            prop.h = h;
            prop.d = d;
            if (isFinite(h) && isFinite(d)) {
                return new Wall(this.machine, prop);
            }
        }
        if (trackname === "uturnsharp") {
            return new UTurnSharp(this.machine, prop);
        }
        if (trackname === "start") {
            return new Start(this.machine, prop);
        }
        if (trackname === "end") {
            return new End(this.machine, prop);
        }
        if (trackname.startsWith("loop-")) {
            let w = parseInt(trackname.split("-")[1].split(".")[0]);
            let d = parseInt(trackname.split("-")[1].split(".")[1]);
            let n = parseInt(trackname.split("-")[1].split(".")[2]);
            prop.w = w;
            prop.d = d;
            prop.n = n;
            return new Loop(this.machine, prop);
        }
        if (trackname.startsWith("spiral-")) {
            let w = parseInt(trackname.split("-")[1].split(".")[0]);
            let h = parseInt(trackname.split("-")[1].split(".")[1]);
            let n = parseInt(trackname.split("-")[1].split(".")[2]);
            prop.w = w;
            prop.h = h;
            prop.n = n;
            return new Spiral(this.machine, prop);
        }
        if (trackname === "join") {
            return new Join(this.machine, prop);
        }
        if (trackname === "flatjoin") {
            return new FlatJoin(this.machine, prop);
        }
        if (trackname === "split") {
            return new Split(this.machine, prop);
        }
        if (trackname.startsWith("elevator-")) {
            let h = parseInt(trackname.split("-")[1]);
            prop.h = h;
            return new Elevator(this.machine, prop);
        }
        if (trackname === "quarter") {
            return new QuarterNote(this.machine, prop);
        }
        if (trackname === "double") {
            return new DoubleNote(this.machine, prop);
        }
    }
}