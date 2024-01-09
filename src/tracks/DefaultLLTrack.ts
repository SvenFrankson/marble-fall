/// <reference path="./Track.ts"/>

class DefaultLLTrack extends Track {
    constructor(game: Game, i: number, j: number, mirror?: boolean) {
        super(game, i, j);

        this.deserialize({
            points: [
                { position: { x: -0.056249999999999994, y: 0.032475952641916446, z: 0 }, normal: { x: 0.09950371902099892, y: 0.9950371902099892, z: 0 }, dir: { x: 0.9950371902099892, y: -0.09950371902099892, z: 0 } },
                { position: { x: -0.010506693854306803, y: 0.024586694031686902, z: -0.0011302327810539378 }, normal: { x: 0.12182789095857596, y: 0.8264314830616825, z: -0.5496989801600997 } },
                { position: { x: 0.03197059018683249, y: 0.01741728765991577, z: -0.0030875560146152708 }, normal: { x: 0.02018170070075878, y: 0.20181700700758784, z: -0.9792152953458827 }, dir: { x: 0.9950371902099892, y: -0.09950371902099892, z: 0 } },
                { position: { x: 0.05050550403372285, y: 0.005119832724208587, z: -0.023324046122163745 }, normal: { x: -0.8375359521368244, y: 0.463390016047518, z: -0.2894878614134691 } },
                { position: { x: 0.033434763340491724, y: -0.009870373080515402, z: -0.05100364872061987 }, normal: { x: -0.5377432504789265, y: 0.753846001823966, z: 0.3775558264659407 } },
                { position: { x: 0.00898415932224321, y: -0.016033027115578413, z: -0.04022704060585921 }, normal: { x: 0.12878253194657152, y: 0.9176838962061582, z: 0.37586078022229924 } },
                { position: { x: -0.005660293369047137, y: -0.021648307068113964, z: -0.00885192240515461 }, normal: { x: -0.6231431135054996, y: 0.6624596691675566, z: -0.41574011932586397 } },
                { position: { x: -0.02906531091925879, y: -0.028254364753327404, z: -0.002669630725487286 }, normal: { x: -0.2632409047009031, y: 0.8352289697044248, z: -0.48280098825368506 } },
                { position: { x: -0.056249999999999994, y: -0.032475952641916446, z: 0 }, normal: { x: -0.09950371902099892, y: 0.9950371902099892, z: 0 }, dir: { x: -0.9950371902099892, y: -0.09950371902099892, z: 0 } },
            ],
        });

        if (mirror) {
            this.mirrorTrackPointsInPlace();
        }

        this.subdivisions = 3;

        this.generateWires();
    }
}
