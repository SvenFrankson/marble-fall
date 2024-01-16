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
        this.normal = this.normal.clone();

        if (dir) {
            this.fixedDir = true;
        }
        else {
            this.fixedDir = false;
            this.dir = BABYLON.Vector3.Right();
        }
        this.dir = this.dir.clone();
        
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
        let index = this.track.trackPoints[0].indexOf(this);
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
    
    public w: number;
    public h: number;
    public deltaI: number = 0;
    public deltaJ: number = 0;

    public trackPoints: TrackPoint[][];
    public wires: Wire[];
    public interpolatedPoints: BABYLON.Vector3[][];
    public interpolatedNormals: BABYLON.Vector3[][];

    public wireSize: number = 0.0015;
    public wireGauge: number = 0.013;
    public renderOnlyPath: boolean = false;

    public sleepersMesh: BABYLON.Mesh;
    public selectedMesh: BABYLON.Mesh;

    public summedLength: number[] = [0];
    public totalLength: number = 0
    public globalSlope: number = 0;
    public AABBMin: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    public AABBMax: BABYLON.Vector3 = BABYLON.Vector3.Zero();

    public xExtendable: boolean = false;
    public yExtendable: boolean = false;

    constructor(public machine: Machine, private _i: number, private _j: number, public mirror?: boolean) {
        super("track", machine.game.scene);
        this.position.x = this._i * tileWidth;
        this.position.y = - this._j * tileHeight;

        this.wires = [
            new Wire(this),
            new Wire(this)
        ];
    }

    public get i(): number {
        return this._i;
    }
    public setI(v: number) {
        this._i = v;
        this.position.x = this._i * tileWidth;
    }

    public get j(): number {
        return this._j;
    }
    public setJ(v: number) {
        this._j = v;
        this.position.y = - this._j * tileHeight;
    }

    public setIsVisible(isVisible: boolean): void {
        this.isVisible = isVisible;
        this.getChildMeshes().forEach(m => {
            m.isVisible = isVisible;
        })
    }

    public select(): void {
        this.selectedMesh.isVisible = true;
    }

    public unselect(): void {
        this.selectedMesh.isVisible = false;
    }

    protected mirrorTrackPointsInPlace(): void {
        for (let j = 0; j < this.trackPoints.length; j++) {
            let trackpoints = this.trackPoints[j];
            for (let i = 0; i < trackpoints.length; i++) {
                trackpoints[i].position.x *= - 1;
                trackpoints[i].position.x += this.deltaI * tileWidth;
                if (trackpoints[i].normal) {
                    trackpoints[i].normal.x *= - 1;
                }
                if (trackpoints[i].dir) {
                    trackpoints[i].dir.x *= - 1;
                }
            }
        }
    }

    public getSlopeAt(index: number, trackIndex: number = 0): number {
        let trackpoint = this.trackPoints[trackIndex][index];
        let nextTrackPoint = this.trackPoints[trackIndex][index + 1];
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

    public getBankAt(index: number, trackIndex: number = 0): number {
        let trackpoint = this.trackPoints[trackIndex][index];
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

    public splitTrackPointAt(index: number, trackIndex: number = 0): void {
        if (index === 0) {
            let trackPoint = this.trackPoints[trackIndex][0];
            let nextTrackPoint = this.trackPoints[trackIndex][0 + 1];

            let distA = BABYLON.Vector3.Distance(trackPoint.position, nextTrackPoint.position);
            let tanInA = trackPoint.dir.scale(distA * trackPoint.tangentOut);
            let tanOutA = nextTrackPoint.dir.scale(distA * nextTrackPoint.tangentIn);
            let pointA = BABYLON.Vector3.Hermite(trackPoint.position, tanInA, nextTrackPoint.position, tanOutA, 0.5);
            let normalA = BABYLON.Vector3.Lerp(trackPoint.normal, nextTrackPoint.normal, 0.5);

            let trackPointA = new TrackPoint(this, pointA, normalA);

            this.trackPoints[trackIndex].splice(1, 0, trackPointA);
        }
        if (index > 0 && index < this.trackPoints[trackIndex].length - 1) {
            let prevTrackPoint = this.trackPoints[trackIndex][index - 1];
            let trackPoint = this.trackPoints[trackIndex][index];
            let nextTrackPoint = this.trackPoints[trackIndex][index + 1];

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

            this.trackPoints[trackIndex].splice(index, 1, trackPointA, trackPointB);
        }
    }

    public deleteTrackPointAt(index: number, trackIndex: number = 0): void {
        if (index > 0 && index < this.trackPoints[trackIndex].length - 1) {
            this.trackPoints[trackIndex].splice(index, 1);
        }
    }

    public getBarycenter(): BABYLON.Vector3 {
        if (this.trackPoints.length < 2) {
            return this.position.clone();
        }
        let barycenter = this.trackPoints[0].map(
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
        this.interpolatedPoints = [];
        this.interpolatedNormals = [];
        // Update normals and tangents
        for (let j = 0; j < this.trackPoints.length; j++) {
            let trackPoints = this.trackPoints[j];
            let interpolatedPoints = [];
            this.interpolatedPoints[j] = interpolatedPoints;
            let interpolatedNormals = [];
            this.interpolatedNormals[j] = interpolatedNormals;
            for (let i = 1; i < trackPoints.length - 1; i++) {

                let prevTrackPoint = trackPoints[i - 1];
                let trackPoint = trackPoints[i];
                let nextTrackPoint = trackPoints[i + 1];
    
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
                        let tmpTrackPoint = trackPoints[i + n];
                        if (tmpTrackPoint.fixedNormal) {
                            nextTrackPointWithFixedNormal = tmpTrackPoint;
                        }
                    }
                    trackPoint.normal = BABYLON.Vector3.Lerp(prevTrackPoint.normal, nextTrackPointWithFixedNormal.normal, 1 / (1 + n));
                }
                let right = BABYLON.Vector3.Cross(trackPoint.normal, trackPoint.dir);
                trackPoint.normal = BABYLON.Vector3.Cross(trackPoint.dir, right).normalize();
            }
    
            this.wires[2 * j].path = [];
            this.wires[2 * j + 1].path = [];
    
            trackPoints[0].summedLength = 0;
            for (let i = 0; i < trackPoints.length - 1; i++) {
                let trackPoint = trackPoints[i];
                let nextTrackPoint = trackPoints[i + 1];
                let dist = BABYLON.Vector3.Distance(trackPoint.position, nextTrackPoint.position);
                let tanIn = trackPoints[i].dir.scale(dist * trackPoint.tangentOut);
                let tanOut = trackPoints[i + 1].dir.scale(dist * nextTrackPoint.tangentIn);
                let count = Math.round(dist / 0.003);
                count = Math.max(0, count);
                interpolatedPoints.push(trackPoint.position);
                interpolatedNormals.push(trackPoint.normal);
                nextTrackPoint.summedLength = trackPoint.summedLength;
                for (let k = 1; k < count; k++) {
                    let amount = k / count;
                    let point = BABYLON.Vector3.Hermite(trackPoint.position, tanIn, nextTrackPoint.position, tanOut, amount);
                    let normal = BABYLON.Vector3.CatmullRom(trackPoint.normal, trackPoint.normal, nextTrackPoint.normal, nextTrackPoint.normal, amount);
                    interpolatedPoints.push(point);
                    interpolatedNormals.push(normal);
                    nextTrackPoint.summedLength += BABYLON.Vector3.Distance(interpolatedPoints[interpolatedPoints.length - 2], interpolatedPoints[interpolatedPoints.length - 1]);
                }
                nextTrackPoint.summedLength += BABYLON.Vector3.Distance(nextTrackPoint.position, interpolatedPoints[interpolatedPoints.length - 1]);
            }

            interpolatedPoints.push(trackPoints[trackPoints.length - 1].position);
            interpolatedNormals.push(trackPoints[trackPoints.length - 1].normal);
    
            let N = interpolatedPoints.length;
    
            this.summedLength = [0];
            this.totalLength = 0;
            for (let i = 0; i < N - 1; i++) {
                let p = interpolatedPoints[i];
                let pNext = interpolatedPoints[i + 1];
                let dir = pNext.subtract(p);
                let d = dir.length();
                dir.scaleInPlace(1 / d);
                let right = BABYLON.Vector3.Cross(interpolatedNormals[i], dir);
                interpolatedNormals[i] = BABYLON.Vector3.Cross(dir, right).normalize();
                this.summedLength[i + 1] = this.summedLength[i] + d;
            }
            this.totalLength = this.summedLength[N - 1];
    
            let dh = interpolatedPoints[interpolatedPoints.length - 1].y - interpolatedPoints[0].y;
            this.globalSlope = dh / this.totalLength * 100;
    
            // Compute wire path and Update AABB values.
            this.AABBMin.copyFromFloats(Infinity, Infinity, Infinity);
            this.AABBMax.copyFromFloats(- Infinity, - Infinity, - Infinity);
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
    
                this.wires[2 * j].path[i] = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(- this.wireGauge * 0.5, 0, 0), matrix);
                this.wires[2 * j + 1].path[i] = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(this.wireGauge * 0.5, 0, 0), matrix);
                this.AABBMin.minimizeInPlace(this.wires[0].path[i]);
                this.AABBMin.minimizeInPlace(this.wires[1].path[i]);
                this.AABBMax.maximizeInPlace(this.wires[0].path[i]);
                this.AABBMax.maximizeInPlace(this.wires[1].path[i]);
            }
            Mummu.DecimatePathInPlace(this.wires[2 * j].path, 2 / 180 * Math.PI);
            Mummu.DecimatePathInPlace(this.wires[2 * j + 1].path, 2 / 180 * Math.PI);
    
            this.AABBMin.x -= this.wireSize * 0.5;
            this.AABBMin.y -= this.wireSize * 0.5;
            this.AABBMin.z -= this.wireSize * 0.5;
            this.AABBMax.x += this.wireSize * 0.5;
            this.AABBMax.y += this.wireSize * 0.5;
            this.AABBMax.z += this.wireSize * 0.5;
            BABYLON.Vector3.TransformCoordinatesToRef(this.AABBMin, this.getWorldMatrix(), this.AABBMin);
            BABYLON.Vector3.TransformCoordinatesToRef(this.AABBMax, this.getWorldMatrix(), this.AABBMax);
        }
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

        if (this.selectedMesh) {
            this.selectedMesh.dispose();
        }
        let xLeft = - tileWidth * 0.5;
        let xRight = tileWidth * (this.deltaI + 0.5);
        let yTop = tileHeight * 0.25;
        let yBottom = - tileHeight * (this.deltaJ + 0.75);
        this.selectedMesh = BABYLON.MeshBuilder.CreateLines("select-mesh", {
            points: [
                new BABYLON.Vector3(xLeft, yTop, 0),
                new BABYLON.Vector3(xRight, yTop, 0),
                new BABYLON.Vector3(xRight, yBottom, 0),
                new BABYLON.Vector3(xLeft, yBottom, 0),
                new BABYLON.Vector3(xLeft, yTop, 0)
            ]
        });
        this.selectedMesh.parent = this;
        this.selectedMesh.isVisible = false;

        this.rebuildWireMeshes();
    }
    
    public dispose(): void {
        super.dispose();
        let index = this.machine.tracks.indexOf(this);
        if (index > - 1) {
            this.machine.tracks.splice(index, 1);
        }
    }

    public update(dt: number): void {}

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

            let tmp = BABYLON.ExtrudeShape("wire", { shape: shape, path: this.interpolatedPoints[0], closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
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

        for (let i = 0; i < this.trackPoints[0].length; i++) {
            data.points[i] = {
                position: { x: this.trackPoints[0][i].position.x, y: this.trackPoints[0][i].position.y, z: this.trackPoints[0][i].position.z }
            };
            if (this.trackPoints[0][i].fixedNormal) {
                data.points[i].normal = { x: this.trackPoints[0][i].normal.x, y: this.trackPoints[0][i].normal.y, z: this.trackPoints[0][i].normal.z }
            }
            if (this.trackPoints[0][i].fixedDir) {
                data.points[i].dir = { x: this.trackPoints[0][i].dir.x, y: this.trackPoints[0][i].dir.y, z: this.trackPoints[0][i].dir.z }
            }
            if (this.trackPoints[0][i].fixedTangentIn) {
                data.points[i].tangentIn = this.trackPoints[0][i].tangentIn;
            }
            if (this.trackPoints[0][i].fixedTangentOut) {
                data.points[i].tangentOut = this.trackPoints[0][i].tangentOut;
            }
        }

        return data;
    }

    public deserialize(data: ITrackData): void {
        this.trackPoints = [[]];
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
            this.trackPoints[0][i] = trackPoint;
        }
    }
}