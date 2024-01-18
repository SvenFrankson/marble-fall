interface IMeshWithGroundWidth {
    groundWidth: number;
    height: number;
}

class FloatingElement extends HTMLElement {

    private _initialized: boolean = false;

    public game: Game;

    public static CreateSpacePanel(game: Game): FloatingElement {
        let panel = document.createElement("floating-element") as FloatingElement;
        panel.game = game;
        document.body.appendChild(panel);
        return panel;
    }

    constructor() {
        super();
    }

    public connectedCallback(): void {
        if (this._initialized) {
            return;
        }
        this._initialized = true;
    }

    public dispose(): void {
        if (this._target) {
            this._target.getScene().onBeforeRenderObservable.removeCallback(this._update);
        }
        document.body.removeChild(this);
    }

    public show(): void {
        this.style.display = "block";
    }

    public hide(): void {
        this.style.display = "none";
    }

    private _target: BABYLON.Mesh;
    public setTarget(mesh: BABYLON.Mesh): void {
        this.style.position = "fixed";
        this._target = mesh;
        
        this._target.getScene().onBeforeRenderObservable.add(this._update);
    }

    private _update = () => {
        if (!this._target) {
            return;
        }
        if (this.style.display === "none") {
            return;
        }
        let screenPos = BABYLON.Vector3.Project(
            this._target.position,
            BABYLON.Matrix.Identity(),
            this._target.getScene().getTransformMatrix(),
            this.game.camera.viewport.toGlobal(1, 1)
        );
        this.style.left = (screenPos.x * this.game.canvas.width - this.clientWidth * 0.5) + "px";
        this.style.bottom = ((1 - screenPos.y) * this.game.canvas.height) + "px";
    }
}

window.customElements.define("floating-element", FloatingElement);