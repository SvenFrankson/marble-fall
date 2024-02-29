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

var radius = 0.014 * 1.5 / 2;
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

class MachinePart extends BABYLON.Mesh {

    public get partName(): string {
        return this.template ? this.template.partName : "machine-part-no-template";
    }

    public get game(): Game {
        return this.machine.game;
    }
    
    public tracks: Track[] = [];
    public wires: Wire[] = [];
    public allWires: Wire[] = [];

    public wireSize: number = 0.0015;
    public wireGauge: number = 0.014;

    public color: number = 0;
    public sleepersMeshes: Map<number, BABYLON.Mesh> = new Map<number, BABYLON.Mesh>();
    public selectorMesh: MachinePartSelectorMesh;
    public encloseMesh: BABYLON.Mesh;

    public summedLength: number[] = [0];
    public totalLength: number = 0
    public globalSlope: number = 0;
    public AABBMin: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    public AABBMax: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    public encloseStart: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    public enclose13: BABYLON.Vector3 = BABYLON.Vector3.One().scaleInPlace(1 / 3);
    public encloseMid: BABYLON.Vector3 = BABYLON.Vector3.One().scaleInPlace(0.5);
    public enclose23: BABYLON.Vector3 = BABYLON.Vector3.One().scaleInPlace(2 / 3);
    public encloseEnd: BABYLON.Vector3 = BABYLON.Vector3.One();

    public neighbours: Nabu.UniqueList<MachinePart> = new Nabu.UniqueList<MachinePart>();
    public addNeighbour(other: MachinePart): void {
        this.neighbours.push(other);
        other.neighbours.push(this);
    }
    public removeNeighbour(other: MachinePart): void {
        this.neighbours.remove(other);
        other.neighbours.remove(this);
    }
    public removeAllNeighbours(): void {
        while (this.neighbours.length > 0) {
            this.removeNeighbour(this.neighbours.get(0));
        }
    }

    public get w(): number {
        return this.template.w;
    }
    public get h(): number {
        return this.template.h;
    }
    public get d(): number {
        return this.template.d;
    }
    public get n(): number {
        return this.template.n;
    }
    public get mirrorX(): boolean {
        return this.template.mirrorX;
    }
    public get mirrorZ(): boolean {
        return this.template.mirrorZ;
    }

    public get xExtendable(): boolean {
        return this.template.xExtendable;
    }
    public get yExtendable(): boolean {
        return this.template.yExtendable;
    }
    public get zExtendable(): boolean {
        return this.template.zExtendable;
    }
    public get nExtendable(): boolean {
        return this.template.nExtendable;
    }
    public get minH(): number {
        return this.template.minH;
    }
    public get minD(): number {
        return this.template.minD;
    }
    public get maxD(): number {
        return this.template.maxD;
    }
    public get xMirrorable(): boolean {
        return this.template.xMirrorable;
    }
    public get zMirrorable(): boolean {
        return this.template.zMirrorable;
    }
    public get hasOriginDestinationHandles(): boolean {
        return this.template.hasOriginDestinationHandles;
    }

    private _template: MachinePartTemplate;
    public get template(): MachinePartTemplate {
        return this._template;
    }
    public setTemplate(template: MachinePartTemplate) {
        this._template = template;
    }

    constructor(public machine: Machine, prop: IMachinePartProp, public isPlaced: boolean = true) {
        super("track", machine.game.scene);
        
        this._i = prop.i;
        this._j = prop.j;
        this._k = prop.k;
        if (isFinite(prop.color)) {
            this.color = prop.color
        }
        
        this.position.x = this._i * tileWidth;
        this.position.y = - this._j * tileHeight;
        this.position.z = - this._k * tileDepth;

        this.tracks = [new Track(this)];
    }

    private _i: number = 0;
    public get i(): number {
        return this._i;
    }
    public setI(v: number) {
        if (this._i != v) {
            this._i = v;
            this.position.x = this._i * tileWidth;
            this.isPlaced = true;
            this.freezeWorldMatrix();
            this.getChildMeshes().forEach(m => {
                m.freezeWorldMatrix();
            })
            this.machine.requestUpdateShadow = true;
        }
    }

    private _j: number = 0;
    public get j(): number {
        return this._j;
    }
    public setJ(v: number) {
        if (this._j != v) {
            this._j = v;
            this.position.y = - this._j * tileHeight;
            this.isPlaced = true;
            this.freezeWorldMatrix();
            this.getChildMeshes().forEach(m => {
                m.freezeWorldMatrix();
            })
            this.machine.requestUpdateShadow = true;
        }
    }

