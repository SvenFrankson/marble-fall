
class Track {
    
    public trackpoints: TrackPoint[] = [];
    public wires: Wire[];
    public interpolatedPoints: BABYLON.Vector3[];
    public interpolatedNormals: BABYLON.Vector3[];

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

    public mirrorTrackPointsInPlace(): void {
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
    
    public splitTrackPointAt(index: number): void {
        if (index === 0) {
            let trackPoint = this.trackpoints[0];
            let nextTrackPoint = this.trackpoints[0 + 1];

            let distA = BABYLON.Vector3.Distance(trackPoint.position, nextTrackPoint.position);
            let tanInA = trackPoint.dir.scale(distA * trackPoint.tangentOut);
            let tanOutA = nextTrackPoint.dir.scale(distA * nextTrackPoint.tangentIn);
            let pointA = BABYLON.Vector3.Hermite(trackPoint.position, tanInA, nextTrackPoint.position, tanOutA, 0.5);
            let normalA = BABYLON.Vector3.Lerp(trackPoint.normal, nextTrackPoint.normal, 0.5);

            let trackPointA = new TrackPoint(this, pointA, normalA);

            this.trackpoints.splice(1, 0, trackPointA);
        }
        if (index > 0 && index < this.trackpoints.length - 1) {
            let prevTrackPoint = this.trackpoints[index - 1];
            let trackPoint = this.trackpoints[index];
            let nextTrackPoint = this.trackpoints[index + 1];

            let distA = BABYLON.Vector3.Distance(trackPoint.position, prevTrackPoint.position);
            let tanInA = prevTrackPoint.dir.scale(distA * prevTrackPoint.tangentOut);
            let tanOutA = trackPoint.dir.scale(distA * trackPoint.tangentIn);
            let pointA = BABYLON.Vector3.Hermite(prevTrackPoint.position, tanInA, trackPoint.position, tanOutA, 2 / 3);
            let normalA = BABYLON.Vector3.Lerp(prevTrackPoint.normal, trackPoint.normal, 2 / 3);

            let distB = BABYLON.Vector3.Distance(trackPoint.position, nextTrackPoint.position);
            let tanInB = trackPoint.dir.scale(distB * trackPoint.tangentOut);
            let tanOutB = nextTrackPoint.dir.scale(distB * nextTrackPoint.tangentIn);
            let pointB = BABYLON.Vector3.Hermite(trackPoint.position, tanInB, nextTrackPoint.position, tanOutB, 1 / 3);
            let normalB = BABYLON.Vector3.Lerp(trackPoint.normal, nextTrackPoint.normal, 1 / 3);

            let trackPointA = new TrackPoint(this, pointA, normalA);
            let trackPointB = new TrackPoint(this, pointB, normalB);

            this.trackpoints.splice(index, 1, trackPointA, trackPointB);
        }
    }

    public deleteTrackPointAt(index: number): void {
        if (index > 0 && index < this.trackpoints.length - 1) {
            this.trackpoints.splice(index, 1);
        }
    }

    public generateWires(): void {
        this.interpolatedPoints = [];
        this.interpolatedNormals = [];
        // Update normals and tangents
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
            if (!trackPoint.fixedNormal) {
                let n = 0;
                let nextTrackPointWithFixedNormal: TrackPoint;
                while (!nextTrackPointWithFixedNormal) {
                    n++;
                    let tmpTrackPoint = this.trackpoints[i + n];
                    if (tmpTrackPoint.fixedNormal) {
                        nextTrackPointWithFixedNormal = tmpTrackPoint;
                    }
                }
                trackPoint.normal = BABYLON.Vector3.Lerp(prevTrackPoint.normal, nextTrackPointWithFixedNormal.normal, 1 / (1 + n));
            }
            let right = BABYLON.Vector3.Cross(trackPoint.normal, trackPoint.dir);
            trackPoint.normal = BABYLON.Vector3.Cross(trackPoint.dir, right).normalize();
        }

        this.wires[0].path = [];
        this.wires[1].path = [];

        this.trackpoints[0].summedLength = 0;
        for (let i = 0; i < this.trackpoints.length - 1; i++) {
            let trackPoint = this.trackpoints[i];
            let nextTrackPoint = this.trackpoints[i + 1];
            let dist = BABYLON.Vector3.Distance(trackPoint.position, nextTrackPoint.position);
            let tanIn = this.trackpoints[i].dir.scale(dist * trackPoint.tangentOut);
            let tanOut = this.trackpoints[i + 1].dir.scale(dist * nextTrackPoint.tangentIn);
            let count = Math.round(dist / 0.003);
            count = Math.max(0, count);
            this.interpolatedPoints.push(trackPoint.position);
            this.interpolatedNormals.push(trackPoint.normal);
            nextTrackPoint.summedLength = trackPoint.summedLength;
            for (let k = 1; k < count; k++) {
                let amount = k / count;
                let point = BABYLON.Vector3.Hermite(trackPoint.position, tanIn, nextTrackPoint.position, tanOut, amount);
                let normal = BABYLON.Vector3.CatmullRom(trackPoint.normal, trackPoint.normal, nextTrackPoint.normal, nextTrackPoint.normal, amount);
                this.interpolatedPoints.push(point);
                this.interpolatedNormals.push(normal);
                nextTrackPoint.summedLength += BABYLON.Vector3.Distance(this.interpolatedPoints[this.interpolatedPoints.length - 2], this.interpolatedPoints[this.interpolatedPoints.length - 1]);
            }
            nextTrackPoint.summedLength += BABYLON.Vector3.Distance(nextTrackPoint.position, this.interpolatedPoints[this.interpolatedPoints.length - 1]);
        }

        this.interpolatedPoints.push(this.trackpoints[this.trackpoints.length - 1].position);
        this.interpolatedNormals.push(this.trackpoints[this.trackpoints.length - 1].normal);

        let N = this.interpolatedPoints.length;

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
    }

    public recomputeAbsolutePath(): void {
        this.wires.forEach(wire => {
            wire.recomputeAbsolutePath();
        })
    }
}
