class Painting extends BABYLON.Mesh {

    constructor(public room: Room, public paintingName: string, public size: number = 0.5) {
        super("painting-" + paintingName);
        this.layerMask = 0x10000000;
    }

    public async instantiate(): Promise<void> {
        let vertexDatas = await this.room.game.vertexDataLoader.get("./meshes/paint-support.babylon");
        if (vertexDatas && vertexDatas[0]) {
            vertexDatas[0].applyToMesh(this);
        }
        if (vertexDatas && vertexDatas[1]) {
            let steel = new BABYLON.Mesh("steel");
            vertexDatas[1].applyToMesh(steel);
            steel.parent = this;
            steel.material = this.room.game.materials.getMetalMaterial(0);
            steel.layerMask = 0x10000000;
        }
        if (vertexDatas && vertexDatas[2]) {
            let lightedPlane = new BABYLON.Mesh("lighted-plane");
            vertexDatas[2].applyToMesh(lightedPlane);
            lightedPlane.parent = this;
            lightedPlane.material = this.room.game.materials.paintingLight;
            lightedPlane.layerMask = 0x10000000;
        }

        let texture = new BABYLON.Texture("./datas/textures/" + this.paintingName + ".jpg");
        
        return new Promise<void>(resolve => {
            let checkTextureLoaded = () => {
                if (texture.isReady()) {
                    let w = texture._texture.baseWidth;
                    let h = texture._texture.baseHeight;
                    let r = w / h;
                    let wMesh = this.size;
                    let hMesh = this.size;
                    if (r >= 1) {
                        hMesh /= r;
                    }
                    else {
                        wMesh *= r;
                    }
                    let body = BABYLON.MeshBuilder.CreateBox("paint-body", { width: wMesh + 0.04, height: hMesh + 0.04, depth: 0.04 });
                    body.layerMask = 0x10000000;
                    body.position.y = 1.2;
                    body.parent = this;

                    let plane = BABYLON.MeshBuilder.CreatePlane("paint", { width: wMesh, height: hMesh });
                    plane.layerMask = 0x10000000;
                    let mat = new BABYLON.StandardMaterial(this.name + "-material");
                    mat.diffuseTexture = texture;
                    mat.emissiveColor = new BABYLON.Color3(0.25, 0.25, 0.25);
                    plane.material = mat;
                    plane.position.y = 1.2;
                    plane.position.z = 0.021;
                    plane.rotation.y = Math.PI;
                    plane.parent = this;

                    resolve();
                }
                else {
                    requestAnimationFrame(checkTextureLoaded);
                }
            }
            checkTextureLoaded();
        })
    }
}