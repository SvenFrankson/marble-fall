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
        this.position.copyFrom(this.trackPoint.position);
        this.rotationQuaternion = BABYLON.Quaternion.Identity();
        this.setNormal(trackPoint.normal);
        this.parent = trackPoint.track;

        let normalIndicator = BABYLON.MeshBuilder.CreateCylinder("normal", { height: this.trackPoint.track.wireGauge, diameter: 0.0005, tessellation: 8 });
        normalIndicator.parent = this;
        normalIndicator.position.copyFromFloats(0, 0.6 * this.trackPoint.track.wireGauge * 0.5 + this.trackPoint.track.wireGauge * 0.5, 0);

        this.setMaterial(this.trackPoint.track.game.handleMaterial);
    }

    public setMaterial(material: BABYLON.Material) {
        this.material = material;
        this.getChildMeshes().forEach(m => {
            m.material = material;
        })
    }
}

class TrackEditor {

    private _track: Track;
    public get track(): Track {
        return this._track;
    }
    public setTrack(t: Track): void {
        if (t != this.track) {
            if (this._track) {
                
            }
            this._track = t;
            if (this._track) {
                
            }
            this.rebuildHandles();
        }
    }

    public activeTrackpointPositionInput: Nabu.InputVector3;

    private _animateCamera = Mummu.AnimationFactory.EmptyNumbersCallback;

    constructor(public game: Game) {
        this.setTrack(this.game.tracks[0]);
        this._animateCamera = Mummu.AnimationFactory.CreateNumbers(this.game.camera, this.game.camera, ["alpha", "beta", "radius"], undefined, [true, true, false]);
    }

