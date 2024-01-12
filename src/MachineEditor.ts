class MachineEditor {

    public container: HTMLDivElement;
    public itemContainer: HTMLDivElement;

    constructor(public game: Game) {
        this.container = document.getElementById("machine-editor-menu") as HTMLDivElement;
        this.itemContainer = this.container.querySelector("#machine-editor-item-container") as HTMLDivElement;
    }

    public instantiate(): void {
        this.container.style.display = "block";
        for (let i = 0; i < TrackNames.length; i++) {
            let trackname = TrackNames[i];
            let item = document.createElement("div") as HTMLDivElement;
            item.classList.add("machine-editor-item");
            item.innerText = trackname;
            this.itemContainer.appendChild(item);
        }

        document.getElementById("machine-editor-main-menu").onclick = () => {
            this.game.setContext(GameMode.MainMenu);
        }
    }

    public dispose(): void {
        this.container.style.display = "none";
        this.itemContainer.innerHTML = "";
    }

    public update(): void {
        let ratio = this.game.engine.getRenderWidth() / this.game.engine.getRenderHeight();
        if (ratio > 1) {
            this.container.classList.add("left");
            this.container.classList.remove("bottom");
        }
        else {
            this.container.classList.add("bottom");
            this.container.classList.remove("left");
        }
    }
}