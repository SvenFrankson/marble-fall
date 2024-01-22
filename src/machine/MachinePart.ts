var baseRadius = 0.075;
var tileWidth = 0.15;
var tileHeight = 0.03;
var tileDepth = 0.06;

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

class MachinePart extends BABYLON.Mesh {

    public partName: string = "machine-part";

    public get game(): Game {
        return this.machine.game;
    }
    
    public tracks: Track[] = [];
    public wires: Wire[] = [];
    public allWires: Wire[] = [];

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

    constructor(public machine: Machine, private _i: number, private _j: number, private _k: number, public w: number = 1, public h: number = 1, public mirror?: boolean) {
        super("track", machine.game.scene);
        this.position.x = this._i * tileWidth;
        this.position.y = - this._j * tileHeight;
        this.position.z = - this._k * tileDepth;

        this.tracks = [new Track(this)];
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

    public get k(): number {
        return this._k;
    }
    public setK(v: number) {
        this._k = v;
        this.position.z = - this._k * tileDepth;
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
        for (let i = 0; i < this.tracks.length; i++) {
            this.tracks[i].mirrorTrackPointsInPlace();
        }
    }

    public getSlopeAt(index: number, trackIndex: number = 0): number {
        if (this.tracks[trackIndex]) {
            return this.tracks[trackIndex].getSlopeAt(index);
        }
        return 0;
    }

    public getBankAt(index: number, trackIndex: number = 0): number {
        if (this.tracks[trackIndex]) {
            return this.tracks[trackIndex].getBankAt(index);
        }
        return 0;
    }

    public splitTrackPointAt(index: number, trackIndex: number = 0): void {
        if (this.tracks[trackIndex]) {
            this.tracks[trackIndex].splitTrackPointAt(index);
        }
    }

    public deleteTrackPointAt(index: number, trackIndex: number = 0): void {
        if (this.tracks[trackIndex]) {
            this.tracks[trackIndex].deleteTrackPointAt(index);
        }
    }

    public getBarycenter(): BABYLON.Vector3 {
        if (this.tracks[0].trackpoints.length < 2) {
            return this.position.clone();
        }
        let barycenter = this.tracks[0].trackpoints.map(
            trackpoint => {
                return trackpoint.position;
            }
        ).reduce(
            (pos1, pos2) => {
                return pos1.add(pos2);
            }
        ).scaleInPlace(1 / this.tracks[0].trackpoints.length);
        return BABYLON.Vector3.TransformCoordinates(barycenter, this.getWorldMatrix());
    }

    public recomputeAbsolutePath(): void {
        this.tracks.forEach(track => {
            track.recomputeAbsolutePath();
        })
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
        let xRight = tileWidth * (this.w - 0.5);
        let yTop = tileHeight * 0.25;
        let yBottom = - tileHeight * (this.h + 0.75);
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
        let index = this.machine.parts.indexOf(this);
        if (index > - 1) {
            this.machine.parts.splice(index, 1);
        }
    }

    public generateWires(): void {
        this.AABBMin.copyFromFloats(Infinity, Infinity, Infinity);
        this.AABBMax.copyFromFloats(- Infinity, - Infinity, - Infinity);

        this.allWires = [...this.wires];
        this.tracks.forEach(track => {
            track.generateWires();
            this.AABBMin.minimizeInPlace(track.AABBMin);
            this.AABBMax.maximizeInPlace(track.AABBMax);
            this.allWires.push(track.wires[0], track.wires[1]);
        });
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

            let tmp = BABYLON.ExtrudeShape("wire", { shape: shape, path: this.tracks[0].interpolatedPoints, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
            let vertexData = BABYLON.VertexData.ExtractFromMesh(tmp);
            vertexData.applyToMesh(this.sleepersMesh);
            tmp.dispose();
            
            this.allWires.forEach(wire => {
                wire.hide();
            })
        }
        else {
            
            this.allWires.forEach(wire => {
                wire.show();
            })
            
            SleeperMeshBuilder.GenerateSleepersVertexData(this, 0.03).applyToMesh(this.sleepersMesh);
            this.tracks.forEach(track => {
                track.wires.forEach(wire => {
                    wire.instantiate();
                })
            })
            this.wires.forEach(wire => {
                wire.instantiate();
            })
        }
    }

    public serialize(): ITrackData {
        let data: ITrackData = { points: []};

        for (let i = 0; i < this.tracks[0].trackpoints.length; i++) {
            data.points[i] = {
                position: { x: this.tracks[0].trackpoints[i].position.x, y: this.tracks[0].trackpoints[i].position.y, z: this.tracks[0].trackpoints[i].position.z }
            };
            if (this.tracks[0].trackpoints[i].fixedNormal) {
                data.points[i].normal = { x: this.tracks[0].trackpoints[i].normal.x, y: this.tracks[0].trackpoints[i].normal.y, z: this.tracks[0].trackpoints[i].normal.z }
            }
            if (this.tracks[0].trackpoints[i].fixedDir) {
                data.points[i].dir = { x: this.tracks[0].trackpoints[i].dir.x, y: this.tracks[0].trackpoints[i].dir.y, z: this.tracks[0].trackpoints[i].dir.z }
            }
            if (this.tracks[0].trackpoints[i].fixedTangentIn) {
                data.points[i].tangentIn = this.tracks[0].trackpoints[i].tangentIn;
            }
            if (this.tracks[0].trackpoints[i].fixedTangentOut) {
                data.points[i].tangentOut = this.tracks[0].trackpoints[i].tangentOut;
            }
        }

        return data;
    }

    public deserialize(data: ITrackData): void {
        this.tracks = [new Track(this)];
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
                this.tracks[0],
                new BABYLON.Vector3(pointData.position.x, pointData.position.y, pointData.position.z),
                normal,
                direction,
                pointData.tangentIn,
                pointData.tangentOut
            );
            this.tracks[0].trackpoints[i] = trackPoint;
        }
    }
}