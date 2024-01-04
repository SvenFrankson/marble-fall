/// <reference path="./Track.ts"/>

class FlatLoop extends Track {

    constructor(game: Game, i: number, j: number) {
        super(game, i, j);
        this.trackPoints = [
            new TrackPoint(new BABYLON.Vector3(-xDist, yDist, 0), BABYLON.Vector3.Up()),
            new TrackPoint(new BABYLON.Vector3(- 0.3 * xDist, 0.8 * yDist, - 0.05 * xDist), BABYLON.Vector3.Up()),
            new TrackPoint(new BABYLON.Vector3(0.5 * xDist, 0.6 * yDist, - 0.3 * xDist), BABYLON.Vector3.Up()),
            new TrackPoint(new BABYLON.Vector3(0.8 * xDist, 0.4 * yDist, - 1 * xDist), BABYLON.Vector3.Up()),
            new TrackPoint(new BABYLON.Vector3(0.5 * xDist, 0.2 * yDist, - 1.6 * xDist), BABYLON.Vector3.Up()),

            new TrackPoint(new BABYLON.Vector3(0, 0, -1.8 * xDist), BABYLON.Vector3.Up()),

            new TrackPoint(new BABYLON.Vector3(- 0.5 * xDist, - 0.2 * yDist, - 1.6 * xDist), BABYLON.Vector3.Up()),
            new TrackPoint(new BABYLON.Vector3(- 0.8 * xDist, - 0.4 * yDist, - 1 * xDist), BABYLON.Vector3.Up()),
            new TrackPoint(new BABYLON.Vector3(- 0.5 * xDist, - 0.6 * yDist, - 0.3 * xDist), BABYLON.Vector3.Up()),
            new TrackPoint(new BABYLON.Vector3(0.3 * xDist, - 0.8 * yDist, - 0.05 * xDist), BABYLON.Vector3.Up()),
            new TrackPoint(new BABYLON.Vector3(xDist, -yDist, 0), BABYLON.Vector3.Up())
        ];

        this.autoTrackNormals();
        this.generateWires();
    }
}