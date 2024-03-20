class Wall extends MachinePart {

    constructor(machine: Machine, prop: IMachinePartProp) {
        super(machine, prop);

        let partName = "wall-" + prop.h.toFixed(0) + "." + prop.d.toFixed(0);
        this.setTemplate(this.machine.templateManager.getTemplate(partName, prop.mirrorX));
        this.generateWires();
    }

    public static GenerateTemplate(h: number, d: number, mirrorX?: boolean): MachinePartTemplate {
        let template = new MachinePartTemplate();

        template.partName = "wall-" + h.toFixed(0) + "." + d.toFixed(0);
        template.angleSmoothSteps = 100;
        template.maxAngle = 0.8 * Math.PI / 2;
        template.minTurnRadius = 0.12;

        template.w = 1;
        template.h = h;
        template.minH = 3;
        template.d = d;
        template.minD = 3;
        template.mirrorX = mirrorX;
            
        template.yExtendable = true;
        template.zExtendable = true;
        template.xMirrorable = true;

        let r = tileWidth * 0.5;
        let rY = template.h * tileHeight * 0.5;
        let depthStart = 0;
        let depthEnd = - tileDepth * (template.d - 1);

        template.trackTemplates[0] = new TrackTemplate(template);
        template.trackTemplates[0].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(- tileWidth * 0.5, - template.h * tileHeight, 0), Tools.V3Dir(90))
        ];

        for (let n = 0; n <= 8; n++) {
            let f = n / 8;
            let cosa = Math.cos(2 * Math.PI * f);
            let sina = Math.sin(Math.PI * f);

            template.trackTemplates[0].trackpoints.push(
                new TrackPoint(
                    template.trackTemplates[0],
                    new BABYLON.Vector3(
                        - (1 - sina) * r + r,
                        (1 - cosa) * rY - template.h * tileHeight,
                        Nabu.Easing.easeInOutSine(Nabu.Easing.easeInOutSine(f)) * (depthEnd - depthStart) + depthStart
                    ),
                    undefined,
                    n === 4 ? Tools.V3Dir(Math.PI) : undefined
                )
            );
        }

        template.trackTemplates[0].trackpoints.push(
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(- tileWidth * 0.5, - template.h * tileHeight, - tileDepth * (template.d - 1)), Tools.V3Dir(- 90))
        );

        let points = template.trackTemplates[0].trackpoints.map(tp => { return tp.position.clone() });
        let f = 3;
        for (let n = 0; n < 2; n++) {
            let smoothedPoints = [...points].map(p => { return p.clone() });
            for (let i = 1; i < smoothedPoints.length - 1; i++) {
                smoothedPoints[i].copyFrom(points[i - 1]).addInPlace(points[i].scale(f)).addInPlace(points[i + 1]).scaleInPlace(1 / (2 + f));
            }
            points = smoothedPoints;
        }

        for (let i = 0; i < points.length; i++) {
            template.trackTemplates[0].trackpoints[i].position.copyFrom(points[i]);
        }

        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }

        template.initialize();

        return template;
    }
}