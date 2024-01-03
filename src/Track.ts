var baseRadius = 0.075;
var xDist = 0.75 * baseRadius;
var yDist = Math.sqrt(3) / 2 * 0.5 * baseRadius;

class TrackPoint {

    constructor(public point: BABYLON.Vector3, public up: BABYLON.Vector3 = BABYLON.Vector3.Up()) {

    }
}

class Track extends BABYLON.Mesh {

    public trackPoints: TrackPoint[];
    public wires: Wire[];

    public wireSize: number = 0.002;
    public wireGauge: number = 0.012;

    constructor(public game: Game, public i: number, public j: number) {
        super("track", game.scene);
        this.position.x = i * 2 * xDist;
        this.position.y = - i * 2 * yDist;
    }

    public generateWires(): void {
        console.log("X");
        this.wires = [
            new Wire(this),
            new Wire(this)
        ];

        for (let i = 0; i < this.trackPoints.length; i++) {
            let pPrev = this.trackPoints[i - 1] ? this.trackPoints[i - 1].point : undefined;
            let p = this.trackPoints[i].point;
            let pNext = this.trackPoints[i + 1] ? this.trackPoints[i + 1].point : undefined;

            if (!pPrev) {
                pPrev = p.subtract(pNext.subtract(p));
            }
            if (!pNext) {
                pNext = p.add(p.subtract(pPrev));
            }

            let dir = pNext.subtract(pPrev).normalize();
            let up = this.trackPoints[i].up;

            let rotation = BABYLON.Quaternion.Identity();
            Mummu.QuaternionFromZYAxisToRef(dir, up, rotation);

            let matrix = BABYLON.Matrix.Compose(BABYLON.Vector3.One(), rotation, p);

            this.wires[0].path[i] = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(- this.wireGauge * 0.5, 0, 0), matrix);
            this.wires[1].path[i] = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(this.wireGauge * 0.5, 0, 0), matrix);
        }
        for (let n = 0; n < 3; n++) {
            Mummu.CatmullRomPathInPlace(this.wires[0].path);
            Mummu.CatmullRomPathInPlace(this.wires[1].path);
        }
    }

    public recomputeAbsolutePath(): void {
        this.wires.forEach(wire => {
            wire.recomputeAbsolutePath();
        })
    }

    public async instantiate(): Promise<void> {
        let data = await this.game.vertexDataLoader.get("./meshes/base-plate.babylon", this.getScene());
        if (data[0]) {
            let baseMesh = new BABYLON.Mesh("base-mesh");
            baseMesh.parent = this;
            baseMesh.position.z += 0.02;
            data[0].applyToMesh(baseMesh);
        }
        await this.wires[0].instantiate();
        await this.wires[1].instantiate();
    }
}

class Ramp extends Track {

    constructor(game: Game, i: number, j: number) {
        super(game, i, j);
        this.trackPoints = [
            new TrackPoint(new BABYLON.Vector3(-xDist, yDist, 0), BABYLON.Vector3.Up()),
            new TrackPoint(new BABYLON.Vector3(xDist, -yDist, 0), BABYLON.Vector3.Up())
        ]
        this.generateWires();
    }
}

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
        ]

        let minA = 0;
        let maxA = - Math.PI / 3;
        for (let i = 0; i < this.trackPoints.length; i++) {
            let pPrev = this.trackPoints[i - 1] ? this.trackPoints[i - 1].point : undefined;
            let p = this.trackPoints[i].point;
            let pNext = this.trackPoints[i + 1] ? this.trackPoints[i + 1].point : undefined;

            if (!pPrev) {
                pPrev = p.subtract(pNext.subtract(p));
            }
            if (!pNext) {
                pNext = p.add(p.subtract(pPrev));
            }

            let dir = pNext.subtract(pPrev).normalize();
            let f = Math.cos((i / (this.trackPoints.length - 1) - 0.5) * Math.PI);
            let up = Mummu.Rotate(BABYLON.Vector3.Up(), dir, (1 - f) * minA + f * maxA);
            this.trackPoints[i].up = up;
        }

        this.generateWires();
    }
}

class Turn extends Track {

    constructor(game: Game, i: number, j: number) {
        super(game, i, j);
        let nMin = BABYLON.Vector3.Up();
        let nMax = (new BABYLON.Vector3(-4, 1, 0)).normalize();

        this.trackPoints = [
            new TrackPoint(
                new BABYLON.Vector3(0, 0, 0),
                BABYLON.Vector3.Lerp(nMin, nMax, 0)
            ),
            new TrackPoint(
                new BABYLON.Vector3(0.05, -0.005, 0),
                BABYLON.Vector3.Lerp(nMin, nMax, 0.5)
            ),
            new TrackPoint(
                new BABYLON.Vector3(0.085, 0, -0.015),
                BABYLON.Vector3.Lerp(nMin, nMax, 0.75)
            ),
            new TrackPoint(
                new BABYLON.Vector3(0.1, 0, -0.05),
                BABYLON.Vector3.Lerp(nMin, nMax, 1)
            ),
            new TrackPoint(
                new BABYLON.Vector3(0.085, 0, -0.085),
                BABYLON.Vector3.Lerp(nMin, nMax, 0.5)
            ),
            new TrackPoint(
                new BABYLON.Vector3(0.05, 0.005, -0.1),
                BABYLON.Vector3.Lerp(nMin, nMax, 0.75)
            ),
            new TrackPoint(
                new BABYLON.Vector3(0, 0, -0.1),
                BABYLON.Vector3.Lerp(nMin, nMax, 0)
            )
        ];
        this.generateWires();
    }
}