    public initialize(): void {
        this.pointerPlane = BABYLON.MeshBuilder.CreateGround("pointer-plane", { width: 10, height: 10 });
        this.pointerPlane.visibility = 0;
        this.pointerPlane.rotationQuaternion = BABYLON.Quaternion.Identity();

        document.getElementById("prev-track").addEventListener("click", () => {
            let trackIndex = this.game.tracks.indexOf(this._track);
            if (trackIndex > 0) {
                this.setTrack(this.game.tracks[trackIndex - 1]);
            }
        });
        document.getElementById("next-track").addEventListener("click", () => {
            let trackIndex = this.game.tracks.indexOf(this._track);
            if (trackIndex < this.game.tracks.length - 1) {
                this.setTrack(this.game.tracks[trackIndex + 1]);
            }
        });

        document.getElementById("save").addEventListener("click", () => {
            if (this.track) {
                let data = this.track.serialize();
                window.localStorage.setItem("saved-track", JSON.stringify(data));
            }
        });

        document.getElementById("btn-cam-top").addEventListener("click", () => {
            this.setCameraAlphaBeta(- Math.PI * 0.5, 0);
        });

        document.getElementById("btn-cam-left").addEventListener("click", () => {
            this.setCameraAlphaBeta(Math.PI, Math.PI * 0.5);
        });

        document.getElementById("btn-cam-face").addEventListener("click", () => {
            this.setCameraAlphaBeta(- Math.PI * 0.5, Math.PI * 0.5);
        });

        document.getElementById("btn-cam-right").addEventListener("click", () => {
            this.setCameraAlphaBeta(0, Math.PI * 0.5);
        });

        document.getElementById("btn-cam-bottom").addEventListener("click", () => {
            this.setCameraAlphaBeta(- Math.PI * 0.5, Math.PI);
        });

        document.getElementById("btn-center-track").addEventListener("click", () => {
            if (this.track) {
                this.game.camera.target.copyFrom(this.track.getBarycenter());
            }
        });

        document.getElementById("prev-trackpoint").addEventListener("click", () => {
            if (this.track) {
                let newTrackIndex = (this.selectedTrackPointIndex - 1 + this.track.trackPoints.length) % this.track.trackPoints.length;
                this.setSelectedTrackPointIndex(newTrackIndex);
            }
        });
        document.getElementById("next-trackpoint").addEventListener("click", () => {
            if (this.track) {
                let newTrackIndex = (this.selectedTrackPointIndex + 1) % this.track.trackPoints.length;
                this.setSelectedTrackPointIndex(newTrackIndex);
            }
        });

        this.activeTrackpointPositionInput = document.getElementById("active-trackpoint-pos") as Nabu.InputVector3;
        this.activeTrackpointPositionInput.onInputXYZCallback = (xyz: Nabu.IVector3XYZValue) => {
            if (this.track) {
                this.track.generateWires();
                this.track.recomputeAbsolutePath();
                this.track.wires[0].instantiate();
                this.track.wires[1].instantiate();
                this.updateHandles();
            }
        }

        this.game.scene.onBeforeRenderObservable.add(this._update);
        this.game.scene.onPointerObservable.add(this.onPointerEvent);
    }
    
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
                this.hoveredTrackPointHandle.setMaterial(this.game.handleMaterialActive);
            }
            else {
                this.hoveredTrackPointHandle.setMaterial(this.game.handleMaterial);
            }
        }
        this.hoveredTrackPointHandle = trackpointHandle;
        if (this.hoveredTrackPointHandle) {
            this.hoveredTrackPointHandle.setMaterial(this.game.handleMaterialHover);
        }
    }

    public selectedTrackPointHandle: TrackPointHandle;
    public get selectedTrackPointIndex(): number {
        return this.trackPointhandles.indexOf(this.selectedTrackPointHandle);
    }
    public get selectedTrackPoint(): TrackPoint {
        if (this.selectedTrackPointHandle) {
            return this.selectedTrackPointHandle.trackPoint;
        }
        return undefined;
    }
    public setSelectedTrackPointHandle(trackpointHandle: TrackPointHandle): void {
        if (this.selectedTrackPointHandle) {
            this.selectedTrackPointHandle.setMaterial(this.game.handleMaterial);
        }
        this.selectedTrackPointHandle = trackpointHandle;
        if (this.selectedTrackPointHandle) {
            if (this.selectedTrackPointHandle === this.hoveredTrackPointHandle) {
                this.selectedTrackPointHandle.setMaterial(this.game.handleMaterialHover);
            }
            else {
                this.selectedTrackPointHandle.setMaterial(this.game.handleMaterialActive);
            }
        }
        this.updateHandles();
    }
    public setSelectedTrackPointIndex(index: number): void {
        let handle = this.trackPointhandles[index];
        this.setSelectedTrackPointHandle(handle);
    }
    public tangentPrevHandle: BABYLON.Mesh;
    public normalHandle: BABYLON.Mesh;
    public tangentNextHandle: BABYLON.Mesh;

    public removeHandles(): void {
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
    }

    public rebuildHandles(): void {
        this.removeHandles();

        for (let i = 0; i < this.track.trackPoints.length; i++) {
            let handle = new TrackPointHandle(this.track.trackPoints[i]);
            this.trackPointhandles.push(handle);

            let pPrev = this.track.trackPoints[i - 1] ? this.track.trackPoints[i - 1].position : undefined;
            let p = this.track.trackPoints[i].position;
            let pNext = this.track.trackPoints[i + 1] ? this.track.trackPoints[i + 1].position : undefined;

            if (!pPrev) {
                pPrev = p.subtract(pNext.subtract(p));
            }
            if (!pNext) {
                pNext = p.add(p.subtract(pPrev));
            }

            Mummu.QuaternionFromYZAxisToRef(this.track.trackPoints[i].normal, pNext.subtract(pPrev), handle.rotationQuaternion);

            if (i < this.track.trackPoints.length - 1) {
                let insertHandle = BABYLON.MeshBuilder.CreateSphere("insert-handle-" + i, { diameter: 0.5 * this.track.wireGauge });
                insertHandle.material = this.game.insertHandleMaterial;
                insertHandle.position.copyFrom(this.track.trackPoints[i].position).addInPlace(this.track.trackPoints[i + 1].position).scaleInPlace(0.5);
                insertHandle.parent = this.track;
                this.insertTrackPointHandle.push(insertHandle);
            }
        }

        this.normalHandle = BABYLON.MeshBuilder.CreateCylinder("normal-handle", { height: 0.03, diameter: 0.0025, tessellation: 8 });
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
            this.normalHandle.position.copyFromFloats(0, 0.015 + 0.5 * this.track.wireGauge / 2, 0);
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

    public pointerPlane: BABYLON.Mesh;
    public offset: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    public pointerDown: boolean = false;
    public dragTrackPoint: boolean = false;
    public dragNormal: boolean = false;
    public lastPickedPoint: BABYLON.Vector3;

    public onPointerEvent = (eventData: BABYLON.PointerInfo, eventState: BABYLON.EventState) => {
        if (eventData.type === BABYLON.PointerEventTypes.POINTERDOWN) {
            this.pointerDown = true;
            let pick = this.game.scene.pick(
                this.game.scene.pointerX,
                this.game.scene.pointerY,
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

            if (pick.hit && this.hoveredTrackPointHandle && pick.pickedMesh === this.hoveredTrackPointHandle) {
                this.dragNormal = false;
                this.offset.copyFrom(this.hoveredTrackPointHandle.position).subtractInPlace(pick.pickedPoint);

                let d = this.game.scene.activeCamera.globalPosition.subtract(this.hoveredTrackPointHandle.position);
                Mummu.QuaternionFromYZAxisToRef(d, pick.getNormal(), this.pointerPlane.rotationQuaternion);

                this.pointerPlane.position.copyFrom(pick.pickedPoint);
                this.game.scene.activeCamera.detachControl();
            }
            else if (pick.hit && this.selectedTrackPointHandle && pick.pickedMesh === this.normalHandle) {
                this.dragNormal = true;
                this.lastPickedPoint = undefined;
                this.selectedTrackPointHandle.setNormal(this.selectedTrackPoint.normal);
                Mummu.QuaternionFromZYAxisToRef(this.selectedTrackPointHandle.trackPoint.normal, this.selectedTrackPointHandle.trackPoint.dir, this.pointerPlane.rotationQuaternion);
                this.pointerPlane.position.copyFrom(this.selectedTrackPointHandle.absolutePosition);
                this.game.scene.activeCamera.detachControl();
            }
            else {
                this.dragNormal = false;
            }
        }
        else if (eventData.type === BABYLON.PointerEventTypes.POINTERMOVE) {
            if (this.pointerDown) {
                let pick = this.game.scene.pick(
                    this.game.scene.pointerX,
                    this.game.scene.pointerY,
                    (mesh) => {
                        return mesh === this.pointerPlane;
                    }
                )

                if (this.dragNormal) {
                    if (this.selectedTrackPointHandle) {
                        if (pick.hit) {
                            if (this.lastPickedPoint) {
                                let prevNormal = this.lastPickedPoint.subtract(this.selectedTrackPointHandle.absolutePosition);
                                let currNormal = pick.pickedPoint.subtract(this.selectedTrackPointHandle.absolutePosition);
                                let a = Mummu.AngleFromToAround(prevNormal, currNormal, this.selectedTrackPoint.dir);
                                let n = Mummu.Rotate(this.selectedTrackPointHandle.normal, this.selectedTrackPoint.dir, a);
                                this.selectedTrackPointHandle.setNormal(n);
                            }
                            this.lastPickedPoint = pick.pickedPoint.clone();
                        }
                    }
                }
                else if (this.hoveredTrackPoint) {
                    if (pick.hit) {
                        console.log(".");
                        this.dragTrackPoint = true;
                        this.hoveredTrackPointHandle.position.copyFrom(pick.pickedPoint).addInPlace(this.offset);
                    }
                }
            }
            else {
                let pick = this.game.scene.pick(
                    this.game.scene.pointerX,
                    this.game.scene.pointerY,
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
            if (this.dragNormal) {
                this.dragNormal = false;
                this.selectedTrackPoint.normal.copyFrom(this.selectedTrackPointHandle.normal);
                this.selectedTrackPoint.fixedNormal = true;
                this.track.generateWires();
                this.track.recomputeAbsolutePath();
                this.track.wires[0].instantiate();
                this.track.wires[1].instantiate();
                this.updateHandles();
            }
            else if (this.dragTrackPoint && this.hoveredTrackPoint) {
                console.log("!");
                this.dragTrackPoint = false;
                this.hoveredTrackPoint.position.copyFrom(this.hoveredTrackPointHandle.position);
                this.track.generateWires();
                this.track.recomputeAbsolutePath();
                this.track.wires[0].instantiate();
                this.track.wires[1].instantiate();
                this.updateHandles();
            }
            else {
                let pick = this.game.scene.pick(
                    this.game.scene.pointerX,
                    this.game.scene.pointerY,
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
                    let trackPoint = new TrackPoint(this.track, insertTrackPoint.position.clone());
                    let index = this.insertTrackPointHandle.indexOf(insertTrackPoint) + 1;
                    this.track.trackPoints.splice(index, 0, trackPoint);
                    this.track.generateWires();
                    this.track.recomputeAbsolutePath();
                    this.track.wires[0].instantiate();
                    this.track.wires[1].instantiate();
                    this.rebuildHandles();
                }
                else if (pick.pickedMesh instanceof TrackPointHandle && this.trackPointhandles.indexOf(pick.pickedMesh) != - 1) {
                    this.setSelectedTrackPointHandle(pick.pickedMesh);
                    this.offset.copyFrom(this.selectedTrackPointHandle.position).subtractInPlace(pick.pickedPoint);
    
                    let d = this.game.scene.activeCamera.globalPosition.subtract(this.selectedTrackPointHandle.position);
                    Mummu.QuaternionFromYZAxisToRef(d, pick.getNormal(), this.pointerPlane.rotationQuaternion);
    
                    this.pointerPlane.position.copyFrom(pick.pickedPoint);
                    this.game.scene.activeCamera.detachControl();
                    
                    this.updateHandles();
                }
            }
            this.game.scene.activeCamera.attachControl();
        }
        else if (eventData.type === BABYLON.PointerEventTypes.POINTERWHEEL) {
            if (this.hoveredTrackPoint) {
                if (eventData.event instanceof WheelEvent) {
                    let dA = 3 * (eventData.event.deltaY / 100) / 180 * Math.PI;
                    Mummu.RotateInPlace(this.hoveredTrackPoint.normal, this.hoveredTrackPoint.dir, dA);
                    this.hoveredTrackPoint.fixedNormal = true;
                    this.track.generateWires();
                    this.track.recomputeAbsolutePath();
                    this.track.wires[0].instantiate();
                    this.track.wires[1].instantiate();
                    this.updateHandles();
                }
            }
        }
    }

    public setCameraAlphaBeta(alpha: number, beta: number, radius: number = 0.25): void {
        this._animateCamera([alpha, beta, radius], 0.5);
    }

    private _update = () => {
        if (this.selectedTrackPoint) {
            this.activeTrackpointPositionInput.targetXYZ = this.selectedTrackPoint.position;
        }
    }
}