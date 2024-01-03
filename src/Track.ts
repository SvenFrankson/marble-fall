class TrackPoint {

    constructor(public point: BABYLON.Vector3, public up: BABYLON.Vector3 = BABYLON.Vector3.Up()) {

    }
}

class Track extends BABYLON.Mesh {

    public trackPoints: TrackPoint[];
    public wires: Wire[];

    public wireSize: number = 0.002;
    public wireGauge: number = 0.012;

    constructor() {
        super("track");
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
        console.log([...this.wires[0].path]);
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
        await this.wires[0].instantiate();
        await this.wires[1].instantiate();
    }
}

class Ramp extends Track {

    constructor() {
        super();
        this.trackPoints = [
            new TrackPoint(new BABYLON.Vector3(0, 0, 0), BABYLON.Vector3.Up()),
            new TrackPoint(new BABYLON.Vector3(0.2, -0.02, 0), BABYLON.Vector3.Up())
        ]
        this.generateWires();
    }
}

class Turn extends Track {

    constructor() {
        super();
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