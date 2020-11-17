import { Component, ComponentFactoryResolver, OnDestroy, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Subscription } from 'rxjs';

import { AuthenticationService } from 'src/app/services/authentication/AuthenticationService';
import { GameService } from 'src/app/services/game/GameService';
import { UserService } from 'src/app/services/user/UserService';

import { Move } from '../../../jscaip/Move';
import { ICurrentPart, ICurrentPartId, PICurrentPart, Part } from '../../../domain/icurrentpart';
import { CountDownComponent } from '../../normal-component/count-down/count-down.component';
import { PartCreationComponent } from '../../normal-component/part-creation/part-creation.component';
import { IJoueurId, IJoueur } from '../../../domain/iuser';
import { IMGPRequest, RequestCode } from '../../../domain/request';
import { GameWrapper } from '../GameWrapper';
import { FirebaseCollectionObserver } from 'src/app/dao/FirebaseCollectionObserver';
import { IJoiner } from 'src/app/domain/ijoiner';
import { ChatComponent } from '../../normal-component/chat/chat.component';
import { Player } from 'src/app/jscaip/Player';
import { Rules } from 'src/app/jscaip/Rules';

@Component({
    selector: 'app-game-wrapper',
    templateUrl: './online-game-wrapper.component.html',
    styleUrls: ['./online-game-wrapper.component.css']
})
export class OnlineGameWrapperComponent extends GameWrapper implements OnInit, AfterViewInit, OnDestroy {

    public static VERBOSE: boolean = false;

    @ViewChild('partCreation', {static: false})
    public partCreation: PartCreationComponent;

    @ViewChild('chatComponent', {static: false})
    public chatComponent: ChatComponent;

    // GameWrapping's Template
    @ViewChild('chronoZeroGlobal', {static: false}) public chronoZeroGlobal: CountDownComponent;
    @ViewChild('chronoOneGlobal', {static: false}) public chronoOneGlobal: CountDownComponent;
    @ViewChild('chronoZeroLocal', {static: false}) public chronoZeroLocal: CountDownComponent;
    @ViewChild('chronoOneLocal', {static: false}) public chronoOneLocal: CountDownComponent;

    // link between GameWrapping's template and remote opponent
    public currentPart: Part;
    public currentPartId: string;
    public gameStarted: boolean = false;
    public opponent: IJoueurId = null;
    public currentPlayer: string;

    public rematchProposed: boolean = null;
    public opponentProposedRematch: boolean = null;

    public maximalMoveDuration: number; // TODO: rendre inutile, remplacé par l'instance d'ICurrentPartId
    public totalPartDuration: number; // TODO: rendre inutile, remplacé par l'instance d'ICurrentPartId

    public gameBeginningTime: number;

    public firstPlayedTurn: number = null;

    protected userSub: Subscription;
    protected observedPartSubscription: Subscription;
    protected opponentSubscription: () => void;

