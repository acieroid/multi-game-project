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

import {HeaderComponent} from '../../normal-component/header/header.component'; // TODO: constantifier maggle

import {QuartoRules} from '../../../games/games.quarto/QuartoRules';
import {QuartoPartSlice} from '../../../games/games.quarto/QuartoPartSlice';
import {QuartoMove} from '../../../games/games.quarto/QuartoMove';
import {QuartoEnum} from '../../../games/games.quarto/QuartoEnum';

@Component({
	selector: 'app-quarto-online',
	templateUrl: './quarto-online.component.html',
	styleUrls: ['./quarto-online.component.css']
})
export class QuartoOnlineComponent implements OnInit {

	rules = new QuartoRules();
	observerRole: number; // to see if the player is player zero (0) or one (1) or observatory (2)
	playersZero: string;
	playersOne: string;
	board: Array<Array<number>>;

	observedPart: Observable<ICurrentPart>;
	partDocument: AngularFirestoreDocument<ICurrentPart>;

	partId: string;
	userName: string;
	currentPlayer: string;
	turn = 0;
	pieceInHand = 0;
	endGame = false;
	winner: string;

	private choosenX = -1;
	private choosenY = -1;

	private opponent: IUserId = null;
	opponentPseudo: string;
	allowedTimeoutVictory = false;
	imagesLocation = 'gaviall/pantheonsgame/assets/images/quarto/'; // en prod
	// imagesLocation = 'src/assets/images/quarto/'; // en dev

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

		this.observedPart = this.afs.collection('parties').doc(this.partId).snapshotChanges()
			.pipe(map(actions => {
				return actions.payload.data() as ICurrentPart;
			}));

		this.observedPart.subscribe(updatedICurrentPart =>
			this.onCurrentPartUpdate(updatedICurrentPart));

		this.partDocument = this.afs.doc('parties/' + this.partId);
	}

	onCurrentPartUpdate(updatedICurrentPart: ICurrentPart) {
		if (this.players == null) {
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
			const quartoMove: QuartoMove = QuartoMove.decode(listMoves[currentPartTurn]);
			const bol: boolean = this.rules.choose(quartoMove);
		}
		this.updateBoard();
	}

	setPlayersDatas(updatedICurrentPart: ICurrentPart) {
		this.players = [
			updatedICurrentPart.playerZero,
			updatedICurrentPart.playerOne];
		this.observerRole = 2;
		let opponentName = '';
		if (this.players[0] === this.userName) {
			this.observerRole = 0;
			opponentName = this.players[1];
		} else if (this.players[1] === this.userName) {
			this.observerRole = 1;
			opponentName = this.players[0];
		}
		if (opponentName !== '') {
			this.userDao.getUserDocRefByUserName(opponentName)
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

	notifyVictory() {
		const victoriousPlayer = this.players[(this.rules.node.gamePartSlice.turn + 1) % 2];
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
		return this.players[indexPlayer] === this.userName;
	}

	updateBoard() {
		const quartoPartSlice = this.rules.node.gamePartSlice as QuartoPartSlice;
		this.board = quartoPartSlice.getCopiedBoard();
		this.turn = quartoPartSlice.turn;
		this.currentPlayer = this.players[quartoPartSlice.turn % 2];

		this.pieceInHand = quartoPartSlice.pieceInHand;
	}

	updateDBBoard(move: QuartoMove) {
		const docRef = this.partDocument.ref;
		docRef.get()
			.then((doc) => {
				const turn: number = doc.get('turn') + 1;
				const listMoves: number[] = doc.get('listMoves');
				listMoves[listMoves.length] = QuartoMove.encode(move);
				docRef.update({
					'listMoves': listMoves,
					'turn': turn
				});
			}).catch((error) => {
			console.log(error);
		});
	}

	chooseCoord(event: MouseEvent): boolean {
		if (!this.isPlayerTurn()) {
			console.log('ce n\'est pas ton tour!');
			return false;
		}
		if (this.rules.node.isEndGame()) {
			console.log('la partie est finie');
			return false;
		}
		const x: number = Number(event.srcElement.id.substring(2, 3));
		const y: number = Number(event.srcElement.id.substring(1, 2));
		if (this.board[y][x] === QuartoEnum.UNOCCUPIED) {
			this.putOnBoard(x, y);
			return true;
		}
		return false;
	}

	putOnBoard(x: number, y: number) {
		this.choosenX = x;
		this.choosenY = y;
		// TODO : enlever le précédent s'il y en
		// TODO : placer virtuellement la pieceInHand sur le board
	}

	choosePiece(event: MouseEvent): boolean {
		if (!this.isPlayerTurn()) {
			console.log('ce n\'est pas ton tour!');
			return false;
		}
		if (this.rules.node.isEndGame()) {
			console.log('la partie est finie');
			return false;
		} // TODO : refactor ça avec chooseCoord
		if (this.choosenX === -1) {
			console.log('choisis une pièce d\'abord');
			return false;
		}
		const piece: number = Number(event.srcElement.id.substring(1));
		const choosedMove = new QuartoMove(this.choosenX, this.choosenY, piece);
		if (this.rules.choose(choosedMove)) {
			console.log('Et javascript estime que votre mouvement est légal');
			// player make a correct move
			// let's confirm on java-server-side that the move is legal
			this.choosenX = -1;
			this.choosenY = -1;
			this.updateDBBoard(choosedMove);
			if (this.rules.node.isEndGame()) {
				this.notifyVictory();
			}
			return true;
		} else {
			console.log('Mais c\'est un mouvement illegal');
			return false;
		}
	}

	isRemaining(pawn: number) {
		return QuartoPartSlice.isGivable(pawn, this.board, this.pieceInHand);
	}
}
