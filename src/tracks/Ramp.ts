class Ramp extends Track {

    constructor(game: Game, i: number, j: number) {
        super(game, i, j);
        this.trackPoints = [
            new TrackPoint(new BABYLON.Vector3(-xDist, yDist, 0), BABYLON.Vector3.Up()),
            new TrackPoint(new BABYLON.Vector3(xDist, -yDist, 0), BABYLON.Vector3.Up())
        ];

        this.autoTrackNormals();
        this.generateWires();
    }
}