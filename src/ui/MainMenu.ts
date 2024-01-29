class MainMenu {

    public updateNode: BABYLON.Node;
    public container: HTMLDivElement;

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
        let requestedTileCount = this.container.querySelectorAll(".panel.demo").length + 3;

        let rect = this.container.getBoundingClientRect();
        let containerW = rect.width;
        let containerH = rect.height;

        let bestValue: number = 0;
        let xCount: number;
        let yCount: number;

        for (let xC = 1; xC <= 10; xC++) {
            for (let yC = 1; yC <= 10; yC++) {
                let count = xC * yC;
                if (count >= requestedTileCount) {
                    let w = containerW / xC;
                    let h = containerH / yC;
                    let area = w * h;
                    let squareness = Math.min(w / h, h / w);
                    let value = area * squareness;
                    if (value > bestValue) {
                        xCount = xC;
                        yCount = yC;
                        bestValue = value;
                    }
                }
            }
        }

        let tileW = containerW / xCount;
        let tileH = containerH / yCount;
        let m = Math.min(tileW, tileH) / 20;

        let demoButtons = this.container.querySelectorAll(".panel.demo");
        for (let i = 0; i < demoButtons.length; i++) {
            let pos = i + 2;
            let button = demoButtons[i] as HTMLDivElement;
            button.style.display = "block";
            button.style.width = (tileW - 2 * m).toFixed(0) + "px";
            button.style.height = (tileH - 2 * m).toFixed(0) + "px";
            button.style.position = "absolute";
            button.style.left = ((pos % xCount) * tileW + m).toFixed(0) + "px";
            button.style.top = (Math.floor(pos / xCount) * tileH + m).toFixed(0) + "px";
            button.style.backgroundImage = "url(./datas/icons/demo-" + (i + 1).toFixed(0) + ".png)"
        }

        let n = demoButtons.length;

        let buttonCreate = this.container.querySelector(".panel.create") as HTMLDivElement;
        buttonCreate.style.display = "block";
        buttonCreate.style.width = (2 * tileW - 2 * m).toFixed(0) + "px";
        buttonCreate.style.height = (tileH - 2 * m).toFixed(0) + "px";
        buttonCreate.style.position = "absolute";
        buttonCreate.style.left = m.toFixed(0) + "px";
        buttonCreate.style.top = m.toFixed(0) + "px";
        buttonCreate.style.backgroundImage = "url(./datas/icons/create.png)"
        buttonCreate.style.backgroundPosition = "bottom right"

        let buttonOption = this.container.querySelector(".panel.option") as HTMLDivElement;
        buttonOption.style.display = "block";
        buttonOption.style.width = (tileW - 2 * m).toFixed(0) + "px";
        buttonOption.style.height = (tileH * 0.5 - 2 * m).toFixed(0) + "px";
        buttonOption.style.position = "absolute";
        buttonOption.style.right = (m).toFixed(0) + "px";
        buttonOption.style.bottom = (0.5 * tileH + m).toFixed(0) + "px";

        let buttonCredit = this.container.querySelector(".panel.credit") as HTMLDivElement;
        buttonCredit.style.display = "block";
        buttonCredit.style.width = (tileW - 2 * m).toFixed(0) + "px";
        buttonCredit.style.height = (tileH * 0.5 - 2 * m).toFixed(0) + "px";
        buttonCredit.style.position = "absolute";
        buttonCredit.style.right = (m).toFixed(0) + "px";
        buttonCredit.style.bottom = m.toFixed(0) + "px";
    }
}