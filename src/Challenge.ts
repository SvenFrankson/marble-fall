class ChallengeStep {

    public static Wait(challenge: Challenge, duration: number): ChallengeStep {
        let step = new ChallengeStep(challenge);
        step.doStep = () => {
            return new Promise<void>(resolve => {
                setTimeout(resolve, duration * 1000);
            })
        }
        return step;
    }

    public static Text(challenge: Challenge, text: string, duration: number): ChallengeStep {
        let step = new ChallengeStep(challenge);
        step.doStep = () => {
            step.challenge.tutoPopup.setAttribute("duration", duration.toFixed(3));
            step.challenge.tutoText.innerText = text;
            return step.challenge.tutoPopup.show();
        }
        return step;
    }

    public static Arrow(challenge: Challenge, position: BABYLON.Vector3 | (() => BABYLON.Vector3), duration: number): ChallengeStep {
        let step = new ChallengeStep(challenge);
        step.doStep = () => {
            let p: BABYLON.Vector3;
            if (position instanceof BABYLON.Vector3) {
                p = position;
            }
            else {
                p = position();
            }
            let dir = new BABYLON.Vector3(0, - 1, 0);
            let arrow = new HighlightArrow("challenge-step-arrow", challenge.game, 0.1, dir);
            arrow.position = p.subtract(dir.scale(0.05));
            return new Promise<void>(resolve => {
                arrow.instantiate().then(async () => {
                    await arrow.show(0.5);
                    await challenge.WaitAnimation(duration);
                    await arrow.hide(0.5);
                    arrow.dispose();
                    resolve();
                });
            })
        }
        return step;
    }

    constructor(public challenge: Challenge) {

    }

    public doStep: () => Promise<void>;
}

class Challenge {

    public WaitAnimation = Mummu.AnimationFactory.EmptyVoidCallback;
    public tutoPopup: Popup;
    public tutoText: HTMLDivElement;

    public state: number = 0;

    public steps: ChallengeStep[] = [];
    
    constructor(public game: Game) {
        this.WaitAnimation = Mummu.AnimationFactory.CreateWait(this.game);

        this.tutoPopup = document.getElementById("challenge-tuto") as Popup;
        this.tutoText = this.tutoPopup.querySelector("div");

        this.steps = [
            ChallengeStep.Wait(this, 1),
            ChallengeStep.Text(this, "Challenge mode, easy start.", 1),
            ChallengeStep.Arrow(this, () => {
                console.log(game.machine.balls);
                console.log(game.machine.balls[0].positionZero);
                return game.machine.balls[0].positionZero;
            }, 6),
            ChallengeStep.Text(this, "Bring the ball...", 1),
            ChallengeStep.Text(this, "to its destination.", 1),
            ChallengeStep.Text(this, "First, add the adequate Track elements.", 2),
            ChallengeStep.Text(this, "Then press Play.", 2),
            ChallengeStep.Text(this, "Puzzle is completed when the ball is in the golden receptacle.", 4),
        ]
    }

    public initialize(): void {
        this.state = 0;
    }

    public update(): void {
        if (this.state != - 1) {
            let step = this.steps[this.state];
            if (step) {
                let next = this.state + 1;
                this.state = -1;
                step.doStep().then(() => { this.state = next; });
            }
        }
    }
}