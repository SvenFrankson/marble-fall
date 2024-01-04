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
                let acceleration = weight.add(reactions).scaleInPlace(1 / m);
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
        this.timeFactor = 0.1;
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
        let tracks = [];
        for (let n = 0; n < 4; n++) {
            let track = new FlatLoop(this, 2 * n, 0);
            track.instantiate();
            tracks.push(track);
            let track2 = new Ramp(this, 2 * n + 1, 0);
            track2.instantiate();
            tracks.push(track2);
        }
        requestAnimationFrame(() => {
            tracks.forEach(track => {
                track.recomputeAbsolutePath();
            });
            tracks[1].showHandles();
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
        this.absolutePath = [];
        this.size = 0.002;
        this.parent = this.track;
        this.rotationQuaternion = BABYLON.Quaternion.Identity();
        Wire.Instances.push(this);
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
        for (let i = 0; i < this.path.length - 1; i++) {
            let dir = this.path[i].subtract(this.path[i + 1]).normalize();
            let l = BABYLON.Vector3.Distance(this.path[i + 1], this.path[i]);
            let wireSection = BABYLON.CreateCapsule("wire-section", { radius: this.size * 0.5, height: l });
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
    constructor(point, up = new BABYLON.Vector3(0, 1, 0), dir = new BABYLON.Vector3(1, 0, 0), right = new BABYLON.Vector3(0, 0, -1)) {
        this.point = point;
        this.up = up;
        this.dir = dir;
        this.right = right;
    }
}
class Track extends BABYLON.Mesh {
    constructor(game, i, j) {
        super("track", game.scene);
        this.game = game;
        this.i = i;
        this.j = j;
        this.wireSize = 0.002;
        this.wireGauge = 0.012;
        this.trackPointhandles = [];
        this.insertTrackPointHandle = [];
        this.offset = BABYLON.Vector3.Zero();
        this.onPointerEvent = (eventData, eventState) => {
            if (eventData.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                let pick = this.getScene().pick(this.getScene().pointerX, this.getScene().pointerY, (mesh) => {
                    return mesh instanceof BABYLON.Mesh && this.trackPointhandles.indexOf(mesh) != -1;
                });
                this.selectedHandle = pick.pickedMesh;
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
                    let pick = this.getScene().pick(this.getScene().pointerX, this.getScene().pointerY, (mesh) => {
                        return mesh === this.pointerPlane;
                    });
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
                    let pick = this.getScene().pick(this.getScene().pointerX, this.getScene().pointerY, (mesh) => {
                        return mesh instanceof BABYLON.Mesh && this.insertTrackPointHandle.indexOf(mesh) != -1;
                    });
                    let insertTrackPoint = pick.pickedMesh;
                    if (insertTrackPoint) {
                        let trackPoint = new TrackPoint(insertTrackPoint.position.clone());
                        let index = this.insertTrackPointHandle.indexOf(insertTrackPoint) + 1;
                        this.trackPoints.splice(index, 0, trackPoint);
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
        };
        this.position.x = i * 2 * xDist;
        this.position.y = -i * 2 * yDist;
        this.wires = [
            new Wire(this),
            new Wire(this)
        ];
    }
    showHandles() {
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
    generateWires() {
        this.wires[0].path = [];
        this.wires[1].path = [];
        let interpolatedPoints = this.trackPoints.map(trackpoint => { return trackpoint.point; });
        let interpolatedNormals = this.trackPoints.map(trackpoint => { return trackpoint.up; });
        for (let n = 0; n < 3; n++) {
            Mummu.CatmullRomPathInPlace(interpolatedPoints, this.trackPoints[0].dir.scale(2), this.trackPoints[this.trackPoints.length - 1].dir.scale(2));
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
    autoTrackNormals() {
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
            //right.y = 0;
            right.normalize();
            let up = BABYLON.Vector3.Cross(dir, right).normalize();
            this.trackPoints[i].up = up;
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
            let up = Mummu.Rotate(this.trackPoints[i].up, dir, -angleAroundY);
            this.trackPoints[i].up = up;
        }
    }
    remesh() {
        let smoothedPath = this.trackPoints.map(trackpoint => { return trackpoint.point; });
        for (let n = 0; n < 4; n++) {
            Mummu.CatmullRomPathInPlace(smoothedPath, this.trackPoints[0].dir, this.trackPoints[this.trackPoints.length - 1].dir);
        }
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
/// <reference path="./Track.ts"/>
class FlatLoop extends Track {
    constructor(game, i, j) {
        super(game, i, j);
        let dir = new BABYLON.Vector3(10, -1, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(1, 10, 0);
        n.normalize();
        this.trackPoints = [
            new TrackPoint(new BABYLON.Vector3(-xDist, yDist, 0), n, dir),
            new TrackPoint(new BABYLON.Vector3(-0.3 * xDist, 0.8 * yDist, -0.05 * xDist), BABYLON.Vector3.Up()),
            new TrackPoint(new BABYLON.Vector3(0.5 * xDist, 0.6 * yDist, -0.3 * xDist), BABYLON.Vector3.Up()),
            new TrackPoint(new BABYLON.Vector3(0.8 * xDist, 0.4 * yDist, -1 * xDist), BABYLON.Vector3.Up()),
            new TrackPoint(new BABYLON.Vector3(0.5 * xDist, 0.2 * yDist, -1.6 * xDist), BABYLON.Vector3.Up()),
            new TrackPoint(new BABYLON.Vector3(0, 0, -1.8 * xDist), BABYLON.Vector3.Up()),
            new TrackPoint(new BABYLON.Vector3(-0.5 * xDist, -0.2 * yDist, -1.6 * xDist), BABYLON.Vector3.Up()),
            new TrackPoint(new BABYLON.Vector3(-0.8 * xDist, -0.4 * yDist, -1 * xDist), BABYLON.Vector3.Up()),
            new TrackPoint(new BABYLON.Vector3(-0.5 * xDist, -0.6 * yDist, -0.3 * xDist), BABYLON.Vector3.Up()),
            new TrackPoint(new BABYLON.Vector3(0.3 * xDist, -0.8 * yDist, -0.05 * xDist), BABYLON.Vector3.Up()),
            new TrackPoint(new BABYLON.Vector3(xDist, -yDist, 0), n, dir)
        ];
        this.autoTrackNormals();
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
            new TrackPoint(new BABYLON.Vector3(-xDist, yDist, 0), n, dir),
            new TrackPoint(new BABYLON.Vector3(xDist, -yDist, 0), n, dir)
        ];
        this.autoTrackNormals();
        this.generateWires();
    }
}
