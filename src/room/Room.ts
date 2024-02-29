class Room {

    public ground: BABYLON.Mesh;
    public wall: BABYLON.Mesh;
    public frame: BABYLON.Mesh;
    public light1: BABYLON.HemisphericLight;
    public light2: BABYLON.HemisphericLight;

    constructor(public game: Game) {
        this.ground = new BABYLON.Mesh("room-ground");
        this.ground.layerMask = 0x10000000;
        this.ground.position.y = - 2;
        this.ground.receiveShadows = true;

        let groundMaterial = new BABYLON.StandardMaterial("ground-material");
        groundMaterial.diffuseTexture = new BABYLON.Texture("./datas/textures/concrete.png")
        groundMaterial.diffuseColor = BABYLON.Color3.FromHexString("#3f4c52");
        groundMaterial.specularColor.copyFromFloats(0.1, 0.1, 0.1);

        this.ground.material = groundMaterial;
        
        this.wall = new BABYLON.Mesh("room-wall");
        this.wall.layerMask = 0x10000000;
        this.wall.material = this.game.materials.whiteMaterial;
        this.wall.parent = this.ground;
        
        this.frame = new BABYLON.Mesh("room-frame");
        this.frame.layerMask = 0x10000000;
        this.frame.material = this.game.materials.getMetalMaterial(0);
        this.frame.parent = this.ground;

        this.light1 = new BABYLON.HemisphericLight("light1", (new BABYLON.Vector3(1, 3, 0)).normalize(), this.game.scene);
        this.light1.groundColor.copyFromFloats(0.3, 0.3, 0.3);
        this.light1.intensity = 0.2;
        this.light1.includeOnlyWithLayerMask = 0x10000000;

        this.light2 = new BABYLON.HemisphericLight("light2", (new BABYLON.Vector3(- 1, 3, 0)).normalize(), this.game.scene);
        this.light2.groundColor.copyFromFloats(0.3, 0.3, 0.3);
        this.light2.intensity = 0.2;
        this.light2.includeOnlyWithLayerMask = 0x10000000;
    }

    public async instantiate(): Promise<void> {
        console.log("Room instantiate");
        let vertexDatas = await this.game.vertexDataLoader.get("./meshes/room.babylon");

        vertexDatas[0].applyToMesh(this.ground);
        vertexDatas[1].applyToMesh(this.wall);
        vertexDatas[2].applyToMesh(this.frame);

        let paintingNames = [
            "bilbao_1",
            "bilbao_2",
            "bilbao_3",
            "flower_1",
            "flower_2",
            "flower_3",
            "flower_4",
            "fort_william_1",
            "glasgow_1",
        ];
        let n = 0;
        let randomPainting = () => {
            return paintingNames[n++];
        }


        let paint1 = new Painting(this, randomPainting(), 0.8);
        paint1.instantiate();
        paint1.position.copyFromFloats(4, 0, 4);
        paint1.rotation.y = - 0.75 * Math.PI;
        paint1.parent = this.ground;

        let paint11 = new Painting(this, randomPainting(), 0.8);
        paint11.instantiate();
        paint11.position.copyFromFloats(2.8, 0, 4.5);
        paint11.rotation.y = - Math.PI;
        paint11.parent = this.ground;


        let paint2 = new Painting(this, randomPainting(), 0.8);
        paint2.instantiate();
        paint2.position.copyFromFloats(4, 0, - 4);
        paint2.rotation.y = - 0.25 * Math.PI;
        paint2.parent = this.ground;

        let paint21 = new Painting(this, randomPainting(), 0.8);
        paint21.instantiate();
        paint21.position.copyFromFloats(2.8, 0, - 4.5);
        paint21.parent = this.ground;


        let paint3 = new Painting(this, randomPainting(), 0.8);
        paint3.instantiate();
        paint3.position.copyFromFloats(- 4, 0, - 4);
        paint3.rotation.y = 0.25 * Math.PI;
        paint3.parent = this.ground;
        
        let paint31 = new Painting(this, randomPainting(), 0.8);
        paint31.instantiate();
        paint31.position.copyFromFloats(- 4.5, 0, - 2.8);
        paint31.rotation.y = 0.5 * Math.PI;
        paint31.parent = this.ground;
        
        let paint32 = new Painting(this, randomPainting(), 0.8);
        paint32.instantiate();
        paint32.position.copyFromFloats(- 2.8, 0, - 4.5);
        paint32.parent = this.ground;


        let paint4 = new Painting(this, randomPainting(), 0.8);
        paint4.instantiate();
        paint4.position.copyFromFloats(- 4, 0, 4);
        paint4.rotation.y = 0.75 * Math.PI;
        paint4.parent = this.ground;

        let paint41 = new Painting(this, randomPainting(), 0.8);
        paint41.instantiate();
        paint41.position.copyFromFloats(- 2.8, 0, 4.5);
        paint41.rotation.y = Math.PI;
        paint41.parent = this.ground;

        let sculpt1 = new Sculpt(this, this.game.materials.getMetalMaterial(0));
        sculpt1.instantiate();
        sculpt1.position.copyFromFloats(4.5, 0, 0);
        sculpt1.rotation.y = - 0.5 * Math.PI;
        sculpt1.parent = this.ground;

        let sculpt2 = new Sculpt(this, this.game.materials.getMetalMaterial(1));
        sculpt2.instantiate();
        sculpt2.position.copyFromFloats(- 4.5, 0, 0);
        sculpt2.rotation.y = 0.5 * Math.PI;
        sculpt2.parent = this.ground;

        if (this.game.machine) {
            this.setGroundHeight(this.game.machine.baseMeshMinY - 0.8);
        }
    }

    public setGroundHeight(h: number) {
        if (this.ground) {
            this.ground.position.y = h;
        }
    }

    public dispose(): void {
        this.ground.dispose();
        this.frame.dispose();
        this.wall.dispose();
        this.light1.dispose();
        this.light2.dispose();
    }
}