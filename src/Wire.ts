class Wire extends BABYLON.Mesh {

    public static Instances: Nabu.UniqueList<Wire> = new Nabu.UniqueList<Wire>();

    public path: BABYLON.Vector3[] = [];
    public absolutePath: BABYLON.Vector3[] = [];
    public size: number = 0.002;

    constructor(public track: Track) {
        super("wire");
        this.parent = this.track;
        this.rotationQuaternion = BABYLON.Quaternion.Identity();
        Wire.Instances.push(this);
    }

    public recomputeAbsolutePath(): void {
        this.absolutePath.splice(this.path.length);
        for (let i = 0; i < this.path.length; i++) {
            if (!this.absolutePath[i]) {
                this.absolutePath[i] = BABYLON.Vector3.Zero();
            }
            BABYLON.Vector3.TransformCoordinatesToRef(this.path[i], this.getWorldMatrix(), this.absolutePath[i]);
        }
    }

    public async instantiate(): Promise<void> {
        while (this.getChildren().length > 0) {
            this.getChildren()[0].dispose();
        }

        for (let i = 0; i < this.path.length - 1; i++) {
            let dir = this.path[i].subtract(this.path[i + 1]).normalize();
            let l = BABYLON.Vector3.Distance(this.path[i + 1], this.path[i]);
            let wireSection = BABYLON.CreateCapsule("wire-section", { radius: this.size * 0.5, height: l });
            wireSection.position.copyFrom(this.path[i + 1]).addInPlace(this.path[i]).scaleInPlace(0.5);
            wireSection.rotationQuaternion = BABYLON.Quaternion.Identity();
            wireSection.parent = this;
            Mummu.QuaternionFromYZAxisToRef(dir, BABYLON.Axis.Y, wireSection.rotationQuaternion);
        }        
    }
}