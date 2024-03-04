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
    Home,
    Page,
    Create,
    Challenge,
    Demo
}

enum CameraMode {
    None,
    Ball,
    Landscape,
    Selected,
    Focusing,
    FocusingSelected,
    Transition
}

class Game {
    
    public static Instance: Game;
    public DEBUG_MODE: boolean = true;

	public canvas: HTMLCanvasElement;
	public engine: BABYLON.Engine;
    public scene: BABYLON.Scene;
    public getScene(): BABYLON.Scene {
        return this.scene;
    }
    public screenRatio: number = 1;

    //public camera: BABYLON.FreeCamera;
    public camera: BABYLON.ArcRotateCamera;
    public camBackGround: BABYLON.FreeCamera;
    public horizontalBlur: BABYLON.BlurPostProcess;
    public verticalBlur: BABYLON.BlurPostProcess;
    public cameraMode: CameraMode = CameraMode.None;
    public menuCameraMode: CameraMode = CameraMode.Ball;
    public targetCamTarget: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    public targetCamAlpha: number = - Math.PI * 0.5;
    public targetCamBeta: number = Math.PI * 0.4;
    public targetCamRadius: number = 0.3;
    private _trackTargetCamSpeed: number = 0;
    public onFocusCallback: () => void;

    public vertexDataLoader: Mummu.VertexDataLoader;
    public config: Configuration;

    public logo: Logo;
    public mainMenu: Nabu.PanelPage;
    public optionsPage: OptionsPage;
    public creditsPage: CreditsPage;
    public topbar: Topbar;
    public toolbar: Toolbar;
    public challenge: Challenge;
    public router: MarbleRouter;

    public cameraOrtho: boolean = false;
    public animateCamera = Mummu.AnimationFactory.EmptyNumbersCallback;
    public animateCameraTarget = Mummu.AnimationFactory.EmptyVector3Callback;

    public mainVolume: number = 0;
    public targetTimeFactor: number = 0.8;
    public timeFactor: number = 0.1;
    public get currentTimeFactor(): number {
        return this.timeFactor * (this.mode === GameMode.Home ? 0.5 : 1); 
    }
    public physicDT: number = 0.0005;

    public materials: MainMaterials;
    public machine: Machine;
    public room: Room;
    public spotLight: BABYLON.SpotLight;
    public shadowGenerator: BABYLON.ShadowGenerator;
    public machineEditor: MachineEditor;

    public skybox: BABYLON.Mesh;

    public helperShape: HelperShape;

