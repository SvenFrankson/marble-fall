class HighlightArrow extends BABYLON.Mesh {

    public AlphaAnimation = Mummu.AnimationFactory.EmptyNumberCallback;

    public get size(): number {
        return this.scaling.x / this.baseSize;
    }

    public set size(v: number) {
        let s = v * this.baseSize
        this.scaling.copyFromFloats(s, s, s);
    }

    constructor(name: string, public game: Game, public readonly baseSize: number = 0.1, public dir?: BABYLON.Vector3) {
        super(name);
        this.material = game.materials.blueMaterial;
        this.scaling.copyFromFloats(this.baseSize, this.baseSize, this.baseSize);
        this.visibility = 0;
        if (this.dir) {
            this.rotationQuaternion = BABYLON.Quaternion.Identity();
        }
        this.AlphaAnimation = Mummu.AnimationFactory.CreateNumber(this, this, "visibility");
    }

    public async instantiate(): Promise<void> {
        let datas = await this.game.vertexDataLoader.get("./meshes/highlight-arrow.babylon");
        if (datas && datas[0]) {
            let data = datas[0];
            data.applyToMesh(this);
        }

        this.game.scene.onBeforeRenderObservable.add(this._update);
    }

    public show(duration: number): Promise<void> {
        return this.AlphaAnimation(1, duration);
    }

    public hide(duration: number): Promise<void> {
        return this.AlphaAnimation(0, duration);
    }

    public dispose(): void {
        super.dispose();
        this.game.scene.onBeforeRenderObservable.removeCallback(this._update);
    }

    private _update = () => {
        if (this.dir && this.isVisible) {
            let y = this.position.subtract(this.game.camera.globalPosition);
            Mummu.QuaternionFromYZAxisToRef(y, this.dir, this.rotationQuaternion);
        }
    }

    public onClick: () => void;
}