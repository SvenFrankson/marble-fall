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
        this._audioElement.volume = v;
    }

    public play(fromBegin: boolean = true): void {
        if (this._audioElement) {
            if (fromBegin) {
                this._audioElement.currentTime = 0;
            }
            this._audioElement.play();
        }
    }

    public pause(): void {
        if (this._audioElement) {
            this._audioElement.pause();
        }
    }
}