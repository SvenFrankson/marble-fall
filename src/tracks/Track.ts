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

class TrackPointHandle extends BABYLON.Mesh {

    private _normal: BABYLON.Vector3 = BABYLON.Vector3.Up();
    public get normal(): BABYLON.Vector3 {
        return this._normal;
    }
    public setNormal(n: BABYLON.Vector3): void {
        this._normal.copyFrom(n);
        Mummu.QuaternionFromYZAxisToRef(this._normal, this.trackPoint.dir, this.rotationQuaternion);
    }

    constructor(public trackPoint: TrackPoint) {
        super("trackpoint-handle");
        let data = BABYLON.CreateSphereVertexData({ diameter: 0.6 * this.trackPoint.track.wireGauge });
        data.applyToMesh(this);
        this.material = this.trackPoint.track.game.handleMaterial;
        this.position.copyFrom(this.trackPoint.position);
        this.rotationQuaternion = BABYLON.Quaternion.Identity();
        console.log(trackPoint.normal);
        this.setNormal(trackPoint.normal);
        this.parent = trackPoint.track;
    }
}

class Track extends BABYLON.Mesh {

    public subdivisions: number = 3;
    public trackPoints: TrackPoint[];
    public wires: Wire[];

    public wireSize: number = 0.002;
    public wireGauge: number = 0.012;

    constructor(public game: Game, public i: number, public j: number) {
        super("track", game.scene);
        this.position.x = i * 2 * xDist;
        this.position.y = - i * 2 * yDist;

        this.wires = [
            new Wire(this),
            new Wire(this)
        ];
    }
    
    public editionMode: boolean = false;
    public trackPointhandles: TrackPointHandle[] = [];
    public insertTrackPointHandle: BABYLON.AbstractMesh[] = [];

    public hoveredTrackPointHandle: TrackPointHandle;
    public get hoveredTrackPoint(): TrackPoint {
        if (this.hoveredTrackPointHandle) {
            return this.hoveredTrackPointHandle.trackPoint;
        }
        return undefined;
    }
    public setHoveredTrackPointHandle(trackpointHandle: TrackPointHandle): void {
        if (this.hoveredTrackPointHandle) {
            if (this.hoveredTrackPointHandle === this.selectedTrackPointHandle) {
                this.hoveredTrackPointHandle.material = this.game.handleMaterialActive;
            }
            else {
                this.hoveredTrackPointHandle.material = this.game.handleMaterial;
            }
        }
        this.hoveredTrackPointHandle = trackpointHandle;
        if (this.hoveredTrackPointHandle) {
            this.hoveredTrackPointHandle.material = this.game.handleMaterialHover;
        }
    }

    public selectedTrackPointHandle: TrackPointHandle;
    public get selectedTrackPoint(): TrackPoint {
        if (this.selectedTrackPointHandle) {
            return this.selectedTrackPointHandle.trackPoint;
        }
        return undefined;
    }
    public setSelectedTrackPointHandle(trackpointHandle: TrackPointHandle): void {
        if (this.selectedTrackPointHandle) {
            this.selectedTrackPointHandle.material = this.game.handleMaterial;
        }
        this.selectedTrackPointHandle = trackpointHandle;
        if (this.selectedTrackPointHandle) {
            if (this.selectedTrackPointHandle === this.hoveredTrackPointHandle) {
                this.selectedTrackPointHandle.material = this.game.handleMaterialHover;
            }
            else {
                this.selectedTrackPointHandle.material = this.game.handleMaterialActive;
            }
        }
    }
    public tangentPrevHandle: BABYLON.Mesh;
    public normalHandle: BABYLON.Mesh;
    public tangentNextHandle: BABYLON.Mesh;

    public enableEditionMode(): void {
        this.disableEditionMode();

        this.editionMode = true;
        this.rebuildHandles();
        this.getScene().onPointerObservable.add(this.onPointerEvent);
    }

