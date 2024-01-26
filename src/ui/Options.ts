class OptionsPage {

    public updateNode: BABYLON.Node;
    public container: HTMLDivElement;

    public handleSizeMinus: HTMLDivElement;
    public handleSizeValue: HTMLDivElement;
    public handleSizePlus: HTMLDivElement;

    constructor(public game: Game) {
        this.container = document.getElementById("options") as HTMLDivElement;
        this.updateNode = new BABYLON.Node("options-update-node");
    }

    public initialize(): void {
        this.handleSizeMinus = document.getElementById("handle-size-minus") as HTMLDivElement;
        this.handleSizeMinus.onclick = () => {
            this.game.config.setHandleSize(this.game.config.handleSize - 0.5);
            this.handleSizeValue.innerText = this.game.config.handleSize.toFixed(1);
        }
        this.handleSizeValue = document.getElementById("handle-size-val") as HTMLDivElement;
        this.handleSizeValue.innerText = this.game.config.handleSize.toFixed(1);
        this.handleSizePlus = document.getElementById("handle-size-plus") as HTMLDivElement;
        this.handleSizePlus.onclick = () => {
            this.game.config.setHandleSize(this.game.config.handleSize + 0.5);
            this.handleSizeValue.innerText = this.game.config.handleSize.toFixed(1);
        }
    }

    public async show(): Promise<void> {
        if (this.container.style.visibility === "visible") {
            this.container.style.pointerEvents = "";
            return;
        }

        let anim = Mummu.AnimationFactory.CreateNumber(this.updateNode, this.container.style, "opacity", undefined, undefined, Nabu.Easing.easeInOutSine);
        this.container.style.visibility = "visible";
        await anim(1, 0.5);
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
}