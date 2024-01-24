var baseRadius = 0.075;
var tileWidth = 0.15;
var tileHeight = 0.03;
var tileDepth = 0.06;

enum PartVisibilityMode {
    Default,
    Selected,
    Ghost
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

var radius = 0.014 * 1.2 / 2;
var selectorHullShape: BABYLON.Vector3[] = [];
for (let i = 0; i < 6; i++) {
    let a = i / 6 * 2 * Math.PI;
    let cosa = Math.cos(a);
    let sina = Math.sin(a);
    selectorHullShape[i] = new BABYLON.Vector3(cosa * radius, sina * radius, 0);
}

class MachinePartSelectorMesh extends BABYLON.Mesh {

    constructor(public part: MachinePart) {
        super("machine-part-selector");
    }
}

interface IMachinePartProp {
    w?: number;
    h?: number;
    d?: number;
    mirrorX?: boolean;
    mirrorZ?: boolean;
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
    public wireGauge: number = 0.014;
    public renderOnlyPath: boolean = false;

    public sleepersMesh: BABYLON.Mesh;
    public selectorMesh: MachinePartSelectorMesh;

    public summedLength: number[] = [0];
    public totalLength: number = 0
    public globalSlope: number = 0;
    public AABBMin: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    public AABBMax: BABYLON.Vector3 = BABYLON.Vector3.Zero();

    public w: number = 1;
    public h: number = 1;
    public d: number = 1;
    public mirrorX: boolean = false;
    public mirrorZ: boolean = false;

    public xExtendable: boolean = false;
    public yExtendable: boolean = false;
    public zExtendable: boolean = false;
    public xMirrorable: boolean = false;
    public zMirrorable: boolean = false;

    constructor(public machine: Machine, private _i: number, private _j: number, private _k: number, prop?: IMachinePartProp) {
        super("track", machine.game.scene);
        this.position.x = this._i * tileWidth;
        this.position.y = - this._j * tileHeight;
        this.position.z = - this._k * tileDepth;

        if (prop) {
            if (isFinite(prop.w)) {
                this.w = prop.w
            }
            if (isFinite(prop.h)) {
                this.h = prop.h
            }
            if (isFinite(prop.d)) {
                this.d = prop.d
            }
            if (prop.mirrorX) {
                this.mirrorX = true;
            }
            if (prop.mirrorZ) {
                this.mirrorZ = true;
            }
        }

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
        this._k = Math.max(this._k, 0);
        this.position.z = - this._k * tileDepth;
    }

    public setIsVisible(isVisible: boolean): void {
        this.isVisible = isVisible;
        this.getChildren(undefined, false).forEach(m => {
            if (m instanceof BABYLON.Mesh && m.name != "machine-part-selector") {
                m.isVisible = isVisible;
            }
        })
    }

    private _partVisibilityMode: PartVisibilityMode = PartVisibilityMode.Default;
    public get partVisilibityMode(): PartVisibilityMode {
        return this._partVisibilityMode;
    }
    public set partVisibilityMode(v: PartVisibilityMode) {
        this._partVisibilityMode = v;
        if (this._partVisibilityMode === PartVisibilityMode.Default) {
            this.getChildren(undefined, false).forEach(m => {
                if (m instanceof BABYLON.Mesh && m.name != "machine-part-selector") {
                    m.visibility = 1;
                }
            })
        }
        if (this._partVisibilityMode === PartVisibilityMode.Ghost) {
            this.getChildren(undefined, false).forEach(m => {
                if (m instanceof BABYLON.Mesh && m.name != "machine-part-selector") {
                    m.visibility = 0.3;
                }
            })
        }
    }

    public select(): void {
        this.selectorMesh.visibility = 0.2;
    }

    public unselect(): void {
        this.selectorMesh.visibility = 0;
    }

    protected mirrorXTrackPointsInPlace(): void {
        for (let i = 0; i < this.tracks.length; i++) {
            this.tracks[i].mirrorXTrackPointsInPlace();
        }
    }

    protected mirrorZTrackPointsInPlace(): void {
        for (let i = 0; i < this.tracks.length; i++) {
            this.tracks[i].mirrorZTrackPointsInPlace();
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
        this.computeWorldMatrix(true);
        this.tracks.forEach(track => {
            track.recomputeAbsolutePath();
        })
        this.wires.forEach(wire => {
            wire.recomputeAbsolutePath();
        })
    }

    public async instantiate(): Promise<void> {
        if (this.sleepersMesh) {
            this.sleepersMesh.dispose();
        }
        this.sleepersMesh = new BABYLON.Mesh("sleepers-mesh");
        this.sleepersMesh.material = this.game.steelMaterial;
        this.sleepersMesh.parent = this;

        let datas: BABYLON.VertexData[] = [];
        for (let n = 0; n < this.tracks.length; n++) {
            let points = [...this.tracks[n].interpolatedPoints].map(p => { return p.clone()});
            Mummu.DecimatePathInPlace(points, 10 / 180 * Math.PI);
            let dirStart = points[1].subtract(points[0]).normalize();
            let dirEnd = points[points.length - 1].subtract(points[points.length - 2]).normalize();
            points[0].subtractInPlace(dirStart.scale(this.wireGauge * 0.5));
            points[points.length - 1].addInPlace(dirEnd.scale(this.wireGauge * 0.5));
            let tmp = BABYLON.ExtrudeShape("wire", { shape: selectorHullShape, path: this.tracks[n].interpolatedPoints, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
            let data = BABYLON.VertexData.ExtractFromMesh(tmp);
            datas.push(data);
            tmp.dispose();
        }

        if (this.selectorMesh) {
            this.selectorMesh.dispose();
        }
        this.selectorMesh = new MachinePartSelectorMesh(this);
        this.selectorMesh.material = this.game.blueMaterial;
        this.selectorMesh.parent = this;
        if (datas.length) {
            Mummu.MergeVertexDatas(...datas).applyToMesh(this.selectorMesh);
        }
        this.selectorMesh.visibility = 0;

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
            let direction: BABYLON.Vector3;
            if (pointData.dir) {
                direction = new BABYLON.Vector3(pointData.dir.x, pointData.dir.y, pointData.dir.z);
            }

            let trackPoint = new TrackPoint(
                this.tracks[0],
                new BABYLON.Vector3(pointData.position.x, pointData.position.y, pointData.position.z),
                direction,
                pointData.tangentIn,
                pointData.tangentOut
            );
            this.tracks[0].trackpoints[i] = trackPoint;
        }
    }
}