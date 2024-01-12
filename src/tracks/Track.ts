var baseRadius = 0.075;
var tileWidth = 0.15;
var tileHeight = 0.03;

class TrackPoint {

    public fixedNormal: boolean = false;
    public fixedDir: boolean = false;
    public fixedTangentIn: boolean = false;
    public fixedTangentOut: boolean = false;
    public summedLength: number = 0;

    constructor(
        public track: Track,
        public position: BABYLON.Vector3,
        public normal?: BABYLON.Vector3,
        public dir?: BABYLON.Vector3,
        public tangentIn?: number,
        public tangentOut?: number
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
        
        if (tangentIn) {
            this.fixedTangentIn = true;
        }
        else {
            this.fixedTangentIn = false;
            this.tangentIn = 1;
        }
        
        if (tangentOut) {
            this.fixedTangentOut = true;
        }
        else {
            this.fixedTangentOut = false;
            this.tangentOut = 1;
        }
    }

    public isFirstOrLast(): boolean {
        let index = this.track.trackPoints.indexOf(this);
        if (index === 0 || index === this.track.trackPoints.length - 1) {
            return true;
        }
        return false;
    }
}

interface ITrackPointData {
    position: { x: number, y: number, z: number};
    normal?: { x: number, y: number, z: number};
    dir?: { x: number, y: number, z: number};
    tangentIn?: number;
    tangentOut?: number;
}

interface ITrackData {
    points: ITrackPointData[];
}

class Track extends BABYLON.Mesh {

    public trackName: string = "track";

    public get game(): Game {
        return this.machine.game;
    }
    
    public deltaI: number = 0;
    public deltaJ: number = 0;

    public trackPoints: TrackPoint[];
    public wires: Wire[];
    public interpolatedPoints: BABYLON.Vector3[];
    public interpolatedNormals: BABYLON.Vector3[];

    public wireSize: number = 0.0015;
    public wireGauge: number = 0.013;
    public renderOnlyPath: boolean = false;

    public sleepersMesh: BABYLON.Mesh;

    public summedLength: number[] = [0];
    public totalLength: number = 0
    public globalSlope: number = 0;
    public AABBMin: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    public AABBMax: BABYLON.Vector3 = BABYLON.Vector3.Zero();

    constructor(public machine: Machine, public i: number, public j: number, public mirror?: boolean) {
        super("track", machine.game.scene);
        this.position.x = i * tileWidth;
        this.position.y = - j * tileHeight;

        this.wires = [
            new Wire(this),
            new Wire(this)
        ];
    }

    protected mirrorTrackPointsInPlace(): void {
        for (let i = 0; i < this.trackPoints.length; i++) {
            this.trackPoints[i].position.x *= - 1;
            this.trackPoints[i].position.x += this.deltaI * tileWidth;
            if (this.trackPoints[i].normal) {
                this.trackPoints[i].normal.x *= - 1;
            }
            if (this.trackPoints[i].dir) {
                this.trackPoints[i].dir.x *= - 1;
            }
        }
    }

