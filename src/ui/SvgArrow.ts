class SvgArrow {

    public image: Popup;
    private _w: number;

    public setTarget(e: HTMLElement): void {
        let rect = e.getBoundingClientRect();
        this.image.style.top = (rect.top + rect.height * 0.5 - this._w * 1.5 * 0.5).toFixed(1) + "px";
        this.image.style.left = (rect.left + rect.width * 0.5 - this._w * 0.5).toFixed(1) + "px";
    }

    public setTargetXY(x: number, y: number): void {
        this.image.style.left = x.toFixed(1) + "px";
        this.image.style.top = y.toFixed(1) + "px";
    }

    constructor(name: string, public game: Game, public readonly baseSize: number = 0.1, public distanceFromTarget: number = 0, public dirInDegrees?: number) {
        this.image = document.createElement("nabu-popup") as Popup;
        this.image.style.position = "fixed";
        this.image.style.transformOrigin = "center";
        this.image.style.transform = "rotate(" + this.dirInDegrees + "deg)";
        document.body.appendChild(this.image);
    }

    public async instantiate(): Promise<void> {
        this.image.innerHTML = `
            <svg viewBox="0 0 200 300">
                <path d="M100 150 L125 200 L109 200 L109 250 L91 250 L91 200 L75 200 Z" fill="white" stroke="white" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;
        let svg = this.image.querySelector("svg");
        this._w = (Math.min(window.innerWidth, window.innerHeight) * this.baseSize);
        svg.style.width = this._w.toFixed(1) + "px";
        let d = (Math.min(window.innerWidth, window.innerHeight) * this.baseSize * this.distanceFromTarget);
        svg.style.transform = "translate(0px, " + d.toFixed(1) + "px)"
    }

    public show(duration?: number): Promise<void> {
        return this.image.show(duration);
    }

    public hide(duration?: number): Promise<void> {
        return this.image.hide(duration);
    }

    public dispose(): void {
        document.removeChild(this.image);
    }
}