    constructor(canvasElement: string) {
        Game.Instance = this;
        
		this.canvas = document.getElementById(canvasElement) as HTMLCanvasElement;
        this.canvas.requestPointerLock = this.canvas.requestPointerLock || this.canvas.msRequestPointerLock || this.canvas.mozRequestPointerLock || this.canvas.webkitRequestPointerLock;
		this.engine = new BABYLON.Engine(this.canvas, true);
		BABYLON.Engine.ShadersRepository = "./shaders/";
        BABYLON.Engine.audioEngine.useCustomUnlockedButton = true;

        window.addEventListener(
            "click",
            () => {
              if (!BABYLON.Engine.audioEngine.unlocked) {
                BABYLON.Engine.audioEngine.unlock();
              }
            },
            { once: true },
        );

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
        this.screenRatio = this.engine.getRenderWidth() / this.engine.getRenderHeight();
        this.vertexDataLoader = new Mummu.VertexDataLoader(this.scene);
        this.config = new Configuration(this);
        this.config.initialize();
        
        this.materials = new MainMaterials(this);

        if (this.DEBUG_MODE) {
            this.scene.clearColor = BABYLON.Color4.FromHexString("#00ff0000");
        }
        else {
            this.scene.clearColor = BABYLON.Color4.FromHexString("#272B2EFF");
        }

        this.spotLight = new BABYLON.SpotLight("spot-light", new BABYLON.Vector3(0, 0.5, 0), new BABYLON.Vector3(0, -1, 0), Math.PI / 3, 1, this.scene);
        this.spotLight.shadowMinZ = 1;
        this.spotLight.shadowMaxZ = 3;

        this.skybox = BABYLON.MeshBuilder.CreateSphere("skyBox", { diameter: 20, sideOrientation: BABYLON.Mesh.BACKSIDE }, this.scene);
        this.skybox.layerMask = 0x10000000;
        let skyboxMaterial: BABYLON.StandardMaterial = new BABYLON.StandardMaterial("skyBox", this.scene);
        skyboxMaterial.backFaceCulling = false;
        let skyTexture = new BABYLON.Texture("./datas/skyboxes/city_night_low_res.png");
        skyboxMaterial.diffuseTexture = skyTexture;
        skyboxMaterial.diffuseColor.copyFromFloats(0.25, 0.25, 0.25);
        skyboxMaterial.emissiveColor.copyFromFloats(0.25, 0.25, 0.25);
        skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        this.skybox.material = skyboxMaterial;
        this.skybox.rotation.y = 0.16 * Math.PI;

        this.camera = new BABYLON.ArcRotateCamera("camera", this.targetCamAlpha, this.targetCamBeta, this.targetCamRadius, this.targetCamTarget.clone());
        this.camera.minZ = 0.01;
        this.camera.maxZ = 25;
        this.camera.upperBetaLimit = Math.PI * 0.5;
        this.camera.lowerRadiusLimit = 0.05;
        this.camera.upperRadiusLimit = 2;
        this.camera.wheelPrecision = 1000;
        this.camera.panningSensibility = 4000;
        this.camera.panningInertia *= 0.5;
        this.camera.angularSensibilityX = 2000;
        this.camera.angularSensibilityY = 2000;
        this.camera.pinchPrecision = 5000;

        this.animateCamera = Mummu.AnimationFactory.CreateNumbers(this.camera, this.camera, ["alpha", "beta", "radius"], undefined, [true, true, false], Nabu.Easing.easeInOutSine);
        this.animateCameraTarget = Mummu.AnimationFactory.CreateVector3(this.camera, this.camera, "target", undefined, Nabu.Easing.easeInOutSine);

        this.updateCameraLayer();
        this.updateShadowGenerator();

        let test = BABYLON.MeshBuilder.CreateBox("zero", { size: 0.01 });

        if (this.DEBUG_MODE) {
            if (window.localStorage.getItem("camera-target")) {
                let target = JSON.parse(window.localStorage.getItem("camera-target"));
                this.camera.target.x = target.x;
                this.camera.target.y = target.y;
                this.camera.target.z = target.z;
            }
            if (window.localStorage.getItem("camera-position")) {
                let positionItem = JSON.parse(window.localStorage.getItem("camera-position"));
                let position = new BABYLON.Vector3(positionItem.x, positionItem.y, positionItem.z);
                this.camera.setPosition(position);
            }
        }
        
        let alternateMenuCamMode = () => {
            if (this.menuCameraMode === CameraMode.Ball) {
                this.menuCameraMode = CameraMode.Landscape;
            }
            else {
                this.menuCameraMode = CameraMode.Ball;
            }
            if (this.mode <= GameMode.Page) {
                this.setCameraMode(this.menuCameraMode);
            }
            setTimeout(alternateMenuCamMode, 10000 + 10000 * Math.random());
        }
        alternateMenuCamMode();
        
        this.camera.attachControl();
        this.camera.getScene();

        if (this.config.graphicQ > 1) {
            this.room = new Room(this);
        }
        this.machine = new Machine(this);
        this.machineEditor = new MachineEditor(this);

        if (this.DEBUG_MODE) {
            this.machine.deserialize(aerial);
        }
        else {
            this.machine.deserialize(aerial);
        }

        let screenshotButton = document.querySelector("#toolbar-screenshot") as HTMLButtonElement;
        screenshotButton.addEventListener("click", () => {
            this.makeCircuitScreenshot();
        });

        this.mode = GameMode.Home;

        this.logo = new Logo(this);
        this.logo.initialize();
        this.logo.hide();

        this.mainMenu = document.getElementById("main-menu") as Nabu.PanelPage;

        this.optionsPage = new OptionsPage(this);
        this.optionsPage.initialize();
        this.optionsPage.hide();

        this.creditsPage = new CreditsPage(this);
        this.creditsPage.hide();

        this.topbar = new Topbar(this);
        this.topbar.initialize();
        this.topbar.resize();

        this.toolbar = new Toolbar(this);
        this.toolbar.initialize();
        this.toolbar.resize();

        this.challenge = new Challenge(this);

        await this.machine.generateBaseMesh();
        await this.machine.instantiate();
        if (this.room) {
            await this.room.instantiate();
        }

        this.router = new MarbleRouter(this);
        this.router.initialize();

        document.addEventListener("keydown", async (event: KeyboardEvent) => {
            //await this.makeScreenshot("join");
            //await this.makeScreenshot("split");
            if (event.code === "KeyP") {
                //await this.makeScreenshot("spiral-1.2.1");
                await this.makeScreenshot("wall-4.2");
                let e = document.getElementById("screenshot-frame");
                if (e.style.display != "block") {
                    e.style.display = "block";
                }
                else {
                    this.makeCircuitScreenshot();
                }
                /*
                for (let i = 0; i < TrackNames.length; i++) {
                    let trackname = TrackNames[i];
                    await this.makeScreenshot(trackname);
                }
                */
            }
        })

        this.canvas.addEventListener("pointerdown", this.onPointerDown);
        this.canvas.addEventListener("pointerup", this.onPointerUp);
        this.canvas.addEventListener("wheel", this.onWheelEvent);

        if (this.DEBUG_MODE) {
            setInterval(() => {
                let triCount = this.machine.parts.map(part => { return part.getTriCount() }).reduce((t1, t2) => { return t1 + t2 });
                triCount += this.machine.parts.map(ball => { return ball.getIndices().length / 3 }).reduce((b1, b2) => { return b1 + b2 });
                //console.log("global machine tricount " + triCount);
            }, 3000);
        }
	}

