class MarbleRouter extends Nabu.Router {

    public homePage: Nabu.PanelPage;
    public challengePage: Nabu.PanelPage;
    public creditsPage: CreditsPage;
    public optionsPage: OptionsPage;

    public demos = [];

    constructor(public game: Game) {
        super();
        this.demos = [simpleLoop, demo1, demoLoops, demo3, largeTornado, deathLoop, popopo, aerial];
    }
    
    protected onFindAllPages(): void {
        this.homePage = document.getElementById("main-menu") as Nabu.PanelPage;
        this.challengePage = document.getElementById("challenge-menu") as Nabu.PanelPage;
        this.creditsPage = this.game.creditsPage;
        this.optionsPage = this.game.optionsPage;
        
        this.pages.push(this.creditsPage);
        this.pages.push(this.optionsPage);
    }

    protected onUpdate(): void {
        
    }

    protected async onHRefChange(page: string): Promise<void> {
        console.log("router " + page);
        if (page.startsWith("#options")) {
            this.game.mode = GameMode.Options;
            this.game.setCameraMode(this.game.menuCameraMode);

            this.game.logo.show();
            this.show(this.optionsPage);
        }
        else if (page.startsWith("#credits")) {
            this.game.mode = GameMode.Credits;
            this.game.setCameraMode(this.game.menuCameraMode);

            this.game.logo.show();
            this.show(this.creditsPage);
        }
        else if (page.startsWith("#demo-")) {
            let index = parseInt(page.replace("#demo-", ""));
            this.game.mode = GameMode.Demo;
            this.game.setCameraMode(CameraMode.Landscape);

            this.game.logo.hide();
            this.hideAll();

            this.game.machine.dispose();
            this.game.machine.deserialize(this.demos[index]);

            await this.game.machine.generateBaseMesh();
            await this.game.machine.instantiate();
        }
        else if (page.startsWith("#challenge-menu")) {
            this.game.mode = GameMode.MainMenu;
            this.show(this.challengePage);
        }
        else if (page.startsWith("#home") || true) {
            this.game.mode = GameMode.MainMenu;
            this.game.logo.show();

            this.show(this.homePage);
        }
        this.game.toolbar.closeAllDropdowns();
        this.game.machineEditor.dispose();
        this.game.topbar.resize();
        this.game.toolbar.resize();
        this.game.machine.regenerateBaseAxis();
    }
}