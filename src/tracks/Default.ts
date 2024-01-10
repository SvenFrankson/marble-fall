/// <reference path="./Track.ts"/>

class DefaultTrack1 extends Track {

    constructor(game: Game, i: number, j: number) {
        super(game, i, j);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        this.trackPoints = [
            new TrackPoint(this, new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), n, dir),
            new TrackPoint(this, new BABYLON.Vector3(tileWidth * 0.5, - tileHeight * 1, 0), n, dir)
        ];

        this.deltaJ = 1;

        this.generateWires();
    }
}

class DefaultTrack2 extends Track {

    constructor(game: Game, i: number, j: number) {
        super(game, i, j);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        this.trackPoints = [
            new TrackPoint(this, new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), n, dir),
            new TrackPoint(this, new BABYLON.Vector3(tileWidth * 0.5, - tileHeight * 2, 0), n, dir)
        ];

        this.deltaJ = 2;

        this.generateWires();
    }
}

class DefaultTrack3 extends Track {

    constructor(game: Game, i: number, j: number) {
        super(game, i, j);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        this.trackPoints = [
            new TrackPoint(this, new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), n, dir),
            new TrackPoint(this, new BABYLON.Vector3(tileWidth * 1.5, - tileHeight * 0.5, 0)),
            new TrackPoint(this, new BABYLON.Vector3(- tileWidth * 0.5, - tileHeight, 0), n, dir.scale(-1))
        ];

        this.deltaI = 1;
        this.deltaJ = 1;

        this.generateWires();
    }
}