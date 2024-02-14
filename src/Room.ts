class Room {

    public ground: BABYLON.Mesh;
    public wall: BABYLON.Mesh;

    constructor(public game: Game) {
        this.ground = BABYLON.MeshBuilder.CreateCylinder("ground", { height: 0.01, diameter: 6 });
        this.ground.position.y = - 2;

        let groundMaterial = new BABYLON.StandardMaterial("wood-material");
        groundMaterial.diffuseColor = BABYLON.Color3.FromHexString("#3f4c52");
        groundMaterial.specularColor.copyFromFloats(0.1, 0.1, 0.1);

        this.ground.material = groundMaterial;
        
        /*
        this.wall = new BABYLON.Mesh("wall");
        this.wall.position.z = 0.1;
        this.wall.position.y = - 1.5;
        */
    }

    public async instantiate(): Promise<void> {
        
    }

    public setGroundHeight(h: number) {
        this.ground.position.y = h - 0.005;
    }
}