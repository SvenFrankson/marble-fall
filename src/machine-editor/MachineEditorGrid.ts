class MachineEditorGrid extends BABYLON.Mesh {

    public selectorSquare: BABYLON.LinesMesh;
    public xGrid: BABYLON.Mesh;
    public yGrid: BABYLON.Mesh;
    public zGrid: BABYLON.Mesh;

    constructor(public editor: MachineEditor) {
        super("machine-editor-grid");
        BABYLON.CreatePlaneVertexData({ size: 100 }).applyToMesh(this);

        let gridMaterial = new BABYLON.StandardMaterial("ghost-material");
        gridMaterial.diffuseColor.copyFromFloats(0.8, 0.8, 1);
        gridMaterial.specularColor.copyFromFloats(0, 0, 0);
        gridMaterial.alpha = 0.01;

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

        this.selectorSquare = BABYLON.MeshBuilder.CreateLineSystem("machine-editor-selector-square", { 
            lines: [
                [
                    new BABYLON.Vector3(0, 0, - 0.001),
                    new BABYLON.Vector3(0, 1, - 0.001),
                    new BABYLON.Vector3(1, 1, - 0.001),
                    new BABYLON.Vector3(1, 0, - 0.001),
                    new BABYLON.Vector3(0, 0, - 0.001)
                ],
                [
                    new BABYLON.Vector3(0, 0, 0),
                    new BABYLON.Vector3(0, 1, 0),
                    new BABYLON.Vector3(1, 1, 0),
                    new BABYLON.Vector3(1, 0, 0),
                    new BABYLON.Vector3(0, 0, 0)
                ],
                [
                    new BABYLON.Vector3(0, 0, 0.001),
                    new BABYLON.Vector3(0, 1, 0.001),
                    new BABYLON.Vector3(1, 1, 0.001),
                    new BABYLON.Vector3(1, 0, 0.001),
                    new BABYLON.Vector3(0, 0, 0.001)
                ],
            ],
            colors: [
                [
                    new BABYLON.Color4(1, 1, 1, 1),
                    new BABYLON.Color4(1, 1, 1, 1),
                    new BABYLON.Color4(1, 1, 1, 1),
                    new BABYLON.Color4(1, 1, 1, 1),
                    new BABYLON.Color4(1, 1, 1, 1)
                ],
                [
                    new BABYLON.Color4(1, 1, 1, 1),
                    new BABYLON.Color4(1, 1, 1, 1),
                    new BABYLON.Color4(1, 1, 1, 1),
                    new BABYLON.Color4(1, 1, 1, 1),
                    new BABYLON.Color4(1, 1, 1, 1)
                ],
                [
                    new BABYLON.Color4(1, 1, 1, 1),
                    new BABYLON.Color4(1, 1, 1, 1),
                    new BABYLON.Color4(1, 1, 1, 1),
                    new BABYLON.Color4(1, 1, 1, 1),
                    new BABYLON.Color4(1, 1, 1, 1)
                ],
            ],
            updatable: true
        }, this.editor.game.scene);
    }

    public setIsVisible(v: boolean): void {
        this.isVisible = v;
    }

    
    
    public update(): void {
        this.xGrid.isVisible = false;
        this.yGrid.isVisible = false;
        this.zGrid.isVisible = false;
        this.selectorSquare.isVisible = false;

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

        if (this.editor.selectedObjects.length > 0) {
            let encloseStart: BABYLON.Vector3 = new BABYLON.Vector3(Infinity, - Infinity, - Infinity);
            let encloseEnd: BABYLON.Vector3 = new BABYLON.Vector3(- Infinity, Infinity, Infinity);
            this.editor.selectedObjects.forEach(obj => {
                if (obj instanceof MachinePart) {
                    encloseStart.x = Math.min(encloseStart.x, obj.position.x + obj.encloseStart.x);
                    encloseStart.y = Math.max(encloseStart.y, obj.position.y + obj.encloseStart.y);
                    encloseStart.z = Math.max(encloseStart.z, obj.position.z + obj.encloseStart.z);
                    
                    encloseEnd.x = Math.max(encloseEnd.x, obj.position.x + obj.encloseEnd.x);
                    encloseEnd.y = Math.min(encloseEnd.y, obj.position.y + obj.encloseEnd.y);
                    encloseEnd.z = Math.min(encloseEnd.z, obj.position.z + obj.encloseEnd.z);
                }
            });

            let m = 0.001;
            if (closestAxis.x != 0) {
                let positions = [
                    - m, encloseStart.y, encloseStart.z,
                    - m, encloseStart.y, encloseEnd.z,
                    - m, encloseEnd.y, encloseEnd.z,
                    - m, encloseEnd.y, encloseStart.z,
                    - m, encloseStart.y, encloseStart.z,

                    0, encloseStart.y + m, encloseStart.z + m,
                    0, encloseStart.y + m, encloseEnd.z - m,
                    0, encloseEnd.y - m, encloseEnd.z - m,
                    0, encloseEnd.y - m, encloseStart.z + m,
                    0, encloseStart.y + m, encloseStart.z + m,

                    m, encloseStart.y, encloseStart.z,
                    m, encloseStart.y, encloseEnd.z,
                    m, encloseEnd.y, encloseEnd.z,
                    m, encloseEnd.y, encloseStart.z,
                    m, encloseStart.y, encloseStart.z,
                ];
                this.selectorSquare.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions, true);
                this.selectorSquare.position.copyFromFloats(this.position.x, 0, 0);
            }
            if (closestAxis.y != 0) {
                let positions = [
                    encloseStart.x, - m, encloseStart.z,
                    encloseStart.x, - m, encloseEnd.z,
                    encloseEnd.x, - m, encloseEnd.z,
                    encloseEnd.x, - m, encloseStart.z,
                    encloseStart.x, - m, encloseStart.z,

                    encloseStart.x - m, 0, encloseStart.z + m,
                    encloseStart.x - m, 0, encloseEnd.z - m,
                    encloseEnd.x + m, 0, encloseEnd.z - m,
                    encloseEnd.x + m, 0, encloseStart.z + m,
                    encloseStart.x - m, 0, encloseStart.z + m,

                    encloseStart.x, m, encloseStart.z,
                    encloseStart.x, m, encloseEnd.z,
                    encloseEnd.x, m, encloseEnd.z,
                    encloseEnd.x, m, encloseStart.z,
                    encloseStart.x, m, encloseStart.z,
                ];
                this.selectorSquare.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions, true);
                this.selectorSquare.position.copyFromFloats(0, this.position.y, 0);
            }
            if (closestAxis.z != 0) {
                let positions = [
                    encloseStart.x, encloseStart.y, - m,
                    encloseStart.x, encloseEnd.y, - m,
                    encloseEnd.x, encloseEnd.y, - m,
                    encloseEnd.x, encloseStart.y, - m,
                    encloseStart.x, encloseStart.y, - m,

                    encloseStart.x - m, encloseStart.y + m, 0,
                    encloseStart.x - m, encloseEnd.y - m, 0,
                    encloseEnd.x + m, encloseEnd.y - m, 0,
                    encloseEnd.x + m, encloseStart.y + m, 0,
                    encloseStart.x - m, encloseStart.y + m, 0,

                    encloseStart.x, encloseStart.y, m,
                    encloseStart.x, encloseEnd.y, m,
                    encloseEnd.x, encloseEnd.y, m,
                    encloseEnd.x, encloseStart.y, m,
                    encloseStart.x, encloseStart.y, m,
                ];
                this.selectorSquare.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions, true);
                this.selectorSquare.position.copyFromFloats(0, 0, this.position.z);
            }
            this.selectorSquare.isVisible = true;
        }
    }
}