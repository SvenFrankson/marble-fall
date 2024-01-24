var demo1: IMachineData = {
    balls: [
        { x: 0.45223644798326457, y: -0.14555925508040052 },
        { x: 0.4542039643251569, y: -0.06168364093616862 },
        { x: 0.4554387140880808, y: 0.021382350340019358 },
        { x: 0.4552031364946579, y: 0.10582023181972072 },
        { x: 0.45496577489396894, y: 0.19089755354340562 },
        { x: 0.4265645074593439, y: -0.14331937155899638 },
        { x: 0.40186220720561006, y: -0.1411542072522732 },
        { x: 0.37693605105079203, y: -0.1396427223486105 },
    ],
    parts: [
        { name: "ramp-3.1", i: -1, j: -6, mirror: true },
        { name: "ramp-3.1", i: -1, j: 4 },
        { name: "uturn-s", i: -2, j: -1, mirror: true },
        { name: "uturn-s", i: -2, j: 3, mirror: true },
        { name: "uturn-s", i: -2, j: -5, mirror: true },
        { name: "elevator-12", i: 3, j: -7 },
        { name: "ramp-1.0", i: 2, j: -6 },
        { name: "ramp-1.0", i: 2, j: 5 },
        { name: "wave", i: -1, j: -4 },
        { name: "ramp-2.1", i: -1, j: -2, mirror: true },
        { name: "uturn-l", i: 1, j: -3 },
        { name: "ramp-2.1", i: -1, j: 2, mirror: true },
        { name: "wave", i: -1, j: 0 },
        { name: "uturn-l", i: 1, j: 1 },
    ],
};

var demo2: IMachineData = {
    balls: [
        { x: 0.45223644798326457, y: -0.14555925508040052 },
        { x: 0.4542039643251569, y: -0.06168364093616862 },
        { x: 0.4554387140880808, y: 0.021382350340019358 },
        { x: 0.4552031364946579, y: 0.10582023181972072 },
        { x: 0.45496577489396894, y: 0.19089755354340562 },
        { x: 0.4265645074593439, y: -0.14331937155899638 },
        { x: 0.40186220720561006, y: -0.1411542072522732 },
        { x: 0.37693605105079203, y: -0.1396427223486105 },
    ],
    parts: [
        { name: "loop", i: 0, j: -11, mirror: true },
        { name: "uturn-s", i: -1, j: -8, mirror: true },
        { name: "loop", i: 0, j: -7 },
        { name: "uturn-s", i: 2, j: -4, mirror: false },
        { name: "loop", i: 0, j: -3, mirror: true },
        { name: "uturn-s", i: -1, j: 0, mirror: true },
        { name: "loop", i: 0, j: 1 },
        { name: "elevator-17", i: 3, j: -12 },
        { name: "ramp-1.0", i: 2, j: -11 },
        { name: "ramp-1.1", i: 2, j: 4 },
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
        { x: -0.7529580212020577, y: -0.1654427630682682 },
        { x: -0.7513297912847231, y: -0.32829114967876044 },
        { x: -0.7517784289994465, y: -0.2470864404297073 },
        { x: -0.7522482200985597, y: -0.08369699812598332 },
        { x: -0.7521042373550704, y: -0.0019488102905312332 },
    ],
    parts: [
        { name: "split", i: -2, j: 0 },
        { name: "split", i: -2, j: 3 },
        { name: "split", i: -2, j: 6 },
        { name: "join", i: -2, j: 9, mirror: true },
        { name: "ramp-2.1", i: -4, j: 10, mirror: true },
        { name: "uturn-l", i: -1, j: 2 },
        { name: "uturn-l", i: -4, j: 2, mirror: true },
        { name: "uturn-l", i: -1, j: 5 },
        { name: "uturn-l", i: -1, j: 8 },
        { name: "uturn-l", i: -4, j: 5, mirror: true },
        { name: "uturn-l", i: -4, j: 8, mirror: true },
        { name: "ramp-2.1", i: -4, j: -1 },
        { name: "elevator-13", i: -5, j: -2, mirror: true },
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
        { name: "uturnlayer-1.2", i: 0, j: -4, k: 1, mirrorX: true, mirrorZ: false },
        { name: "uturnlayer-1.2", i: 5, j: 0, k: 1, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-1.3", i: 1, j: -2, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.1.1", i: 2, j: -2, k: 0, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-1.2", i: 5, j: -5, k: 1, mirrorX: false, mirrorZ: false },
        { name: "elevator-8", i: 3, j: -9, k: 0, mirrorX: false, mirrorZ: false },
        { name: "ramp-4.1.1", i: 1, j: -5, k: 2, mirrorX: true, mirrorZ: false },
        { name: "ramp-4.4.1", i: 1, j: -4, k: 1, mirrorX: false, mirrorZ: false },
        { name: "ramp-3.2.1", i: 2, j: -2, k: 2, mirrorX: false, mirrorZ: false },
        { name: "uturnlayer-2.3", i: 1, j: -7, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-1.1.1", i: 2, j: -8, k: 0, mirrorX: true, mirrorZ: false },
        { name: "ramp-3.1.2", i: 2, j: -6, k: 1, mirrorX: false, mirrorZ: true },
    ],
};

var demoLoop: IMachineData = {"balls":[{"x":0.39808697121492503,"y":0.041276811477638765},{"x":0.42178813750112076,"y":0.03490450521423004},{"x":0.4479109908664016,"y":0.030144576207480372},{"x":0.4512616994466042,"y":0.3383223566718828},{"x":0.37699677269433557,"y":0.04633268053343625},{"x":0.4537058415985139,"y":0.25988103124019435},{"x":0.4523347497209613,"y":0.18159650041604788},{"x":0.4518257916075914,"y":0.10443575951224476}],"parts":[{"name":"elevator-12","i":3,"j":-13,"k":0,"mirrorX":false,"mirrorZ":false},{"name":"split","i":1,"j":-11,"k":1,"mirrorX":false,"mirrorZ":false},{"name":"ramp-1.1.2","i":2,"j":-12,"k":0,"mirrorX":true,"mirrorZ":false},{"name":"loop-1.2","i":3,"j":-8,"k":1,"mirrorX":false,"mirrorZ":false},{"name":"ramp-1.5.1","i":2,"j":-9,"k":1,"mirrorX":false,"mirrorZ":false},{"name":"spiral","i":0,"j":-9,"k":1,"mirrorX":true,"mirrorZ":false},{"name":"join","i":1,"j":-3,"k":3,"mirrorX":true,"mirrorZ":false},{"name":"uturnlayer-1.4","i":-1,"j":-2,"k":0,"mirrorX":true,"mirrorZ":true},{"name":"ramp-2.0.1","i":1,"j":-1,"k":0,"mirrorX":false,"mirrorZ":false},{"name":"ramp-2.1.1","i":-1,"j":-4,"k":3,"mirrorX":false,"mirrorZ":false},{"name":"ramp-1.1.1","i":-1,"j":-6,"k":1,"mirrorX":true,"mirrorZ":false},{"name":"uturnlayer-1.3","i":-2,"j":-5,"k":1,"mirrorX":true,"mirrorZ":false},{"name":"uturnlayer-0.2","i":4,"j":-4,"k":2,"mirrorX":false,"mirrorZ":false},{"name":"ramp-2.1.1","i":2,"j":-4,"k":3,"mirrorX":true,"mirrorZ":false}]};
