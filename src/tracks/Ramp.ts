class Ramp extends Track {

    constructor(game: Game, i: number, j: number) {
        super(game, i, j);
        let dir = new BABYLON.Vector3(10, - 1, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(1, 10, 0);
        n.normalize();
        this.trackPoints = [
            new TrackPoint(this, new BABYLON.Vector3(-xDist, yDist, 0), n, dir),
            new TrackPoint(this, new BABYLON.Vector3(xDist, -yDist, 0), n, dir)
        ];

        this.subdivisions = 3;

        this.autoTrackNormals();
        this.generateWires();
    }
}