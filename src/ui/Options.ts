class OptionsPage {

    public updateNode: BABYLON.Node;
    public container: HTMLDivElement;

    public handleSizeMinus: HTMLDivElement;
    public handleSizeValue: HTMLDivElement;
    public handleSizePlus: HTMLDivElement;

    public autoGraphicQMinus: HTMLDivElement;
    public autoGraphicQValue: HTMLDivElement;
    public autoGraphicQPlus: HTMLDivElement;

    public graphicQMinus: HTMLDivElement;
    public graphicQValue: HTMLDivElement;
    public graphicQPlus: HTMLDivElement;

    public uiScaleFactorMinus: HTMLDivElement;
    public uiScaleFactorValue: HTMLDivElement;
    public uiScaleFactorPlus: HTMLDivElement;

    public gridOpacityMinus: HTMLDivElement;
    public gridOpacityValue: HTMLDivElement;
    public gridOpacityPlus: HTMLDivElement;

    constructor(public game: Game) {
        this.container = document.getElementById("options") as HTMLDivElement;
        this.updateNode = new BABYLON.Node("options-update-node");
    }

    public initialize(): void {
        this.handleSizeMinus = document.getElementById("handle-size-minus") as HTMLDivElement;
        this.handleSizeMinus.onclick = () => {
            this.game.config.setHandleSize(this.game.config.handleSize - 0.2);
            this.handleSizeValue.innerText = this.game.config.handleSize.toFixed(1);
        }
        this.handleSizeValue = document.getElementById("handle-size-val") as HTMLDivElement;
        this.handleSizeValue.innerText = this.game.config.handleSize.toFixed(1);
        this.handleSizePlus = document.getElementById("handle-size-plus") as HTMLDivElement;
        this.handleSizePlus.onclick = () => {
            this.game.config.setHandleSize(this.game.config.handleSize + 0.2);
            this.handleSizeValue.innerText = this.game.config.handleSize.toFixed(1);
        }
        
        this.autoGraphicQMinus = document.getElementById("auto-graphic-q-minus") as HTMLDivElement;
        this.autoGraphicQMinus.onclick = () => {
            this.game.config.setAutoGraphicQ(!this.game.config.autoGraphicQ);
            this.autoGraphicQValue.innerText = this.game.config.autoGraphicQ ? "ON" : "OFF";
        }
        this.autoGraphicQValue = document.getElementById("auto-graphic-q-val") as HTMLDivElement;
        this.autoGraphicQValue.innerText = this.game.config.autoGraphicQ ? "ON" : "OFF";
        this.autoGraphicQPlus = document.getElementById("auto-graphic-q-plus") as HTMLDivElement;
        this.autoGraphicQPlus.onclick = () => {
            this.game.config.setAutoGraphicQ(!this.game.config.autoGraphicQ);
            this.autoGraphicQValue.innerText = this.game.config.autoGraphicQ ? "ON" : "OFF";
        }
        
        this.graphicQMinus = document.getElementById("graphic-q-minus") as HTMLDivElement;
        this.graphicQMinus.onclick = () => {
            this.game.config.setAutoGraphicQ(false);
            this.autoGraphicQValue.innerText = this.game.config.autoGraphicQ ? "ON" : "OFF";
            this.game.config.setGraphicQ(this.game.config.graphicQ - 1);
            this.graphicQValue.innerText = this._graphicQToString(this.game.config.graphicQ);
        }
        this.graphicQValue = document.getElementById("graphic-q-val") as HTMLDivElement;
        this.graphicQValue.innerText = this._graphicQToString(this.game.config.graphicQ);
        this.graphicQPlus = document.getElementById("graphic-q-plus") as HTMLDivElement;
        this.graphicQPlus.onclick = () => {
            this.game.config.setAutoGraphicQ(false);
            this.autoGraphicQValue.innerText = this.game.config.autoGraphicQ ? "ON" : "OFF";
            this.game.config.setGraphicQ(this.game.config.graphicQ + 1);
            this.graphicQValue.innerText = this._graphicQToString(this.game.config.graphicQ);
        }
        
        this.uiScaleFactorMinus = document.getElementById("ui-size-minus") as HTMLDivElement;
        this.uiScaleFactorMinus.onclick = () => {
            this.game.config.setUISize(this.game.config.uiSize - 0.1);
            this.uiScaleFactorValue.innerText = this._uiSizeToString(this.game.config.uiSize);
        }
        this.uiScaleFactorValue = document.getElementById("ui-size-val") as HTMLDivElement;
        this.uiScaleFactorValue.innerText = this._uiSizeToString(this.game.config.uiSize);
        this.uiScaleFactorPlus = document.getElementById("ui-size-plus") as HTMLDivElement;
        this.uiScaleFactorPlus.onclick = () => {
            this.game.config.setUISize(this.game.config.uiSize + 0.1);
            this.uiScaleFactorValue.innerText = this._uiSizeToString(this.game.config.uiSize);
        }
        
        this.gridOpacityMinus = document.getElementById("grid-opacity-minus") as HTMLDivElement;
        this.gridOpacityMinus.onclick = () => {
            this.game.config.setGridOpacity(this.game.config.gridOpacity - 0.05);
            this.gridOpacityValue.innerText = this.game.config.gridOpacity.toFixed(2);
        }
        this.gridOpacityValue = document.getElementById("grid-opacity-val") as HTMLDivElement;
        this.gridOpacityValue.innerText = this.game.config.gridOpacity.toFixed(2);
        this.gridOpacityPlus = document.getElementById("grid-opacity-plus") as HTMLDivElement;
        this.gridOpacityPlus.onclick = () => {
            this.game.config.setGridOpacity(this.game.config.gridOpacity + 0.05);
            this.gridOpacityValue.innerText = this.game.config.gridOpacity.toFixed(2);
        }
    }

    private _graphicQToString(graphicQ: number): string {
        if (graphicQ === 0) {
            return "Auto";
        }
        else if (graphicQ === 1) {
            return "Low";
        }
        else if (graphicQ === 2) {
            return "Medium";
        }
        else if (graphicQ === 3) {
            return "High";
        }
    } 

    private _uiSizeToString(s: number): string {
        return (s * 100).toFixed(0) + "%";
    } 

    public async show(): Promise<void> {
        if (this.container.style.visibility === "visible") {
            this.container.style.pointerEvents = "";
            return;
        }

        this.graphicQValue.innerText = this._graphicQToString(this.game.config.graphicQ);

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