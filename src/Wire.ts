class Wire extends BABYLON.Mesh {

    public static DEBUG_DISPLAY: boolean = false;

    public static Instances: Nabu.UniqueList<Wire> = new Nabu.UniqueList<Wire>();

    public path: BABYLON.Vector3[] = [];
    public normals: BABYLON.Vector3[] = [];
    public absolutePath: BABYLON.Vector3[] = [];
    public get size(): number {
        return this.track.wireSize;
    }
    public get radius(): number {
        return this.size * 0.5;
    }

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

        let n = 8;
        let shape: BABYLON.Vector3[] = [];
        for (let i = 0; i < n; i++) {
            let a = i / n * 2 * Math.PI;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            shape[i] = new BABYLON.Vector3(cosa * this.radius, sina * this.radius, 0);
        }

        if (!Wire.DEBUG_DISPLAY) {
            let wire = BABYLON.ExtrudeShape("wire", { shape: shape, path: this.path, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
            wire.parent = this;
        }
        
        if (Wire.DEBUG_DISPLAY) {
            for (let i = 0; i < this.path.length - 1; i++) {
                let dir = this.path[i].subtract(this.path[i + 1]).normalize();
                let l = BABYLON.Vector3.Distance(this.path[i + 1], this.path[i]);
                let wireSection = BABYLON.CreateCapsule("wire-section", { radius: this.size * 0.6, height: l });
                wireSection.position.copyFrom(this.path[i + 1]).addInPlace(this.path[i]).scaleInPlace(0.5);
                wireSection.rotationQuaternion = BABYLON.Quaternion.Identity();
                wireSection.parent = this;
                Mummu.QuaternionFromYZAxisToRef(dir, BABYLON.Axis.Y, wireSection.rotationQuaternion);
            }
        }
    }
}