class Ramp extends MachinePart {

    constructor(machine: Machine, i: number, j: number, k: number, w: number = 1, h: number = 1, d: number = 1, mirror?: boolean) {
        super(machine, i, j, k, w, h, d, mirror);
        this.xExtendable = true;
        this.yExtendable = true;
        this.zExtendable = true;
        this.partName = "ramp-" + w.toFixed(0) + "." + h.toFixed(0) + "." + d.toFixed(0);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();

        this.tracks[0].trackpoints = [
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), n, dir),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(tileWidth * (this.w - 0.5), - tileHeight * this.h, - tileDepth * (this.d - 1)), n, dir)
        ];

        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }

        this.generateWires();
    }
}