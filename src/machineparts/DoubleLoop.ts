/// <reference path="../machine/MachinePart.ts"/>

class DoubleLoop extends MachinePart {
    constructor(machine: Machine, i: number, j: number, k: number) {
        super(machine, i, j, k);

        this.deserialize({
            points: [
                { position: { x: -0.056249999999999994, y: 0.032475952641916446, z: 0 }, normal: { x: 0.09950371902099892, y: 0.9950371902099892, z: 0 }, dir: { x: 0.9950371902099892, y: -0.09950371902099892, z: 0 } },
                { position: { x: 0.007831128515433633, y: 0.02686866956826861, z: -0.001512586438867734 }, normal: { x: -0.02088401000702746, y: 0.9212766316260701, z: -0.38834678593461935 } },
                { position: { x: 0.0445, y: 0.0238, z: -0.026 }, normal: { x: -0.4220582199178856, y: 0.863269455131674, z: -0.27682613105776016 }, tangentIn: 1 },
                { position: { x: 0.0441, y: 0.0194, z: -0.0801 }, normal: { x: -0.5105506548736694, y: 0.8362861901986887, z: 0.19990857132957118 } },
                { position: { x: -0.00022584437025674475, y: 0.015373584470800367, z: -0.10497567416976264 }, normal: { x: -0.062210177432127416, y: 0.8376674210294907, z: 0.5426261932211393 } },
                { position: { x: -0.04682594399162551, y: 0.00993486974904878, z: -0.07591274887481546 }, normal: { x: 0.4338049924054248, y: 0.8392539115358117, z: 0.3278202259409408 } },
                { position: { x: -0.044, y: 0.0068, z: -0.0251 }, normal: { x: 0.47274782333094034, y: 0.8547500410127304, z: -0.21427053676274183 } },
                { position: { x: 0.0003, y: 0.0028, z: -0.0004 }, normal: { x: 0.06925374833311816, y: 0.8415192755510988, z: -0.5357697520556448 } },
                { position: { x: 0.0447, y: -0.0012, z: -0.0262 }, normal: { x: -0.4385316126958126, y: 0.8367050678252934, z: -0.32804672554665304 } },
                { position: { x: 0.0442, y: -0.0054, z: -0.08 }, normal: { x: -0.5105423049408571, y: 0.8358650802407707, z: 0.2016832231489942 } },
                { position: { x: -0.00019998794117725982, y: -0.009649497176356298, z: -0.10484166117713693 }, normal: { x: -0.05328804359581278, y: 0.839859833513831, z: 0.5401813070255678 } },
                { position: { x: -0.04678172451684687, y: -0.014002588861738838, z: -0.07560012404016887 }, normal: { x: 0.4340370522882042, y: 0.8399407589318226, z: 0.3257473848337093 }, tangentIn: 1 },
                { position: { x: -0.0438, y: -0.0182, z: -0.0247 }, normal: { x: 0.49613685449256684, y: 0.8445355495674358, z: -0.20151408668143006 } },
                { position: { x: -0.0017, y: -0.0224, z: 0.0002 }, normal: { x: 0.21464241308702953, y: 0.9154904403092122, z: -0.3403026420799902 } },
                { position: { x: 0.056249999999999994, y: -0.032475952641916446, z: 0 }, normal: { x: 0.09950371902099892, y: 0.9950371902099892, z: 0 }, dir: { x: 0.9950371902099892, y: -0.09950371902099892, z: 0 } },
            ],
        });

        this.generateWires();
    }
}
