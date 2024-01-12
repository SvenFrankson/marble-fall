class MenuTile extends BABYLON.Mesh {

    public static ppc: number = 60;
    public get ppm(): number {
        return MenuTile.ppc * 100;
    }

    public texture: BABYLON.DynamicTexture;

    constructor(
        name: string,
        public w: number,
        public h: number,
        public game: Game
    ) {
        super(name);
        this.texture = new BABYLON.DynamicTexture(this.name + "-texture", { width: this.w * this.ppm, height: this.h * this.ppm });
    }

    public async instantiate(): Promise<void> {
        let button = BABYLON.MeshBuilder.CreateSphere("center", { diameter: 0.001 });
        this.game.vertexDataLoader.get("./meshes/button.babylon").then(vertexData => {
            vertexData[0].applyToMesh(button);
        });
        button.material = this.game.steelMaterial;
        button.parent = this;
        if (this.h >= this.w) {
            button.position.y = - this.h * 0.5 + 0.01;
        }
        else {
            button.position.x = this.w * 0.5 - 0.01;
        }
        button.rotation.x = - Math.PI * 0.5;

        BABYLON.CreatePlaneVertexData({ width: this.w, height: this.h }).applyToMesh(this);
        let material = new BABYLON.StandardMaterial("test");
        material.diffuseTexture = this.texture;
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