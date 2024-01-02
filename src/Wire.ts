class Wire extends BABYLON.Mesh {

    public static Instances: Nabu.UniqueList<Wire> = new Nabu.UniqueList<Wire>();

    public path: BABYLON.Vector3[] = [];
    public size: number = 0.002;

    constructor() {
        super("wire");
        this.rotationQuaternion = BABYLON.Quaternion.Identity();

        Wire.Instances.push(this);
    }

    public async instantiate(): Promise<void> {
        let dir = this.path[1].subtract(this.path[0]).normalize();
        let l = BABYLON.Vector3.Distance(this.path[0], this.path[1]);
        let data = BABYLON.CreateCylinderVertexData({ diameter: this.size, height: l });
        data.applyToMesh(this);

        this.position.copyFrom(this.path[0]).addInPlace(this.path[1]).scaleInPlace(0.5);
        Mummu.QuaternionFromYZAxisToRef(dir, BABYLON.Axis.Y, this.rotationQuaternion);
    }
}