class Join extends MachinePart {

    constructor(machine: Machine, i: number, j: number, k: number, mirrorX?: boolean) {
        super(machine, i, j, k, {
            mirrorX: mirrorX
        });
        this.xMirrorable = true;
        this.partName = "join";
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();

        let dirJoin = (new BABYLON.Vector3(-2, -1, 0)).normalize();
        let nJoin = (new BABYLON.Vector3(-1, 2, 0)).normalize();

        this.tracks[0].trackpoints = [
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), dir),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(- tileWidth / 3, 0, 0), dir),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(tileWidth / 3, - tileHeight, 0), dir),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(tileWidth * 0.5, - tileHeight, 0), dir)
        ];

        this.tracks[1] = new Track(this);
        this.tracks[1].trackpoints = [
            new TrackPoint(this.tracks[1], new BABYLON.Vector3(tileWidth * 0.5, 0, 0), dir.scale(-1)),
            new TrackPoint(this.tracks[1], new BABYLON.Vector3(tileWidth * 0.25, - tileHeight * 0.25, 0), dirJoin)
        ];

        let center = new BABYLON.Vector3(0.0135, 0.0165, 0);
        let r = 0.02;
        
        this.tracks[2] = new Track(this);
        this.tracks[2].trackpoints = [
            new TrackPoint(this.tracks[2], center.add(new BABYLON.Vector3(-r * Math.sqrt(3) / 2, -r * 1 / 2, 0)), new BABYLON.Vector3(0.5, -Math.sqrt(3) / 2, 0), new BABYLON.Vector3(-1, 0, 0)),
            new TrackPoint(this.tracks[2], center.add(new BABYLON.Vector3(0, -r, 0))),
            new TrackPoint(this.tracks[2], center.add(new BABYLON.Vector3(r * Math.sqrt(3) / 2, -r * 1 / 2, 0)), new BABYLON.Vector3(0.5, Math.sqrt(3) / 2, 0), new BABYLON.Vector3(1, 0, 0)),
        ];
        
        this.tracks[2].drawStartTip = true;
        this.tracks[2].drawEndTip = true;
        

        if (mirrorX) {
            this.mirrorXTrackPointsInPlace();
        }

        this.generateWires();
    }
}

class FlatJoin extends MachinePart {

    constructor(machine: Machine, i: number, j: number, k: number, mirrorX?: boolean) {
        super(machine, i, j, k, {
            mirrorX: mirrorX
        });
        this.xMirrorable = true;
        this.partName = "flatjoin";
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();

        let dirJoin = (new BABYLON.Vector3(2, -1, 0)).normalize();
        let nJoin = (new BABYLON.Vector3(1, 2, 0)).normalize();

        this.tracks[0].trackpoints = [
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(- tileWidth * 0.5, - tileHeight, 0), dir),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(tileWidth * 0.5, - tileHeight, 0), dir)
        ];

        this.tracks[1] = new Track(this);
        this.tracks[1].trackpoints = [
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), dir),
            new TrackPoint(this.tracks[1], new BABYLON.Vector3(- tileWidth * 0.25, - tileHeight * 0.25, 0), dirJoin)
        ];

        let center = new BABYLON.Vector3(- 0.0135, 0.0165, 0);
        let r = 0.02;
        
        this.tracks[2] = new Track(this);
        this.tracks[2].trackpoints = [
            new TrackPoint(this.tracks[2], center.add(new BABYLON.Vector3(-r * Math.sqrt(3) / 2, -r * 1 / 2, 0)), new BABYLON.Vector3(0.5, -Math.sqrt(3) / 2, 0), new BABYLON.Vector3(-1, 0, 0)),
            new TrackPoint(this.tracks[2], center.add(new BABYLON.Vector3(0 + 0.03, -r - 0.011, 0)), new BABYLON.Vector3(1, 0, 0), new BABYLON.Vector3(0, -1, 0)),
        ];
        this.tracks[2].drawStartTip = true;
        this.tracks[2].drawEndTip = true;
        

        if (mirrorX) {
            this.mirrorXTrackPointsInPlace();
        }

        this.generateWires();
    }
}