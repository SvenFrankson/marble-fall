class Ramp extends Track {

    constructor(machine: Machine, i: number, j: number, w: number = 1, h: number = 1, mirror?: boolean) {
        super(machine, i, j, mirror);
        this.trackName = "ramp-" + w.toFixed(0) + "." + h.toFixed(0);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        
        this.deltaI = w - 1;
        this.deltaJ = h - 1;

        this.trackPoints = [
            new TrackPoint(this, new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), n.clone(), dir.clone()),
            new TrackPoint(this, new BABYLON.Vector3(tileWidth * (this.deltaI + 0.5), - tileHeight * (this.deltaJ + 1), 0), n.clone(), dir.clone())
        ];

        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }

        this.generateWires();
    }
}

class CrossingRamp extends Track {

    constructor(machine: Machine, i: number, j: number, w: number = 1, h: number = 1, mirror?: boolean) {
        super(machine, i, j, mirror);
        this.trackName = "rampX-" + w.toFixed(0) + "." + h.toFixed(0);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        let nBank = new BABYLON.Vector3(0, Math.cos(10 / 180 * Math.PI), Math.sin(10 / 180 * Math.PI));
        
        this.deltaI = w - 1;
        this.deltaJ = h - 1;

        this.trackPoints = [
            new TrackPoint(this, new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), n.clone(), dir.clone(), 1.4, 1.4),
            new TrackPoint(this, new BABYLON.Vector3((tileWidth * (this.deltaI + 0.5)- tileWidth * 0.5) * 0.5, - tileHeight * (this.deltaJ + 1) * 0.5, - 0.03), nBank, dir.clone(), 1.4, 1.4),
            new TrackPoint(this, new BABYLON.Vector3(tileWidth * (this.deltaI + 0.5), - tileHeight * (this.deltaJ + 1), 0), n.clone(), dir.clone(), 1.4, 1.4)
        ];

        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }

        this.generateWires();
    }
}