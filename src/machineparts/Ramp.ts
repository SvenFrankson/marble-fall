class Ramp extends MachinePart {

    constructor(machine: Machine, i: number, j: number, k: number, w: number = 1, h: number = 1, d: number = 1, mirrorX?: boolean, mirrorZ?: boolean) {
        super(machine, i, j, k, {
            w: w,
            h: h,
            d: d,
            mirrorX: mirrorX,
            mirrorZ: mirrorZ,
        });
        this.xExtendable = true;
        this.yExtendable = true;
        this.zExtendable = true;
        this.xMirrorable = true;
        this.zMirrorable = true;

        this.partName = "ramp-" + w.toFixed(0) + "." + h.toFixed(0) + "." + d.toFixed(0);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();

        this.tracks[0].trackpoints = [
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), dir),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(tileWidth * (this.w - 0.5), - tileHeight * this.h, - tileDepth * (this.d - 1)), dir)
        ];

        if (mirrorX) {
            this.mirrorXTrackPointsInPlace();
        }
        if (mirrorZ) {
            this.mirrorZTrackPointsInPlace();
        }

        this.generateWires();
    }

    public static CreateFromOriginDestination(origin: Nabu.IJK, dest: Nabu.IJK, machine: Machine): Ramp {
        let i = Math.min(origin.i, dest.i);
        let j = Math.min(origin.j, dest.j);
        let k = Math.min(origin.k, dest.k);
        let w = dest.i - origin.i;
        let h = Math.abs(dest.j - origin.j);
        let d = Math.abs(dest.k - origin.k) + 1;
        let mirrorX = dest.j < origin.j;
        let mirrorZ = false;
        if (mirrorX) {
            if (origin.k < dest.k) {
                mirrorZ = true;
            }
        }
        else {
            if (origin.k > dest.k) {
                mirrorZ = true;
            }
        }
        return new Ramp(machine, i, j, k, w, h, d, mirrorX, mirrorZ);
    }

    public getOrigin(): Nabu.IJK {
        let i = this.i;
        let j: number;
        if (this.mirrorX) {
            j = this.j + this.h;
        }
        else {
            j = this.j;
        }
        let k: number;
        if (this.mirrorZ) {
            if (this.mirrorX) {
                k = this.k;
            }
            else {
                k = this.k + this.d - 1;
            }
        }
        else {
            if (this.mirrorX) {
                k = this.k + this.d - 1;
            }
            else {
                k = this.k;
            }
        }
        return {
            i: i,
            j: j,
            k: k
        }
    }

    public getDestination(): Nabu.IJK {
        let i = this.i + this.w;
        let j: number;
        if (!this.mirrorX) {
            j = this.j + this.h;
        }
        else {
            j = this.j;
        }
        let k: number;
        if (this.mirrorZ) {
            if (this.mirrorX) {
                k = this.k + this.d - 1;
            }
            else {
                k = this.k;
            }
        }
        else {
            if (this.mirrorX) {
                k = this.k;
            }
            else {
                k = this.k + this.d - 1;
            }
        }
        return {
            i: i,
            j: j,
            k: k
        }
    }
}