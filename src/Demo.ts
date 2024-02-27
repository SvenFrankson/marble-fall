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
    balls: [
        { x: 0.4539999737739563, y: -0.15150000488758086, z: 0 },
        { x: 0.4539999737739563, y: 0.002181407451629638, z: 0 },
        { x: 0.4539999737739563, y: 0.15586281979084016, z: 0 },
    ],
    parts: [
        { name: "ramp-3.1.1", i: -1, j: -6, k: 0, mirrorX: true, mirrorZ: false },
        { name: "elevator-12", i: 3, j: -7, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.0.1", i: 2, j: -6, k: 0, mirrorX: false, mirrorZ: false },
        { name: "loop-1.2.1", i: -1, j: 1, k: 0, mirrorX: false, mirrorZ: true },
        { name: "uturn-0.3", i: -2, j: -1, k: 0, mirrorX: true },
        { name: "ramp-1.1.1", i: 2, j: 4, k: 0 },
        { name: "ramp-3.2.2", i: -1, j: 4, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.3", i: 2, j: 0, k: 0, mirrorX: false, mirrorZ: true },
        { name: "ramp-3.1.1", i: -1, j: -1, k: 2, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.4.1", i: 0, j: 1, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.2", i: -2, j: -5, k: 0, mirrorX: true },
        { name: "wave-3.2.1", i: -1, j: -5, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: 2, j: -3, k: 0 },
        { name: "ramp-3.2.1", i: -1, j: -3, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturnsharp", i: -2, j: 5, k: 1, mirrorX: true },
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
        { name: "elevator-17", i: 2, j: -9, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.0.1", i: 1, j: -8, k: 0, mirrorX: false, mirrorZ: false },
        { name: "loop-1.1.1", i: -1, j: -8, k: 0 },
        { name: "ramp-1.4.1", i: 0, j: -8, k: 0, mirrorX: true, mirrorZ: false },
        { name: "loop-1.1.1", i: 0, j: -6, k: 2 },
        { name: "uturn-1.3", i: -2, j: -4, k: 0, mirrorX: true },
        { name: "ramp-1.1.1", i: -1, j: -3, k: 2 },
        { name: "uturn-1.3", i: 1, j: -2, k: 0, mirrorX: false, mirrorZ: true },
        { name: "ramp-1.1.1", i: 0, j: -1, k: 0, mirrorX: true, mirrorZ: false },
        { name: "loop-1.1.1", i: -1, j: -4, k: 0 },
        { name: "uturn-1.3", i: -2, j: 0, k: 0, mirrorX: true },
        { name: "ramp-1.1.1", i: -1, j: 1, k: 2 },
        { name: "loop-1.1.1", i: 0, j: -2, k: 2 },
        { name: "uturn-1.3", i: 1, j: 2, k: 0, mirrorX: false, mirrorZ: true },
        { name: "ramp-1.1.1", i: 0, j: 3, k: 0, mirrorX: true, mirrorZ: false },
        { name: "loop-1.1.1", i: -1, j: 0, k: 0 },
        { name: "uturn-1.3", i: -2, j: 4, k: 0, mirrorX: true },
        { name: "ramp-1.1.1", i: -1, j: 5, k: 2 },
        { name: "loop-1.1.1", i: 0, j: 2, k: 2 },
        { name: "uturn-1.3", i: 1, j: 6, k: 0, mirrorX: false, mirrorZ: true },
        { name: "uturnsharp", i: 0, j: 7, k: 0, mirrorX: true },
        { name: "ramp-1.0.1", i: 1, j: 8, k: 0, mirrorX: false, mirrorZ: false },
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
        { name: "join", i: -1, j: 2, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.3", i: -2, j: -2, k: 0, mirrorX: true },
        { name: "ramp-1.1.1", i: -1, j: -3, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.0.1", i: -1, j: -2, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.3", i: 1, j: 0, k: 0, mirrorX: false, mirrorZ: true },
        { name: "uturn-1.2", i: -2, j: 1, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-2.1.1", i: -1, j: 0, k: 0, mirrorX: true, mirrorZ: false },
        { name: "join", i: 0, j: 3, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.3", i: 1, j: 3, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: 1, j: 4, k: 0 },
        { name: "elevator-12", i: -3, j: -7, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-2.3.1", i: 0, j: -1, k: 1, mirrorX: true, mirrorZ: false },
        { name: "snake-1.2.3", i: 1, j: -3, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: 2, j: -1, k: 1 },
        { name: "loop-1.1.1", i: -2, j: 0, k: 2 },
        { name: "ramp-1.4.1", i: -1, j: 0, k: 2, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.2", i: -3, j: 4, k: 2, mirrorX: true, mirrorZ: true },
        { name: "ramp-3.1.1", i: -2, j: 3, k: 3, mirrorX: true, mirrorZ: false },
        { name: "ramp-3.1.1", i: -2, j: 4, k: 0, mirrorX: true, mirrorZ: false },
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

var deathLoop = {
    balls: [
        { x: 0.15400000655651092, y: -0.09149998760223389, z: 0 },
        { x: 0.15400000655651092, y: -0.011062685012817383, z: 0 },
        { x: 0.15400000655651092, y: 0.0693746473789215, z: 0 },
        { x: 0.15400000655651092, y: 0.14981196486949921, z: 0 },
        { x: 0.15400000655651092, y: 0.2302492823600769, z: 0 },
        { x: 0.15400000655651092, y: 0.3106865849494934, z: 0 },
        { x: 0.13336174356459699, y: -0.08357069912963007, z: 0 },
        { x: 0.116171708005261, y: -0.08169939664358977, z: 0 },
        { x: 0.09848493236671044, y: -0.07917683386823743, z: 0 },
    ],
    parts: [
        { name: "ramp-3.13.1", i: -2, j: -10, k: 0, mirrorX: true, mirrorZ: false },
        { name: "elevator-14", i: 1, j: -11, k: 0, mirrorZ: false },
        { name: "loop-1.5.2", i: -3, j: -1, k: 0, mirrorX: true },
        { name: "loop-1.5.1", i: -4, j: -1, k: 0 },
        { name: "uturn-0.3", i: -6, j: 2, k: 0, mirrorX: true },
        { name: "uturn-0.2", i: -2, j: 1, k: 2 },
        { name: "uturn-1.3", i: -3, j: 1, k: 3, mirrorX: true },
        { name: "ramp-3.1.6", i: -2, j: 2, k: 0, mirrorX: false, mirrorZ: true },
        { name: "ramp-3.1.1", i: -5, j: 1, k: 2, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.1.1", i: -5, j: 2, k: 0 },
    ],
};

var test3 = {
    balls: [{ x: 0.15141078307665115, y: -0.06119131474246342, z: 1.1102230246251565e-16 }],
    parts: [
        { name: "ramp-2.8.1", i: -1, j: -5, k: 0, mirrorX: true, mirrorZ: false },
        { name: "elevator-9", i: 1, j: -6, k: 0, mirrorZ: false },
        { name: "ramp-2.0.1", i: -3, j: 3, k: 2, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.0.3", i: -1, j: 3, k: 0, mirrorX: false, mirrorZ: true },
        { name: "ramp-1.0.1", i: -3, j: 3, k: 7, mirrorX: false, mirrorZ: false },
        { name: "loop-1.8.1", i: -2, j: -1, k: 0, mirrorZ: true },
        { name: "uturn-0.6", i: -5, j: 3, k: 2, mirrorX: true, mirrorZ: true },
    ],
};

var popopo = {
    balls: [
        { x: 0.15400000655651092, y: 0.02849998736381531, z: 0 },
        { x: 0.15400000655651092, y: 0.10534068608283996, z: 0 },
        { x: 0.15400000655651092, y: 0.18218139970302583, z: 0 },
        { x: 0.15400000655651092, y: 0.2590221133232117, z: 0 },
        { x: 0.15400000655651092, y: 0.33586281204223634, z: 0 },
    ],
    parts: [
        { name: "uturn-0.2", i: -2, j: -12, k: 0, mirrorX: true },
        { name: "ramp-2.0.1", i: -1, j: -12, k: 0, mirrorX: false, mirrorZ: false },
        { name: "loop-1.1.1", i: 1, j: -11, k: 1 },
        { name: "uturn-0.2", i: -4, j: -5, k: 3, mirrorX: true },
        { name: "ramp-2.5.1", i: -1, j: -12, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.3", i: 2, j: -7, k: 1 },
        { name: "split", i: -3, j: -7, k: 3, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.3", i: -2, j: -5, k: 3 },
        { name: "ramp-1.3.1", i: -3, j: -5, k: 4, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: -5, j: -3, k: 5, mirrorX: true },
        { name: "ramp-1.0.1", i: -2, j: -2, k: 4, mirrorX: false, mirrorZ: false },
        { name: "flatjoin", i: -1, j: -3, k: 4, mirrorZ: false },
        { name: "wave-2.2.1", i: -4, j: -5, k: 5, mirrorX: true, mirrorZ: false },
        { name: "ramp-4.0.1", i: -2, j: -7, k: 3, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: -1, j: -3, k: 5 },
        { name: "ramp-3.0.1", i: -4, j: -3, k: 6, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: -2, j: -3, k: 4, mirrorX: true },
        { name: "elevator-12", i: 1, j: -13, k: 0, mirrorZ: false },
        { name: "ramp-1.1.5", i: 0, j: -2, k: 0, mirrorX: false, mirrorZ: true },
    ],
};

var xxlStressTest = {
    balls: [
        { x: -0.7539999856948852, y: -0.09149998760223389, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: -0.013237598896026612, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.06502478981018066, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.14328714871406556, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.22154953742027284, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.2998119261264801, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.3780743148326874, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.45633673334121705, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.5345991220474243, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.6128615107536316, z: -0.23999999463558197 },
        { x: -0.9039999618530273, y: -0.15150001978874206, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: -0.07242200112342835, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.0066559579372406, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.08573394680023193, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.16481193566322327, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.2438899245262146, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.32296791338920594, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.4020459022521973, z: -0.05999999865889549 },
        { x: 0.4539999737739563, y: -0.18150002098083495, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: -0.10227644777297974, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: -0.02305287456512451, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.056170698642730714, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.13539427185058595, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.21461781525611878, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.293841388463974, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.37306496167182923, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.45228853487968446, z: -0.30000001192092896 },
    ],
    parts: [
        { name: "uturn-0.2", i: 0, j: 4, k: 1 },
        { name: "ramp-5.1.1", i: -5, j: 4, k: 1, mirrorX: true, mirrorZ: false },
        { name: "ramp-5.1.1", i: -5, j: 3, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: -3, j: 3, k: 4 },
        { name: "uturn-0.4", i: -7, j: 3, k: 2, mirrorX: true, mirrorZ: false },
        { name: "ramp-2.0.1", i: -5, j: 3, k: 5, mirrorX: false, mirrorZ: false },
        { name: "split", i: -4, j: 1, k: 4, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.3", i: 4, j: 0, k: 2 },
        { name: "join", i: 3, j: -1, k: 2, mirrorZ: false },
        { name: "ramp-1.0.1", i: 4, j: -1, k: 2, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.1.1", i: 1, j: -2, k: 3 },
        { name: "uturn-0.3", i: 0, j: -2, k: 3, mirrorX: true, mirrorZ: true },
        { name: "uturnsharp", i: 5, j: -2, k: 2 },
        { name: "ramp-2.1.1", i: 0, j: -3, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.2.1", i: 3, j: -4, k: 2, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.2.1", i: 4, j: -4, k: 2, mirrorX: false, mirrorZ: false },
        { name: "loop-1.2.1", i: 2, j: -5, k: 2, mirrorZ: true },
        { name: "loop-1.2.1", i: 2, j: -6, k: 1 },
        { name: "spiral-2.3.2", i: 0, j: -6, k: 2, mirrorX: true },
        { name: "uturn-0.4", i: 2, j: -6, k: 2, mirrorZ: true },
        { name: "ramp-1.4.1", i: 1, j: -6, k: 5, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.2", i: -5, j: -11, k: 1, mirrorX: true },
        { name: "ramp-1.0.1", i: -4, j: -11, k: 2, mirrorX: false, mirrorZ: false },
        { name: "ramp-3.8.1", i: -3, j: -11, k: 2, mirrorX: false, mirrorZ: false },
        { name: "spiral-3.8.6", i: -3, j: -11, k: 1 },
        { name: "split", i: -4, j: -13, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.0.1", i: -5, j: -13, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: -1, j: -13, k: 0 },
        { name: "ramp-2.0.1", i: -3, j: -13, k: 1, mirrorX: false, mirrorZ: false },
        { name: "elevator-19", i: -6, j: -14, k: 1, mirrorX: true, mirrorZ: false },
        { name: "loop-1.5.2", i: -2, j: -17, k: 0, mirrorZ: true },
        { name: "ramp-2.7.1", i: -4, j: -20, k: 4, mirrorX: false, mirrorZ: false },
        { name: "elevator-24", i: -5, j: -21, k: 4, mirrorX: true, mirrorZ: false },
        { name: "elevator-23", i: 3, j: -17, k: 5, mirrorZ: false },
        { name: "spiral-1.5.3", i: 2, j: -16, k: 5, mirrorX: true },
        { name: "ramp-2.4.1", i: 0, j: -11, k: 5, mirrorX: true, mirrorZ: false },
        { name: "loop-1.2.1", i: -1, j: -11, k: 5, mirrorZ: true },
        { name: "ramp-2.5.1", i: -3, j: -7, k: 6, mirrorX: true, mirrorZ: false },
        { name: "loop-1.4.1", i: -4, j: -6, k: 3 },
        { name: "uturn-0.5", i: -6, j: -2, k: 3, mirrorX: true, mirrorZ: false },
        { name: "ramp-2.2.3", i: -4, j: -4, k: 5, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.3", i: 1, j: 0, k: 5 },
        { name: "spiral-2.3.3", i: 1, j: 3, k: 5 },
        { name: "ramp-4.1.1", i: -3, j: 3, k: 5, mirrorX: true, mirrorZ: false },
        { name: "wave-4.3.1", i: -3, j: 0, k: 7, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.3", i: -4, j: 3, k: 5, mirrorX: true, mirrorZ: true },
        { name: "split", i: -2, j: -4, k: 5, mirrorX: false, mirrorZ: false },
        { name: "wave-2.2.1", i: -1, j: -2, k: 5, mirrorX: false, mirrorZ: false },
        { name: "ramp-6.1.1", i: -2, j: 0, k: 4, mirrorX: true, mirrorZ: false },
        { name: "flatjoin", i: -3, j: 0, k: 4, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.4", i: -4, j: -2, k: 2, mirrorX: true, mirrorZ: true },
        { name: "uturn-1.3", i: -2, j: -1, k: 2 },
    ],
};

var aerial = {
    balls: [
        { x: 0.3039999976158142, y: -0.36149999833106994, z: 0 },
        { x: 0.3039999976158142, y: -0.28106269574165343, z: 0 },
        { x: 0.3039999976158142, y: -0.20062536334991454, z: 0 },
        { x: 0.3039999976158142, y: -0.12018804585933686, z: 0 },
        { x: 0.3039999976158142, y: -0.03975073954463005, z: 0 },
        { x: 0.3039999976158142, y: 0.04068657422065735, z: 0 },
    ],
    parts: [
        { name: "uturn-0.3", i: 1, j: 12, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.2.3", i: 2, j: 12, k: 1, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.3", i: 3, j: 12, k: 1 },
        { name: "ramp-1.0.2", i: 2, j: 12, k: 2, mirrorX: false, mirrorZ: false },
        { name: "loop-1.3.1", i: 1, j: 10, k: 1 },
        { name: "ramp-1.1.1", i: 0, j: 9, k: 5, mirrorX: true, mirrorZ: false },
        { name: "ramp-3.6.2", i: -2, j: 8, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.5", i: 1, j: 8, k: 1 },
        { name: "uturn-0.4", i: -4, j: 8, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-3.0.3", i: -2, j: 8, k: 1, mirrorX: false, mirrorZ: true },
        { name: "uturn-0.3", i: 3, j: 6, k: 5 },
        { name: "loop-1.4.1", i: -1, j: 6, k: 2 },
        { name: "ramp-2.3.6", i: 1, j: 3, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-2.7.2", i: -1, j: 3, k: 0, mirrorX: true, mirrorZ: false },
        { name: "loop-1.6.1", i: 2, j: 2, k: 2 },
        { name: "ramp-2.4.1", i: 0, j: 2, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturn-1.3", i: -1, j: 1, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.0.1", i: 0, j: 1, k: 0, mirrorX: false, mirrorZ: false },
        { name: "spiral-1.3.2", i: 1, j: -2, k: 0, mirrorX: true },
        { name: "elevator-15", i: 2, j: -3, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: -2, j: 10, k: 1, mirrorX: true },
    ],
};

var nested = {
    balls: [
        { x: -0.7539999856948852, y: -0.09149998760223389, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: -0.013237598896026612, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.06502478981018066, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.14328714871406556, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.22154953742027284, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.2998119261264801, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.3780743148326874, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.45633673334121705, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.5345991220474243, z: -0.23999999463558197 },
        { x: -0.7539999856948852, y: 0.6128615107536316, z: -0.23999999463558197 },
        { x: -0.9039999618530273, y: -0.15150001978874206, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: -0.07242200112342835, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.0066559579372406, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.08573394680023193, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.16481193566322327, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.2438899245262146, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.32296791338920594, z: -0.05999999865889549 },
        { x: -0.9039999618530273, y: 0.4020459022521973, z: -0.05999999865889549 },
        { x: 0.4539999737739563, y: -0.18150002098083495, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: -0.10227644777297974, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: -0.02305287456512451, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.056170698642730714, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.13539427185058595, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.21461781525611878, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.293841388463974, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.37306496167182923, z: -0.30000001192092896 },
        { x: 0.4539999737739563, y: 0.45228853487968446, z: -0.30000001192092896 },
    ],
    parts: [
        { name: "uturn-0.2", i: 0, j: 4, k: 1 },
        { name: "ramp-5.1.1", i: -5, j: 4, k: 1, mirrorX: true, mirrorZ: false },
        { name: "ramp-5.1.1", i: -5, j: 3, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: -3, j: 3, k: 4 },
        { name: "uturn-0.4", i: -7, j: 3, k: 2, mirrorX: true, mirrorZ: false },
        { name: "ramp-2.0.1", i: -5, j: 3, k: 5, mirrorX: false, mirrorZ: false },
        { name: "split", i: -4, j: 1, k: 4, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.3", i: 4, j: 0, k: 2 },
        { name: "join", i: 3, j: -1, k: 2, mirrorZ: false },
        { name: "ramp-1.0.1", i: 4, j: -1, k: 2, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.1.1", i: 1, j: -2, k: 3 },
        { name: "uturn-0.3", i: 0, j: -2, k: 3, mirrorX: true, mirrorZ: true },
        { name: "uturnsharp", i: 5, j: -2, k: 2 },
        { name: "ramp-2.1.1", i: 0, j: -3, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.2.1", i: 3, j: -4, k: 2, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.2.1", i: 4, j: -4, k: 2, mirrorX: false, mirrorZ: false },
        { name: "loop-1.2.1", i: 2, j: -5, k: 2, mirrorZ: true },
        { name: "loop-1.2.1", i: 2, j: -6, k: 1 },
        { name: "spiral-2.3.2", i: 0, j: -6, k: 2, mirrorX: true },
        { name: "uturn-0.4", i: 2, j: -6, k: 2, mirrorZ: true },
        { name: "ramp-1.4.1", i: 1, j: -6, k: 5, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.2", i: -5, j: -11, k: 1, mirrorX: true },
        { name: "ramp-1.0.1", i: -4, j: -11, k: 2, mirrorX: false, mirrorZ: false },
        { name: "ramp-3.8.1", i: -3, j: -11, k: 2, mirrorX: false, mirrorZ: false },
        { name: "spiral-3.8.6", i: -3, j: -11, k: 1 },
        { name: "split", i: -4, j: -13, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-1.0.1", i: -5, j: -13, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturn-0.2", i: -1, j: -13, k: 0 },
        { name: "ramp-2.0.1", i: -3, j: -13, k: 1, mirrorX: false, mirrorZ: false },
        { name: "elevator-19", i: -6, j: -14, k: 1, mirrorX: true, mirrorZ: false },
        { name: "loop-1.5.2", i: -2, j: -17, k: 0, mirrorZ: true },
        { name: "ramp-2.7.1", i: -4, j: -20, k: 4, mirrorX: false, mirrorZ: false },
        { name: "elevator-24", i: -5, j: -21, k: 4, mirrorX: true, mirrorZ: false },
        { name: "elevator-23", i: 3, j: -17, k: 5, mirrorZ: false },
        { name: "spiral-1.5.3", i: 2, j: -16, k: 5, mirrorX: true },
        { name: "ramp-2.4.1", i: 0, j: -11, k: 5, mirrorX: true, mirrorZ: false },
        { name: "loop-1.2.1", i: -1, j: -11, k: 5, mirrorZ: true },
        { name: "ramp-2.5.1", i: -3, j: -7, k: 6, mirrorX: true, mirrorZ: false },
        { name: "loop-1.4.1", i: -4, j: -6, k: 3 },
        { name: "uturn-0.5", i: -6, j: -2, k: 3, mirrorX: true, mirrorZ: false },
        { name: "ramp-2.2.3", i: -4, j: -4, k: 5, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.3", i: 1, j: 0, k: 5 },
        { name: "spiral-2.3.3", i: 1, j: 3, k: 5 },
        { name: "ramp-4.1.1", i: -3, j: 3, k: 5, mirrorX: true, mirrorZ: false },
        { name: "wave-4.3.1", i: -3, j: 0, k: 7, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.3", i: -4, j: 3, k: 5, mirrorX: true, mirrorZ: true },
        { name: "split", i: -2, j: -4, k: 5, mirrorX: false, mirrorZ: false },
        { name: "wave-2.2.1", i: -1, j: -2, k: 5, mirrorX: false, mirrorZ: false },
        { name: "ramp-6.1.1", i: -2, j: 0, k: 4, mirrorX: true, mirrorZ: false },
        { name: "flatjoin", i: -3, j: 0, k: 4, mirrorX: true, mirrorZ: false },
        { name: "uturn-1.4", i: -4, j: -2, k: 2, mirrorX: true, mirrorZ: true },
        { name: "uturn-1.3", i: -2, j: -1, k: 2 },
    ],
};

var testNote = {
    balls: [{ x: -0.0037693503651293203, y: 0.1497480616625865, z: 5.551115123125783e-17 }],
    parts: [
        { name: "quarter", i: 4, j: -3, k: 0, mirrorZ: false },
        { name: "quarter", i: 3, j: -4, k: 0, mirrorZ: false },
        { name: "quarter", i: 2, j: -5, k: 0, mirrorZ: false },
        { name: "quarter", i: 1, j: -6, k: 0, mirrorZ: false },
        { name: "elevator-10", i: 0, j: -7, k: 0, mirrorX: true, mirrorZ: false },
        { name: "uturn-0.3", i: 5, j: -2, k: 0 },
    ],
};
