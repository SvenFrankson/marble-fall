/// <reference path="../lib/babylon.d.ts"/>
/// <reference path="../../nabu/nabu.d.ts"/>
/// <reference path="../../mummu/mummu.d.ts"/>

function addLine(text: string): void {
    let e = document.createElement("div");
    e.classList.add("debug-log");
    e.innerText = text;
    document.body.appendChild(e);
}

enum GameMode {
    MainMenu,
    Options,
    Credits,
    CreateMode,
    DemoMode
}

class Game {
    
    public static Instance: Game;

	public canvas: HTMLCanvasElement;
	public engine: BABYLON.Engine;
    public scene: BABYLON.Scene;
    public getScene(): BABYLON.Scene {
        return this.scene;
    }
    //public camera: BABYLON.FreeCamera;
    public camera: BABYLON.ArcRotateCamera;
    public light: BABYLON.HemisphericLight;
    public vertexDataLoader: Mummu.VertexDataLoader;
    public config: Configuration;

    public logo: Logo;
    public mainMenu: MainMenu;
    public optionsPage: OptionsPage;
    public creditsPage: CreditsPage;
    public toolbar: Toolbar;

    public cameraOrtho: boolean = false;

    public mainVolume: number = 0;
    public targetTimeFactor: number = 0.8;
    public timeFactor: number = 0.1;
    public physicDT: number = 0.0005;

    public machine: Machine;
    public trackEditor: TrackEditor;
    public machineEditor: MachineEditor;

    public skybox: BABYLON.Mesh;

    public steelMaterial: BABYLON.PBRMetallicRoughnessMaterial;
    public copperMaterial: BABYLON.PBRMetallicRoughnessMaterial;
    public woodMaterial: BABYLON.StandardMaterial;
    public leatherMaterial: BABYLON.StandardMaterial;
    public deepBlackMaterial: BABYLON.StandardMaterial;
    public handleMaterial: BABYLON.StandardMaterial;
    public handleMaterialActive: BABYLON.StandardMaterial;
    public handleMaterialHover: BABYLON.StandardMaterial;
    public insertHandleMaterial: BABYLON.StandardMaterial;
    public ghostMaterial: BABYLON.StandardMaterial;
    public cyanMaterial: BABYLON.StandardMaterial;
    public redMaterial: BABYLON.StandardMaterial;
    public greenMaterial: BABYLON.StandardMaterial;
    public blueMaterial: BABYLON.StandardMaterial;
    public uiMaterial: BABYLON.StandardMaterial;

    private _animateCamera = Mummu.AnimationFactory.EmptyNumbersCallback;
    private _animateCameraTarget = Mummu.AnimationFactory.EmptyVector3Callback;

    public helperShape: HelperShape;

    constructor(canvasElement: string) {
        Game.Instance = this;
        
		this.canvas = document.getElementById(canvasElement) as HTMLCanvasElement;
        this.canvas.requestPointerLock = this.canvas.requestPointerLock || this.canvas.msRequestPointerLock || this.canvas.mozRequestPointerLock || this.canvas.webkitRequestPointerLock;
		this.engine = new BABYLON.Engine(this.canvas, true);
		BABYLON.Engine.ShadersRepository = "./shaders/";

        let savedMainSound = window.localStorage.getItem("saved-main-volume");
        if (savedMainSound) {
            let v = parseFloat(savedMainSound);
            if (isFinite(v)) {
                this.mainVolume = Math.max(Math.min(v, 1), 0);
            }
        }
        let savedTimeFactor = window.localStorage.getItem("saved-time-factor");
        if (savedTimeFactor) {
            let v = parseFloat(savedTimeFactor);
            if (isFinite(v)) {
                this.targetTimeFactor = Math.max(Math.min(v, 1), 0);
            }
        }
	}

