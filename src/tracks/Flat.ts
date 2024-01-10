class Flat extends Track {

    constructor(game: Game, i: number, j: number) {
        super(game, i, j);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        this.trackPoints = [
            new TrackPoint(this, new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), n, dir),
            new TrackPoint(this, new BABYLON.Vector3(tileWidth * 0.5, 0, 0), n, dir)
        ];

        this.generateWires();
    }
}