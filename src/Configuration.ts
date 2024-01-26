interface IConfigurationData {

    handleSize?: number;
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
            handleSize: this.handleSize
        }
    }

    public deserialize(data: IConfigurationData) {
        if (data) {
            if (isFinite(data.handleSize)) {
                this.setHandleSize(data.handleSize, true);
            }
        }
    }
}