var simpleLoop: IMachineData = {
    balls: [{ x: 0.003999999664723874, y: -0.061500001311302184, z: 0 }],
    parts: [
        { name: "uturn-0.4", i: -3, j: 0, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.0.1", i: -1, j: 0, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.4", i: -1, j: 0, k: 0, mirrorX: false, mirrorZ: true },
        { name: "elevator-3", i: 0, j: -1, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.0.3", i: -2, j: 2, k: 0, mirrorX: false, mirrorZ: true },
        { name: "uturn-0.3", i: -3, j: 2, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.1.1", i: -2, j: 1, k: 0, mirrorX: true, mirrorZ: false },
    ],
};

var demo1: IMachineData = {
    balls: [{ x: 0.1470751372356046, y: -0.021790127870097292, z: -1.1102230246251565e-16 }],
    parts: [
        { name: "loop-1.2", i: -1, j: -5, k: 1, mirrorZ: true },
        { name: "uturn-0.2", i: -3, j: 1, k: 1, mirrorX: true, mirrorZ: false },
        { name: "split", i: -2, j: -1, k: 2, mirrorX: false, mirrorZ: false },
        { name: "elevator-8", i: 1, j: -6, k: 0, mirrorZ: false },
        { name: "flatjoin", i: 0, j: 1, k: 0, mirrorZ: false },
        { name: "ramp-2.0.2", i: -2, j: 1, k: 0, mirrorX: false, mirrorZ: true },
        { name: "ramp-1.1.3", i: -1, j: 1, k: 0, mirrorX: false, mirrorZ: true },
        { name: "wave-1.4.2", i: 0, j: -5, k: 0, mirrorX: true, mirrorZ: false },
    ],
};

var demoLoops: IMachineData = {
    balls: [
        { x: 0.3039999976158142, y: -0.24149999356269836, z: 0 },
        { x: 0.3039999976158142, y: -0.07789317107200623, z: 0 },
        { x: 0.3039999976158142, y: 0.0857136663198471, z: 0 },
        { x: 0.3039999976158142, y: 0.24932048881053925, z: 0 },
    ],
    parts: [
        { name: "loop", i: -1, j: -8, k: 0, mirrorX: true, mirrorZ: false },
        { name: "loop", i: -1, j: -6, k: 2, mirrorX: false, mirrorZ: false },
        { name: "loop", i: -1, j: -4, k: 0, mirrorX: true, mirrorZ: false },
        { name: "elevator-17", i: 2, j: -9, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.0.1", i: 1, j: -8, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.3", i: -2, j: -6, k: 0, mirrorX: true, mirrorZ: true },
        { name: "uturn-1.3", i: 1, j: -4, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.3", i: -2, j: -2, k: 0, mirrorX: true, mirrorZ: true },
        { name: "loop", i: -1, j: -2, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.3", i: 1, j: 0, k: 0, mirrorX: false, mirrorZ: false },
        { name: "loop", i: -1, j: 0, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.3", i: -2, j: 2, k: 0, mirrorX: true, mirrorZ: true },
        { name: "loop", i: -1, j: 2, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.3", i: 1, j: 4, k: 0, mirrorX: false, mirrorZ: false },
        { name: "loop", i: -1, j: 4, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.3", i: -2, j: 7, k: 0, mirrorX: true, mirrorZ: true },
        { name: "ramp-3.1.3", i: -1, j: 7, k: 0, mirrorX: false, mirrorZ: true },
    ],
};

var demo4: IMachineData = {
    balls: [
        { x: 0.7063794660954964, y: -0.017640293121974498 },
        { x: -0.2545074285696747, y: 0.011180937689018683 },
        { x: -0.2758915101890289, y: 0.009329840802149077 },
        { x: -0.29715393742768725, y: 0.006889463425232776 },
        { x: -0.2338259732929349, y: 0.012309514338496433 },
        { x: 0.6846401424366063, y: -0.012845692941125794 },
        { x: 0.7279805421426728, y: -0.020679194039995234 },
        { x: 0.749056170630838, y: -0.025222985367312198 },
    ],
    parts: [
        { name: "elevator-14", i: 5, j: -13 },
        { name: "elevator-14", i: -2, j: -14, mirror: true },
        { name: "spiral", i: 0, j: -12 },
        { name: "loop", i: 3, j: -12, mirror: true },
        { name: "ramp-1.1", i: 3, j: -8 },
        { name: "uturn-s", i: 4, j: -7 },
        { name: "uturn-l", i: 0, j: -2 },
        { name: "ramp-1.1", i: -1, j: -1, mirror: true },
        { name: "uturn-s", i: 4, j: -3 },
        { name: "uturn-s", i: 1, j: -5, mirror: true },
        { name: "ramp-2.1", i: 2, j: -6, mirror: true },
        { name: "uturn-s", i: 2, j: -2, mirror: true },
        { name: "ramp-2.1", i: 2, j: -4 },
        { name: "uturn-l", i: 1, j: -7 },
        { name: "uturn-s", i: -1, j: -3, mirror: true },
        { name: "uturn-s", i: -1, j: -5, mirror: true },
        { name: "uturn-s", i: 0, j: -4 },
        { name: "ramp-1.1", i: 0, j: -6, mirror: true },
        { name: "ramp-1.1", i: -1, j: -13 },
        { name: "ramp-2.1", i: 1, j: -9, mirror: true },
        { name: "uturn-s", i: 0, j: -8, mirror: true },
        { name: "ramp-1.0", i: 3, j: -2, mirror: true },
        { name: "ramp-2.2", i: 3, j: -1 },
        { name: "rampX-2.1", i: 1, j: -9 },
    ],
};

var demoTest: IMachineData = {
    balls: [{ x: -0.19965407373238375, y: 0.06913964667829861 }],
    parts: [
        { name: "split", i: 0, j: -1 },
        { name: "ramp-1.1", i: -1, j: -2 },
        { name: "uturn-l", i: 1, j: 1 },
        { name: "uturn-s", i: -1, j: 1, mirror: true },
        { name: "ramp-1.0", i: 0, j: 2 },
    ],
};

var demo3: IMachineData = {
    balls: [
        { x: -0.45039562940864025, y: -0.14880134622293845, z: 0 },
        { x: -0.4507414790693519, y: 0.00570802711480296, z: 0 },
        { x: -0.4512511582822969, y: 0.15488847198893452, z: 1.1102230246251565e-16 },
    ],
    parts: [
        { name: "split", i: 0, j: -5, k: 0, mirrorX: false, mirrorZ: false },
        { name: "split", i: 0, j: -2, k: 2, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.1.1", i: -2, j: -6, k: 0, mirrorX: false, mirrorZ: false },
        { name: "loop", i: 1, j: -3, k: 0, mirrorX: false, mirrorZ: false },
        { name: "join", i: -1, j: 2, k: 1, mirrorX: false, mirrorZ: false },
        { name: "loop", i: -2, j: 0, k: 2, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.3", i: -2, j: -2, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.1.1", i: -1, j: -3, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.0.1", i: -1, j: -2, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.3", i: 1, j: 0, k: 0, mirrorX: false, mirrorZ: true },
        { name: "uturn-1.2", i: -2, j: 1, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-2.1.1", i: -1, j: 0, k: 0, mirrorX: true, mirrorZ: false },
        { name: "join", i: 0, j: 3, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.3", i: 1, j: 3, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: 1, j: 4, k: 0, mirrorX: false, mirrorZ: false },
        { name: "elevator-12", i: -3, j: -7, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.1.1", i: -2, j: 4, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-2.0.1", i: -1, j: 4, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.2", i: 4, j: -1, k: 0, mirrorX: false, mirrorZ: true },
        { name: "ramp-2.3.1", i: 0, j: -1, k: 1, mirrorX: true, mirrorZ: false },
        { name: "ramp-2.0.1", i: 2, j: -1, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.0.1", i: 3, j: 0, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.2", i: -3, j: 2, k: 2, mirrorX: true, mirrorZ: true },
        { name: "ramp-3.1.1", i: -2, j: 2, k: 3, mirrorX: false, mirrorZ: false },
    ],
};

var createDefault: IMachineData = {
    balls: [
        { x: 0.42531514018827754, y: -0.04840511502662046 },
        { x: 0.4025330286177473, y: -0.048624483332179405 },
        { x: 0.3799147747766348, y: -0.047314622188705205 },
        { x: 0.35788764058897626, y: -0.04672729838009122 },
        { x: 0.3351445547662884, y: -0.045358694798261004 },
    ],
    parts: [
        { name: "loop", i: 1, j: -6, mirror: true },
        { name: "spiral", i: 0, j: -3, mirror: true },
        { name: "uturn-l", i: -2, j: 0, mirror: true },
        { name: "ramp-3.1", i: 0, j: 1 },
        { name: "elevator-9", i: 3, j: -7 },
    ],
};

var demo3D: IMachineData = {
    balls: [
        { x: 0.39808697121492503, y: 0.041276811477638765 },
        { x: 0.42178813750112076, y: 0.03490450521423004 },
        { x: 0.4479109908664016, y: 0.030144576207480372 },
        { x: 0.45307246397059453, y: 0.18084865692846974 },
        { x: 0.422445081390991, y: 0.2655912743747426 },
        { x: 0.3756430183403636, y: 0.044253335357509804 },
    ],
    parts: [
        { name: "uturn-1.2", i: 0, j: -4, k: 1, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.2", i: 5, j: 0, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.3", i: 1, j: -2, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.1.1", i: 2, j: -2, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.2", i: 5, j: -5, k: 1, mirrorX: false, mirrorZ: false },
        { name: "elevator-8", i: 3, j: -9, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-4.1.1", i: 1, j: -5, k: 2, mirrorX: true, mirrorZ: false },
        { name: "ramp-4.4.1", i: 1, j: -4, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-3.2.1", i: 2, j: -2, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturn-2.3", i: 1, j: -7, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.1.1", i: 2, j: -8, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-3.1.2", i: 2, j: -6, k: 1, mirrorX: false, mirrorZ: true },
    ],
};

var demoLoop: IMachineData = {
    balls: [
        { x: 0.39808697121492503, y: 0.041276811477638765 },
        { x: 0.42178813750112076, y: 0.03490450521423004 },
        { x: 0.4479109908664016, y: 0.030144576207480372 },
        { x: 0.4512616994466042, y: 0.3383223566718828 },
        { x: 0.37699677269433557, y: 0.04633268053343625 },
        { x: 0.4537058415985139, y: 0.25988103124019435 },
        { x: 0.4523347497209613, y: 0.18159650041604788 },
        { x: 0.4518257916075914, y: 0.10443575951224476 },
    ],
    parts: [
        { name: "elevator-12", i: 3, j: -13, k: 0, mirrorX: false, mirrorZ: false },
        { name: "split", i: 1, j: -11, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.1.2", i: 2, j: -12, k: 0, mirrorX: true, mirrorZ: false },
        { name: "loop-1.2", i: 3, j: -8, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.5.1", i: 2, j: -9, k: 1, mirrorX: false, mirrorZ: false },
        { name: "spiral", i: 0, j: -9, k: 1, mirrorX: true, mirrorZ: false },
        { name: "join", i: 1, j: -3, k: 3, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.4", i: -1, j: -2, k: 0, mirrorX: true, mirrorZ: true },
        { name: "ramp-2.0.1", i: 1, j: -1, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.1.1", i: -1, j: -4, k: 3, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.1.1", i: -1, j: -6, k: 1, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.3", i: -2, j: -5, k: 1, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.2", i: 4, j: -4, k: 2, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.1.1", i: 2, j: -4, k: 3, mirrorX: true, mirrorZ: false },
    ],
};

var demoXXL: IMachineData = {
    balls: [
        { x: -0.14940814725193807, y: 0.37256903324063273, z: -0.24 },
        { x: 0.12699683890522956, y: 0.3778240595217145, z: -0.24 },
        { x: 0.15394038324885653, y: 0.28825437966177486, z: -0.24000000715255748 },
        { x: 0.15372840040364857, y: 0.20960589947653657, z: -0.2400000071525572 },
        { x: 0.15418796141657928, y: 0.13141977555023623, z: -0.24000000715255748 },
    ],
    parts: [
        { name: "split", i: -1, j: -12, k: 4, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.0.1", i: 0, j: -12, k: 4, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.0.2", i: 0, j: -10, k: 4, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.3", i: 2, j: -10, k: 3, mirrorX: false, mirrorZ: false },
        { name: "loop-1.2", i: 0, j: -9, k: 3, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.4", i: -3, j: -10, k: 4, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.5.1", i: 1, j: -10, k: 3, mirrorX: true, mirrorZ: false },
        { name: "join", i: 1, j: 0, k: 6, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.3", i: 0, j: 1, k: 4, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.5", i: 2, j: -1, k: 2, mirrorX: false, mirrorZ: false },
        { name: "elevator-14", i: 1, j: -13, k: 4, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.3.1", i: 0, j: -6, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.2", i: -4, j: -7, k: 2, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.5", i: -1, j: -1, k: 2, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.5", i: 0, j: -7, k: 2, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.6", i: 2, j: -8, k: 2, mirrorX: false, mirrorZ: true },
        { name: "ramp-3.1.1", i: -1, j: -9, k: 7, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.6", i: 2, j: -7, k: 1, mirrorX: false, mirrorZ: true },
        { name: "uturn-1.6", i: -4, j: -6, k: 1, mirrorX: true, mirrorZ: false },
        { name: "ramp-4.0.1", i: -2, j: -6, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-4.1.1", i: -2, j: -5, k: 6, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.5", i: 2, j: -4, k: 2, mirrorX: false, mirrorZ: true },
        { name: "ramp-3.1.1", i: -3, j: -7, k: 2, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.1.1", i: -1, j: -5, k: 4, mirrorX: true, mirrorZ: false },
        { name: "ramp-2.2.2", i: -3, j: -6, k: 3, mirrorX: false, mirrorZ: false },
        { name: "split", i: 1, j: -3, k: 2, mirrorX: true, mirrorZ: false },
    ],
};

var largeTornado: IMachineData = {
    balls: [
        { x: 0.15400000655651092, y: -0.2408360127210617, z: 0 },
        { x: 0.15400000655651092, y: -0.16197078263759612, z: 0 },
        { x: 0.15400000655651092, y: -0.08310558235645295, z: 0 },
        { x: 0.15400000655651092, y: -0.00424036717414856, z: 0 },
        { x: 0.15400000655651092, y: 0.07462484800815582, z: 0 },
        { x: 0.15400000655651092, y: 0.1534900631904602, z: 0 },
    ],
    parts: [
        { name: "uturn-1.5", i: -1, j: -6, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.5", i: 1, j: -5, k: 4, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.8", i: -2, j: -4, k: 1, mirrorX: true, mirrorZ: true },
        { name: "uturn-1.7", i: 1, j: -3, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.7", i: -2, j: -2, k: 1, mirrorX: true, mirrorZ: true },
        { name: "uturn-1.6", i: 1, j: -1, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.6", i: -1, j: 0, k: 1, mirrorX: true, mirrorZ: true },
        { name: "uturn-1.5", i: 1, j: 1, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.5", i: -1, j: 2, k: 1, mirrorX: true, mirrorZ: true },
        { name: "uturn-1.4", i: 1, j: 3, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.4", i: -1, j: 4, k: 1, mirrorX: true, mirrorZ: true },
        { name: "elevator-15", i: 1, j: -7, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.5", i: 1, j: 5, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.4.1", i: -1, j: 6, k: 5, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.5", i: -4, j: 10, k: 0, mirrorX: true, mirrorZ: true },
        { name: "loop-1.2", i: -2, j: 6, k: 4, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.2.1", i: -2, j: 8, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.0.1", i: 0, j: 8, k: 0, mirrorX: false, mirrorZ: false },
    ],
};

var twoLoops = {
    balls: [
        { x: 0.6040000095367432, y: -0.15091200506687164, z: 0 },
        { x: 0.6040000095367432, y: -0.07407130634784699, z: 0 },
        { x: 0.6040000095367432, y: 0.0027694072723388665, z: 0 },
        { x: 0.6040000095367432, y: 0.07961012089252471, z: 0 },
        { x: 0.6040000095367432, y: 0.15645081961154939, z: 0 },
    ],
    parts: [
        { name: "loop-2.2", i: -1, j: -2, k: 0, mirrorX: true, mirrorZ: false },
        { name: "loop-1.2", i: -2, j: 2, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.1.1", i: -3, j: 5, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.4", i: -5, j: 5, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-3.3.4", i: -3, j: 5, k: 0, mirrorX: false, mirrorZ: true },
        { name: "ramp-3.3.1", i: 0, j: 5, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-3.12.1", i: 1, j: -6, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.0.1", i: 3, j: 5, k: 0, mirrorX: false, mirrorZ: false },
        { name: "elevator-12", i: 4, j: -7, k: 0, mirrorX: false, mirrorZ: false },
    ],
};

var logoCircuit = {
    balls: [
        { x: -0.3430786425995497, y: 0.006175036826921158, z: -0.12 },
        { x: -0.4920541867386349, y: -0.05544158273924758, z: -0.18 },
    ],
    parts: [
        { name: "uturn-0.4", i: -3, j: 0, k: 2, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.4", i: -1, j: 0, k: 2, mirrorX: false, mirrorZ: true },
        { name: "uturn-0.3", i: -3, j: 2, k: 2, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.1.1", i: -2, j: 1, k: 2, mirrorX: true, mirrorZ: false },
        { name: "loop-1.2", i: -1, j: -4, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturn-s", i: 0, j: 0, k: 3, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.1.2", i: -2, j: 1, k: 3, mirrorX: true, mirrorZ: false },
    ],
};

var test = {
    balls: [{ x: -0.5766096541939383, y: 0.4087908683675662, z: 0 }],
    parts: [
        { name: "join", i: -1, j: -1, k: 1, mirrorX: false, mirrorZ: false },
        { name: "split", i: -1, j: -3, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: -2, j: -1, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.2", i: 0, j: -1, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: 0, j: 0, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: -1, j: 0, k: 2, mirrorX: true, mirrorZ: false },
        { name: "uturn-2.4", i: 0, j: 0, k: 0, mirrorX: false, mirrorZ: true },
        { name: "elevator-16", i: -4, j: -14, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-3.0.1", i: -3, j: 2, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.10.1", i: -3, j: -13, k: 0, mirrorX: false, mirrorZ: false },
    ],
};

var test2 = {
    balls: [{ x: 0.1470751372356046, y: -0.021790127870097292, z: -1.1102230246251565e-16 }],
    parts: [
        { name: "elevator-7", i: 1, j: -6, k: 0, mirrorZ: false },
        { name: "loop-1.2", i: -1, j: -5, k: 1, mirrorZ: true },
        { name: "ramp-1.4.2", i: 0, j: -5, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.2", i: -2, j: -1, k: 1, mirrorX: true, mirrorZ: false },
        { name: "ramp-2.2.2", i: -1, j: -1, k: 0, mirrorX: false, mirrorZ: true },
    ],
};

var test3 = {
    balls: [{ x: 0.1470751372356046, y: -0.021790127870097292, z: -1.1102230246251565e-16 }],
    parts: [
        { name: "uturn-0.2", i: -3, j: 1, k: 1, mirrorX: true, mirrorZ: false },
        { name: "split", i: -2, j: -1, k: 2, mirrorX: false, mirrorZ: false },
        { name: "elevator-8", i: 1, j: -6, k: 0, mirrorZ: false },
        { name: "flatjoin", i: 0, j: 1, k: 0, mirrorZ: false },
        { name: "ramp-2.0.2", i: -2, j: 1, k: 0, mirrorX: false, mirrorZ: true },
        { name: "ramp-1.1.3", i: -1, j: 1, k: 0, mirrorX: false, mirrorZ: true },
        { name: "ramp-1.1.1", i: 0, j: -5, k: 0, mirrorX: true, mirrorZ: false },
        { name: "wave-1.0.2", i: -1, j: -4, k: 0, mirrorX: false, mirrorZ: true },
        { name: "snake-2.0.1", i: -3, j: -4, k: 1, mirrorX: false, mirrorZ: false },
    ],
};
