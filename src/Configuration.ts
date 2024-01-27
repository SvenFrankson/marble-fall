interface IConfigurationData {

    handleSize?: number;
    graphicQ?: number;
}

class Configuration {

    private _handleSize: number = 1;
    public get handleSize() {
        return this._handleSize; 
    }
    public setHandleSize(v: number, skipStorage?: boolean) {
        if (isFinite(v)) {
            if (v > 0 && v <= 3) {
                this._handleSize = v;

                if (this.game.machineEditor) {
                    this.game.machineEditor.handles.forEach(handle => {
                        handle.size = this._handleSize;
                    })
                }

                if (!skipStorage) {
                    this.saveToLocalStorage();
                }
            }
        }
    }

    private _graphicQ: number = 3;
    public get graphicQ() {
        return this._graphicQ;
    }
    public setGraphicQ(v: number, skipStorage?: boolean) {
        if (v >= 1 && v <= 3) {
            this._graphicQ = v;

            if (this.game.machine) {
                let data = this.game.machine.serialize();
                this.game.machine.dispose();
                this.game.machine.deserialize(data);
                this.game.machine.instantiate();
            }

            if (!skipStorage) {
                this.saveToLocalStorage();
            }
        }
    }

    constructor(public game: Game) {

    }

    public initialize(): void {
        let data = JSON.parse(localStorage.getItem("mrs-configuration"));
        this.deserialize(data);
    }

    public saveToLocalStorage(): void {
        let data = this.serialize();
        localStorage.setItem("mrs-configuration", JSON.stringify(data));
    }

    public serialize(): IConfigurationData {
        return {
            handleSize: this.handleSize,
            graphicQ: this.graphicQ
        }
    }

    public deserialize(data: IConfigurationData) {
        if (data) {
            if (isFinite(data.handleSize)) {
                this.setHandleSize(data.handleSize, true);
            }
            if (isFinite(data.graphicQ)) {
                this.setGraphicQ(data.graphicQ, true);
            }
        }
    }
}