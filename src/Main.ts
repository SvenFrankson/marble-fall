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

    public cameraOrtho: boolean = false;

    public timeFactor: number = 1;
    public physicDT: number = 0.001;

    public machine: Machine;
    public trackEditor: TrackEditor;

    public steelMaterial: BABYLON.PBRMetallicRoughnessMaterial;
    public handleMaterial: BABYLON.StandardMaterial;
    public handleMaterialActive: BABYLON.StandardMaterial;
    public handleMaterialHover: BABYLON.StandardMaterial;
    public insertHandleMaterial: BABYLON.StandardMaterial;

    public machineEditorContainer: HTMLDivElement;
    
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

        this.light = new BABYLON.HemisphericLight("light", (new BABYLON.Vector3(2, 2, - 2)).normalize(), this.scene);

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
        let skyboxMaterial: BABYLON.StandardMaterial = new BABYLON.StandardMaterial("skyBox", this.scene);
        skyboxMaterial.backFaceCulling = false;
        let skyTexture = new BABYLON.CubeTexture(
            "./datas/skyboxes/skybox",
            this.scene,
            ["_px.jpg", "_py.jpg", "_pz.jpg", "_nx.jpg", "_ny.jpg", "_nz.jpg"]);
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

        this.machineEditorContainer = document.getElementById("machine-editor-menu") as HTMLDivElement;

        this.machine = new Machine(this);

        this.machine.balls = [];
        for (let n = 0; n < 6; n++) {
            let ball = new Ball(new BABYLON.Vector3(- tileWidth * 0.5 * 0.9 + tileWidth * 0.5 * 0.4 * n, 0.008 - 0.001 * n, 0), this.machine);
            ball.instantiate();
            this.machine.balls.push(ball);
        }
        
        /*
        this.tracks = [
            new Ramp(this, 0, 0, 2, 1),
            new Spiral(this, 2, 1),
            new UTurn(this, 3, 4),
            new Spiral(this, 2, 5, true),
            new Loop(this, 0, 8, true),
            new UTurn(this, -1, 11, true),
            new Ramp(this, 0, 12, 2, 1),
            new CrossingRamp(this, 2, 12, 2, 1, true),
            new Snake(this, 4, 12),
            new CrossingFlat(this, 6, 12, 2),
            new UTurnLarge(this, 8, 13),
            new Ramp(this, 6, 14, 2, 1, true),
            new UTurn(this, 5, 15, true),
            new UTurn(this, 6, 16),
            new UTurn(this, 5, 17, true),
            new UTurn(this, 6, 18),
            new UTurn(this, 5, 19, true),
            new UTurn(this, 6, 20),
            new UTurn(this, 5, 21, true),
            new UTurn(this, 6, 22),
            new UTurn(this, 5, 23, true),
            new UTurn(this, 6, 24),
            new UTurn(this, 5, 25, true),
            new UTurn(this, 6, 26),
            new UTurn(this, 5, 27, true),
            new UTurn(this, 6, 28),
            new UTurn(this, 5, 29, true),
            new UTurn(this, 6, 30),
        ];
        */
       
        this.machine.tracks = [
            new Ramp(this.machine, -1, 0, 3, 1),
            new ElevatorBottom(this.machine, 2, -5, 6),
            new ElevatorTop(this.machine, 2, -5),
            new Spiral(this.machine, 1, -4, true),
            new Flat(this.machine, -1, -1, 2),
            new UTurn(this.machine, -2, -1, true)
        ];

        let menu = new BABYLON.Mesh("menu");
        menu.position.y += 0.1;
        menu.position.z = -0.02;

        let tileDemo1 = new MenuTile("tile-demo-1", 0.05, 0.075, this);
        tileDemo1.texture.drawText("DEMO", 52, 120, "64px 'Serif'", "white", "black");
        tileDemo1.texture.drawText("I", 129, 270, "128px 'Serif'", "white", null);
        tileDemo1.instantiate();
        tileDemo1.position.x = - 0.09;
        tileDemo1.position.y = 0.01;
        tileDemo1.parent = menu;

        let tileDemo2 = new MenuTile("tile-demo-2", 0.05, 0.075, this);
        tileDemo2.texture.drawText("DEMO", 52, 120, "64px 'Serif'", "white", "black");
        tileDemo2.texture.drawText("II", 107, 270, "128px 'Serif'", "white", null);
        tileDemo2.instantiate();
        tileDemo2.position.y = 0.03;
        tileDemo2.parent = menu;
        
        let tileDemo3 = new MenuTile("tile-demo-3", 0.05, 0.075, this);
        tileDemo3.texture.drawText("DEMO", 52, 120, "64px 'Serif'", "white", "black");
        tileDemo3.texture.drawText("III", 86, 270, "128px 'Serif'", "white", null);
        tileDemo3.instantiate();
        tileDemo3.position.x = 0.09;
        tileDemo3.position.y = 0.01;
        tileDemo3.parent = menu;
        
        let tileCreate = new MenuTile("tile-create", 0.12, 0.05, this);
        tileCreate.texture.drawText("CREATE", 70, 180, "100px 'Serif'", "white", "black");
        tileCreate.instantiate();
        tileCreate.position.x = - 0.07;
        tileCreate.position.y = - 0.075;
        tileCreate.parent = menu;
        
        let tileLoad = new MenuTile("tile-load", 0.1, 0.04, this);
        tileLoad.texture.drawText("LOAD", 70, 150, "100px 'Serif'", "white", "black");
        tileLoad.instantiate();
        tileLoad.position.x = 0.07;
        tileLoad.position.y = - 0.075;
        tileLoad.parent = menu;
        
        let tileCredit = new MenuTile("tile-credit", 0.08, 0.025, this);
        tileCredit.texture.drawText("CREDIT", 70, 100, "70px 'Serif'", "white", "black");
        tileCredit.instantiate();
        tileCredit.position.x = 0.07;
        tileCredit.position.y = - 0.14;
        tileCredit.parent = menu;

        this.machine.instantiate();
        this.machine.generateBaseMesh();

        document.getElementById("track-editor-menu").style.display = "none";
        //this.trackEditor = new TrackEditor(this);
        //this.trackEditor.initialize();

        setTimeout(() => {
            let data = this.machine.serialize();
            this.machine.dispose();
            setTimeout(() => {
                this.machine.deserialize(data);
                this.machine.instantiate();
                
            }, 5000);
        }, 5000);
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
        let pos = this.camera.globalPosition;
        window.localStorage.setItem("saved-pos", JSON.stringify({ x: pos.x, y: pos.y, z: pos.z }));
        //let rot = (this.camera as BABYLON.FreeCamera).rotation;
        //window.localStorage.setItem("saved-rot", JSON.stringify({ x: rot.x, y: rot.y, z: rot.z }));
        let target = this.camera.target;
        window.localStorage.setItem("saved-target", JSON.stringify({ x: target.x, y: target.y, z: target.z }));
        window.localStorage.setItem("saved-cam-ortho", this.cameraOrtho ? "true" : "false");

        let ratio = this.engine.getRenderWidth() / this.engine.getRenderHeight();
        if (this.cameraOrtho) {
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

        if (ratio > 1) {
            this.machineEditorContainer.classList.add("left");
            this.machineEditorContainer.classList.remove("bottom");
        }
        else {
            this.machineEditorContainer.classList.add("bottom");
            this.machineEditorContainer.classList.remove("left");
        }

        this.machine.update();
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