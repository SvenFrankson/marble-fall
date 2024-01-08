var baseRadius = 0.075;
var xDist = 0.75 * baseRadius;
var yDist = Math.sqrt(3) / 2 * 0.5 * baseRadius;

class TrackPoint {

    public fixedNormal: boolean = false;
    public fixedDir: boolean = false;
    public fixedTangentPrev: boolean = false;
    public fixedTangentNext: boolean = false;

    constructor(
        public track: Track,
        public position: BABYLON.Vector3,
        public normal?: BABYLON.Vector3,
        public dir?: BABYLON.Vector3,
        public trangentPrev?: number,
        public trangentNext?: number
    ) {
        if (normal) {
            this.fixedNormal = true;
        }
        else {
            this.fixedNormal = false;
            this.normal = BABYLON.Vector3.Up();
        }

        if (dir) {
            this.fixedDir = true;
        }
        else {
            this.fixedDir = false;
            this.dir = BABYLON.Vector3.Right();
        }
        
        if (trangentPrev) {
            this.fixedTangentPrev = true;
        }
        else {
            this.fixedTangentPrev = false;
            this.trangentPrev = 1;
        }
        
        if (trangentNext) {
            this.fixedTangentNext = true;
        }
        else {
            this.fixedTangentNext = false;
            this.trangentNext = 1;
        }
    }
}

interface ITrackPointData {
    position: { x: number, y: number, z: number};
    normal?: { x: number, y: number, z: number};
    dir?: { x: number, y: number, z: number};
}

interface ITrackData {
    points: ITrackPointData[];
}

class Track extends BABYLON.Mesh {

    public subdivisions: number = 3;
    public trackPoints: TrackPoint[];
    public wires: Wire[];

    public wireSize: number = 0.002;
    public wireGauge: number = 0.010;

    constructor(public game: Game, public i: number, public j: number) {
        super("track", game.scene);
        this.position.x = i * 2 * xDist;
        this.position.y = - i * 2 * yDist;

        this.wires = [
            new Wire(this),
            new Wire(this)
        ];
    }

    public getSlopeAt(index: number): number {
        let trackpoint = this.trackPoints[index];
        let nextTrackPoint = this.trackPoints[index + 1];
        if (trackpoint) {
            let dirToNext: BABYLON.Vector3 = BABYLON.Vector3.Zero();
            if (nextTrackPoint) {
                dirToNext.copyFrom(nextTrackPoint.position).subtractInPlace(trackpoint.position).normalize();
            }
            else {
                dirToNext.copyFrom(trackpoint.dir);
            }
            let angleToVertical = Mummu.Angle(BABYLON.Axis.Y, dirToNext);
            let angleToHorizontal = Math.PI / 2 - angleToVertical;
            let slope = Math.tan(angleToHorizontal) * 100;
            return slope;
        }
        return 0;
    }

    public deleteTrackPointAt(index: number): void {
        this.trackPoints.splice(index, 1);
    }

    public getBarycenter(): BABYLON.Vector3 {
        if (this.trackPoints.length < 2) {
            return this.position;
        }
        let barycenter = this.trackPoints.map(
            trackpoint => {
                return trackpoint.position;
            }
        ).reduce(
            (pos1, pos2) => {
                return pos1.add(pos2);
            }
        ).scaleInPlace(1 / this.trackPoints.length);
        return BABYLON.Vector3.TransformCoordinates(barycenter, this.getWorldMatrix());
    }

