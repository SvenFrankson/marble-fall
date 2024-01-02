class Ball extends BABYLON.Mesh {
    constructor() {
        super("ball");
        this.size = 0.014;
        this.velocity = BABYLON.Vector3.Zero();
        this.update = () => {
            let m = this.mass;
            let dt = 0.015;
            dt = dt / 8;
            let weight = new BABYLON.Vector3(0, -9 * m, 0);
            let a = weight.scaleInPlace(1 / m);
            this.velocity.addInPlace(a.scale(dt));
            this.position.addInPlace(this.velocity.scale(dt));
            Wire.Instances.forEach(wire => {
                let col = Mummu.SphereCapsuleIntersection(this.position, this.radius, wire.path[0], wire.path[1], wire.size * 0.5);
                if (col.hit) {
                    this.position.addInPlace(col.normal.scale(col.depth));
                }
            });
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
        this.camera.speed = 0.1;
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
        let ball = new Ball();
        ball.instantiate();
        let track = new Track();
        track.position.copyFromFloats(-0.05, -0.05, 0);
        track.instantiate();
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
class Track extends BABYLON.Mesh {
    constructor() {
        super("track");
        this.wires = [
            new Wire(),
            new Wire()
        ];
    }
    async instantiate() {
        this.wires[0].path = [new BABYLON.Vector3(0, 0, 0.005), new BABYLON.Vector3(0.5, -0.05, 0.005)];
        this.wires[1].path = [new BABYLON.Vector3(0, 0, -0.005), new BABYLON.Vector3(0.5, -0.05, -0.005)];
        this.wires.forEach(wire => {
            wire.path.forEach(point => {
                point.addInPlace(this.position);
            });
        });
        await this.wires[0].instantiate();
        await this.wires[1].instantiate();
    }
}
class Wire extends BABYLON.Mesh {
    constructor() {
        super("wire");
        this.path = [];
        this.size = 0.002;
        this.rotationQuaternion = BABYLON.Quaternion.Identity();
        Wire.Instances.push(this);
    }
    async instantiate() {
        let dir = this.path[1].subtract(this.path[0]).normalize();
        let l = BABYLON.Vector3.Distance(this.path[0], this.path[1]);
        let data = BABYLON.CreateCylinderVertexData({ diameter: this.size, height: l });
        data.applyToMesh(this);
        this.position.copyFrom(this.path[0]).addInPlace(this.path[1]).scaleInPlace(0.5);
        Mummu.QuaternionFromYZAxisToRef(dir, BABYLON.Axis.Y, this.rotationQuaternion);
    }
}
Wire.Instances = new Nabu.UniqueList();
