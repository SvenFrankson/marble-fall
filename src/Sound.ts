interface ISoundProp {
    fileName?: string;
    loop?: boolean;
}

class Sound {

    private _audioElement: HTMLAudioElement;

    constructor(prop: ISoundProp) {
        if (prop) {
            if (prop.fileName) {
                this._audioElement = new Audio(prop.fileName);
            }
            if (this._audioElement) {
                if (prop.loop) {
                    this._audioElement.loop = prop.loop;
                }
            }
        }
    }

    public get volume(): number {
        return this._audioElement.volume;
    }
    public set volume(v: number) {
        if (isFinite(v)) {
            this._audioElement.volume = Math.max(Math.min(v, 1), 0);
        }
    }

    public play(fromBegin: boolean = true): void {
        if (this._audioElement) {
            if (fromBegin) {
                this._audioElement.currentTime = 0;
            }
            try {
                this._audioElement.play();
            } catch (error) {
                requestAnimationFrame(() => {
                    this._audioElement.play();
                })
            }
        }
    }

    public pause(): void {
        if (this._audioElement) {
            this._audioElement.pause();
        }
    }
}