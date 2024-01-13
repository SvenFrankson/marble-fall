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

    public helperCircleRadius: Nabu.InputNumber;
    public helperGridSize: Nabu.InputNumber;
    public activeTrackpointPositionInput: Nabu.InputVector3;
    public activeTrackpointNormalInput: Nabu.InputVector3;
    public activeTrackpointTangentIn: Nabu.InputNumber;
    public activeTrackpointTangentOut: Nabu.InputNumber;

    public helperShape: HelperShape;

    constructor(public game: Game) {
        this.setTrack(this.game.machine.tracks[0]);
        this.helperShape = new HelperShape();
    }

    public initialize(): void {
        this.pointerPlane = BABYLON.MeshBuilder.CreateGround("pointer-plane", { width: 10, height: 10 });
        this.pointerPlane.visibility = 0;
        this.pointerPlane.rotationQuaternion = BABYLON.Quaternion.Identity();

        document.getElementById("prev-track").addEventListener("click", () => {
            let trackIndex = this.game.machine.tracks.indexOf(this._track);
            if (trackIndex > 0) {
                this.setTrack(this.game.machine.tracks[trackIndex - 1]);
                this.centerOnTrack();
            }
        });
        document.getElementById("next-track").addEventListener("click", () => {
            let trackIndex = this.game.machine.tracks.indexOf(this._track);
            if (trackIndex < this.game.machine.tracks.length - 1) {
                this.setTrack(this.game.machine.tracks[trackIndex + 1]);
                this.centerOnTrack();
            }
        });

        document.getElementById("load").addEventListener("click", () => {
            if (this.track) {
                let s = window.localStorage.getItem("last-saved-track");
                if (s) {
                    let data = JSON.parse(s);
                    this.track.deserialize(data);
                    this.track.generateWires();
                    this.track.recomputeAbsolutePath();
                    this.track.rebuildWireMeshes();
                }
            }
        });

        document.getElementById("save").addEventListener("click", () => {
            if (this.track) {
                let data = this.track.serialize();
                window.localStorage.setItem("last-saved-track", JSON.stringify(data));
                Nabu.download("track.json", JSON.stringify(data));
            }
        });

        document.getElementById("btn-cam-top").addEventListener("click", () => {
            this.game.setCameraAlphaBeta(- Math.PI * 0.5, 0);
        });

        document.getElementById("btn-cam-left").addEventListener("click", () => {
            this.game.setCameraAlphaBeta(Math.PI, Math.PI * 0.5);
        });

        document.getElementById("btn-cam-face").addEventListener("click", () => {
            this.game.setCameraAlphaBeta(- Math.PI * 0.5, Math.PI * 0.5);
        });

        document.getElementById("btn-cam-right").addEventListener("click", () => {
            this.game.setCameraAlphaBeta(0, Math.PI * 0.5);
        });

        document.getElementById("btn-cam-bottom").addEventListener("click", () => {
            this.game.setCameraAlphaBeta(- Math.PI * 0.5, Math.PI);
        });

        document.getElementById("btn-cam-ortho").addEventListener("click", () => {
            this.game.cameraOrtho = true;
            this.helperShape.setShow(true);
        });

        document.getElementById("btn-cam-perspective").addEventListener("click", () => {
            this.game.cameraOrtho = false;
            this.helperShape.setShow(false);
        });

        document.getElementById("btn-focus-point").addEventListener("click", () => {
            if (this.track && this.selectedTrackPoint) {
                let target = BABYLON.Vector3.TransformCoordinates(this.selectedTrackPoint.position, this.track.getWorldMatrix());
                this.game.setCameraTarget(target);
            }
        });

        document.getElementById("btn-center-track").addEventListener("click", () => {
            this.centerOnTrack();
        });

        document.getElementById("btn-display-wire").addEventListener("click", () => {
            if (this.track) {
                this.track.renderOnlyPath = false;
                this.track.rebuildWireMeshes();
                this.updateHandles();
            }
        });

        document.getElementById("btn-display-path").addEventListener("click", () => {
            if (this.track) {
                this.track.renderOnlyPath = true;
                this.track.rebuildWireMeshes();
                this.updateHandles();
            }
        });

        document.getElementById("btn-show-helper-circle").addEventListener("click", () => {
            this.helperShape.setShowCircle(!this.helperShape.showCircle);
        });

        this.helperCircleRadius = document.getElementById("helper-circle-radius") as Nabu.InputNumber;
        this.helperCircleRadius.onInputNCallback = (n: number) => {
            this.helperShape.setCircleRadius(n);
        }

        document.getElementById("btn-show-helper-grid").addEventListener("click", () => {
            this.helperShape.setShowGrid(!this.helperShape.showGrid);
        });

        this.helperGridSize = document.getElementById("helper-grid-size") as Nabu.InputNumber;
        this.helperGridSize.onInputNCallback = (n: number) => {
            this.helperShape.setGridSize(n);
        }

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
                if (this.selectedTrackPoint && !this.selectedTrackPoint.isFirstOrLast()) {
                    this.track.generateWires();
                    this.track.recomputeAbsolutePath();
                    this.track.rebuildWireMeshes();
                    this.updateHandles();
                }
            }
        }

        this.activeTrackpointNormalInput = document.getElementById("active-trackpoint-normal") as Nabu.InputVector3;
        this.activeTrackpointNormalInput.onInputXYZCallback = (xyz: Nabu.IVector3XYZValue) => {
            if (this.track) {
                if (this.selectedTrackPoint && !this.selectedTrackPoint.isFirstOrLast()) {
                    this.track.generateWires();
                    this.track.recomputeAbsolutePath();
                    this.track.rebuildWireMeshes();
                    this.updateHandles();
                }
            }
        }

        this.activeTrackpointTangentIn = document.getElementById("active-trackpoint-tan-in") as Nabu.InputNumber;
        this.activeTrackpointTangentIn.onInputNCallback = (n: number) => {
            if (this.track) {
                if (this.selectedTrackPoint && !this.selectedTrackPoint.isFirstOrLast()) {
                    this.selectedTrackPoint.tangentIn = n;
                    this.selectedTrackPoint.fixedTangentIn = true;
                    this.track.generateWires();
                    this.track.recomputeAbsolutePath();
                    this.track.rebuildWireMeshes();
                    this.updateHandles();
                }
            }
        }

        this.activeTrackpointTangentOut = document.getElementById("active-trackpoint-tan-out") as Nabu.InputNumber;
        this.activeTrackpointTangentOut.onInputNCallback = (n: number) => {
            if (this.track) {
                if (this.selectedTrackPoint && !this.selectedTrackPoint.isFirstOrLast()) {
                    this.selectedTrackPoint.tangentOut = n;
                    this.selectedTrackPoint.fixedTangentOut = true;
                    this.track.generateWires();
                    this.track.recomputeAbsolutePath();
                    this.track.rebuildWireMeshes();
                    this.updateHandles();
                }
            }
        }

        document.getElementById("active-trackpoint-split").addEventListener("click", () => {
            if (this.track) {
                this.track.splitTrackPointAt(this.selectedTrackPointIndex);
                this.track.generateWires();
                this.track.recomputeAbsolutePath();
                this.track.rebuildWireMeshes();
                this.rebuildHandles();
            }
        });

        document.getElementById("active-trackpoint-delete").addEventListener("click", () => {
            if (this.track) {
                this.track.deleteTrackPointAt(this.selectedTrackPointIndex);
                this.track.generateWires();
                this.track.recomputeAbsolutePath();
                this.track.rebuildWireMeshes();
                this.rebuildHandles();
            }
        });

        this.game.scene.onBeforeRenderObservable.add(this._update);
        this.game.scene.onPointerObservable.add(this.onPointerEvent);
    }
    
    public trackPointhandles: TrackPointHandle[] = [];

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

        if (this.normalHandle) {
            this.normalHandle.dispose();
        }
    }

    public rebuildHandles(): void {
        this.removeHandles();

        for (let i = 0; i < this.track.trackPoints.length; i++) {
            let handle = new TrackPointHandle(this.track.trackPoints[0][i]);
            this.trackPointhandles.push(handle);

            let pPrev = this.track.trackPoints[0][i - 1] ? this.track.trackPoints[0][i - 1].position : undefined;
            let p = this.track.trackPoints[0][i].position;
            let pNext = this.track.trackPoints[0][i + 1] ? this.track.trackPoints[0][i + 1].position : undefined;

            if (!pPrev) {
                pPrev = p.subtract(pNext.subtract(p));
            }
            if (!pNext) {
                pNext = p.add(p.subtract(pPrev));
            }

            Mummu.QuaternionFromYZAxisToRef(this.track.trackPoints[0][i].normal, pNext.subtract(pPrev), handle.rotationQuaternion);
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

                Mummu.QuaternionFromYZAxisToRef(this.game.scene.activeCamera.getDirection(BABYLON.Axis.Z).scale(-1), pick.getNormal(), this.pointerPlane.rotationQuaternion);

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
                    if (this.selectedTrackPoint && !this.selectedTrackPoint.isFirstOrLast()) {
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
                else if (this.hoveredTrackPoint && !this.hoveredTrackPoint.isFirstOrLast()) {
                    if (pick.hit) {
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
                    this.game.scene.activeCamera.detachControl();
                    
                }
                else {
                    this.setHoveredTrackPointHandle(undefined);
                    this.game.scene.activeCamera.attachControl();
                }
            }
        }
        else if (eventData.type === BABYLON.PointerEventTypes.POINTERUP) {
            this.pointerDown = false;
            if (this.dragNormal && this.selectedTrackPoint && !this.selectedTrackPoint.isFirstOrLast()) {
                this.dragNormal = false;
                this.selectedTrackPoint.normal.copyFrom(this.selectedTrackPointHandle.normal);
                this.selectedTrackPoint.fixedNormal = true;
                this.track.generateWires();
                this.track.recomputeAbsolutePath();
                this.track.rebuildWireMeshes();
                this.updateHandles();
            }
            else if (this.dragTrackPoint && this.hoveredTrackPoint && !this.hoveredTrackPoint.isFirstOrLast()) {
                this.dragTrackPoint = false;
                this.hoveredTrackPoint.position.copyFrom(this.hoveredTrackPointHandle.position);
                this.track.generateWires();
                this.track.recomputeAbsolutePath();
                this.track.rebuildWireMeshes();
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
                        return false;
                    }
                )
    
                if (pick.pickedMesh instanceof TrackPointHandle && this.trackPointhandles.indexOf(pick.pickedMesh) != - 1) {
                    this.setSelectedTrackPointHandle(pick.pickedMesh);                    
                    this.updateHandles();
                }
            }
            if (!this.hoveredTrackPointHandle) {
                this.game.scene.activeCamera.attachControl();
            }
        }
        else if (eventData.type === BABYLON.PointerEventTypes.POINTERWHEEL) {
            if (this.hoveredTrackPoint && !this.hoveredTrackPoint.isFirstOrLast()) {
                if (eventData.event instanceof WheelEvent) {
                    let dA = 3 * (eventData.event.deltaY / 100) / 180 * Math.PI;
                    Mummu.RotateInPlace(this.hoveredTrackPoint.normal, this.hoveredTrackPoint.dir, dA);
                    this.hoveredTrackPoint.fixedNormal = true;
                    this.track.generateWires();
                    this.track.recomputeAbsolutePath();
                    this.track.rebuildWireMeshes();
                    this.updateHandles();
                }
            }
        }
    }

    public centerOnTrack(): void {
        if (this.track) {
            let center = this.track.getBarycenter();
            center.x = this.track.position.x;
            this.game.setCameraTarget(center);
        }
    }

    private _update = () => {
        if (this.selectedTrackPoint) {
            if (this.selectedTrackPoint.isFirstOrLast()) {
                this.activeTrackpointPositionInput.targetXYZ = this.selectedTrackPoint.position.clone();
                this.activeTrackpointNormalInput.targetXYZ = this.selectedTrackPoint.normal.clone();
            }
            else {
                this.activeTrackpointPositionInput.targetXYZ = this.selectedTrackPoint.position;
                this.activeTrackpointNormalInput.targetXYZ = this.selectedTrackPoint.normal;
            }

            let slopePrev = this.track.getSlopeAt(this.selectedTrackPointIndex - 1);
            document.getElementById("slope-prev").innerText = slopePrev.toFixed(1) + "%";
            let slopeCurr = this.track.getSlopeAt(this.selectedTrackPointIndex);
            document.getElementById("slope-curr").innerText = slopeCurr.toFixed(1) + "%";
            let slopeNext = this.track.getSlopeAt(this.selectedTrackPointIndex + 1);
            document.getElementById("slope-next").innerText = slopeNext.toFixed(1) + "%";

            this.activeTrackpointTangentIn.setValue(this.selectedTrackPoint.tangentIn);
            this.activeTrackpointTangentOut.setValue(this.selectedTrackPoint.tangentOut);
            
            let bankCurr = this.track.getBankAt(this.selectedTrackPointIndex);
            document.getElementById("active-trackpoint-bank").innerText = bankCurr.toFixed(1) + "°";
        }
        if (this.track) {
            document.getElementById("slope-global").innerText = this.track.globalSlope.toFixed(1) + "%";
        }
        this.helperCircleRadius.setValue(this.helperShape.circleRadius);
        this.helperGridSize.setValue(this.helperShape.gridSize);
    }
}