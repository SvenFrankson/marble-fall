interface IMeshWithGroundWidth {
    groundWidth: number;
    height: number;
}

enum FloatingElementAnchor {
    BottomCenter,
    LeftMiddle,
    TopCenter,
    RightMiddle,

    LeftBottom,
    LeftTop,
}

class FloatingElement extends HTMLElement {

    private _initialized: boolean = false;

    public anchor: FloatingElementAnchor = FloatingElementAnchor.BottomCenter;
    public anchorMargin: number = 10;
    public game: Game;

    public static Create(game: Game): FloatingElement {
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
        if (this._targetMesh) {
            this._targetMesh.getScene().onBeforeRenderObservable.removeCallback(this._update);
        }
        document.body.removeChild(this);
    }

    public show(): void {
        this.style.display = "block";
    }

    public hide(): void {
        this.style.display = "none";
    }

    private _targetMesh: BABYLON.Mesh;
    private _targetPosition: BABYLON.Vector3;
    public setTarget(target: BABYLON.Mesh | BABYLON.Vector3): void {
        this.style.position = "fixed";
        if (target instanceof BABYLON.Mesh) {
            this._targetMesh = target;
            this._targetPosition = undefined;
        }
        else if (target instanceof BABYLON.Vector3) {
            this._targetPosition = target;
            this._targetMesh = undefined;
        }
        
        this.game.scene.onAfterRenderObservable.add(this._update);
    }

    private _update = () => {
        if (!this._targetMesh && !this._targetPosition) {
            return;
        }
        if (this.style.display === "none") {
            return;
        }
        let p = this._targetPosition;
        if (!p) {
            p = this._targetMesh.absolutePosition;
        }
        let screenPos = BABYLON.Vector3.Project(
            p,
            BABYLON.Matrix.Identity(),
            this.game.scene.getTransformMatrix(),
            this.game.camera.viewport.toGlobal(1, 1)
        );
        let dLeft = 0;
        let dBottom = 0;
        if (this.anchor === FloatingElementAnchor.TopCenter) {
            dLeft = - 0.5 * this.clientWidth;
            dBottom = - this.clientHeight - this.anchorMargin;
        }
        if (this.anchor === FloatingElementAnchor.LeftMiddle) {
            dLeft = this.anchorMargin;
            dBottom = - 0.5 * this.clientHeight;
        }
        if (this.anchor === FloatingElementAnchor.BottomCenter) {
            dLeft = - 0.5 * this.clientWidth;
            dBottom = this.anchorMargin;
        }
        if (this.anchor === FloatingElementAnchor.RightMiddle) {
            dLeft = - this.clientWidth - this.anchorMargin;
            dBottom = - 0.5 * this.clientHeight;
        }
        if (this.anchor === FloatingElementAnchor.LeftBottom) {
            dLeft = this.anchorMargin;
            dBottom = this.anchorMargin;
        }
        if (this.anchor === FloatingElementAnchor.LeftTop) {
            dLeft = this.anchorMargin;
            dBottom = - this.clientHeight - this.anchorMargin;
        }
        this.style.left = (screenPos.x * this.game.canvas.width + dLeft).toFixed(1) + "px";
        this.style.bottom = ((1 - screenPos.y) * this.game.canvas.height + dBottom).toFixed(1) + "px";
    }
}

window.customElements.define("floating-element", FloatingElement);