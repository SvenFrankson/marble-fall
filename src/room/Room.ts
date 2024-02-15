class Room {

    public ground: BABYLON.Mesh;
    public wall: BABYLON.Mesh;
    public frame: BABYLON.Mesh;

    constructor(public game: Game) {
        this.ground = new BABYLON.Mesh("room-ground");
        this.ground.layerMask = 0x10000000;
        this.ground.position.y = - 2;

        let groundMaterial = new BABYLON.StandardMaterial("ground-material");
        groundMaterial.diffuseTexture = new BABYLON.Texture("./datas/textures/concrete.png")
        groundMaterial.diffuseColor = BABYLON.Color3.FromHexString("#3f4c52");
        groundMaterial.specularColor.copyFromFloats(0.1, 0.1, 0.1);

        this.ground.material = groundMaterial;
        
        this.wall = new BABYLON.Mesh("room-wall");
        this.wall.layerMask = 0x10000000;
        this.wall.material = this.game.whiteMaterial;
        this.wall.parent = this.ground;
        
        this.frame = new BABYLON.Mesh("room-frame");
        this.frame.layerMask = 0x10000000;
        this.frame.material = this.game.steelMaterial;
        this.frame.parent = this.ground;
    }

    public async instantiate(): Promise<void> {
        let vertexDatas = await this.game.vertexDataLoader.get("./meshes/room.babylon");

        vertexDatas[0].applyToMesh(this.ground);
        vertexDatas[1].applyToMesh(this.wall);
        vertexDatas[2].applyToMesh(this.frame);

        let paint1 = new Painting(this, "bilbao_1", 0.8);
        paint1.instantiate();
        paint1.position.copyFromFloats(-4, 0, 3);
        paint1.rotation.y = 0.7 * Math.PI;
        paint1.parent = this.ground;

        let paint2 = new Painting(this, "bilbao_2", 0.8);
        paint2.instantiate();
        paint2.position.copyFromFloats(-3, 0, 3.3);
        paint2.rotation.y = - 0.9 * Math.PI;
        paint2.parent = this.ground;

        let paint3 = new Painting(this, "bilbao_3", 0.8);
        paint3.instantiate();
        paint3.position.copyFromFloats(4, 0, 3.5);
        paint3.rotation.y = - Math.PI * 0.5;
        paint3.parent = this.ground;
        
        let paint4 = new Painting(this, "flower_1", 0.8);
        paint4.instantiate();
        paint4.position.copyFromFloats(4, 0, - 3);
        paint4.rotation.y = - 0.3 * Math.PI;
        paint4.parent = this.ground;

        let paint5 = new Painting(this, "flower_2", 0.8);
        paint5.instantiate();
        paint5.position.copyFromFloats(3, 0, - 3.3);
        paint5.rotation.y = 0.1 * Math.PI;
        paint5.parent = this.ground;

        let paint6 = new Painting(this, "flower_3", 0.8);
        paint6.instantiate();
        paint6.position.copyFromFloats(- 4, 0, - 3.5);
        paint6.rotation.y = Math.PI * 0.5;
        paint6.parent = this.ground;
    }

    public setGroundHeight(h: number) {
        this.ground.position.y = h;
    }
}