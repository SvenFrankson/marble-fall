class Ball extends BABYLON.Mesh {
    constructor(game) {
        super("ball");
        this.game = game;
        this.size = 0.016;
        this.velocity = BABYLON.Vector3.Zero();
        this._timer = 0;
        this.update = () => {
            let gameDt = this.getScene().deltaTime / 1000;
            if (isFinite(gameDt)) {
                this._timer += gameDt * this.game.timeFactor;
                this._timer = Math.min(this._timer, 1);
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
                this.game.tracks.forEach(track => {
                    if (Mummu.AABBAABBIntersect(this.position.x - this.radius, this.position.x + this.radius, this.position.y - this.radius, this.position.y + this.radius, this.position.z - this.radius, this.position.z + this.radius, track.AABBMin.x - this.radius, track.AABBMax.x + this.radius, track.AABBMin.y - this.radius, track.AABBMax.y + this.radius, track.AABBMin.z - this.radius, track.AABBMax.z + this.radius)) {
                        track.wires.forEach(wire => {
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
                    }
                });
                if (reactionsCount > 0) {
                    reactions.scaleInPlace(1 / reactionsCount);
                    canceledSpeed.scaleInPlace(1 / reactionsCount);
                    forcedDisplacement.scaleInPlace(1 / reactionsCount);
                }
                this.velocity.subtractInPlace(canceledSpeed);
                this.position.addInPlace(forcedDisplacement);
                let friction = this.velocity.scale(-1).scaleInPlace(0.005);
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
        this.material = this.game.steelMaterial;
        this.getScene().onBeforeRenderObservable.add(this.update);
    }
    dispose(doNotRecurse, disposeMaterialAndTextures) {
        super.dispose(doNotRecurse, disposeMaterialAndTextures);
        this.getScene().onBeforeRenderObservable.removeCallback(this.update);
    }
}
class HelperShape {
    constructor() {
        this.show = true;
        this.showCircle = false;
        this.showGrid = false;
        this.circleRadius = 350;
        this.gridSize = 100;
    }
    setShow(b) {
        this.show = b;
        this.update();
    }
    setShowCircle(b) {
        this.showCircle = b;
        this.update();
    }
    setCircleRadius(r) {
        this.circleRadius = Math.max(Math.min(r, 500), 50);
        this.update();
    }
    setShowGrid(b) {
        this.showGrid = b;
        this.update();
    }
    setGridSize(s) {
        this.gridSize = Math.max(Math.min(s, 500), 50);
        this.gridSize = s;
        this.update();
    }
    update() {
        if (!this.svg) {
            this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            this.svg.setAttribute("width", "1000");
            this.svg.setAttribute("height", "1000");
            this.svg.setAttribute("viewBox", "0 0 1000 1000");
            this.svg.style.position = "fixed";
            this.svg.style.width = "min(100vw, 100vh)";
            this.svg.style.height = "min(100vw, 100vh)";
            this.svg.style.left = "calc((100vw - min(100vw, 100vh)) * 0.5)";
            this.svg.style.top = "calc((100vh - min(100vw, 100vh)) * 0.5)";
            this.svg.style.zIndex = "1";
            this.svg.style.pointerEvents = "none";
            document.body.appendChild(this.svg);
        }
        this.svg.innerHTML = "";
        if (this.show && this.showCircle) {
            let circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("fill", "none");
            circle.setAttribute("stroke", "black");
            circle.setAttribute("stroke-width", "1");
            circle.setAttribute("cx", "500");
            circle.setAttribute("cy", "500");
            circle.setAttribute("r", this.circleRadius.toFixed(1));
            this.svg.appendChild(circle);
        }
        if (this.show && this.showGrid) {
            let count = Math.round(500 / this.gridSize);
            for (let i = 1; i < count; i++) {
                let d = i * this.gridSize;
                let lineTop = document.createElementNS("http://www.w3.org/2000/svg", "line");
                lineTop.setAttribute("stroke", "black");
                lineTop.setAttribute("stroke-width", "1");
                lineTop.setAttribute("x1", "0");
                lineTop.setAttribute("y1", (500 - d).toFixed(1));
                lineTop.setAttribute("x2", "1000");
                lineTop.setAttribute("y2", (500 - d).toFixed(1));
                this.svg.appendChild(lineTop);
                let lineBottom = document.createElementNS("http://www.w3.org/2000/svg", "line");
                lineBottom.setAttribute("stroke", "black");
                lineBottom.setAttribute("stroke-width", "1");
                lineBottom.setAttribute("x1", "0");
                lineBottom.setAttribute("y1", (500 + d).toFixed(1));
                lineBottom.setAttribute("x2", "1000");
                lineBottom.setAttribute("y2", (500 + d).toFixed(1));
                this.svg.appendChild(lineBottom);
                let lineLeft = document.createElementNS("http://www.w3.org/2000/svg", "line");
                lineLeft.setAttribute("stroke", "black");
                lineLeft.setAttribute("stroke-width", "1");
                lineLeft.setAttribute("x1", (500 - d).toFixed(1));
                lineLeft.setAttribute("y1", "0");
                lineLeft.setAttribute("x2", (500 - d).toFixed(1));
                lineLeft.setAttribute("y2", "1000");
                this.svg.appendChild(lineLeft);
                let lineRight = document.createElementNS("http://www.w3.org/2000/svg", "line");
                lineRight.setAttribute("stroke", "black");
                lineRight.setAttribute("stroke-width", "1");
                lineRight.setAttribute("x1", (500 + d).toFixed(1));
                lineRight.setAttribute("y1", "0");
                lineRight.setAttribute("x2", (500 + d).toFixed(1));
                lineRight.setAttribute("y2", "1000");
                this.svg.appendChild(lineRight);
            }
        }
        if (this.show && (this.showCircle || this.showGrid)) {
            let centerLineH = document.createElementNS("http://www.w3.org/2000/svg", "line");
            centerLineH.setAttribute("stroke", "black");
            centerLineH.setAttribute("stroke-width", "1");
            centerLineH.setAttribute("x1", "0");
            centerLineH.setAttribute("y1", "500");
            centerLineH.setAttribute("x2", "1000");
            centerLineH.setAttribute("y2", "500");
            this.svg.appendChild(centerLineH);
            let centerLineV = document.createElementNS("http://www.w3.org/2000/svg", "line");
            centerLineV.setAttribute("stroke", "black");
            centerLineV.setAttribute("stroke-width", "1");
            centerLineV.setAttribute("x1", "500");
            centerLineV.setAttribute("y1", "0");
            centerLineV.setAttribute("x2", "500");
            centerLineV.setAttribute("y2", "1000");
            this.svg.appendChild(centerLineV);
        }
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
        this.cameraOrtho = false;
        this.timeFactor = 0.3;
        this.physicDT = 0.001;
        this.tracks = [];
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
        this.steelMaterial = new BABYLON.PBRMetallicRoughnessMaterial("pbr", this.scene);
        this.steelMaterial.baseColor = new BABYLON.Color3(0.5, 0.75, 1.0);
        this.steelMaterial.metallic = 1.0; // set to 1 to only use it from the metallicRoughnessTexture
        this.steelMaterial.roughness = 0.15; // set to 1 to only use it from the metallicRoughnessTexture
        this.steelMaterial.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("./datas/environment/environmentSpecular.env", this.scene);
        let skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 10 / Math.sqrt(3) }, this.scene);
        skybox.rotation.y = Math.PI / 2;
        let skyboxMaterial = new BABYLON.StandardMaterial("skyBox", this.scene);
        skyboxMaterial.backFaceCulling = false;
        let skyTexture = new BABYLON.CubeTexture("./datas/skyboxes/skybox", this.scene, ["_px.jpg", "_py.jpg", "_pz.jpg", "_nx.jpg", "_ny.jpg", "_nz.jpg"]);
        skyboxMaterial.reflectionTexture = skyTexture;
        skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
        skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        skybox.material = skyboxMaterial;
        this.camera = new BABYLON.ArcRotateCamera("camera", 0, 0, 1, BABYLON.Vector3.Zero());
        this.camera.speed = 0.05;
        this.camera.minZ = 0.01;
        this.camera.maxZ = 10;
        this.camera.wheelPrecision = 1000;
        this.camera.panningSensibility = 100000;
        let savedTarget = window.localStorage.getItem("saved-target");
        if (savedTarget) {
            let target = JSON.parse(savedTarget);
            this.camera.target.x = target.x;
            this.camera.target.y = target.y;
            this.camera.target.z = target.z;
        }
        let savedPos = window.localStorage.getItem("saved-pos");
        if (savedPos) {
            let pos = JSON.parse(savedPos);
            this.camera.setPosition(new BABYLON.Vector3(pos.x, pos.y, pos.z));
        }
        /*
        let savedRot = window.localStorage.getItem("saved-rot");
        if (savedRot) {
            let rot = JSON.parse(savedRot);
            (this.camera as BABYLON.FreeCamera).rotation.x = rot.x;
            (this.camera as BABYLON.FreeCamera).rotation.y = rot.y;
            (this.camera as BABYLON.FreeCamera).rotation.z = rot.z;
        }
        */
        let savedCameraOrtho = window.localStorage.getItem("saved-cam-ortho");
        if (savedCameraOrtho === "true") {
            this.cameraOrtho = true;
        }
        this.camera.attachControl();
        this.camera.getScene();
        let ball = new Ball(this);
        ball.position.x = -tileWidth * 0.5 * 0.9;
        ball.position.y = 0.1;
        ball.instantiate();
        document.getElementById("reset").addEventListener("click", () => {
            ball.position.copyFromFloats(-0.05, 0.1, 0);
            ball.velocity.copyFromFloats(0, 0, 0);
        });
        /*
        this.tracks = [
            new Ramp(this, 0, 0, 2, 1),
            new UTurn(this, 2, 1),
            new Flat(this, 0, 2, 2),
            new UTurn(this, -1, 2, true),
            new Flat(this, 0, 3, 2),
            new UTurn(this, 2, 3),
            new Flat(this, 0, 4, 2),
            new UTurn(this, -1, 4, true),
            new Flat(this, 0, 5, 2),
            new UTurn(this, 2, 5),
            new Flat(this, 0, 6, 2),
            new UTurn(this, -1, 6, true),
            new Flat(this, 0, 7, 2),
            new UTurn(this, 2, 7),
            new Flat(this, 0, 8, 2),
            new UTurn(this, -1, 8, true),
            new Flat(this, 0, 9, 2)
        ];
        */
        /*
        this.tracks = [
            new Ramp(this, 0, 0, 2, 1),
            new Loop(this, 2, 1),
            new UTurn(this, 4, 4),
            new Ramp(this, 2, 5, 2, 1, true),
        ];
        */
        this.tracks = [
            new Ramp(this, 0, 0, 2, 1),
            new Spiral(this, 2, 1),
            new UTurn(this, 3, 4),
        ];
        this.tracks.forEach(track => {
            track.instantiate();
        });
        requestAnimationFrame(() => {
            this.tracks.forEach(track => {
                track.recomputeAbsolutePath();
            });
            this.trackEditor = new TrackEditor(this);
            this.trackEditor.initialize();
        });
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
        let pos = this.camera.globalPosition;
        window.localStorage.setItem("saved-pos", JSON.stringify({ x: pos.x, y: pos.y, z: pos.z }));
        //let rot = (this.camera as BABYLON.FreeCamera).rotation;
        //window.localStorage.setItem("saved-rot", JSON.stringify({ x: rot.x, y: rot.y, z: rot.z }));
        let target = this.camera.target;
        window.localStorage.setItem("saved-target", JSON.stringify({ x: target.x, y: target.y, z: target.z }));
        window.localStorage.setItem("saved-cam-ortho", this.cameraOrtho ? "true" : "false");
        if (this.cameraOrtho) {
            let ratio = this.engine.getRenderWidth() / this.engine.getRenderHeight();
            let f = this.camera.radius / 4;
            this.camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
            this.camera.orthoTop = 1 * f;
            this.camera.orthoBottom = -1 * f;
            this.camera.orthoLeft = -ratio * f;
            this.camera.orthoRight = ratio * f;
        }
        else {
            this.camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
        }
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
class TrackEditor {
    constructor(game) {
        this.game = game;
        this._animateCamera = Mummu.AnimationFactory.EmptyNumbersCallback;
        this._animateCameraTarget = Mummu.AnimationFactory.EmptyVector3Callback;
        this.trackPointhandles = [];
        this.offset = BABYLON.Vector3.Zero();
        this.pointerDown = false;
        this.dragTrackPoint = false;
        this.dragNormal = false;
        this.onPointerEvent = (eventData, eventState) => {
            if (eventData.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                this.pointerDown = true;
                let pick = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
                    if (mesh === this.normalHandle) {
                        return true;
                    }
                    else if (mesh instanceof TrackPointHandle && this.trackPointhandles.indexOf(mesh) != -1) {
                        return true;
                    }
                    return false;
                });
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
                    let pick = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
                        return mesh === this.pointerPlane;
                    });
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
                    let pick = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
                        if (mesh instanceof TrackPointHandle) {
                            return true;
                        }
                        return false;
                    });
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
                    let pick = this.game.scene.pick(this.game.scene.pointerX, this.game.scene.pointerY, (mesh) => {
                        if (mesh instanceof TrackPointHandle) {
                            if (this.trackPointhandles.indexOf(mesh) != -1) {
                                return true;
                            }
                        }
                        return false;
                    });
                    if (pick.pickedMesh instanceof TrackPointHandle && this.trackPointhandles.indexOf(pick.pickedMesh) != -1) {
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
        };
        this._update = () => {
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
        };
        this.setTrack(this.game.tracks[0]);
        this._animateCamera = Mummu.AnimationFactory.CreateNumbers(this.game.camera, this.game.camera, ["alpha", "beta", "radius"], undefined, [true, true, false]);
        this._animateCameraTarget = Mummu.AnimationFactory.CreateVector3(this.game.camera, this.game.camera, "target");
        this.helperShape = new HelperShape();
    }
    get track() {
        return this._track;
    }
    setTrack(t) {
        if (t != this.track) {
            if (this._track) {
            }
            this._track = t;
            if (this._track) {
            }
            this.rebuildHandles();
        }
    }
    initialize() {
        this.pointerPlane = BABYLON.MeshBuilder.CreateGround("pointer-plane", { width: 10, height: 10 });
        this.pointerPlane.visibility = 0;
        this.pointerPlane.rotationQuaternion = BABYLON.Quaternion.Identity();
        document.getElementById("prev-track").addEventListener("click", () => {
            let trackIndex = this.game.tracks.indexOf(this._track);
            if (trackIndex > 0) {
                this.setTrack(this.game.tracks[trackIndex - 1]);
                this.centerOnTrack();
            }
        });
        document.getElementById("next-track").addEventListener("click", () => {
            let trackIndex = this.game.tracks.indexOf(this._track);
            if (trackIndex < this.game.tracks.length - 1) {
                this.setTrack(this.game.tracks[trackIndex + 1]);
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
            this.setCameraAlphaBeta(-Math.PI * 0.5, 0);
        });
        document.getElementById("btn-cam-left").addEventListener("click", () => {
            this.setCameraAlphaBeta(Math.PI, Math.PI * 0.5);
        });
        document.getElementById("btn-cam-face").addEventListener("click", () => {
            this.setCameraAlphaBeta(-Math.PI * 0.5, Math.PI * 0.5);
        });
        document.getElementById("btn-cam-right").addEventListener("click", () => {
            this.setCameraAlphaBeta(0, Math.PI * 0.5);
        });
        document.getElementById("btn-cam-bottom").addEventListener("click", () => {
            this.setCameraAlphaBeta(-Math.PI * 0.5, Math.PI);
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
                this.setCameraTarget(target);
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
        this.helperCircleRadius = document.getElementById("helper-circle-radius");
        this.helperCircleRadius.onInputNCallback = (n) => {
            this.helperShape.setCircleRadius(n);
        };
        document.getElementById("btn-show-helper-grid").addEventListener("click", () => {
            this.helperShape.setShowGrid(!this.helperShape.showGrid);
        });
        this.helperGridSize = document.getElementById("helper-grid-size");
        this.helperGridSize.onInputNCallback = (n) => {
            this.helperShape.setGridSize(n);
        };
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
        this.activeTrackpointPositionInput = document.getElementById("active-trackpoint-pos");
        this.activeTrackpointPositionInput.onInputXYZCallback = (xyz) => {
            if (this.track) {
                if (this.selectedTrackPoint && !this.selectedTrackPoint.isFirstOrLast()) {
                    this.track.generateWires();
                    this.track.recomputeAbsolutePath();
                    this.track.rebuildWireMeshes();
                    this.updateHandles();
                }
            }
        };
        this.activeTrackpointNormalInput = document.getElementById("active-trackpoint-normal");
        this.activeTrackpointNormalInput.onInputXYZCallback = (xyz) => {
            if (this.track) {
                if (this.selectedTrackPoint && !this.selectedTrackPoint.isFirstOrLast()) {
                    this.track.generateWires();
                    this.track.recomputeAbsolutePath();
                    this.track.rebuildWireMeshes();
                    this.updateHandles();
                }
            }
        };
        this.activeTrackpointTangentIn = document.getElementById("active-trackpoint-tan-in");
        this.activeTrackpointTangentIn.onInputNCallback = (n) => {
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
        };
        this.activeTrackpointTangentOut = document.getElementById("active-trackpoint-tan-out");
        this.activeTrackpointTangentOut.onInputNCallback = (n) => {
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
        };
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
    get selectedTrackPointIndex() {
        return this.trackPointhandles.indexOf(this.selectedTrackPointHandle);
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
        this.updateHandles();
    }
    setSelectedTrackPointIndex(index) {
        let handle = this.trackPointhandles[index];
        this.setSelectedTrackPointHandle(handle);
    }
    removeHandles() {
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
    rebuildHandles() {
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
    centerOnTrack() {
        if (this.track) {
            let center = this.track.getBarycenter();
            center.x = this.track.position.x;
            this.setCameraTarget(center);
        }
    }
    setCameraAlphaBeta(alpha, beta, radius = 0.25) {
        this._animateCamera([alpha, beta, radius], 0.5);
    }
    setCameraTarget(target) {
        this._animateCameraTarget(target, 0.5);
    }
}
class Wire extends BABYLON.Mesh {
    constructor(track) {
        super("wire");
        this.track = track;
        this.path = [];
        this.normals = [];
        this.absolutePath = [];
        this.parent = this.track;
        this.rotationQuaternion = BABYLON.Quaternion.Identity();
        Wire.Instances.push(this);
    }
    get size() {
        return this.track.wireSize;
    }
    get radius() {
        return this.size * 0.5;
    }
    show() {
        this.isVisible = true;
        this.getChildMeshes().forEach(child => {
            child.isVisible = true;
        });
    }
    hide() {
        this.isVisible = false;
        this.getChildMeshes().forEach(child => {
            child.isVisible = false;
        });
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
        if (!Wire.DEBUG_DISPLAY) {
            let wire = BABYLON.ExtrudeShape("wire", { shape: shape, path: this.path, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
            wire.parent = this;
            wire.material = this.track.game.steelMaterial;
        }
        if (Wire.DEBUG_DISPLAY) {
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
}
Wire.DEBUG_DISPLAY = false;
Wire.Instances = new Nabu.UniqueList();
var baseRadius = 0.075;
var tileWidth = 0.15;
var tileHeight = 0.03;
class TrackPoint {
    constructor(track, position, normal, dir, tangentIn, tangentOut) {
        this.track = track;
        this.position = position;
        this.normal = normal;
        this.dir = dir;
        this.tangentIn = tangentIn;
        this.tangentOut = tangentOut;
        this.fixedNormal = false;
        this.fixedDir = false;
        this.fixedTangentIn = false;
        this.fixedTangentOut = false;
        this.summedLength = 0;
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
    isFirstOrLast() {
        let index = this.track.trackPoints.indexOf(this);
        if (index === 0 || index === this.track.trackPoints.length - 1) {
            return true;
        }
        return false;
    }
}
class Track extends BABYLON.Mesh {
    constructor(game, i, j) {
        super("track", game.scene);
        this.game = game;
        this.i = i;
        this.j = j;
        this.deltaI = 0;
        this.deltaJ = 0;
        this.wireSize = 0.0015;
        this.wireGauge = 0.013;
        this.renderOnlyPath = false;
        this.summedLength = [0];
        this.totalLength = 0;
        this.globalSlope = 0;
        this.AABBMin = BABYLON.Vector3.Zero();
        this.AABBMax = BABYLON.Vector3.Zero();
        this.position.x = i * tileWidth;
        this.position.y = -j * tileHeight;
        this.wires = [
            new Wire(this),
            new Wire(this)
        ];
    }
    mirrorTrackPointsInPlace() {
        for (let i = 0; i < this.trackPoints.length; i++) {
            this.trackPoints[i].position.x *= -1;
            if (this.trackPoints[i].normal) {
                this.trackPoints[i].normal.x *= -1;
            }
            if (this.trackPoints[i].dir) {
                this.trackPoints[i].dir.x *= -1;
            }
        }
    }
    getSlopeAt(index) {
        let trackpoint = this.trackPoints[index];
        let nextTrackPoint = this.trackPoints[index + 1];
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
    getBankAt(index) {
        let trackpoint = this.trackPoints[index];
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
    splitTrackPointAt(index) {
        if (index === 0) {
            let trackPoint = this.trackPoints[0];
            let nextTrackPoint = this.trackPoints[0 + 1];
            let distA = BABYLON.Vector3.Distance(trackPoint.position, nextTrackPoint.position);
            let tanInA = trackPoint.dir.scale(distA * trackPoint.tangentOut);
            let tanOutA = nextTrackPoint.dir.scale(distA * nextTrackPoint.tangentIn);
            let pointA = BABYLON.Vector3.Hermite(trackPoint.position, tanInA, nextTrackPoint.position, tanOutA, 0.5);
            let normalA = BABYLON.Vector3.Lerp(trackPoint.normal, nextTrackPoint.normal, 0.5);
            let trackPointA = new TrackPoint(this, pointA, normalA);
            this.trackPoints.splice(1, 0, trackPointA);
        }
        if (index > 0 && index < this.trackPoints.length - 1) {
            let prevTrackPoint = this.trackPoints[index - 1];
            let trackPoint = this.trackPoints[index];
            let nextTrackPoint = this.trackPoints[index + 1];
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
            this.trackPoints.splice(index, 1, trackPointA, trackPointB);
        }
    }
    deleteTrackPointAt(index) {
        if (index > 0 && index < this.trackPoints.length - 1) {
            this.trackPoints.splice(index, 1);
        }
    }
    getBarycenter() {
        if (this.trackPoints.length < 2) {
            return this.position.clone();
        }
        let barycenter = this.trackPoints.map(trackpoint => {
            return trackpoint.position;
        }).reduce((pos1, pos2) => {
            return pos1.add(pos2);
        }).scaleInPlace(1 / this.trackPoints.length);
        return BABYLON.Vector3.TransformCoordinates(barycenter, this.getWorldMatrix());
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
            if (!trackPoint.fixedTangentIn) {
                trackPoint.tangentIn = 1;
            }
            if (!trackPoint.fixedTangentOut) {
                trackPoint.tangentOut = 1;
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
        this.interpolatedPoints = [];
        this.interpolatedNormals = [];
        this.trackPoints[0].summedLength = 0;
        for (let i = 0; i < this.trackPoints.length - 1; i++) {
            let trackPoint = this.trackPoints[i];
            let nextTrackPoint = this.trackPoints[i + 1];
            let dist = BABYLON.Vector3.Distance(trackPoint.position, nextTrackPoint.position);
            let tanIn = this.trackPoints[i].dir.scale(dist * trackPoint.tangentOut);
            let tanOut = this.trackPoints[i + 1].dir.scale(dist * nextTrackPoint.tangentIn);
            let count = Math.round(dist / 0.003);
            count = Math.max(0, count);
            this.interpolatedPoints.push(trackPoint.position);
            this.interpolatedNormals.push(trackPoint.normal);
            nextTrackPoint.summedLength = trackPoint.summedLength;
            for (let j = 1; j < count; j++) {
                let amount = j / count;
                let point = BABYLON.Vector3.Hermite(trackPoint.position, tanIn, nextTrackPoint.position, tanOut, amount);
                let normal = BABYLON.Vector3.Lerp(trackPoint.normal, nextTrackPoint.normal, amount);
                this.interpolatedPoints.push(point);
                this.interpolatedNormals.push(normal);
                nextTrackPoint.summedLength += BABYLON.Vector3.Distance(this.interpolatedPoints[this.interpolatedPoints.length - 2], this.interpolatedPoints[this.interpolatedPoints.length - 1]);
            }
            nextTrackPoint.summedLength += BABYLON.Vector3.Distance(nextTrackPoint.position, this.interpolatedPoints[this.interpolatedPoints.length - 1]);
        }
        this.interpolatedPoints.push(this.trackPoints[this.trackPoints.length - 1].position);
        this.interpolatedNormals.push(this.trackPoints[this.trackPoints.length - 1].normal);
        let N = this.interpolatedPoints.length;
        this.summedLength = [0];
        this.totalLength = 0;
        for (let i = 0; i < N - 1; i++) {
            let p = this.interpolatedPoints[i];
            let pNext = this.interpolatedPoints[i + 1];
            let d = BABYLON.Vector3.Distance(p, pNext);
            this.summedLength[i + 1] = this.summedLength[i] + d;
        }
        this.totalLength = this.summedLength[N - 1];
        let dh = this.interpolatedPoints[this.interpolatedPoints.length - 1].y - this.interpolatedPoints[0].y;
        this.globalSlope = dh / this.totalLength * 100;
        // Compute wire path and Update AABB values.
        this.AABBMin.copyFromFloats(Infinity, Infinity, Infinity);
        this.AABBMax.copyFromFloats(-Infinity, -Infinity, -Infinity);
        for (let i = 0; i < N; i++) {
            let pPrev = this.interpolatedPoints[i - 1] ? this.interpolatedPoints[i - 1] : undefined;
            let p = this.interpolatedPoints[i];
            let pNext = this.interpolatedPoints[i + 1] ? this.interpolatedPoints[i + 1] : undefined;
            if (!pPrev) {
                pPrev = p.subtract(pNext.subtract(p));
            }
            if (!pNext) {
                pNext = p.add(p.subtract(pPrev));
            }
            let dir = pNext.subtract(pPrev).normalize();
            let up = this.interpolatedNormals[i];
            let rotation = BABYLON.Quaternion.Identity();
            Mummu.QuaternionFromZYAxisToRef(dir, up, rotation);
            let matrix = BABYLON.Matrix.Compose(BABYLON.Vector3.One(), rotation, p);
            this.wires[0].path[i] = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(-this.wireGauge * 0.5, 0, 0), matrix);
            this.wires[1].path[i] = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(this.wireGauge * 0.5, 0, 0), matrix);
            this.AABBMin.minimizeInPlace(this.wires[0].path[i]);
            this.AABBMin.minimizeInPlace(this.wires[1].path[i]);
            this.AABBMax.maximizeInPlace(this.wires[0].path[i]);
            this.AABBMax.maximizeInPlace(this.wires[1].path[i]);
        }
        this.AABBMin.x -= this.wireSize * 0.5;
        this.AABBMin.y -= this.wireSize * 0.5;
        this.AABBMin.z -= this.wireSize * 0.5;
        this.AABBMax.x += this.wireSize * 0.5;
        this.AABBMax.y += this.wireSize * 0.5;
        this.AABBMax.z += this.wireSize * 0.5;
        BABYLON.Vector3.TransformCoordinatesToRef(this.AABBMin, this.getWorldMatrix(), this.AABBMin);
        BABYLON.Vector3.TransformCoordinatesToRef(this.AABBMax, this.getWorldMatrix(), this.AABBMax);
    }
    recomputeAbsolutePath() {
        this.wires.forEach(wire => {
            wire.recomputeAbsolutePath();
        });
    }
    async instantiate() {
        /*
        let w = (1 + Math.abs(this.deltaI)) * tileWidth;
        let h = (1 + Math.abs(this.deltaJ)) * tileHeight;

        let baseMesh = BABYLON.MeshBuilder.CreateBox("base", { width: w - 0.006, height: h - 0.006, depth: 0.003 });
        baseMesh.parent = this;
        baseMesh.position.x += this.deltaI * 0.5 * tileWidth;
        baseMesh.position.y += - this.deltaJ * 0.5 * tileHeight - 0.013;
        baseMesh.position.z += 0.02;
        */
        this.sleepersMesh = new BABYLON.Mesh("sleepers-mesh");
        this.sleepersMesh.material = this.game.steelMaterial;
        this.sleepersMesh.parent = this;
        this.rebuildWireMeshes();
    }
    rebuildWireMeshes() {
        if (this.renderOnlyPath) {
            let n = 8;
            let shape = [];
            for (let i = 0; i < n; i++) {
                let a = i / n * 2 * Math.PI;
                let cosa = Math.cos(a);
                let sina = Math.sin(a);
                shape[i] = new BABYLON.Vector3(cosa * this.wireSize * 0.5, sina * this.wireSize * 0.5, 0);
            }
            let tmp = BABYLON.ExtrudeShape("wire", { shape: shape, path: this.interpolatedPoints, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
            let vertexData = BABYLON.VertexData.ExtractFromMesh(tmp);
            vertexData.applyToMesh(this.sleepersMesh);
            tmp.dispose();
            this.wires[0].hide();
            this.wires[1].hide();
        }
        else {
            this.wires[0].show();
            this.wires[1].show();
            SleeperMeshBuilder.GenerateSleepersVertexData(this, 0.03).applyToMesh(this.sleepersMesh);
            this.wires[0].instantiate();
            this.wires[1].instantiate();
        }
    }
    serialize() {
        let data = { points: [] };
        for (let i = 0; i < this.trackPoints.length; i++) {
            data.points[i] = {
                position: { x: this.trackPoints[i].position.x, y: this.trackPoints[i].position.y, z: this.trackPoints[i].position.z }
            };
            if (this.trackPoints[i].fixedNormal) {
                data.points[i].normal = { x: this.trackPoints[i].normal.x, y: this.trackPoints[i].normal.y, z: this.trackPoints[i].normal.z };
            }
            if (this.trackPoints[i].fixedDir) {
                data.points[i].dir = { x: this.trackPoints[i].dir.x, y: this.trackPoints[i].dir.y, z: this.trackPoints[i].dir.z };
            }
            if (this.trackPoints[i].fixedTangentIn) {
                data.points[i].tangentIn = this.trackPoints[i].tangentIn;
            }
            if (this.trackPoints[i].fixedTangentOut) {
                data.points[i].tangentOut = this.trackPoints[i].tangentOut;
            }
        }
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
            let trackPoint = new TrackPoint(this, new BABYLON.Vector3(pointData.position.x, pointData.position.y, pointData.position.z), normal, direction, pointData.tangentIn, pointData.tangentOut);
            this.trackPoints[i] = trackPoint;
        }
    }
}
/// <reference path="./Track.ts"/>
class DefaultTrack1 extends Track {
    constructor(game, i, j) {
        super(game, i, j);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        this.trackPoints = [
            new TrackPoint(this, new BABYLON.Vector3(-tileWidth * 0.5, 0, 0), n, dir),
            new TrackPoint(this, new BABYLON.Vector3(tileWidth * 0.5, -tileHeight * 1, 0), n, dir)
        ];
        this.deltaJ = 1;
        this.generateWires();
    }
}
class DefaultTrack2 extends Track {
    constructor(game, i, j) {
        super(game, i, j);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        this.trackPoints = [
            new TrackPoint(this, new BABYLON.Vector3(-tileWidth * 0.5, 0, 0), n, dir),
            new TrackPoint(this, new BABYLON.Vector3(tileWidth * 0.5, -tileHeight * 2, 0), n, dir)
        ];
        this.deltaJ = 2;
        this.generateWires();
    }
}
class DefaultTrack3 extends Track {
    constructor(game, i, j) {
        super(game, i, j);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        this.trackPoints = [
            new TrackPoint(this, new BABYLON.Vector3(-tileWidth * 0.5, 0, 0), n, dir),
            new TrackPoint(this, new BABYLON.Vector3(tileWidth * 1.5, -tileHeight * 0.5, 0)),
            new TrackPoint(this, new BABYLON.Vector3(-tileWidth * 0.5, -tileHeight, 0), n, dir.scale(-1))
        ];
        this.deltaI = 1;
        this.deltaJ = 1;
        this.generateWires();
    }
}
/// <reference path="./Track.ts"/>
class DefaultLLTrack extends Track {
    constructor(game, i, j, mirror) {
        super(game, i, j);
        this.deserialize({
            points: [
                { position: { x: -0.056249999999999994, y: 0.032475952641916446, z: 0 }, normal: { x: 0.09950371902099892, y: 0.9950371902099892, z: 0 }, dir: { x: 0.9950371902099892, y: -0.09950371902099892, z: 0 } },
                { position: { x: -0.010506693854306803, y: 0.024586694031686902, z: -0.0011302327810539378 }, normal: { x: 0.12182789095857596, y: 0.8264314830616825, z: -0.5496989801600997 } },
                { position: { x: 0.03197059018683249, y: 0.01741728765991577, z: -0.0030875560146152708 }, normal: { x: 0.02018170070075878, y: 0.20181700700758784, z: -0.9792152953458827 }, dir: { x: 0.9950371902099892, y: -0.09950371902099892, z: 0 } },
                { position: { x: 0.05050550403372285, y: 0.005119832724208587, z: -0.023324046122163745 }, normal: { x: -0.8375359521368244, y: 0.463390016047518, z: -0.2894878614134691 } },
                { position: { x: 0.033434763340491724, y: -0.009870373080515402, z: -0.05100364872061987 }, normal: { x: -0.5377432504789265, y: 0.753846001823966, z: 0.3775558264659407 } },
                { position: { x: 0.00898415932224321, y: -0.016033027115578413, z: -0.04022704060585921 }, normal: { x: 0.12878253194657152, y: 0.9176838962061582, z: 0.37586078022229924 } },
                { position: { x: -0.005660293369047137, y: -0.021648307068113964, z: -0.00885192240515461 }, normal: { x: -0.6231431135054996, y: 0.6624596691675566, z: -0.41574011932586397 } },
                { position: { x: -0.02906531091925879, y: -0.028254364753327404, z: -0.002669630725487286 }, normal: { x: -0.2632409047009031, y: 0.8352289697044248, z: -0.48280098825368506 } },
                { position: { x: -0.056249999999999994, y: -0.032475952641916446, z: 0 }, normal: { x: -0.09950371902099892, y: 0.9950371902099892, z: 0 }, dir: { x: -0.9950371902099892, y: -0.09950371902099892, z: 0 } },
            ],
        });
        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }
        this.generateWires();
    }
}
/// <reference path="./Track.ts"/>
class DoubleLoop extends Track {
    constructor(game, i, j) {
        super(game, i, j);
        this.deserialize({ "points": [{ "position": { "x": -0.056249999999999994, "y": 0.032475952641916446, "z": 0 }, "normal": { "x": 0.09950371902099892, "y": 0.9950371902099892, "z": 0 }, "dir": { "x": 0.9950371902099892, "y": -0.09950371902099892, "z": 0 } }, { "position": { "x": 0.007831128515433633, "y": 0.02686866956826861, "z": -0.001512586438867734 }, "normal": { "x": -0.02088401000702746, "y": 0.9212766316260701, "z": -0.38834678593461935 } }, { "position": { "x": 0.0445, "y": 0.0238, "z": -0.026 }, "normal": { "x": -0.4220582199178856, "y": 0.863269455131674, "z": -0.27682613105776016 }, "tangentIn": 1 }, { "position": { "x": 0.0441, "y": 0.0194, "z": -0.0801 }, "normal": { "x": -0.5105506548736694, "y": 0.8362861901986887, "z": 0.19990857132957118 } }, { "position": { "x": -0.00022584437025674475, "y": 0.015373584470800367, "z": -0.10497567416976264 }, "normal": { "x": -0.062210177432127416, "y": 0.8376674210294907, "z": 0.5426261932211393 } }, { "position": { "x": -0.04682594399162551, "y": 0.00993486974904878, "z": -0.07591274887481546 }, "normal": { "x": 0.4338049924054248, "y": 0.8392539115358117, "z": 0.3278202259409408 } }, { "position": { "x": -0.044, "y": 0.0068, "z": -0.0251 }, "normal": { "x": 0.47274782333094034, "y": 0.8547500410127304, "z": -0.21427053676274183 } }, { "position": { "x": 0.0003, "y": 0.0028, "z": -0.0004 }, "normal": { "x": 0.06925374833311816, "y": 0.8415192755510988, "z": -0.5357697520556448 } }, { "position": { "x": 0.0447, "y": -0.0012, "z": -0.0262 }, "normal": { "x": -0.4385316126958126, "y": 0.8367050678252934, "z": -0.32804672554665304 } }, { "position": { "x": 0.0442, "y": -0.0054, "z": -0.08 }, "normal": { "x": -0.5105423049408571, "y": 0.8358650802407707, "z": 0.2016832231489942 } }, { "position": { "x": -0.00019998794117725982, "y": -0.009649497176356298, "z": -0.10484166117713693 }, "normal": { "x": -0.05328804359581278, "y": 0.839859833513831, "z": 0.5401813070255678 } }, { "position": { "x": -0.04678172451684687, "y": -0.014002588861738838, "z": -0.07560012404016887 }, "normal": { "x": 0.4340370522882042, "y": 0.8399407589318226, "z": 0.3257473848337093 }, "tangentIn": 1 }, { "position": { "x": -0.0438, "y": -0.0182, "z": -0.0247 }, "normal": { "x": 0.49613685449256684, "y": 0.8445355495674358, "z": -0.20151408668143006 } }, { "position": { "x": -0.0017, "y": -0.0224, "z": 0.0002 }, "normal": { "x": 0.21464241308702953, "y": 0.9154904403092122, "z": -0.3403026420799902 } }, { "position": { "x": 0.056249999999999994, "y": -0.032475952641916446, "z": 0 }, "normal": { "x": 0.09950371902099892, "y": 0.9950371902099892, "z": 0 }, "dir": { "x": 0.9950371902099892, "y": -0.09950371902099892, "z": 0 } }] });
        this.generateWires();
    }
}
class Flat extends Track {
    constructor(game, i, j, w = 1) {
        super(game, i, j);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        this.deltaI = w - 1;
        this.trackPoints = [
            new TrackPoint(this, new BABYLON.Vector3(-tileWidth * 0.5, 0, 0), n, dir),
            new TrackPoint(this, new BABYLON.Vector3(tileWidth * (this.deltaI + 0.5), 0, 0), n, dir)
        ];
        this.generateWires();
    }
}
/// <reference path="./Track.ts"/>
class FlatLoop extends Track {
    constructor(game, i, j, mirror) {
        super(game, i, j);
        this.deserialize({
            points: [
                { position: { x: -0.075, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 } },
                { position: { x: 0.0002, y: -0.004, z: -0.0004 }, normal: { x: 0.019861618966497012, y: 0.9751749757297097, z: -0.22054315405967592 } },
                { position: { x: 0.0438, y: -0.0064, z: -0.0176 }, normal: { x: -0.22558304612591473, y: 0.9269655818421536, z: -0.29974505730802486 } },
                { position: { x: 0.0656, y: -0.0092, z: -0.0657 }, normal: { x: -0.36624766795617253, y: 0.9272115297672086, z: -0.07836724305102492 } },
                { position: { x: 0.05, y: -0.0116, z: -0.1081 }, normal: { x: -0.28899453151103105, y: 0.9331762009279609, z: 0.21369215890710064 } },
                { position: { x: 0.0001, y: -0.0146, z: -0.1307 }, normal: { x: -0.06591259754365662, y: 0.9234801060022608, z: 0.3779418252894237 } },
                { position: { x: -0.0463, y: -0.017, z: -0.1117 }, normal: { x: 0.21142849593782587, y: 0.9373586814752951, z: 0.27686945185116646 } },
                { position: { x: -0.064, y: -0.0194, z: -0.0655 }, normal: { x: 0.3862942302916957, y: 0.9210759814896877, z: 0.0489469505296813 } },
                { position: { x: -0.0462, y: -0.022, z: -0.0184 }, normal: { x: 0.2824107521306146, y: 0.937604682593982, z: -0.20283398694217641 } },
                { position: { x: -0.0005, y: -0.0244, z: -0.0002 }, normal: { x: 0.09320082689165142, y: 0.9775672574755118, z: -0.18888055214478572 } },
                { position: { x: 0.075, y: -0.03, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 } },
            ],
        });
        this.deltaJ = 1;
        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }
        this.generateWires();
    }
}
/// <reference path="./Track.ts"/>
class Loop extends Track {
    constructor(game, i, j) {
        super(game, i, j);
        this.deltaI = 1;
        this.deltaJ = 5;
        this.deserialize({
            points: [
                { position: { x: -0.075, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 } },
                { position: { x: -0.021377184932923343, y: -0.01583222287100921, z: -0.0011959569465675992 }, normal: { x: 0.4398662405979406, y: 0.8980469512393863, z: -0.005418833073501488 } },
                { position: { x: 0.02003455284141903, y: -0.04654967585480928, z: -0.00024045718222969392 }, normal: { x: 0.5980810041031908, y: 0.8014185564474127, z: -0.005235447704309637 } },
                { position: { x: 0.051982154546812154, y: -0.07056944621963705, z: 0.00021765594923375126 }, normal: { x: 0.4737950790675474, y: 0.8806350934588976, z: 0.00023498939378300459 } },
                { position: { x: 0.07951769517505025, y: -0.07855262586109861, z: 0.00018826259283915778 }, normal: { x: 0.10121057473644852, y: 0.994848482547003, z: 0.005737275960176982 } },
                { position: { x: 0.10010155106612612, y: -0.07546427636281762, z: 0.00011700933116668777 }, normal: { x: -0.5053588983921328, y: 0.8628989498588606, z: -0.004217362726349042 } },
                { position: { x: 0.11491616135931326, y: -0.05782715123020894, z: -0.0009829862775288726 }, normal: { x: -0.9599350956499557, y: 0.2794161576809643, z: -0.021242009469839607 } },
                { position: { x: 0.11252630195336205, y: -0.03307738562784979, z: -0.0038078682222728814 }, normal: { x: -0.890970312274938, y: -0.4538877985979476, z: 0.012560610200492529 } },
                { position: { x: 0.0949282434179991, y: -0.01882721427055359, z: -0.00950533957988787 }, normal: { x: -0.2799444640350821, y: -0.9579963484757484, z: -0.062242215282261856 } },
                { position: { x: 0.07179482958257077, y: -0.02051101082314377, z: -0.014025868519995871 }, normal: { x: 0.45291999494460516, y: -0.8899826679585553, z: -0.052861412322706545 } },
                { position: { x: 0.056687728890422895, y: -0.037825886177043425, z: -0.017288047559582208 }, normal: { x: 0.9266850129058358, y: -0.37540932659737863, z: -0.017964530592639416 } },
                { position: { x: 0.056878026596374254, y: -0.05712007547690236, z: -0.018467590965146805 }, normal: { x: 0.9324289169619076, y: 0.3584159747709198, z: -0.045981559806681366 } },
                { position: { x: 0.07150740001184758, y: -0.07637907827010613, z: -0.017283481187389347 }, normal: { x: 0.49107331627599876, y: 0.8707351144080051, z: 0.025833284316388306 } },
                { position: { x: 0.1448915461951915, y: -0.10721515365003756, z: -0.003043587072762862 }, normal: { x: 0.08863475760013599, y: 0.9960618315915217, z: -0.002169652439524198 } },
                { position: { x: 0.225, y: -0.09, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 } },
            ],
        });
        this.generateWires();
    }
}
class Ramp extends Track {
    constructor(game, i, j, w = 1, h = 1, mirror) {
        super(game, i, j);
        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        if (mirror) {
            dir.scaleInPlace(-1);
        }
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();
        this.deltaI = w - 1;
        this.deltaJ = h - 1;
        if (mirror) {
            this.trackPoints = [
                new TrackPoint(this, new BABYLON.Vector3(tileWidth * (this.deltaI + 0.5), 0, 0), n, dir),
                new TrackPoint(this, new BABYLON.Vector3(-tileWidth * 0.5, -tileHeight * (this.deltaJ + 1), 0), n, dir)
            ];
        }
        else {
            this.trackPoints = [
                new TrackPoint(this, new BABYLON.Vector3(-tileWidth * 0.5, 0, 0), n, dir),
                new TrackPoint(this, new BABYLON.Vector3(tileWidth * (this.deltaI + 0.5), -tileHeight * (this.deltaJ + 1), 0), n, dir)
            ];
        }
        this.generateWires();
    }
}
class SleeperMeshBuilder {
    static GenerateSleepersVertexData(track, spacing) {
        let summedLength = [0];
        for (let i = 1; i < track.interpolatedPoints.length; i++) {
            let prev = track.interpolatedPoints[i - 1];
            let trackpoint = track.interpolatedPoints[i];
            let dist = BABYLON.Vector3.Distance(prev, trackpoint);
            summedLength[i] = summedLength[i - 1] + dist;
        }
        let count = Math.round(summedLength[summedLength.length - 1] / spacing);
        let correctedSpacing = summedLength[summedLength.length - 1] / count;
        let partialsDatas = [];
        let radius = track.wireSize * 0.5 * 0.75;
        let nShape = 6;
        let shape = [];
        for (let i = 0; i < nShape; i++) {
            let a = i / nShape * 2 * Math.PI;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            shape[i] = new BABYLON.Vector3(cosa * radius, sina * radius, 0);
        }
        let shapeSmall = [];
        for (let i = 0; i < nShape; i++) {
            let a = i / nShape * 2 * Math.PI;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            shapeSmall[i] = new BABYLON.Vector3(cosa * radius * 0.75, sina * radius * 0.75, 0);
        }
        let radiusPath = track.wireGauge * 0.5;
        let nPath = 12;
        let basePath = [];
        for (let i = 0; i <= nPath; i++) {
            let a = i / nPath * Math.PI;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            basePath[i] = new BABYLON.Vector3(cosa * radiusPath, -sina * radiusPath, 0);
        }
        let q = BABYLON.Quaternion.Identity();
        let n = 0.5;
        for (let i = 1; i < track.interpolatedPoints.length - 1; i++) {
            let sumPrev = summedLength[i - 1];
            let sum = summedLength[i];
            let sumNext = summedLength[i + 1];
            let targetSumLength = n * correctedSpacing;
            let addSleeper = false;
            if (sumPrev < targetSumLength && sum >= targetSumLength) {
                let f = (targetSumLength - sumPrev) / (sum - sumPrev);
                if (f > 0.5) {
                    addSleeper = true;
                }
            }
            if (sum <= targetSumLength && sumNext > targetSumLength) {
                let f = (targetSumLength - sum) / (sumNext - sum);
                if (f <= 0.5) {
                    addSleeper = true;
                }
            }
            if (addSleeper) {
                let path = basePath.map(v => { return v.clone(); });
                let dir = track.interpolatedPoints[i + 1].subtract(track.interpolatedPoints[i - 1]).normalize();
                let t = track.interpolatedPoints[i];
                Mummu.QuaternionFromYZAxisToRef(track.interpolatedNormals[i], dir, q);
                let m = BABYLON.Matrix.Compose(BABYLON.Vector3.One(), q, t);
                for (let j = 0; j < path.length; j++) {
                    BABYLON.Vector3.TransformCoordinatesToRef(path[j], m, path[j]);
                }
                let tmp = BABYLON.ExtrudeShape("wire", { shape: shape, path: path, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
                partialsDatas.push(BABYLON.VertexData.ExtractFromMesh(tmp));
                tmp.dispose();
                if (n === 0.5 || n === count - 0.5) {
                    let anchor = path[nPath / 2 - 1];
                    let anchorCenter = anchor.clone();
                    anchorCenter.z = 0.015;
                    let radiusFixation = Math.abs(anchor.z - anchorCenter.z);
                    let anchorWall = anchorCenter.clone();
                    anchorWall.y -= radiusFixation * 0.5;
                    let nFixation = 10;
                    let fixationPath = [];
                    for (let i = 0; i <= nFixation; i++) {
                        let a = i / nFixation * 0.5 * Math.PI;
                        let cosa = Math.cos(a);
                        let sina = Math.sin(a);
                        fixationPath[i] = new BABYLON.Vector3(0, -sina * radiusFixation * 0.5, -cosa * radiusFixation);
                        fixationPath[i].addInPlace(anchorCenter);
                    }
                    let tmp = BABYLON.ExtrudeShape("tmp", { shape: shape, path: fixationPath, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
                    partialsDatas.push(BABYLON.VertexData.ExtractFromMesh(tmp));
                    tmp.dispose();
                    let tmpVertexData = BABYLON.CreateCylinderVertexData({ height: 0.001, diameter: 0.01 });
                    let q = BABYLON.Quaternion.Identity();
                    Mummu.QuaternionFromYZAxisToRef(new BABYLON.Vector3(0, 0, 1), new BABYLON.Vector3(0, 1, 0), q);
                    Mummu.RotateVertexDataInPlace(tmpVertexData, q);
                    Mummu.TranslateVertexDataInPlace(tmpVertexData, anchorWall);
                    partialsDatas.push(tmpVertexData);
                    tmp.dispose();
                }
                n++;
            }
        }
        return Mummu.MergeVertexDatas(...partialsDatas);
    }
}
/// <reference path="./Track.ts"/>
class Spiral extends Track {
    constructor(game, i, j) {
        super(game, i, j);
        this.deltaJ = 2;
        this.deserialize({
            points: [
                { position: { x: -0.075, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 } },
                { position: { x: 0.016, y: -0.0046, z: -0.003 }, normal: { x: 0.007953340519698392, y: 0.9796755302544724, z: -0.2004310350100407 } },
                { position: { x: 0.0539, y: -0.007, z: -0.0291 }, normal: { x: -0.14154991603542078, y: 0.9816209396236566, z: -0.12799981313554717 } },
                { position: { x: 0.0587, y: -0.0104, z: -0.0947 }, normal: { x: -0.21648321693435818, y: 0.9751103913883138, z: 0.04790345908471771 } },
                { position: { x: -0.0004, y: -0.014, z: -0.132 }, normal: { x: -0.05876261459368094, y: 0.9766033820741439, z: 0.2068641806777057 } },
                { position: { x: -0.0592, y: -0.0176, z: -0.0942 }, normal: { x: 0.13648755317177852, y: 0.9809640749898498, z: 0.13813265873242733 } },
                { position: { x: -0.05457944698749076, y: -0.02093380924123054, z: -0.029224609659455173 }, normal: { x: 0.1978258887547828, y: 0.9786554422343114, z: -0.05566366070916182 } },
                { position: { x: -0.0001, y: -0.0242, z: -0.0002 }, normal: { x: 0.05831823493670933, y: 0.9741660318385753, z: -0.21817315574045995 } },
                { position: { x: 0.0539, y: -0.0274, z: -0.0291 }, normal: { x: -0.11811378019582665, y: 0.9828966281852525, z: -0.14129173093254066 } },
                { position: { x: 0.0585, y: -0.0308, z: -0.0951 }, normal: { x: -0.1866759309661536, y: 0.981907599746408, z: 0.03177361103444291 } },
                { position: { x: -0.0004, y: -0.0344, z: -0.1318 }, normal: { x: -0.05765110973031337, y: 0.9752714798000515, z: 0.21335859541035881 } },
                { position: { x: -0.0596, y: -0.038, z: -0.0941 }, normal: { x: 0.16187115466936314, y: 0.9751225140754163, z: 0.15143913572536888 } },
                { position: { x: -0.0545, y: -0.0414, z: -0.0289 }, normal: { x: 0.21433532945533781, y: 0.9744372363962318, z: -0.06732339022766207 } },
                { position: { x: -0.0001, y: -0.0446, z: -0.0002 }, normal: { x: 0.057907181113875265, y: 0.9789932807064532, z: -0.19549658489871502 } },
                { position: { x: 0.0537, y: -0.0478, z: -0.0289 }, normal: { x: -0.1368199112704451, y: 0.9783883565825175, z: -0.1550372070946463 } },
                { position: { x: 0.0582, y: -0.0512, z: -0.0933 }, normal: { x: -0.1883372993900389, y: 0.981573881635258, z: 0.03227656347815464 } },
                { position: { x: -0.0004, y: -0.0548, z: -0.1317 }, normal: { x: -0.06083975282756499, y: 0.9808776461693529, z: 0.18487176020460871 } },
                { position: { x: -0.0594, y: -0.0584, z: -0.0938 }, normal: { x: 0.14282140746906183, y: 0.9794893882764371, z: 0.14213579360037204 } },
                { position: { x: -0.0546, y: -0.0618, z: -0.029 }, normal: { x: 0.18481557891708297, y: 0.9815946948814231, z: -0.048115036840777864 } },
                { position: { x: 0.0001, y: -0.065, z: 0.0001 }, normal: { x: 0.05815687117952442, y: 0.9789124067160975, z: -0.1958271643871352 } },
                { position: { x: 0.0538, y: -0.0682, z: -0.0288 }, normal: { x: -0.1354085732036273, y: 0.9789214878581536, z: -0.15289617036583067 } },
                { position: { x: 0.0583, y: -0.0716, z: -0.0937 }, normal: { x: -0.2251833372197503, y: 0.9729438520965845, z: 0.05169840719051138 } },
                { position: { x: 0, y: -0.0752, z: -0.1314 }, normal: { x: -0.059327984652719934, y: 0.9735095098349605, z: 0.22081536291196216 } },
                { position: { x: -0.0591, y: -0.0788, z: -0.0935 }, normal: { x: 0.1663822572342967, y: 0.9738075068684916, z: 0.154970590900962 } },
                { position: { x: -0.0545, y: -0.0822, z: -0.0289 }, normal: { x: 0.2127588057833227, y: 0.976429428847729, z: -0.036321633247311046 } },
                { position: { x: -0.0171, y: -0.0846, z: -0.0034 }, normal: { x: 0.10073825288107621, y: 0.9770460729407987, z: -0.18770395775644078 } },
                { position: { x: 0.075, y: -0.09, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 } },
            ],
        });
        this.generateWires();
    }
}
class UTurn extends Track {
    constructor(game, i, j, mirror) {
        super(game, i, j);
        this.deserialize({ "points": [{ "position": { "x": -0.075, "y": 0, "z": 0 }, "normal": { "x": 0, "y": 1, "z": 0 }, "dir": { "x": 1, "y": 0, "z": 0 } }, { "position": { "x": 0.13394933569683048, "y": -0.008441899296066684, "z": 0.00026137674993623877 }, "normal": { "x": 0.032306075793350764, "y": 0.9833195664766373, "z": -0.17899426708984922 } }, { "position": { "x": 0.1712, "y": -0.01, "z": -0.0105 }, "normal": { "x": -0.11360563098237532, "y": 0.9568855505453798, "z": -0.2673271474552511 } }, { "position": { "x": 0.1955, "y": -0.0116, "z": -0.0372 }, "normal": { "x": -0.20660883087432497, "y": 0.9643838758298143, "z": -0.16515608085750325 } }, { "position": { "x": 0.2038, "y": -0.013, "z": -0.0688 }, "normal": { "x": -0.25848323253959904, "y": 0.9647301065787487, "z": -0.049822083019837024 } }, { "position": { "x": 0.197, "y": -0.0144, "z": -0.0992 }, "normal": { "x": -0.274874420263502, "y": 0.9572314992222168, "z": 0.09028792821629655 } }, { "position": { "x": 0.1744, "y": -0.016, "z": -0.1265 }, "normal": { "x": -0.18804611436208896, "y": 0.956335180137496, "z": 0.22374468061767094 } }, { "position": { "x": 0.1339, "y": -0.0178, "z": -0.1377 }, "normal": { "x": -0.051765501746220265, "y": 0.9550181735779958, "z": 0.29199421392334324 } }, { "position": { "x": 0.0987, "y": -0.0194, "z": -0.1288 }, "normal": { "x": 0.11311928184404368, "y": 0.954449314514888, "z": 0.2760987759790836 } }, { "position": { "x": 0.0723, "y": -0.021, "z": -0.1014 }, "normal": { "x": 0.2540510175431706, "y": 0.9536388488664376, "z": 0.16134133511898094 } }, { "position": { "x": 0.055, "y": -0.024, "z": -0.0328 }, "normal": { "x": -0.2934267273272182, "y": 0.9518591565545972, "z": -0.08868428143255824 } }, { "position": { "x": 0.0301, "y": -0.0254, "z": -0.009 }, "normal": { "x": -0.16527157396712613, "y": 0.9629216416134613, "z": -0.2132304362675873 } }, { "position": { "x": -0.0057, "y": -0.027, "z": 0.0007 }, "normal": { "x": -0.056169210068177, "y": 0.9868539889112726, "z": -0.1515395143526165 } }, { "position": { "x": -0.075, "y": -0.03, "z": 0 }, "normal": { "x": 0, "y": 1, "z": 0 }, "dir": { "x": -1, "y": 0, "z": 0 } }] });
        this.deltaI = 1;
        this.deltaJ = 1;
        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }
        this.generateWires();
    }
}
