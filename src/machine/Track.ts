
class Track {
    
    public trackpoints: TrackPoint[] = [];
    public wires: Wire[];
    public interpolatedPoints: BABYLON.Vector3[];
    public interpolatedNormals: BABYLON.Vector3[];

    public drawStartTip: boolean = false;
    public drawEndTip: boolean = false;

    public preferedStartBank: number = 0;
    private _startWorldPosition: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    public get startWorldPosition(): BABYLON.Vector3 {
        this._startWorldPosition.copyFrom(this.part.position).addInPlace(this.interpolatedPoints[0]);
        return this._startWorldPosition;
    }
    public preferedEndBank: number = 0;
    private _endWorldPosition: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    public get endWorldPosition(): BABYLON.Vector3 {
        this._endWorldPosition.copyFrom(this.part.position).addInPlace(this.interpolatedPoints[this.interpolatedPoints.length - 1]);
        return this._endWorldPosition;
    }

    public summedLength: number[] = [0];
    public totalLength: number = 0
    public globalSlope: number = 0;
    public AABBMin: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    public AABBMax: BABYLON.Vector3 = BABYLON.Vector3.Zero();

    public template: TrackTemplate;

    constructor(public part: MachinePart) {
        this.wires = [
            new Wire(this.part),
            new Wire(this.part)
        ];
    }

    public get trackIndex(): number {
        return this.part.tracks.indexOf(this);
    }

    public mirrorXTrackPointsInPlace(): void {
        for (let i = 0; i < this.trackpoints.length; i++) {
            this.trackpoints[i].position.x *= - 1;
            this.trackpoints[i].position.x += (this.part.w - 1) * tileWidth;
            if (this.trackpoints[i].normal) {
                this.trackpoints[i].normal.x *= - 1;
            }
            if (this.trackpoints[i].dir) {
                this.trackpoints[i].dir.x *= - 1;
            }
        }
    }

    public mirrorZTrackPointsInPlace(): void {
        for (let i = 0; i < this.trackpoints.length; i++) {
            this.trackpoints[i].position.z += (this.part.d - 1) * tileDepth * 0.5;
            this.trackpoints[i].position.z *= - 1;
            this.trackpoints[i].position.z -= (this.part.d - 1) * tileDepth * 0.5;
            if (this.trackpoints[i].normal) {
                this.trackpoints[i].normal.z *= - 1;
            }
            if (this.trackpoints[i].dir) {
                this.trackpoints[i].dir.z *= - 1;
            }
        }
    }

    public getSlopeAt(index: number): number {
        let trackpoint = this.trackpoints[index];
        let nextTrackPoint = this.trackpoints[index + 1];
        if (trackpoint) {
            if (nextTrackPoint) {
                let dy = nextTrackPoint.position.y - trackpoint.position.y;
                let dLength = nextTrackPoint.summedLength - trackpoint.summedLength;
                return dy / dLength * 100;
            }
            else {
                let angleToVertical = Mummu.Angle(BABYLON.Axis.Y, trackpoint.dir);
                let angleToHorizontal = Math.PI / 2 - angleToVertical;
                return Math.tan(angleToHorizontal) * 100;
            }
        }
        return 0;
    }

    public getBankAt(index: number): number {
        let trackpoint = this.trackpoints[index];
        if (trackpoint) {
            let n = trackpoint.normal;
            if (n.y < 0) {
                n = n.scale(-1);
            }
            let angle = Mummu.AngleFromToAround(trackpoint.normal, BABYLON.Axis.Y, trackpoint.dir);
            return angle / Math.PI * 180;
        }
        return 0;
    }

    public initialize(template: TrackTemplate): void {
        this.template = template;

        this.interpolatedPoints = template.interpolatedPoints;
        this.interpolatedNormals = template.interpolatedNormals.map(v => { return v.clone(); });

        this.preferedStartBank = template.preferedStartBank;
        this.preferedEndBank = template.preferedEndBank;

        // Update AABB values.
        let N = this.interpolatedPoints.length;
        this.AABBMin.copyFromFloats(Infinity, Infinity, Infinity);
        this.AABBMax.copyFromFloats(- Infinity, - Infinity, - Infinity);
        for (let i = 0; i < N; i++) {
            let p = this.interpolatedPoints[i];
            this.AABBMin.minimizeInPlace(p);
            this.AABBMax.maximizeInPlace(p);
        }
        this.AABBMin.x -= (this.part.wireSize + this.part.wireGauge) * 0.5;
        this.AABBMin.y -= (this.part.wireSize + this.part.wireGauge) * 0.5;
        this.AABBMin.z -= (this.part.wireSize + this.part.wireGauge) * 0.5;
        this.AABBMax.x += (this.part.wireSize + this.part.wireGauge) * 0.5;
        this.AABBMax.y += (this.part.wireSize + this.part.wireGauge) * 0.5;
        this.AABBMax.z += (this.part.wireSize + this.part.wireGauge) * 0.5;
        BABYLON.Vector3.TransformCoordinatesToRef(this.AABBMin, this.part.getWorldMatrix(), this.AABBMin);
        BABYLON.Vector3.TransformCoordinatesToRef(this.AABBMax, this.part.getWorldMatrix(), this.AABBMax);
    }

