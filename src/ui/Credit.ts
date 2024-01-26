class CreditsPage {

    public updateNode: BABYLON.Node;
    public container: HTMLDivElement;

    constructor(public game: Game) {
        this.container = document.getElementById("credits") as HTMLDivElement;
        this.updateNode = new BABYLON.Node("credits-update-node");
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
}