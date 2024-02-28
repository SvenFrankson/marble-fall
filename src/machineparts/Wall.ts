class Wall extends MachinePart {

    constructor(machine: Machine, i: number, j: number, k: number, h: number = 4, d: number = 1, mirrorX?: boolean) {
        super(machine, i, j, k);

        if (d === 3) {
            h = Math.max(h, 5);
        }
        if (d === 4) {
            h = Math.max(h, 7);
        }

        let partName = "wall-" + h.toFixed(0) + "." + d.toFixed(0);
        this.setTemplate(this.machine.templateManager.getTemplate(partName, mirrorX));
        this.generateWires();
    }

    public static GenerateTemplate(h: number, d: number, mirrorX?: boolean): MachinePartTemplate {
        let template = new MachinePartTemplate();

        template.partName = "wall-" + h.toFixed(0) + "." + d.toFixed(0);
        template.angleSmoothSteps = 50;
        
        template.w = Math.ceil(d / 3),
        template.h = h,
        template.d = d,
        template.mirrorX = mirrorX,

        template.yExtendable = true;
        template.zExtendable = true;
        template.minH = 4;
        template.minD = 2;
        template.maxD = 4;
        template.xMirrorable = true;

        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();

        let r = 0.5 * tileDepth * (template.d - 1)
        let zEnd = - tileDepth * (template.d - 1);
        let yStart = - tileHeight * template.h;

        template.trackTemplates[0] = new TrackTemplate(template);
        let center = new BABYLON.Vector3(- tileWidth * 0.5, 0, zEnd * 0.5);
        template.trackTemplates[0].onNormalEvaluated = ((n, p) => {
            let dx = Math.abs(p.x) / (tileWidth * 0.5);
            let dy = Math.abs(p.y - yStart) / (r * 0.5);
            let d = Math.sqrt(dx * dx + dy * dy);
            let f = Nabu.MinMax(1 - d, 0, 1);
            let newN = center.subtract(p).normalize();
            n.scaleInPlace(1 - f).addInPlace(newN.scaleInPlace(f));
        })
        template.trackTemplates[0].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(- tileWidth * 0.5, yStart, 0), new BABYLON.Vector3(1, 0, 0)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(0, yStart, 0), new BABYLON.Vector3(1, 0, 0)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(r, yStart + r, 0), new BABYLON.Vector3(0, 1, 0)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(r, - r, 0), new BABYLON.Vector3(0, 1, 0)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(r, 0, zEnd * 0.5), new BABYLON.Vector3(0, 0, - 1)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(r, - r, zEnd), new BABYLON.Vector3(0, - 1, 0)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(r, yStart + r, zEnd), new BABYLON.Vector3(0, - 1, 0)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(0, yStart, zEnd), new BABYLON.Vector3(- 1, 0, 0)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(- tileWidth * 0.5, yStart, zEnd), new BABYLON.Vector3(- 1, 0, 0)),
        ];

        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }

        template.initialize();

        return template;
    }
}