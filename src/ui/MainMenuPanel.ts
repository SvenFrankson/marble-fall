class MainMenuPanel extends HTMLElement {

    public x: number = 0;
    public y: number = 0;

    public w: number = 1;
    public h: number = 1;

    public computedTop: number = 0;
    public computedLeft: number = 0;

    public get top(): number {
        return parseFloat(this.style.top)
    }
    public set top(v) {
        if (this) {
            this.style.top = v.toFixed(1) + "px"; 
        }
    }

    public get left(): number {
        return parseFloat(this.style.left)
    }
    public set left(v) {
        if (this) {
            this.style.left = v.toFixed(1) + "px"; 
        }
    }
}

customElements.define("menu-panel", MainMenuPanel);