class Ramp extends Track {

    constructor(game: Game, i: number, j: number, w: number = 1, h: number = 1, mirror?: boolean) {
        super(game, i, j);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        if (mirror) {
            dir.scaleInPlace(-1);
        }
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        
        this.deltaI = w - 1;
        this.deltaJ = h - 1;

        if (mirror) {
            this.trackPoints = [
                new TrackPoint(this, new BABYLON.Vector3(tileWidth * (this.deltaI + 0.5), 0, 0), n, dir),
                new TrackPoint(this, new BABYLON.Vector3(- tileWidth * 0.5, - tileHeight * (this.deltaJ + 1), 0), n, dir)
            ];
        }
        else {
            this.trackPoints = [
                new TrackPoint(this, new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), n, dir),
                new TrackPoint(this, new BABYLON.Vector3(tileWidth * (this.deltaI + 0.5), - tileHeight * (this.deltaJ + 1), 0), n, dir)
            ];
        }

        this.generateWires();
    }
}
