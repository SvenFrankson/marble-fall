class ElevatorDown extends Track {

    public box: BABYLON.Mesh;

    constructor(game: Game, i: number, j: number, h: number = 1, mirror?: boolean) {
        super(game, i, j);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        
        this.deltaJ = h - 1;

        this.trackPoints = [
            new TrackPoint(this, new BABYLON.Vector3(
                - tileWidth * 0.5,
                - tileHeight * (this.deltaJ + 1),
                0
            ), n, dir),
            new TrackPoint(this, new BABYLON.Vector3(
                0,
                - tileHeight * (this.deltaJ + 2),
                0
            ), n, dir),
            new TrackPoint(this, new BABYLON.Vector3(
                0 + 0.01,
                - tileHeight * (this.deltaJ + 2) + 0.01,
                0
            ), dir.scale(-1), n),
            new TrackPoint(this, new BABYLON.Vector3(
                0 + 0.01,
                0,
                0
            ), dir.scale(-1), n),
            new TrackPoint(this, new BABYLON.Vector3(
                -0.02,
                0.04,
                0
            ), new BABYLON.Vector3(0, -1, 0), new BABYLON.Vector3(-1, 0, 0)),
            new TrackPoint(this, new BABYLON.Vector3(
                -0.03,
                0.04,
                0
            ), new BABYLON.Vector3(0, -1, 0), new BABYLON.Vector3(-1, 0, 0)),
        ];

        this.box = new BABYLON.Mesh("box");
        this.box.position.x = 0.007;
        this.box.parent = this;

        let rampWire0 = new Wire(this);
        let rRamp = this.wireGauge * 0.35;
        rampWire0.path = [new BABYLON.Vector3(-0.014, 0.0005, rRamp)];
        let nRamp = 12;
        for (let i = 0; i <= nRamp; i++) {
            let a = i / nRamp * Math.PI;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            rampWire0.path.push(new BABYLON.Vector3(sina * rRamp + 0.003, 0, cosa * rRamp));
        }
        rampWire0.path.push(new BABYLON.Vector3(-0.014, 0.0005, - rRamp));
        rampWire0.parent = this.box;

        this.wires.push(rampWire0);

        this.generateWires();
    }

    public update(): void {
        this.box.position.y += 0.0005;
        if (this.box.position.y > tileHeight) {
            this.box.position.y = - tileHeight * (this.deltaJ + 3)
        }
        this.wires[2].recomputeAbsolutePath();
    }
}

class ElevatorUp extends Track {

    constructor(game: Game, i: number, j: number, mirror?: boolean) {
        super(game, i, j);
        let dirLeft = new BABYLON.Vector3(1, 0, 0);
        dirLeft.normalize();
        let nLeft = new BABYLON.Vector3(0, 1, 0);
        nLeft.normalize();
        
        let dirRight = new BABYLON.Vector3(1, 1, 0);
        dirRight.normalize();
        let nRight = new BABYLON.Vector3(- 1, 1, 0);
        nRight.normalize();
        
        this.trackPoints = [
            new TrackPoint(this, new BABYLON.Vector3(- tileWidth * 0.5, - tileHeight, 0), nLeft, dirLeft),
            new TrackPoint(this, new BABYLON.Vector3(- 0.01, - tileHeight * 0.5, 0), nRight, dirRight)
        ];

        this.generateWires();
    }
}