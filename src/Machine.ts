interface IBallData {
    x: number;
    y: number;
}

interface IMachinePartData {
    name: string;
    i: number;
    j: number;
    mirror?: boolean;
}

interface IMachineData {
    balls: IBallData[];
    parts: IMachinePartData[];
}

class Machine {

    public baseWall: BABYLON.Mesh;
    public baseFrame: BABYLON.Mesh;
    public tracks: Track[] = [];
    public balls: Ball[] = [];

    private trackFactory: TrackFactory;

    public instantiated: boolean = false;

    constructor(public game: Game) {
        this.trackFactory = new TrackFactory(this);
    }

    public async instantiate(): Promise<void> {
        for (let i = 0; i < this.balls.length; i++) {
            await this.balls[i].instantiate();
        }
        for (let i = 0; i < this.tracks.length; i++) {
            await this.tracks[i].instantiate();
        }

        return new Promise<void>(resolve => {
            requestAnimationFrame(() => {
                for (let i = 0; i < this.tracks.length; i++) {
                    this.tracks[i].recomputeAbsolutePath();
                }
                this.instantiated = true;
                resolve();
            })
        });
    }

    public dispose(): void {
        while (this.balls.length > 0) {
            this.balls[0].dispose();
        }
        while (this.tracks.length > 0) {
            this.tracks[0].dispose();
        }
        this.instantiated = false;
    }

    public update(): void {
        if (!this.instantiated) {
            return;
        }
        let dt = this.game.scene.deltaTime / 1000;
        if (isFinite(dt)) {
            for (let i = 0; i < this.balls.length; i++) {
                this.balls[i].update(dt);
            }
            for (let i = 0; i < this.tracks.length; i++) {
                this.tracks[i].update(dt);
            }
        }
    }

    public generateBaseMesh(): void {
        let woodMaterial = new BABYLON.StandardMaterial("wood-material");
        woodMaterial.diffuseColor.copyFromFloats(0.2, 0.2, 0.2);
        woodMaterial.diffuseTexture = new BABYLON.Texture("./datas/textures/wood-color.jpg");
        woodMaterial.ambientTexture = new BABYLON.Texture("./datas/textures/wood-ambient-occlusion.jpg");
        woodMaterial.specularTexture = new BABYLON.Texture("./datas/textures/wood-roughness.jpg");
        woodMaterial.specularColor.copyFromFloats(0.2, 0.2, 0.2);
        woodMaterial.bumpTexture = new BABYLON.Texture("./datas/textures/wood-normal-2.png");

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

        this.baseWall = BABYLON.MeshBuilder.CreatePlane("base-wall", { width: h + 0.2, height: w + 0.2, sideOrientation:BABYLON.Mesh.DOUBLESIDE, frontUVs: new BABYLON.Vector4(0, 0, v, u) });
        this.baseWall.position.x = (maxX + minX) * 0.5;
        this.baseWall.position.y = (maxY + minY) * 0.5;
        this.baseWall.position.z += 0.016;
        this.baseWall.rotation.z = Math.PI / 2;
        this.baseWall.material = woodMaterial;

        this.baseFrame = new BABYLON.Mesh("base-frame");
        this.baseFrame.position.copyFrom(this.baseWall.position);
        this.baseFrame.material = this.game.steelMaterial;

        this.game.vertexDataLoader.get("./meshes/base-frame.babylon").then(vertexData => {
            let positions = [...vertexData[0].positions]
            for (let i = 0; i < positions.length / 3; i++) {
                let x = positions[3 * i];
                let y = positions[3 * i + 1];
                
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
            vertexData[0].applyToMesh(this.baseFrame);
        })
    }

    public serialize(): IMachineData {
        let data: IMachineData = {
            balls: [],
            parts: []
        }

        for (let i = 0; i < this.balls.length; i++) {
            data.balls.push({
                x: this.balls[i].positionZero.x,
                y: this.balls[i].positionZero.y,
            })
        }

        for (let i = 0; i < this.tracks.length; i++) {
            data.parts.push({
                name: this.tracks[i].trackName,
                i: this.tracks[i].i,
                j: this.tracks[i].j,
                mirror: this.tracks[i].mirror
            })
        }

        return data;
    }

    public deserialize(data: IMachineData): void {
        this.balls = [];
        this.tracks = [];

        for (let i = 0; i < data.balls.length; i++) {
            let ballData = data.balls[i];
            let ball = new Ball(new BABYLON.Vector3(ballData.x, ballData.y, 0), this);
            this.balls.push(ball);
        }

        for (let i = 0; i < data.parts.length; i++) {
            let part = data.parts[i];
            let track = this.trackFactory.createTrack(part.name, part.i, part.j, part.mirror);
            this.tracks.push(track);
        }
    }
}