    public async createScene(): Promise<void> {
        this.scene = new BABYLON.Scene(this.engine);
        this.vertexDataLoader = new Mummu.VertexDataLoader(this.scene);
        this.config = new Configuration(this);
        this.config.initialize();

        this.scene.clearColor = BABYLON.Color4.FromHexString("#272b2e");
        //this.scene.clearColor = BABYLON.Color4.FromHexString("#00ff00");

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

        this.ghostMaterial = new BABYLON.StandardMaterial("ghost-material");
        this.ghostMaterial.diffuseColor.copyFromFloats(0.8, 0.8, 1);
        this.ghostMaterial.specularColor.copyFromFloats(0, 0, 0);
        this.ghostMaterial.alpha = 0.3;

        this.cyanMaterial = new BABYLON.StandardMaterial("cyan-material");
        this.cyanMaterial.diffuseColor = BABYLON.Color3.FromHexString("#00FFFF");
        this.cyanMaterial.specularColor.copyFromFloats(0, 0, 0);
        
        this.redMaterial = new BABYLON.StandardMaterial("red-material");
        this.redMaterial.diffuseColor = BABYLON.Color3.FromHexString("#bf212f");
        this.redMaterial.specularColor.copyFromFloats(0, 0, 0);
        
        this.greenMaterial = new BABYLON.StandardMaterial("green-material");
        this.greenMaterial.diffuseColor = BABYLON.Color3.FromHexString("#006f3c");
        this.greenMaterial.specularColor.copyFromFloats(0, 0, 0);
        
        this.blueMaterial = new BABYLON.StandardMaterial("blue-material");
        this.blueMaterial.diffuseColor = BABYLON.Color3.FromHexString("#264b96");
        this.blueMaterial.specularColor.copyFromFloats(0, 0, 0);

        this.uiMaterial = new BABYLON.StandardMaterial("ghost-material");
        this.uiMaterial.diffuseColor.copyFromFloats(1, 1, 1);
        this.uiMaterial.emissiveColor.copyFromFloats(1, 1, 1);
        this.uiMaterial.specularColor.copyFromFloats(0, 0, 0);

        this.steelMaterial = new BABYLON.PBRMetallicRoughnessMaterial("pbr", this.scene);
        this.steelMaterial.baseColor = new BABYLON.Color3(0.5, 0.75, 1.0);
        this.steelMaterial.metallic = 1.0;
        this.steelMaterial.roughness = 0.15;
        this.steelMaterial.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("./datas/environment/environmentSpecular.env", this.scene);
        
        this.copperMaterial = new BABYLON.PBRMetallicRoughnessMaterial("pbr", this.scene);
        this.copperMaterial.baseColor = BABYLON.Color3.FromHexString("#B87333");
        this.copperMaterial.metallic = 1.0;
        this.copperMaterial.roughness = 0.15;
        this.copperMaterial.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("./datas/environment/environmentSpecular.env", this.scene);

        this.woodMaterial = new BABYLON.StandardMaterial("wood-material");
        this.woodMaterial.diffuseColor.copyFromFloats(0.3, 0.3, 0.3);
        this.woodMaterial.diffuseTexture = new BABYLON.Texture("./datas/textures/wood-color.jpg");
        this.woodMaterial.ambientTexture = new BABYLON.Texture("./datas/textures/wood-ambient-occlusion.jpg");
        this.woodMaterial.specularTexture = new BABYLON.Texture("./datas/textures/wood-roughness.jpg");
        this.woodMaterial.specularColor.copyFromFloats(0.2, 0.2, 0.2);
        this.woodMaterial.bumpTexture = new BABYLON.Texture("./datas/textures/wood-normal-2.png");
        
        this.leatherMaterial = new BABYLON.StandardMaterial("wood-material");
        this.leatherMaterial.diffuseColor.copyFromFloats(0.05, 0.02, 0.02);
        this.leatherMaterial.specularColor.copyFromFloats(0.1, 0.1, 0.1);
        
        this.deepBlackMaterial = new BABYLON.StandardMaterial("deep-black-material");
        this.deepBlackMaterial.diffuseColor.copyFromFloats(0, 0, 0.);
        this.deepBlackMaterial.specularColor.copyFromFloats(0, 0, 0);

        this.skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 10 / Math.sqrt(3) }, this.scene);
        this.skybox.rotation.y = Math.PI / 2;
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
        this.skybox.material = skyboxMaterial;

        this.camera = new BABYLON.ArcRotateCamera("camera", 0, 0, 1, BABYLON.Vector3.Zero());
        this.camera.minZ = 0.01;
        this.camera.maxZ = 10;
        this.camera.wheelPrecision = 1000;
        this.camera.panningSensibility = 2000;
        this.camera.panningInertia *= 0.1;
        this.camera.lowerRadiusLimit = 0.05;
        this.camera.upperRadiusLimit = 1.5;
        this.camera.angularSensibilityX = 2000;
        this.camera.angularSensibilityY = 2000;
        this.camera.pinchPrecision = 10000;
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

        this._animateCamera = Mummu.AnimationFactory.CreateNumbers(this.camera, this.camera, ["alpha", "beta", "radius"], undefined, [true, true, false]);
        this._animateCameraTarget = Mummu.AnimationFactory.CreateVector3(this.camera, this.camera, "target");

        this.machine = new Machine(this);
        this.machineEditor = new MachineEditor(this);

        this.machine.deserialize(demo1);

        await this.machine.instantiate();
        await this.machine.generateBaseMesh();

        document.getElementById("track-editor-menu").style.display = "none";

        //this.makeScreenshot("split");
        //return;

        let screenshotButton = document.querySelector("#toolbar-screenshot") as HTMLButtonElement;
        screenshotButton.addEventListener("click", () => {
            this.makeCircuitScreenshot();
        });

        this.mode = GameMode.MainMenu;

        this.logo = new Logo(this);
        this.logo.initialize();
        this.logo.hide();

        this.mainMenu = new MainMenu(this);
        this.mainMenu.resize();
        this.mainMenu.hide();

        this.optionsPage = new OptionsPage(this);
        this.optionsPage.initialize();
        this.optionsPage.hide();

        this.creditsPage = new CreditsPage(this);
        this.creditsPage.hide();

        this.toolbar = new Toolbar(this);
        this.toolbar.initialize();
        this.toolbar.resize();

        let demos = [demo1, demo2, demo3];
        let container = document.getElementById("main-menu");
        let demoButtons = container.querySelectorAll(".panel.demo");
        for (let i = 0; i < demoButtons.length; i++) {
            let demo = demos[i];
            let buttonDemo = demoButtons[i] as HTMLDivElement;
            buttonDemo.onclick = async () => {
                this.machine.dispose();
                this.machine.deserialize(demo);
                await this.machine.instantiate();
                await this.machine.generateBaseMesh();
                this.setPageMode(GameMode.DemoMode);
            }
        }
        let buttonCreate = container.querySelector(".panel.create") as HTMLDivElement;
        buttonCreate.onclick = () => {
            this.setPageMode(GameMode.CreateMode);
        }
        let buttonOption = container.querySelector(".panel.option") as HTMLDivElement;
        buttonOption.onclick = () => {
            this.setPageMode(GameMode.Options);
        }
        let buttonCredit = container.querySelector(".panel.credit") as HTMLDivElement;
        buttonCredit.onclick = () => {
            this.setPageMode(GameMode.Credits);
        }
        this.setPageMode(GameMode.MainMenu);
	}

	public animate(): void {
		this.engine.runRenderLoop(() => {
			this.scene.render();
			this.update();
		});

		window.addEventListener("resize", () => {
			this.engine.resize();
            this.toolbar.resize();
            this.mainMenu.resize();
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

        window.localStorage.setItem("saved-main-volume", this.mainVolume.toFixed(2));
        window.localStorage.setItem("saved-time-factor", this.targetTimeFactor.toFixed(2));

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

        if (this.mode === GameMode.MainMenu) {
            this.camera.target.x = 0;
            this.camera.target.y = 0;
        }
        this.camera.target.z = 0;

        if (this.machineEditor) {
            this.machineEditor.update();
        }
        if (this.machine) {
            this.machine.update();
        }

        let dt = this.scene.deltaTime / 1000;
        let fps = 1 / dt;
        if (fps < 30) {
            this.timeFactor *= 0.9;
        }
        else {
            this.timeFactor = this.timeFactor * 0.9 + this.targetTimeFactor * 0.1;
        }
    }

    public async setPageMode(mode: GameMode): Promise<void> {
        this.machineEditor.dispose();
        if (mode === GameMode.MainMenu) {
            await this.optionsPage.hide();
            await this.creditsPage.hide();
            
            this.logo.show();
            await this.mainMenu.show();
        }
        if (mode === GameMode.Options) {
            await this.mainMenu.hide();
            await this.creditsPage.hide();
            
            this.logo.show();
            await this.optionsPage.show();
        }
        if (mode === GameMode.Credits) {
            await this.mainMenu.hide();
            await this.optionsPage.hide();
            
            this.logo.show();
            await this.creditsPage.show();
        }
        if (mode === GameMode.CreateMode) {
            this.logo.hide();
            await this.mainMenu.hide();
            await this.optionsPage.hide();
            await this.creditsPage.hide();
            
            this.machineEditor.instantiate();
        }
        if (mode === GameMode.DemoMode) {
            this.logo.hide();
            await this.mainMenu.hide();
            await this.optionsPage.hide();
            await this.creditsPage.hide();
        }
        this.mode = mode;
        this.toolbar.resize();
    }

    public mode: GameMode;
    public async setContextOld(mode: GameMode, demoIndex?: number): Promise<void> {
        return;
        if (this.mode != mode) {
            if (this.mode === GameMode.MainMenu) {
                this.mainMenu.hide();
                this.logo.hide();
            }
            else if (this.mode === GameMode.CreateMode) {
                this.machineEditor.dispose();
            }

            this.mode = mode;
            
            if (this.mode === GameMode.MainMenu) {
                this.machine.dispose();
                this.machine.deserialize(demoLoops);
                await this.machine.instantiate();
                await this.machine.generateBaseMesh();
                this.machine.play();

                //this.tileMenuContainer.position.y = 0;
                //this.tileMenuContainer.position.z = - 0.03;
                this.mainMenu.show();
                this.mainMenu.resize();
                this.logo.show();

                this.setCameraTarget(BABYLON.Vector3.Zero());
                await this.setCameraAlphaBeta(- Math.PI * 0.5, Math.PI * 0.5, 0.35 * 0.8 / this.getCameraMinFOV());
                this.camera.lowerAlphaLimit = - Math.PI * 0.65;
                this.camera.upperAlphaLimit = - Math.PI * 0.35;
                this.camera.lowerBetaLimit = Math.PI * 0.35;
                this.camera.upperBetaLimit = Math.PI * 0.65;
            }
            else if (this.mode === GameMode.CreateMode) {
                this.machine.dispose();
                this.machine.deserialize(demoLoops);
                await this.machine.instantiate();
                await this.machine.generateBaseMesh();
                this.machine.stop();

                this.setCameraTarget(BABYLON.Vector3.Zero());
                await this.setCameraAlphaBeta(- Math.PI * 0.5, Math.PI * 0.5, 0.8 * 0.8 / this.getCameraMinFOV());
                this.camera.lowerAlphaLimit = - Math.PI * 0.95;
                this.camera.upperAlphaLimit = - Math.PI * 0.05;
                this.camera.lowerBetaLimit = Math.PI * 0.05;
                this.camera.upperBetaLimit = Math.PI * 0.95;

                this.machineEditor.instantiate();
            }
            else if (this.mode === GameMode.DemoMode) {
                if (demoIndex === 1) {
                    this.setCameraTarget(BABYLON.Vector3.Zero());
                }
                else if (demoIndex === 2) {
                    this.setCameraTarget(new BABYLON.Vector3(0.08, 0.09, 0));
                }
                else if (demoIndex === 3) {
                    this.setCameraTarget(new BABYLON.Vector3(-0.33, -0.17, 0));
                }
                else {
                    this.setCameraTarget(BABYLON.Vector3.Zero());
                }
                await this.setCameraAlphaBeta(- Math.PI * 0.5, Math.PI * 0.5, 0.8 * 0.8 / this.getCameraMinFOV());
                this.camera.lowerAlphaLimit = - Math.PI * 0.95;
                this.camera.upperAlphaLimit = - Math.PI * 0.05;
                this.camera.lowerBetaLimit = Math.PI * 0.05;
                this.camera.upperBetaLimit = Math.PI * 0.95;
            }
            this.toolbar.resize();
        }
    }

    public async setCameraAlphaBeta(alpha: number, beta: number, radius?: number): Promise<void> {
        if (!radius) {
            radius = this.camera.radius;
        }
        await this._animateCamera([alpha, beta, radius], 0.8);
    }

    public async setCameraTarget(target: BABYLON.Vector3): Promise<void> {
        await this._animateCameraTarget(target, 0.8);
    }

    public async makeScreenshot(objectName: string): Promise<void> {
        this.machine.baseWall.isVisible = false;
        this.machine.baseFrame.isVisible = false;
        this.skybox.isVisible = false;
        
        this.camera.alpha = - 0.8 * Math.PI / 2;
        this.camera.beta = 0.75 * Math.PI / 2;

        return new Promise<void>(resolve => {
            requestAnimationFrame(async () => {
                this.machine.dispose();
                let track: MachinePart; 
                let ball: Ball; 
                if (objectName === "ball") {
                    ball = new Ball(BABYLON.Vector3.Zero(), this.machine);
                    this.camera.target.copyFromFloats(0, 0, 0);
                    this.camera.radius = 0.1;
                }
                else {
                    track = this.machine.trackFactory.createTrack(objectName, 0, 0);
                    this.camera.radius = 0.25 + Math.max(0.15 * (track.w - 1), 0);
                    this.camera.target.copyFromFloats(tileWidth * ((track.w - 1) * 0.55), - tileHeight * (track.h) * 0.5, 0);
                }

                if (objectName === "spiral") {
                    this.camera.target.x -= tileWidth * 0.1;
                    this.camera.target.y -= tileHeight * 0.6;
                    this.camera.radius += 0.1;
                }

                if (track) {
                    this.machine.parts = [track];
                }
                if (ball) {
                    this.machine.balls = [ball];
                }
                await this.machine.instantiate();

                requestAnimationFrame(async () => {
                    await Mummu.MakeScreenshot({ miniatureName: objectName });
                    resolve();
                });
            });
        });
    }

    public async makeCircuitScreenshot(): Promise<void> {
        this.machine.baseWall.isVisible = false;
        this.machine.baseFrame.isVisible = false;
        this.skybox.isVisible = false;
        this.scene.clearColor.copyFromFloats(0, 0, 0, 0);
        

        let encloseStart = this.machine.getEncloseStart();
        let encloseEnd = this.machine.getEncloseEnd();
        this.camera.target = encloseStart.add(encloseEnd).scale(0.5);
        this.camera.alpha = - 0.9 * Math.PI / 2;
        this.camera.beta = 0.8 * Math.PI / 2;
        let size = BABYLON.Vector3.Distance(encloseStart, encloseEnd);
        this.camera.radius = 1.25 * size;

        return new Promise<void>(resolve => {
            requestAnimationFrame(async () => {
                await Mummu.MakeScreenshot({ miniatureName: "circuit", size: 512, outlineWidth: 2 });
                this.machine.baseWall.isVisible = true;
                this.machine.baseFrame.isVisible = true;
                this.skybox.isVisible = true;
                this.scene.clearColor = BABYLON.Color4.FromHexString("#272b2e");
                resolve();
            });
        });
    }

    public getCameraMinFOV(): number {
        let ratio = this.engine.getRenderWidth() / this.engine.getRenderHeight();
        let fov = this.camera.fov;
        if (ratio > 1) {
            return fov;
        }
        return fov * ratio;
    }

    public getCameraZoomFactor(): number {
        let f = 1 - (this.camera.radius - this.camera.lowerRadiusLimit) / (this.camera.upperRadiusLimit - this.camera.lowerRadiusLimit);
        return f * f;
    }

    public setCameraZoomFactor(v: number) {
        let f = Math.sqrt(v);
        this.camera.radius = (1 - f) * (this.camera.upperRadiusLimit - this.camera.lowerRadiusLimit) + this.camera.lowerRadiusLimit;
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