    public generateWires(): void {
        // Update normals and tangents
        for (let i = 1; i < this.trackPoints.length - 1; i++) {
            let prevTrackPoint = this.trackPoints[i - 1];
            let trackPoint = this.trackPoints[i];
            let nextTrackPoint = this.trackPoints[i + 1];

            if (!trackPoint.fixedDir) {
                trackPoint.dir.copyFrom(nextTrackPoint.position).subtractInPlace(prevTrackPoint.position).normalize();
            }
            if (!trackPoint.fixedTangentPrev) {
                trackPoint.trangentPrev = BABYLON.Vector3.Distance(prevTrackPoint.position, trackPoint.position);
            }
            if (!trackPoint.fixedTangentNext) {
                trackPoint.trangentNext = BABYLON.Vector3.Distance(nextTrackPoint.position, trackPoint.position);
            }
            if (!trackPoint.fixedNormal) {
                let n = 0;
                let nextTrackPointWithFixedNormal: TrackPoint;
                while (!nextTrackPointWithFixedNormal) {
                    n++;
                    let tmpTrackPoint = this.trackPoints[i + n];
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

        let interpolatedPoints = this.trackPoints.map(trackpoint => { return trackpoint.position.clone(); });
        let interpolatedNormals = this.trackPoints.map(trackpoint => { return trackpoint.normal.clone(); });

        for (let n = 0; n < this.subdivisions; n++) {
            Mummu.CatmullRomPathInPlace(interpolatedPoints, this.trackPoints[0].dir.scale(2), this.trackPoints[this.trackPoints.length - 1].dir.scale(2));
            Mummu.CatmullRomPathInPlace(interpolatedNormals);
        }

        for (let n = 0; n < 3; n++) {
            let smoothed = interpolatedPoints.map(pt => { return pt.clone(); });
            for (let i = 1; i < interpolatedPoints.length - 1; i++) {
                smoothed[i].addInPlace(interpolatedPoints[i - 1]).addInPlace(interpolatedPoints[i + 1]).scaleInPlace(1/3);
            }
            interpolatedPoints = smoothed;
        }

        let N = interpolatedPoints.length;

        for (let i = 0; i < N; i++) {
            let pPrev = interpolatedPoints[i - 1] ? interpolatedPoints[i - 1] : undefined;
            let p = interpolatedPoints[i];
            let pNext = interpolatedPoints[i + 1] ? interpolatedPoints[i + 1] : undefined;

            if (!pPrev) {
                pPrev = p.subtract(pNext.subtract(p));
            }
            if (!pNext) {
                pNext = p.add(p.subtract(pPrev));
            }

            let dir = pNext.subtract(pPrev).normalize();
            let up = interpolatedNormals[i];

            let rotation = BABYLON.Quaternion.Identity();
            Mummu.QuaternionFromZYAxisToRef(dir, up, rotation);

            let matrix = BABYLON.Matrix.Compose(BABYLON.Vector3.One(), rotation, p);

            this.wires[0].path[i] = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(- this.wireGauge * 0.5, 0, 0), matrix);
            this.wires[1].path[i] = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(this.wireGauge * 0.5, 0, 0), matrix);
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

    public serialize(): ITrackData {
        let data: ITrackData = { points: []};

        for (let i = 0; i < this.trackPoints.length; i++) {
            data.points[i] = {
                position: { x: this.trackPoints[i].position.x, y: this.trackPoints[i].position.y, z: this.trackPoints[i].position.z }
            };
            if (this.trackPoints[i].fixedNormal) {
                data.points[i].normal = { x: this.trackPoints[i].normal.x, y: this.trackPoints[i].normal.y, z: this.trackPoints[i].normal.z }
            }
            if (this.trackPoints[i].fixedDir) {
                data.points[i].dir = { x: this.trackPoints[i].dir.x, y: this.trackPoints[i].dir.y, z: this.trackPoints[i].dir.z }
            }
        }

        return data;
    }

    public deserialize(data: ITrackData): void {
        this.trackPoints = [];
        for (let i = 0; i < data.points.length; i++) {
            let pointData = data.points[i];
            let normal: BABYLON.Vector3;
            let direction: BABYLON.Vector3;
            if (pointData.normal) {
                normal = new BABYLON.Vector3(pointData.normal.x, pointData.normal.y, pointData.normal.z);
            }
            if (pointData.dir) {
                direction = new BABYLON.Vector3(pointData.dir.x, pointData.dir.y, pointData.dir.z);
            }

            let trackPoint = new TrackPoint(
                this,
                new BABYLON.Vector3(pointData.position.x, pointData.position.y, pointData.position.z),
                normal,
                direction
            );
            this.trackPoints[i] = trackPoint;
        }
    }
}