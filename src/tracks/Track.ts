var baseRadius = 0.075;
var xDist = 0.75 * baseRadius;
var yDist = Math.sqrt(3) / 2 * 0.5 * baseRadius;

class TrackPoint {

    constructor(public point: BABYLON.Vector3, public up: BABYLON.Vector3 = BABYLON.Vector3.Up()) {

    }
}

class Track extends BABYLON.Mesh {

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
    
    public trackPointhandles: BABYLON.Mesh[] = [];
    public insertTrackPointHandle: BABYLON.Mesh[] = [];

    public showHandles(): void {
        if (this.trackPointhandles) {
            this.trackPointhandles.forEach(h => {
                h.dispose();
            })
        }
        this.trackPointhandles = [];
        if (this.insertTrackPointHandle) {
            this.insertTrackPointHandle.forEach(h => {
                h.dispose();
            })
        }
        this.insertTrackPointHandle = [];
        for (let i = 0; i < this.trackPoints.length; i++) {
            let handle = BABYLON.MeshBuilder.CreateBox("handle-" + i, { size: 1.2 * this.wireGauge });
            handle.material = this.game.handleMaterial;
            handle.position.copyFrom(this.trackPoints[i].point);
            handle.rotationQuaternion = BABYLON.Quaternion.Identity();
            handle.parent = this;
            this.trackPointhandles.push(handle);

            let handleUp = BABYLON.MeshBuilder.CreateBox("handle-up-" + i, { width: 0.001, depth: 0.001, height: 0.05 });
            handleUp.material = this.game.handleMaterial;
            handleUp.parent = handle;
            handleUp.position.y = 0.6 * this.wireGauge + 0.025;

            let pPrev = this.trackPoints[i - 1] ? this.trackPoints[i - 1].point : undefined;
            let p = this.trackPoints[i].point;
            let pNext = this.trackPoints[i + 1] ? this.trackPoints[i + 1].point : undefined;

            if (!pPrev) {
                pPrev = p.subtract(pNext.subtract(p));
            }
            if (!pNext) {
                pNext = p.add(p.subtract(pPrev));
            }

            Mummu.QuaternionFromYZAxisToRef(this.trackPoints[i].up, pNext.subtract(pPrev), handle.rotationQuaternion);

            if (i < this.trackPoints.length - 1) {
                let insertHandle = BABYLON.MeshBuilder.CreateSphere("insert-handle-" + i, { diameter: 0.5 * this.wireGauge });
                insertHandle.material = this.game.insertHandleMaterial;
                insertHandle.position.copyFrom(this.trackPoints[i].point).addInPlace(this.trackPoints[i + 1].point).scaleInPlace(0.5);
                insertHandle.parent = this;
                this.insertTrackPointHandle.push(insertHandle);
            }
        }
        this.getScene().onPointerObservable.add(this.onPointerEvent);
    }

