class MarbleConfiguration extends Nabu.Configuration {

    constructor(configName: string, public game: Game) {
        super(configName);
    }

    protected _buildElementsArray(): void {
        this.configurationElements = [
            new Nabu.ConfigurationElement(
                "graphicQ",
                Nabu.ConfigurationElementType.Enum,
                0,
                Nabu.ConfigurationElementCategory.Graphic,
                {
                    displayName: "Graphic Quality",
                    min: 0,
                    max: 2,
                    toString: (v) => {
                        if (v === 0) {
                            return "LOW";
                        }
                        if (v === 1) {
                            return "MEDIUM";
                        }
                        if (v === 2) {
                            return "HIGH";
                        }
                    }
                },
                (newValue: number) => {
                    if (this.game.machine) {
                        let data = this.game.machine.serialize();
                        this.game.machine.dispose();
                        this.game.machine.deserialize(data);
                        this.game.machine.instantiate();
                    }
                    if (this.game.room) {
                        this.game.room.dispose();
                    }
                    if (newValue > 0) {
                        this.game.room = new Room(this.game);
                        this.game.room.instantiate();
                    }
                    this.game.updateCameraLayer();
                    this.game.updateShadowGenerator();
                }
            ),
            new Nabu.ConfigurationElement(
                "autoGraphicQ",
                Nabu.ConfigurationElementType.Boolean,
                0,
                Nabu.ConfigurationElementCategory.Command,
                {
                    displayName: "Graphic Auto"
                }
            ),
            new Nabu.ConfigurationElement(
                "handleSize",
                Nabu.ConfigurationElementType.Number,
                1,
                Nabu.ConfigurationElementCategory.Graphic,
                {
                    displayName: "Handle Size",
                    min: 0,
                    max: 3,
                    step: 0.1,
                    toString: (v) => {
                        return v.toFixed(1);
                    }
                },
                (newValue) => {
                    if (this.game.machineEditor) {
                        this.game.machineEditor.handles.forEach(handle => {
                            handle.size = newValue;
                        })
                    }
                }
            ),
            new Nabu.ConfigurationElement(
                "uiSize",
                Nabu.ConfigurationElementType.Number,
                1,
                Nabu.ConfigurationElementCategory.Graphic,
                {
                    displayName: "UI Size",
                    min: 0.8,
                    max: 2,
                    step: 0.05,
                    toString: (v) => {
                        return v.toFixed(2);
                    }
                },
                (newValue) => {
                    var r = document.querySelector(':root') as HTMLElement;
                    r.style.setProperty("--ui-size", (newValue * 100).toFixed(0) + "%");
                }
            ),
            new Nabu.ConfigurationElement(
                "gridOpacity",
                Nabu.ConfigurationElementType.Number,
                1,
                Nabu.ConfigurationElementCategory.Graphic,
                {
                    displayName: "Grid Opacity",
                    min: 0,
                    max: 1,
                    step: 0.1,
                    toString: (v) => {
                        return v.toFixed(1);
                    }
                },
                (newValue) => {
                    if (this.game.materials && this.game.materials.gridMaterial) {
                        this.game.materials.gridMaterial.alpha = newValue;
                    }
                }
            )
        ]
    }

    public getValue(property: string): number {
        let configElement = this.configurationElements.find(e => { return e.property === property; });
        if (configElement) {
            return configElement.value;
        }
    }
}