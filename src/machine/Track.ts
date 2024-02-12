
class Track {
    
    public trackpoints: TrackPoint[] = [];
    public wires: Wire[];
    public interpolatedPoints: BABYLON.Vector3[];
    public interpolatedNormals: BABYLON.Vector3[];

    public drawStartTip: boolean = false;
    public drawEndTip: boolean = false;

    public preferedStartBank: number = 0;
    public preferedEndBank: number = 0;

    public summedLength: number[] = [0];
    public totalLength: number = 0
    public globalSlope: number = 0;
    public AABBMin: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    public AABBMax: BABYLON.Vector3 = BABYLON.Vector3.Zero();

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

    public generateTrackpointsInterpolatedData(): void {    
        for (let i = 1; i < this.trackpoints.length - 1; i++) {

            let prevTrackPoint = this.trackpoints[i - 1];
            let trackPoint = this.trackpoints[i];
            let nextTrackPoint = this.trackpoints[i + 1];

            if (!trackPoint.fixedDir) {
                trackPoint.dir.copyFrom(nextTrackPoint.position).subtractInPlace(prevTrackPoint.position).normalize();
            }
            if (!trackPoint.fixedTangentIn) {
                trackPoint.tangentIn = 1;
            }
            if (!trackPoint.fixedTangentOut) {
                trackPoint.tangentOut = 1;
            }
        }
    }

    public initialize(): void {
        let sharedData = this.part.machine.trackSharedDataManager.getSharedData(this.part, this.trackIndex);

        this.interpolatedPoints = sharedData.sharedInterpolatedPoints.map(v => { return v.clone(); });
        console.log("Init : " + this.interpolatedPoints.length + " interpolated points");
        this.interpolatedNormals = sharedData.sharedInterpolatedNormals.map(v => { return v.clone(); });

        let N = this.interpolatedPoints.length;
        
        this.preferedStartBank = sharedData.sharedBaseAngle[0];
        this.preferedEndBank = sharedData.sharedBaseAngle[sharedData.sharedBaseAngle.length - 1];
        
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
    
            Mummu.RotateInPlace(this.interpolatedNormals[i], dir, sharedData.sharedBaseAngle[i]);
        }

        this.summedLength = [0];
        this.totalLength = 0;
        for (let i = 0; i < N - 1; i++) {
            let p = this.interpolatedPoints[i];
            let pNext = this.interpolatedPoints[i + 1];
            let dir = pNext.subtract(p);
            let d = dir.length();
            dir.scaleInPlace(1 / d);
            let right = BABYLON.Vector3.Cross(this.interpolatedNormals[i], dir);
            this.interpolatedNormals[i] = BABYLON.Vector3.Cross(dir, right).normalize();
            this.summedLength[i + 1] = this.summedLength[i] + d;
        }
        this.totalLength = this.summedLength[N - 1];

        let dh = this.interpolatedPoints[this.interpolatedPoints.length - 1].y - this.interpolatedPoints[0].y;
        this.globalSlope = dh / this.totalLength * 100;