    constructor(componentFactoryResolver: ComponentFactoryResolver,
                actRoute: ActivatedRoute,
                router: Router,
                userService: UserService,
                authenticationService: AuthenticationService,
                private gameService: GameService) {
        super(componentFactoryResolver, actRoute, router, userService, authenticationService);
        Rules.display(OnlineGameWrapperComponent.VERBOSE, "OnlineGameWrapperComponent constructed");
    }
    public ngOnInit() {
        Rules.display(OnlineGameWrapperComponent.VERBOSE, 'OnlineGameWrapperComponent.ngOnInit');

        this.currentPartId = this.actRoute.snapshot.paramMap.get('id');
        this.userSub = this.authenticationService.getJoueurObs()
            .subscribe(user => this.userName = user.pseudo);
    }
    public ngAfterViewInit() {
        /*this.chat.changes.subscribe((comps: QueryList<ElementRef>) => {
            console.log({ comps });
            this.chatVisibility = comps.first.nativeElement.firstChild.visible;
        });*/
    }
    public getChatHeight(): String {
        if (this.chatComponent == null || this.chatComponent.visible === true) return "40%"
        else return "10%";
    }
    public getGameHeight(): String {
        if (this.chatComponent == null || this.chatComponent.visible === true) return "60%"
        else return "90%";
    }
    public resetGameDatas() {
        Rules.display(OnlineGameWrapperComponent.VERBOSE, 'OnlineGame.resetGameDatas');

        this.players = null; // TODO: rendre inutile, remplacé par l'instance d'ICurrentPart

        this.gameStarted = false;
        this.endGame = false;
        this.opponent = null;

        this.canPass = null;
        this.rematchProposed = null;
        this.opponentProposedRematch = null;
        this.currentPartId = this.actRoute.snapshot.paramMap.get('id');
    }
    public startGame(iJoiner: IJoiner) {
        Rules.display(OnlineGameWrapperComponent.VERBOSE, 'OnlineGameWrapperComponent.startGame');

        if (iJoiner == null) throw new Error("Cannot start Game of empty joiner doc");
        this.maximalMoveDuration = iJoiner.maximalMoveDuration * 1000;
        this.totalPartDuration = iJoiner.totalPartDuration * 1000;

        if (this.gameStarted === true) {
            throw new Error("Should not start already started game");
        }
        this.gameStarted = true;
        setTimeout(() => {
            // the small waiting is there to make sur that the chronos are charged by view
            this.afterGameIncluderViewInit();
            this.startPart(); // NEWLY
        }, 1);
    }
    protected async startPart(): Promise<void> {
        Rules.display(OnlineGameWrapperComponent.VERBOSE, "OnlineGameWrapperComponent.startPart");

        this.startCountDownFor(this.totalPartDuration, this.totalPartDuration, 0); // TODO: ZERO SEEMS TO BE A MISTAKE
        // TODO: recharger une page dont les deux joueurs étaient partis
        this.gameService.startObserving(this.currentPartId, iPart => {
            this.onCurrentPartUpdate(iPart);
        });
        return Promise.resolve();
    }
    protected spotDifferenceBetweenUpdateAndCurrentData(update: ICurrentPart): PICurrentPart {
        const difference: PICurrentPart = {};
        if (update == null || this.currentPart == null) {
            return {};
        }
        const currentPart: ICurrentPart = this.currentPart.copy();
        if (update.typeGame !== currentPart.typeGame) {
            difference.typeGame = update.typeGame;
        }
        if (update.playerZero !== currentPart.playerZero) {
            difference.playerZero = update.playerZero;
        }
        if (update.turn !== currentPart.turn) {
            difference.turn = update.turn;
        }
        if (update.playerOne !== currentPart.playerOne) {
            difference.playerOne = update.playerOne;
        }
        if (update.beginning !== currentPart.beginning) {
            difference.beginning = update.beginning;
        }
        if (update.result !== currentPart.result) {
            difference.result = update.result;
        }
        if (update.listMoves !== currentPart.listMoves) {
            difference.listMoves = update.listMoves;
        }
        if (update.request !== currentPart.request) {
            difference.request = update.request;
        }
        return difference;
    }
    protected onCurrentPartUpdate(updatedICurrentPart: ICurrentPartId) {
        const part: ICurrentPart = updatedICurrentPart.doc;
        Rules.display(OnlineGameWrapperComponent.VERBOSE, { OnlineGameWrapperComponent_onCurrentPartUpdate: {
            before: this.currentPart,
            then: updatedICurrentPart.doc,
            before_part_turn: part.turn,
            before_slice_turn: this.gameComponent.rules.node.gamePartSlice.turn,
            nbPlayedMoves: part.listMoves.length
        }});

        let updateIsMove: boolean = this.isUpdateMove(part);
        if (updateIsMove) {
            this.doNewMoves(part);
        }
        this.currentPart = Part.of(part);
        this.checkPlayersData();
        this.checkRequests();
        this.checkEndgames();

        Rules.display(OnlineGameWrapperComponent.VERBOSE, {
            after_part_turn: part.turn,
            after_slice_turn: this.gameComponent.rules.node.gamePartSlice.turn,
            nbPlayedMoves: part.listMoves.length
        });

        if ((!this.endGame) && updateIsMove) {
            Rules.display(OnlineGameWrapperComponent.VERBOSE, {
                updateIsMove: true,
                part_turn: part.turn,
                slice_turn: this.gameComponent.rules.node.gamePartSlice.turn,
                nbPlayedMoves: part.listMoves.length
            });

            if (this.isUpdateFirstPlayerMove()) {
                Rules.display(OnlineGameWrapperComponent.VERBOSE, ">>> dans OnlineGameWrapperComponent.onCurrentPartUpdate: FIRST UPDATE TO BE A MOVE");
                this.firstPlayedTurn = part.turn - 1;
                this.startCountDownFor(this.totalPartDuration, this.totalPartDuration, part.turn % 2 === 0 ? 0 : 1);
            } else {
                Rules.display(OnlineGameWrapperComponent.VERBOSE, ">>> dans OnlineGameWrapperComponent.onCurrentPartUpdate: changing current player");
                this.resumeCountDownFor(part.turn % 2 === 0 ? Player.ZERO : Player.ONE);
            }
        }
        if (!updateIsMove) {
            Rules.display(OnlineGameWrapperComponent.VERBOSE, ">>> dans OnlineGameWrapperComponent.onCurrentPartUpdate: cette update n\'est pas un mouvement ! ");
        }
    }
    private isUpdateMove(update: ICurrentPart): boolean {
        let previousTurn: number = 0;
        if (this.currentPart != null) previousTurn = this.currentPart.copy().turn;
        return previousTurn < update.turn;

    }
    private isUpdateFirstPlayerMove(): boolean {
        const firstPlayedTurn: number = this.firstPlayedTurn;
        Rules.display(OnlineGameWrapperComponent.VERBOSE, "dans isUpdateFirstPlayerMove: firstPlayedTurn: " + firstPlayedTurn);
        return firstPlayedTurn == null;
    }
    private doNewMoves(part: ICurrentPart) {
        Rules.display(OnlineGameWrapperComponent.VERBOSE, "dans doNewMoves")
        let currentPartTurn: number;
        const listMoves = part.listMoves;
        while (this.gameComponent.rules.node.gamePartSlice.turn < listMoves.length) {
            currentPartTurn = this.gameComponent.rules.node.gamePartSlice.turn;
            const chosenMove = this.gameComponent.decodeMove(listMoves[currentPartTurn]);
            const correctDBMove: boolean = this.gameComponent.rules.choose(chosenMove);
            if (correctDBMove === false) {
                throw new Error('We received an incorrect db move: ' + chosenMove.toString() + ' in ' + listMoves + ' at turn ' + currentPartTurn);
            }
            if (this.gameComponent.rules.node.isEndGame()) {
                if (this.gameComponent.rules.node.ownValue === 0) {
                    this.notifyDraw();
                } else this.notifyVictory();
            }

        }
        this.gameComponent.updateBoard();
        this.currentPlayer = this.players[this.gameComponent.rules.node.gamePartSlice.turn % 2];
    }
    private checkPlayersData() {
        if (this.players == null || this.opponent == null) { // TODO: voir à supprimer ce sparadra
            this.setPlayersDatas(this.currentPart.copy());
        }
    }
    private checkRequests() {
        const currentRequest: IMGPRequest = this.currentPart.copy().request;
        if (currentRequest != null && currentRequest.code != null && currentRequest.code != "") {
            this.onRequest(this.currentPart.copy().request);
        }
    }
    private checkEndgames() {
        // fonctionne pour l'instant avec la victoire normale, l'abandon, et le timeout !
        const currentPart: ICurrentPart = this.currentPart.copy();
        if ([0, 1, 3, 4].includes(currentPart.result)) {
            this.endGame = true;
            this.stopCountdowns();
            if (currentPart.result === 0) { // match nul
                Rules.display(OnlineGameWrapperComponent.VERBOSE, 'match nul means winner = ' + currentPart.winner);
            }
        }
    }
    public notifyDraw() {
        this.endGame = true;
        this.gameService.notifyDraw(this.currentPartId);
    }
    public notifyTimeoutVictory(victoriousPlayer: string) {
        this.endGame = true;

        const wonPart: ICurrentPart = this.currentPart.copy();
        wonPart.winner = victoriousPlayer;
        this.currentPart = Part.of(wonPart);

        this.gameService.notifyTimeout(this.currentPartId, victoriousPlayer);
    }
    public notifyVictory() {
        // Previous line is wrong, assume that last player who notice the victory is the victorious, wrong as fuck
        let victoriousPlayer: string;
        if (this.gameComponent.rules.node.ownValue === Number.MAX_SAFE_INTEGER) {
            victoriousPlayer = this.players[1];
        } else if (this.gameComponent.rules.node.ownValue === Number.MIN_SAFE_INTEGER) {
            victoriousPlayer = this.players[0];
        } else {
            throw new Error('How the fuck did you notice victory?');
        }
        this.endGame = true;

        const wonPart: ICurrentPart = this.currentPart.copy();
        wonPart.winner = victoriousPlayer;
        this.currentPart = Part.of(wonPart);

        this.gameService.notifyVictory(this.currentPartId, victoriousPlayer);
    }
    public canAskTakeBack(): boolean {
        if (this.observerRole === 2) return false;
        else if (this.currentPart.copy().turn <= this.observerRole) return false;
        else if (this.getTakeBackRequester() === Player.NONE) return true;
        else return false;
    }
    public isOpponentWaitingForTakeBackResponse(): boolean {
        const takeBackRequester: Player = this.getTakeBackRequester();
        if (takeBackRequester === Player.ONE && this.observerRole === 0) return true;
        if (takeBackRequester === Player.ZERO && this.observerRole === 1) return true;
        return false;
    }
    public getTakeBackRequester(): Player {
        const request: IMGPRequest = this.currentPart.copy().request;
        if (request == null) {
            return Player.NONE;
        } else if (request.code === RequestCode.ZERO_ASKED_TAKE_BACK.value) {
            return Player.ZERO;
        } else if (request.code === RequestCode.ONE_ASKED_TAKE_BACK.value) {
            return Player.ONE;
        } else {
            return Player.NONE;
        }
    }
    protected onRequest(request: IMGPRequest) {
        Rules.display(OnlineGameWrapperComponent.VERBOSE, "dans OnlineGameWrapper.onRequest(" + request.code + ")");
        switch (request.code) {
            case RequestCode.ONE_ASKED_TAKE_BACK.value:
                break;
            case RequestCode.ZERO_ASKED_TAKE_BACK.value:
                break;
            case RequestCode.ZERO_ACCEPTED_TAKE_BACK.value:
                this.takeBackFor(Player.ONE);
                break;
            case RequestCode.ONE_ACCEPTED_TAKE_BACK.value:
                this.takeBackFor(Player.ZERO);
                break;
            case RequestCode.ZERO_PROPOSED_REMATCH.value: // 0 propose un rematch
                this.rematchProposed = true;
                if (this.observerRole === 1) {
                    Rules.display(OnlineGameWrapperComponent.VERBOSE, 'ton adversaire te propose une revanche, 1');
                    this.opponentProposedRematch = true;
                }
                break;
            case RequestCode.ONE_PROPOSED_REMATCH.value: // 1 propose un rematch
                this.rematchProposed = true;
                if (this.observerRole === 0) {
                    Rules.display(OnlineGameWrapperComponent.VERBOSE, 'ton adversaire te propose une revanche, 0');
                    this.opponentProposedRematch = true;
                }
                break;
            case RequestCode.REMATCH_ACCEPTED.value: // rematch accepted
                this.router
                    .navigate(['/' + request.typeGame + '/' + request.partId])
                    .then(onSuccess => {
                        this.ngOnDestroy();
                        this.resetGameDatas();
                        this.startGame(null);
                    });
                break;
            default:
                throw new Error('there was an error : ' + JSON.stringify(request) + ' had ' + request.code + ' value');
        }
    }
    private takeBackFor(player: Player) {
        this.gameComponent.rules.node = this.gameComponent.rules.node.mother;
        if (this.gameComponent.rules.node.gamePartSlice.turn % 2 !== player.value) {
            // Second time to make sure it end up on player's turn
            this.gameComponent.rules.node = this.gameComponent.rules.node.mother;
        } else {
            this.resumeCountDownFor(player);
        }
        this.gameComponent.updateBoard();
    }
    public setPlayersDatas(updatedICurrentPart: ICurrentPart) {
        Rules.display(OnlineGameWrapperComponent.VERBOSE, { OnlineGameWrapper_setPlayersDatas: updatedICurrentPart });
        this.players = [
            updatedICurrentPart.playerZero,
            updatedICurrentPart.playerOne];
        this.observerRole = 2;
        this.gameBeginningTime = updatedICurrentPart.beginning;
        let opponentName = '';
        if (this.players[0] === this.userName) {
            this.observerRole = 0;
            opponentName = this.players[1];
        } else if (this.players[1] === this.userName) {
            this.observerRole = 1;
            opponentName = this.players[0];
        }
        if (opponentName !== '') {
            const callback: FirebaseCollectionObserver<IJoueur> = new FirebaseCollectionObserver();
            callback.onDocumentCreated = (foundUser: IJoueurId[]) => {
                this.opponent = foundUser[0];
            };
            this.opponentSubscription =
                this.userService.observeUserByPseudo(opponentName, callback); // TODO: CHECK IF USEFULL OR NOT WITH NEW WAY TO DETECT DISCONNECTION
        }
    }
    public async onValidUserMove(move: Move, scorePlayerZero: number, scorePlayerOne: number): Promise<void> {
        Rules.display(OnlineGameWrapperComponent.VERBOSE, "dans OnlineGameWrapperComponent.onValidUserMove");
        if (this.isOpponentWaitingForTakeBackResponse()) {
            // TODO: ticket du toast
            console.log("You must answer to take back request lord");
        } else {
            return this.updateDBBoard(move, scorePlayerZero, scorePlayerOne);
        }
    }
    public async updateDBBoard(move: Move, scorePlayerZero: number, scorePlayerOne: number): Promise<void> {
        Rules.display(OnlineGameWrapperComponent.VERBOSE, "OnlineGameWrapperComponent.updateDBBoard(" + move.toString() + ", " + scorePlayerZero + ", " + scorePlayerOne + ")");

        const encodedMove: number = this.gameComponent.encodeMove(move);
        return this.gameService.updateDBBoard(encodedMove, scorePlayerZero, scorePlayerOne, this.currentPartId);
    }
    public resign() {
        const victoriousOpponent = this.players[(this.observerRole + 1) % 2];
        this.gameService.resign(this.currentPartId, victoriousOpponent);
    }
    public reachedOutOfTime(player: 0 | 1) {
        Rules.display(OnlineGameWrapperComponent.VERBOSE, "OnlineGameWrapperComponent.reachedOutOfTime(" + player + ")");
        if (player === this.observerRole) {
            // the player has run out of time, he'll notify his own defeat by time
            this.notifyTimeoutVictory(this.opponent.doc.pseudo);
        } else {
            // the other player has timeout
            if (!this.endGame) {
                this.notifyTimeoutVictory(this.userName);
                this.endGame = true;
            }
        }
    }
    public acceptRematch() {
        if (this.observerRole === 0 || this.observerRole === 1) {
            const currentPartId: ICurrentPartId = {
                id: this.currentPartId,
                doc: this.currentPart.copy()
            };
            this.gameService.acceptRematch(currentPartId);
        }
    }
    public proposeRematch() {
        if (this.observerRole === 0 || this.observerRole === 1) {
            this.gameService.proposeRematch(this.currentPartId, this.observerRole);
        }
    }
    public askTakeBack() {
        const player: Player = Player.of(this.observerRole);
        this.gameService.askTakeBack(this.currentPartId, player);
    }
    public acceptTakeBack() {
        const player: Player = Player.of(this.observerRole);
        this.gameService.acceptTakeBack(this.currentPartId, this.currentPart.copy(), player);
    }
    private startCountDownFor(durationZero: number, durationOne: number, player: 0 | 1) {
        Rules.display(OnlineGameWrapperComponent.VERBOSE, "dans OnlineGameWrapperComponent.startCountDownFor(" + durationZero + ", " + durationOne + ", " + player + ")");

        if (player === 0) {
            this.chronoZeroGlobal.start(durationZero);
            this.chronoZeroLocal.start(this.maximalMoveDuration);
            this.chronoOneGlobal.pause(); // TODO : remove more intelligently
            this.chronoOneLocal.stop(); // that means with ifPreviousMoveHasBeenDone
        } else {
            this.chronoOneGlobal.start(durationOne);
            this.chronoOneLocal.start(this.maximalMoveDuration);
            this.chronoZeroGlobal.pause();
            this.chronoZeroLocal.stop();
        }
    }
    private resumeCountDownFor(player: Player) {
        Rules.display(OnlineGameWrapperComponent.VERBOSE, "dans OnlineGameWrapperComponent.resumeCountDownFor(" + player.value + ")");

        if (player.value === 0) {
            this.chronoZeroGlobal.resume();
            this.chronoZeroLocal.start(this.maximalMoveDuration);
            this.chronoOneGlobal.pause();
            this.chronoOneLocal.stop();
        } else {
            this.chronoOneGlobal.resume();
            this.chronoOneLocal.start(this.maximalMoveDuration);
            this.chronoZeroGlobal.pause();
            this.chronoZeroLocal.stop();
        }
    }
    private stopCountdowns() {
        Rules.display(OnlineGameWrapperComponent.VERBOSE, 'cdc::stop count downs');

        this.chronoZeroGlobal.stop();
        this.chronoZeroLocal.stop();
        this.chronoOneGlobal.stop();
        this.chronoOneLocal.stop();
    }
    public ngOnDestroy() {
        if (this.userSub && this.userSub.unsubscribe) {
            this.userSub.unsubscribe();
        }
        if (this.gameStarted === true) {
            if (this.observedPartSubscription && this.observedPartSubscription.unsubscribe) {
                this.observedPartSubscription.unsubscribe();
            }
            if (this.opponentSubscription) {
                this.opponentSubscription();
            }
            this.gameService.stopObserving();
        }
    }
}