    private _k: number = 0;
    public get k(): number {
        return this._k;
    }
    public setK(v: number) {
        if (this._k != v) {
            this._k = v;
            this.position.z = - this._k * tileDepth;
            this.isPlaced = true;
            this.freezeWorldMatrix();
            this.getChildMeshes().forEach(m => {
                m.freezeWorldMatrix();
            })
            this.machine.requestUpdateShadow = true;
        }
    }

    public setIsVisible(isVisible: boolean): void {
        this.isVisible = isVisible;
        this.getChildren(undefined, false).forEach(m => {
            if (m instanceof BABYLON.Mesh && m.name != "machine-part-selector" && m.name != "enclose-mesh") {
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
                if (m instanceof BABYLON.Mesh && m.name != "machine-part-selector" && m.name != "enclose-mesh") {
                    m.visibility = 1;
                }
            })
        }
        if (this._partVisibilityMode === PartVisibilityMode.Ghost) {
            this.getChildren(undefined, false).forEach(m => {
                if (m instanceof BABYLON.Mesh && m.name != "machine-part-selector" && m.name != "enclose-mesh") {
                    m.visibility = 0.3;
                }
            })
        }
    }

    public select(): void {
        this.selectorMesh.visibility = 0.2;
        this.encloseMesh.visibility = 1;
    }