        // Compute wire path and Update AABB values.
        this.AABBMin.copyFromFloats(Infinity, Infinity, Infinity);
        this.AABBMax.copyFromFloats(- Infinity, - Infinity, - Infinity);
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
            this.AABBMin.minimizeInPlace(this.wires[0].path[i]);
            this.AABBMin.minimizeInPlace(this.wires[1].path[i]);
            this.AABBMax.maximizeInPlace(this.wires[0].path[i]);
            this.AABBMax.maximizeInPlace(this.wires[1].path[i]);
        }
        Mummu.DecimatePathInPlace(this.wires[0].path, 2 / 180 * Math.PI);
        Mummu.DecimatePathInPlace(this.wires[1].path, 2 / 180 * Math.PI);

        this.AABBMin.x -= this.part.wireSize * 0.5;
        this.AABBMin.y -= this.part.wireSize * 0.5;
        this.AABBMin.z -= this.part.wireSize * 0.5;
        this.AABBMax.x += this.part.wireSize * 0.5;
        this.AABBMax.y += this.part.wireSize * 0.5;
        this.AABBMax.z += this.part.wireSize * 0.5;
        BABYLON.Vector3.TransformCoordinatesToRef(this.AABBMin, this.part.getWorldMatrix(), this.AABBMin);
        BABYLON.Vector3.TransformCoordinatesToRef(this.AABBMax, this.part.getWorldMatrix(), this.AABBMax);

        if (this.drawStartTip) {
            this.wires[0].startTipCenter = this.trackpoints[0].position.clone();
            this.wires[0].startTipNormal = this.trackpoints[0].normal.clone();
            this.wires[0].startTipDir = this.trackpoints[0].dir.clone();
        }
        if (this.drawEndTip) {
            this.wires[0].endTipCenter = this.trackpoints[this.trackpoints.length - 1].position.clone();
            this.wires[0].endTipNormal = this.trackpoints[this.trackpoints.length - 1].normal.clone();
            this.wires[0].endTipDir = this.trackpoints[this.trackpoints.length - 1].dir.clone();
        }
        /*
        if (this.wires[1].drawStartTip) {
            this.wires[1].startTipNormal = this.trackpoints[this.trackpoints.length - 1].normal;
            this.wires[1].startTipDir = this.trackpoints[this.trackpoints.length - 1].dir;
        }
        if (this.wires[1].drawEndTip) {
            this.wires[1].endTipNormal = this.trackpoints[this.trackpoints.length - 1].normal;
            this.wires[1].endTipDir = this.trackpoints[this.trackpoints.length - 1].dir;
        }
        */
    }

    public initializeFromTemplate(template: TrackTemplate): void {
        this.interpolatedPoints = template.interpolatedPoints.map(v => { return v.clone(); });
        console.log("InitFromTemplate : " + this.interpolatedPoints.length + " interpolated points");
        this.interpolatedNormals = template.interpolatedNormals.map(v => { return v.clone(); });

        let N = this.interpolatedPoints.length;
        
        this.preferedStartBank = template.angles[0];
        this.preferedEndBank = template.angles[template.angles.length - 1];
        
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
    
            Mummu.RotateInPlace(this.interpolatedNormals[i], dir, template.angles[i]);
        }

        // Compute wire path and Update AABB values.
        this.AABBMin.copyFromFloats(Infinity, Infinity, Infinity);
        this.AABBMax.copyFromFloats(- Infinity, - Infinity, - Infinity);
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
            this.AABBMin.minimizeInPlace(this.wires[0].path[i]);
            this.AABBMin.minimizeInPlace(this.wires[1].path[i]);
            this.AABBMax.maximizeInPlace(this.wires[0].path[i]);
            this.AABBMax.maximizeInPlace(this.wires[1].path[i]);
        }
        Mummu.DecimatePathInPlace(this.wires[0].path, 2 / 180 * Math.PI);
        Mummu.DecimatePathInPlace(this.wires[1].path, 2 / 180 * Math.PI);

        this.AABBMin.x -= this.part.wireSize * 0.5;
        this.AABBMin.y -= this.part.wireSize * 0.5;
        this.AABBMin.z -= this.part.wireSize * 0.5;
        this.AABBMax.x += this.part.wireSize * 0.5;
        this.AABBMax.y += this.part.wireSize * 0.5;
        this.AABBMax.z += this.part.wireSize * 0.5;
        BABYLON.Vector3.TransformCoordinatesToRef(this.AABBMin, this.part.getWorldMatrix(), this.AABBMin);
        BABYLON.Vector3.TransformCoordinatesToRef(this.AABBMax, this.part.getWorldMatrix(), this.AABBMax);

        if (this.drawStartTip) {
            this.wires[0].startTipCenter = this.trackpoints[0].position.clone();
            this.wires[0].startTipNormal = this.trackpoints[0].normal.clone();
            this.wires[0].startTipDir = this.trackpoints[0].dir.clone();
        }
        if (this.drawEndTip) {
            this.wires[0].endTipCenter = this.trackpoints[this.trackpoints.length - 1].position.clone();
            this.wires[0].endTipNormal = this.trackpoints[this.trackpoints.length - 1].normal.clone();
            this.wires[0].endTipDir = this.trackpoints[this.trackpoints.length - 1].dir.clone();
        }
    }

    public recomputeAbsolutePath(): void {
        this.wires.forEach(wire => {
            wire.recomputeAbsolutePath();
        })
    }
}
