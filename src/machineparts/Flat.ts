/*
class Flat extends Track {

    constructor(machine: Machine, i: number, j: number, public w: number = 1) {
        super(machine, i, j);
        this.xExtendable = true;
        this.trackName = "flat-" + w.toFixed(0);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        
        this.deltaI = w - 1;

        this.trackPoints = [[
            new TrackPoint(this, new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), n, dir),
            new TrackPoint(this, new BABYLON.Vector3(tileWidth * (this.deltaI + 0.5), 0, 0), n, dir)
        ]];

        this.generateWires();
    }
}

class CrossingFlat extends Track {

    constructor(machine: Machine, i: number, j: number, public w: number = 1) {
        super(machine, i, j);
        this.xExtendable = true;
        this.trackName = "flatX-" + w.toFixed(0);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        let nBank = new BABYLON.Vector3(0, Math.cos(10 / 180 * Math.PI), Math.sin(10 / 180 * Math.PI));
        
        this.deltaI = w - 1;

        this.trackPoints = [[
            new TrackPoint(this, new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), n, dir, 1.4, 1.4),
            new TrackPoint(this, new BABYLON.Vector3((tileWidth * (this.deltaI + 0.5)- tileWidth * 0.5) * 0.5, 0, - 0.03), nBank, dir, 1.4, 1.4),
            new TrackPoint(this, new BABYLON.Vector3(tileWidth * (this.deltaI + 0.5), 0, 0), n, dir, 1.4, 1.4)
        ]];

        this.generateWires();
    }
}
*/