    public unselect(): void {
        this.selectorMesh.visibility = 0;
        this.encloseMesh.visibility = 0;
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

    public getBarycenter(): BABYLON.Vector3 {
        if (this.tracks[0].template.trackpoints.length < 2) {
            return this.position.clone();
        }
        let barycenter = this.tracks[0].template.trackpoints.map(
            trackpoint => {
                return trackpoint.position;
            }
        ).reduce(
            (pos1, pos2) => {
                return pos1.add(pos2);
            }
        ).scaleInPlace(1 / this.tracks[0].template.trackpoints.length);
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

    public async instantiate(rebuildNeighboursWireMeshes?: boolean): Promise<void> {
        let datas: BABYLON.VertexData[] = [];
        for (let n = 0; n < this.tracks.length; n++) {
            let points = [...this.tracks[n].templateInterpolatedPoints].map(p => { return p.clone()});
            Mummu.DecimatePathInPlace(points, 10 / 180 * Math.PI);
            let dirStart = points[1].subtract(points[0]).normalize();
            let dirEnd = points[points.length - 1].subtract(points[points.length - 2]).normalize();
            points[0].subtractInPlace(dirStart.scale(this.wireGauge * 0.5));
            points[points.length - 1].addInPlace(dirEnd.scale(this.wireGauge * 0.5));
            let tmp = BABYLON.ExtrudeShape("wire", { shape: selectorHullShape, path: this.tracks[n].templateInterpolatedPoints, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
            let data = BABYLON.VertexData.ExtractFromMesh(tmp);
            datas.push(data);
            tmp.dispose();
        }

        if (this.selectorMesh) {
            this.selectorMesh.dispose();
        }
        this.selectorMesh = new MachinePartSelectorMesh(this);
        this.selectorMesh.material = this.game.cyanMaterial;
        this.selectorMesh.parent = this;
        if (datas.length) {
            Mummu.MergeVertexDatas(...datas).applyToMesh(this.selectorMesh);
        }
        this.selectorMesh.visibility = 0;

        if (this.encloseMesh) {
            this.encloseMesh.dispose();
        }
        let w = this.w * tileWidth;
        let h = (this.h + 1) * tileHeight;
        let d = this.d * tileDepth;
        let x0 = - tileWidth * 0.5;
        let y0 = tileHeight * 0.5;
        let z0 = tileDepth * 0.5;
        let x1 = x0 + w;
        let y1 = y0 - h;
        let z1 = z0 - d;
        this.encloseStart.copyFromFloats(x0, y0, z0);
        this.encloseEnd.copyFromFloats(x1, y1, z1);
        this.enclose13.copyFrom(this.encloseStart).scaleInPlace(2 / 3).addInPlace(this.encloseEnd.scale(1 / 3));
        this.encloseMid.copyFrom(this.encloseStart).addInPlace(this.encloseEnd).scaleInPlace(0.5);
        this.enclose23.copyFrom(this.encloseStart).scaleInPlace(1 / 3).addInPlace(this.encloseEnd.scale(2 / 3));
        this.encloseMesh = BABYLON.MeshBuilder.CreateLineSystem("enclose-mesh", {
            lines: [
                [new BABYLON.Vector3(x0, y0, z0), new BABYLON.Vector3(x1, y0, z0), new BABYLON.Vector3(x1, y1, z0), new BABYLON.Vector3(x0, y1, z0), new BABYLON.Vector3(x0, y0, z0)],
                [new BABYLON.Vector3(x0, y0, z0), new BABYLON.Vector3(x0, y0, z1)],
                [new BABYLON.Vector3(x1, y0, z0), new BABYLON.Vector3(x1, y0, z1)],
                [new BABYLON.Vector3(x1, y1, z0), new BABYLON.Vector3(x1, y1, z1)],
                [new BABYLON.Vector3(x0, y1, z0), new BABYLON.Vector3(x0, y1, z1)],
                [new BABYLON.Vector3(x0, y0, z1), new BABYLON.Vector3(x1, y0, z1), new BABYLON.Vector3(x1, y1, z1), new BABYLON.Vector3(x0, y1, z1), new BABYLON.Vector3(x0, y0, z1)]
            ]
        }, this.getScene());
        this.encloseMesh.parent = this;
        this.encloseMesh.visibility = 0;

        this.rebuildWireMeshes(rebuildNeighboursWireMeshes);

        this.AABBMin.copyFromFloats(this.encloseStart.x, this.encloseEnd.y, this.encloseEnd.z);
        this.AABBMax.copyFromFloats(this.encloseEnd.x, this.encloseStart.y, this.encloseStart.z);
        this.AABBMin.addInPlace(this.position);
        this.AABBMax.addInPlace(this.position);

        this.freezeWorldMatrix();
        this.machine.requestUpdateShadow = true;
    }
    
    public dispose(): void {
        super.dispose();
        this.removeAllNeighbours();
        let index = this.machine.parts.indexOf(this);
        if (index > - 1) {
            this.machine.parts.splice(index, 1);
        }
    }

    public generateWires(): void {
        this.allWires = [...this.wires];
        if (this.template) {
            for (let i = 0; i < this.template.trackTemplates.length; i++) {
                let track = this.tracks[i];
                if (!track) {
                    track = new Track(this);
                    this.tracks[i] = track;
                }
                track.initialize(this.template.trackTemplates[i]);
                this.allWires.push(track.wires[0], track.wires[1]);
            }
        }
        else {
            console.error("Can't generate wires, no template provided for " + this.partName);
            console.log(this);
        }
    }

    public update(dt: number): void {}

    public rebuildWireMeshes(rebuildNeighboursWireMeshes?: boolean): void {
        let neighboursToUpdate: MachinePart[];
        if (rebuildNeighboursWireMeshes) {
            neighboursToUpdate = this.neighbours.cloneAsArray();
            for (let i = 0; i < neighboursToUpdate.length; i++) {
                neighboursToUpdate[i].rebuildWireMeshes();
            }
        }

        this.allWires.forEach(wire => {
            wire.show();
        })
        
        this.removeAllNeighbours();
        this.tracks.forEach(track => {
            track.recomputeWiresPath();
            track.recomputeAbsolutePath();
            track.wires.forEach(wire => {
                wire.instantiate(this.color + track.template.colorOffset);
            })
        })
        this.wires.forEach(wire => {
            wire.instantiate(this.color);
        })
        
        requestAnimationFrame(() => {
            let datas = SleeperMeshBuilder.GenerateSleepersVertexData(this, { drawGroundAnchors: true, groundAnchorsRelativeMaxY: 0.6 });
            datas.forEach((vData, colorIndex) => {
                if (!this.sleepersMeshes.get(colorIndex)) {
                    let sleeperMesh = new BABYLON.Mesh("sleeper-mesh-" + colorIndex);
                    sleeperMesh.material = this.game.metalMaterials[colorIndex % this.game.metalMaterialsCount];
                    sleeperMesh.parent = this;
                    vData.applyToMesh(sleeperMesh);
                    this.sleepersMeshes.set(colorIndex, sleeperMesh);
                    sleeperMesh.freezeWorldMatrix();
                }
            });
            this.machine.requestUpdateShadow = true;
            if (this.game.DEBUG_MODE) {
                console.log(this.partName + " tricount " + this.getTriCount());
            }
        })

        if (rebuildNeighboursWireMeshes) {
            neighboursToUpdate = this.neighbours.cloneAsArray();
            for (let i = 0; i < neighboursToUpdate.length; i++) {
                neighboursToUpdate[i].rebuildWireMeshes();
            }
        }
        this.freezeWorldMatrix();
        this.machine.requestUpdateShadow = true;
    }

    public getTriCount(): number {
        let triCount = this.getIndices().length / 3;
        let children = this.getChildMeshes();
        children.forEach(child => {
            triCount += child.getIndices().length / 3;
        })
        return triCount;
    }
}