/// <reference path="./Track.ts"/>

class FlatLoop extends Track {

    constructor(game: Game, i: number, j: number) {
        super(game, i, j);
        let dir = new BABYLON.Vector3(10, - 1, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(1, 10, 0);
        n.normalize();
        this.trackPoints = [
            new TrackPoint(this, new BABYLON.Vector3(-xDist, yDist, 0), n, dir),
            new TrackPoint(this, new BABYLON.Vector3(- 0.3 * xDist, 0.8 * yDist, - 0.05 * xDist)),
            new TrackPoint(this, new BABYLON.Vector3(0.5 * xDist, 0.6 * yDist, - 0.3 * xDist)),
            new TrackPoint(this, new BABYLON.Vector3(0.8 * xDist, 0.4 * yDist, - 1 * xDist)),
            new TrackPoint(this, new BABYLON.Vector3(0.5 * xDist, 0.2 * yDist, - 1.6 * xDist)),

            new TrackPoint(this, new BABYLON.Vector3(0, 0, -1.8 * xDist), BABYLON.Vector3.Up()),

            new TrackPoint(this, new BABYLON.Vector3(- 0.5 * xDist, - 0.2 * yDist, - 1.6 * xDist)),
            new TrackPoint(this, new BABYLON.Vector3(- 0.8 * xDist, - 0.4 * yDist, - 1 * xDist)),
            new TrackPoint(this, new BABYLON.Vector3(- 0.5 * xDist, - 0.6 * yDist, - 0.3 * xDist)),
            new TrackPoint(this, new BABYLON.Vector3(0.3 * xDist, - 0.8 * yDist, - 0.05 * xDist)),
            new TrackPoint(this, new BABYLON.Vector3(xDist, -yDist, 0), n, dir)
        ];

        this.generateWires();
    }
}