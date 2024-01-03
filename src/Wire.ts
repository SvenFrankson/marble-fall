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
        while (this.getChildren().length > 0) {
            this.getChildren()[0].dispose();
        }

        for (let i = 0; i < this.path.length - 1; i++) {
            let dir = this.path[i].subtract(this.path[i + 1]).normalize();
            let l = BABYLON.Vector3.Distance(this.path[i + 1], this.path[i]);
            let wireSection = BABYLON.CreateCapsule("wire-section", { radius: this.size * 0.5, height: l });    
            wireSection.position.copyFrom(this.path[i + 1]).addInPlace(this.path[i]).scaleInPlace(0.5);
            wireSection.rotationQuaternion = BABYLON.Quaternion.Identity();
            Mummu.QuaternionFromYZAxisToRef(dir, BABYLON.Axis.Y, wireSection.rotationQuaternion);
        }        
    }
}