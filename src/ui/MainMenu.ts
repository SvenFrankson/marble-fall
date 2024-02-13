class MainMenu {

    public updateNode: BABYLON.Node;
    public container: HTMLDivElement;

    public xCount: number = 1;
    public yCount: number = 1;

    constructor(public game: Game) {
        this.container = document.getElementById("main-menu") as HTMLDivElement;
        this.updateNode = new BABYLON.Node("main-menu-update-node");
    }

    public async show(): Promise<void> {
        if (this.container.style.visibility === "visible") {
            this.container.style.pointerEvents = "";
            return;
        }

        let anim = Mummu.AnimationFactory.CreateNumber(this.updateNode, this.container.style, "opacity", undefined, undefined, Nabu.Easing.easeInOutSine);
        this.container.style.visibility = "visible";
        await anim(1, 1);
        this.container.style.pointerEvents = "";
    }

    public async hide(): Promise<void> {
        if (this.container.style.visibility === "hidden") {
            this.container.style.pointerEvents = "none";
            return;
        }

        let anim = Mummu.AnimationFactory.CreateNumber(this.updateNode, this.container.style, "opacity", undefined, undefined, Nabu.Easing.easeInOutSine);
        this.container.style.visibility = "visible";
        await anim(0, 0.5);
        this.container.style.visibility = "hidden";
        this.container.style.pointerEvents = "none";
    }

    public resize(): void {
        let requestedTileCount = 0;
        let requestedFullLines = 0;
        let panels: MainMenuPanel[] = [];
        let elements = this.container.querySelectorAll("menu-panel");
        for (let i = 0; i < elements.length; i++) {
            let panel = elements[i] as MainMenuPanel;
            panels[i] = panel;
            panel.w = parseInt(panel.getAttribute("w"));
            panel.h = parseInt(panel.getAttribute("h"));
            let area = panel.w * panel.h;
            requestedTileCount += area;
        }

        let rect = this.container.getBoundingClientRect();
        let containerW = rect.width;
        let containerH = rect.height;

        let min = 0;
        let ok = false;
        let emptyLinesBottom = 0;
        while (!ok) {
            ok = true;
            min++;
            let bestValue: number = 0;
            for (let xC = min; xC <= 10; xC++) {
                for (let yC = min; yC <= 10; yC++) {
                    let count = xC * yC;
                    if (count >= requestedTileCount) {
                        let w = containerW / xC;
                        let h = containerH / (yC + requestedFullLines);
                        let area = w * h;
                        let squareness = Math.min(w / h, h / w);
                        let value = area * squareness;
                        if (value > bestValue) {
                            this.xCount = xC;
                            this.yCount = yC + requestedFullLines;
                            bestValue = value;
                        }
                    }
                }
            }

            console.log("test " + this.xCount + " " + this.yCount);

            let grid: boolean[][] = [];
            for (let y = 0; y <= this.yCount; y++) {
                grid[y] = [];
                for (let x = 0; x <= this.xCount; x++) {
                    grid[y][x] = (x < this.xCount && y < this.yCount);
                }
            }
            for (let n = 0; n < panels.length; n++) {
                let panel = panels[n] as MainMenuPanel;
                panel.x = -1;
                panel.y = -1;

                for (let line = 0; line < this.yCount && panel.x === -1; line++) {
                    for (let col = 0; col < this.xCount && panel.x === -1; col++) {
                        let fit = true;
                        for (let x = 0; x < panel.w; x++) {
                            for (let y = 0; y < panel.h; y++) {
                                fit = fit && grid[line + y][col + x];
                            }
                        }
                        if (fit) {
                            panel.x = col;
                            panel.y = line;
                            for (let x = 0; x < panel.w; x++) {
                                for (let y = 0; y < panel.h; y++) {
                                    grid[line + y][col + x] = false;
                                }
                            }
                        }
                    }
                }
                if (panel.x === -1) {
                    ok = false;
                }
            }
            if (!ok) {
                console.log("can't find a way to make a menu layout");
            }
            else {
                console.log("now it's ok");
                let empty = true;
                emptyLinesBottom = 0;
                for (let y = this.yCount - 1; y > 0 && empty; y--) {
                    for (let x = 0; x < this.xCount && empty; x++) {
                        if (!grid[y][x]) {
                            empty = false;
                        }
                    }
                    if (empty) {
                        emptyLinesBottom++;
                    }
                }
            }
        }

        let tileW = containerW / this.xCount;
        let tileH = containerH / this.yCount;
        let m = Math.min(tileW, tileH) / 15;

        for (let i = 0; i < panels.length; i++) {
            let panel = panels[i];
            panel.style.display = "block";
            panel.style.width = (panel.w * tileW - 2 * m).toFixed(0) + "px";
            panel.style.height = (panel.h * tileH - 2 * m).toFixed(0) + "px";
            panel.style.position = "absolute";
            panel.computedLeft = (panel.x * tileW + m);
            if (panel.style.display != "none") {
                panel.style.left = panel.computedLeft.toFixed(0) + "px";
            }
            panel.computedTop = (panel.y * tileH + m + emptyLinesBottom * 0.5 * tileH);
            panel.style.top = panel.computedTop.toFixed(0) + "px";
            let label = (panel.querySelector(".label") as HTMLElement);
            if (label) {
                label.style.fontSize = (tileW / 4).toFixed(0) + "px";
            }
            let label2 = (panel.querySelector(".label-2") as HTMLElement);
            if (label2) {
                label2.style.fontSize = (tileW / 7).toFixed(0) + "px";
            }
        }

        
        (this.container.querySelector("menu-panel.create") as HTMLElement).style.backgroundImage = "url(./datas/icons/create.png)";

        let demoPanels = this.container.querySelectorAll("menu-panel.demo");
        demoPanels.forEach((e, i) => {
            if (e instanceof HTMLElement) {
                e.style.backgroundImage = "url(./datas/icons/demo-" + (i + 1).toFixed(0) + ".png)"
            }
        })
    }
}