    public recomputeWiresPath(): void {
        let N = this.interpolatedPoints.length;

        let angles = [...this.template.angles];
        this.interpolatedNormals = this.template.interpolatedNormals.map(v => { return v.clone(); });

        let startBank = 0;
        let otherS = this.part.machine.getBankAt(this.startWorldPosition, this.part);
        if (otherS) {
            Mummu.DrawDebugPoint(this.startWorldPosition, 60, BABYLON.Color3.Green());
            let otherBank = otherS.bank * (otherS.isEnd ? 1 : - 1);
            if (this.preferedStartBank * otherBank >= 0) {
                startBank = Math.sign(this.preferedStartBank + otherBank) * Math.max(Math.abs(this.preferedStartBank), Math.abs(otherBank));
            }
            else {
                startBank = this.preferedStartBank * 0.5 + otherBank * 0.5;
            }
        }

        let endBank = 0;
        let otherE = this.part.machine.getBankAt(this.endWorldPosition, this.part);
        if (otherE) {
            Mummu.DrawDebugPoint(this.endWorldPosition, 60, BABYLON.Color3.Red());
            let otherBank = otherE.bank * (otherE.isEnd ? - 1 : 1);
            if (this.preferedEndBank * otherBank >= 0) {
                endBank = Math.sign(this.preferedEndBank + otherBank) * Math.max(Math.abs(this.preferedEndBank), Math.abs(otherBank));
            }
            else {
                endBank = this.preferedEndBank * 0.5 + otherBank * 0.5;
            }
        }

        angles[0] = startBank;
        angles[angles.length - 1] = endBank;
        let f = 1;
        for (let n = 0; n < 2 * N; n++) {
            for (let i = 1; i < N - 1; i++) {
                let aPrev = angles[i - 1];
                let a = angles[i];
                let point = this.interpolatedPoints[i];
                let aNext = angles[i + 1];

                if (isFinite(aPrev) && isFinite(aNext)) {
                    let prevPoint = this.interpolatedPoints[i - 1];
                    let distPrev = BABYLON.Vector3.Distance(prevPoint, point);

                    let nextPoint = this.interpolatedPoints[i + 1];
                    let distNext = BABYLON.Vector3.Distance(nextPoint, point);

                    let d = distPrev / (distPrev + distNext);

                    angles[i] = (1 - f) * a + f * ((1 - d) * aPrev + d * aNext);
                }
                else if (isFinite(aPrev)) {
                    angles[i] = (1 - f) * a + f * aPrev;
                }
                else if (isFinite(aNext)) {
                    angles[i] = (1 - f) * a + f * aNext;
                }
            }
        }

        for (let i = 0; i < N; i++) {
            let prevPoint = this.interpolatedPoints[i - 1];
            let point = this.interpolatedPoints[i];
            let nextPoint = this.interpolatedPoints[i + 1];
            let dir: BABYLON.Vector3;
            if (nextPoint) {
                dir = nextPoint;
            }
            else {
                dir = point;
            }
            if (prevPoint) {
                dir = dir.subtract(prevPoint);
            }
            else {
                dir = dir.subtract(point);
            }
    
            Mummu.RotateInPlace(this.interpolatedNormals[i], dir, angles[i]);
        }

        // Compute wire path
        for (let i = 0; i < N; i++) {
            let pPrev = this.interpolatedPoints[i - 1] ? this.interpolatedPoints[i - 1] : undefined;
            let p = this.interpolatedPoints[i];
            let pNext = this.interpolatedPoints[i + 1] ? this.interpolatedPoints[i + 1] : undefined;

            if (!pPrev) {
                pPrev = p.subtract(pNext.subtract(p));
            }
            if (!pNext) {
                pNext = p.add(p.subtract(pPrev));
            }

            let dir = pNext.subtract(pPrev).normalize();
            let up = this.interpolatedNormals[i];

            let rotation = BABYLON.Quaternion.Identity();
            Mummu.QuaternionFromZYAxisToRef(dir, up, rotation);

            let matrix = BABYLON.Matrix.Compose(BABYLON.Vector3.One(), rotation, p);

            this.wires[0].path[i] = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(- this.part.wireGauge * 0.5, 0, 0), matrix);
            this.wires[1].path[i] = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(this.part.wireGauge * 0.5, 0, 0), matrix);
        }
        Mummu.DecimatePathInPlace(this.wires[0].path, 2 / 180 * Math.PI);
        Mummu.DecimatePathInPlace(this.wires[1].path, 2 / 180 * Math.PI);

        if (this.template.drawStartTip) {
            this.wires[0].startTipCenter = this.template.trackpoints[0].position.clone();
            this.wires[0].startTipNormal = this.template.trackpoints[0].normal.clone();
            this.wires[0].startTipDir = this.template.trackpoints[0].dir.clone();
        }
        if (this.template.drawEndTip) {
            this.wires[0].endTipCenter = this.template.trackpoints[this.template.trackpoints.length - 1].position.clone();
            this.wires[0].endTipNormal = this.template.trackpoints[this.template.trackpoints.length - 1].normal.clone();
            this.wires[0].endTipDir = this.template.trackpoints[this.template.trackpoints.length - 1].dir.clone();
        }
    }

    public recomputeAbsolutePath(): void {
        this.wires.forEach(wire => {
            wire.recomputeAbsolutePath();
        })
    }
}