	public animate(): void {
		this.engine.runRenderLoop(() => {
			this.scene.render();
			this.update();
		});

		window.onresize = () => {
            this.screenRatio = this.engine.getRenderWidth() / this.engine.getRenderHeight();
            this.engine.resize();
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.screenRatio = this.engine.getRenderWidth() / this.engine.getRenderHeight();
                    this.engine.resize();
                    this.topbar.resize();
                    this.toolbar.resize();
                    this.mainMenu.resize();
                })
            })
		};
	}

    public async initialize(): Promise<void> {
        
    }

    public averagedFPS: number = 0;
    public updateConfigTimeout: number = - 1;
    public update(): void {
        let dt = this.scene.deltaTime / 1000;

        if (this.DEBUG_MODE) {
            let camPos = this.camera.position;
            let camTarget = this.camera.target;
            window.localStorage.setItem("camera-position", JSON.stringify({ x: camPos.x, y: camPos.y, z: camPos.z }));
            window.localStorage.setItem("camera-target", JSON.stringify({ x: camTarget.x, y: camTarget.y, z: camTarget.z }));
        }

        if (this.cameraMode != CameraMode.None && this.cameraMode != CameraMode.Selected && isFinite(dt)) {
            let speed = 0.01;
            let camTarget = this.targetCamTarget;
            if (this.cameraMode === CameraMode.Ball && this.machine && this.machine.balls && this.machine.balls[0]) {
                this._trackTargetCamSpeed = this._trackTargetCamSpeed * 0.9995 + 30 * 0.0005;
                camTarget = this.machine.balls[0].position;
            }
            else if (this.cameraMode >= CameraMode.Focusing) {
                this._trackTargetCamSpeed = this._trackTargetCamSpeed * 0.995 + 20 * 0.005;
                speed = 0.2;
            }
            else {
                this._trackTargetCamSpeed = 0.2;
            }
            let target = BABYLON.Vector3.Lerp(this.camera.target, camTarget, this._trackTargetCamSpeed * dt);
            let alpha = Nabu.Step(this.camera.alpha, this.targetCamAlpha, Math.PI * speed * dt);
            let beta = Nabu.Step(this.camera.beta, this.targetCamBeta, Math.PI * speed * dt);
            let radius = Nabu.Step(this.camera.radius, this.targetCamRadius, 10 * speed * dt);
    
            this.camera.target.copyFrom(target);
            this.camera.alpha = alpha;
            this.camera.beta = beta;
            this.camera.radius = radius;

            if (this.cameraMode >= CameraMode.Focusing) {
                if (Math.abs(this.camera.alpha - this.targetCamAlpha) < Math.PI / 180) {
                    if (Math.abs(this.camera.beta - this.targetCamBeta) < Math.PI / 180) {
                        if (Math.abs(this.camera.radius - this.targetCamRadius) < 0.001) {
                            if (BABYLON.Vector3.Distance(this.camera.target, this.targetCamTarget) < 0.001) {
                                if (this.cameraMode === CameraMode.FocusingSelected) {
                                    this.cameraMode = CameraMode.Selected;
                                    this.camera.attachControl();
                                }
                                else {
                                    this.cameraMode = CameraMode.None;
                                    this.camera.attachControl();
                                }
                            }
                        }
                    }
                }
            }
            else if (this.cameraMode <= CameraMode.Landscape) {
                if (Math.abs(this.camera.alpha - this.targetCamAlpha) < Math.PI / 180) {
                    this.targetCamAlpha = - 0.2 * Math.PI - Math.random() * Math.PI * 0.6;
                }
                if (Math.abs(this.camera.beta - this.targetCamBeta) < Math.PI / 180) {
                    this.targetCamBeta = 0.15 * Math.PI + Math.random() * Math.PI * 0.35;
                }
            }
        }

        if (this.cameraMode === CameraMode.None) {
            this.camera.target.x = Nabu.MinMax(this.camera.target.x, this.machine.baseMeshMinX, this.machine.baseMeshMaxX);
            this.camera.target.y = Nabu.MinMax(this.camera.target.y, this.machine.baseMeshMinY, this.machine.baseMeshMaxY);
            this.camera.target.z = Nabu.MinMax(this.camera.target.z, this.machine.baseMeshMinZ, this.machine.baseMeshMaxZ);
        }

        window.localStorage.setItem("saved-main-volume", this.mainVolume.toFixed(2));
        window.localStorage.setItem("saved-time-factor", this.targetTimeFactor.toFixed(2));

        if (this.cameraOrtho) {
            let f = this.camera.radius / 4;
            this.camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
            this.camera.orthoTop = 1 * f;
            this.camera.orthoBottom = - 1 * f;
            this.camera.orthoLeft = - this.screenRatio * f;
            this.camera.orthoRight = this.screenRatio * f;
        }
        else {
            this.camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
        }

        if (this.machineEditor) {
            this.machineEditor.update();
        }
        if (this.machine) {
            this.machine.update();
        }
        if (this.challenge && this.mode === GameMode.Challenge) {
            this.challenge.update(dt);
        }

        let fps = 1 / dt;
        if (isFinite(fps)) {
            if (fps < 24 && this.timeFactor > this.targetTimeFactor / 2) {
                this.timeFactor *= 0.9;
            }
            else {
                this.timeFactor = this.timeFactor * 0.9 + this.targetTimeFactor * 0.1;
            }
            if (this.config.autoGraphicQ && (this.mode === GameMode.Home || this.mode === GameMode.Demo)) {
                this.averagedFPS = 0.99 * this.averagedFPS + 0.01 * fps;
                if (this.averagedFPS < 24 && this.config.graphicQ > 1) {
                    if (this.updateConfigTimeout === - 1) {
                        this.updateConfigTimeout = setTimeout(() => {
                            if (this.config.autoGraphicQ && (this.mode === GameMode.Home || this.mode === GameMode.Demo)) {
                                let newConfig = this.config.graphicQ - 1;
                                this.config.setGraphicQ(newConfig);
                                this.showGraphicAutoUpdateAlert();
                            }
                            this.updateConfigTimeout = -1;
                        }, 3000);
                    }
                }
                else if (this.averagedFPS > 58 && this.config.graphicQ < 3) {
                    if (this.updateConfigTimeout === - 1) {
                        this.updateConfigTimeout = setTimeout(() => {
                            if (this.config.autoGraphicQ && (this.mode === GameMode.Home || this.mode === GameMode.Demo)) {
                                let newConfig = this.config.graphicQ + 1;
                                this.config.setGraphicQ(newConfig);
                                this.showGraphicAutoUpdateAlert();
                            }
                            this.updateConfigTimeout = -1;
                        }, 3000);
                    }
                }
                else {
                    clearTimeout(this.updateConfigTimeout);
                    this.updateConfigTimeout = -1;
                }
            }
        }
    }

    public mode: GameMode;

    public async makeScreenshot(objectName: string): Promise<void> {
        this.machine.setBaseIsVisible(false);
        this.skybox.isVisible = false;
        if (this.room) {
            this.room.ground.position.y = 100;
        }
        this.scene.clearColor = BABYLON.Color4.FromHexString("#272B2EFF");
        
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
                    let mirrorX = false;
                    if (objectName.startsWith("wall")) {
                        mirrorX = true;
                    }
                    track = this.machine.trackFactory.createTrack(objectName, {
                        i: 0,
                        j: 0,
                        k: 0,
                        mirrorX: mirrorX
                    });
                    this.camera.radius = 0.25 + Math.max(0.15 * (track.w - 1), 0);
                    this.camera.target.copyFromFloats(tileWidth * ((track.w - 1) * 0.55), - tileHeight * (track.h) * 0.5, 0);
                }

                if (objectName.startsWith("spiral") || objectName.startsWith("wall")) {
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
        this.machine.setBaseIsVisible(false);
        this.skybox.isVisible = false;
        if (this.room) {
            this.room.ground.position.y = 100;
        }
        this.scene.clearColor.copyFromFloats(0, 0, 0, 0);

        return new Promise<void>(resolve => {
            requestAnimationFrame(async () => {
                await Mummu.MakeScreenshot({ miniatureName: "circuit", size: 512, outlineWidth: 2 });
                this.machine.setBaseIsVisible(true);
                this.skybox.isVisible = true;
                this.scene.clearColor = BABYLON.Color4.FromHexString("#272b2e");
                resolve();
            });
        });
    }

    public updateCameraLayer(): void {
        if (this.camera) {
            if (this.horizontalBlur) {
                this.horizontalBlur.dispose();
            }
            if (this.verticalBlur) {
                this.verticalBlur.dispose();
            }
            if (this.camBackGround) {
                this.camBackGround.dispose();
            }

            if (this.config.graphicQ > 1) {
                this.camBackGround = new BABYLON.FreeCamera("background-camera", BABYLON.Vector3.Zero());
                this.camBackGround.parent = this.camera;
                this.camBackGround.layerMask = 0x10000000;

                this.scene.activeCameras = [this.camBackGround, this.camera];
                this.horizontalBlur = new BABYLON.BlurPostProcess("blurH", new BABYLON.Vector2(1, 0), 16, 1, this.camBackGround)
                this.verticalBlur = new BABYLON.BlurPostProcess("blurV", new BABYLON.Vector2(0, 1), 16, 1, this.camBackGround)
            }
            else {
                this.scene.activeCameras = [this.camera];
            }
        }
    }

    public updateShadowGenerator(): void {
        if (this.camera) {
            if (this.config.graphicQ > 2 && !this.shadowGenerator) {
                this.shadowGenerator = new BABYLON.ShadowGenerator(2048, this.spotLight);
                this.shadowGenerator.useBlurExponentialShadowMap = true;
                this.shadowGenerator.depthScale = 0.01;
                this.shadowGenerator.blurScale = 1;
                this.shadowGenerator.useKernelBlur = true;
                this.shadowGenerator.blurKernel = 4;
                this.shadowGenerator.setDarkness(0.8);
            }
            else {
                if (this.shadowGenerator) {
                    this.shadowGenerator.dispose();
                    delete this.shadowGenerator;
                }
            }
        }
    }

    public getCameraMinFOV(): number {
        let ratio = this.engine.getRenderWidth() / this.engine.getRenderHeight();
        let fov = this.camera.fov;
        if (ratio > 1) {
            return fov;
        }
        return fov * ratio;
    }

    public getCameraHorizontalFOV(): number {
        return 2 * Math.atan(this.screenRatio * Math.tan(this.camera.fov / 2));
    }

    public getCameraZoomFactor(): number {
        let f = 1 - (this.camera.radius - this.camera.lowerRadiusLimit) / (this.camera.upperRadiusLimit - this.camera.lowerRadiusLimit);
        return f * f;
    }

    public setCameraZoomFactor(v: number) {
        let f = Math.sqrt(v);
        this.camera.radius = (1 - f) * (this.camera.upperRadiusLimit - this.camera.lowerRadiusLimit) + this.camera.lowerRadiusLimit;
    }

    public setCameraMode(camMode: CameraMode): void {
        console.log("setCameraMode " + camMode);
        if (camMode >= CameraMode.None && camMode <= CameraMode.Landscape) {
            this.cameraMode = camMode;
            if (this.cameraMode == CameraMode.None) {
    
            }
            else {
                if (this.cameraMode === CameraMode.Ball) {
                    this.targetCamRadius = 0.3;
                }
                else {
                    let encloseStart = this.machine.getEncloseStart();
                    let encloseEnd = this.machine.getEncloseEnd();
                    let size = BABYLON.Vector3.Distance(encloseStart, encloseEnd);
            
                    this.targetCamTarget.copyFrom(encloseStart.add(encloseEnd).scale(0.5));
                    this.targetCamRadius = size * 0.7;
                }
                this.targetCamAlpha = - 0.2 * Math.PI - Math.random() * Math.PI * 0.6;
                this.targetCamBeta = 0.3 * Math.PI + Math.random() * Math.PI * 0.4;
            }
        }
        else if (camMode === CameraMode.Selected) {
            if (this.mode === GameMode.Create) {
                this.cameraMode = camMode;
                this.targetCamAlpha = this.camera.alpha;
                this.targetCamBeta = this.camera.beta;
                this.targetCamRadius = this.camera.radius;
                this.targetCamTarget.copyFrom(this.camera.target);
            }
        }
        else if (camMode === CameraMode.Transition) {
            this.cameraMode = camMode;
        }
        this.topbar.resize();
    }

    public async focusMachineParts(updateAlphaBetaRadius: boolean, ...machineParts: MachinePart[]): Promise<void> {
        let start: BABYLON.Vector3 = new BABYLON.Vector3(Infinity, - Infinity, - Infinity);
        let end: BABYLON.Vector3 = new BABYLON.Vector3(- Infinity, Infinity, Infinity);
        machineParts.forEach(part => {
            if (part instanceof MachinePart) {
                start.x = Math.min(start.x, part.position.x + part.encloseStart.x);
                start.y = Math.max(start.y, part.position.y + part.encloseStart.y);
                start.z = Math.max(start.z, part.position.z + part.encloseStart.z);
                
                end.x = Math.max(end.x, part.position.x + part.encloseEnd.x);
                end.y = Math.min(end.y, part.position.y + part.encloseEnd.y);
                end.z = Math.min(end.z, part.position.z + part.encloseEnd.z);
            }
        });

        if (!Mummu.IsFinite(start) || !Mummu.IsFinite(end)) {
            return;
        }

        let center = start.add(end).scale(0.5);

        let w = (end.x - start.x);
        let distW = 0.5 * w / (Math.tan(this.getCameraHorizontalFOV() * 0.5));
        let h = (start.y - end.y);
        let distH = 0.5 * h / (Math.tan(this.camera.fov * 0.5));

        if (this.screenRatio > 1) {
            distW *= 3.5;
            distH *= 2.5;
        }
        else {
            distW *= 1.5;
            distH *= 2.5;
        }
        if (updateAlphaBetaRadius) {
            this.targetCamRadius = Math.max(distW, distH);
            this.targetCamAlpha = - Math.PI / 2;
            this.targetCamBeta = Math.PI / 2;
        }
        else {
            this.targetCamRadius = this.camera.radius;
            this.targetCamAlpha = this.camera.alpha;
            this.targetCamBeta = this.camera.beta;
        }

        this.targetCamTarget.copyFrom(center);

        if (this.cameraMode === CameraMode.Selected) {
            this.cameraMode = CameraMode.FocusingSelected;
        }
        else {
            this.cameraMode = CameraMode.Focusing;
        }
        this.camera.detachControl();
    }

    private _showGraphicAutoUpdateAlertInterval: number = 0;
    public showGraphicAutoUpdateAlert(message?: string): void {
        let alert = document.getElementById("auto-update-graphic-alert") as HTMLDivElement;
        if (message) {
            alert.innerText = message;
        }
        else if (this.config.graphicQ === 1) {
            alert.innerText = "Graphic Quality set to LOW";
        }
        else if (this.config.graphicQ === 2) {
            alert.innerText = "Graphic Quality set to MEDIUM";
        }
        else if (this.config.graphicQ === 3) {
            alert.innerText = "Graphic Quality set to HIGH";
        }
        alert.style.opacity = "0";
        alert.style.display = "block";

        clearInterval(this._showGraphicAutoUpdateAlertInterval);
        let n = 0;
        this._showGraphicAutoUpdateAlertInterval = setInterval(() => {
            n++;
            if (n <= 100) {
                alert.style.opacity = n + "%";
            }
            else {
                clearInterval(this._showGraphicAutoUpdateAlertInterval);
                n = 100;
                this._showGraphicAutoUpdateAlertInterval = setInterval(() => {
                    n --;
                    if (n > 0) {
                        alert.style.opacity = n + "%";
                    }
                    else {
                        alert.style.opacity = "0";
                        alert.style.display = "none";
                        clearInterval(this._showGraphicAutoUpdateAlertInterval);
                    }
                }, 75);
            }
        }, 8)
    }

    private _pointerDownX: number = 0;
    private _pointerDownY: number = 0;
    public onPointerDown = (event: PointerEvent) => {
        this._pointerDownX = this.scene.pointerX;
        this._pointerDownY = this.scene.pointerY;
    }

    public onPointerUp = (event: PointerEvent) => {
        if (this.cameraMode === CameraMode.Ball || this.cameraMode === CameraMode.Landscape) {
            let dx = (this._pointerDownX - this.scene.pointerX);
            let dy = (this._pointerDownY - this.scene.pointerY);
            if (dx * dx + dy * dy > 10 * 10) {
                this.setCameraMode(CameraMode.None);
            }
        }
    }

    public onWheelEvent = (event: WheelEvent) => {
        if (this.cameraMode === CameraMode.Ball || this.cameraMode === CameraMode.Landscape) {
            this.setCameraMode(CameraMode.None);
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