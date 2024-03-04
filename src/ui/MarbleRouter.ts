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
    }

    protected onUpdate(): void {
        
    }

    protected async onHRefChange(page: string): Promise<void> {
        if (page.startsWith("#options")) {
            this.game.mode = GameMode.Options;
            this.game.setCameraMode(this.game.menuCameraMode);

            this.game.logo.show();
            await this.show(this.optionsPage);
        }
        else if (page.startsWith("#credits")) {
            this.game.mode = GameMode.Credits;
            this.game.setCameraMode(this.game.menuCameraMode);

            this.game.logo.show();
            await this.show(this.creditsPage);
        }
        else if (page.startsWith("#challenge-menu")) {
            this.game.mode = GameMode.MainMenu;
            this.show(this.challengePage);
        }
        else if (page.startsWith("#home") || true) {
            this.game.mode = GameMode.MainMenu;
            this.show(this.homePage);
        }
        this.game.toolbar.closeAllDropdowns();
        this.game.machineEditor.dispose();
        this.game.topbar.resize();
        this.game.toolbar.resize();
        this.game.machine.regenerateBaseAxis();
    }
}