    public disableEditionMode(): void {
        this.editionMode = false;
        this.getScene().onPointerObservable.removeCallback(this.onPointerEvent);
    }

    public rebuildHandles(): void {
        if (!this.editionMode) {
            return;
        }

        if (this.trackPointhandles) {
            this.trackPointhandles.forEach(h => {
                h.dispose();
            });
        }
        this.trackPointhandles = [];

        if (this.insertTrackPointHandle) {
            this.insertTrackPointHandle.forEach(h => {
                h.dispose();
            });
        }
        this.insertTrackPointHandle = [];

        if (this.normalHandle) {
            this.normalHandle.dispose();
        }

        for (let i = 0; i < this.trackPoints.length; i++) {
            let handle = new TrackPointHandle(this.trackPoints[i]);
            this.trackPointhandles.push(handle);

            let pPrev = this.trackPoints[i - 1] ? this.trackPoints[i - 1].position : undefined;
            let p = this.trackPoints[i].position;
            let pNext = this.trackPoints[i + 1] ? this.trackPoints[i + 1].position : undefined;

            if (!pPrev) {
                pPrev = p.subtract(pNext.subtract(p));
            }
            if (!pNext) {
                pNext = p.add(p.subtract(pPrev));
            }

            Mummu.QuaternionFromYZAxisToRef(this.trackPoints[i].normal, pNext.subtract(pPrev), handle.rotationQuaternion);

            if (i < this.trackPoints.length - 1) {
                let insertHandle = BABYLON.MeshBuilder.CreateSphere("insert-handle-" + i, { diameter: 0.5 * this.wireGauge });
                insertHandle.material = this.game.insertHandleMaterial;
                insertHandle.position.copyFrom(this.trackPoints[i].position).addInPlace(this.trackPoints[i + 1].position).scaleInPlace(0.5);
                insertHandle.parent = this;
                this.insertTrackPointHandle.push(insertHandle);
            }
        }

        this.normalHandle = BABYLON.MeshBuilder.CreateCylinder("normal-handle", { height: 0.03, diameter: 0.001, tessellation: 8 });
        this.normalHandle.rotationQuaternion = BABYLON.Quaternion.Identity();
        this.normalHandle.material = this.game.handleMaterialActive;
        this.normalHandle.isVisible = false;
    }

