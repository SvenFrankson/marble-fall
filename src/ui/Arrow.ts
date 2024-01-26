class Arrow extends BABYLON.Mesh {

    public get size(): number {
        return this.scaling.x / this.baseSize;
    }

    public set size(v: number) {
        let s = v * this.baseSize
        this.scaling.copyFromFloats(s, s, s);
    }

    constructor(name: string, public game: Game, public readonly baseSize: number = 0.1, public dir?: BABYLON.Vector3) {
        super(name);
        this.scaling.copyFromFloats(this.baseSize, this.baseSize, this.baseSize);
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