    public generateWires(): void {
        this.wires[0].path = [];
        this.wires[1].path = [];

        let interpolatedPoints = this.trackPoints.map(trackpoint => { return trackpoint.point; });
        let interpolatedNormals = this.trackPoints.map(trackpoint => { return trackpoint.up; });

        for (let n = 0; n < 3; n++) {
            Mummu.CatmullRomPathInPlace(interpolatedPoints);
            Mummu.CatmullRomPathInPlace(interpolatedNormals);
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
    public selectedHandle: BABYLON.Mesh;
    public offset: BABYLON.Vector3 = BABYLON.Vector3.Zero();

    public onPointerEvent = (eventData: BABYLON.PointerInfo, eventState: BABYLON.EventState) => {
        if (eventData.type === BABYLON.PointerEventTypes.POINTERDOWN) {
            let pick = this.getScene().pick(
                this.getScene().pointerX,
                this.getScene().pointerY,
                (mesh) => {
                    return mesh instanceof BABYLON.Mesh && this.trackPointhandles.indexOf(mesh) != - 1;
                }
            )

            this.selectedHandle = pick.pickedMesh as BABYLON.Mesh;

            if (this.selectedHandle) {
                this.offset.copyFrom(this.selectedHandle.position).subtractInPlace(pick.pickedPoint);
                this.selectedHandle.material = this.game.handleMaterialActive;

                let d = this.getScene().activeCamera.globalPosition.subtract(this.selectedHandle.position);
                Mummu.QuaternionFromYZAxisToRef(d, pick.getNormal(), this.pointerPlane.rotationQuaternion);

                this.pointerPlane.position.copyFrom(pick.pickedPoint);
                this.getScene().activeCamera.detachControl();
            }
        }
        else if (eventData.type === BABYLON.PointerEventTypes.POINTERMOVE) {
            if (this.selectedHandle) {
                let pick = this.getScene().pick(
                    this.getScene().pointerX,
                    this.getScene().pointerY,
                    (mesh) => {
                        return mesh === this.pointerPlane;
                    }
                )
        
                if (pick && pick.hit) {
                    this.selectedHandle.position.copyFrom(pick.pickedPoint).addInPlace(this.offset);
                }
            }
        }
        else if (eventData.type === BABYLON.PointerEventTypes.POINTERUP) {
            if (this.selectedHandle) {
                let trackPoint = this.trackPoints[this.trackPointhandles.indexOf(this.selectedHandle)];
                if (trackPoint) {
                    trackPoint.point.copyFrom(this.selectedHandle.position);
                    this.remesh();
                    this.generateWires();
                    this.autoTrackNormals();
                    this.recomputeAbsolutePath();
                    this.wires[0].instantiate();
                    this.wires[1].instantiate();
                    this.showHandles();
                }
                this.selectedHandle.material = this.game.handleMaterial;
            }
            else {
                let pick = this.getScene().pick(
                    this.getScene().pointerX,
                    this.getScene().pointerY,
                    (mesh) => {
                        return mesh instanceof BABYLON.Mesh && this.insertTrackPointHandle.indexOf(mesh) != - 1;
                    }
                )
    
                let insertTrackPoint = pick.pickedMesh as BABYLON.Mesh;
                if (insertTrackPoint) {
                    let trackPoint = new TrackPoint(insertTrackPoint.position.clone());
                    let index = this.insertTrackPointHandle.indexOf(insertTrackPoint) + 1;
                    this.trackPoints.splice(index, 0, trackPoint);
                    this.remesh();
                    this.generateWires();
                    this.autoTrackNormals();
                    this.recomputeAbsolutePath();
                    this.wires[0].instantiate();
                    this.wires[1].instantiate();
                    this.showHandles();
                }
            }
            this.selectedHandle = undefined;
            this.getScene().activeCamera.attachControl();
        }
    }

    public autoTrackNormals(): void {
        for (let i = 1; i < this.trackPoints.length - 1; i++) {
            let pPrev = this.trackPoints[i - 1] ? this.trackPoints[i - 1].point : undefined;
            let p = this.trackPoints[i].point;
            let pNext = this.trackPoints[i + 1] ? this.trackPoints[i + 1].point : undefined;

            if (!pPrev) {
                pPrev = p.subtract(pNext.subtract(p));
            }
            if (!pNext) {
                pNext = p.add(p.subtract(pPrev));
            }

            let dirPrev = p.subtract(pPrev).normalize();
            let dirNext = pNext.subtract(p).normalize();
            let dir = dirPrev.add(dirNext).normalize();
            let nPrev = this.trackPoints[i - 1].up;
            
            let right = BABYLON.Vector3.Cross(nPrev, dir).normalize();
            right.y = 0;
            right.normalize();
            let up = BABYLON.Vector3.Cross(dir, right).normalize();
            this.trackPoints[i].up = up;

            /*
            this.trackPoints[i].up = nPrev.clone();
            let q = BABYLON.Quaternion.Identity();
            BABYLON.Quaternion.FromUnitVectorsToRef(dirNext, dirPrev, q);
            this.trackPoints[i - 1].up.rotateByQuaternionToRef(q, this.trackPoints[i].up);
            */

            /*
            let axis = BABYLON.Vector3.Cross(dirNext, dirPrev.scale(-1));
            axis.y = 0;
            if (axis.length() > 0.01) {
                axis.normalize();
                let angle = Mummu.AngleFromToAround(dirPrev, dirNext, axis);
                this.trackPoints[i].up = Mummu.Rotate(this.trackPoints[i].up, axis, angle);
            }
            */
        }

        for (let i = 1; i < this.trackPoints.length - 1; i++) {
            let pPrev = this.trackPoints[i - 1] ? this.trackPoints[i - 1].point : undefined;
            let p = this.trackPoints[i].point;
            let pNext = this.trackPoints[i + 1] ? this.trackPoints[i + 1].point : undefined;

            if (!pPrev) {
                pPrev = p.subtract(pNext.subtract(p));
            }
            if (!pNext) {
                pNext = p.add(p.subtract(pPrev));
            }

            let dirPrev = p.subtract(pPrev).normalize();
            let dirNext = pNext.subtract(p).normalize();

            let angleAroundY = Mummu.AngleFromToAround(dirPrev, dirNext, this.trackPoints[i].up);
            let dir = dirPrev.add(dirNext).normalize();
            
            let up = Mummu.Rotate(this.trackPoints[i].up, dir, - angleAroundY);
            this.trackPoints[i].up = up;
        }
    }

    public remesh(): void {
        let smoothedPath = this.trackPoints.map(trackpoint => { return trackpoint.point; });
        Mummu.CatmullRomPathInPlace(smoothedPath);
        Mummu.CatmullRomPathInPlace(smoothedPath);
        Mummu.CatmullRomPathInPlace(smoothedPath);
        Mummu.CatmullRomPathInPlace(smoothedPath);

        let cumulDist = [0];
        for (let i = 1; i < smoothedPath.length; i++) {
            let dist = BABYLON.Vector3.Distance(smoothedPath[i - 1], smoothedPath[i]);
            cumulDist[i] = cumulDist[i - 1] + dist;
        }

        let totalLength = cumulDist[cumulDist.length - 1];
        let step = totalLength / (this.trackPoints.length - 1);

        for (let i = 1; i < this.trackPoints.length - 1; i++) {
            let targetCumulDist = step * i;
            let bestDelta = Infinity;
            let bestIndex = -1;
            for (let j = 0; j < cumulDist.length; j++) {
                let delta = Math.abs(targetCumulDist - cumulDist[j]);
                if (delta < bestDelta) {
                    bestDelta = delta;
                    bestIndex = j;
                }
            }
            this.trackPoints[i].point.copyFrom(smoothedPath[bestIndex]);
        }
    }
}