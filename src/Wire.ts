class Wire extends BABYLON.Mesh {

    public static DEBUG_DISPLAY: boolean = false;

    public static Instances: Nabu.UniqueList<Wire> = new Nabu.UniqueList<Wire>();

    public path: BABYLON.Vector3[] = [];
    public normals: BABYLON.Vector3[] = [];
    public absolutePath: BABYLON.Vector3[] = [];
    public wireSize: number;
    public get size(): number {
        if (isFinite(this.wireSize)) {
            return this.wireSize;
        }
        return this.track.wireSize;
    }
    public get radius(): number {
        return this.size * 0.5;
    }

    constructor(public track: MachinePart) {
        super("wire");
        this.parent = this.track;
        this.rotationQuaternion = BABYLON.Quaternion.Identity();
        Wire.Instances.push(this);
    }

    public show(): void {
        this.isVisible = true;
        this.getChildMeshes().forEach(child => {
            child.isVisible = true;
        })
    }

    public hide(): void {
        this.isVisible = false;
        this.getChildMeshes().forEach(child => {
            child.isVisible = false;
        })
    }

    public recomputeAbsolutePath(): void {
        this.computeWorldMatrix(true);
        this.absolutePath.splice(this.path.length);
        for (let i = 0; i < this.path.length; i++) {
            if (!this.absolutePath[i]) {
                this.absolutePath[i] = BABYLON.Vector3.Zero();
            }
            BABYLON.Vector3.TransformCoordinatesToRef(this.path[i], this.getWorldMatrix(), this.absolutePath[i]);
        }
    }

    public async instantiate(): Promise<void> {
        let q = this.track.game.config.graphicQ;

        while (this.getChildren().length > 0) {
            this.getChildren()[0].dispose();
        }

        let n = 4;
        if (q === 2) {
            n = 6;
        }
        else if (q === 3) {
            n = 8;
        }
        let shape: BABYLON.Vector3[] = [];
        for (let i = 0; i < n; i++) {
            let a = i / n * 2 * Math.PI;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);
            shape[i] = new BABYLON.Vector3(cosa * this.radius, sina * this.radius, 0);
        }

        if (!Wire.DEBUG_DISPLAY) {
            let path = this.path;
            if (q === 2) {
                path = [];
                for (let i = 0; i < this.path.length; i++) {
                    if (i % 3 === 0 || i === this.path.length - 1) {
                        path.push(this.path[i]);
                    }
                }
            }
            if (q === 1) {
                path = [];
                for (let i = 0; i < this.path.length; i++) {
                    if (i % 6 === 0 || i === this.path.length - 1) {
                        path.push(this.path[i]);
                    }
                }
            }
            let wire = BABYLON.ExtrudeShape("wire", { shape: shape, path: path, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
            wire.parent = this;
            wire.material = this.track.game.steelMaterial;
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