    public updateHandles(): void {
        for (let i = 0; i < this.trackPointhandles.length; i++) {
            this.trackPointhandles[i].position.copyFrom(this.trackPointhandles[i].trackPoint.position);

            Mummu.QuaternionFromYZAxisToRef(this.trackPointhandles[i].trackPoint.normal, this.trackPointhandles[i].trackPoint.dir, this.trackPointhandles[i].rotationQuaternion);
        }
        if (this.selectedTrackPointHandle) {
            this.normalHandle.isVisible = true;
            this.normalHandle.parent = this.selectedTrackPointHandle;
            this.normalHandle.position.copyFromFloats(0, 0.015 + 0.5 * this.wireGauge / 2, 0);
            if (this.selectedTrackPointHandle.trackPoint.fixedNormal) {
                this.normalHandle.material = this.game.handleMaterialActive;
            }
            else {
                this.normalHandle.material = this.game.handleMaterial;
            }
        }
        else {
            this.normalHandle.isVisible = false;
        }
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
            Mummu.AltCatmullRomPathInPlace(interpolatedPoints, this.trackPoints[0].dir.scale(2), this.trackPoints[this.trackPoints.length - 1].dir.scale(2));
            Mummu.AltCatmullRomPathInPlace(interpolatedNormals);
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
        this.pointerPlane = BABYLON.MeshBuilder.CreateGround("pointer-plane", { width: 10, height: 10 });
        this.pointerPlane.visibility = 0;
        this.pointerPlane.rotationQuaternion = BABYLON.Quaternion.Identity();

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

    public pointerPlane: BABYLON.Mesh;
    public offset: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    public pointerDown: boolean = false;
    public dragNormal: boolean = false;
    public lastPickedPoint: BABYLON.Vector3;

    public onPointerEvent = (eventData: BABYLON.PointerInfo, eventState: BABYLON.EventState) => {
        if (eventData.type === BABYLON.PointerEventTypes.POINTERDOWN) {
            this.pointerDown = true;
            let pick = this.getScene().pick(
                this.getScene().pointerX,
                this.getScene().pointerY,
                (mesh) => {
                    if (mesh === this.normalHandle) {
                        return true;
                    }
                    else if (mesh instanceof TrackPointHandle && this.trackPointhandles.indexOf(mesh) != - 1) {
                        return true;
                    }
                    return false;
                }
            )

            if (pick.hit && this.selectedTrackPointHandle && pick.pickedMesh === this.selectedTrackPointHandle) {
                this.dragNormal = false;
                this.offset.copyFrom(this.selectedTrackPointHandle.position).subtractInPlace(pick.pickedPoint);

                let d = this.getScene().activeCamera.globalPosition.subtract(this.selectedTrackPointHandle.position);
                Mummu.QuaternionFromYZAxisToRef(d, pick.getNormal(), this.pointerPlane.rotationQuaternion);

                this.pointerPlane.position.copyFrom(pick.pickedPoint);
                this.getScene().activeCamera.detachControl();
            }
            else if (pick.hit && this.selectedTrackPointHandle && pick.pickedMesh === this.normalHandle) {
                this.dragNormal = true;
                this.lastPickedPoint = undefined;
                this.selectedTrackPointHandle.setNormal(this.selectedTrackPoint.normal);
                Mummu.QuaternionFromZYAxisToRef(this.selectedTrackPointHandle.trackPoint.normal, this.selectedTrackPointHandle.trackPoint.dir, this.pointerPlane.rotationQuaternion);
                this.pointerPlane.position.copyFrom(this.selectedTrackPointHandle.absolutePosition);
                this.getScene().activeCamera.detachControl();
            }
            else {
                this.dragNormal = false;
                this.setSelectedTrackPointHandle(undefined);
            }
        }
        else if (eventData.type === BABYLON.PointerEventTypes.POINTERMOVE) {
            if (this.pointerDown) {
                let pick = this.getScene().pick(
                    this.getScene().pointerX,
                    this.getScene().pointerY,
                    (mesh) => {
                        return mesh === this.pointerPlane;
                    }
                )

                if (this.selectedTrackPointHandle) {
                    if (pick.hit) {
                        if (this.dragNormal) {
                            if (this.lastPickedPoint) {
                                let prevNormal = this.lastPickedPoint.subtract(this.selectedTrackPointHandle.absolutePosition);
                                let currNormal = pick.pickedPoint.subtract(this.selectedTrackPointHandle.absolutePosition);
                                let a = Mummu.AngleFromToAround(prevNormal, currNormal, this.selectedTrackPoint.dir);
                                let n = Mummu.Rotate(this.selectedTrackPointHandle.normal, this.selectedTrackPoint.dir, a);
                                this.selectedTrackPointHandle.setNormal(n);
                            }
                            this.lastPickedPoint = pick.pickedPoint.clone();
                        }
                        else {
                            this.selectedTrackPointHandle.position.copyFrom(pick.pickedPoint).addInPlace(this.offset);
                        }
                    }
                }
            }
            else {
                let pick = this.getScene().pick(
                    this.getScene().pointerX,
                    this.getScene().pointerY,
                    (mesh) => {
                        if (mesh instanceof TrackPointHandle) {
                            return true;
                        }
                        return false;
                    }
                )
    
                if (pick.hit && pick.pickedMesh instanceof TrackPointHandle) {
                    this.setHoveredTrackPointHandle(pick.pickedMesh);
                }
                else {
                    this.setHoveredTrackPointHandle(undefined);
                }
            }
        }
        else if (eventData.type === BABYLON.PointerEventTypes.POINTERUP) {
            this.pointerDown = false;
            if (this.selectedTrackPoint) {
                this.selectedTrackPoint.position.copyFrom(this.selectedTrackPointHandle.position);
                if (this.dragNormal) {
                    this.selectedTrackPoint.normal.copyFrom(this.selectedTrackPointHandle.normal);
                    this.selectedTrackPoint.fixedNormal = true;
                    this.dragNormal = false;
                }
                this.generateWires();
                this.recomputeAbsolutePath();
                this.wires[0].instantiate();
                this.wires[1].instantiate();
                this.updateHandles();
            }
            else {
                let pick = this.getScene().pick(
                    this.getScene().pointerX,
                    this.getScene().pointerY,
                    (mesh) => {
                        if (mesh instanceof TrackPointHandle) {
                            if (this.trackPointhandles.indexOf(mesh) != -1) {
                                return true;
                            }
                        }
                        else if (mesh instanceof BABYLON.Mesh) {
                            if (this.insertTrackPointHandle.indexOf(mesh) != -1) {
                                return true;
                            }
                        }
                        return false;
                    }
                )
    
                if (this.insertTrackPointHandle.indexOf(pick.pickedMesh) != - 1) {
                    this.setSelectedTrackPointHandle(undefined);
                    let insertTrackPoint = pick.pickedMesh as BABYLON.Mesh;
                    let trackPoint = new TrackPoint(this, insertTrackPoint.position.clone());
                    let index = this.insertTrackPointHandle.indexOf(insertTrackPoint) + 1;
                    this.trackPoints.splice(index, 0, trackPoint);
                    this.generateWires();
                    this.recomputeAbsolutePath();
                    this.wires[0].instantiate();
                    this.wires[1].instantiate();
                    this.rebuildHandles();
                }
                else if (pick.pickedMesh instanceof TrackPointHandle && this.trackPointhandles.indexOf(pick.pickedMesh) != - 1) {
                    this.setSelectedTrackPointHandle(pick.pickedMesh);
                    this.offset.copyFrom(this.selectedTrackPointHandle.position).subtractInPlace(pick.pickedPoint);
    
                    let d = this.getScene().activeCamera.globalPosition.subtract(this.selectedTrackPointHandle.position);
                    Mummu.QuaternionFromYZAxisToRef(d, pick.getNormal(), this.pointerPlane.rotationQuaternion);
    
                    this.pointerPlane.position.copyFrom(pick.pickedPoint);
                    this.getScene().activeCamera.detachControl();
                    
                    this.updateHandles();
                }
                else {
                    this.setSelectedTrackPointHandle(undefined);
                    this.updateHandles();
                }
            }
            this.getScene().activeCamera.attachControl();
        }
    }

    public serialize(): ITrackData {
        let data: ITrackData = { points: []};

        for (let i = 0; i < this.trackPoints.length; i++) {
            data.points.push({
                position: { x: this.trackPoints[i].position.x, y: this.trackPoints[i].position.y, z: this.trackPoints[i].position.z }
            });
        }
        data.points[0].normal = { x: this.trackPoints[0].normal.x, y: this.trackPoints[0].normal.y, z: this.trackPoints[0].normal.z }
        data.points[0].dir = { x: this.trackPoints[0].dir.x, y: this.trackPoints[0].dir.y, z: this.trackPoints[0].dir.z }

        let i = this.trackPoints.length - 1;
        data.points[i].normal = { x: this.trackPoints[i].normal.x, y: this.trackPoints[i].normal.y, z: this.trackPoints[i].normal.z }
        data.points[i].dir = { x: this.trackPoints[i].dir.x, y: this.trackPoints[i].dir.y, z: this.trackPoints[i].dir.z }

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