import {Component, OnInit} from '@angular/core';
import {AngularFirestore, AngularFirestoreDocument, DocumentReference, QuerySnapshot} from 'angularfire2/firestore';
import {Router} from '@angular/router';

import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import {UserDAO} from '../../../dao/UserDAO';

import {ICurrentPart} from '../../../domain/icurrentpart';
import {IUser, IUserId} from '../../../domain/iuser';

import {UserService} from '../../../services/user-service';
import {GameInfoService} from '../../../services/game-info-service';

import {HeaderComponent} from '../../normal-component/header/header.component';

import {MoveX} from '../../../jscaip/MoveX';

import {AwaleRules} from '../../../games/games.awale/AwaleRules';
import {AwalePartSlice} from '../../../games/games.awale/AwalePartSlice';

@Component({
	selector: 'app-awale-online',
	templateUrl: './awale-online.component.html',
	styleUrls: ['./awale-online.component.css']
})
export class AwaleOnlineComponent implements OnInit {

	rules = new AwaleRules();
	observerRole: number; // to see if the player is player zero (0) or one (1) or observatory (2)
	playersZero: string = null;
	playersOne: string;
	board: Array<Array<number>>;

	private observedPart: Observable<ICurrentPart>;
	private partDocument: AngularFirestoreDocument<ICurrentPart>;

	partId: string;
	userName: string;
	currentPlayer: string;
	capturedZero: number;
	capturedOne: number;
	turn = 0;
	endGame = false;
	winner: string;
	private opponent: IUserId = null;
	opponentPseudo: string;
	allowedTimeoutVictory = false;

	imagesLocation = 'gaviall/pantheonsgame/assets/images/circled_numbers/';

	constructor(private afs: AngularFirestore, private gameInfoService: GameInfoService,
				private _route: Router,        private userService: UserService,
				private userDao: UserDAO) {
	}

	ngOnInit() {
		// totally adaptable to other Rules
		// MNode.ruler = this.rules;

		// should be some kind of session-scope
		this.gameInfoService.currentPartId.subscribe(partId =>
			this.partId = partId);
		this.userService.currentUsername.subscribe(message =>
			this.userName = message);

		this.rules.setInitialBoard();
		this.board = this.rules.node.gamePartSlice.getCopiedBoard();

		this.partDocument = this.afs.collection('parties/').doc(this.partId);
		this.observedPart = this.partDocument.snapshotChanges()
			.pipe(map(actions => actions.payload.data() as ICurrentPart));
		this.observedPart.subscribe(updatedICurrentPart =>
			this.onCurrentPartUpdate(updatedICurrentPart));
	}

	onCurrentPartUpdate(updatedICurrentPart: ICurrentPart) {
		if (this.playersZero == null) {
			this.setPlayersDatas(updatedICurrentPart);
		}
		// fonctionne pour l'instant avec la victoire normale, l'abandon, et le timeout !
		if ([1, 3, 4].includes(updatedICurrentPart.result)) {
			this.endGame = true;
			this.winner = updatedICurrentPart.winner;
		}
		const listMoves = updatedICurrentPart.listMoves;
		this.turn = updatedICurrentPart.turn;

		const nbPlayedMoves = listMoves.length;
		let currentPartTurn;
		while (this.rules.node.gamePartSlice.turn < nbPlayedMoves) {
			currentPartTurn = this.rules.node.gamePartSlice.turn;
			console.log('Move tenté : ' + MoveX.get(listMoves[currentPartTurn]).toString());
			const bol: boolean = this.rules.choose(MoveX.get(listMoves[currentPartTurn]));
		}
		this.updateBoard();
	}

	setPlayersDatas(updatedICurrentPart: ICurrentPart) {
		this.playersZero = updatedICurrentPart.playerZero;
		this.playersOne = updatedICurrentPart.playerOne;
		this.observerRole = 2;
		if (this.playersZero === this.userName) {
			this.observerRole = 0;
			this.opponentPseudo = this.playersOne;
		} else if (this.playersOne === this.userName) {
			this.observerRole = 1;
			this.opponentPseudo = this.playersZero;
		}
		if (this.opponentPseudo !== '') {
			this.userDao.getUserDocRefByUserName(this.opponentPseudo)
				.onSnapshot(userQuerySnapshot =>
					this.onUserUpdate(userQuerySnapshot));
		}
	}

