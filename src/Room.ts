class Room {

    public ground: BABYLON.Mesh;
    public wall: BABYLON.Mesh;

    constructor(public game: Game) {
        this.ground = new BABYLON.Mesh("ground");
        this.ground.position.z = 0.1;
        this.ground.position.y = - 1.5;
        
        this.wall = new BABYLON.Mesh("wall");
        this.wall.position.z = 0.1;
        this.wall.position.y = - 1.5;
    }

    public async instantiate(): Promise<void> {
        Mummu.CreateQuadVertexData({
            p1: new BABYLON.Vector3(-3, 0, -6),
            p2: new BABYLON.Vector3(3, 0, -6),
            p3: new BABYLON.Vector3(3, 0, 0),
            p4: new BABYLON.Vector3(-3, 0, 0)
        }).applyToMesh(this.ground);

        let datas = await this.game.vertexDataLoader.get("./meshes/wall.babylon");
        if (datas && datas[0]) {
            datas[0].applyToMesh(this.wall);
        }
    }
}