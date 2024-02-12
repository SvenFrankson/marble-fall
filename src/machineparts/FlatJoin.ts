class FlatJoin extends MachinePart {
    
    constructor(machine: Machine, i: number, j: number, k: number, mirrorX?: boolean) {
        super(machine, i, j, k);

        let partName = "flatjoin";
        this.setTemplate(this.machine.templateManager.getTemplate(partName, mirrorX));
        console.log(this.template);
        this.generateWires();
    }

    public static GenerateTemplate(mirrorX?: boolean): MachinePartTemplate {
        let template = new MachinePartTemplate();

        template.partName = "flatjoin";

        template.mirrorX = mirrorX;

        template.xMirrorable = true;

        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();

        let dirJoin = (new BABYLON.Vector3(2, -1, 0)).normalize();

        template.trackTemplates[0] = new TrackTemplate(template);
        template.trackTemplates[0].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(- tileWidth * 0.5, - tileHeight, 0), dir),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(tileWidth * 0.5, - tileHeight, 0), dir)
        ];

        template.trackTemplates[1] = new TrackTemplate(template);
        template.trackTemplates[1].trackpoints = [
            new TrackPoint(template.trackTemplates[1], new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), dir),
            new TrackPoint(template.trackTemplates[1], new BABYLON.Vector3(- tileWidth * 0.25, - tileHeight * 0.25, 0), dirJoin)
        ];

        let center = new BABYLON.Vector3(- 0.0135, 0.0165, 0);
        let r = 0.02;
        
        template.trackTemplates[2] = new TrackTemplate(template);
        template.trackTemplates[2].trackpoints = [
            new TrackPoint(template.trackTemplates[2], center.add(new BABYLON.Vector3(-r * Math.sqrt(3) / 2, -r * 1 / 2, 0)), new BABYLON.Vector3(0.5, -Math.sqrt(3) / 2, 0), new BABYLON.Vector3(-1, 0, 0)),
            new TrackPoint(template.trackTemplates[2], center.add(new BABYLON.Vector3(0 + 0.03, -r - 0.011, 0)), new BABYLON.Vector3(1, 0, 0), new BABYLON.Vector3(0, -1, 0)),
        ];
        template.trackTemplates[2].drawStartTip = true;
        template.trackTemplates[2].drawEndTip = true;
        

        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }

        template.initialize();

        return template;
    }
}