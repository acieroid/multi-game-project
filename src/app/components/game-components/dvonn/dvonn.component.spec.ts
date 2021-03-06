import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DvonnComponent } from './dvonn.component';

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { AuthenticationService } from 'src/app/services/authentication/AuthenticationService';
import { ActivatedRoute } from '@angular/router';
import { AppModule } from 'src/app/app.module';
import { Coord } from 'src/app/jscaip/coord/Coord';
import { JoueursDAO } from 'src/app/dao/joueurs/JoueursDAO';
import { JoueursDAOMock } from 'src/app/dao/joueurs/JoueursDAOMock';
import { DvonnPiece } from 'src/app/games/dvonn/DvonnPiece';
import { DvonnMove } from 'src/app/games/dvonn/dvonn-move/DvonnMove';
import { LocalGameWrapperComponent } from '../local-game-wrapper/local-game-wrapper.component';
import { DvonnPieceStack } from 'src/app/games/dvonn/dvonn-piece-stack/DvonnPieceStack';
import { DvonnPartSlice } from 'src/app/games/dvonn/DvonnPartSlice';
import { MGPNode } from 'src/app/jscaip/mgp-node/MGPNode';

const activatedRouteStub = {
    snapshot: {
        paramMap: {
            get: (str: string) => {
                return 'Dvonn';
            },
        },
    },
};
const authenticationServiceStub = {

    getJoueurObs: () => of({ pseudo: null, verified: null }),

    getAuthenticatedUser: () => {
        return { pseudo: null, verified: null };
    },
};
describe('DvonnComponent', () => {
    let wrapper: LocalGameWrapperComponent;

    let fixture: ComponentFixture<LocalGameWrapperComponent>;

    let gameComponent: DvonnComponent;

    const _ : number = DvonnPieceStack.EMPTY.getValue();
    const D : number = DvonnPieceStack.SOURCE.getValue();
    const WW : number = new DvonnPieceStack([DvonnPiece.PLAYER_ZERO, DvonnPiece.PLAYER_ZERO]).getValue();

    beforeEach(fakeAsync(() => {
        TestBed.configureTestingModule({
            imports: [
                RouterTestingModule,
                AppModule,
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
            providers: [
                { provide: ActivatedRoute, useValue: activatedRouteStub },
                { provide: JoueursDAO, useClass: JoueursDAOMock },
                { provide: AuthenticationService, useValue: authenticationServiceStub },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(LocalGameWrapperComponent);
        wrapper = fixture.debugElement.componentInstance;
        fixture.detectChanges();
        tick(1);
        gameComponent = wrapper.gameComponent as DvonnComponent;
    }));
    it('should create', () => {
        expect(wrapper).toBeTruthy('Wrapper should be created');
        expect(gameComponent).toBeTruthy('DvonnComponent should be created');
    });
    it('should not allow to pass initially', async () => {
        expect((await gameComponent.pass()).isFailure()).toBeTrue();
    });
    it('should allow valid moves', fakeAsync(async () => {
        expect((await gameComponent.onClick(2, 0)).isSuccess()).toBeTrue();
        expect((await gameComponent.onClick(2, 1)).isSuccess()).toBeTrue();
        expect((await gameComponent.onClick(1, 1)).isSuccess()).toBeTrue();
        expect((await gameComponent.onClick(2, 1)).isSuccess()).toBeTrue();
        await fixture.whenStable();
        fixture.detectChanges();
    }));
    it('should allow to pass if stuck position', async () => {
        const board = [
            [_, _, WW, _, _, _, _, _, _, _, _],
            [_, _, D, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _]];
        const slice: DvonnPartSlice = new DvonnPartSlice(0, board, false);
        gameComponent.rules.node = new MGPNode(null, null, slice, 0);
        gameComponent.updateBoard();
        expect(gameComponent.canPass).toBeTrue();
        expect((await gameComponent.pass()).isSuccess()).toBeTrue();
    });
    it('should disallow moving from an invalid location', async () => {
        expect((await gameComponent.onClick(0, 0)).isSuccess()).toBeFalse();
    });
    it('should disallow moving to invalid location', async () => {
        expect((await gameComponent.onClick(2, 0)).isSuccess()).toBeTrue();
        expect((await gameComponent.onClick(1, 0)).isSuccess()).toBeFalse();
    });
    it('should disallow choosing an incorrect piece', async () => {
        expect((await gameComponent.onClick(1, 1)).isSuccess()).toBeFalse(); // select black piece (but white plays first)
    });

    it('should disallow choosing a piece at end of the game', async () => {
        const board = [
            [_, _, WW, _, _, _, _, _, _, _, _],
            [_, _, D, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _]];
        const slice: DvonnPartSlice = new DvonnPartSlice(0, board, false);
        gameComponent.rules.node = new MGPNode(null, null, slice, 0);
        gameComponent.updateBoard();
        expect((await gameComponent.pass()).isSuccess()).toBeTrue();
        expect((await gameComponent.onClick(2, 0)).isSuccess()).toBeFalse();
    });
    it('should delegate decoding to move', () => {
        const moveSpy: jasmine.Spy = spyOn(DvonnMove, 'decode').and.callThrough();
        const encoded = gameComponent.encodeMove(DvonnMove.of(new Coord(2, 0), new Coord(2, 1)));
        gameComponent.decodeMove(encoded);
        expect(moveSpy).toHaveBeenCalledTimes(1);
    });
    it('should delegate encoding to move', () => {
        spyOn(DvonnMove, 'encode').and.callThrough();
        gameComponent.encodeMove(DvonnMove.of(new Coord(2, 0), new Coord(2, 1)));
        expect(DvonnMove.encode).toHaveBeenCalledTimes(1);
    });
});

