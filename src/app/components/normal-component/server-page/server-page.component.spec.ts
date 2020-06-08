import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ServerPageComponent } from './server-page.component';

import { RouterTestingModule } from '@angular/router/testing';
import { AuthenticationService } from 'src/app/services/authentication/AuthenticationService';
import { of, Observable } from 'rxjs';
import { UserService } from 'src/app/services/user/UserService';
import { GameService } from 'src/app/services/game/GameService';
import { ICurrentPartId } from 'src/app/domain/icurrentpart';
import { ChatService } from 'src/app/services/chat/ChatService';
import { IChatId } from 'src/app/domain/ichat';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MatTabsModule } from '@angular/material';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { INCLUDE_VERBOSE_LINE_IN_TEST } from 'src/app/app.module';

const userServiceStub = {
    getActivesUsersObs: () => of([]),
    unSubFromActivesUsersObs: () => {},
};
class GameServiceMock {
    getActivesPartsObs(): Observable<ICurrentPartId[]> {
        return of([]);
    }
    unSubFromActivesPartsObs() {
        return;
    }
    createGame(creatorName: string, typeGame: string, chosenPlayer: string): Promise<string> {
        return;
    }
};
class AuthenticationServiceMock {

    public static CURRENT_USER: {pseudo: string, verified: boolean} = null;

    public static IS_USER_LOGGED: boolean = null;

    public getJoueurObs(): Observable<{pseudo: string, verified: boolean}> {
        if (AuthenticationServiceMock.CURRENT_USER == null)
            throw new Error("MOCK VALUE CURRENT_USER NOT SET BEFORE USE");
        return of(AuthenticationServiceMock.CURRENT_USER);
    }
    public isUserLogged(): boolean {
        if (AuthenticationServiceMock.IS_USER_LOGGED == null)
            throw new Error("MOCK VALUE NOT SET BEFORE USE");
        else
            return AuthenticationServiceMock.IS_USER_LOGGED;
    }
};
const chatServiceStub = {
    startObserving: (cId: string, cb: (iChatId: IChatId) => void) => {},
    stopObserving: () => {},
};
class RouterMock {
    public async navigate(to: string[]): Promise<boolean> {
        return true;
    };
}
describe('ServerPageComponent', () => {

    let component: ServerPageComponent;

    let authenticationService: AuthenticationService;
    let gameService: GameService;
    let userService: UserService;
    let router: Router;

    let fixture: ComponentFixture<ServerPageComponent>;

    beforeAll(() => {
        ServerPageComponent.VERBOSE = INCLUDE_VERBOSE_LINE_IN_TEST || ServerPageComponent.VERBOSE;
    });
    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [
                MatTabsModule,
                FormsModule,
                RouterTestingModule,
                BrowserAnimationsModule,
            ],
            declarations: [
                ServerPageComponent,
            ],
            schemas: [
                CUSTOM_ELEMENTS_SCHEMA,
            ],
            providers: [
                { provide: UserService, useValue: userServiceStub },
                { provide: GameService, useClass: GameServiceMock },
                { provide: AuthenticationService, useClass: AuthenticationServiceMock },
                { provide: ChatService, useValue: chatServiceStub },
                { provide: Router, useClass: RouterMock}
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(ServerPageComponent);
        component = fixture.componentInstance;
        authenticationService = TestBed.get(AuthenticationService);
        gameService = TestBed.get(GameService);
        userService = TestBed.get(UserService);
        router = TestBed.get(Router);

        AuthenticationServiceMock.CURRENT_USER = { pseudo: null, verified: null};
        AuthenticationServiceMock.IS_USER_LOGGED = null;
    }));
    it('should create', async(() => {
        expect(component).toBeTruthy();
        const ngOnInit = spyOn(component, "ngOnInit").and.callThrough();;
        expect(ngOnInit).not.toHaveBeenCalled();

        fixture.detectChanges();

        expect(ngOnInit).toHaveBeenCalledTimes(1);
    }));
    it('should subscribe to three observable on init', async(() => {
        AuthenticationServiceMock.CURRENT_USER = { pseudo: 'Pseudo', verified: true};
        expect(component.userName).toBeUndefined();
        const joueurObsSpy = spyOn(authenticationService, "getJoueurObs").and.callThrough();
        const activePartsObsSpy = spyOn(gameService, "getActivesPartsObs").and.callThrough();
        const activesUsersObsSpy = spyOn(userService, "getActivesUsersObs").and.callThrough();

        expect(joueurObsSpy).not.toHaveBeenCalled();
        expect(activePartsObsSpy).not.toHaveBeenCalled();
        expect(activesUsersObsSpy).not.toHaveBeenCalled();

        component.ngOnInit();

        expect(component.userName).toBe("Pseudo");
        expect(joueurObsSpy).toHaveBeenCalledTimes(1);
        expect(activePartsObsSpy).toHaveBeenCalledTimes(1);
        expect(activesUsersObsSpy).toHaveBeenCalledTimes(1);
    }));
    it('isUserLogged should delegate to authService', () => {
        const isUserLogged: jasmine.Spy = spyOn(authenticationService, "isUserLogged");
        expect(isUserLogged).toHaveBeenCalledTimes(0);
    });
    it('should be legal for any logged user to create game when there is none', async(() => {
        AuthenticationServiceMock.CURRENT_USER = { pseudo: 'Pseudo', verified: true};
        AuthenticationServiceMock.IS_USER_LOGGED = true;

        component.ngOnInit();

        expect(component.canCreateGame()).toBeTruthy();
    }));
    it('should be illegal for unlogged user to create game', async(() => {
        AuthenticationServiceMock.CURRENT_USER = { pseudo: null, verified: null};
        AuthenticationServiceMock.IS_USER_LOGGED = false;

        component.ngOnInit();

        expect(component.canCreateGame()).toBeFalsy();
    }));
    it('should be illegal to create game for a player already in game', async(() => {
        AuthenticationServiceMock.CURRENT_USER = { pseudo: 'Pseudo', verified: true};
        AuthenticationServiceMock.IS_USER_LOGGED = true;
        const currentPartSpy = spyOn(gameService, "getActivesPartsObs").and.returnValue(of([{
            id: "partId",
            doc: {
                typeGame: "P4",
                playerZero: "Pseudo",
                turn: -1,
                listMoves: [],
            }
        }]));
        component.ngOnInit();

        expect(component.canCreateGame()).toBeFalsy();
    }));
    it('should be legal for unlogged user to create local game', async(async () => {
        AuthenticationServiceMock.CURRENT_USER = { pseudo: null, verified: null};
        AuthenticationServiceMock.IS_USER_LOGGED = false;
        component.ngOnInit();
        const routerNavigateSpy = spyOn(component.router, "navigate").and.callThrough();

        component.playLocally();
        await fixture.whenStable();

        expect(routerNavigateSpy).toHaveBeenCalledWith(['local/undefined'])
    }));
    afterAll(async(() => {
        component.ngOnDestroy();
    }));
});