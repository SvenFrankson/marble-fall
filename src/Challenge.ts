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

    constructor(public challenge: Challenge) {

    }

    public doStep: () => Promise<void>;
}

class Challenge {

    public tutoPopup: Popup;
    public tutoText: HTMLDivElement;

    public state: number = 0;

    public steps: ChallengeStep[] = [];
    
    constructor(public game: Game) {
        this.tutoPopup = document.getElementById("challenge-tuto") as Popup;
        this.tutoText = this.tutoPopup.querySelector("div");

        this.steps = [
            ChallengeStep.Wait(this, 1),
            ChallengeStep.Text(this, "Challenge mode, easy start.", 3),
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