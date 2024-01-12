interface IMachinePartData {
    name: string;
    i: number;
    j: number;
    mirror?: boolean;
}

interface IMachineData {
    parts: IMachinePartData[];
}

class Machine {

    public base: BABYLON.Mesh;
    public tracks: Track[] = [];
    public balls: Ball[] = [];

    constructor(public game: Game) {

    }

    public async instantiate(): Promise<void> {
        for (let i = 0; i < this.tracks.length; i++) {
            await this.tracks[i].instantiate();
        }

        this.generateBaseMesh();

        return new Promise<void>(resolve => {
            requestAnimationFrame(() => {
                for (let i = 0; i < this.tracks.length; i++) {
                    this.tracks[i].recomputeAbsolutePath();
                }
                resolve();
            })
        });
    }

    public dispose(): void {

    }

    public update(): void {
        for (let i = 0; i < this.tracks.length; i++) {
            this.tracks[i].update();
        }
    }

    public generateBaseMesh(): void {
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
            baseFrame.material = this.game.steelMaterial;

            this.game.vertexDataLoader.get("./meshes/base-frame.babylon").then(vertexData => {
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
    }

    public serialize(): IMachineData {
        let data: IMachineData = {
            parts: []
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
        
    }
}