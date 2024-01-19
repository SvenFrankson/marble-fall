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
    CreateMode,
    DemoMode,
    Credit
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
    public toolbar: Toolbar;

    public cameraOrtho: boolean = false;

    public mainSound: number = 0;
    public targetTimeFactor: number = 0.8;
    public timeFactor: number = 0.1;
    public physicDT: number = 0.001;

    public machine: Machine;
    public trackEditor: TrackEditor;
    public machineEditor: MachineEditor;

    public tileMenuContainer: BABYLON.Mesh;
    public tileDemo1: MenuTile;
    public tileDemo2: MenuTile;
    public tileDemo3: MenuTile;
    public tileCreate: MenuTile;
    public tileCredit: MenuTile;
    public tiles: MenuTile[];

    public skybox: BABYLON.Mesh;

    public steelMaterial: BABYLON.PBRMetallicRoughnessMaterial;
    public woodMaterial: BABYLON.StandardMaterial;
    public leatherMaterial: BABYLON.StandardMaterial;
    public deepBlackMaterial: BABYLON.StandardMaterial;
    public handleMaterial: BABYLON.StandardMaterial;
    public handleMaterialActive: BABYLON.StandardMaterial;
    public handleMaterialHover: BABYLON.StandardMaterial;
    public insertHandleMaterial: BABYLON.StandardMaterial;
    public ghostMaterial: BABYLON.StandardMaterial;

    private _animateCamera = Mummu.AnimationFactory.EmptyNumbersCallback;
    private _animateCameraTarget = Mummu.AnimationFactory.EmptyVector3Callback;

    public helperShape: HelperShape;

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

        this.scene.clearColor = BABYLON.Color4.FromHexString("#272b2e");

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

        this.steelMaterial = new BABYLON.PBRMetallicRoughnessMaterial("pbr", this.scene);
        this.steelMaterial.baseColor = new BABYLON.Color3(0.5, 0.75, 1.0);
        this.steelMaterial.metallic = 1.0; // set to 1 to only use it from the metallicRoughnessTexture
        this.steelMaterial.roughness = 0.15; // set to 1 to only use it from the metallicRoughnessTexture
        this.steelMaterial.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("./datas/environment/environmentSpecular.env", this.scene);

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

        let blackboardTex = document.getElementById("blackboard-tex") as HTMLImageElement;

        this.tileMenuContainer = new BABYLON.Mesh("menu");
        this.tileMenuContainer.position.y = - 10;
        this.tileMenuContainer.position.z = 1;

        this.tileDemo1 = new MenuTile("tile-demo-1", 0.05, 0.075, this);
        await this.tileDemo1.instantiate();
        this.tileDemo1.position.x = - 0.09;
        this.tileDemo1.position.y = 0.055;
        this.tileDemo1.parent = this.tileMenuContainer;

        this.tileDemo2 = new MenuTile("tile-demo-2", 0.05, 0.075, this);
        await this.tileDemo2.instantiate();
        this.tileDemo2.position.y = 0.075;
        this.tileDemo2.parent = this.tileMenuContainer;
        
        this.tileDemo3 = new MenuTile("tile-demo-3", 0.05, 0.075, this);
        await this.tileDemo3.instantiate();
        this.tileDemo3.position.x = 0.09;
        this.tileDemo3.position.y = 0.055;
        this.tileDemo3.parent = this.tileMenuContainer;
        
        this.tileCreate = new MenuTile("tile-create", 0.16, 0.05, this);
        await this.tileCreate.instantiate();
        this.tileCreate.position.x = 0;
        this.tileCreate.position.y = - 0.03;
        this.tileCreate.parent = this.tileMenuContainer;
        
        this.tileCredit = new MenuTile("tile-credit", 0.08, 0.025, this);
        await this.tileCredit.instantiate();
        this.tileCredit.position.x = 0.07;
        this.tileCredit.position.y = -0.09;
        this.tileCredit.parent = this.tileMenuContainer;
        
        let creditPlaque = new MenuTile("credit-plaque", 0.2, 0.15, this);
        await creditPlaque.instantiate();
        (creditPlaque.material as BABYLON.StandardMaterial).emissiveColor.copyFromFloats(1, 1, 1);
        creditPlaque.position.x = 0;
        creditPlaque.position.y = 0;
        creditPlaque.position.z = 0.13;
        creditPlaque.rotation.y = Math.PI;

        this.tiles = [this.tileDemo1, this.tileDemo2, this.tileDemo3, this.tileCreate, this.tileCredit];

        let doDrawTileMenuTextures = () => {
            let ctx = this.tileDemo1.texture.getContext();
            let w = this.tileDemo1.texW;
            let h = this.tileDemo1.texH;
            ctx.drawImage(blackboardTex, 0, 0);
            this.tileDemo1.texture.drawText("DEMO", 52, 120, "64px 'Serif'", "white", null);
            this.tileDemo1.texture.drawText("I", 129, 270, "128px 'Serif'", "white", null);
            
            ctx = this.tileDemo2.texture.getContext();
            w = this.tileDemo2.texW;
            h = this.tileDemo2.texH;
            ctx.drawImage(blackboardTex, 100, 150, w, h, 0, 0, w, h);
            this.tileDemo2.texture.drawText("DEMO", 52, 120, "64px 'Serif'", "white", null);
            this.tileDemo2.texture.drawText("II", 107, 270, "128px 'Serif'", "white", null);
            
            ctx = this.tileDemo3.texture.getContext();
            w = this.tileDemo3.texW;
            h = this.tileDemo3.texH;
            ctx.drawImage(blackboardTex, 50, 200, w, h, 0, 0, w, h);
            this.tileDemo3.texture.drawText("DEMO", 52, 120, "64px 'Serif'", "white", null);
            this.tileDemo3.texture.drawText("III", 86, 270, "128px 'Serif'", "white", null);
            
            ctx = this.tileCreate.texture.getContext();
            w = this.tileCreate.texW;
            h = this.tileCreate.texH;
            ctx.drawImage(blackboardTex, 200, 300, w, h, 0, 0, w, h);
            this.tileCreate.texture.drawText("CREATE", 70, 140, "100px 'Serif'", "white", null);
            this.tileCreate.texture.drawText("your own machine", 70, 230, "60px 'Serif'", "#8a8674", null);
            
            ctx = this.tileCredit.texture.getContext();
            w = this.tileCredit.texW;
            h = this.tileCredit.texH;
            ctx.drawImage(blackboardTex, 80, 200, w, h, 0, 0, w, h);
            this.tileCredit.texture.drawText("CREDIT", 70, 100, "70px 'Serif'", "white", null);
            
            ctx = creditPlaque.texture.getContext();
            w = creditPlaque.texW;
            h = creditPlaque.texH;
            ctx.drawImage(blackboardTex, 80, 200, w, h, 0, 0, w, h);
            creditPlaque.texture.drawText("DESIGN, ART & CODE", 140, 200, "70px 'Serif'", "white", null);
            creditPlaque.texture.drawText("Sven Frankson", 70, 300, "70px 'Serif'", "white", null);
            creditPlaque.texture.drawText("Powered by BABYLONJS", 70, 450, "50px 'Serif'", "white", null);
            creditPlaque.texture.drawText("Blackboard texture from FREEPIK", 70, 550, "50px 'Serif'", "white", null);
            creditPlaque.texture.drawText("CC0 Wood material from TEXTURECAN", 70, 650, "50px 'Serif'", "white", null);
            creditPlaque.texture.drawText("Find license file on GitHub for related urls", 70, 750, "40px 'Serif'", "#8a8674", null);
        }
        if (blackboardTex.complete) {
            doDrawTileMenuTextures();
        }
        else {
            blackboardTex.addEventListener("load", doDrawTileMenuTextures);
        }

        await this.machine.instantiate();
        await this.machine.generateBaseMesh();

        document.getElementById("track-editor-menu").style.display = "none";

        this.toolbar = new Toolbar(this);
        this.toolbar.initialize();

        this.setContext(GameMode.CreateMode);
	}

	public animate(): void {
		this.engine.runRenderLoop(() => {
			this.scene.render();
			this.update();
		});

		window.addEventListener("resize", () => {
			this.engine.resize();
            this.toolbar.resize();
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

    public mode: GameMode;
    public async setContext(mode: GameMode, demoIndex?: number): Promise<void> {
        if (this.mode != mode) {
            if (this.mode === GameMode.MainMenu) {
                this.tileMenuContainer.position.y = - 10;
                this.tileMenuContainer.position.z = 1;
                this.scene.onPointerObservable.removeCallback(this.onPointerEvent);
            }
            else if (this.mode === GameMode.CreateMode) {
                this.machineEditor.dispose();
            }
            else if (this.mode === GameMode.Credit) {
                await this.setCameraAlphaBeta(0, Math.PI * 0.5, 1 * 0.8 / this.getCameraMinFOV());
            }

            this.mode = mode;
            
            if (this.mode === GameMode.MainMenu) {
                this.machine.dispose();
                this.machine.deserialize(demo1);
                await this.machine.instantiate();
                await this.machine.generateBaseMesh();
                this.machine.play();

                this.tileMenuContainer.position.y = 0;
                this.tileMenuContainer.position.z = - 0.03;

                this.setCameraTarget(BABYLON.Vector3.Zero());
                await this.setCameraAlphaBeta(- Math.PI * 0.5, Math.PI * 0.5, 0.35 * 0.8 / this.getCameraMinFOV());
                this.camera.lowerAlphaLimit = - Math.PI * 0.65;
                this.camera.upperAlphaLimit = - Math.PI * 0.35;
                this.camera.lowerBetaLimit = Math.PI * 0.35;
                this.camera.upperBetaLimit = Math.PI * 0.65;

                this.scene.onPointerObservable.add(this.onPointerEvent);
            }
            else if (this.mode === GameMode.CreateMode) {
                this.machine.dispose();
                this.machine.deserialize(demoTest);
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
                    this.setCameraTarget(new BABYLON.Vector3(0.22, 0.15, 0));
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
            else if (this.mode === GameMode.Credit) {
                this.setCameraTarget(new BABYLON.Vector3(0, 0, 0.13));
                await this.setCameraAlphaBeta(0, Math.PI * 0.5, 1 * 0.8 / this.getCameraMinFOV());
                await this.setCameraAlphaBeta(Math.PI * 0.5, Math.PI * 0.5, 0.4 * 0.8 / this.getCameraMinFOV());
                this.camera.lowerAlphaLimit = Math.PI * 0.2;
                this.camera.upperAlphaLimit = Math.PI * 0.8;
                this.camera.lowerBetaLimit = Math.PI * 0.2;
                this.camera.upperBetaLimit = Math.PI * 0.8;
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

    public onPointerEvent = (eventData: BABYLON.PointerInfo, eventState: BABYLON.EventState) => {
        if (eventData.type === BABYLON.PointerEventTypes.POINTERDOWN) {
            let pick = this.scene.pick(
                this.scene.pointerX,
                this.scene.pointerY,
                (mesh) => {
                    if (mesh instanceof MenuTile && this.tiles.indexOf(mesh) != - 1) {
                        return true;
                    }
                    else if (mesh.parent && mesh.parent instanceof MenuTile && this.tiles.indexOf(mesh.parent) != - 1) {
                        return true;
                    }
                    return false;
                }
            )

            if (pick.hit) {
                let tile: MenuTile;
                if (pick.pickedMesh instanceof MenuTile) {
                    tile = pick.pickedMesh;
                }
                else if (pick.pickedMesh.parent instanceof MenuTile) {
                    tile = pick.pickedMesh.parent;
                }

                if (tile === this.tileCreate) {
                    this.pressTile(tile).then(async () => {
                        this.setContext(GameMode.CreateMode);
                    });
                }
                else if (tile === this.tileDemo1) {
                    this.pressTile(tile).then(async () => {
                        this.machine.dispose();
                        this.machine.deserialize(demo1);
                        await this.machine.instantiate();
                        await this.machine.generateBaseMesh();
                        this.setContext(GameMode.DemoMode, 1);
                    });
                }
                else if (tile === this.tileDemo2) {
                    this.pressTile(tile).then(async () => {
                        this.machine.dispose();
                        this.machine.deserialize(demo2);
                        await this.machine.instantiate();
                        await this.machine.generateBaseMesh();
                        this.setContext(GameMode.DemoMode, 2);
                    });
                }
                else if (tile === this.tileDemo3) {
                    this.pressTile(tile).then(async () => {
                        this.machine.dispose();
                        this.machine.deserialize(demo3);
                        await this.machine.instantiate();
                        await this.machine.generateBaseMesh();
                        this.setContext(GameMode.DemoMode, 3);
                    });
                }
                else if (tile === this.tileCredit) {
                    this.pressTile(tile).then(async () => {
                        this.setContext(GameMode.Credit);
                    });
                }
            }
        }
    }

    public async pressTile(tile: MenuTile): Promise<void> {
        let axis = "x";
        if (tile === this.tileCreate || tile === this.tileCredit) {
            axis = "y";
        }
        let anim = Mummu.AnimationFactory.CreateNumber(tile, tile.rotation, axis);
        await anim(- Math.PI / 16, 0.2);
        await anim(0, 0.6);
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