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
    public camera: BABYLON.FreeCamera;
    public light: BABYLON.HemisphericLight;
    public vertexDataLoader: Mummu.VertexDataLoader;

    public timeFactor: number = 0.1;
    public physicDT: number = 0.0005;

    public handleMaterial: BABYLON.StandardMaterial;
    public handleMaterialActive: BABYLON.StandardMaterial;
    
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

        this.camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(-9.5, -23, 13.5));
        this.camera.speed = 0.05;
        this.camera.minZ = 0.01;
        this.camera.maxZ = 10;
        (this.camera as BABYLON.FreeCamera).rotation.x = 1;
        (this.camera as BABYLON.FreeCamera).rotation.y = 1;
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
            (this.camera as BABYLON.FreeCamera).rotation.x = rot.x;
            (this.camera as BABYLON.FreeCamera).rotation.y = rot.y;
            (this.camera as BABYLON.FreeCamera).rotation.z = rot.z;
        }
        this.camera.attachControl();
        this.camera.getScene();

        let ball = new Ball(this);
        ball.position.x = - 0.05;
        ball.position.y = 0.1;
        ball.instantiate();

        let track = new FlatLoop(this, 0, 0);
        track.instantiate();

        let track2 = new FlatLoop(this, 1, 0);
        track2.instantiate();

        let track3 = new FlatLoop(this, 2, 0);
        track3.instantiate();

        let track4 = new FlatLoop(this, 3, 0);
        track4.instantiate();
        
        let track5 = new FlatLoop(this, 4, 0);
        track5.instantiate();

        let track6 = new FlatLoop(this, 5, 0);
        track6.instantiate();

        let track7 = new FlatLoop(this, 6, 0);
        track7.instantiate();
        
        let track8 = new FlatLoop(this, 7, 0);
        track8.instantiate();

        let track9 = new FlatLoop(this, 8, 0);
        track9.instantiate();

        /*
        let track3 = new Ramp(this);
        track3.position.copyFromFloats(0.15, -0.07, -0.1);
        track3.rotation.y = Math.PI;
        track3.instantiate();

        let track4 = new Turn(this);
        track4.position.copyFromFloats(-0.05, -0.09, -0.1);
        track4.rotation.y = Math.PI;
        track4.instantiate();

        let track5 = new Ramp(this);
        track5.position.copyFromFloats(-0.05, -0.09, 0);
        track5.instantiate();

        let track6 = new Turn(this);
        track6.position.copyFromFloats(0.15, -0.11, 0);
        track6.instantiate();

        let track7 = new Ramp(this);
        track7.position.copyFromFloats(0.15, -0.11, -0.1);
        track7.rotation.y = Math.PI;
        track7.instantiate();

        let track8 = new Turn(this);
        track8.position.copyFromFloats(-0.05, -0.13, -0.1);
        track8.rotation.y = Math.PI;
        track8.instantiate();

        let track9 = new Ramp(this);
        track9.position.copyFromFloats(-0.05, -0.13, 0);
        track9.instantiate();

        let track10 = new Turn(this);
        track10.position.copyFromFloats(0.15, -0.15, 0);
        track10.instantiate();

        let track11 = new Ramp(this);
        track11.position.copyFromFloats(0.15, -0.15, -0.1);
        track11.rotation.y = Math.PI;
        track11.instantiate();

        let track12 = new Turn(this);
        track12.position.copyFromFloats(-0.05, -0.17, -0.1);
        track12.rotation.y = Math.PI;
        track12.instantiate();
        */

        requestAnimationFrame(() => {
            track.recomputeAbsolutePath();
            track.showHandles();
            track2.recomputeAbsolutePath();
            track3.recomputeAbsolutePath();
            track4.recomputeAbsolutePath();
            track5.recomputeAbsolutePath();
            track6.recomputeAbsolutePath();
            track7.recomputeAbsolutePath();
            track8.recomputeAbsolutePath();
            track9.recomputeAbsolutePath();
            /*
            track10.recomputeAbsolutePath();
            track11.recomputeAbsolutePath();
            track12.recomputeAbsolutePath();
            */
        })
	}

    public download(filename: string, text: string) {
        var e = document.createElement('a');
        e.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        e.setAttribute('download', filename);
      
        e.style.display = 'none';
        document.body.appendChild(e);
        e.click();
        document.body.removeChild(e);
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
        let rot = (this.camera as BABYLON.FreeCamera).rotation;
        window.localStorage.setItem("saved-rot", JSON.stringify({ x: rot.x, y: rot.y, z: rot.z }));
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