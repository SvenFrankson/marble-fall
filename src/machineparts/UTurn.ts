class UTurnLarge extends MachinePart {
    constructor(machine: Machine, i: number, j: number, k: number, mirror?: boolean) {
        super(machine, i, j, k, 2, 1, 1, mirror);
        this.partName = "uturn-l";

        this.deserialize({
            points: [
                { position: { x: -0.075, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 } },
                { position: { x: 0.13394933569683048, y: -0.008441899296066684, z: 0.00026137674993623877 }, normal: { x: 0.032306075793350764, y: 0.9833195664766373, z: -0.17899426708984922 } },
                { position: { x: 0.1712, y: -0.01, z: -0.0105 }, normal: { x: -0.11360563098237532, y: 0.9568855505453798, z: -0.2673271474552511 } },
                { position: { x: 0.1955, y: -0.0116, z: -0.0372 }, normal: { x: -0.20660883087432497, y: 0.9643838758298143, z: -0.16515608085750325 } },
                { position: { x: 0.2038, y: -0.013, z: -0.0688 }, normal: { x: -0.25848323253959904, y: 0.9647301065787487, z: -0.049822083019837024 } },
                { position: { x: 0.197, y: -0.0144, z: -0.0992 }, normal: { x: -0.274874420263502, y: 0.9572314992222168, z: 0.09028792821629655 } },
                { position: { x: 0.1744, y: -0.016, z: -0.1265 }, normal: { x: -0.18804611436208896, y: 0.956335180137496, z: 0.22374468061767094 } },
                { position: { x: 0.1339, y: -0.0178, z: -0.1377 }, normal: { x: -0.051765501746220265, y: 0.9550181735779958, z: 0.29199421392334324 } },
                { position: { x: 0.0987, y: -0.0194, z: -0.1288 }, normal: { x: 0.11311928184404368, y: 0.954449314514888, z: 0.2760987759790836 } },
                { position: { x: 0.0723, y: -0.021, z: -0.1014 }, normal: { x: 0.2540510175431706, y: 0.9536388488664376, z: 0.16134133511898094 } },
                { position: { x: 0.055, y: -0.024, z: -0.0328 }, normal: { x: -0.2934267273272182, y: 0.9518591565545972, z: -0.08868428143255824 } },
                { position: { x: 0.0301, y: -0.0254, z: -0.009 }, normal: { x: -0.16527157396712613, y: 0.9629216416134613, z: -0.2132304362675873 } },
                { position: { x: -0.0057, y: -0.027, z: 0.0007 }, normal: { x: -0.056169210068177, y: 0.9868539889112726, z: -0.1515395143526165 } },
                { position: { x: -0.075, y: -0.03, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: -1, y: 0, z: 0 } },
            ],
        });

        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }

        this.generateWires();
    }
}

class UTurn extends MachinePart {
    constructor(machine: Machine, i: number, j: number, k: number, mirror?: boolean) {
        super(machine, i, j, k, 1, 1, 1, mirror);
        this.partName = "uturn-s";

        this.deserialize({
            points: [
                { position: { x: -0.075, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 } },
                { position: { x: 0.0193, y: -0.0084, z: 0.0003 }, normal: { x: -0.05500779973536025, y: 0.925151067399511, z: -0.37559239137370676 } },
                { position: { x: 0.05180769566226052, y: 0.0056684545036756045, z: -0.004609346816050227 }, normal: { x: -0.6257808486659882, y: 0.6834386999132468, z: -0.37591205474654144 }, tangentOut: 1.275 },
                { position: { x: 0.0638, y: 0.0181, z: -0.0256 }, normal: { x: -0.985533398197922, y: -0.018330358969221288, z: -0.16848714780812155 } },
                { position: { x: 0.0586, y: 0.0099, z: -0.0448 }, normal: { x: -0.8873689664333703, y: 0.20446962902517424, z: 0.4132414405856218 } },
                { position: { x: 0.0454, y: -0.0086, z: -0.0519 }, normal: { x: -0.5726089695906795, y: 0.5162041363475339, z: 0.6369083588413618 } },
                { position: { x: 0.0262, y: -0.0253, z: -0.0454 }, normal: { x: -0.01778258232366703, y: 0.911265522044504, z: 0.41143520522539134 } },
                { position: { x: -0.0152, y: -0.0301, z: -0.0069 }, normal: { x: -0.18431426214031815, y: 0.931209421797995, z: -0.31444755608259073 } },
                { position: { x: -0.075, y: -0.03, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: -1, y: 0, z: 0 } },
            ],
        });

        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }

        this.generateWires();
    }
}

class UTurnLayer extends MachinePart {

    constructor(machine: Machine, i: number, j: number, k: number, mirror?: boolean) {
        super(machine, i, j, k, 1, 1, 1, mirror);
        this.partName = "uturn-layer";

        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();

        let r = tileDepth * 0.5;
        let r2 = r / Math.SQRT2;
        this.tracks[0].trackpoints = [
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), BABYLON.Vector3.Up(), new BABYLON.Vector3(1, 0, 0)),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(0, 0, 0), (new BABYLON.Vector3(0, 2, -1)).normalize(), new BABYLON.Vector3(1, 0, 0)),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(r2, 0, - r + r2)),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(r, 0, - r), (new BABYLON.Vector3(-1, 1.5, 0)).normalize(), new BABYLON.Vector3(0, 0, - 1)),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(r2, 0, - r - r2)),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(0, 0, - tileDepth), (new BABYLON.Vector3(0, 2, 1)).normalize(), new BABYLON.Vector3(- 1, 0, 0)),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(- tileWidth * 0.5, 0, - tileDepth), BABYLON.Vector3.Up(), new BABYLON.Vector3(- 1, 0, 0)),
        ];

        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }

        this.generateWires();
    }
}

class UTurn2Layer extends MachinePart {

    constructor(machine: Machine, i: number, j: number, k: number, mirror?: boolean) {
        super(machine, i, j, k, 1, 1, 2, mirror);
        this.partName = "uturn-2layer";

        let dir = new BABYLON.Vector3(1, 0, 0);
        dir.normalize();
        let n = new BABYLON.Vector3(0, 1, 0);
        n.normalize();

        let r = tileDepth;
        let r2 = r / Math.SQRT2;
        this.tracks[0].trackpoints = [
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(- tileWidth * 0.5, 0, 0), BABYLON.Vector3.Up(), new BABYLON.Vector3(1, 0, 0)),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(0, 0, 0), (new BABYLON.Vector3(0, 2, -1)).normalize(), new BABYLON.Vector3(1, 0, 0)),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(r2, 0, - r + r2)),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(r, 0, - r), (new BABYLON.Vector3(-1, 1.5, 0)).normalize(), new BABYLON.Vector3(0, 0, - 1)),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(r2, 0, - r - r2)),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(0, 0, - 2 * r), (new BABYLON.Vector3(0, 2, 1)).normalize(), new BABYLON.Vector3(- 1, 0, 0)),
            new TrackPoint(this.tracks[0], new BABYLON.Vector3(- tileWidth * 0.5, 0, - 2 * r), BABYLON.Vector3.Up(), new BABYLON.Vector3(- 1, 0, 0)),
        ];

        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }

        this.generateWires();
    }
}
