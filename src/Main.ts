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

    public timeFactor: number = 0.6;
    public physicDT: number = 0.001;

    public balls: Ball[] = [];
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

        let ball = new Ball(this);
        ball.position.x = - tileWidth * 0.5 * 0.9;
        ball.position.y = 0.008;
        ball.instantiate();

        let ball2 = new Ball(this);
        ball2.position.x = - tileWidth * 0.5 * 0.5;
        ball2.position.y = 0.008;
        ball2.instantiate();

        let ball3 = new Ball(this);
        ball3.position.x = - tileWidth * 0.5 * 0.1;
        ball3.position.y = 0.008;
        ball3.instantiate();

        this.balls = [ball, ball2, ball3];

        document.getElementById("reset").addEventListener("click", () => {
            ball.position.copyFromFloats(-0.05, 0.1, 0);
            ball.velocity.copyFromFloats(0, 0, 0);
        })
        
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
       
        this.tracks = [
            new Ramp(this, 0, 0, 2, 1),
            new ElevatorDown(this, 2, -4, 5),
            new ElevatorUp(this, 2, -4),
            new Ramp(this, 0, -3, 2, 2, true),
            new UTurnLarge(this, -2, -1, true)
        ];

        this.tracks.forEach(track => {
            track.instantiate();
        })

        let tile = new MenuTile("test", 0.05, 0.075, this);
        tile.instantiate();
        tile.position.x = - 0.06;
        tile.position.z = -0.03;

        let tile2 = new MenuTile("test", 0.05, 0.075, this);
        tile2.instantiate();
        tile2.position.z = -0.03;
        
        let tile3 = new MenuTile("test", 0.05, 0.075, this);
        tile3.instantiate();
        tile3.position.x = 0.06;
        tile3.position.z = -0.03;

        requestAnimationFrame(() => {
            this.tracks.forEach(track => {
                track.recomputeAbsolutePath();
            })
            this.trackEditor = new TrackEditor(this);
            this.trackEditor.initialize();

            let wallMaterial = new BABYLON.StandardMaterial("wood-material");
            wallMaterial.diffuseColor.copyFromFloats(0.2, 0.2, 0.2);
            wallMaterial.diffuseTexture = new BABYLON.Texture("./datas/textures/wood-color.jpg");
            wallMaterial.ambientTexture = new BABYLON.Texture("./datas/textures/wood-ambient-occlusion.jpg");
            wallMaterial.specularTexture = new BABYLON.Texture("./datas/textures/wood-roughness.jpg");
            wallMaterial.specularColor.copyFromFloats(0.2, 0.2, 0.2);
            wallMaterial.bumpTexture = new BABYLON.Texture("./datas/textures/wood-normal-2.png");

            let minX = Infinity;
            let maxX = - Infinity;
            let minY = Infinity;
            let maxY = - Infinity;
            for (let i = 0; i < this.tracks.length; i++) {
                let track = this.tracks[i];
                minX = Math.min(minX, track.position.x - tileWidth * 0.5);
                maxX = Math.max(maxX, track.position.x + tileWidth * (track.deltaI + 0.5));
                minY = Math.min(minY, track.position.y - tileHeight * (track.deltaJ + 1));
                maxY = Math.max(maxY, track.position.y);
            }
            
            let w = maxX - minX;
            let h = maxY - minY;
            let u = w * 4;
            let v = h * 4;

            let wall = BABYLON.MeshBuilder.CreatePlane("wall", { width: h + 0.2, height: w + 0.2, sideOrientation:BABYLON.Mesh.DOUBLESIDE, frontUVs: new BABYLON.Vector4(0, 0, v, u) });
            wall.position.x = (maxX + minX) * 0.5;
            wall.position.y = (maxY + minY) * 0.5;
            wall.position.z += 0.016;
            wall.rotation.z = Math.PI / 2;
            wall.material = wallMaterial;

            let baseFrame = new BABYLON.Mesh("base-frame");
            baseFrame.position.copyFrom(wall.position);
            baseFrame.material = this.steelMaterial;

            this.vertexDataLoader.get("./meshes/base-frame.babylon").then(vertexData => {
                let positions = [...vertexData[0].positions]
                for (let i = 0; i < positions.length / 3; i++) {
                    let x = positions[3 * i];
                    let y = positions[3 * i + 1];
                    let z = positions[3 * i + 2];
                    if (x > 0) {
                        positions[3 * i] += w * 0.5 - 0.01 + 0.1;
                    }
                    else if (x < 0) {
                        positions[3 * i] -= w * 0.5 - 0.01 + 0.1;
                    }
                    if (y > 0) {
                        positions[3 * i + 1] += h * 0.5 - 0.01 + 0.1;
                    }
                    else if (y < 0) {
                        positions[3 * i + 1] -= h * 0.5 - 0.01 + 0.1;
                    }
                }
                vertexData[0].positions = positions;
                vertexData[0].applyToMesh(baseFrame);
            })
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
            this.camera.orthoBottom = - 1 * f;
            this.camera.orthoLeft = - ratio * f;
            this.camera.orthoRight = ratio * f;
        }
        else {
            this.camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
        }

        this.tracks.forEach(track => {
            track.update();
        })
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