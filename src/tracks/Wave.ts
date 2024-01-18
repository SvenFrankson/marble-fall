/// <reference path="./Track.ts"/>

class Wave extends Track {
    constructor(machine: Machine, i: number, j: number, mirror?: boolean) {
        super(machine, i, j, mirror);
        this.trackName = "wave";

        this.deltaI = 1;
        this.deltaJ = 1;

        this.deserialize({
            points: [
                { position: { x: -0.075, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 } },
                { position: { x: -0.02574170106019552, y: -0.02331256943245867, z: -1.3457124303783985e-10 }, normal: { x: 0.09980015069654494, y: 0.9950075024445529, z: 2.9746223976965384e-11 } },
                { position: { x: 0.0247, y: -0.01, z: 0 }, normal: { x: 0.06997826494958422, y: 0.9975485163312338, z: 7.031366138779832e-11 } },
                { position: { x: 0.07405330047633624, y: -0.030313212452661144, z: -1.1598073586596702e-10 }, normal: { x: 0.09950371902099892, y: 0.9950371902099892, z: -5.235549835316916e-10 } },
                { position: { x: 0.1247, y: -0.02, z: 0 }, normal: { x: 0.12353766744973763, y: 0.9923398836694403, z: 6.989528287372397e-12 } },
                { position: { x: 0.1734746589421829, y: -0.04269030514205091, z: 1.6954757086143357e-10 }, normal: { x: 0.09920903435744811, y: 0.9950666146052045, z: 8.515907414511131e-11 } },
                { position: { x: 0.22499999999999998, y: -0.03, z: 0 }, normal: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 } },
            ],
        });

        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }

        this.generateWires();
    }
}
