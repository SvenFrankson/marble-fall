class MarbleRouter extends Nabu.Router {

    public homePage: Nabu.PanelPage;
    public challengePage: Nabu.PanelPage;
    public creditsPage: CreditsPage;
    public optionsPage: OptionsPage;

    constructor(public game: Game) {
        super();
    }
    
    protected onFindAllPages(): void {
        this.homePage = document.getElementById("main-menu") as Nabu.PanelPage;
        this.challengePage = document.getElementById("challenge-menu") as Nabu.PanelPage;
        this.creditsPage = this.game.creditsPage;
        this.optionsPage = this.game.optionsPage;
        
        this.pages.push(this.creditsPage);
        this.pages.push(this.optionsPage);

        this.pages.push(this.game.challenge.tutoPopup);
        this.pages.push(this.game.challenge.tutoComplete);
    }

    protected onUpdate(): void {
        
    }

    protected async onHRefChange(page: string): Promise<void> {
        console.log("router " + page);
        this.game.machineEditor.dispose();
        if (page.startsWith("#options")) {
            this.game.machine.play();
            this.game.mode = GameMode.Page;
            this.game.setCameraMode(this.game.menuCameraMode);

            this.game.logo.show();
            this.show(this.optionsPage);
        }
        else if (page.startsWith("#credits")) {
            this.game.machine.play();
            this.game.mode = GameMode.Page;
            this.game.setCameraMode(this.game.menuCameraMode);

            this.game.logo.show();
            this.show(this.creditsPage);
        }
        else if (page.startsWith("#challenge-menu")) {
            this.game.machine.play();
            this.game.mode = GameMode.Page;
            this.game.setCameraMode(this.game.menuCameraMode);
            
            this.game.logo.show();
            this.show(this.challengePage);
        }
        else if (page.startsWith("#editor")) {
            this.game.mode = GameMode.Create;
            this.game.setCameraMode(CameraMode.None);

            this.game.machine.stop();

            this.game.logo.hide();
            this.hideAll();
            
            this.game.machineEditor.instantiate();
        }
        else if (page.startsWith("#demo-")) {
            let index = parseInt(page.replace("#demo-", ""));
            this.game.mode = GameMode.Demo;
            this.game.setCameraMode(CameraMode.Landscape);

            this.game.logo.hide();
            this.hideAll();

            let dataResponse = await fetch("./datas/demos/demo-" + index.toFixed(0) + ".json")
            if (dataResponse) {
                let data = await dataResponse.json();
                if (data) {
                    this.game.machine.dispose();
                    this.game.machine.deserialize(data);
        
                    this.game.machine.generateBaseMesh();
                    this.game.machine.instantiate().then(() => { this.game.machine.play(); });
                }
            }
        }
        else if (page.startsWith("#challenge-")) {
            this.game.mode = GameMode.Challenge;
            this.game.animateCamera([- Math.PI * 0.5, 0.8 * Math.PI * 0.5, 0.4], 3);
            this.game.animateCameraTarget(new BABYLON.Vector3(- 0.15, 0, 0), 3);
            this.game.setCameraMode(CameraMode.None);

            this.game.logo.hide();
            this.hideAll();

            this.game.machine.stop();
            this.game.machine.dispose();
            this.game.machine.deserialize(testChallenge);
            this.game.machine.generateBaseMesh();
            this.game.machine.instantiate();

            this.game.machineEditor.instantiate();
            this.game.challenge.initialize();
        }
        else if (page.startsWith("#home") || true) {
            this.game.machine.play();
            this.game.mode = GameMode.Home;
            this.game.logo.show();

            this.show(this.homePage);
        }
        this.game.toolbar.closeAllDropdowns();
        this.game.topbar.resize();
        this.game.toolbar.resize();
        this.game.machine.regenerateBaseAxis();
    }
}