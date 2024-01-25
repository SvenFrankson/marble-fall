class Arrow extends BABYLON.Mesh {

    constructor(name: string, public game: Game, public size: number = 0.1, public dir?: BABYLON.Vector3) {
        super(name);
        this.scaling.copyFromFloats(this.size, this.size, this.size);
        this.material = this.game.uiMaterial;
        if (this.dir) {
            this.rotationQuaternion = BABYLON.Quaternion.Identity();
        }
    }

    public async instantiate(): Promise<void> {
        let datas = await this.game.vertexDataLoader.get("./meshes/arrow.babylon");
        if (datas && datas[0]) {
            let data = datas[0];
            data.applyToMesh(this);
        }

        this.game.scene.onBeforeRenderObservable.add(this._update);
    }

    public dispose(): void {
        super.dispose();
        this.game.scene.onBeforeRenderObservable.removeCallback(this._update);
    }

    private _update = () => {
        if (this.dir && this.isVisible) {
            let z = this.position.subtract(this.game.camera.globalPosition);
            Mummu.QuaternionFromYZAxisToRef(this.dir, z, this.rotationQuaternion);
        }
    }

    public onClick: () => void;
}