	onUserUpdate(userQuerySnapshot: QuerySnapshot<any>) {
		userQuerySnapshot.forEach(doc => {
			const data = doc.data() as IUser;
			const id = doc.id;
			if (this.opponent == null) {
				this.opponent = {id: id, user: data};
				this.opponentPseudo = this.opponent.user.pseudo;
				this.startWatchingForOpponentTimeout();
			}
			this.opponent = {id: id, user: data};
		});
	}

	startWatchingForOpponentTimeout() {
		if (this.opponentHasTimedOut()) {
			this.allowedTimeoutVictory = true;
		} else {
			this.allowedTimeoutVictory = false;
		}
		setTimeout(() => this.startWatchingForOpponentTimeout(),
			HeaderComponent.refreshingPresenceTimeout);
	}

	opponentHasTimedOut() {
		const timeOutDuree = 20 * 1000;
		console.log('lastActionTime of your opponant : ' + this.opponent.user.lastActionTime);
		return (this.opponent.user.lastActionTime + timeOutDuree < Date.now());
	}

	backToServer() {
		this._route.navigate(['server']);
	}

	resign() {
		const victoriousPlayer = this.players[(this.observerRole + 1) % 2];
		const docRef: DocumentReference = this.partDocument.ref;
		docRef.update({
			winner: victoriousPlayer,
			result: 1
		}); // resign
	}

	notifyTimeout() {
		const victoriousPlayer = this.userName;
		this.endGame = true;
		this.winner = victoriousPlayer;
		const docRef = this.partDocument.ref;
		docRef.update({
			winner: victoriousPlayer,
			result: 4
		});
	}

	players(turn: number): string {
		return turn % 2 === 0 ? this.playersZero : this.playersOne;
	}

	notifyVictory() {
		const victoriousPlayer = this.players(this.rules.node.gamePartSlice.turn + 1);
		this.endGame = true;
		this.winner = victoriousPlayer;
		const docRef = this.partDocument.ref;
		docRef.update({
			'winner': victoriousPlayer,
			'result': 3
		});
	}

	isPlayerTurn() {
		const indexPlayer = this.rules.node.gamePartSlice.turn % 2;
		return this.players(indexPlayer) === this.userName;
	}

	updateBoard() {
		const awalePartSlice: AwalePartSlice = this.rules.node.gamePartSlice as AwalePartSlice;
		this.board = awalePartSlice.getCopiedBoard();
		this.turn = awalePartSlice.turn;
		this.currentPlayer = this.players(awalePartSlice.turn);

		const captured = awalePartSlice.getCapturedCopy();
		this.capturedZero = captured[0];
		this.capturedOne = captured[1];
	}

	updateDBBoard(move: MoveX) {
		const docRef = this.partDocument.ref;
		docRef.get()
			.then((doc) => {
				const turn: number = doc.get('turn') + 1;
				const listMoves: number[] = doc.get('listMoves');
				listMoves[listMoves.length] = move.x;
				docRef.update({
					'listMoves': listMoves,
					'turn': turn
				});
			}).catch((error) => {
			console.log(error);
		});
	}

	choose(event: MouseEvent): boolean {
		if (!this.isPlayerTurn()) {
			console.log('Mais c\'est pas ton tour !'); // todo : réactive notification
			return false;
		}
		const x: number = Number(event.srcElement.id.substring(2, 3));
		console.log('vous tentez un mouvement en colonne ' + x);

		if (this.rules.node.isEndGame()) {
			console.log('Malheureusement la partie est finie');
			// todo : option de clonage revision commentage
			return false;
		}

		console.log('ça tente bien c\'est votre tour');
		// player's turn
		const choosedMove = MoveX.get(x);
		if (this.rules.choose(choosedMove)) {
			console.log('Et javascript estime que votre mouvement est légal');
			// player make a correct move
			// let's confirm on java-server-side that the move is legal
			this.updateDBBoard(choosedMove);
			if (this.rules.node.isEndGame()) {
				this.notifyVictory();
			}
		} else {
			console.log('Mais c\'est un mouvement illegal');
		}
	}

}
