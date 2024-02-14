interface IBallData {
    x: number;
    y: number;
    z?: number;
}

interface IMachinePartData {
    name: string;
    i: number;
    j: number;
    k?: number;
    mirror?: boolean;
    mirrorX?: boolean;
    mirrorZ?: boolean;
}

interface IMachineData {
    balls: IBallData[];
    parts: IMachinePartData[];
}

class Machine {

    public baseWall: BABYLON.Mesh;
    public baseFrame: BABYLON.Mesh;
    public parts: MachinePart[] = [];
    public balls: Ball[] = [];

    public trackFactory: MachinePartFactory;
    public templateManager: TemplateManager;

    public instantiated: boolean = false;

    public playing: boolean = false;

    constructor(public game: Game) {
        this.trackFactory = new MachinePartFactory(this);
        this.templateManager = new TemplateManager(this);
    }

    public async instantiate(): Promise<void> {
        for (let i = 0; i < this.balls.length; i++) {
            await this.balls[i].instantiate();
        }
        for (let i = 0; i < this.parts.length; i++) {
            await this.parts[i].instantiate();
        }

        return new Promise<void>(resolve => {
            requestAnimationFrame(() => {
                for (let i = 0; i < this.parts.length; i++) {
                    this.parts[i].recomputeAbsolutePath();
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
        while (this.parts.length > 0) {
            this.parts[0].dispose();
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
                for (let i = 0; i < this.parts.length; i++) {
                    this.parts[i].update(dt);
                }
            }
        }
        else {
            for (let i = 0; i < this.balls.length; i++) {
                if (this.balls[i].marbleLoopSound.volume > 0.01) {
                    this.balls[i].marbleLoopSound.volume *= 0.9;
                }
                else {
                    this.balls[i].marbleLoopSound.volume = 0;
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

    public margin: number = 0.05;
    public baseMeshMinX: number = - this.margin;
    public baseMeshMaxX: number = this.margin;
    public baseMeshMinY: number = - this.margin;
    public baseMeshMaxY: number = this.margin;
    public async generateBaseMesh(): Promise<void> {

        this.baseMeshMinX = - this.margin;
        this.baseMeshMaxX = this.margin;
        this.baseMeshMinY = - this.margin;
        this.baseMeshMaxY = this.margin;
        for (let i = 0; i < this.parts.length; i++) {
            let track = this.parts[i];
            this.baseMeshMinX = Math.min(this.baseMeshMinX, track.position.x - tileWidth * 0.5);
            this.baseMeshMaxX = Math.max(this.baseMeshMaxX, track.position.x + tileWidth * (track.w - 0.5));
            this.baseMeshMinY = Math.min(this.baseMeshMinY, track.position.y - tileHeight * (track.h + 1));
            this.baseMeshMaxY = Math.max(this.baseMeshMaxY, track.position.y);
        }
        
        let w = this.baseMeshMaxX - this.baseMeshMinX;
        let h = this.baseMeshMaxY - this.baseMeshMinY;
        let u = w * 4;
        let v = h * 4;

        if (this.baseWall) {
            this.baseWall.dispose();
        }
        this.baseWall = BABYLON.MeshBuilder.CreatePlane("base-wall", { width: h + 2 * this.margin, height: w + 2 * this.margin, sideOrientation:BABYLON.Mesh.DOUBLESIDE, frontUVs: new BABYLON.Vector4(0, 0, v, u) });
        this.baseWall.position.x = (this.baseMeshMaxX + this.baseMeshMinX) * 0.5;
        this.baseWall.position.y = (this.baseMeshMaxY + this.baseMeshMinY) * 0.5;
        this.baseWall.position.z += 0.016;
        this.baseWall.rotation.z = Math.PI / 2;
        this.baseWall.material = this.game.woodMaterial;

        if (this.baseFrame) {
            this.baseFrame.dispose();
        }
        this.baseFrame = new BABYLON.Mesh("base-frame");
        this.baseFrame.position.copyFrom(this.baseWall.position);
        this.baseFrame.material = this.game.steelMaterial;

        let vertexDatas = await this.game.vertexDataLoader.get("./meshes/base-frame.babylon")
        let data = Mummu.CloneVertexData(vertexDatas[0]);
        let positions = [...data.positions]
        for (let i = 0; i < positions.length / 3; i++) {
            let x = positions[3 * i];
            let y = positions[3 * i + 1];
            
            if (x > 0) {
                positions[3 * i] += w * 0.5 - 0.01 + this.margin;
            }
            else if (x < 0) {
                positions[3 * i] -= w * 0.5 - 0.01 + this.margin;
            }
            if (y > 0) {
                positions[3 * i + 1] += h * 0.5 - 0.01 + this.margin;
            }
            else if (y < 0) {
                positions[3 * i + 1] -= h * 0.5 - 0.01 + this.margin;
            }
        }
        data.positions = positions;
        data.applyToMesh(this.baseFrame);
    }

    public getBankAt(pos: BABYLON.Vector3, exclude: MachinePart): { isEnd: boolean, bank: number, part: MachinePart } {
        for (let i = 0; i < this.parts.length; i++) {
            let part = this.parts[i];
            if (part != exclude) {
                for (let j = 0; j < part.tracks.length; j++) {
                    let track = part.tracks[j];
                    if (BABYLON.Vector3.DistanceSquared(track.startWorldPosition, pos) < 0.000001) {
                        return { isEnd: false, bank: track.preferedStartBank, part: part }
                    }
                    if (BABYLON.Vector3.DistanceSquared(track.endWorldPosition, pos) < 0.000001) {
                        return { isEnd: true, bank: track.preferedEndBank, part: part }
                    }
                }
            }
        }
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
                z: this.balls[i].positionZero.z
            })
        }

        for (let i = 0; i < this.parts.length; i++) {
            data.parts.push({
                name: this.parts[i].partName,
                i: this.parts[i].i,
                j: this.parts[i].j,
                k: this.parts[i].k,
                mirrorX: this.parts[i].mirrorX,
                mirrorZ: this.parts[i].mirrorZ
            })
        }

        return data;
    }

    public deserialize(data: IMachineData): void {
        this.balls = [];
        this.parts = [];

        for (let i = 0; i < data.balls.length; i++) {
            let ballData = data.balls[i];
            let ball = new Ball(new BABYLON.Vector3(ballData.x, ballData.y, isFinite(ballData.z) ? ballData.z : 0), this);
            this.balls.push(ball);
        }

        for (let i = 0; i < data.parts.length; i++) {
            let part = data.parts[i];
            let track = this.trackFactory.createTrack(part.name, part.i, part.j, part.k, part.mirror ? true : part.mirrorX, part.mirrorZ);
            if (track) {
                this.parts.push(track);
            }
        }
    }

    public getEncloseStart():  BABYLON.Vector3 {
        let encloseStart: BABYLON.Vector3 = new BABYLON.Vector3(Infinity, - Infinity, - Infinity);
        this.parts.forEach(part => {
            encloseStart.x = Math.min(encloseStart.x, part.position.x + part.encloseStart.x);
            encloseStart.y = Math.max(encloseStart.y, part.position.y + part.encloseStart.y);
            encloseStart.z = Math.max(encloseStart.z, part.position.z + part.encloseStart.z);
        });
        return encloseStart;
    }

    public getEncloseEnd(): BABYLON.Vector3 {
        let encloseEnd: BABYLON.Vector3 = new BABYLON.Vector3(- Infinity, Infinity, Infinity);
        this.parts.forEach(part => {
            encloseEnd.x = Math.max(encloseEnd.x, part.position.x + part.encloseEnd.x);
            encloseEnd.y = Math.min(encloseEnd.y, part.position.y + part.encloseEnd.y);
            encloseEnd.z = Math.min(encloseEnd.z, part.position.z + part.encloseEnd.z);
        });
        return encloseEnd;
    }
}