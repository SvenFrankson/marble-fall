class Ramp extends MachinePart {

    constructor(machine: Machine, i: number, j: number, w: number = 1, h: number = 1, mirror?: boolean) {
        super(machine, i, j, w, h, mirror);
        this.w = w;
        this.h = h;
        this.xExtendable = true;
        this.yExtendable = true;
        this.partName = "ramp-" + w.toFixed(0) + "." + h.toFixed(0);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();

        this.tracks[0].trackpoints = [
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), n, dir),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(tileWidth * (this.w - 0.5), - tileHeight * this.h, 0), n, dir)
        ];

        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }

        this.generateWires();
    }
}

class CrossingRamp extends MachinePart {

    constructor(machine: Machine, i: number, j: number, w: number = 1, h: number = 1, mirror?: boolean) {
        super(machine, i, j, w, h, mirror);
        this.w = w;
        this.h = h;
        this.xExtendable = true;
        this.yExtendable = true;
        this.partName = "rampX-" + w.toFixed(0) + "." + h.toFixed(0);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        let nBank = new BABYLON.Vector3(0, Math.cos(15 / 180 * Math.PI), Math.sin(15 / 180 * Math.PI));
    
        this.tracks[0].trackpoints = [
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), n.clone(), dir.clone(), 1.4, 1.4),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3((tileWidth * (this.w - 0.5)- tileWidth * 0.5) * 0.5, - tileHeight * this.h * 0.5, - 0.03), nBank, dir.clone(), 1.4, 1.4),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(tileWidth * (this.w - 0.5), - tileHeight * this.h, 0), n.clone(), dir.clone(), 1.4, 1.4)
        ];

        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }

        this.generateWires();
    }
}