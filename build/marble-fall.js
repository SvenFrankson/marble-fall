class Ball extends BABYLON.Mesh {
    constructor(game) {
        super("ball");
        this.game = game;
        this.size = 0.014;
        this.velocity = BABYLON.Vector3.Zero();
        this._timer = 0;
        this.update = () => {
            let gameDt = this.getScene().deltaTime / 1000;
            if (isFinite(gameDt)) {
                this._timer += gameDt * this.game.timeFactor;
            }
            while (this._timer > 0) {
                let m = this.mass;
                let dt = this.game.physicDT;
                this._timer -= dt;
                let weight = new BABYLON.Vector3(0, -9 * m, 0);
                let reactions = BABYLON.Vector3.Zero();
                let reactionsCount = 0;
                let forcedDisplacement = BABYLON.Vector3.Zero();
                let canceledSpeed = BABYLON.Vector3.Zero();
                Wire.Instances.forEach(wire => {
                    let col = Mummu.SphereWireIntersection(this.position, this.radius, wire.absolutePath, wire.size * 0.5);
                    if (col.hit) {
                        let colDig = col.normal.scale(-1);
                        // Move away from collision
                        forcedDisplacement.addInPlace(col.normal.scale(col.depth));
                        // Cancel depth component of speed
                        let depthSpeed = BABYLON.Vector3.Dot(this.velocity, colDig);
                        if (depthSpeed > 0) {
                            canceledSpeed.addInPlace(colDig.scale(depthSpeed));
                        }
                        // Add ground reaction
                        let reaction = col.normal.scale(-BABYLON.Vector3.Dot(weight, col.normal));
                        reactions.addInPlace(reaction);
                        reactionsCount++;
                    }
                });
                if (reactionsCount > 0) {
                    reactions.scaleInPlace(1 / reactionsCount);
                    canceledSpeed.scaleInPlace(1 / reactionsCount);
                    forcedDisplacement.scaleInPlace(1 / reactionsCount);
                }
                this.velocity.subtractInPlace(canceledSpeed);
                this.position.addInPlace(forcedDisplacement);
                let friction = this.velocity.scale(-1).scaleInPlace(0.002);
                let acceleration = weight.add(reactions).add(friction).scaleInPlace(1 / m);
                this.velocity.addInPlace(acceleration.scale(dt));
                this.position.addInPlace(this.velocity.scale(dt));
            }
            if (this.position.y < -10000) {
                this.dispose();
            }
        };
    }
    get radius() {
        return this.size * 0.5;
    }
    get volume() {
        return 4 / 3 * Math.PI * Math.pow(this.size * 0.5, 3);
    }
    get mass() {
        return 7850 * this.volume;
    }
    get sectionArea() {
        return Math.PI * this.radius * this.radius;
    }
    async instantiate() {
        let data = BABYLON.CreateSphereVertexData({ diameter: this.size });
        data.applyToMesh(this);
        this.getScene().onBeforeRenderObservable.add(this.update);
    }
    dispose(doNotRecurse, disposeMaterialAndTextures) {
        super.dispose(doNotRecurse, disposeMaterialAndTextures);
        this.getScene().onBeforeRenderObservable.removeCallback(this.update);
    }
}
/// <reference path="../lib/babylon.d.ts"/>
/// <reference path="../../nabu/nabu.d.ts"/>
/// <reference path="../../mummu/mummu.d.ts"/>
function addLine(text) {
    let e = document.createElement("div");
    e.classList.add("debug-log");
    e.innerText = text;
    document.body.appendChild(e);
}
class Game {
    constructor(canvasElement) {
        this.timeFactor = 0.05;
        this.physicDT = 0.0005;
        Game.Instance = this;
        this.canvas = document.getElementById(canvasElement);
        this.canvas.requestPointerLock = this.canvas.requestPointerLock || this.canvas.msRequestPointerLock || this.canvas.mozRequestPointerLock || this.canvas.webkitRequestPointerLock;
        this.engine = new BABYLON.Engine(this.canvas, true);
        BABYLON.Engine.ShadersRepository = "./shaders/";
    }
    async createScene() {
        this.scene = new BABYLON.Scene(this.engine);
        this.vertexDataLoader = new Mummu.VertexDataLoader(this.scene);
        this.scene.clearColor = BABYLON.Color4.FromHexString("#66b0ff");
        this.light = new BABYLON.HemisphericLight("light", (new BABYLON.Vector3(-1, 3, 2)).normalize(), this.scene);
        this.handleMaterial = new BABYLON.StandardMaterial("handle-material");
        this.handleMaterial.diffuseColor.copyFromFloats(0, 1, 1);
        this.handleMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.handleMaterial.alpha = 0.5;
        this.handleMaterialActive = new BABYLON.StandardMaterial("handle-material");
        this.handleMaterialActive.diffuseColor.copyFromFloats(0.5, 1, 0.5);
        this.handleMaterialActive.specularColor.copyFromFloats(0, 0, 0);
        this.handleMaterialActive.alpha = 0.5;
        this.handleMaterialHover = new BABYLON.StandardMaterial("handle-material");
        this.handleMaterialHover.diffuseColor.copyFromFloats(0.75, 1, 0.75);
        this.handleMaterialHover.specularColor.copyFromFloats(0, 0, 0);
        this.handleMaterialHover.alpha = 0.5;
        this.insertHandleMaterial = new BABYLON.StandardMaterial("handle-material");
        this.insertHandleMaterial.diffuseColor.copyFromFloats(1, 0.5, 0.5);
        this.insertHandleMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.insertHandleMaterial.alpha = 0.5;
        this.camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(-9.5, -23, 13.5));
        this.camera.speed = 0.05;
        this.camera.minZ = 0.01;
        this.camera.maxZ = 10;
        this.camera.rotation.x = 1;
        this.camera.rotation.y = 1;
        let savedPos = window.localStorage.getItem("saved-pos");
        if (savedPos) {
            let pos = JSON.parse(savedPos);
            this.camera.position.x = pos.x;
            this.camera.position.y = pos.y;
            this.camera.position.z = pos.z;
        }
        let savedRot = window.localStorage.getItem("saved-rot");
        if (savedRot) {
            let rot = JSON.parse(savedRot);
            this.camera.rotation.x = rot.x;
            this.camera.rotation.y = rot.y;
            this.camera.rotation.z = rot.z;
        }
        this.camera.attachControl();
        this.camera.getScene();
        let ball = new Ball(this);
        ball.position.x = -0.05;
        ball.position.y = 0.1;
        ball.instantiate();
        document.getElementById("reset").addEventListener("click", () => {
            ball.position.copyFromFloats(-0.05, 0.1, 0);
            ball.velocity.copyFromFloats(0, 0, 0);
        });
        document.getElementById("remesh").addEventListener("click", () => {
            tracks[1].remesh();
        });
        document.getElementById("save").addEventListener("click", () => {
            let data = tracks[1].serialize();
            window.localStorage.setItem("saved-track", JSON.stringify(data));
        });
        let debugLoad = () => {
            let s = window.localStorage.getItem("saved-track");
            if (s) {
                let data = JSON.parse(s);
                tracks[1].deserialize(data);
                tracks[1].generateWires();
                tracks[1].recomputeAbsolutePath();
                tracks[1].wires[0].instantiate();
                tracks[1].wires[1].instantiate();
                tracks[1].enableEditionMode();
            }
        };
        document.getElementById("load").addEventListener("click", () => {
            debugLoad();
        });
        let tracks = [];
        for (let n = 0; n < 4; n++) {
            let track = new FlatLoop(this, 2 * n, 0);
            track.instantiate();
            tracks.push(track);
            let track2 = new DoubleLoop(this, 2 * n + 1, 0);
            track2.instantiate();
            tracks.push(track2);
        }
        requestAnimationFrame(() => {
            tracks.forEach(track => {
                track.recomputeAbsolutePath();
            });
            tracks[1].enableEditionMode();
        });
    }
    download(filename, text) {
        var e = document.createElement('a');
        e.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        e.setAttribute('download', filename);
        e.style.display = 'none';
        document.body.appendChild(e);
        e.click();
        document.body.removeChild(e);
    }
    animate() {
        this.engine.runRenderLoop(() => {
            this.scene.render();
            this.update();
        });
        window.addEventListener("resize", () => {
            this.engine.resize();
        });
    }
    async initialize() {
    }
    update() {
        let pos = this.camera.position;
        window.localStorage.setItem("saved-pos", JSON.stringify({ x: pos.x, y: pos.y, z: pos.z }));
        let rot = this.camera.rotation;
        window.localStorage.setItem("saved-rot", JSON.stringify({ x: rot.x, y: rot.y, z: rot.z }));
    }
}
window.addEventListener("DOMContentLoaded", () => {
    //addLine("Kulla Test Scene");
    let main = new Game("render-canvas");
    main.createScene();
    main.initialize().then(() => {
        main.animate();
    });
});
class Wire extends BABYLON.Mesh {
    constructor(track) {
        super("wire");
        this.track = track;
        this.path = [];
        this.normals = [];
        this.absolutePath = [];
        this.size = 0.002;
        this.parent = this.track;
        this.rotationQuaternion = BABYLON.Quaternion.Identity();
        Wire.Instances.push(this);
    }
    get radius() {
        return this.size * 0.5;
    }
    recomputeAbsolutePath() {
        this.absolutePath.splice(this.path.length);
        for (let i = 0; i < this.path.length; i++) {
            if (!this.absolutePath[i]) {
                this.absolutePath[i] = BABYLON.Vector3.Zero();
            }
            BABYLON.Vector3.TransformCoordinatesToRef(this.path[i], this.getWorldMatrix(), this.absolutePath[i]);
        }
    }
    async instantiate() {
        while (this.getChildren().length > 0) {
            this.getChildren()[0].dispose();
        }
        let n = 8;
        let shape = [];
        for (let i = 0; i < n; i++) {
            let a = i / n * 2 * Math.PI;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            shape[i] = new BABYLON.Vector3(cosa * this.radius, sina * this.radius, 0);
        }
        //let wire = BABYLON.ExtrudeShape("wire", { shape: shape, path: this.path, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
        //wire.parent = this;
        for (let i = 0; i < this.path.length - 1; i++) {
            let dir = this.path[i].subtract(this.path[i + 1]).normalize();
            let l = BABYLON.Vector3.Distance(this.path[i + 1], this.path[i]);
            let wireSection = BABYLON.CreateCapsule("wire-section", { radius: this.size * 0.6, height: l });
            wireSection.position.copyFrom(this.path[i + 1]).addInPlace(this.path[i]).scaleInPlace(0.5);
            wireSection.rotationQuaternion = BABYLON.Quaternion.Identity();
            wireSection.parent = this;
            Mummu.QuaternionFromYZAxisToRef(dir, BABYLON.Axis.Y, wireSection.rotationQuaternion);
        }
    }
}
Wire.Instances = new Nabu.UniqueList();
var baseRadius = 0.075;
var xDist = 0.75 * baseRadius;
var yDist = Math.sqrt(3) / 2 * 0.5 * baseRadius;
class TrackPoint {
    constructor(track, position, normal, dir, trangentPrev, trangentNext) {
        this.track = track;
        this.position = position;
        this.normal = normal;
        this.dir = dir;
        this.trangentPrev = trangentPrev;
        this.trangentNext = trangentNext;
        this.fixedNormal = false;
        this.fixedDir = false;
        this.fixedTangentPrev = false;
        this.fixedTangentNext = false;
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
class TrackPointHandle extends BABYLON.Mesh {
    constructor(trackPoint) {
        super("trackpoint-handle");
        this.trackPoint = trackPoint;
        this._normal = BABYLON.Vector3.Up();
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
    get normal() {
        return this._normal;
    }
    setNormal(n) {
        this._normal.copyFrom(n);
        Mummu.QuaternionFromYZAxisToRef(this._normal, this.trackPoint.dir, this.rotationQuaternion);
    }
    setMaterial(material) {
        this.material = material;
        this.getChildMeshes().forEach(m => {
            m.material = material;
        });
    }
}
class Track extends BABYLON.Mesh {
    constructor(game, i, j) {
        super("track", game.scene);
        this.game = game;
        this.i = i;
        this.j = j;
        this.subdivisions = 3;
        this.wireSize = 0.002;
        this.wireGauge = 0.012;
        this.editionMode = false;
        this.trackPointhandles = [];
        this.insertTrackPointHandle = [];
        this.offset = BABYLON.Vector3.Zero();
        this.pointerDown = false;
        this.dragNormal = false;
        this.onPointerEvent = (eventData, eventState) => {
            if (eventData.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                this.pointerDown = true;
                let pick = this.getScene().pick(this.getScene().pointerX, this.getScene().pointerY, (mesh) => {
                    if (mesh === this.normalHandle) {
                        return true;
                    }
                    else if (mesh instanceof TrackPointHandle && this.trackPointhandles.indexOf(mesh) != -1) {
                        return true;
                    }
                    return false;
                });
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
                    let pick = this.getScene().pick(this.getScene().pointerX, this.getScene().pointerY, (mesh) => {
                        return mesh === this.pointerPlane;
                    });
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
                    let pick = this.getScene().pick(this.getScene().pointerX, this.getScene().pointerY, (mesh) => {
                        if (mesh instanceof TrackPointHandle) {
                            return true;
                        }
                        return false;
                    });
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
                    let pick = this.getScene().pick(this.getScene().pointerX, this.getScene().pointerY, (mesh) => {
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
                    });
                    if (this.insertTrackPointHandle.indexOf(pick.pickedMesh) != -1) {
                        this.setSelectedTrackPointHandle(undefined);
                        let insertTrackPoint = pick.pickedMesh;
                        let trackPoint = new TrackPoint(this, insertTrackPoint.position.clone());
                        let index = this.insertTrackPointHandle.indexOf(insertTrackPoint) + 1;
                        this.trackPoints.splice(index, 0, trackPoint);
                        this.generateWires();
                        this.recomputeAbsolutePath();
                        this.wires[0].instantiate();
                        this.wires[1].instantiate();
                        this.rebuildHandles();
                    }
                    else if (pick.pickedMesh instanceof TrackPointHandle && this.trackPointhandles.indexOf(pick.pickedMesh) != -1) {
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
            else if (eventData.type === BABYLON.PointerEventTypes.POINTERWHEEL) {
                if (this.hoveredTrackPoint) {
                    if (eventData.event instanceof WheelEvent) {
                        let dA = 3 * (eventData.event.deltaY / 100) / 180 * Math.PI;
                        Mummu.RotateInPlace(this.hoveredTrackPoint.normal, this.hoveredTrackPoint.dir, dA);
                        this.hoveredTrackPoint.fixedNormal = true;
                        this.generateWires();
                        this.recomputeAbsolutePath();
                        this.wires[0].instantiate();
                        this.wires[1].instantiate();
                        this.updateHandles();
                    }
                }
            }
        };
        this.position.x = i * 2 * xDist;
        this.position.y = -i * 2 * yDist;
        this.wires = [
            new Wire(this),
            new Wire(this)
        ];
    }
    get hoveredTrackPoint() {
        if (this.hoveredTrackPointHandle) {
            return this.hoveredTrackPointHandle.trackPoint;
        }
        return undefined;
    }
    setHoveredTrackPointHandle(trackpointHandle) {
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
    get selectedTrackPoint() {
        if (this.selectedTrackPointHandle) {
            return this.selectedTrackPointHandle.trackPoint;
        }
        return undefined;
    }
    setSelectedTrackPointHandle(trackpointHandle) {
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
    }
    enableEditionMode() {
        this.disableEditionMode();
        this.editionMode = true;
        this.rebuildHandles();
        this.getScene().onPointerObservable.add(this.onPointerEvent);
    }
    disableEditionMode() {
        this.editionMode = false;
        this.getScene().onPointerObservable.removeCallback(this.onPointerEvent);
    }
    rebuildHandles() {
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
        this.normalHandle = BABYLON.MeshBuilder.CreateCylinder("normal-handle", { height: 0.03, diameter: 0.0025, tessellation: 8 });
        this.normalHandle.rotationQuaternion = BABYLON.Quaternion.Identity();
        this.normalHandle.material = this.game.handleMaterialActive;
        this.normalHandle.isVisible = false;
    }
    updateHandles() {
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
    generateWires() {
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
                let nextTrackPointWithFixedNormal;
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
                smoothed[i].addInPlace(interpolatedPoints[i - 1]).addInPlace(interpolatedPoints[i + 1]).scaleInPlace(1 / 3);
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
            this.wires[0].path[i] = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(-this.wireGauge * 0.5, 0, 0), matrix);
            this.wires[1].path[i] = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(this.wireGauge * 0.5, 0, 0), matrix);
        }
    }
    recomputeAbsolutePath() {
        this.wires.forEach(wire => {
            wire.recomputeAbsolutePath();
        });
    }
    async instantiate() {
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
    serialize() {
        let data = { points: [] };
        for (let i = 0; i < this.trackPoints.length; i++) {
            data.points.push({
                position: { x: this.trackPoints[i].position.x, y: this.trackPoints[i].position.y, z: this.trackPoints[i].position.z }
            });
        }
        data.points[0].normal = { x: this.trackPoints[0].normal.x, y: this.trackPoints[0].normal.y, z: this.trackPoints[0].normal.z };
        data.points[0].dir = { x: this.trackPoints[0].dir.x, y: this.trackPoints[0].dir.y, z: this.trackPoints[0].dir.z };
        let i = this.trackPoints.length - 1;
        data.points[i].normal = { x: this.trackPoints[i].normal.x, y: this.trackPoints[i].normal.y, z: this.trackPoints[i].normal.z };
        data.points[i].dir = { x: this.trackPoints[i].dir.x, y: this.trackPoints[i].dir.y, z: this.trackPoints[i].dir.z };
        return data;
    }
    deserialize(data) {
        this.trackPoints = [];
        for (let i = 0; i < data.points.length; i++) {
            let pointData = data.points[i];
            let normal;
            let direction;
            if (pointData.normal) {
                normal = new BABYLON.Vector3(pointData.normal.x, pointData.normal.y, pointData.normal.z);
            }
            if (pointData.dir) {
                direction = new BABYLON.Vector3(pointData.dir.x, pointData.dir.y, pointData.dir.z);
            }
            let trackPoint = new TrackPoint(this, new BABYLON.Vector3(pointData.position.x, pointData.position.y, pointData.position.z), normal, direction);
            this.trackPoints[i] = trackPoint;
        }
    }
}
/// <reference path="./Track.ts"/>
class DoubleLoop extends Track {
    constructor(game, i, j) {
        super(game, i, j);
        this.deserialize({
            points: [
                { position: { x: -0.056249999999999994, y: 0.032475952641916446, z: 0 }, normal: { x: 0.09950371902099892, y: 0.9950371902099892, z: 0 }, dir: { x: 0.9950371902099892, y: -0.09950371902099892, z: 0 } },
                { position: { x: -0.02247276854298, y: 0.033123278840042014, z: 0.002954409933442207 } },
                { position: { x: -0.004806679736589367, y: 0.05233107801664711, z: 0.003136151115902047 } },
                { position: { x: -0.025953415041307312, y: 0.07023608132278716, z: -0.0057761936067418475 } },
                { position: { x: -0.04187220593297156, y: 0.046647031744568704, z: -0.013617848089849673 } },
                { position: { x: -0.004782729582494746, y: 0.005448401551669577, z: -0.016730026157779007 } },
                { position: { x: 0.03392457799318907, y: 0.006222947045886634, z: -0.007715187355032786 } },
                { position: { x: 0.02912696033523811, y: 0.02701941918436778, z: -0.004721568668964358 } },
                { position: { x: 0.004463062684720603, y: 0.024485514735595473, z: -0.0025526625841006245 } },
                { position: { x: 0.016665422691149664, y: -0.01818856367050191, z: 0.0029672655628109152 } },
                { position: { x: 0.056249999999999994, y: -0.032475952641916446, z: 0 }, normal: { x: 0.09950371902099892, y: 0.9950371902099892, z: 0 }, dir: { x: 0.9950371902099892, y: -0.09950371902099892, z: 0 } },
            ],
        });
        this.subdivisions = 3;
        this.generateWires();
    }
}
/// <reference path="./Track.ts"/>
class FlatLoop extends Track {
    constructor(game, i, j) {
        super(game, i, j);
        let dir = new BABYLON.Vector3(10, -1, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(1, 10, 0);
        n.normalize();
        this.trackPoints = [
            new TrackPoint(this, new BABYLON.Vector3(-xDist, yDist, 0), n, dir),
            new TrackPoint(this, new BABYLON.Vector3(-0.3 * xDist, 0.8 * yDist, -0.05 * xDist)),
            new TrackPoint(this, new BABYLON.Vector3(0.5 * xDist, 0.6 * yDist, -0.3 * xDist)),
            new TrackPoint(this, new BABYLON.Vector3(0.8 * xDist, 0.4 * yDist, -1 * xDist)),
            new TrackPoint(this, new BABYLON.Vector3(0.5 * xDist, 0.2 * yDist, -1.6 * xDist)),
            new TrackPoint(this, new BABYLON.Vector3(0, 0, -1.8 * xDist), BABYLON.Vector3.Up()),
            new TrackPoint(this, new BABYLON.Vector3(-0.5 * xDist, -0.2 * yDist, -1.6 * xDist)),
            new TrackPoint(this, new BABYLON.Vector3(-0.8 * xDist, -0.4 * yDist, -1 * xDist)),
            new TrackPoint(this, new BABYLON.Vector3(-0.5 * xDist, -0.6 * yDist, -0.3 * xDist)),
            new TrackPoint(this, new BABYLON.Vector3(0.3 * xDist, -0.8 * yDist, -0.05 * xDist)),
            new TrackPoint(this, new BABYLON.Vector3(xDist, -yDist, 0), n, dir)
        ];
        this.generateWires();
    }
}
class Ramp extends Track {
    constructor(game, i, j) {
        super(game, i, j);
        let dir = new BABYLON.Vector3(10, -1, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(1, 10, 0);
        n.normalize();
        this.trackPoints = [
            new TrackPoint(this, new BABYLON.Vector3(-xDist, yDist, 0), n, dir),
            new TrackPoint(this, new BABYLON.Vector3(xDist, -yDist, 0), n, dir)
        ];
        this.subdivisions = 3;
        this.generateWires();
    }
}
