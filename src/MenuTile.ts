class MenuTile extends BABYLON.Mesh {

    constructor(
        name: string,
        public w: number,
        public h: number,
        public game: Game
    ) {
        super(name);
    }

    public async instantiate(): Promise<void> {
        BABYLON.CreatePlaneVertexData({ width: this.w, height: this.h }).applyToMesh(this);
        let material = new BABYLON.StandardMaterial("test");
        material.diffuseColor.copyFromFloats(0.02, 0.04, 0.03);
        material.specularColor.copyFromFloats(0.1, 0.1, 0.1);
        this.material = material;

        let frame = new BABYLON.Mesh(this.name + "-frame");
        frame.material = this.game.steelMaterial;
        frame.parent = this;

        this.game.vertexDataLoader.get("./meshes/menu-tile-frame.babylon").then(vertexData => {
            let positions = [...vertexData[0].positions]
            for (let i = 0; i < positions.length / 3; i++) {
                let x = positions[3 * i];
                let y = positions[3 * i + 1];
                let z = positions[3 * i + 2];
                if (x > 0) {
                    positions[3 * i] += this.w * 0.5 - 0.001;
                }
                else if (x < 0) {
                    positions[3 * i] -= this.w * 0.5 - 0.001;
                }
                if (y > 0) {
                    positions[3 * i + 1] += this.h * 0.5 - 0.001;
                }
                else if (y < 0) {
                    positions[3 * i + 1] -= this.h * 0.5 - 0.001;
                }
            }
            vertexData[0].positions = positions;
            vertexData[0].applyToMesh(frame);
        })
    }
}