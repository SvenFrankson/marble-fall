class Room {

    public ground: BABYLON.Mesh;
    public wall: BABYLON.Mesh;
    public frame: BABYLON.Mesh;

    constructor(public game: Game) {
        this.ground = new BABYLON.Mesh("room-ground");
        this.ground.position.y = - 2;

        let groundMaterial = new BABYLON.StandardMaterial("ground-material");
        groundMaterial.diffuseColor = BABYLON.Color3.FromHexString("#3f4c52");
        groundMaterial.specularColor.copyFromFloats(0.1, 0.1, 0.1);

        this.ground.material = groundMaterial;
        
        this.wall = new BABYLON.Mesh("room-wall");
        this.wall.material = this.game.whiteMaterial;
        this.wall.parent = this.ground;
        
        this.frame = new BABYLON.Mesh("room-frame");
        this.frame.material = this.game.steelMaterial;
        this.frame.parent = this.ground;
    }

    public async instantiate(): Promise<void> {
        let vertexDatas = await this.game.vertexDataLoader.get("./meshes/room.babylon");

        vertexDatas[0].applyToMesh(this.ground);
        vertexDatas[1].applyToMesh(this.wall);
        vertexDatas[2].applyToMesh(this.frame);
    }

    public setGroundHeight(h: number) {
        this.ground.position.y = h;
    }
}