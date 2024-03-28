class Stairway extends MachinePart {

    public boxesCount: number = 4;
    public boxes: BABYLON.Mesh[] = [];
    public y0: number = 0;
    public y1: number = 0;
    public stepH: number = 0;
    public dH: number = 0.005;

    constructor(machine: Machine, prop: IMachinePartProp) {
        super(machine, prop);

        let partName = "stairway-" + prop.w.toFixed(0);
        this.setTemplate(this.machine.templateManager.getTemplate(partName, prop.mirrorX));

        let x = 1;
        if (prop.mirrorX) {
            x = - 1;
        }

        let h = 2 * this.template.w;
        this.boxesCount = 5;

        let x0 = - tileWidth * 0.3;
        let x1 = tileWidth * 0.3;
        let stepW = (x1 - x0) / this.boxesCount;
        this.y0 = - tileHeight * (h + 0.05) - 0.005;
        this.y1 = tileHeight * 0.05 + 0.005;
        this.stepH = (this.y1 - this.y0) / (this.boxesCount);
        for (let i = 0; i < this.boxesCount; i++) {
            let data = BABYLON.CreateBoxVertexData({ width: stepW, height: this.stepH * 2, depth: 0.02 });

            let positions = data.positions;
            for (let p = 0; p < positions.length; p++) {
                let x = positions[3 * p];
                let y = positions[3 * p + 1];
                let z = positions[3 * p + 2];
                if (x < 0 && y > 0) {
                    positions[3 * p + 1] += this.dH;
                }
            }
            data.positions = positions;

            let box = new BABYLON.Mesh("box-" + i);
            data.applyToMesh(box);
            box.rotationQuaternion = BABYLON.Quaternion.Identity();
            box.parent = this;
            let fX = i / this.boxesCount;
            box.position.x = (1 - fX) * x0 + fX * x1 + stepW * 0.5;
            let fY = (i + 0.5) / this.boxesCount;
            box.position.y = (1 - fY) * this.y0 + fY * this.y1 - this.stepH;

            this.boxes[i] = box;
        }

        this.generateWires();
        
        this.machine.onStopCallbacks.push(this.reset);
        this.reset();
    }

    public static GenerateTemplate(w: number, mirrorX: boolean) {
        let template = new MachinePartTemplate();

        template.partName = "stairway-" + w.toFixed(0);

        let h = 2 * w;
        template.h = h;
        template.w = w;
        template.mirrorX = mirrorX;

        template.xExtendable = true;
        template.xMirrorable = true;

        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();

        let dirLeft = new BABYLON.Vector3(1, 0, 0);
        dirLeft.normalize();
        let nLeft = new BABYLON.Vector3(0, 1, 0);
        nLeft.normalize();
        
        let dirRight = new BABYLON.Vector3(1, 1, 0);
        dirRight.normalize();
        let nRight = new BABYLON.Vector3(- 1, 1, 0);
        nRight.normalize();

        template.trackTemplates[0] = new TrackTemplate(template);
        template.trackTemplates[0].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(
                - tileWidth * 0.5,
                - tileHeight * h,
                0
            ), dir),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(
                - tileWidth * 0.3,
                - tileHeight * (h + 0.05),
                0
            ), dir)
        ];

        template.trackTemplates[1] = new TrackTemplate(template);
        template.trackTemplates[1].trackpoints = [
            new TrackPoint(template.trackTemplates[1], new BABYLON.Vector3(
                tileWidth * 0.3,
                tileHeight * 0.05,
                0
            ), dir),
            new TrackPoint(template.trackTemplates[1], new BABYLON.Vector3(
                tileWidth * 0.5,
                0,
                0
            ), dir)
        ];
        
        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }
        
        template.initialize();

        return template;
    }

    public dispose(): void {
        super.dispose();
        this.machine.onStopCallbacks.remove(this.reset);
    }
    
    public reset = () => {
        for (let i = 0; i < this.boxesCount; i++) {
            this.a = 0;
            this.update(0);
        }
    }

    public l: number = 0;
    public p: number = 0;
    public speed: number = Math.PI * 0.6; // in m/s
    public a: number = 0;

    public update(dt: number): void {
        let dA = this.speed * dt * this.game.currentTimeFactor;
        let x = 1;
        if (this.mirrorX) {
            x = - 1;
        }

        this.a = (this.a + dA);
        while (this.a > 2 * Math.PI) {
            this.a -= 2 * Math.PI;
        }
        for (let i = 0; i < this.boxes.length; i++) {
            let box = this.boxes[i];
            
            let fY = (i + 0.5) / this.boxesCount;
            box.position.y = (1 - fY) * this.y0 + fY * this.y1 - this.stepH - this.dH * 0.5;
            if (i % 2 === 0) {
                box.position.y += Math.cos(this.a) * (this.stepH * 0.5 + this.dH * 0.5);
            }
            else {
                box.position.y += Math.cos(this.a + Math.PI) * (this.stepH * 0.5 + this.dH * 0.5);
            }
            this.boxes[i].freezeWorldMatrix();
            this.boxes[i].getChildMeshes().forEach(child => {
                child.freezeWorldMatrix();
            });
        }
    }
}