    public getSlopeAt(index: number): number {
        let trackpoint = this.trackPoints[index];
        let nextTrackPoint = this.trackPoints[index + 1];
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
        let trackpoint = this.trackPoints[index];
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
            let trackPoint = this.trackPoints[0];
            let nextTrackPoint = this.trackPoints[0 + 1];

            let distA = BABYLON.Vector3.Distance(trackPoint.position, nextTrackPoint.position);
            let tanInA = trackPoint.dir.scale(distA * trackPoint.tangentOut);
            let tanOutA = nextTrackPoint.dir.scale(distA * nextTrackPoint.tangentIn);
            let pointA = BABYLON.Vector3.Hermite(trackPoint.position, tanInA, nextTrackPoint.position, tanOutA, 0.5);
            let normalA = BABYLON.Vector3.Lerp(trackPoint.normal, nextTrackPoint.normal, 0.5);

            let trackPointA = new TrackPoint(this, pointA, normalA);

            this.trackPoints.splice(1, 0, trackPointA);
        }
        if (index > 0 && index < this.trackPoints.length - 1) {
            let prevTrackPoint = this.trackPoints[index - 1];
            let trackPoint = this.trackPoints[index];
            let nextTrackPoint = this.trackPoints[index + 1];

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

            this.trackPoints.splice(index, 1, trackPointA, trackPointB);
        }
    }

    public deleteTrackPointAt(index: number): void {
        if (index > 0 && index < this.trackPoints.length - 1) {
            this.trackPoints.splice(index, 1);
        }
    }

    public getBarycenter(): BABYLON.Vector3 {
        if (this.trackPoints.length < 2) {
            return this.position.clone();
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

        this.interpolatedPoints = [];
        this.interpolatedNormals = [];

        this.trackPoints[0].summedLength = 0;
        for (let i = 0; i < this.trackPoints.length - 1; i++) {
            let trackPoint = this.trackPoints[i];
            let nextTrackPoint = this.trackPoints[i + 1];
            let dist = BABYLON.Vector3.Distance(trackPoint.position, nextTrackPoint.position);
            let tanIn = this.trackPoints[i].dir.scale(dist * trackPoint.tangentOut);
            let tanOut = this.trackPoints[i + 1].dir.scale(dist * nextTrackPoint.tangentIn);
            let count = Math.round(dist / 0.003);
            count = Math.max(0, count);
            this.interpolatedPoints.push(trackPoint.position);
            this.interpolatedNormals.push(trackPoint.normal);
            nextTrackPoint.summedLength = trackPoint.summedLength;
            for (let j = 1; j < count; j++) {
                let amount = j / count;
                let point = BABYLON.Vector3.Hermite(trackPoint.position, tanIn, nextTrackPoint.position, tanOut, amount);
                let normal = BABYLON.Vector3.CatmullRom(trackPoint.normal, trackPoint.normal, nextTrackPoint.normal, nextTrackPoint.normal, amount);
                this.interpolatedPoints.push(point);
                this.interpolatedNormals.push(normal);
                nextTrackPoint.summedLength += BABYLON.Vector3.Distance(this.interpolatedPoints[this.interpolatedPoints.length - 2], this.interpolatedPoints[this.interpolatedPoints.length - 1]);
            }
            nextTrackPoint.summedLength += BABYLON.Vector3.Distance(nextTrackPoint.position, this.interpolatedPoints[this.interpolatedPoints.length - 1]);
        }

        this.interpolatedPoints.push(this.trackPoints[this.trackPoints.length - 1].position);
        this.interpolatedNormals.push(this.trackPoints[this.trackPoints.length - 1].normal);

        let N = this.interpolatedPoints.length;

        this.summedLength = [0];
        this.totalLength = 0;
        for (let i = 0; i < N - 1; i++) {
            let p = this.interpolatedPoints[i];
            let pNext = this.interpolatedPoints[i + 1];
            let d = BABYLON.Vector3.Distance(p, pNext);
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

            this.wires[0].path[i] = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(- this.wireGauge * 0.5, 0, 0), matrix);
            this.wires[1].path[i] = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(this.wireGauge * 0.5, 0, 0), matrix);
            this.AABBMin.minimizeInPlace(this.wires[0].path[i]);
            this.AABBMin.minimizeInPlace(this.wires[1].path[i]);
            this.AABBMax.maximizeInPlace(this.wires[0].path[i]);
            this.AABBMax.maximizeInPlace(this.wires[1].path[i]);
        }
        Mummu.DecimatePathInPlace(this.wires[0].path, 2 / 180 * Math.PI);
        Mummu.DecimatePathInPlace(this.wires[1].path, 2 / 180 * Math.PI);

        this.AABBMin.x -= this.wireSize * 0.5;
        this.AABBMin.y -= this.wireSize * 0.5;
        this.AABBMin.z -= this.wireSize * 0.5;
        this.AABBMax.x += this.wireSize * 0.5;
        this.AABBMax.y += this.wireSize * 0.5;
        this.AABBMax.z += this.wireSize * 0.5;
        BABYLON.Vector3.TransformCoordinatesToRef(this.AABBMin, this.getWorldMatrix(), this.AABBMin);
        BABYLON.Vector3.TransformCoordinatesToRef(this.AABBMax, this.getWorldMatrix(), this.AABBMax);
    }

    public recomputeAbsolutePath(): void {
        this.wires.forEach(wire => {
            wire.recomputeAbsolutePath();
        })
    }

    public async instantiate(): Promise<void> {
        this.sleepersMesh = new BABYLON.Mesh("sleepers-mesh");
        this.sleepersMesh.material = this.game.steelMaterial;
        this.sleepersMesh.parent = this;

        this.rebuildWireMeshes();
    }
    
    public dispose(): void {
        super.dispose();
        let index = this.machine.tracks.indexOf(this);
        if (index > - 1) {
            this.machine.tracks.splice(index, 1);
        }
    }

    public update(): void {}

    public rebuildWireMeshes(): void {
        if (this.renderOnlyPath) {
            let n = 8;
            let shape: BABYLON.Vector3[] = [];
            for (let i = 0; i < n; i++) {
                let a = i / n * 2 * Math.PI;
                let cosa = Math.cos(a);
                let sina = Math.sin(a);
                shape[i] = new BABYLON.Vector3(cosa * this.wireSize * 0.5, sina * this.wireSize * 0.5, 0);
            }

            let tmp = BABYLON.ExtrudeShape("wire", { shape: shape, path: this.interpolatedPoints, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
            let vertexData = BABYLON.VertexData.ExtractFromMesh(tmp);
            vertexData.applyToMesh(this.sleepersMesh);
            tmp.dispose();
            
            this.wires.forEach(wire => {
                wire.hide();
            })
        }
        else {
            
            this.wires.forEach(wire => {
                wire.show();
            })
            
            SleeperMeshBuilder.GenerateSleepersVertexData(this, 0.03).applyToMesh(this.sleepersMesh);
            this.wires.forEach(wire => {
                wire.instantiate();
            })
        }
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
            if (this.trackPoints[i].fixedTangentIn) {
                data.points[i].tangentIn = this.trackPoints[i].tangentIn;
            }
            if (this.trackPoints[i].fixedTangentOut) {
                data.points[i].tangentOut = this.trackPoints[i].tangentOut;
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
                direction,
                pointData.tangentIn,
                pointData.tangentOut
            );
            this.trackPoints[i] = trackPoint;
        }
    }
}