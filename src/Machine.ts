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

    public trackFactory: TrackFactory;

    public instantiated: boolean = false;

    public playing: boolean = false;

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
        if (this.playing) {
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
    }

    public play(): void {
        this.playing = true;
    }

    public onStopCallbacks: Nabu.UniqueList<() => void> = new Nabu.UniqueList<() => void>();
    public stop(): void {
        for (let i = 0; i < this.balls.length; i++) {
            this.balls[i].reset();
        }
        this.onStopCallbacks.forEach(callback => {
            callback();
        })
        this.playing = false;
    }

    public generateBaseMesh(): void {

        let minX = - 0.15;
        let maxX = 0.15;
        let minY = - 0.15;
        let maxY = 0.15;
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

        if (this.baseWall) {
            this.baseWall.dispose();
        }
        this.baseWall = BABYLON.MeshBuilder.CreatePlane("base-wall", { width: h + 0.2, height: w + 0.2, sideOrientation:BABYLON.Mesh.DOUBLESIDE, frontUVs: new BABYLON.Vector4(0, 0, v, u) });
        this.baseWall.position.x = (maxX + minX) * 0.5;
        this.baseWall.position.y = (maxY + minY) * 0.5;
        this.baseWall.position.z += 0.016;
        this.baseWall.rotation.z = Math.PI / 2;
        this.baseWall.material = this.game.woodMaterial;

        if (this.baseFrame) {
            this.baseFrame.dispose();
        }
        this.baseFrame = new BABYLON.Mesh("base-frame");
        this.baseFrame.position.copyFrom(this.baseWall.position);
        this.baseFrame.material = this.game.steelMaterial;

        this.game.vertexDataLoader.get("./meshes/base-frame.babylon").then(vertexData => {
            let data = Mummu.CloneVertexData(vertexData[0]);
            let positions = [...data.positions]
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
            data.positions = positions;
            data.applyToMesh(this.baseFrame);
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