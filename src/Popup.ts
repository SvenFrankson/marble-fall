class Popup extends HTMLElement {

    public static get observedAttributes() {
        return [
            "duration"
        ];
    }
    
    private _shown: boolean = false;
    private _duration: number = 0;
    private _updateInterval: number;
    private _animateOpacityInterval: number;

    public connectedCallback() {
        this.initialize();
        this._updateInterval = setInterval(this._update, 100);
    }

    public attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === "duration") {
            let value = parseFloat(newValue);
            if (isFinite(value)) {
                this._duration = value;
            }
        }
    }

    private _update = () => {
        if (!this.isConnected) {
            clearInterval(this._updateInterval);
        }
    }
    
    public initialize(): void {
        this.style.opacity = "0";
        this.style.display = "none";
        this.style.position = "fixed";
        this.style.zIndex = "10";
    }

    public async show(duration: number = 1): Promise<void> {
        return new Promise<void>(resolve => {
            if (!this._shown) {
                clearInterval(this._animateOpacityInterval);
    
                this._shown = true;
                this.style.display = "block";
                let opacity0 = parseFloat(this.style.opacity);
                let t0 = performance.now() / 1000;
                this._animateOpacityInterval = setInterval(() => {
                    let t = performance.now() / 1000 - t0;
                    if (t >= duration) {
                        clearInterval(this._animateOpacityInterval);
                        this.style.opacity = "1";
                        if (this._duration > 0) {
                            setTimeout(() => {
                                this.hide(duration).then(resolve);
                            }, this._duration * 1000);
                        }
                        else {
                            resolve();
                        }
                    }
                    else {
                        let f = t / duration;
                        this.style.opacity = ((1 - f) * opacity0 + f * 1).toFixed(3);
                    }
                }, 15)
            }
        });
    }

    public async hide(duration: number = 1): Promise<void> {
        return new Promise<void>(resolve => {
            if (this._shown) {
                clearInterval(this._animateOpacityInterval);

                this._shown = false;
                this.style.display = "block";
                let opacity0 = parseFloat(this.style.opacity);
                let t0 = performance.now() / 1000;
                this._animateOpacityInterval = setInterval(() => {
                    let t = performance.now() / 1000 - t0;
                    if (t >= duration) {
                        clearInterval(this._animateOpacityInterval);
                        this.style.opacity = "0";
                        this.style.display = "none";
                        resolve();
                    }
                    else {
                        let f = t / duration;
                        this.style.opacity = ((1 - f) * opacity0).toFixed(3);
                    }
                }, 15)
            }
        });
    }
}

customElements.define("nabu-popup", Popup);