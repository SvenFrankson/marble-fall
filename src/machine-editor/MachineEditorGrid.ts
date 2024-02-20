class MachineEditorGrid extends BABYLON.Mesh {

    public xGrid: BABYLON.Mesh;
    public yGrid: BABYLON.Mesh;
    public zGrid: BABYLON.Mesh;

    constructor(public editor: MachineEditor) {
        super("machine-editor-grid");
        BABYLON.CreatePlaneVertexData({ size: 100 }).applyToMesh(this);
        this.material = this.editor.game.ghostMaterial;
        this.rotationQuaternion = BABYLON.Quaternion.Identity();

        let count = 20;

        let xLines: BABYLON.Vector3[][] = [];
        for (let j = - count; j <= count; j++) {
            xLines.push([
                new BABYLON.Vector3(0, j * tileHeight - 0.5 * tileHeight, - count * tileDepth),
                new BABYLON.Vector3(0, j * tileHeight - 0.5 * tileHeight, count * tileDepth),
            ])
        }
        for (let k = - count; k <= count; k++) {
            xLines.push([
                new BABYLON.Vector3(0, - count * tileHeight - 0.5 * tileHeight, k * tileDepth - 0.5 * tileDepth),
                new BABYLON.Vector3(0, count * tileHeight - 0.5 * tileHeight, k * tileDepth - 0.5 * tileDepth),
            ])
        }
        this.xGrid = BABYLON.MeshBuilder.CreateLineSystem("machine-editor-x-grid", { lines: xLines }, editor.game.scene);

        let yLines: BABYLON.Vector3[][] = [];
        for (let i = - count; i <= count; i++) {
            yLines.push([
                new BABYLON.Vector3(i * tileWidth - 0.5 * tileWidth, 0, - count * tileDepth),
                new BABYLON.Vector3(i * tileWidth - 0.5 * tileWidth, 0, count * tileDepth),
            ])
        }
        for (let k = - count; k <= count; k++) {
            yLines.push([
                new BABYLON.Vector3(- count * tileWidth - 0.5 * tileWidth, 0, k * tileDepth - 0.5 * tileDepth),
                new BABYLON.Vector3(count * tileWidth - 0.5 * tileWidth, 0, k * tileDepth - 0.5 * tileDepth),
            ])
        }
        this.yGrid = BABYLON.MeshBuilder.CreateLineSystem("machine-editor-y-grid", { lines: yLines }, editor.game.scene);

        let zLines: BABYLON.Vector3[][] = [];
        for (let j = - count; j <= count; j++) {
            zLines.push([
                new BABYLON.Vector3(- count * tileWidth - 0.5 * tileWidth, j * tileHeight - 0.5 * tileHeight, 0),
                new BABYLON.Vector3(count * tileWidth - 0.5 * tileWidth, j * tileHeight - 0.5 * tileHeight, 0),
            ])
        }
        for (let i = - count; i <= count; i++) {
            zLines.push([
                new BABYLON.Vector3(i * tileWidth - 0.5 * tileWidth, - count * tileHeight - 0.5 * tileHeight, 0),
                new BABYLON.Vector3(i * tileWidth - 0.5 * tileWidth, count * tileHeight - 0.5 * tileHeight, 0),
            ])
        }
        this.zGrid = BABYLON.MeshBuilder.CreateLineSystem("machine-editor-z-grid", { lines: zLines }, editor.game.scene);
    }

    public setIsVisible(v: boolean): void {
        this.isVisible = v;
    }
    
    public updateAxis(): void {
        this.xGrid.isVisible = false;
        this.yGrid.isVisible = false;
        this.zGrid.isVisible = false;
        this.xGrid.position.copyFrom(this.position);
        this.yGrid.position.copyFrom(this.position);
        this.zGrid.position.copyFrom(this.position);
        
        let camDir = this.editor.game.camera.getDirection(BABYLON.Axis.Z);
        let closestAxis = Mummu.GetClosestAxis(camDir);
        Mummu.QuaternionFromZYAxisToRef(closestAxis, BABYLON.Vector3.One(), this.rotationQuaternion);
        if (closestAxis.x != 0) {
            this.xGrid.isVisible = this.isVisible;
        }
        if (closestAxis.y != 0) {
            this.yGrid.isVisible = this.isVisible;
        }
        if (closestAxis.z != 0) {
            this.zGrid.isVisible = this.isVisible;
        }
    }
}