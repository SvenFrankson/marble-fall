/// <reference path="../lib/babylon.d.ts"/>
/// <reference path="../../nabu/nabu.d.ts"/>
/// <reference path="../../mummu/mummu.d.ts"/>

function addLine(text: string): void {
    let e = document.createElement("div");
    e.classList.add("debug-log");
    e.innerText = text;
    document.body.appendChild(e);
}

class Game {
    
    public static Instance: Game;

	public canvas: HTMLCanvasElement;
	public engine: BABYLON.Engine;
    public scene: BABYLON.Scene;
    //public camera: BABYLON.FreeCamera;
    public camera: BABYLON.ArcRotateCamera;
    public light: BABYLON.HemisphericLight;
    public vertexDataLoader: Mummu.VertexDataLoader;

    public cameraOrtho: boolean = true;

    public timeFactor: number = 0.6;
    public physicDT: number = 0.0005;

    public tracks: Track[] = [];
    public trackEditor: TrackEditor;

    public steelMaterial: BABYLON.PBRMetallicRoughnessMaterial;
    public handleMaterial: BABYLON.StandardMaterial;
    public handleMaterialActive: BABYLON.StandardMaterial;
    public handleMaterialHover: BABYLON.StandardMaterial;
    public insertHandleMaterial: BABYLON.StandardMaterial;
    
    constructor(canvasElement: string) {
        Game.Instance = this;
        
		this.canvas = document.getElementById(canvasElement) as HTMLCanvasElement;
        this.canvas.requestPointerLock = this.canvas.requestPointerLock || this.canvas.msRequestPointerLock || this.canvas.mozRequestPointerLock || this.canvas.webkitRequestPointerLock;
		this.engine = new BABYLON.Engine(this.canvas, true);
		BABYLON.Engine.ShadersRepository = "./shaders/";
	}

    public async createScene(): Promise<void> {
        this.scene = new BABYLON.Scene(this.engine);
        this.vertexDataLoader = new Mummu.VertexDataLoader(this.scene);

        this.scene.clearColor = BABYLON.Color4.FromHexString("#66b0ff");

        this.light = new BABYLON.HemisphericLight("light", (new BABYLON.Vector3(- 1, 3, 2)).normalize(), this.scene);

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

        this.camera = new BABYLON.ArcRotateCamera("camera", 0, 0, 1, BABYLON.Vector3.Zero());
        this.camera.speed = 0.05;
        this.camera.minZ = 0.01;
        this.camera.maxZ = 10;
        this.camera.wheelPrecision = 1000;
        this.camera.panningSensibility = 100000;
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
        let savedTarget = window.localStorage.getItem("saved-target");
        if (savedTarget) {
            let target = JSON.parse(savedTarget);
            this.camera.target.x = target.x;
            this.camera.target.y = target.y;
            this.camera.target.z = target.z;
        }
        this.camera.attachControl();
        this.camera.getScene();

        let ball = new Ball(this);
        ball.position.x = - 0.05;
        ball.position.y = 0.1;
        ball.instantiate();

        document.getElementById("reset").addEventListener("click", () => {
            ball.position.copyFromFloats(-0.05, 0.1, 0);
            ball.velocity.copyFromFloats(0, 0, 0);
        })

        this.tracks = [];
        for (let n = 0; n < 4; n++) {
            let track = new FlatLoop(this, 2 * n, 0);
            track.instantiate();
            this.tracks.push(track);
    
            let track2 = new FlatLoop(this, 2 * n + 1, 0);
            track2.instantiate();
            this.tracks.push(track2);
        }
    
        let track3 = new DefaultLLTrack(this, 0, 1, true);
        track3.instantiate();
        this.tracks.push(track3);

        requestAnimationFrame(() => {
            this.tracks.forEach(track => {
                track.recomputeAbsolutePath();
            })
            this.trackEditor = new TrackEditor(this);
            this.trackEditor.initialize();
        })
	}

	public animate(): void {
		this.engine.runRenderLoop(() => {
			this.scene.render();
			this.update();
		});

		window.addEventListener("resize", () => {
			this.engine.resize();
		});
	}

    public async initialize(): Promise<void> {
        
    }

    public update(): void {
        let pos = this.camera.position;
        window.localStorage.setItem("saved-pos", JSON.stringify({ x: pos.x, y: pos.y, z: pos.z }));
        //let rot = (this.camera as BABYLON.FreeCamera).rotation;
        //window.localStorage.setItem("saved-rot", JSON.stringify({ x: rot.x, y: rot.y, z: rot.z }));
        let target = this.camera.target;
        window.localStorage.setItem("saved-target", JSON.stringify({ x: target.x, y: target.y, z: target.z }));

        if (this.cameraOrtho) {
            let ratio = this.engine.getRenderWidth() / this.engine.getRenderHeight();
            let f = this.camera.radius / 4;
            this.camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
            this.camera.orthoTop = 1 * f;
            this.camera.orthoBottom = - 1 * f;
            this.camera.orthoLeft = - ratio * f;
            this.camera.orthoRight = ratio * f;
        }
        else {
            this.camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
        }
    }
}

window.addEventListener("DOMContentLoaded", () => {
    //addLine("Kulla Test Scene");

    let main: Game = new Game("render-canvas");
    main.createScene();
    main.initialize().then(() => {
        main.animate();
    });
});