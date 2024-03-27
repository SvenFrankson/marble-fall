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

    public startTipCenter: BABYLON.Vector3;
    public startTipNormal: BABYLON.Vector3;
    public startTipDir: BABYLON.Vector3;
    public endTipCenter: BABYLON.Vector3;
    public endTipNormal: BABYLON.Vector3;
    public endTipDir: BABYLON.Vector3;

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

    public async instantiate(color: number = 0): Promise<void> {
        let q = this.track.game.config.getValue("graphicQ");

        while (this.getChildren().length > 0) {
            this.getChildren()[0].dispose();
        }

        let n = 3;
        if (q === 1) {
            n = 6;
        }
        else if (q === 2) {
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
            if (q === 1) {
                path = [];
                for (let i = 0; i < this.path.length; i++) {
                    if (i % 3 === 0 || i === this.path.length - 1) {
                        path.push(this.path[i]);
                    }
                }
            }
            if (q === 0) {
                path = [];
                for (let i = 0; i < this.path.length; i++) {
                    if (i % 6 === 0 || i === this.path.length - 1) {
                        path.push(this.path[i]);
                    }
                }
            }

            if (this.startTipDir) {
                let d = this.startTipDir.normalize().scaleInPlace(-1).scaleInPlace(this.track.wireGauge * 0.5);
                Mummu.RotateInPlace(d, this.startTipNormal, - Math.PI / 2);
                let tipPath: BABYLON.Vector3[] = [d.add(this.startTipCenter)]
                for (let i = 0; i < 8 - 1; i++) {
                    Mummu.RotateInPlace(d, this.startTipNormal, Math.PI / 8);
                    tipPath.push(d.add(this.startTipCenter));
                }
                path = [...tipPath, ...path];
            }

            if (this.endTipDir) {
                let d = this.endTipDir.normalize().scaleInPlace(this.track.wireGauge * 0.5);
                Mummu.RotateInPlace(d, this.endTipNormal, - Math.PI / 2);
                let tipPath: BABYLON.Vector3[] = []
                for (let i = 0; i < 8; i++) {
                    Mummu.RotateInPlace(d, this.endTipNormal, Math.PI / 8);
                    tipPath.push(d.add(this.endTipCenter));
                }
                path.push(...tipPath);
            }

            let wire = BABYLON.ExtrudeShape("wire", { shape: shape, path: path, closeShape: true, cap: BABYLON.Mesh.CAP_ALL });
            wire.parent = this;
            wire.material = this.track.game.materials.getMetalMaterial(color);
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