class QuarterNote extends MachinePart {

    public static NoteNames = [
        "c3",
        "d3",
        "e3",
        "f3",
        "g3",
        "a4",
        "b4",
        "c4",
    ]
    public static index = 0;

    public notes: BABYLON.Sound[] = [];
    public tings: BABYLON.Mesh[] = [];
    public noteMesh: BABYLON.Mesh[] = [];

    constructor(machine: Machine, prop: IMachinePartProp) {
        super(machine, prop);

        let partName = "quarter";
        this.setTemplate(this.machine.templateManager.getTemplate(partName, prop.mirrorX));

        this.generateWires();
        
        let x = 1;
        if (prop.mirrorX) {
            x = - 1;
        }

        let ting = BABYLON.MeshBuilder.CreateGround("ting", { width: 0.015, height: 0.06 });
        ting.position.x = - 0.2 * tileWidth * x;
        ting.position.y = - 0.015;
        ting.rotation.z = Math.PI / 24 * x;
        ting.parent = this;

        this.tings.push(ting);

        let index = QuarterNote.index;
        QuarterNote.index++;
        if (QuarterNote.index >= QuarterNote.NoteNames.length) {
            QuarterNote.index = 0;
        }
        let note = new BABYLON.Sound("note-" + index, "./datas/sounds/notes/" + QuarterNote.NoteNames[index] + ".mp3", this.getScene(), undefined, { loop: false, autoplay: false });
        this.notes.push(note);

        let tile = BABYLON.MeshBuilder.CreateBox("tile", { width: 0.015, height: 0.005, depth: 0.06 });
        tile.material = this.game.metalMaterials[0];
        tile.position.copyFrom(ting.position);
        tile.rotation.copyFrom(ting.rotation);
        tile.parent = this;
        tile.computeWorldMatrix(true);
        tile.position.subtractInPlace(tile.up.scale(0.0026));
    }

    public static GenerateTemplate(mirrorX: boolean) {
        let template = new MachinePartTemplate();

        template.partName = "quarter";
        template.h = 1;

        template.mirrorX = mirrorX;

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
                0,
                0
            ), dir),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(
                - tileWidth * 0.3,
                0 - 0.01,
                0
            ), Tools.V3Dir(130))
        ];
        

        template.trackTemplates[1] = new TrackTemplate(template);
        template.trackTemplates[1].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(
                - tileWidth * 0.1,
                - 0.015,
                0
            ), Tools.V3Dir(70)),
            new TrackPoint(template.trackTemplates[1], new BABYLON.Vector3(
                tileWidth * 0.3,
                - tileHeight * template.h,
                0
            ), dir),
            new TrackPoint(template.trackTemplates[1], new BABYLON.Vector3(
                tileWidth * 0.5,
                - tileHeight * template.h,
                0
            ), dir)
        ];
        
        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }
        
        template.initialize();

        return template;
    }
}

class DoubleNote extends MachinePart {

    public notes: BABYLON.Sound[] = [];
    public tings: BABYLON.Mesh[] = [];
    public noteMesh: BABYLON.Mesh[] = [];

    constructor(machine: Machine, prop: IMachinePartProp) {
        super(machine, prop);

        let partName = "double";
        this.setTemplate(this.machine.templateManager.getTemplate(partName, prop.mirrorX));

        this.generateWires();
        
        let x = 1;
        if (prop.mirrorX) {
            x = - 1;
        }

        let ting = BABYLON.MeshBuilder.CreateGround("ting", { width: 0.015, height: 0.06 });
        ting.position.x = - 0.2 * tileWidth * x;
        ting.position.y = - 0.015;
        ting.rotation.z = Math.PI / 9 * x;
        ting.parent = this;

        this.tings.push(ting);

        let index = QuarterNote.index;
        QuarterNote.index++;
        if (QuarterNote.index >= QuarterNote.NoteNames.length) {
            QuarterNote.index = 0;
        }
        let note = new BABYLON.Sound("note-" + index, "./datas/sounds/notes/" + QuarterNote.NoteNames[index] + ".mp3", this.getScene(), undefined, { loop: false, autoplay: false });
        this.notes.push(note);

        let tile = BABYLON.MeshBuilder.CreateBox("tile", { width: 0.015, height: 0.005, depth: 0.06 });
        tile.material = this.game.metalMaterials[0];
        tile.position.copyFrom(ting.position);
        tile.rotation.copyFrom(ting.rotation);
        tile.parent = this;
        tile.computeWorldMatrix(true);
        tile.position.subtractInPlace(tile.up.scale(0.0026));


        let ting2 = BABYLON.MeshBuilder.CreateGround("ting2", { width: 0.015, height: 0.06 });
        ting2.position.x = - 0.05 * tileWidth * x;
        ting2.position.y = -0.001;
        ting2.rotation.z = - Math.PI / 10 * x;
        ting2.parent = this;

        this.tings.push(ting2);

        index = QuarterNote.index;
        QuarterNote.index++;
        if (QuarterNote.index >= QuarterNote.NoteNames.length) {
            QuarterNote.index = 0;
        }
        let note2 = new BABYLON.Sound("note-" + index, "./datas/sounds/notes/" + QuarterNote.NoteNames[index] + ".mp3", this.getScene(), undefined, { loop: false, autoplay: false });
        this.notes.push(note2);

        let tile2 = BABYLON.MeshBuilder.CreateBox("tile2", { width: 0.015, height: 0.005, depth: 0.06 });
        tile2.material = this.game.metalMaterials[0];
        tile2.position.copyFrom(ting2.position);
        tile2.rotation.copyFrom(ting2.rotation);
        tile2.parent = this;
        tile2.computeWorldMatrix(true);
        tile2.position.subtractInPlace(tile2.up.scale(0.0026));
    }

    public static GenerateTemplate(mirrorX: boolean) {
        let template = new MachinePartTemplate();

        template.partName = "double";
        template.h = 1;

        template.mirrorX = mirrorX;

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
                0,
                0
            ), dir),
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(
                - tileWidth * 0.3,
                0 - 0.01,
                0
            ), Tools.V3Dir(130))
        ];
        

        template.trackTemplates[1] = new TrackTemplate(template);
        template.trackTemplates[1].trackpoints = [
            new TrackPoint(template.trackTemplates[0], new BABYLON.Vector3(
                tileWidth * 0,
                - tileHeight * template.h + 0.02,
                0
            ), Tools.V3Dir(110)),
            new TrackPoint(template.trackTemplates[1], new BABYLON.Vector3(
                tileWidth * 0.5,
                - tileHeight * template.h,
                0
            ), dir)
        ];
        
        if (mirrorX) {
            template.mirrorXTrackPointsInPlace();
        }
        
        template.initialize();

        return template;
    }
}