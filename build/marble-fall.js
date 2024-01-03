class Ball extends BABYLON.Mesh {
    constructor(game) {
        super("ball");
        this.game = game;
        this.size = 0.014;
        this.velocity = BABYLON.Vector3.Zero();
        this._timer = 0;
        this.update = () => {
            let gameDt = this.getScene().deltaTime / 1000;
            this._timer += gameDt * this.game.timeFactor;
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
        this.timeFactor = 0.3;
        this.physicDT = 0.001;
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
        ball.position.z = 0;
        ball.instantiate();
        let track = new Ramp();
        track.position.copyFromFloats(-0.05, -0.05, 0);
        track.instantiate();
        let track2 = new Turn();
        track2.position.copyFromFloats(0.15, -0.07, 0);
        track2.instantiate();
        let track3 = new Ramp();
        track3.position.copyFromFloats(0.15, -0.07, -0.1);
        track3.rotation.y = Math.PI;
        track3.instantiate();
        let track4 = new Turn();
        track4.position.copyFromFloats(-0.05, -0.09, -0.1);
        track4.rotation.y = Math.PI;
        track4.instantiate();
        let track5 = new Ramp();
        track5.position.copyFromFloats(-0.05, -0.09, 0);
        track5.instantiate();
        let track6 = new Turn();
        track6.position.copyFromFloats(0.15, -0.11, 0);
        track6.instantiate();
        let track7 = new Ramp();
        track7.position.copyFromFloats(0.15, -0.11, -0.1);
        track7.rotation.y = Math.PI;
        track7.instantiate();
        let track8 = new Turn();
        track8.position.copyFromFloats(-0.05, -0.13, -0.1);
        track8.rotation.y = Math.PI;
        track8.instantiate();
        let track9 = new Ramp();
        track9.position.copyFromFloats(-0.05, -0.13, 0);
        track9.instantiate();
        let track10 = new Turn();
        track10.position.copyFromFloats(0.15, -0.15, 0);
        track10.instantiate();
        let track11 = new Ramp();
        track11.position.copyFromFloats(0.15, -0.15, -0.1);
        track11.rotation.y = Math.PI;
        track11.instantiate();
        let track12 = new Turn();
        track12.position.copyFromFloats(-0.05, -0.17, -0.1);
        track12.rotation.y = Math.PI;
        track12.instantiate();
        requestAnimationFrame(() => {
            track.recomputeAbsolutePath();
            track2.recomputeAbsolutePath();
            track3.recomputeAbsolutePath();
            track4.recomputeAbsolutePath();
            track5.recomputeAbsolutePath();
            track6.recomputeAbsolutePath();
            track7.recomputeAbsolutePath();
            track8.recomputeAbsolutePath();
            track9.recomputeAbsolutePath();
            track10.recomputeAbsolutePath();
            track11.recomputeAbsolutePath();
            track12.recomputeAbsolutePath();
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
class TrackPoint {
    constructor(point, up = BABYLON.Vector3.Up()) {
        this.point = point;
        this.up = up;
    }
}
class Track extends BABYLON.Mesh {
    constructor() {
        super("track");
        this.wireSize = 0.002;
        this.wireGauge = 0.012;
    }
    generateWires() {
        console.log("X");
        this.wires = [
            new Wire(this),
            new Wire(this)
        ];
        for (let i = 0; i < this.trackPoints.length; i++) {
            let pPrev = this.trackPoints[i - 1] ? this.trackPoints[i - 1].point : undefined;
            let p = this.trackPoints[i].point;
            let pNext = this.trackPoints[i + 1] ? this.trackPoints[i + 1].point : undefined;
            if (!pPrev) {
                pPrev = p.subtract(pNext.subtract(p));
            }
            if (!pNext) {
                pNext = p.add(p.subtract(pPrev));
            }
            let dir = pNext.subtract(pPrev).normalize();
            let up = this.trackPoints[i].up;
            let rotation = BABYLON.Quaternion.Identity();
            Mummu.QuaternionFromZYAxisToRef(dir, up, rotation);
            let matrix = BABYLON.Matrix.Compose(BABYLON.Vector3.One(), rotation, p);
            this.wires[0].path[i] = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(-this.wireGauge * 0.5, 0, 0), matrix);
            this.wires[1].path[i] = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(this.wireGauge * 0.5, 0, 0), matrix);
        }
        console.log([...this.wires[0].path]);
        for (let n = 0; n < 3; n++) {
            Mummu.CatmullRomPathInPlace(this.wires[0].path);
            Mummu.CatmullRomPathInPlace(this.wires[1].path);
        }
    }
    recomputeAbsolutePath() {
        this.wires.forEach(wire => {
            wire.recomputeAbsolutePath();
        });
    }
    async instantiate() {
        await this.wires[0].instantiate();
        await this.wires[1].instantiate();
    }
}
class Ramp extends Track {
    constructor() {
        super();
        this.trackPoints = [
            new TrackPoint(new BABYLON.Vector3(0, 0, 0), BABYLON.Vector3.Up()),
            new TrackPoint(new BABYLON.Vector3(0.2, -0.02, 0), BABYLON.Vector3.Up())
        ];
        this.generateWires();
    }
}
class Turn extends Track {
    constructor() {
        super();
        let nMin = BABYLON.Vector3.Up();
        let nMax = (new BABYLON.Vector3(-4, 1, 0)).normalize();
        this.trackPoints = [
            new TrackPoint(new BABYLON.Vector3(0, 0, 0), BABYLON.Vector3.Lerp(nMin, nMax, 0)),
            new TrackPoint(new BABYLON.Vector3(0.05, -0.005, 0), BABYLON.Vector3.Lerp(nMin, nMax, 0.5)),
            new TrackPoint(new BABYLON.Vector3(0.085, 0, -0.015), BABYLON.Vector3.Lerp(nMin, nMax, 0.75)),
            new TrackPoint(new BABYLON.Vector3(0.1, 0, -0.05), BABYLON.Vector3.Lerp(nMin, nMax, 1)),
            new TrackPoint(new BABYLON.Vector3(0.085, 0, -0.085), BABYLON.Vector3.Lerp(nMin, nMax, 0.5)),
            new TrackPoint(new BABYLON.Vector3(0.05, 0.005, -0.1), BABYLON.Vector3.Lerp(nMin, nMax, 0.75)),
            new TrackPoint(new BABYLON.Vector3(0, 0, -0.1), BABYLON.Vector3.Lerp(nMin, nMax, 0))
        ];
        this.generateWires();
    }
}
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
