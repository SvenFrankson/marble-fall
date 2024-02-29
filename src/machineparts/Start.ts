class Start extends MachinePart {

    constructor(machine: Machine, prop: IMachinePartProp) {
        super(machine, prop);

        let partName = "start";
        this.setTemplate(this.machine.templateManager.getTemplate(partName, prop.mirrorX));
        this.generateWires();
    }
    
    public static GenerateTemplate(mirrorX?: boolean): MachinePartTemplate {
        let template = new MachinePartTemplate();

        template.partName = "start";

        template.mirrorX = mirrorX;
        
        template.xMirrorable = true;

        template.trackTemplates[0] = new TrackTemplate(template);
        template.trackTemplates[0].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(tileWidth * 0.3, 0.008, 0), Tools.V3Dir(120)),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(tileWidth * 0.5, 0, 0), Tools.V3Dir(90))
        ];
        template.trackTemplates[0].drawStartTip = true;

        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }

        template.initialize();

        return template;
    }
}