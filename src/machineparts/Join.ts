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
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), n, dir),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(tileWidth * (this.w - 0.5), - tileHeight * this.h, 0), n, dir)
        ];

        this.tracks[1] = new Track(this);
        this.tracks[1].trackpoints = [
            new TrackPoint(this.tracks[1], new BABYLON.Vector3(tileWidth * 0.5, 0, 0), n, dir.scale(-1)),
            new TrackPoint(this.tracks[1], new BABYLON.Vector3(tileWidth * 0.25, - tileHeight * 0.25, 0), nJoin, dirJoin)
        ];

        if (mirrorX) {
            this.mirrorXTrackPointsInPlace();
        }

        this.generateWires();
    }
}