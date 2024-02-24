/// <reference path="../machine/MachinePart.ts"/>

class Spiral extends MachinePart {


    constructor(machine: Machine, i: number, j: number, k: number, w: number = 1, h: number = 1, n: number = 1, mirrorX?: boolean, mirrorZ?: boolean) {
        super(machine, i, j, k);

        let partName = "spiral-" + w.toFixed(0) + "." + h.toFixed(0) + "." + n.toFixed(0);
        this.setTemplate(this.machine.templateManager.getTemplate(partName, mirrorX, mirrorZ));
        this.generateWires();
    }

    public static GenerateTemplate(w: number, h: number, n: number, mirrorX: boolean, mirrorZ: boolean): MachinePartTemplate {
        let template = new MachinePartTemplate();

        template.partName = "spiral-" + w.toFixed(0) + "." + h.toFixed(0) + "." + n.toFixed(0);
        template.angleSmoothSteps = 50;

        template.w = w;
        template.h = h;
        template.d = 3;
        template.n = n;
        template.mirrorX = mirrorX;
        template.mirrorZ = mirrorZ;
            
        template.xExtendable = true;
        template.yExtendable = true;
        template.nExtendable = true;
        template.xMirrorable = true;
        template.zMirrorable = true;

        template.trackTemplates[0] = new TrackTemplate(template);
        template.trackTemplates[0].preferedStartBank = - Math.PI / 10 * (template.mirrorX ? - 1 : 1);
        template.trackTemplates[0].preferedEndBank = - Math.PI / 10 * (template.mirrorX ? - 1 : 1);
        template.trackTemplates[0].onNormalEvaluated = (n => {
            n.copyFromFloats(0, 1, 0);
        })
        template.trackTemplates[0].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), Tools.V3Dir(90))
        ];

        let nSpirals = template.n;
        let xCenterStart = 0;
        let xCenterEnd = tileWidth * (template.w - 1);
        let r = tileWidth * 0.5 * 0.8;
        let heightStart = 0;
        let heightEnd = - tileHeight * template.h;
        
        for (let n = 0; n <= 6 * nSpirals; n++) {
            let f = n / (6 * nSpirals);
            let a = 2 * Math.PI * n / 6;
            let cosa = Math.cos(a);
            let sina = Math.sin(a);

            let dir: BABYLON.Vector3;
            if (n === 0 || n === 6 * nSpirals) {
                dir = BABYLON.Vector3.Right();
            }

            template.trackTemplates[0].trackpoints.push(
                new TrackPoint(
                    template.trackTemplates[0],
                    new BABYLON.Vector3(
                        f * (xCenterEnd - xCenterStart) + xCenterStart + sina * r,
                        f * (heightEnd - heightStart) + heightStart,
                        (cosa - 1) * r
                    ),
                    dir
                )
            );
        }

        template.trackTemplates[0].trackpoints.push(
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(tileWidth * (template.w - 0.5), heightEnd, 0), Tools.V3Dir(90))
        );

        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }
        if (mirrorZ) {
            template.mirrorZTrackPointsInPlace();
        }

        template.initialize();

        console.log(template.trackTemplates[0].preferedStartBank);
        console.log(template.trackTemplates[0].preferedEndBank);

        return template;
    }
}
