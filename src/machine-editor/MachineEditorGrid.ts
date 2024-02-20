class MachineEditorGrid extends BABYLON.Mesh {

    public xGrid: BABYLON.Mesh;
    public yGrid: BABYLON.Mesh;
    public zGrid: BABYLON.Mesh;

    constructor(public editor: MachineEditor) {
        super("machine-editor-grid");
        BABYLON.CreatePlaneVertexData({ size: 100 }).applyToMesh(this);

        let gridMaterial = new BABYLON.StandardMaterial("grid-material");
        gridMaterial.diffuseColor.copyFromFloats(0, 0, 0);
        gridMaterial.specularColor.copyFromFloats(0, 0, 0);
        gridMaterial.alpha = 0.3;

        this.material = gridMaterial;
        this.rotationQuaternion = BABYLON.Quaternion.Identity();

        let count = 20;

        let xLines: BABYLON.Vector3[][] = [];
        let color = new BABYLON.Color4(1, 1, 1, 0.2);
        let colors: BABYLON.Color4[][] = [];
        for (let j = - count; j <= count; j++) {
            xLines.push([
                new BABYLON.Vector3(0, j * tileHeight - 0.5 * tileHeight, - count * tileDepth),
                new BABYLON.Vector3(0, j * tileHeight - 0.5 * tileHeight, count * tileDepth),
            ]);
            colors.push([color, color]);
        }
        for (let k = - count; k <= count; k++) {
            xLines.push([
                new BABYLON.Vector3(0, - count * tileHeight - 0.5 * tileHeight, k * tileDepth - 0.5 * tileDepth),
                new BABYLON.Vector3(0, count * tileHeight - 0.5 * tileHeight, k * tileDepth - 0.5 * tileDepth),
            ]);
            colors.push([color, color]);
        }
        this.xGrid = BABYLON.MeshBuilder.CreateLineSystem("machine-editor-x-grid", { lines: xLines, colors: colors }, editor.game.scene);

        let yLines: BABYLON.Vector3[][] = [];
        for (let i = - count; i <= count; i++) {
            yLines.push([
                new BABYLON.Vector3(i * tileWidth - 0.5 * tileWidth, 0, - count * tileDepth),
                new BABYLON.Vector3(i * tileWidth - 0.5 * tileWidth, 0, count * tileDepth),
            ]);
        }
        for (let k = - count; k <= count; k++) {
            yLines.push([
                new BABYLON.Vector3(- count * tileWidth - 0.5 * tileWidth, 0, k * tileDepth - 0.5 * tileDepth),
                new BABYLON.Vector3(count * tileWidth - 0.5 * tileWidth, 0, k * tileDepth - 0.5 * tileDepth),
            ]);
        }
        this.yGrid = BABYLON.MeshBuilder.CreateLineSystem("machine-editor-y-grid", { lines: yLines, colors: colors }, editor.game.scene);

        let zLines: BABYLON.Vector3[][] = [];
        for (let j = - count; j <= count; j++) {
            zLines.push([
                new BABYLON.Vector3(- count * tileWidth - 0.5 * tileWidth, j * tileHeight - 0.5 * tileHeight, 0),
                new BABYLON.Vector3(count * tileWidth - 0.5 * tileWidth, j * tileHeight - 0.5 * tileHeight, 0),
            ]);
        }
        for (let i = - count; i <= count; i++) {
            zLines.push([
                new BABYLON.Vector3(i * tileWidth - 0.5 * tileWidth, - count * tileHeight - 0.5 * tileHeight, 0),
                new BABYLON.Vector3(i * tileWidth - 0.5 * tileWidth, count * tileHeight - 0.5 * tileHeight, 0),
            ]);
        }
        this.zGrid = BABYLON.MeshBuilder.CreateLineSystem("machine-editor-z-grid", { lines: zLines, colors: colors }, editor.game.scene);
    }

    public setIsVisible(v: boolean): void {
        this.isVisible = v;
    }

    private _lastSelectedObjectsCount: number = 0;
    private _lastSelectedObject: MachinePart | Ball;
    private _lastPosition: BABYLON.Vector3 = BABYLON.Vector3.Zero();
    private _lastCamDir: BABYLON.Vector3 = BABYLON.Vector3.One();

    public update(): void {
        let camDir = this.editor.game.camera.getDirection(BABYLON.Axis.Z);
        if (
            this.editor.selectedObjectsCount != this._lastSelectedObjectsCount ||
            this.editor.selectedObject != this._lastSelectedObject ||
            Mummu.Angle(camDir, this._lastCamDir) > Math.PI / 180 ||
            BABYLON.Vector3.DistanceSquared(this.position, this._lastPosition) > 0.001 * 0.001
        ) {
            this.xGrid.isVisible = false;
            this.yGrid.isVisible = false;
            this.zGrid.isVisible = false;

            this.xGrid.position.copyFrom(this.position);
            this.yGrid.position.copyFrom(this.position);
            this.zGrid.position.copyFrom(this.position);
            
            let minIJK = new BABYLON.Vector3(- Infinity, - Infinity, - Infinity);
            let maxIJK = new BABYLON.Vector3(Infinity, Infinity, Infinity);

            let worldEncloseStart: BABYLON.Vector3 = new BABYLON.Vector3(Infinity, - Infinity, - Infinity);
            let worldEncloseEnd: BABYLON.Vector3 = new BABYLON.Vector3(- Infinity, Infinity, Infinity);
            
            if (this.editor.selectedObjects.length > 0) {
                this.editor.selectedObjects.forEach(obj => {
                    if (obj instanceof MachinePart) {
                        worldEncloseStart.x = Math.min(worldEncloseStart.x, obj.position.x + obj.encloseStart.x);
                        worldEncloseStart.y = Math.max(worldEncloseStart.y, obj.position.y + obj.encloseStart.y);
                        worldEncloseStart.z = Math.max(worldEncloseStart.z, obj.position.z + obj.encloseStart.z);
                        
                        worldEncloseEnd.x = Math.max(worldEncloseEnd.x, obj.position.x + obj.encloseEnd.x);
                        worldEncloseEnd.y = Math.min(worldEncloseEnd.y, obj.position.y + obj.encloseEnd.y);
                        worldEncloseEnd.z = Math.min(worldEncloseEnd.z, obj.position.z + obj.encloseEnd.z);
                    }
                });
                
                let closestAxis = Mummu.GetClosestAxis(camDir);
                Mummu.QuaternionFromZYAxisToRef(closestAxis, BABYLON.Vector3.One(), this.rotationQuaternion);
                let m = 0.001;
                if (closestAxis.x != 0) {
                    this.xGrid.isVisible = this.isVisible;

                    if (this.editor.selectedObject instanceof MachinePart) {
                        if (closestAxis.x > 0) {
                            maxIJK.x = this.editor.selectedObject.i;
                            this.xGrid.position.x = worldEncloseEnd.x;
                        }
                        else {
                            minIJK.x = this.editor.selectedObject.i;
                            this.xGrid.position.x = worldEncloseStart.x;
                        }
                    }
                }
                if (closestAxis.y != 0) {
                    this.yGrid.isVisible = this.isVisible;

                    if (this.editor.selectedObject instanceof MachinePart) {
                        if (closestAxis.y > 0) {
                            minIJK.y = this.editor.selectedObject.j;
                            this.yGrid.position.y = worldEncloseStart.y;
                        }
                        else {
                            maxIJK.y = this.editor.selectedObject.j;
                            this.yGrid.position.y = worldEncloseEnd.y;
                        }
                    }
                }
                if (closestAxis.z != 0) {
                    this.zGrid.isVisible = this.isVisible;

                    if (this.editor.selectedObject instanceof MachinePart) {
                        if (closestAxis.z > 0) {
                            minIJK.z = this.editor.selectedObject.k;
                            this.zGrid.position.z = worldEncloseStart.z;
                        }
                        else {
                            maxIJK.z = this.editor.selectedObject.k;
                            this.zGrid.position.z = worldEncloseEnd.z;
                        }
                    }
                }
            }

            /*
            this.editor.machine.parts.forEach(part => {
                if (
                    part.i <= maxIJK.x && part.i >= minIJK.x && 
                    part.j <= maxIJK.y && part.j >= minIJK.y &&
                    part.k <= maxIJK.z && part.k >= minIJK.z
                ) {
                    part.partVisibilityMode = PartVisibilityMode.Default;
                }
                else {
                    part.partVisibilityMode = PartVisibilityMode.Ghost;
                }
            })
            */

            this._lastSelectedObjectsCount = this.editor.selectedObjects.length;
            this._lastSelectedObject = this.editor.selectedObject;
            this._lastPosition.copyFrom(this.position);
            this._lastCamDir.copyFrom(camDir);
        }      
    }
}